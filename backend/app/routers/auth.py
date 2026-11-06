from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import audit, current_user
from ..models import User
from ..schemas import LoginIn, PasswordChange, TokenOut, UserOut
from ..security import create_token, hash_password, login_limiter, verify_password

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])


@router.post("/login", response_model=TokenOut, dependencies=[Depends(login_limiter)])
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.strip().lower()).first()
    if not user or not verify_password(data.password, user.password_hash) or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "E-mail ou senha incorretos.")
    user.last_login = datetime.now()
    audit(db, user, "entrou", "sessao", user.id, "Login no painel")
    db.commit()
    return TokenOut(access_token=create_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@router.post("/password", status_code=204)
def change_password(data: PasswordChange, db: Session = Depends(get_db),
                    user: User = Depends(current_user)):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "A senha atual não confere.")
    user.password_hash = hash_password(data.new_password)
    audit(db, user, "editou", "usuario", user.id, "Alterou a senha")
    db.commit()
