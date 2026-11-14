from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models.member import Member
from models.loan import Loan
from models.deposit import Deposit
from models.group import Group
from utils.auth import require_role, get_current_user
import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/mis/{group_id}")
def generate_mis(group_id: int, db: Session = Depends(get_db), current_user=Depends(require_role("admin", "leader"))):
    if current_user.role == "leader" and current_user.group_id != group_id:
        raise HTTPException(status_code=403, detail="Access denied for this group.")
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "MIS Report"
    group = db.query(Group).filter(Group.id == group_id).first()

    ws.merge_cells("A1:F1")
    ws["A1"] = f"MIS Report — {group.name if group else 'Group'}"
    ws["A1"].font      = Font(bold=True, size=14, color="FFFFFF")
    ws["A1"].fill      = PatternFill("solid", fgColor="16a34a")
    ws["A1"].alignment = Alignment(horizontal="center")

    ws.append([])
    ws.append(["#", "Member ID", "Name", "Phone", "Total Savings (₹)", "Total Loans (₹)"])
    for cell in ws[ws.max_row]:
        cell.font = Font(bold=True)
        cell.fill = PatternFill("solid", fgColor="dcfce7")

    members = db.query(Member).filter(Member.group_id == group_id).all()
    for i, m in enumerate(members, 1):
        ws.append([i, m.member_id, m.name, m.phone, m.total_savings, m.total_loans])

    ws.append([])
    ws.append(["Loan ID", "Member", "Amount (₹)", "Paid (₹)", "Balance (₹)", "Status"])
    for cell in ws[ws.max_row]:
        cell.font = Font(bold=True)
        cell.fill = PatternFill("solid", fgColor="dcfce7")

    loans = db.query(Loan).filter(Loan.group_id == group_id).all()
    for loan in loans:
        m = db.query(Member).filter(Member.id == loan.member_id).first()
        ws.append([loan.loan_id, m.name if m else "-", loan.amount, loan.amount_paid, loan.balance, loan.status])

    for col in ws.columns:
        max_len = max((len(str(cell.value or "")) for cell in col), default=10)
        ws.column_dimensions[col[0].column_letter].width = max_len + 4

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=MIS_Group_{group_id}.xlsx"}
    )


def _draw_pdf_table_row(c, x_positions, y, row_values, font_size=9, bold=False):
    c.setFont("Helvetica-Bold" if bold else "Helvetica", font_size)
    for x, text in zip(x_positions, row_values):
        c.drawString(x, y, str(text or ""))


@router.get("/pdf/member")
def generate_member_pdf(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from models.group import Group

    if current_user.role != "member":
        raise HTTPException(status_code=403, detail="Only members can download their report.")

    member = db.query(Member).filter(Member.member_id == current_user.member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member record not found.")

    group = db.query(Group).filter(Group.id == member.group_id).first()
    deposits = db.query(Deposit).filter(Deposit.member_id == member.id).order_by(Deposit.created_at.desc()).all()
    loans = db.query(Loan).filter(Loan.member_id == member.id).order_by(Loan.created_at.desc()).all()

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 2 * cm
    y = height - margin

    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin, y, "Smart Bachatgat Member Report")
    y -= 1 * cm

    c.setFont("Helvetica", 10)
    c.drawString(margin, y, f"Name: {member.name}")
    c.drawString(margin + 9 * cm, y, f"Member ID: {member.member_id}")
    y -= 0.5 * cm
    c.drawString(margin, y, f"Group: {group.name if group else 'N/A'}")
    c.drawString(margin + 9 * cm, y, f"Phone: {member.phone or 'N/A'}")
    y -= 0.5 * cm
    c.drawString(margin, y, f"Total Savings: ₹{member.total_savings:.2f}")
    c.drawString(margin + 9 * cm, y, f"Total Loans: ₹{member.total_loans:.2f}")
    y -= 1 * cm

    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin, y, "Recent Transactions")
    y -= 0.6 * cm

    headers = ["Date", "Type", "Amount (₹)", "Status / Note"]
    x_positions = [margin, margin + 4.5 * cm, margin + 9 * cm, margin + 12 * cm]
    _draw_pdf_table_row(c, x_positions, y, headers, font_size=10, bold=True)
    y -= 0.4 * cm
    c.line(margin, y + 3, width - margin, y + 3)
    y -= 0.4 * cm

    if not deposits and not loans:
        c.setFont("Helvetica", 10)
        c.drawString(margin, y, "No transactions available.")
        y -= 0.5 * cm

    for record, label in ([ (d, "Savings") for d in deposits ] + [ (l, "Loan") for l in loans ]):
        if y < margin + 2 * cm:
            c.showPage()
            c.setFont("Helvetica", 10)
            y = height - margin
        date_text = getattr(record, "date", None) or getattr(record, "created_at", None)
        date_str = str(date_text).split("T")[0] if date_text else "-"
        amount = f"₹{record.amount:.2f}" if hasattr(record, "amount") else "-"
        note = record.description if hasattr(record, "description") else getattr(record, "status", "")
        _draw_pdf_table_row(c, x_positions, y, [date_str, label, amount, note], font_size=9)
        y -= 0.4 * cm

    c.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=member_report_{member.member_id}.pdf"}
    )


