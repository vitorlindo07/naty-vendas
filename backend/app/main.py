"""Ponto de entrada da aplicação: API + site público + painel administrativo."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import settings
from .database import Base, SessionLocal, engine
from .models import StoredImage
from .routers import academy, auth, content, courses, dashboard, finance, public
from .seed import seed_base

PAGES = {
    "": "index.html", "cursos": "cursos.html", "curso": "curso.html", "mentoria": "mentoria.html",
    "treino": "treino.html", "dicas": "dicas.html", "dica": "dica.html", "sobre": "sobre.html", "contato": "contato.html",
    "depoimento": "depoimento.html", "certificado": "certificado.html", "privacidade": "privacidade.html",
    "admin": "admin/index.html", "admin/login": "admin/login.html",
}


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        try:
            seed_base(db)
        except IntegrityError:
            # outra instância (na Vercel podem subir várias ao mesmo tempo) já criou os dados iniciais
            db.rollback()
    yield


app = FastAPI(
    title="Naty Alves · Mentoria e Cursos de Vendas — API",
    description="API do site e do sistema de gestão (cursos, turmas, inscrições, mentorias, financeiro e MEI).",
    version="1.0.0",
    lifespan=lifespan,
)

if settings.CORS_ORIGINS:
    app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True,
                       allow_methods=["*"], allow_headers=["*"])


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    if request.url.path.startswith("/api/admin"):
        response.headers["Cache-Control"] = "no-store"
    return response


for r in (auth.router, public.router, courses.router, academy.router, content.router, finance.router,
          dashboard.router):
    app.include_router(r)


@app.get("/api/health", tags=["Sistema"])
def health():
    return {"status": "ok", "database": engine.dialect.name}


@app.get("/uploads/{name}", include_in_schema=False)
def uploaded_image(name: str):
    with SessionLocal() as db:
        img = db.get(StoredImage, name)
        if not img:
            raise StarletteHTTPException(404)
        return Response(img.data, media_type=img.content_type,
                        headers={"Cache-Control": "public, max-age=31536000, immutable"})


app.mount("/assets", StaticFiles(directory=settings.FRONTEND_DIR / "assets"), name="assets")


@app.exception_handler(StarletteHTTPException)
async def not_found(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404 and not request.url.path.startswith("/api"):
        return FileResponse(settings.FRONTEND_DIR / "404.html", status_code=404)
    return JSONResponse({"detail": exc.detail}, status_code=exc.status_code, headers=getattr(exc, "headers", None))


@app.get("/{page:path}", include_in_schema=False)
def serve_page(page: str):
    page = page.strip("/").removesuffix(".html")
    if page in PAGES:
        return FileResponse(settings.FRONTEND_DIR / PAGES[page])
    raise StarletteHTTPException(404)
