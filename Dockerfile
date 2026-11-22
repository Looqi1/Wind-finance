FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    WINDFINANCE_ENV=prod \
    WINDFINANCE_SIMULATOR=1 \
    WINDFINANCE_LIVE_TRADING=0 \
    WINDFINANCE_ALLOWED_ORIGINS=https://looqi1.github.io

WORKDIR /srv/backend
COPY backend/requirements.txt .
RUN python -m pip install --no-cache-dir -r requirements.txt

COPY backend/app/*.py app/
COPY backend/migrations/ migrations/
COPY backend/alembic.ini backend/start-container.sh ./
COPY sitefinance/index.html sitefinance/style.css sitefinance/script.js /srv/sitefinance/
COPY sitefinance/assets/ /srv/sitefinance/assets/

USER 10001
EXPOSE 8000
CMD ["sh", "./start-container.sh"]
