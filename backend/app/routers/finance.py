"""Painel: financeiro, controle do limite do MEI e DAS mensal."""
import csv
import io
from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import extract, func
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import audit, current_user, get_or_404
from ..models import DasPayment, FinanceEntry, User
from ..schemas import DasIn, DasOut, FinanceIn, FinanceOut
from ..site_settings import get_all

router = APIRouter(prefix="/api/admin/finance", tags=["Painel · Financeiro"], dependencies=[Depends(current_user)])

MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]


def _filtered(db: Session, year: int | None, month: int | None, kind: str, status: str):
    q = db.query(FinanceEntry).options(selectinload(FinanceEntry.student))
    if year:
        q = q.filter(extract("year", FinanceEntry.date) == year)
    if month:
        q = q.filter(extract("month", FinanceEntry.date) == month)
    if kind:
        q = q.filter(FinanceEntry.kind == kind)
    if status:
        q = q.filter(FinanceEntry.status == status)
    return q.order_by(FinanceEntry.date.desc(), FinanceEntry.id.desc())


@router.get("/entries", response_model=list[FinanceOut])
def list_entries(year: int | None = None, month: int | None = None, kind: str = "", status: str = "",
                 db: Session = Depends(get_db)):
    return _filtered(db, year, month, kind, status).all()


@router.post("/entries", response_model=FinanceOut, status_code=201)
def create_entry(data: FinanceIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    e = FinanceEntry(**data.model_dump())
    db.add(e)
    db.flush()
    audit(db, user, "criou", "financeiro", e.id, f"{e.kind}: {e.description}")
    db.commit()
    db.refresh(e)
    return e


@router.put("/entries/{eid}", response_model=FinanceOut)
def update_entry(eid: int, data: FinanceIn, db: Session = Depends(get_db),
                 user: User = Depends(current_user)):
    e = get_or_404(db, FinanceEntry, eid, "Lançamento")
    for k, v in data.model_dump().items():
        setattr(e, k, v)
    audit(db, user, "editou", "financeiro", eid, e.description)
    db.commit()
    db.refresh(e)
    return e


@router.delete("/entries/{eid}", status_code=204)
def delete_entry(eid: int, db: Session = Depends(get_db), user: User = Depends(current_user)):
    e = get_or_404(db, FinanceEntry, eid, "Lançamento")
    audit(db, user, "excluiu", "financeiro", eid, e.description)
    db.delete(e)
    db.commit()


@router.get("/export.csv")
def export_csv(year: int | None = None, month: int | None = None, kind: str = "", status: str = "",
               db: Session = Depends(get_db)):
    buf = io.StringIO()
    buf.write("﻿")  # BOM para o Excel abrir com acentos
    w = csv.writer(buf, delimiter=";")
    w.writerow(["Data", "Tipo", "Descrição", "Categoria", "Aluno / cliente", "Valor", "Situação",
                "Forma de pagamento", "Nota fiscal"])
    for e in _filtered(db, year, month, kind, status).all():
        w.writerow([e.date.strftime("%d/%m/%Y"), e.kind, e.description, e.category,
                    e.student.name if e.student else "",
                    f"{e.amount:.2f}".replace(".", ","), e.status, e.payment_method, e.invoice_number])
    name = f"financeiro-{year or 'todos'}{'-' + str(month).zfill(2) if month else ''}.csv"
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv; charset=utf-8",
                             headers={"Content-Disposition": f'attachment; filename="{name}"'})


