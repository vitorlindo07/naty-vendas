"""Painel: alunos, inscrições, mentorias e leads."""
import csv
import io
import secrets
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import audit, current_user, get_or_404
from ..models import (Course, CourseClass, Enrollment, FinanceEntry, Lead, MentoringRequest, Student, User)
from ..schemas import (EnrollmentAdminIn, EnrollmentOut, EnrollmentUpdate, FinanceOut, LeadOut, MentoringOut,
                       MentoringUpdate, PaymentIn, StudentIn, StudentOut)
from .public import taken_seats

router = APIRouter(prefix="/api/admin", tags=["Painel · Alunos e vendas"], dependencies=[Depends(current_user)])


def _csv(rows: list[list], header: list[str], filename: str) -> StreamingResponse:
    buf = io.StringIO()
    buf.write("﻿")
    w = csv.writer(buf, delimiter=";")
    w.writerow(header)
    w.writerows(rows)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv; charset=utf-8",
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})


# ---------------------------------------------------------------- alunos
@router.get("/students", response_model=list[StudentOut])
def list_students(q: str = "", db: Session = Depends(get_db)):
    query = db.query(Student)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Student.name.ilike(like), Student.email.ilike(like), Student.phone.ilike(like),
                                 Student.city.ilike(like), Student.company.ilike(like)))
    return query.order_by(Student.name).all()


@router.get("/students/{sid}")
def get_student(sid: int, db: Session = Depends(get_db)):
    s = get_or_404(db, Student, sid, "Aluno")
    enrollments = (db.query(Enrollment).options(selectinload(Enrollment.course), selectinload(Enrollment.course_class))
                   .filter(Enrollment.student_id == sid).order_by(Enrollment.created_at.desc()).all())
    paid = (db.query(func.coalesce(func.sum(FinanceEntry.amount), 0))
            .filter(FinanceEntry.student_id == sid, FinanceEntry.kind == "receita").scalar())
    return {"student": StudentOut.model_validate(s).model_dump(mode="json"),
            "enrollments": [EnrollmentOut.model_validate(e).model_dump(mode="json") for e in enrollments],
            "total_paid": float(paid)}


