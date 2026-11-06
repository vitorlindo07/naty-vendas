"""Ponto de entrada para a Vercel.

A Vercel procura um objeto FastAPI chamado `app` neste arquivo. O código de verdade fica em backend/app;
aqui só colocamos a pasta backend no caminho de importação e reexportamos a aplicação.
Para rodar no computador, continue usando: cd backend && python -m uvicorn app.main:app --reload
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "backend"))

from app.main import app  # noqa: E402,F401
