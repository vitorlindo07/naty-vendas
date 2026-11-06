"""Painel: visão geral e histórico de atividades."""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import extract, func
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import current_user
from ..models import (AuditLog, ContactMessage, CourseClass, DasPayment, Enrollment, FinanceEntry, Lead,
                      MentoringRequest, Testimonial)
from ..schemas import EnrollmentOut, MentoringOut
from .finance import mei_status
from .public import taken_seats

router = APIRouter(prefix="/api/admin", tags=["Painel · Visão geral"], dependencies=[Depends(current_user)])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    today = date.today()
    pending = (db.query(Enrollment).options(selectinload(Enrollment.student), selectinload(Enrollment.course),
                                            selectinload(Enrollment.course_class))
               .filter(Enrollment.status == "pendente").order_by(Enrollment.created_at.desc()).limit(8).all())
    classes = (db.query(CourseClass).options(selectinload(CourseClass.course))
               .filter(CourseClass.status == "aberta", CourseClass.start_date >= today)
               .order_by(CourseClass.start_date).limit(6).all())
    mentoring = (db.query(MentoringRequest).filter(MentoringRequest.status.in_(["novo", "agendado"]))
                 .order_by(MentoringRequest.scheduled_at.asc().nullsfirst(), MentoringRequest.created_at.desc())
                 .limit(6).all())
    month_revenue = (db.query(func.coalesce(func.sum(FinanceEntry.amount), 0))
                     .filter(FinanceEntry.kind == "receita", extract("year", FinanceEntry.date) == today.year,
                             extract("month", FinanceEntry.date) == today.month).scalar())
    students_year = (db.query(func.count(func.distinct(Enrollment.student_id)))
                     .filter(Enrollment.status.in_(["confirmada", "concluida"]),
                             extract("year", Enrollment.created_at) == today.year).scalar())
    das = db.query(DasPayment).filter_by(year=today.year, month=today.month).first()
    return {
        "pending_enrollments": [EnrollmentOut.model_validate(e).model_dump(mode="json") for e in pending],
        "pending_count": db.query(func.count(Enrollment.id)).filter(Enrollment.status == "pendente").scalar(),
        "upcoming_classes": [{
            "id": k.id, "name": k.name, "course": k.course.title, "start_date": k.start_date.isoformat(),
            "schedule": k.schedule, "seats": k.seats, "enrolled": taken_seats(db, k.id)} for k in classes],
        "mentoring": [MentoringOut.model_validate(m).model_dump(mode="json") for m in mentoring],
        "new_mentoring": db.query(func.count(MentoringRequest.id)).filter(MentoringRequest.status == "novo").scalar(),
        "new_leads": db.query(func.count(Lead.id)).filter(Lead.contacted.is_(False)).scalar(),
        "month_revenue": round(float(month_revenue), 2),
        "students_year": students_year or 0,
        "unread_messages": db.query(func.count(ContactMessage.id)).filter(ContactMessage.read.is_(False)).scalar(),
        "pending_testimonials": db.query(func.count(Testimonial.id)).filter(Testimonial.approved.is_(False)).scalar(),
        "mei": mei_status(db, today.year, today),
        "das_due": {"month": today.month, "year": today.year, "due_day": 20, "paid": bool(das and das.paid)},
    }


@router.get("/audit")
def audit_log(limit: int = 50, db: Session = Depends(get_db)):
    rows = (db.query(AuditLog).options(selectinload(AuditLog.user))
            .order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(min(limit, 200)).all())
    return [{"id": r.id, "when": r.created_at.isoformat() if r.created_at else None,
             "user": r.user.name if r.user else "Sistema", "action": r.action, "entity": r.entity,
             "entity_id": r.entity_id, "summary": r.summary} for r in rows]
