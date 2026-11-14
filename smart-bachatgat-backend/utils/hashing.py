import hashlib, hmac, os, base64


def hash_password(password: str) -> str:
    """Hash a password with a random 32-byte salt (PBKDF2-HMAC-SHA256)."""
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return base64.b64encode(salt + key).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a password against a salted PBKDF2 hash."""
    if not hashed:
        return False
    try:
        decoded = base64.b64decode(hashed.encode('utf-8'))
        salt = decoded[:32]
        stored_key = decoded[32:]
        key = hashlib.pbkdf2_hmac('sha256', plain.encode('utf-8'), salt, 100000)
        return hmac.compare_digest(key, stored_key)
    except Exception:
        return False