@router.post("/students", response_model=StudentOut, status_code=201)
def create_student(data: StudentIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    if db.query(Student).filter(Student.email == data.email).first():
        raise HTTPException(409, "Já existe um aluno com este e-mail.")
    s = Student(**data.model_dump())
    db.add(s)
    db.flush()
    audit(db, user, "criou", "aluno", s.id, s.name)
    db.commit()
    return s


@router.put("/students/{sid}", response_model=StudentOut)
def update_student(sid: int, data: StudentIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    s = get_or_404(db, Student, sid, "Aluno")
    for k, v in data.model_dump().items():
        setattr(s, k, v)
    audit(db, user, "editou", "aluno", sid, s.name)
    db.commit()
    return s


@router.delete("/students/{sid}", status_code=204)
def delete_student(sid: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Atende pedido de exclusão (LGPD). Lançamentos financeiros ficam, sem o vínculo com a pessoa."""
    s = get_or_404(db, Student, sid, "Aluno")
    audit(db, user, "excluiu", "aluno", sid, s.name)
    db.delete(s)
    db.commit()


# ---------------------------------------------------------------- inscrições
def _load(db: Session, eid: int) -> Enrollment:
    e = (db.query(Enrollment).options(selectinload(Enrollment.student), selectinload(Enrollment.course),
                                      selectinload(Enrollment.course_class)).filter(Enrollment.id == eid).first())
    if not e:
        raise HTTPException(404, "Inscrição não encontrada.")
    return e


@router.get("/enrollments", response_model=list[EnrollmentOut])
def list_enrollments(status: str = "", course_id: int | None = None, class_id: int | None = None,
                     paid: bool | None = None, q: str = "", db: Session = Depends(get_db)):
    query = (db.query(Enrollment).join(Student)
             .options(selectinload(Enrollment.student), selectinload(Enrollment.course),
                      selectinload(Enrollment.course_class)))
    if status:
        query = query.filter(Enrollment.status == status)
    if course_id:
        query = query.filter(Enrollment.course_id == course_id)
    if class_id:
        query = query.filter(Enrollment.class_id == class_id)
    if paid is not None:
        query = query.filter(Enrollment.paid.is_(paid))
    if q:
        like = f"%{q}%"
        query = query.filter(or_(Student.name.ilike(like), Student.email.ilike(like), Student.phone.ilike(like)))
    return query.order_by(Enrollment.created_at.desc(), Enrollment.id.desc()).all()


@router.get("/enrollments/{eid}", response_model=EnrollmentOut)
def get_enrollment(eid: int, db: Session = Depends(get_db)):
    return _load(db, eid)


@router.post("/enrollments", response_model=EnrollmentOut, status_code=201)
def create_enrollment(data: EnrollmentAdminIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    get_or_404(db, Student, data.student_id, "Aluno")
    get_or_404(db, Course, data.course_id, "Curso")
    if data.class_id:
        k = get_or_404(db, CourseClass, data.class_id, "Turma")
        if k.course_id != data.course_id:
            raise HTTPException(422, "A turma não pertence a este curso.")
        if taken_seats(db, k.id) >= k.seats:
            raise HTTPException(409, "Turma sem vagas. Aumente o número de vagas antes.")
    e = Enrollment(**data.model_dump(), consent=True)
    db.add(e)
    db.flush()
    audit(db, user, "criou", "inscricao", e.id, f"Aluno #{data.student_id}")
    db.commit()
    return _load(db, e.id)


@router.patch("/enrollments/{eid}", response_model=EnrollmentOut)
def update_enrollment(eid: int, data: EnrollmentUpdate, db: Session = Depends(get_db),
                      user: User = Depends(current_user)):
    e = _load(db, eid)
    changes = data.model_dump(exclude_unset=True)
    if changes.get("status") == "concluida":
        _complete(e)
    for k, v in changes.items():
        setattr(e, k, v)
    audit(db, user, "editou", "inscricao", eid, f"Situação: {e.status}")
    db.commit()
    return _load(db, eid)


def _complete(e: Enrollment) -> None:
    e.status = "concluida"
    e.completed_on = e.completed_on or date.today()
    if not e.certificate_code:
        e.certificate_code = secrets.token_hex(4).upper()


@router.post("/enrollments/{eid}/pay", response_model=FinanceOut, status_code=201)
def register_payment(eid: int, data: PaymentIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Confirma o pagamento: marca a inscrição como paga/confirmada e lança a receita no financeiro."""
    e = _load(db, eid)
    if e.paid:
        raise HTTPException(409, "Esta inscrição já está paga.")
    if e.amount <= 0:
        raise HTTPException(422, "Defina o valor da inscrição antes de registrar o pagamento.")
    e.paid, e.paid_on, e.payment_method = True, data.paid_on or date.today(), data.payment_method
    if e.status == "pendente":
        e.status = "confirmada"
    entry = FinanceEntry(kind="receita", description=f"{e.course.title} – {e.student.name}", category="Cursos",
                         amount=e.amount, date=e.paid_on, status="pago", payment_method=data.payment_method,
                         invoice_number=data.invoice_number, enrollment_id=e.id, student_id=e.student_id)
    db.add(entry)
    db.flush()
    audit(db, user, "criou", "financeiro", entry.id, f"Pagamento da inscrição #{eid}")
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/classes/{kid}/complete")
def complete_class(kid: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    """Encerra a turma e conclui as inscrições confirmadas (gera os códigos de certificado)."""
    k = get_or_404(db, CourseClass, kid, "Turma")
    done = 0
    for e in db.query(Enrollment).filter(Enrollment.class_id == kid, Enrollment.status == "confirmada"):
        _complete(e)
        done += 1
    k.status = "encerrada"
    audit(db, user, "editou", "turma", kid, f"Encerrada; {done} certificado(s)")
    db.commit()
    return {"completed": done}


@router.delete("/enrollments/{eid}", status_code=204)
def delete_enrollment(eid: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    e = _load(db, eid)
    audit(db, user, "excluiu", "inscricao", eid, e.student.name)
    db.delete(e)
    db.commit()


# ---------------------------------------------------------------- mentorias
@router.get("/mentoring", response_model=list[MentoringOut])
def list_mentoring(status: str = "", db: Session = Depends(get_db)):
    q = db.query(MentoringRequest)
    if status:
        q = q.filter(MentoringRequest.status == status)
    return q.order_by(MentoringRequest.created_at.desc(), MentoringRequest.id.desc()).all()


@router.patch("/mentoring/{mid}", response_model=MentoringOut)
def update_mentoring(mid: int, data: MentoringUpdate, db: Session = Depends(get_db),
                     user: User = Depends(current_user)):
    m = get_or_404(db, MentoringRequest, mid, "Pedido de mentoria")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    if m.status in ("agendado", "realizado") and not m.student_id:
        s = db.query(Student).filter(Student.email == m.email).first()
        if not s:
            s = Student(name=m.name, email=m.email, phone=m.phone)
            db.add(s)
            db.flush()
        m.student_id = s.id
    audit(db, user, "editou", "mentoria", mid, f"Situação: {m.status}")
    db.commit()
    return m


@router.post("/mentoring/{mid}/bill", response_model=FinanceOut, status_code=201)
def bill_mentoring(mid: int, data: PaymentIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    m = get_or_404(db, MentoringRequest, mid, "Pedido de mentoria")
    if not m.price:
        raise HTTPException(422, "Defina o valor da mentoria antes de lançar o pagamento.")
    if db.query(FinanceEntry).filter(FinanceEntry.mentoring_id == mid).first():
        raise HTTPException(409, "O pagamento desta mentoria já foi lançado.")
    entry = FinanceEntry(kind="receita", description=f"Mentoria – {m.name}", category="Mentoria", amount=m.price,
                         date=data.paid_on or date.today(), status="pago", payment_method=data.payment_method,
                         invoice_number=data.invoice_number, mentoring_id=m.id, student_id=m.student_id)
    db.add(entry)
    db.flush()
    audit(db, user, "criou", "financeiro", entry.id, f"Mentoria #{mid}")
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/mentoring/{mid}", status_code=204)
def delete_mentoring(mid: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    m = get_or_404(db, MentoringRequest, mid, "Pedido de mentoria")
    audit(db, user, "excluiu", "mentoria", mid, m.name)
    db.delete(m)
    db.commit()


# ---------------------------------------------------------------- leads
@router.get("/leads", response_model=list[LeadOut])
def list_leads(db: Session = Depends(get_db)):
    return db.query(Lead).order_by(Lead.contacted, Lead.created_at.desc()).all()


@router.get("/leads.csv")
def leads_csv(db: Session = Depends(get_db)):
    rows = [[l.name, l.phone, l.email, l.interest, "sim" if l.contacted else "não",
             l.created_at.strftime("%d/%m/%Y") if l.created_at else ""] for l in list_leads(db)]
    return _csv(rows, ["Nome", "WhatsApp", "E-mail", "Interesse", "Contatado", "Data"], "contatos-interessados.csv")


@router.patch("/leads/{lid}", response_model=LeadOut)
def mark_lead(lid: int, contacted: bool = True, db: Session = Depends(get_db)):
    lead = get_or_404(db, Lead, lid, "Contato")
    lead.contacted = contacted
    db.commit()
    return lead


@router.delete("/leads/{lid}", status_code=204)
def delete_lead(lid: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    lead = get_or_404(db, Lead, lid, "Contato")
    audit(db, user, "excluiu", "lead", lid, lead.name)
    db.delete(lead)
    db.commit()
