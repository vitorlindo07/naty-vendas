"""Painel: cursos e turmas."""
import csv
import io

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import audit, current_user, get_or_404
from ..models import Course, CourseClass, Enrollment, User
from ..schemas import ClassIn, ClassOut, CourseIn, CourseOut, EnrollmentOut
from ..site_settings import unique_slug
from ..uploads import remove_image, save_image
from .public import taken_seats

router = APIRouter(prefix="/api/admin", tags=["Painel · Cursos e turmas"], dependencies=[Depends(current_user)])


# ---------------------------------------------------------------- cursos
@router.get("/courses", response_model=list[CourseOut])
def list_courses(db: Session = Depends(get_db)):
    return db.query(Course).order_by(Course.position, Course.id).all()


@router.post("/courses", response_model=CourseOut, status_code=201)
def create_course(data: CourseIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    c = Course(**data.model_dump(), slug=unique_slug(db, Course, data.title))
    db.add(c)
    db.flush()
    audit(db, user, "criou", "curso", c.id, c.title)
    db.commit()
    return c


@router.put("/courses/{cid}", response_model=CourseOut)
def update_course(cid: int, data: CourseIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    c = get_or_404(db, Course, cid, "Curso")
    if data.title != c.title:
        c.slug = unique_slug(db, Course, data.title, cid)
    for k, v in data.model_dump().items():
        setattr(c, k, v)
    audit(db, user, "editou", "curso", cid, c.title)
    db.commit()
    return c


@router.post("/courses/{cid}/cover", response_model=CourseOut)
async def upload_cover(cid: int, image: UploadFile = File(...), db: Session = Depends(get_db),
                       user: User = Depends(current_user)):
    c = get_or_404(db, Course, cid, "Curso")
    new_path = await save_image(image, db)
    remove_image(db, c.cover_path)
    c.cover_path = new_path
    audit(db, user, "editou", "curso", cid, "Trocou a capa")
    db.commit()
    return c


@router.delete("/courses/{cid}/cover", response_model=CourseOut)
def delete_cover(cid: int, db: Session = Depends(get_db)):
    c = get_or_404(db, Course, cid, "Curso")
    remove_image(db, c.cover_path)
    c.cover_path = None
    db.commit()
    return c


@router.delete("/courses/{cid}", status_code=204)
def delete_course(cid: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    c = get_or_404(db, Course, cid, "Curso")
    if db.query(Enrollment).filter(Enrollment.course_id == cid).first():
        raise HTTPException(409, "Este curso tem inscrições. Desative-o em vez de excluir, para manter o histórico.")
    remove_image(db, c.cover_path)
    audit(db, user, "excluiu", "curso", cid, c.title)
    db.delete(c)
    db.commit()


# ---------------------------------------------------------------- turmas
def _class_out(db: Session, k: CourseClass) -> ClassOut:
    out = ClassOut.model_validate(k)
    out.enrolled = taken_seats(db, k.id)
    out.seats_left = max(k.seats - out.enrolled, 0)
    return out


def _check(data: ClassIn, db: Session) -> None:
    if not db.get(Course, data.course_id):
        raise HTTPException(422, "Curso inválido.")
    if data.end_date and data.end_date < data.start_date:
        raise HTTPException(422, "A data de término precisa ser igual ou depois do início.")


@router.get("/classes", response_model=list[ClassOut])
def list_classes(course_id: int | None = None, status: str = "", db: Session = Depends(get_db)):
    q = db.query(CourseClass).options(selectinload(CourseClass.course))
    if course_id:
        q = q.filter(CourseClass.course_id == course_id)
    if status:
        q = q.filter(CourseClass.status == status)
    return [_class_out(db, k) for k in q.order_by(CourseClass.start_date.desc()).all()]


@router.get("/classes/{kid}", response_model=ClassOut)
def get_class(kid: int, db: Session = Depends(get_db)):
    return _class_out(db, get_or_404(db, CourseClass, kid, "Turma"))


@router.post("/classes", response_model=ClassOut, status_code=201)
def create_class(data: ClassIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _check(data, db)
    k = CourseClass(**data.model_dump())
    db.add(k)
    db.flush()
    audit(db, user, "criou", "turma", k.id, k.name)
    db.commit()
    db.refresh(k)
    return _class_out(db, k)


@router.put("/classes/{kid}", response_model=ClassOut)
def update_class(kid: int, data: ClassIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    _check(data, db)
    k = get_or_404(db, CourseClass, kid, "Turma")
    if data.seats < taken_seats(db, kid):
        raise HTTPException(422, "Já existem mais inscritos do que esse número de vagas.")
    for key, v in data.model_dump().items():
        setattr(k, key, v)
    audit(db, user, "editou", "turma", kid, f"{k.name} ({k.status})")
    db.commit()
    db.refresh(k)
    return _class_out(db, k)


@router.delete("/classes/{kid}", status_code=204)
def delete_class(kid: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    k = get_or_404(db, CourseClass, kid, "Turma")
    if taken_seats(db, kid):
        raise HTTPException(409, "A turma tem inscritos. Cancele a turma em vez de excluir.")
    audit(db, user, "excluiu", "turma", kid, k.name)
    db.delete(k)
    db.commit()


@router.get("/classes/{kid}/roster", response_model=list[EnrollmentOut])
def roster(kid: int, db: Session = Depends(get_db)):
    return (db.query(Enrollment).options(selectinload(Enrollment.student))
            .filter(Enrollment.class_id == kid).order_by(Enrollment.status, Enrollment.id).all())


@router.get("/classes/{kid}/roster.csv")
def roster_csv(kid: int, db: Session = Depends(get_db)):
    k = get_or_404(db, CourseClass, kid, "Turma")
    buf = io.StringIO()
    buf.write("﻿")
    w = csv.writer(buf, delimiter=";")
    w.writerow(["Nome", "E-mail", "Telefone", "Cidade", "Situação", "Pago", "Valor"])
    for e in roster(kid, db):
        w.writerow([e.student.name, e.student.email, e.student.phone, e.student.city, e.status,
                    "sim" if e.paid else "não", f"{e.amount:.2f}".replace(".", ",")])
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv; charset=utf-8",
                             headers={"Content-Disposition": f'attachment; filename="lista-turma-{k.id}.csv"'})
