#!/bin/sh
set -eu

: "${DATABASE_URL:?Set DATABASE_URL to the connected PostgreSQL database}"
case "$DATABASE_URL" in
    postgres://*|postgresql://*)
        export DATABASE_URL="postgresql+psycopg://${DATABASE_URL#*://}"
        ;;
esac

python -m alembic upgrade head
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
