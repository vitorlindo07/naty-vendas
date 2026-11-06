"""Upload de imagens validado pelo conteúdo do arquivo (assinatura), não pela extensão."""
import uuid

from fastapi import HTTPException, UploadFile

from .config import settings

SIGNATURES = {b"\xff\xd8\xff": ".jpg", b"\x89PNG": ".png", b"RIFF": ".webp"}


async def save_image(file: UploadFile) -> str:
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, f"A imagem passa de {settings.MAX_UPLOAD_MB} MB. Reduza e envie de novo.")
    ext = next((e for sig, e in SIGNATURES.items() if content.startswith(sig)), None)
    if not ext or (ext == ".webp" and content[8:12] != b"WEBP"):
        raise HTTPException(415, "Envie uma imagem JPG, PNG ou WEBP.")
    name = f"{uuid.uuid4().hex}{ext}"
    (settings.UPLOAD_DIR / name).write_bytes(content)
    return f"/uploads/{name}"


def remove_image(path: str | None) -> None:
    if path and path.startswith("/uploads/"):
        target = settings.UPLOAD_DIR / path.removeprefix("/uploads/")
        if target.is_file():
            target.unlink()
