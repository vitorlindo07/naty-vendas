"""Modelo de dados (ORM SQLAlchemy 2.0). Diagrama em docs/MODELO_DE_DADOS.md."""
from datetime import date, datetime

from sqlalchemy import (Boolean, Date, DateTime, Float, ForeignKey, Integer, LargeBinary, String, Text,
                        UniqueConstraint, func)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


# ---------------------------------------------------------------- acesso e sistema
class User(TimestampMixin, Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Setting(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[str] = mapped_column(Text)


class StoredImage(Base):
    """Imagem enviada pelo painel, guardada no banco (funciona também na Vercel)."""
    __tablename__ = "stored_images"
    name: Mapped[str] = mapped_column(String(60), primary_key=True)
    content_type: Mapped[str] = mapped_column(String(30))
    data: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(20))
    entity: Mapped[str] = mapped_column(String(40))
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    summary: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)
    user: Mapped["User | None"] = relationship()


# ---------------------------------------------------------------- cursos
COURSE_FORMATS = ("online_ao_vivo", "presencial", "gravado", "hibrido")


class Course(TimestampMixin, Base):
    __tablename__ = "courses"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    tagline: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    audience: Mapped[str] = mapped_column(Text, default="")       # para quem é (uma linha por item)
    outcomes: Mapped[str] = mapped_column(Text, default="")       # o que vai aprender (uma linha por item)
    syllabus: Mapped[str] = mapped_column(Text, default="")       # "Módulo: conteúdo" (uma linha por módulo)
    format: Mapped[str] = mapped_column(String(20), default="online_ao_vivo")
    workload_hours: Mapped[int] = mapped_column(Integer, default=8)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)   # vazio = "valor sob consulta"
    price_note: Mapped[str] = mapped_column(String(160), default="")     # ex.: "ou 3x no cartão"
    cover_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    classes: Mapped[list["CourseClass"]] = relationship(back_populates="course", cascade="all, delete-orphan")


CLASS_STATUSES = ("aberta", "encerrada", "cancelada")


class CourseClass(TimestampMixin, Base):
    """Turma: uma edição do curso com data, horário e vagas."""
    __tablename__ = "course_classes"
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    start_date: Mapped[date] = mapped_column(Date, index=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    schedule: Mapped[str] = mapped_column(String(160), default="")      # "Sábados, das 9h às 12h"
    location: Mapped[str] = mapped_column(String(200), default="")      # endereço ou "Online, ao vivo"
    online_link: Mapped[str] = mapped_column(String(255), default="")   # só no painel
    seats: Mapped[int] = mapped_column(Integer, default=20)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)   # sobrescreve o preço do curso
    status: Mapped[str] = mapped_column(String(20), default="aberta")
    course: Mapped["Course"] = relationship(back_populates="classes")
    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="course_class")


# ---------------------------------------------------------------- alunos e inscrições
class Student(TimestampMixin, Base):
    __tablename__ = "students"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), index=True)
    phone: Mapped[str] = mapped_column(String(40), default="")
    city: Mapped[str] = mapped_column(String(120), default="")
    company: Mapped[str] = mapped_column(String(160), default="")   # onde trabalha / o que vende
    notes: Mapped[str] = mapped_column(Text, default="")
    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="student")


ENROLLMENT_STATUSES = ("pendente", "confirmada", "concluida", "cancelada")


class Enrollment(TimestampMixin, Base):
    __tablename__ = "enrollments"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    class_id: Mapped[int | None] = mapped_column(ForeignKey("course_classes.id", ondelete="SET NULL"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pendente", index=True)
    amount: Mapped[float] = mapped_column(Float, default=0)
    paid: Mapped[bool] = mapped_column(Boolean, default=False)
    paid_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    payment_method: Mapped[str] = mapped_column(String(30), default="")
    certificate_code: Mapped[str | None] = mapped_column(String(16), unique=True, nullable=True)
    completed_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    consent: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str] = mapped_column(Text, default="")
    student: Mapped["Student"] = relationship(back_populates="enrollments")
    course: Mapped["Course"] = relationship()
    course_class: Mapped["CourseClass | None"] = relationship(back_populates="enrollments")


# ---------------------------------------------------------------- mentoria e captação
MENTORING_STATUSES = ("novo", "agendado", "realizado", "cancelado")


class MentoringRequest(TimestampMixin, Base):
    __tablename__ = "mentoring_requests"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str] = mapped_column(String(40))
    kind: Mapped[str] = mapped_column(String(20), default="individual")   # individual | equipe
    team_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    goal: Mapped[str] = mapped_column(Text, default="")
    preferred_times: Mapped[str] = mapped_column(String(200), default="")
    status: Mapped[str] = mapped_column(String(20), default="novo", index=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    consent: Mapped[bool] = mapped_column(Boolean, default=False)
    student_id: Mapped[int | None] = mapped_column(ForeignKey("students.id", ondelete="SET NULL"), nullable=True)


class Lead(Base):
    """Pessoa que pediu para receber dicas / avisos de novas turmas."""
    __tablename__ = "leads"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(40))
    email: Mapped[str] = mapped_column(String(160), default="")
    interest: Mapped[str] = mapped_column(String(120), default="")
    contacted: Mapped[bool] = mapped_column(Boolean, default=False)
    consent: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ---------------------------------------------------------------- conteúdo
class Post(TimestampMixin, Base):
    """Dica de vendas (blog)."""
    __tablename__ = "posts"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True)
    excerpt: Mapped[str] = mapped_column(String(300), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    cover_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, default=False)
    published_on: Mapped[date | None] = mapped_column(Date, nullable=True)


class Testimonial(TimestampMixin, Base):
    __tablename__ = "testimonials"
    id: Mapped[int] = mapped_column(primary_key=True)
    author: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(120), default="")   # ex.: "aluna do Vendas do Zero"
    text: Mapped[str] = mapped_column(Text)
    rating: Mapped[int] = mapped_column(Integer, default=5)
    approved: Mapped[bool] = mapped_column(Boolean, default=False)


class ContactMessage(Base):
    __tablename__ = "contact_messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str] = mapped_column(String(40), default="")
    message: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ---------------------------------------------------------------- financeiro / MEI
class FinanceEntry(TimestampMixin, Base):
    __tablename__ = "finance_entries"
    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(10), index=True)        # receita | despesa
    description: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(60), default="")
    amount: Mapped[float] = mapped_column(Float)
    date: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(10), default="pago")
    payment_method: Mapped[str] = mapped_column(String(30), default="")
    invoice_number: Mapped[str] = mapped_column(String(40), default="")
    enrollment_id: Mapped[int | None] = mapped_column(ForeignKey("enrollments.id", ondelete="SET NULL"), nullable=True)
    mentoring_id: Mapped[int | None] = mapped_column(ForeignKey("mentoring_requests.id", ondelete="SET NULL"), nullable=True)
    student_id: Mapped[int | None] = mapped_column(ForeignKey("students.id", ondelete="SET NULL"), nullable=True)
    student: Mapped["Student | None"] = relationship()


class DasPayment(Base):
    __tablename__ = "das_payments"
    __table_args__ = (UniqueConstraint("year", "month"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)
    amount: Mapped[float] = mapped_column(Float, default=0)
    paid: Mapped[bool] = mapped_column(Boolean, default=False)
    paid_on: Mapped[date | None] = mapped_column(Date, nullable=True)
