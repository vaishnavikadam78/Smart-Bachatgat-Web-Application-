from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models.scheme import Scheme, SchemeApplication
from models.member import Member
from utils.auth import get_current_user, require_role
from pydantic import BaseModel
from typing import Optional
from datetime import date

router = APIRouter(prefix="/schemes", tags=["Schemes"])

# ── Seed default schemes if none exist ──
SAMPLE_SCHEMES = [
    {"name":"PM Mahila Shakti Yojana","category":"Women Empowerment","description":"Empowers women through self-help groups with financial support and skill training.","benefits":"Up to ₹50,000 grant + skill training","eligibility":"Women aged 18-60, SHG member","documents":"Aadhaar, Bank Passbook, SHG Certificate","process":"Apply through SHG leader → Leader submits to bank"},
    {"name":"Mudra Loan - Shishu","category":"Business Loan","description":"Micro loans for small businesses and startups under Pradhan Mantri Mudra Yojana.","benefits":"Loan up to ₹50,000 at low interest","eligibility":"Any citizen with small business idea","documents":"Aadhaar, PAN, Business Plan","process":"Apply at nearest bank or NBFC"},
    {"name":"Kisan Credit Card","category":"Agriculture","description":"Short-term credit for agricultural needs including crop cultivation and post-harvest expenses.","benefits":"Credit up to ₹3 lakh, flexible repayment","eligibility":"Farmers, tenant farmers, SHG members","documents":"Land documents, Aadhaar, Bank account","process":"Apply at cooperative or commercial bank"},
    {"name":"National Scholarship Portal","category":"Education","description":"Scholarships for meritorious students from economically weaker sections.","benefits":"₹1,000 to ₹10,000 per month","eligibility":"Students scoring >50%, income below ₹6L","documents":"Marksheet, Income certificate, Aadhaar","process":"Register on scholarships.gov.in"},
    {"name":"Startup India Seed Fund","category":"Startup Support","description":"Financial support for early-stage startups for proof of concept and prototype development.","benefits":"Up to ₹20 lakh seed funding","eligibility":"DPIIT recognized startups < 2 years old","documents":"Incorporation docs, Business plan","process":"Apply on startupindia.gov.in"},
    {"name":"PM Jeevan Jyoti Bima Yojana","category":"Savings & Insurance","description":"Life insurance scheme covering death due to any reason.","benefits":"₹2 lakh life cover at ₹436/year premium","eligibility":"Age 18-50, bank account holder","documents":"Aadhaar, Bank account","process":"Apply through bank or post office"},
    {"name":"PM Awas Yojana - Gramin","category":"Government Welfare","description":"Housing for all rural poor — financial assistance for house construction.","benefits":"₹1.2 lakh to ₹1.5 lakh grant","eligibility":"Rural BPL families without pucca house","documents":"Aadhaar, Ration card, Land proof","process":"Apply through Gram Panchayat"},
    {"name":"Mahila Udyam Nidhi","category":"Women Empowerment","description":"Special scheme for women entrepreneurs to start or expand small industries.","benefits":"Loan up to ₹10 lakh at subsidized rate","eligibility":"Women entrepreneurs, SHG members","documents":"Business proof, Aadhaar, SHG certificate","process":"Apply through SIDBI or commercial banks"},
]

def seed_schemes(db: Session):
    if db.query(Scheme).count() == 0:
        for s in SAMPLE_SCHEMES:
            db.add(Scheme(**s, is_active=True))
        db.commit()

