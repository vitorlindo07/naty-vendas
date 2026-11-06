# Publicação

O sistema é um único serviço (API + site + painel) e precisa de um servidor que rode Python ou Docker.
O banco (SQLite) e as fotos ficam em uma pasta de dados que **precisa ser persistente e ter backup**.

## Opção 1 — VPS com Docker (recomendado)
1. Servidor Linux pequeno (1 vCPU, 1 GB de RAM é suficiente).
2. `git clone` do repositório, `cp .env.example .env` e preencha:
   - `SECRET_KEY` → `python -c "import secrets; print(secrets.token_urlsafe(48))"`
   - `ADMIN_EMAIL` e `ADMIN_PASSWORD` do primeiro acesso
3. `docker compose up -d`
4. Coloque um proxy com HTTPS na frente (Caddy é o mais simples):
   ```
   natyalves.com.br {
       reverse_proxy localhost:8000
   }
   ```
5. Backup diário do volume `dados` (contém `app.db` e `uploads/`), por exemplo com `cron` + `rclone`.

## Opção 2 — Plataforma gerenciada (Render, Railway, Fly.io)
- Comando de início: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers`
- Adicione um **disco persistente** e aponte `DATA_DIR` para ele; sem disco, os dados somem a cada deploy.
- Ou use PostgreSQL gerenciado: `DATABASE_URL=postgresql+psycopg://...` e instale `psycopg[binary]`.
  As fotos continuam em `DATA_DIR/uploads`.

## Checklist antes de divulgar
- [ ] Senha inicial trocada
- [ ] `SECRET_KEY` definida no `.env`
- [ ] HTTPS ativo
- [ ] WhatsApp, e-mail e região preenchidos em Configurações
- [ ] Backup testado (restaurar uma cópia em outra pasta e abrir o painel)
- [ ] Nenhum dado de demonstração (`--demo`) no banco de produção
