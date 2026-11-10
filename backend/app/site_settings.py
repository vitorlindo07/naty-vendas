"""Configurações editáveis pelo painel (textos, contato, pagamento e parâmetros do MEI)."""
import json
import re
import unicodedata

from sqlalchemy.orm import Session

from .models import Setting

DEFAULTS: dict = {
    "business_name": "Naty Alves",
    "business_subtitle": "Mentora de vendas",
    "headline": "Vender é uma habilidade. E habilidade se aprende.",
    "intro": ("Cursos e mentoria para quem quer abordar sem medo, responder objeções com calma e fechar "
              "mais vendas, seja na loja, no WhatsApp ou no Instagram."),
    "about": ("Sou Natalice Alves da Silva, a Naty. Trabalho com vendas no lugar onde elas acontecem: "
              "no corredor da loja, na conversa com o cliente, na hora em que ele decide se leva ou não.\n\n"
              "Passei pelo varejo de moda, em loja com padrão de atendimento avaliado por cliente oculto, meta do dia "
              "e treino constante da equipe. Foi ali que aprendi que vender não é empurrar produto: é entender o que "
              "a pessoa precisa, mostrar com clareza e conduzir até a decisão. Aprendi também que excelência não é "
              "ser perfeito o tempo todo, e sim ser consistente no que importa.\n\n"
              "Hoje ensino esse caminho para quem está começando e para quem já vende e quer resultados mais "
              "constantes.\n\n"
              "Minhas aulas são práticas: cada encontro tem simulação, roteiro pronto para usar no dia "
              "seguinte e espaço para tirar dúvidas da sua realidade."),
    "region": "Campinas e região – SP, e online para todo o Brasil",
    "phone": "(19) 99234-0604",
    "whatsapp": "(19) 99234-0604",
    "email": "",
    "instagram": "@naty2naty",
    "cnpj": "59.794.471/0001-61",
    "legal_name": "59.794.471 NATALICE ALVES DA SILVA",
    "cnae": "7319-0/02 – Promoção de vendas",
    "opened_on": "2025-03-07",
    "pix_key": "",
    "pix_name": "Natalice Alves da Silva",
    "mentoring_text": ("Encontros individuais de 1 hora, online ou presenciais, para destravar o seu jeito de vender: "
                       "análise das suas conversas reais, roteiro de abordagem e plano de ação para as próximas semanas. "
                       "Também atendo equipes de loja e de vendas."),
    "mei_limits": {"2025": 81000, "2026": 81000, "2027": 110000},
    "das_default": 86.05,
}

PUBLIC_KEYS = ("business_name", "business_subtitle", "headline", "intro", "about", "region", "phone",
               "whatsapp", "email", "instagram", "cnpj", "legal_name", "mentoring_text", "pix_name")


def get_all(db: Session) -> dict:
    data = json.loads(json.dumps(DEFAULTS))
    for row in db.query(Setting).all():
        try:
            data[row.key] = json.loads(row.value)
        except json.JSONDecodeError:
            data[row.key] = row.value
    return data


def get_public(db: Session) -> dict:
    all_ = get_all(db)
    return {k: all_[k] for k in PUBLIC_KEYS} | {"has_pix": bool(all_.get("pix_key"))}


def update(db: Session, values: dict) -> dict:
    for key, value in values.items():
        if key not in DEFAULTS:
            continue
        row = db.get(Setting, key)
        encoded = json.dumps(value, ensure_ascii=False)
        if row:
            row.value = encoded
        else:
            db.add(Setting(key=key, value=encoded))
    db.commit()
    return get_all(db)


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "item"


def unique_slug(db: Session, model, title: str, exclude_id: int | None = None) -> str:
    base = slugify(title)
    slug, n = base, 2
    while True:
        q = db.query(model).filter(model.slug == slug)
        if exclude_id:
            q = q.filter(model.id != exclude_id)
        if not q.first():
            return slug
        slug, n = f"{base}-{n}", n + 1
