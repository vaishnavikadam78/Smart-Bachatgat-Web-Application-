from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from database import Base, engine

# Import all models so tables get created
from models import user, group, member, deposit, loan, meeting, repayment, notification, audit_log, gallery, report, invite_code, auth_token
from models.scheme  import Scheme, SchemeApplication
from models.payment import Payment

from routes import auth, register, groups, members, meetings, deposits, loans, repayments, reports, dashboard, admin
from routes.schemes  import router as schemes_router
from routes.payments import router as payments_router
from routes.notifications import router as notifications_router

# Create all tables
Base.metadata.create_all(bind=engine)


def _ensure_schema_updates():
    """Lightweight migrations for existing databases."""
    stmts = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE",
        """UPDATE users SET email_verified = TRUE
           WHERE email IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM auth_tokens t
             WHERE t.user_id = users.id
               AND t.type IN ('email_verify', 'email_verify_otp')
               AND t.is_used = FALSE
               AND t.expires_at >= NOW()
           )""",
    ]
    with engine.begin() as conn:
        for stmt in stmts:
            try:
                conn.execute(text(stmt))
            except Exception:
                pass


_ensure_schema_updates()

app = FastAPI(title="Smart Bachatgat API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(auth.router)
app.include_router(register.router)
app.include_router(groups.router)
app.include_router(members.router)
app.include_router(meetings.router)
app.include_router(deposits.router)
app.include_router(loans.router)
app.include_router(repayments.router)
app.include_router(reports.router)
app.include_router(dashboard.router)
app.include_router(schemes_router)
app.include_router(payments_router)
app.include_router(notifications_router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"message": "Smart Bachatgat API v2.0 — Running ✅"}

@app.get("/health")
def health():
    return {"status": "ok"}