@router.get("/pdf/group/{group_id}")
def generate_group_pdf(group_id: int, db: Session = Depends(get_db), current_user=Depends(require_role("admin", "leader"))):
    if current_user.role == "leader" and current_user.group_id != group_id:
        raise HTTPException(status_code=403, detail="Access denied for this group.")

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    members = db.query(Member).filter(Member.group_id == group_id).all()
    loans = db.query(Loan).filter(Loan.group_id == group_id).all()

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    margin = 2 * cm
    y = height - margin

    c.setFont("Helvetica-Bold", 16)
    c.drawString(margin, y, f"Smart Bachatgat Group Report — {group.name}")
    y -= 1 * cm

    c.setFont("Helvetica", 10)
    c.drawString(margin, y, f"Group ID: {group.group_id}")
    c.drawString(margin + 9 * cm, y, f"Leader ID: {group.leader_id or 'N/A'}")
    y -= 0.5 * cm
    c.drawString(margin, y, f"Total Savings: ₹{group.total_savings:.2f}")
    y -= 0.8 * cm

    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin, y, "Members")
    y -= 0.6 * cm
    headers = ["Member ID", "Name", "Phone", "Savings", "Loans", "Status"]
    x_positions = [margin, margin + 3.5 * cm, margin + 8.5 * cm, margin + 12 * cm, margin + 15.5 * cm, margin + 18.5 * cm]
    _draw_pdf_table_row(c, x_positions, y, headers, font_size=9, bold=True)
    y -= 0.4 * cm
    c.line(margin, y + 3, width - margin, y + 3)
    y -= 0.4 * cm

    for m in members:
        if y < margin + 2 * cm:
            c.showPage()
            c.setFont("Helvetica", 10)
            y = height - margin
        _draw_pdf_table_row(c, x_positions, y, [m.member_id, m.name, m.phone or "-", f"₹{m.total_savings:.2f}", f"₹{m.total_loans:.2f}", m.status])
        y -= 0.35 * cm

    y -= 0.6 * cm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin, y, "Loans")
    y -= 0.6 * cm
    headers = ["Loan ID", "Member", "Amount", "Paid", "Balance", "Status"]
    _draw_pdf_table_row(c, x_positions, y, headers, font_size=9, bold=True)
    y -= 0.4 * cm
    c.line(margin, y + 3, width - margin, y + 3)
    y -= 0.4 * cm

    for loan in loans:
        if y < margin + 2 * cm:
            c.showPage()
            c.setFont("Helvetica", 10)
            y = height - margin
        member_name = db.query(Member).filter(Member.id == loan.member_id).first()
        _draw_pdf_table_row(c, x_positions, y, [loan.loan_id, member_name.name if member_name else "-", f"₹{loan.amount:.2f}", f"₹{loan.amount_paid:.2f}", f"₹{loan.balance:.2f}", loan.status])
        y -= 0.35 * cm

    c.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=group_report_{group_id}.pdf"}
    )