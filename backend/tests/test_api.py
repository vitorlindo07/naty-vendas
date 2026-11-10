"""Testes da API: site público, inscrição em turma, pagamento, certificado, mentoria, financeiro/MEI e uploads."""
from datetime import date, timedelta

from app.database import SessionLocal
from app.routers.finance import mei_status

LOGIN = {"email": "admin@natyalves.com.br", "password": "Trocar@123"}
PERSON = {"name": "Ana Teste", "email": "ana@teste.com", "phone": "(19) 99999-0000", "city": "Campinas", "consent": True}
FUTURE = (date.today() + timedelta(days=10)).isoformat()


def _course(client, auth, price=200):
    c = client.get("/api/admin/courses", headers=auth).json()[0]
    body = {k: c[k] for k in ("title", "tagline", "description", "audience", "outcomes", "syllabus", "format",
                               "workload_hours", "price_note", "position", "featured", "active")}
    client.put(f"/api/admin/courses/{c['id']}", headers=auth, json={**body, "price": price})
    return c


def _class(client, auth, course_id, seats=2, **kw):
    r = client.post("/api/admin/classes", headers=auth, json={
        "course_id": course_id, "name": "Turma teste", "start_date": FUTURE, "seats": seats, **kw})
    assert r.status_code == 201, r.text
    return r.json()


# ---------------------------------------------------------------- site público
def test_pages_and_public_data(client):
    for page in ("/", "/cursos", "/curso", "/mentoria", "/treino", "/dicas", "/certificado", "/admin/login"):
        assert client.get(page).status_code == 200, page
    assert client.get("/nao-existe").status_code == 404
    site = client.get("/api/public/site").json()
    assert site["instagram"] == "@naty2naty" and site["whatsapp"] == "(19) 99234-0604"
    assert "pix_key" not in site and "mei_limits" not in site
    courses = client.get("/api/public/courses").json()
    assert len(courses) == 4 and courses[0]["price"] is None       # preço começa "sob consulta"
    posts = client.get("/api/public/posts").json()
    assert len(posts) == 5                                           # só as dicas novas; as 3 antigas começam em rascunho
    assert client.get("/assets/img/cursos/vendas-do-zero.svg").status_code == 200


def test_forms_validation(client):
    assert client.post("/api/public/mentoring", json={**PERSON, "consent": False}).status_code == 422
    assert client.post("/api/public/leads", json={"name": "Zé", "phone": "12", "consent": True}).status_code == 422
    assert client.post("/api/public/leads", json={"name": "Zé", "phone": "(19) 98888-1111", "consent": True,
                                                  "website": "spam"}).status_code == 400
    r = client.post("/api/public/leads", json={"name": "Zé", "phone": "(19) 98888-1111", "consent": True})
    assert r.status_code == 201
    client.post("/api/public/leads", json={"name": "Zé", "phone": "(19) 98888-1111", "consent": True})


# ---------------------------------------------------------------- autenticação
def test_admin_requires_login(client):
    assert client.get("/api/admin/dashboard").status_code == 401
    assert client.post("/api/auth/login", json={**LOGIN, "password": "x"}).status_code == 401


# ---------------------------------------------------------------- jornada do aluno
def test_enroll_pay_complete_certificate(client, auth):
    c = _course(client, auth, price=297)
    k = _class(client, auth, c["id"], seats=2, price=250)
    assert client.get(f"/api/public/courses/{c['slug']}").json()["classes"][0]["seats_left"] == 2

    r = client.post("/api/public/enroll", json={**PERSON, "course_id": c["id"], "class_id": k["id"]})
    assert r.status_code == 201, r.text
    assert r.json()["amount"] == 250                     # preço da turma sobrescreve o do curso
    eid = r.json()["id"]
    # inscrição repetida na mesma turma é bloqueada
    assert client.post("/api/public/enroll", json={**PERSON, "course_id": c["id"], "class_id": k["id"]}).status_code == 409

    entry = client.post(f"/api/admin/enrollments/{eid}/pay", headers=auth, json={"payment_method": "PIX"}).json()
    assert entry["amount"] == 250 and entry["category"] == "Cursos"
    assert client.get(f"/api/admin/enrollments/{eid}", headers=auth).json()["status"] == "confirmada"
    assert client.post(f"/api/admin/enrollments/{eid}/pay", headers=auth, json={}).status_code == 409

    done = client.post(f"/api/admin/classes/{k['id']}/complete", headers=auth).json()
    assert done["completed"] == 1
    code = client.get(f"/api/admin/enrollments/{eid}", headers=auth).json()["certificate_code"]
    cert = client.get(f"/api/public/certificates/{code.lower()}").json()
    assert cert["student"] == "Ana Teste" and cert["hours"] == c["workload_hours"]
    assert client.get("/api/public/certificates/NAOEXISTE").status_code == 404


def test_class_seats_limit(client, auth):
    c = _course(client, auth)
    k = _class(client, auth, c["id"], seats=1)
    assert client.post("/api/public/enroll", json={**PERSON, "course_id": c["id"], "class_id": k["id"]}).status_code == 201
    r = client.post("/api/public/enroll", json={**PERSON, "email": "b@teste.com", "course_id": c["id"], "class_id": k["id"]})
    assert r.status_code == 409 and "vagas" in r.json()["detail"]
    # não dá para reduzir vagas abaixo dos inscritos nem excluir turma com inscritos
    assert client.delete(f"/api/admin/classes/{k['id']}", headers=auth).status_code == 409


