"""Esquemas Pydantic (validação de entrada e formato de saída)."""
import re
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _email(v: str) -> str:
    v = (v or "").strip().lower()
    if not EMAIL_RE.match(v):
        raise ValueError("Informe um e-mail válido.")
    return v


def _phone(v: str) -> str:
    digits = re.sub(r"\D", "", v or "")
    if not 10 <= len(digits) <= 13:
        raise ValueError("Informe um telefone com DDD.")
    return v.strip()


def _consent(v: bool) -> bool:
    if not v:
        raise ValueError("É preciso autorizar o uso dos dados para continuar.")
    return v


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------- auth
class LoginIn(BaseModel):
    email: str
    password: str


class UserOut(ORM):
    id: int
    name: str
    email: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


# ---------------------------------------------------------------- cursos e turmas
CourseFormat = Literal["online_ao_vivo", "presencial", "gravado", "hibrido"]


class CourseIn(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    tagline: str = Field(min_length=2, max_length=255)
    description: str = ""
    audience: str = ""
    outcomes: str = ""
    syllabus: str = ""
    format: CourseFormat = "online_ao_vivo"
    workload_hours: int = Field(8, ge=1, le=400)
    price: float | None = Field(None, ge=0)
    price_note: str = ""
    position: int = 0
    featured: bool = False
    active: bool = True


class CourseOut(ORM):
    id: int
    title: str
    slug: str
    tagline: str
    description: str
    audience: str
    outcomes: str
    syllabus: str
    format: str
    workload_hours: int
    price: float | None
    price_note: str
    cover_path: str | None
    position: int
    featured: bool
    active: bool


ClassStatus = Literal["aberta", "encerrada", "cancelada"]


class ClassIn(BaseModel):
    course_id: int
    name: str = Field(min_length=2, max_length=120)
    start_date: date
    end_date: date | None = None
    schedule: str = ""
    location: str = ""
    online_link: str = ""
    seats: int = Field(20, ge=1, le=1000)
    price: float | None = Field(None, ge=0)
    status: ClassStatus = "aberta"


class ClassPublic(ORM):
    id: int
    course_id: int
    name: str
    start_date: date
    end_date: date | None
    schedule: str
    location: str
    seats: int
    price: float | None
    status: str
    seats_left: int = 0


class ClassOut(ClassPublic):
    online_link: str
    course: CourseOut | None = None
    enrolled: int = 0


class CourseDetail(CourseOut):
    classes: list[ClassPublic] = []


# ---------------------------------------------------------------- alunos e inscrições
class StudentIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str
    phone: str = ""
    city: str = ""
    company: str = ""
    notes: str = ""
    _v = field_validator("email")(_email)


class StudentOut(ORM):
    id: int
    name: str
    email: str
    phone: str
    city: str
    company: str
    notes: str
    created_at: datetime


class EnrollIn(BaseModel):
    """Inscrição feita pelo site."""
    course_id: int
    class_id: int | None = None
    name: str = Field(min_length=2, max_length=120)
    email: str
    phone: str
    city: str = ""
    company: str = Field("", max_length=160)
    consent: bool
    website: str = ""
    _v_email = field_validator("email")(_email)
    _v_phone = field_validator("phone")(_phone)
    _v_consent = field_validator("consent")(_consent)


EnrollmentStatus = Literal["pendente", "confirmada", "concluida", "cancelada"]


class EnrollmentAdminIn(BaseModel):
    student_id: int
    course_id: int
    class_id: int | None = None
    status: EnrollmentStatus = "pendente"
    amount: float = Field(0, ge=0)
    notes: str = ""


class EnrollmentUpdate(BaseModel):
    status: EnrollmentStatus | None = None
    amount: float | None = Field(None, ge=0)
    class_id: int | None = None
    notes: str | None = None


class PaymentIn(BaseModel):
    payment_method: str = "PIX"
    paid_on: date | None = None
    invoice_number: str = ""


class EnrollmentOut(ORM):
    id: int
    student_id: int
    student: StudentOut | None = None
    course_id: int
    course: CourseOut | None = None
    class_id: int | None
    course_class: ClassPublic | None = None
    status: str
    amount: float
    paid: bool
    paid_on: date | None
    payment_method: str
    certificate_code: str | None
    completed_on: date | None
    notes: str
    created_at: datetime


# ---------------------------------------------------------------- mentoria e leads
class MentoringIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str
    phone: str
    kind: Literal["individual", "equipe"] = "individual"
    team_size: int | None = Field(None, ge=2, le=500)
    goal: str = Field("", max_length=3000)
    preferred_times: str = Field("", max_length=200)
    consent: bool
    website: str = ""
    _v_email = field_validator("email")(_email)
    _v_phone = field_validator("phone")(_phone)
    _v_consent = field_validator("consent")(_consent)


MentoringStatus = Literal["novo", "agendado", "realizado", "cancelado"]


class MentoringUpdate(BaseModel):
    status: MentoringStatus | None = None
    scheduled_at: datetime | None = None
    price: float | None = Field(None, ge=0)
    notes: str | None = None


class MentoringOut(ORM):
    id: int
    name: str
    email: str
    phone: str
    kind: str
    team_size: int | None
    goal: str
    preferred_times: str
    status: str
    scheduled_at: datetime | None
    price: float | None
    notes: str
    student_id: int | None
    created_at: datetime


class LeadIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str
    email: str = ""
    interest: str = Field("", max_length=120)
    consent: bool
    website: str = ""
    _v_phone = field_validator("phone")(_phone)
    _v_consent = field_validator("consent")(_consent)

    @field_validator("email")
    @classmethod
    def _opt_email(cls, v):
        return _email(v) if v else ""


class LeadOut(ORM):
    id: int
    name: str
    phone: str
    email: str
    interest: str
    contacted: bool
    created_at: datetime


# ---------------------------------------------------------------- conteúdo
class PostIn(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    excerpt: str = Field("", max_length=300)
    body: str = ""
    published: bool = False
    published_on: date | None = None


class PostOut(ORM):
    id: int
    title: str
    slug: str
    excerpt: str
    body: str
    cover_path: str | None
    published: bool
    published_on: date | None


class TestimonialIn(BaseModel):
    author: str = Field(min_length=2, max_length=120)
    role: str = Field("", max_length=120)
    text: str = Field(min_length=10, max_length=800)
    rating: int = Field(5, ge=1, le=5)
    website: str = ""


class TestimonialOut(ORM):
    id: int
    author: str
    role: str
    text: str
    rating: int
    approved: bool
    created_at: datetime


class ContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str
    phone: str = ""
    message: str = Field(min_length=5, max_length=3000)
    consent: bool
    website: str = ""
    _v_email = field_validator("email")(_email)
    _v_consent = field_validator("consent")(_consent)


class ContactOut(ORM):
    id: int
    name: str
    email: str
    phone: str
    message: str
    read: bool
    created_at: datetime


# ---------------------------------------------------------------- financeiro
class FinanceIn(BaseModel):
    kind: Literal["receita", "despesa"]
    description: str = Field(min_length=2, max_length=200)
    category: str = ""
    amount: float = Field(gt=0)
    date: date
    status: Literal["pago", "pendente"] = "pago"
    payment_method: str = ""
    invoice_number: str = ""
    enrollment_id: int | None = None
    mentoring_id: int | None = None
    student_id: int | None = None


class FinanceOut(ORM):
    id: int
    kind: str
    description: str
    category: str
    amount: float
    date: date
    status: str
    payment_method: str
    invoice_number: str
    enrollment_id: int | None
    mentoring_id: int | None
    student_id: int | None
    student: StudentOut | None = None


class DasIn(BaseModel):
    amount: float = Field(ge=0)
    paid: bool
    paid_on: date | None = None


class DasOut(ORM):
    year: int
    month: int
    amount: float
    paid: bool
    paid_on: date | None
