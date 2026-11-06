"""Imagens enviadas pelo painel (capas de cursos e dicas).

Ficam guardadas no próprio banco de dados, e não em arquivos, para funcionar igual no computador,
em servidores comuns e na Vercel (onde arquivos gravados são apagados).
A validação é feita pelo conteúdo do arquivo (assinatura), não pela extensão.
"""
import uuid

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from .config import settings
from .models import StoredImage

SIGNATURES = {b"\xff\xd8\xff": ("jpg", "image/jpeg"), b"\x89PNG": ("png", "image/png"), b"RIFF": ("webp", "image/webp")}


async def save_image(file: UploadFile, db: Session) -> str:
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, f"A imagem passa de {settings.MAX_UPLOAD_MB} MB. Reduza e envie de novo.")
    kind = next((v for sig, v in SIGNATURES.items() if content.startswith(sig)), None)
    if not kind or (kind[0] == "webp" and content[8:12] != b"WEBP"):
        raise HTTPException(415, "Envie uma imagem JPG, PNG ou WEBP.")
    name = f"{uuid.uuid4().hex}.{kind[0]}"
    db.add(StoredImage(name=name, content_type=kind[1], data=content))
    return f"/uploads/{name}"


def remove_image(db: Session, path: str | None) -> None:
    if path and path.startswith("/uploads/"):
        db.query(StoredImage).filter(StoredImage.name == path.removeprefix("/uploads/")).delete()