def test_enroll_requires_open_class_when_exists(client, auth):
    c = _course(client, auth)
    _class(client, auth, c["id"])
    assert client.post("/api/public/enroll", json={**PERSON, "course_id": c["id"]}).status_code == 400


def test_closed_class_rejects(client, auth):
    c = _course(client, auth)
    k = _class(client, auth, c["id"], status="encerrada")
    assert client.post("/api/public/enroll", json={**PERSON, "course_id": c["id"], "class_id": k["id"]}).status_code == 400


def test_mentoring_flow(client, auth):
    mid = client.post("/api/public/mentoring", json={**PERSON, "kind": "individual", "goal": "Vender mais"}).json()["id"]
    assert client.post(f"/api/admin/mentoring/{mid}/bill", headers=auth, json={}).status_code == 422
    m = client.patch(f"/api/admin/mentoring/{mid}", headers=auth, json={
        "status": "agendado", "price": 180, "scheduled_at": f"{FUTURE}T15:00:00"}).json()
    assert m["student_id"]                                     # vira aluna ao agendar
    assert client.post(f"/api/admin/mentoring/{mid}/bill", headers=auth, json={"payment_method": "PIX"}).status_code == 201
    assert client.post(f"/api/admin/mentoring/{mid}/bill", headers=auth, json={}).status_code == 409
    student = client.get(f"/api/admin/students/{m['student_id']}", headers=auth).json()
    assert student["total_paid"] == 180


def test_student_crud_and_search(client, auth):
    s = client.post("/api/admin/students", headers=auth, json={"name": "Beatriz", "email": "bia@x.com"}).json()
    assert client.post("/api/admin/students", headers=auth, json={"name": "Outra", "email": "bia@x.com"}).status_code == 409
    assert client.get("/api/admin/students?q=beat", headers=auth).json()[0]["id"] == s["id"]
    assert client.delete(f"/api/admin/students/{s['id']}", headers=auth).status_code == 204


def test_posts_publish(client, auth):
    p = client.post("/api/admin/posts", headers=auth, json={"title": "Dica nova", "body": "Texto", "published": True}).json()
    assert p["published_on"] == date.today().isoformat()
    assert client.get(f"/api/public/posts/{p['slug']}").status_code == 200


def test_testimonial_moderation(client, auth):
    client.post("/api/public/testimonials", json={"author": "Carla", "text": "Curso muito bom!", "rating": 5})
    assert client.get("/api/public/testimonials").json() == []
    tid = client.get("/api/admin/testimonials", headers=auth).json()[0]["id"]
    client.patch(f"/api/admin/testimonials/{tid}?approved=true", headers=auth)
    assert len(client.get("/api/public/testimonials").json()) == 1


# ---------------------------------------------------------------- financeiro e MEI
def test_finance_and_mei(client, auth):
    for kind, amount in (("receita", 1000), ("despesa", 120.5)):
        client.post("/api/admin/finance/entries", headers=auth, json={
            "kind": kind, "description": kind, "amount": amount, "date": "2026-03-15"})
    s = client.get("/api/admin/finance/summary?year=2026", headers=auth).json()
    assert s["saldo"] == 879.5
    assert "1000,00" in client.get("/api/admin/finance/export.csv?year=2026", headers=auth).text
    with SessionLocal() as db:
        assert mei_status(db, 2025, today=date(2025, 6, 1))["limit"] == 67500     # proporcional: 10 meses
        assert mei_status(db, 2026, today=date(2026, 6, 1))["limit"] == 81000
    assert [d["month"] for d in client.get("/api/admin/finance/das?year=2025", headers=auth).json()] == list(range(3, 13))


def test_settings_pix_private(client, auth):
    client.put("/api/admin/settings", headers=auth, json={"pix_key": "chave@pix.com", "email": "naty@x.com"})
    site = client.get("/api/public/site").json()
    assert site["has_pix"] and site["email"] == "naty@x.com" and "pix_key" not in site


# ---------------------------------------------------------------- uploads
PNG_1PX = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
           b"\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff?\x00\x05\xfe\x02\xfe\xa7\x35\x81\x84\x00\x00\x00\x00IEND\xaeB`\x82")


def test_course_cover_upload(client, auth):
    c = client.get("/api/admin/courses", headers=auth).json()[0]
    r = client.post(f"/api/admin/courses/{c['id']}/cover", headers=auth, files={"image": ("capa.png", PNG_1PX, "image/png")})
    assert r.status_code == 200 and client.get(r.json()["cover_path"]).status_code == 200
    bad = client.post(f"/api/admin/courses/{c['id']}/cover", headers=auth, files={"image": ("x.jpg", b"MZ nada", "image/jpeg")})
    assert bad.status_code == 415


def test_dashboard_and_audit(client, auth):
    d = client.get("/api/admin/dashboard", headers=auth).json()
    assert {"pending_enrollments", "upcoming_classes", "mei", "new_leads"} <= d.keys()
    client.post("/api/admin/students", headers=auth, json={"name": "Log", "email": "log@x.com"})
    assert any(e["entity"] == "aluno" for e in client.get("/api/admin/audit", headers=auth).json())


def test_new_posts_are_added_once(client):
    from app.database import SessionLocal
    from app.models import Post
    from app.seed import NEW_POSTS, ensure_posts
    with SessionLocal() as db:
        ensure_posts(db)
        db.commit()
        assert db.query(Post).count() == 3 + len(NEW_POSTS)      # rodar de novo não duplica
