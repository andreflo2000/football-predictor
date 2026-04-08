"""
JWT Authentication — register / login / token validation.
Foloseste tabelul `users` din Supabase.
"""
import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from db import get_client

logger = logging.getLogger(__name__)

SECRET_KEY   = os.getenv("JWT_SECRET", "flopi-dev-secret-CHANGE-IN-PROD")
ALGORITHM    = "HS256"
ACCESS_TTL   = 60 * 24 * 7   # 7 zile in minute

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer  = HTTPBearer(auto_error=False)


# ─── helpers ────────────────────────────────────────────────


def _hash(password: str) -> str:
    return pwd_ctx.hash(password)


def _verify(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


def _create_token(user_id: int, email: str, tier: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL)
    return jwt.encode(
        {"sub": str(user_id), "email": email, "tier": tier, "exp": exp},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def _decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


# ─── register / login ───────────────────────────────────────


def register_user(email: str, password: str) -> dict:
    """
    Creaza cont nou. Returneaza token sau arunca HTTPException.
    """
    try:
        client = get_client()
        if client is None:
            raise HTTPException(503, "DB indisponibil")

        existing = client.table("users").select("id").eq("email", email).execute()
        if existing.data:
            raise HTTPException(400, "Email deja inregistrat")

        hashed = _hash(password)
        client.table("users").insert({
            "email":         email,
            "password_hash": hashed,
            "tier":          "free",
        }).execute()

        rows = client.table("users").select("*").eq("email", email).execute()
        if not rows.data:
            raise HTTPException(500, "User negasit dupa insert")
        user = rows.data[0]
        token = _create_token(user["id"], user["email"], user["tier"])
        return {"access_token": token, "token_type": "bearer", "tier": "free"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("register_user error: %s", repr(e))
        raise HTTPException(500, f"Eroare inregistrare: {repr(e)}")


def login_user(email: str, password: str) -> dict:
    """
    Autentifica user. Returneaza token sau arunca HTTPException.
    """
    client = get_client()
    if client is None:
        raise HTTPException(503, "DB indisponibil")

    rows = client.table("users").select("*").eq("email", email).execute()
    if not rows.data:
        raise HTTPException(401, "Email sau parola incorecta")

    user = rows.data[0]
    if not _verify(password, user["password_hash"]):
        raise HTTPException(401, "Email sau parola incorecta")

    token = _create_token(user["id"], user["email"], user["tier"])
    return {"access_token": token, "token_type": "bearer", "tier": user["tier"]}


# ─── dependency injection ───────────────────────────────────


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> Optional[dict]:
    """
    Dependency FastAPI — returneaza user dict sau None (rute publice).
    """
    if credentials is None:
        return None
    try:
        payload = _decode_token(credentials.credentials)
        return {
            "id":    payload.get("sub"),
            "email": payload.get("email"),
            "tier":  payload.get("tier", "free"),
        }
    except JWTError:
        return None


def require_user(user: Optional[dict] = Depends(get_current_user)) -> dict:
    """Dependency — arunca 401 daca nu e autentificat."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autentificare necesara",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_vip(user: dict = Depends(require_user)) -> dict:
    """Dependency — arunca 403 daca nu e tier VIP."""
    if user.get("tier") != "vip":
        raise HTTPException(403, "Acces rezervat utilizatorilor VIP")
    return user
