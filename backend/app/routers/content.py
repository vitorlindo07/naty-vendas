"""Painel: dicas (blog), depoimentos, mensagens e configurações."""
from datetime import date

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import audit, current_user, get_or_404
from ..models import ContactMessage, Post, Testimonial, User
from ..schemas import ContactOut, PostIn, PostOut, TestimonialOut
from .. import site_settings
from ..uploads import remove_image, save_image

router = APIRouter(prefix="/api/admin", tags=["Painel · Conteúdo"], dependencies=[Depends(current_user)])


# ---------------------------------------------------------------- dicas
@router.get("/posts", response_model=list[PostOut])
def list_posts(db: Session = Depends(get_db)):
    return db.query(Post).order_by(Post.published, Post.published_on.desc().nullsfirst(), Post.id.desc()).all()


@router.post("/posts", response_model=PostOut, status_code=201)
def create_post(data: PostIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    p = Post(**data.model_dump(), slug=site_settings.unique_slug(db, Post, data.title))
    if p.published and not p.published_on:
        p.published_on = date.today()
    db.add(p)
    db.flush()
    audit(db, user, "criou", "dica", p.id, p.title)
    db.commit()
    return p


@router.put("/posts/{pid}", response_model=PostOut)
def update_post(pid: int, data: PostIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    p = get_or_404(db, Post, pid, "Dica")
    if data.title != p.title:
        p.slug = site_settings.unique_slug(db, Post, data.title, pid)
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    if p.published and not p.published_on:
        p.published_on = date.today()
    audit(db, user, "editou", "dica", pid, p.title)
    db.commit()
    return p


@router.post("/posts/{pid}/cover", response_model=PostOut)
async def post_cover(pid: int, image: UploadFile = File(...), db: Session = Depends(get_db)):
    p = get_or_404(db, Post, pid, "Dica")
    new_path = await save_image(image, db)
    remove_image(db, p.cover_path)
    p.cover_path = new_path
    db.commit()
    return p


@router.delete("/posts/{pid}", status_code=204)
def delete_post(pid: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    p = get_or_404(db, Post, pid, "Dica")
    remove_image(db, p.cover_path)
    audit(db, user, "excluiu", "dica", pid, p.title)
    db.delete(p)
    db.commit()


# ---------------------------------------------------------------- depoimentos
@router.get("/testimonials", response_model=list[TestimonialOut])
def list_testimonials(db: Session = Depends(get_db)):
    return db.query(Testimonial).order_by(Testimonial.approved, Testimonial.created_at.desc()).all()


@router.patch("/testimonials/{tid}", response_model=TestimonialOut)
def moderate_testimonial(tid: int, approved: bool, db: Session = Depends(get_db), user: User = Depends(current_user)):
    t = get_or_404(db, Testimonial, tid, "Depoimento")
    t.approved = approved
    audit(db, user, "editou", "depoimento", tid, ("Aprovou " if approved else "Ocultou ") + t.author)
    db.commit()
    return t


@router.delete("/testimonials/{tid}", status_code=204)
def delete_testimonial(tid: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    t = get_or_404(db, Testimonial, tid, "Depoimento")
    audit(db, user, "excluiu", "depoimento", tid, t.author)
    db.delete(t)
    db.commit()


# ---------------------------------------------------------------- mensagens
@router.get("/messages", response_model=list[ContactOut])
def list_messages(db: Session = Depends(get_db)):
    return db.query(ContactMessage).order_by(ContactMessage.read, ContactMessage.created_at.desc()).all()


@router.patch("/messages/{mid}", response_model=ContactOut)
def mark_message(mid: int, read: bool = True, db: Session = Depends(get_db)):
    m = get_or_404(db, ContactMessage, mid, "Mensagem")
    m.read = read
    db.commit()
    return m


@router.delete("/messages/{mid}", status_code=204)
def delete_message(mid: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    m = get_or_404(db, ContactMessage, mid, "Mensagem")
    audit(db, user, "excluiu", "mensagem", mid, m.name)
    db.delete(m)
    db.commit()


# ---------------------------------------------------------------- configurações
@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    return site_settings.get_all(db)


@router.put("/settings")
def put_settings(values: dict, db: Session = Depends(get_db), user: User = Depends(current_user)):
    audit(db, user, "editou", "configuracoes", None, ", ".join(sorted(values))[:200])
    return site_settings.update(db, values)