@router.get("/summary")
def summary(year: int, db: Session = Depends(get_db)):
    rows = (db.query(extract("month", FinanceEntry.date).label("m"), FinanceEntry.kind,
                     func.sum(FinanceEntry.amount))
            .filter(extract("year", FinanceEntry.date) == year)
            .group_by("m", FinanceEntry.kind).all())
    months = [{"month": i + 1, "label": MONTHS[i], "receita": 0.0, "despesa": 0.0} for i in range(12)]
    for m, kind, total in rows:
        months[int(m) - 1][kind] = round(float(total or 0), 2)
    for m in months:
        m["saldo"] = round(m["receita"] - m["despesa"], 2)
    pending = (db.query(func.coalesce(func.sum(FinanceEntry.amount), 0))
               .filter(FinanceEntry.kind == "receita", FinanceEntry.status == "pendente").scalar())
    by_cat = (db.query(FinanceEntry.category, func.sum(FinanceEntry.amount))
              .filter(extract("year", FinanceEntry.date) == year, FinanceEntry.kind == "despesa")
              .group_by(FinanceEntry.category).all())
    return {
        "year": year, "months": months,
        "receita": round(sum(m["receita"] for m in months), 2),
        "despesa": round(sum(m["despesa"] for m in months), 2),
        "saldo": round(sum(m["saldo"] for m in months), 2),
        "a_receber": round(float(pending), 2),
        "despesas_por_categoria": sorted(
            [{"category": c or "Sem categoria", "total": round(float(t), 2)} for c, t in by_cat],
            key=lambda x: -x["total"]),
    }


def mei_status(db: Session, year: int, today: date | None = None) -> dict:
    """Calcula o faturamento do ano contra o limite do MEI (proporcional no ano de abertura)."""
    today = today or date.today()
    cfg = get_all(db)
    annual = float(cfg["mei_limits"].get(str(year), 81000))
    opened = date.fromisoformat(cfg["opened_on"]) if cfg.get("opened_on") else None
    first_month = opened.month if opened and opened.year == year else 1
    active_months = 12 - first_month + 1
    limit = round(annual / 12 * active_months, 2)

    revenue = float(db.query(func.coalesce(func.sum(FinanceEntry.amount), 0))
                    .filter(FinanceEntry.kind == "receita", extract("year", FinanceEntry.date) == year)
                    .scalar())
    pct = revenue / limit * 100 if limit else 0
    remaining = limit - revenue
    months_left = 12 - today.month + 1 if today.year == year else (12 if today.year < year else 0)
    if pct >= 100:
        level, message = "estourado", ("Faturamento acima do limite. Procure uma contadora: até 20% acima "
                                       "o MEI paga DAS complementar; acima disso precisa desenquadrar.")
    elif pct >= 80:
        level, message = "atencao", "Mais de 80% do limite usado. Planeje as próximas ações com cuidado."
    else:
        level, message = "ok", "Faturamento dentro do limite do MEI."
    return {
        "year": year, "annual_limit": annual, "limit": limit, "proportional": active_months < 12,
        "active_months": active_months, "revenue": round(revenue, 2), "percent": round(pct, 1),
        "remaining": round(remaining, 2), "tolerance_limit": round(limit * 1.2, 2),
        "monthly_room": round(remaining / months_left, 2) if months_left and remaining > 0 else 0,
        "level": level, "message": message,
    }


@router.get("/mei")
def mei(year: int, db: Session = Depends(get_db)):
    return mei_status(db, year)


@router.get("/das", response_model=list[DasOut])
def list_das(year: int, db: Session = Depends(get_db)):
    cfg = get_all(db)
    opened = date.fromisoformat(cfg["opened_on"]) if cfg.get("opened_on") else None
    first = opened.month if opened and opened.year == year else 1
    if opened and opened.year > year:
        return []
    existing = {d.month: d for d in db.query(DasPayment).filter(DasPayment.year == year)}
    out = []
    for m in range(first, 13):
        d = existing.get(m) or DasPayment(year=year, month=m, amount=float(cfg["das_default"]), paid=False)
        out.append(DasOut.model_validate(d))
    return out


@router.put("/das/{year}/{month}", response_model=DasOut)
def set_das(year: int, month: int, data: DasIn, db: Session = Depends(get_db),
            user: User = Depends(current_user)):
    d = db.query(DasPayment).filter_by(year=year, month=month).first()
    if not d:
        d = DasPayment(year=year, month=month)
        db.add(d)
    d.amount, d.paid = data.amount, data.paid
    d.paid_on = data.paid_on or (date.today() if data.paid else None)
    audit(db, user, "editou", "das", None, f"DAS {month:02d}/{year}: {'pago' if data.paid else 'em aberto'}")
    db.commit()
    return d
