"""Dependências compartilhadas: usuário autenticado e registro de auditoria."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import AuditLog, User
from .security import decode_token

bearer = HTTPBearer(auto_error=False)


def current_user(cred: HTTPAuthorizationCredentials | None = Depends(bearer),
                 db: Session = Depends(get_db)) -> User:
    if not cred:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Faça login para continuar.")
    user = db.get(User, decode_token(cred.credentials))
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuário inativo ou inexistente.")
    return user


def audit(db: Session, user: User | None, action: str, entity: str,
          entity_id: int | None = None, summary: str = "") -> None:
    db.add(AuditLog(user_id=user.id if user else None, action=action, entity=entity,
                    entity_id=entity_id, summary=summary[:255]))


def get_or_404(db: Session, model, obj_id: int, label: str = "Registro"):
    obj = db.get(model, obj_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{label} não encontrado.")
    return obj