@router.get("/")
def get_schemes(category: Optional[str] = None, search: Optional[str] = None,
               db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    seed_schemes(db)
    q = db.query(Scheme).filter(Scheme.is_active == True)
    if category and category != "All":
        q = q.filter(Scheme.category == category)
    if search:
        q = q.filter(Scheme.name.ilike(f"%{search}%"))
    return q.all()

@router.get("/categories")
def get_categories(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    seed_schemes(db)
    cats = db.query(Scheme.category).distinct().all()
    return ["All"] + [c[0] for c in cats]

@router.post("/{scheme_id}/apply")
def apply_scheme(scheme_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    scheme = db.query(Scheme).filter(Scheme.id == scheme_id).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found")
    member = None
    if current_user.member_id:
        member = db.query(Member).filter(Member.member_id == current_user.member_id).first()
    if not member:
        member = db.query(Member).filter(
            Member.group_id == current_user.group_id,
            Member.name == current_user.name
        ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member profile not found")
    existing = db.query(SchemeApplication).filter(
        SchemeApplication.scheme_id == scheme_id,
        SchemeApplication.member_id == member.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already applied for this scheme")
    app = SchemeApplication(
        scheme_id=scheme_id, member_id=member.id, user_id=current_user.id, status="Pending"
    )
    db.add(app)
    db.commit()
    return {"message": "Applied successfully!", "status": "Pending"}

@router.get("/my-applications")
def my_applications(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    member = None
    if current_user.member_id:
        member = db.query(Member).filter(Member.member_id == current_user.member_id).first()
    if not member:
        member = db.query(Member).filter(
            Member.group_id == current_user.group_id,
            Member.name == current_user.name
        ).first()
    if not member:
        return []
    apps = db.query(SchemeApplication).filter(SchemeApplication.member_id == member.id).all()
    result = []
    for a in apps:
        s = db.query(Scheme).filter(Scheme.id == a.scheme_id).first()
        result.append({"id":a.id,"scheme_name":s.name if s else "—","category":s.category if s else "—","status":a.status,"applied_at":str(a.applied_at)})
    return result

@router.get("/admin/applications")
def admin_applications(db: Session = Depends(get_db), current_user=Depends(require_role("admin","leader"))):
    query = db.query(SchemeApplication)
    if current_user.role == "leader":
        query = query.join(Member, SchemeApplication.member_id == Member.id)
        query = query.filter(Member.group_id == current_user.group_id)
    apps = query.all()
    result = []
    for a in apps:
        s = db.query(Scheme).filter(Scheme.id == a.scheme_id).first()
        m = db.query(Member).filter(Member.id == a.member_id).first()
        result.append({
            "id": a.id,
            "scheme_name": s.name if s else "—",
            "category": s.category if s else "—",
            "member_name": m.name if m else "—",
            "status": a.status,
            "applied_at": str(a.applied_at)
        })
    return result

class StatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

@router.patch("/{app_id}/status")
def update_status(app_id: int, data: StatusUpdate, background: BackgroundTasks, db: Session = Depends(get_db), current_user=Depends(require_role("admin","leader"))):
    app = db.query(SchemeApplication).filter(SchemeApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if current_user.role == "leader":
        member = db.query(Member).filter(Member.id == app.member_id).first()
        if not member or member.group_id != current_user.group_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this application")
    app.status = data.status
    if data.notes:
        app.notes = data.notes
    db.commit()
    # Notify member and send email
    try:
        from models.member import Member
        from models.user import User
        from models.notification import Notification
        from routes.notifications import send_email_background

        member = db.query(Member).filter(Member.id == app.member_id).first()
        if member:
            user = db.query(User).filter(User.member_id == member.member_id).first()
            scheme = db.query(Scheme).filter(Scheme.id == app.scheme_id).first()
            title = f"Scheme Update: {scheme.name if scheme else 'Application'}"
            message = f"Your application status changed to '{data.status}'."
            if user:
                notif = Notification(user_id=user.id, group_id=member.group_id, title=title, message=message, type="info")
                db.add(notif); db.commit()
                if user.email:
                    body = f"<p>Hello {user.name},</p><p>Your application for {scheme.name if scheme else 'the scheme'} is now '{data.status}'.</p>"
                    background.add_task(send_email_background, user.email, f"{title}", body)
    except Exception:
        pass
    return {"message": f"Status updated to {data.status}"}

@router.patch("/admin/applications/{app_id}/status")
def admin_update_status(app_id: int, data: StatusUpdate, background: BackgroundTasks, db: Session = Depends(get_db), current_user=Depends(require_role("admin","leader"))):
    return update_status(app_id, data, background, db, current_user)