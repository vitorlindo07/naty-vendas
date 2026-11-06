import os
import shutil
import tempfile

import pytest

_TMP = tempfile.mkdtemp(prefix="natalice-test-")
os.environ["ENV"] = "test"
os.environ["DATA_DIR"] = _TMP
os.environ["SECRET_KEY"] = "chave-de-teste-com-mais-de-trinta-e-dois-bytes"

from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(engine)
    with TestClient(app) as c:      # o lifespan recria as tabelas e o seed básico
        yield c


@pytest.fixture()
def auth(client):
    r = client.post("/api/auth/login", json={"email": "admin@natyalves.com.br", "password": "Trocar@123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def pytest_sessionfinish(session, exitstatus):
    shutil.rmtree(_TMP, ignore_errors=True)
