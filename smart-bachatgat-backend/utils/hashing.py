import hashlib, hmac, os, base64

def hash_password(password: str) -> str:
    """Hash password with random salt"""
    salt = os.urandom(32)
    key  = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return base64.b64encode(salt + key).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    """
    Verify password. Works with our custom hash.
    Also tries plain text comparison as last resort (for demo/testing).
    """
    if not hashed:
        return False
    
    # Try our custom hash format
    try:
        decoded    = base64.b64decode(hashed.encode('utf-8'))
        salt       = decoded[:32]
        stored_key = decoded[32:]
        key = hashlib.pbkdf2_hmac('sha256', plain.encode('utf-8'), salt, 100000)
        if hmac.compare_digest(key, stored_key):
            return True
    except Exception:
        pass
    
    # Fallback: plain text match (for demo users created directly in DB)
    if plain == hashed:
        return True
        
    return False
