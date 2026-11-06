"""Rotas abertas, consumidas pelo site público."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (ContactMessage, Course, CourseClass, Enrollment, Lead, MentoringRequest, Post, Student,
                      Testimonial)
from ..schemas import (ClassPublic, ContactIn, CourseDetail, EnrollIn, LeadIn, MentoringIn, PostOut,
                       TestimonialIn, TestimonialOut)
from ..security import form_limiter
from ..site_settings import get_all, get_public

router = APIRouter(prefix="/api/public", tags=["Site público"])


def _reject_bots(honeypot: str) -> None:
    if honeypot:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Não foi possível enviar.")


def taken_seats(db: Session, class_id: int) -> int:
    return (db.query(func.count(Enrollment.id))
            .filter(Enrollment.class_id == class_id, Enrollment.status != "cancelada").scalar() or 0)


def class_public(db: Session, c: CourseClass) -> ClassPublic:
    out = ClassPublic.model_validate(c)
    out.seats_left = max(c.seats - taken_seats(db, c.id), 0)
    return out


def open_classes(db: Session, course_id: int) -> list[ClassPublic]:
    rows = (db.query(CourseClass)
            .filter(CourseClass.course_id == course_id, CourseClass.status == "aberta",
                    CourseClass.start_date >= date.today())
            .order_by(CourseClass.start_date).all())
    return [class_public(db, c) for c in rows]


@router.get("/site")
def site_info(db: Session = Depends(get_db)):
    data = get_public(db)
    data["students_count"] = db.query(func.count(func.distinct(Enrollment.student_id))).filter(
        Enrollment.status.in_(["confirmada", "concluida"])).scalar() or 0
    return data


@router.get("/courses", response_model=list[CourseDetail])
def courses(db: Session = Depends(get_db)):
    rows = db.query(Course).filter(Course.active.is_(True)).order_by(Course.position, Course.id).all()
    out = []
    for c in rows:
        d = CourseDetail.model_validate(c)
        d.classes = open_classes(db, c.id)
        out.append(d)
    return out


@router.get("/courses/{slug}", response_model=CourseDetail)
def course_detail(slug: str, db: Session = Depends(get_db)):
    c = db.query(Course).filter(Course.slug == slug, Course.active.is_(True)).first()
    if not c:
        raise HTTPException(404, "Curso não encontrado.")
    d = CourseDetail.model_validate(c)
    d.classes = open_classes(db, c.id)
    return d


@router.post("/enroll", status_code=201, dependencies=[Depends(form_limiter)])
def enroll(data: EnrollIn, db: Session = Depends(get_db)):
    _reject_bots(data.website)
    course = db.get(Course, data.course_id)
    if not course or not course.active:
        raise HTTPException(400, "Curso indisponível.")
    klass = None
    if data.class_id:
        klass = db.get(CourseClass, data.class_id)
        if not klass or klass.course_id != course.id or klass.status != "aberta":
            raise HTTPException(400, "Esta turma não está aceitando inscrições.")
        if taken_seats(db, klass.id) >= klass.seats:
            raise HTTPException(409, "As vagas desta turma acabaram. Deixe seu contato para a próxima.")
    elif course.format != "gravado" and open_classes(db, course.id):
        raise HTTPException(400, "Escolha uma das turmas abertas.")

    student = db.query(Student).filter(Student.email == data.email).first()
    if not student:
        student = Student(name=data.name, email=data.email, phone=data.phone, city=data.city, company=data.company)
        db.add(student)
        db.flush()
    else:
        student.phone = data.phone or student.phone
        student.city = data.city or student.city
    dup = db.query(Enrollment).filter(Enrollment.student_id == student.id, Enrollment.course_id == course.id,
                                      Enrollment.class_id == (klass.id if klass else None),
                                      Enrollment.status != "cancelada").first()
    if dup:
        raise HTTPException(409, "Você já tem uma inscrição nesta turma. Fale comigo no WhatsApp se precisar de ajuda.")

    price = klass.price if klass and klass.price is not None else course.price
    e = Enrollment(student_id=student.id, course_id=course.id, class_id=klass.id if klass else None,
                   amount=price or 0, consent=True)
    db.add(e)
    db.commit()
    cfg = get_all(db)
    return {
        "id": e.id, "amount": e.amount, "course": course.title, "class": klass.name if klass else None,
        "pix_key": cfg.get("pix_key") or None, "pix_name": cfg.get("pix_name"),
        "message": "Inscrição recebida! Sua vaga fica reservada por 48 horas até a confirmação do pagamento.",
    }


@router.get("/certificates/{code}")
def verify_certificate(code: str, db: Session = Depends(get_db)):
    e = db.query(Enrollment).filter(Enrollment.certificate_code == code.upper(),
                                    Enrollment.status == "concluida").first()
    if not e:
        raise HTTPException(404, "Certificado não encontrado. Confira o código.")
    return {"student": e.student.name, "course": e.course.title, "hours": e.course.workload_hours,
            "completed_on": e.completed_on, "class": e.course_class.name if e.course_class else None}


@router.post("/mentoring", status_code=201, dependencies=[Depends(form_limiter)])
def request_mentoring(data: MentoringIn, db: Session = Depends(get_db)):
    _reject_bots(data.website)
    m = MentoringRequest(**data.model_dump(exclude={"website"}))
    db.add(m)
    db.commit()
    return {"id": m.id, "message": "Pedido recebido! Vou te chamar no WhatsApp para combinar o melhor horário."}


@router.post("/leads", status_code=201, dependencies=[Depends(form_limiter)])
def capture_lead(data: LeadIn, db: Session = Depends(get_db)):
    _reject_bots(data.website)
    existing = db.query(Lead).filter(Lead.phone == data.phone).first()
    if not existing:
        db.add(Lead(**data.model_dump(exclude={"website"})))
        db.commit()
    return {"message": "Pronto! Você vai receber as próximas dicas e o aviso das novas turmas."}


@router.get("/posts", response_model=list[PostOut])
def posts(limit: int = 30, db: Session = Depends(get_db)):
    return (db.query(Post).filter(Post.published.is_(True))
            .order_by(Post.published_on.desc().nullslast(), Post.id.desc()).limit(min(limit, 100)).all())


@router.get("/posts/{slug}", response_model=PostOut)
def post_detail(slug: str, db: Session = Depends(get_db)):
    p = db.query(Post).filter(Post.slug == slug, Post.published.is_(True)).first()
    if not p:
        raise HTTPException(404, "Dica não encontrada.")
    return p


@router.get("/testimonials", response_model=list[TestimonialOut])
def testimonials(db: Session = Depends(get_db)):
    return (db.query(Testimonial).filter(Testimonial.approved.is_(True))
            .order_by(Testimonial.created_at.desc()).limit(12).all())


@router.post("/testimonials", status_code=201, dependencies=[Depends(form_limiter)])
def submit_testimonial(data: TestimonialIn, db: Session = Depends(get_db)):
    _reject_bots(data.website)
    db.add(Testimonial(**data.model_dump(exclude={"website"}), approved=False))
    db.commit()
    return {"message": "Obrigada pelo depoimento! Ele aparece no site depois de revisado."}


@router.post("/contact", status_code=201, dependencies=[Depends(form_limiter)])
def submit_contact(data: ContactIn, db: Session = Depends(get_db)):
    _reject_bots(data.website)
    db.add(ContactMessage(**data.model_dump(exclude={"website", "consent"})))
    db.commit()
    return {"message": "Mensagem enviada. Respondo assim que possível."}


