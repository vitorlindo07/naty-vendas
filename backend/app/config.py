"""Configurações da aplicação, lidas de variáveis de ambiente (.env)."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent          # backend/
PROJECT_DIR = BASE_DIR.parent                               # raiz do projeto


def _load_dotenv() -> None:
    """Carrega um arquivo .env simples (CHAVE=valor) sem dependências externas."""
    env_file = PROJECT_DIR / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv()


class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "Naty Alves · Mentoria e Cursos de Vendas")
    ENV: str = os.getenv("ENV", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    TOKEN_EXPIRE_MINUTES: int = int(os.getenv("TOKEN_EXPIRE_MINUTES", "480"))

    DATA_DIR: Path = Path(os.getenv("DATA_DIR", str(BASE_DIR / "data")))
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'app.db'}")
    UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", str(DATA_DIR / "uploads")))
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "5"))

    FRONTEND_DIR: Path = PROJECT_DIR / "frontend"

    ADMIN_NAME: str = os.getenv("ADMIN_NAME", "Natalice")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@natyalves.com.br")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "Trocar@123")

    CORS_ORIGINS: list[str] = [o for o in os.getenv("CORS_ORIGINS", "").split(",") if o]


settings = Settings()
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

if not os.getenv("SECRET_KEY"):
    # Sem SECRET_KEY definida: gera uma chave aleatória e guarda junto aos dados,
    # para que os logins continuem válidos depois de reiniciar o servidor.
    import secrets
    secret_file = settings.DATA_DIR / ".secret_key"
    if not secret_file.exists():
        secret_file.write_text(secrets.token_urlsafe(48))
    settings.SECRET_KEY = secret_file.read_text().strip()
