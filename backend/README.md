# Wind Finance API

FastAPI backend for registration, login, and the current user profile.

## Run

```bash
cd backend
python3 -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 5500
```

Interactive API docs: `http://localhost:5500/docs`

The SQLite database is created automatically at `backend/windfinance.db`.

## Endpoints

- `POST /auth/register` — create an account and receive a JWT
- `POST /auth/login` — sign in and receive a JWT
- `GET /auth/me` — get the authenticated user (`Authorization: Bearer <token>`)
- `GET /health` — service health check

Set `WINDFINANCE_SECRET_KEY` before deploying outside local development.
