"""Shared email verification helpers."""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models.auth_token import AuthToken
from models.user import User

VERIFICATION_TOKEN_TYPES = ("email_verify", "email_verify_otp")


def verification_expires_at(token_type: str) -> datetime:
    now = datetime.utcnow()
    if token_type in ("password_reset", "email_verify_otp"):
        return now + timedelta(minutes=15)
    if token_type == "email_verify":
        return now + timedelta(hours=72)
    return now + timedelta(hours=24)


def invalidate_pending_verification_tokens(db: Session, user_id: int, token_type: str | None = None):
    q = db.query(AuthToken).filter(
        AuthToken.user_id == user_id,
        AuthToken.type.in_(VERIFICATION_TOKEN_TYPES),
        AuthToken.is_used == False,
    )
    if token_type:
        q = q.filter(AuthToken.type == token_type)
    q.update({"is_used": True}, synchronize_session=False)


def complete_email_verification(db: Session, user: User):
    user.email_verified = True
    invalidate_pending_verification_tokens(db, user.id)
    db.commit()
    db.refresh(user)


def user_needs_email_verification(db: Session, user: User) -> bool:
    if not user.email:
        return False
    if getattr(user, "email_verified", False):
        return False
    pending = db.query(AuthToken).filter(
        AuthToken.user_id == user.id,
        AuthToken.type.in_(VERIFICATION_TOKEN_TYPES),
        AuthToken.is_used == False,
        AuthToken.expires_at >= datetime.utcnow(),
    ).first()
    return pending is not None
