from __future__ import annotations

import hashlib
import base64
import html
import hmac
import json
import os
import secrets
import time
import uuid
import re
import xml.etree.ElementTree as ET
import asyncio
import logging
import smtplib
from email.message import EmailMessage
from email.utils import parsedate_to_datetime
from collections import defaultdict, deque
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Literal
from urllib.parse import parse_qsl

import httpx
import jwt
import pyotp
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pwdlib import PasswordHash
from cryptography.fernet import Fernet, InvalidToken
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, create_engine, desc, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from .cbr_history import CBR_HISTORY_URL, CBR_TIMEZONE, history_params, parse_history

# ---------------- настройки ----------------
BASE_DIR = Path(__file__).resolve().parent.parent
FRONT_DIR = BASE_DIR.parent / "sitefinance"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'windfinance2.db'}")
ENV = os.getenv("WINDFINANCE_ENV", "dev")
SECRET_KEY = os.getenv("WINDFINANCE_SECRET_KEY") or ("dev-only-change-this-secret" if ENV == "dev" else "")
if not SECRET_KEY:
    raise RuntimeError("Задай переменную окружения WINDFINANCE_SECRET_KEY")
if ENV == "prod" and len(SECRET_KEY) < 32:
    raise RuntimeError("WINDFINANCE_SECRET_KEY должен содержать минимум 32 символа")
TG_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
SIMULATOR = os.getenv("WINDFINANCE_SIMULATOR", "0") == "1"
YOOKASSA_SHOP_ID = os.getenv("YOOKASSA_SHOP_ID", "")
YOOKASSA_SECRET_KEY = os.getenv("YOOKASSA_SECRET_KEY", "")
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
BYBIT_API_KEY = os.getenv("BYBIT_API_KEY", "")
BYBIT_API_SECRET = os.getenv("BYBIT_API_SECRET", "")
BYBIT_API_BASE_URL = os.getenv("BYBIT_API_BASE_URL", "https://api-testnet.bybit.com").rstrip("/")
BYBIT_LIVE_TRADING = os.getenv("WINDFINANCE_LIVE_TRADING", "0") == "1"
# Реферальный код партнёрской программы Bybit (affiliates.bybit.com).
BYBIT_REF_CODE = os.getenv("BYBIT_REF_CODE", "393YMZP").strip()
BYBIT_ADMIN_USER_IDS = {
    int(value.strip()) for value in os.getenv("BYBIT_ADMIN_USER_IDS", "").split(",")
    if value.strip().isdigit()
}
BYBIT_ALLOWED_SYMBOLS = {"BTCUSDT", "ETHUSDT", "SOLUSDT"}
BYBIT_MAX_NOTIONAL_USDT = Decimal(os.getenv("BYBIT_MAX_NOTIONAL_USDT", "100"))
ALLOWED_ORIGINS = [origin.strip().rstrip("/") for origin in os.getenv("WINDFINANCE_ALLOWED_ORIGINS", "").split(",") if origin.strip()]
NEWS_RSS_URL = os.getenv(  # устарело: ленты задаются в NEWS_FEEDS
    "NEWS_RSS_URL",
    "https://news.google.com/rss/search?q=%28S%26P%20500%20OR%20Nasdaq%20OR%20Dow%20Jones%20OR%20%D0%A4%D0%A0%D0%A1%20OR%20%D0%B0%D0%BC%D0%B5%D1%80%D0%B8%D0%BA%D0%B0%D0%BD%D1%81%D0%BA%D0%B8%D0%B5%20%D0%B0%D0%BA%D1%86%D0%B8%D0%B8%20OR%20%D1%84%D0%BE%D0%BD%D0%B4%D0%BE%D0%B2%D1%8B%D0%B9%20%D1%80%D1%8B%D0%BD%D0%BE%D0%BA%29%20%28%D0%B0%D0%BD%D0%B0%D0%BB%D0%B8%D0%B7%20OR%20%D0%BE%D0%B1%D0%B7%D0%BE%D1%80%20OR%20%D0%BF%D1%80%D0%BE%D0%B3%D0%BD%D0%BE%D0%B7%29%20-%D1%81%D0%BC%D0%B0%D1%80%D1%82%D1%84%D0%BE%D0%BD%20-%D1%82%D0%B5%D1%85%D0%BD%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D0%B8&hl=ru&gl=RU&ceid=RU:ru",
)
TRUST_PROXY = os.getenv("TRUST_PROXY", "0") == "1"           # включи за nginx/Cloudflare
TOKEN_EXPIRE_DAYS = 7
START_BALANCE_KOP = 2_450_000 if SIMULATOR else 0
PLANS = {"month": (19_900, 30), "year": (179_000, 365)}      # цена в копейках, дней
STARS_TOPUPS = {"topup_1000": 1000, "topup_5000": 5000, "topup_10000": 10000}
STARS_PRICES = json.loads(os.getenv("WINDFINANCE_STARS_PRICES") or "{}")
if not isinstance(STARS_PRICES, dict) or any(
    (offer not in STARS_TOPUPS and offer not in PLANS) or type(price) is not int or not 1 <= price <= 10000
    for offer, price in STARS_PRICES.items()
):
    raise RuntimeError("Проверь WINDFINANCE_STARS_PRICES: нужны коды товаров и целые цены в Stars")
STARS_INVOICE_TTL = timedelta(minutes=30)
BONUS_RUB = [5000, 3000, 2000] + [1000] * 7                  # бонус за места 1..10
EXCHANGE_FEE_PCT = Decimal(os.getenv("WINDFINANCE_EXCHANGE_FEE_PCT", "1.0"))
EXCHANGE_FEE_PLUS_PCT = Decimal(os.getenv("WINDFINANCE_EXCHANGE_FEE_PLUS_PCT", "0.6"))
EXCHANGE_MIN_RUB = Decimal("10")                             # минимальный обмен в рублёвом эквиваленте
RATE_MAX_AGE = timedelta(hours=72)                           # курс ЦБ старше этого считаем устаревшим
INVEST_MIN_RUB = Decimal("100")
TRIAL_DAYS = 7
ALERT_LIMIT_FREE, ALERT_LIMIT_PLUS = 3, 30
GOALS_LIMIT = 10
RESET_TOKEN_TTL = timedelta(minutes=30)
ADMIN_USER_IDS = {
    int(value.strip()) for value in os.getenv("WINDFINANCE_ADMIN_USER_IDS", "").split(",")
    if value.strip().isdigit()
}
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://looqi1.github.io/Wind-finance/").rstrip("/") + "/"
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)
TG_BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "")
TG_WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")
ALERT_CHECK_SECONDS = int(os.getenv("WINDFINANCE_ALERT_CHECK_SECONDS", "30"))
log = logging.getLogger("windfinance")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
if ENV == "prod" and DATABASE_URL.startswith("sqlite"):
    raise RuntimeError("В production нужен PostgreSQL, SQLite запрещён")
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
password_hash = PasswordHash.recommended()
DUMMY_HASH = password_hash.hash("dummy-password-for-timing")
bearer_scheme = HTTPBearer(auto_error=False)
_totp_cipher = Fernet(base64.urlsafe_b64encode(hashlib.sha256(SECRET_KEY.encode()).digest()))


def now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def protect_totp_secret(secret: str) -> str:
    return "enc:" + _totp_cipher.encrypt(secret.encode()).decode()


def reveal_totp_secret(value: str | None) -> str | None:
    if not value:
        return None
    if not value.startswith("enc:"):
        return value
    try:
        return _totp_cipher.decrypt(value[4:].encode()).decode()
    except InvalidToken:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Не удалось открыть ключ 2FA")


def ensure_protected_totp_secret(user: User, db: Session) -> str | None:
    secret = reveal_totp_secret(user.totp_secret)
    if secret and user.totp_secret and not user.totp_secret.startswith("enc:"):
        user.totp_secret = protect_totp_secret(secret)
        db.flush()
    return secret


def iso(dt: datetime | None) -> str | None:
    return dt.isoformat() + "Z" if dt else None


def iso_week(dt: datetime) -> str:
    return dt.strftime("%G-W%V")


# ---------------- модели ----------------
class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_naive)
    accepted_terms_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    balance_kop: Mapped[int] = mapped_column(Integer, default=START_BALANCE_KOP)
    plus_plan: Mapped[str | None] = mapped_column(String(10), nullable=True)
    plus_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    totp_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)
    totp_enabled: Mapped[bool] = mapped_column(default=False)
    tg_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True)
    trial_used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Transaction(Base):
    __tablename__ = "transactions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(3))          # in / out
    title: Mapped[str] = mapped_column(String(80))
    amount_kop: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_naive, index=True)


class AssetBalance(Base):
    __tablename__ = "asset_balances"
    __table_args__ = (UniqueConstraint("user_id", "asset", name="uq_asset_balance_user_asset"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    asset: Mapped[str] = mapped_column(String(12))
    quantity: Mapped[Decimal] = mapped_column(Numeric(28, 12), default=Decimal("0"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_naive, onupdate=now_naive)


class Holding(Base):
    """Позиция в инвестиционном симуляторе: количество и сколько рублей в неё вложено."""
    __tablename__ = "holdings"
    __table_args__ = (UniqueConstraint("user_id", "asset", name="uq_holding_user_asset"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    asset: Mapped[str] = mapped_column(String(12))
    quantity: Mapped[Decimal] = mapped_column(Numeric(28, 12), default=Decimal("0"))
    cost_kop: Mapped[int] = mapped_column(BigInteger, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_naive, onupdate=now_naive)


class InvestTrade(Base):
    """Журнал сделок симулятора: нужен для истории, реализованного результата и недельного рейтинга."""
    __tablename__ = "invest_trades"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    asset: Mapped[str] = mapped_column(String(12))
    side: Mapped[str] = mapped_column(String(4))                 # buy / sell
    quantity: Mapped[Decimal] = mapped_column(Numeric(28, 12))
    price: Mapped[Decimal] = mapped_column(Numeric(28, 8))
    amount_kop: Mapped[int] = mapped_column(BigInteger)
    cost_kop: Mapped[int] = mapped_column(BigInteger, default=0)  # себестоимость проданной части
    pnl_kop: Mapped[int] = mapped_column(BigInteger, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_naive, index=True)


class PortfolioSnapshot(Base):
    """Стоимость портфеля на конец дня (последнее значение за день)."""
    __tablename__ = "portfolio_snapshots"
    __table_args__ = (UniqueConstraint("user_id", "day", name="uq_snapshot_user_day"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    day: Mapped[str] = mapped_column(String(10))
    invested_kop: Mapped[int] = mapped_column(BigInteger, default=0)
    cost_kop: Mapped[int] = mapped_column(BigInteger, default=0)
    cash_kop: Mapped[int] = mapped_column(BigInteger, default=0)


class SavingsGoal(Base):
    __tablename__ = "savings_goals"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(60))
    target_kop: Mapped[int] = mapped_column(BigInteger)
    saved_kop: Mapped[int] = mapped_column(BigInteger, default=0)
    deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_naive)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class PriceAlert(Base):
    __tablename__ = "price_alerts"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    symbol: Mapped[str] = mapped_column(String(20))
    direction: Mapped[str] = mapped_column(String(5))            # above / below
    price: Mapped[Decimal] = mapped_column(Numeric(28, 8))
    start_price: Mapped[Decimal | None] = mapped_column(Numeric(28, 8), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_naive)
    triggered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    triggered_price: Mapped[Decimal | None] = mapped_column(Numeric(28, 8), nullable=True)
    notified_via: Mapped[str | None] = mapped_column(String(20), nullable=True)


class PasswordReset(Base):
    __tablename__ = "password_resets"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_naive)


class RateSnapshot(Base):
    __tablename__ = "rate_snapshots"
    id: Mapped[int] = mapped_column(primary_key=True)
    asset: Mapped[str] = mapped_column(String(12), index=True)
    rub_rate: Mapped[Decimal] = mapped_column(Numeric(28, 12))
    source: Mapped[str] = mapped_column(String(80))
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=now_naive, index=True)


class TradeOrder(Base):
    __tablename__ = "trade_orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    provider: Mapped[str] = mapped_column(String(20), default="bybit")
    provider_order_id: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    client_order_id: Mapped[str] = mapped_column(String(36), unique=True)
    symbol: Mapped[str] = mapped_column(String(20))
    side: Mapped[str] = mapped_column(String(4))
    order_type: Mapped[str] = mapped_column(String(10), default="Market")
    qty: Mapped[Decimal] = mapped_column(Numeric(28, 12))
    status: Mapped[str] = mapped_column(String(20), default="created", index=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_naive, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now_naive, onupdate=now_naive)


class Payment(Base):
    __tablename__ = "payments"
    id: Mapped[int] = mapped_column(primary_key=True)
    provider_id: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    amount_kop: Mapped[int] = mapped_column(Integer)
    method: Mapped[str] = mapped_column(String(20))
    purpose: Mapped[str] = mapped_column(String(20), default="topup")
    plan: Mapped[str | None] = mapped_column(String(10), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_naive)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    stars_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stars_payer_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    stars_checkout_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    stars_charge_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)


class GameScore(Base):
    __tablename__ = "game_scores"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    game: Mapped[str] = mapped_column(String(20), index=True)
    week: Mapped[str] = mapped_column(String(10), index=True)
    score: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_naive)


class PartnerClick(Base):
    """Переход пользователя на Bybit по партнёрской ссылке (для статистики в админке)."""
    __tablename__ = "partner_clicks"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    partner: Mapped[str] = mapped_column(String(20), default="bybit")
    kind: Mapped[str] = mapped_column(String(12), default="signup")
    placement: Mapped[str] = mapped_column(String(30), default="")
    symbol: Mapped[str] = mapped_column(String(20), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_naive, index=True)


class Feedback(Base):
    __tablename__ = "feedback"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    message: Mapped[str] = mapped_column(Text)
    contact: Mapped[str] = mapped_column(String(120), default="")
    page: Mapped[str] = mapped_column(String(60), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_naive)


if ENV in {"dev", "test"} and os.getenv("ALEMBIC_RUNNING") != "1":
    Base.metadata.create_all(bind=engine)


# ---------------- вспомогательное ----------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class RateLimiter:
    """Простой лимитер в памяти процесса. При нескольких воркерах нужен Redis."""

    def __init__(self):
        self.hits: dict[str, deque] = defaultdict(deque)

    def check(self, key: str, limit: int, window: int):
        now = time.monotonic()
        q = self.hits[key]
        while q and now - q[0] > window:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Слишком много попыток, попробуй позже")
        q.append(now)


limiter = RateLimiter()


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if TRUST_PROXY and fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "?"


def make_access_token(user_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": exp}, SECRET_KEY, algorithm="HS256")


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Требуется авторизация")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        user_id = int(payload.get("sub", ""))
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Недействительный токен")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Пользователь не найден")
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    if credentials is None:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None


def plus_info(u: User) -> dict:
    active = bool(u.plus_until and u.plus_until > now_naive())
    return {"active": active, "plan": u.plus_plan if active else None, "until": iso(u.plus_until) if active else None}


def user_out(u: User) -> dict:
    return {
        "id": u.id, "username": u.username, "email": u.email, "created_at": iso(u.created_at),
        "balance": u.balance_kop / 100, "plus": plus_info(u), "totp_enabled": u.totp_enabled, "simulator": SIMULATOR,
        "trial_available": u.trial_used_at is None, "is_admin": u.id in ADMIN_USER_IDS,
        "telegram_linked": u.tg_id is not None, "telegram_bot": TG_BOT_USERNAME or None,
    }


def token_out(u: User) -> dict:
    return {"access_token": make_access_token(u.id), "token_type": "bearer", "user": user_out(u)}


def to_kop(amount: float) -> int:
    kop = int(round(amount * 100))
    if kop <= 0:
        raise HTTPException(400, "Сумма должна быть больше нуля")
    return kop


def credit(db: Session, user_id: int, kop: int, title: str):
    db.execute(update(User).where(User.id == user_id).values(balance_kop=User.balance_kop + kop))
    db.add(Transaction(user_id=user_id, kind="in", title=title[:80], amount_kop=kop))


def extend_paid_plan(db: Session, user_id: int, plan: str) -> None:
    owner = db.scalar(select(User).where(User.id == user_id).with_for_update())
    now = now_naive()
    start = max(now, owner.plus_until) if owner.plus_until else now
    owner.plus_plan = plan
    owner.plus_until = start + timedelta(days=PLANS[plan][1])


def charge(db: Session, user_id: int, kop: int, title: str):
    """Атомарное списание: условие баланса проверяется внутри UPDATE."""
    res = db.execute(update(User).where(User.id == user_id, User.balance_kop >= kop).values(balance_kop=User.balance_kop - kop))
    if res.rowcount != 1:
        db.rollback()
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "Недостаточно средств на балансе")
    db.add(Transaction(user_id=user_id, kind="out", title=title[:80], amount_kop=kop))


def wallet_out(db: Session, user_id: int) -> dict:
    bal = db.scalar(select(User.balance_kop).where(User.id == user_id)) or 0
    rows = db.scalars(select(Transaction).where(Transaction.user_id == user_id).order_by(desc(Transaction.id)).limit(30)).all()
    return {
        "balance": bal / 100,
        "history": [{"type": t.kind, "title": t.title, "amount": t.amount_kop / 100, "ts": int(t.created_at.replace(tzinfo=timezone.utc).timestamp() * 1000)} for t in rows],
    }


ASSET_RATES_RUB = {
    "RUB": Decimal("1"),
    "USD": Decimal("92.48"),
    "EUR": Decimal("100.21"),
    "CNY": Decimal("12.86"),
    "GBP": Decimal("109.40"),
    "AED": Decimal("25.20"),
}


def normalize_asset(asset: str) -> str:
    return asset.strip().upper()


def ensure_asset(db: Session, user_id: int, asset: str, initial: Decimal = Decimal("0")) -> AssetBalance:
    row = db.scalar(select(AssetBalance).where(AssetBalance.user_id == user_id, AssetBalance.asset == asset))
    if row is None:
        row = AssetBalance(user_id=user_id, asset=asset, quantity=initial)
        db.add(row)
        db.flush()
    return row


def seed_user_assets(db: Session, user: User) -> None:
    ensure_asset(db, user.id, "RUB", Decimal(user.balance_kop) / 100)
    for asset in ASSET_RATES_RUB:
        if asset != "RUB":
            ensure_asset(db, user.id, asset)


def assets_out(db: Session, user_id: int) -> dict:
    user_balance = db.scalar(select(User.balance_kop).where(User.id == user_id)) or 0
    rub = ensure_asset(db, user_id, "RUB", Decimal(user_balance) / 100)
    if rub.quantity != Decimal(user_balance) / 100:
        rub.quantity = Decimal(user_balance) / 100
    rows = db.scalars(select(AssetBalance).where(AssetBalance.user_id == user_id).order_by(AssetBalance.asset)).all()
    db.commit()
    return {"assets": {row.asset: str(row.quantity) for row in rows}}


def rub_rate(db: Session, asset: str) -> Decimal:
    """Курс актива к рублю: свежий снимок ЦБ, иначе (только в симуляторе) справочный курс."""
    if asset == "RUB":
        return Decimal("1")
    if asset not in ASSET_RATES_RUB:
        raise HTTPException(400, "Этот актив пока не поддерживается")
    snapshot = db.scalar(select(RateSnapshot).where(RateSnapshot.asset == asset).order_by(desc(RateSnapshot.fetched_at)))
    if snapshot and now_naive() - snapshot.fetched_at <= RATE_MAX_AGE:
        return Decimal(snapshot.rub_rate)
    if SIMULATOR:
        return Decimal(snapshot.rub_rate) if snapshot else ASSET_RATES_RUB[asset]
    raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Актуальный курс недоступен, попробуй позже")


def exchange_fee_pct(user: User) -> Decimal:
    return EXCHANGE_FEE_PLUS_PCT if plus_info(user)["active"] else EXCHANGE_FEE_PCT


def debit_asset(db: Session, user_id: int, asset: str, amount: Decimal) -> None:
    """Атомарное списание валюты: условие остатка проверяется внутри UPDATE (без гонок двойного списания)."""
    ensure_asset(db, user_id, asset)
    res = db.execute(
        update(AssetBalance)
        .where(AssetBalance.user_id == user_id, AssetBalance.asset == asset, AssetBalance.quantity >= amount)
        .values(quantity=AssetBalance.quantity - amount)
    )
    if res.rowcount != 1:
        db.rollback()
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "Недостаточно средств")


def credit_asset(db: Session, user_id: int, asset: str, amount: Decimal) -> None:
    ensure_asset(db, user_id, asset)
    db.execute(
        update(AssetBalance)
        .where(AssetBalance.user_id == user_id, AssetBalance.asset == asset)
        .values(quantity=AssetBalance.quantity + amount)
    )


def exchange_assets(db: Session, user: User, request: ExchangeRequest) -> dict:
    user_id = user.id
    source = normalize_asset(request.from_asset)
    target = normalize_asset(request.to_asset)
    if source == target:
        raise HTTPException(400, "Активы должны отличаться")
    rate_source, rate_target = rub_rate(db, source), rub_rate(db, target)
    amount = request.amount
    # Фиатные суммы — с точностью до копейки/цента: иначе доли копейки списывались бы как 0.
    if amount != amount.quantize(Decimal("0.01")):
        raise HTTPException(400, "Сумма указывается с точностью до двух знаков после запятой")
    rub_value = amount * rate_source
    if rub_value < EXCHANGE_MIN_RUB:
        raise HTTPException(400, f"Минимальная сумма обмена — {EXCHANGE_MIN_RUB} ₽ в эквиваленте")
    fee_pct = exchange_fee_pct(user)
    gross = amount * rate_source / rate_target
    received = (gross * (Decimal("100") - fee_pct) / Decimal("100")).quantize(Decimal("0.01"), rounding="ROUND_DOWN")
    if received <= 0:
        raise HTTPException(400, "Сумма слишком мала для обмена")

    if source == "RUB":
        charge(db, user_id, int(amount * 100), f"Обмен RUB → {target}")
    else:
        debit_asset(db, user_id, source, amount)
    if target == "RUB":
        credit(db, user_id, int(received * 100), f"Обмен {source} → RUB")
    else:
        credit_asset(db, user_id, target, received)
    if source != "RUB" and target != "RUB":
        # рублёвый баланс не менялся: пишем в историю обмен без влияния на сумму
        db.add(Transaction(user_id=user_id, kind="fx", title=f"Обмен {amount} {source} → {received} {target}",
                           amount_kop=int(rub_value * 100)))
    db.commit()
    out = assets_out(db, user_id)
    out.update({
        "received": str(received),
        "fee_pct": str(fee_pct),
        "rate": str((rate_source / rate_target).quantize(Decimal("0.000001"))),
    })
    return out


# ---------------- схемы ----------------
class RegisterRequest(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    accept_terms: bool

    @field_validator("username")
    @classmethod
    def clean_username(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Имя пользователя слишком короткое")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    totp_code: str | None = Field(default=None, max_length=8)


class TelegramRequest(BaseModel):
    init_data: str = Field(min_length=10, max_length=4096)


class CodeRequest(BaseModel):
    code: str = Field(min_length=6, max_length=8)


class MoneyRequest(BaseModel):
    amount: float = Field(gt=0, le=10_000_000)
    title: str = Field(default="", max_length=80)


class ExchangeRequest(BaseModel):
    from_asset: str = Field(min_length=3, max_length=12, pattern=r"^[A-Z0-9]+$")
    to_asset: str = Field(min_length=3, max_length=12, pattern=r"^[A-Z0-9]+$")
    amount: Decimal = Field(gt=Decimal("0"), max_digits=28, decimal_places=12)


class PaymentRequest(BaseModel):
    amount: float = Field(gt=0, le=10_000_000)
    method: Literal["card", "sbp"]


class SubscriptionPaymentRequest(BaseModel):
    plan: Literal["month", "year"]
    method: Literal["card", "sbp"] = "card"


class StarsInvoiceRequest(BaseModel):
    offer: Literal["topup_1000", "topup_5000", "topup_10000", "month", "year"]


class PaymentWebhook(BaseModel):
    event: str
    object: dict


class TradeOrderRequest(BaseModel):
    symbol: Literal["BTCUSDT", "ETHUSDT", "SOLUSDT"]
    side: Literal["Buy", "Sell"]
    qty: Decimal = Field(gt=Decimal("0"), max_digits=28, decimal_places=12)


class PlanRequest(BaseModel):
    plan: Literal["month", "year"]


class ScoreRequest(BaseModel):
    game: Literal["drop"]
    score: int = Field(ge=1, le=1_000_000)


class PartnerClickRequest(BaseModel):
    kind: str = Field("signup", pattern="^(signup|trade)$")
    placement: str = Field("", max_length=30, pattern="^[a-z0-9_-]*$")
    symbol: str = Field("", max_length=20, pattern="^[A-Z0-9]*$")


class FeedbackRequest(BaseModel):
    message: str = Field(min_length=5, max_length=2000)
    contact: str = Field(default="", max_length=120)
    page: str = Field(default="", max_length=60)


# ---------------- приложение ----------------
app = FastAPI(title="Wind Finance API", version="0.2.0")

if ENV == "dev" or ALLOWED_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS if ENV != "dev" else [],
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$" if ENV == "dev" else None,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if ENV == "prod":
        resp.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return resp


@app.get("/health")
def health():
    return {"status": "ok", "service": "wind-finance-api", "simulator": SIMULATOR}


# ---------------- авторизация ----------------
@app.post("/auth/register", status_code=201)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    limiter.check(f"reg:{client_ip(request)}", 10, 3600)
    if not payload.accept_terms:
        raise HTTPException(400, "Нужно принять условия и политику конфиденциальности")
    email = payload.email.lower()
    taken = db.scalar(select(User.id).where((User.email == email) | (func.lower(User.username) == payload.username.lower())))
    if taken:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email или имя пользователя уже заняты")
    user = User(username=payload.username, email=email, password_hash=password_hash.hash(payload.password),
                balance_kop=START_BALANCE_KOP, accepted_terms_at=now_naive())
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email или имя пользователя уже заняты")
    db.refresh(user)
    seed_user_assets(db, user)
    db.commit()
    return token_out(user)


@app.post("/auth/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email = payload.email.lower()
    limiter.check(f"login-ip:{client_ip(request)}", 20, 300)
    limiter.check(f"login-mail:{email}", 8, 300)
    user = db.scalar(select(User).where(User.email == email))
    ok = password_hash.verify(payload.password, user.password_hash if user else DUMMY_HASH)  # одинаковое время ответа
    if user is None or not ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный email или пароль")
    if user.totp_enabled:
        if not payload.totp_code:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "2fa_required")
        secret = reveal_totp_secret(user.totp_secret)
        if not secret or not pyotp.TOTP(secret).verify(payload.totp_code.strip(), valid_window=1):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный код 2FA")
    return token_out(user)


def verify_telegram(init_data: str) -> dict:
    """Проверка подписи Telegram Mini App (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)."""
    if not TG_BOT_TOKEN:
        raise HTTPException(503, "Вход через Telegram не настроен")
    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received = pairs.pop("hash", None)
    if not received:
        raise HTTPException(401, "Неверные данные Telegram")
    check = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", TG_BOT_TOKEN.encode(), hashlib.sha256).digest()
    calc = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calc, received):
        raise HTTPException(401, "Неверная подпись Telegram")
    try:
        if time.time() - int(pairs.get("auth_date", "0")) > 86400:
            raise HTTPException(401, "Данные Telegram устарели")
        return json.loads(pairs["user"])
    except (ValueError, KeyError):
        raise HTTPException(401, "Неверные данные Telegram")


@app.post("/auth/telegram")
def auth_telegram(payload: TelegramRequest, request: Request, db: Session = Depends(get_db)):
    limiter.check(f"tg:{client_ip(request)}", 30, 300)
    tg = verify_telegram(payload.init_data)
    tg_id = int(tg["id"])
    user = db.scalar(select(User).where(User.tg_id == tg_id))
    if user is None:
        base = str(tg.get("username") or tg.get("first_name") or "user")[:40]
        name = base
        while db.scalar(select(User.id).where(func.lower(User.username) == name.lower())):
            name = f"{base}-{secrets.token_hex(2)}"
        user = User(username=name, email=f"tg{tg_id}@tg.windfinance.local", tg_id=tg_id,
                    password_hash=password_hash.hash(secrets.token_urlsafe(32)), balance_kop=START_BALANCE_KOP)
        db.add(user)
        db.commit()
        db.refresh(user)
        seed_user_assets(db, user)
        db.commit()
    return token_out(user)


@app.get("/auth/me")
def me(user: User = Depends(get_current_user)):
    return user_out(user)


@app.post("/auth/2fa/setup")
def twofa_setup(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.totp_enabled:
        raise HTTPException(409, "2FA уже включена")
    secret = pyotp.random_base32()
    user.totp_secret = protect_totp_secret(secret)
    db.commit()
    uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="Wind Finance")
    return {"secret": secret, "uri": uri}


@app.post("/auth/2fa/enable")
def twofa_enable(payload: CodeRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    limiter.check(f"2fa:{user.id}", 10, 300)
    secret = ensure_protected_totp_secret(user, db)
    if not secret:
        raise HTTPException(400, "Сначала запроси ключ")
    if not pyotp.TOTP(secret).verify(payload.code.strip(), valid_window=1):
        raise HTTPException(400, "Неверный код")
    user.totp_enabled = True
    db.commit()
    return {"totp_enabled": True}


@app.post("/auth/2fa/disable")
def twofa_disable(payload: CodeRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    limiter.check(f"2fa:{user.id}", 10, 300)
    secret = ensure_protected_totp_secret(user, db)
    if not user.totp_enabled or not secret or not pyotp.TOTP(secret).verify(payload.code.strip(), valid_window=1):
        raise HTTPException(400, "Неверный код")
    user.totp_enabled = False
    user.totp_secret = None
    db.commit()
    return {"totp_enabled": False}


# ---------------- восстановление пароля ----------------
def email_configured() -> bool:
    return bool(SMTP_HOST and SMTP_FROM)


def send_email(to: str, subject: str, text: str) -> bool:
    """Синхронная отправка; вызывается из BackgroundTasks, чтобы не задерживать ответ."""
    if not email_configured():
        log.warning("SMTP не настроен, письмо «%s» не отправлено", subject)
        return False
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = SMTP_FROM, to, subject
    msg.set_content(text)
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
            smtp.starttls()
            if SMTP_USER:
                smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.send_message(msg)
        return True
    except (smtplib.SMTPException, OSError) as error:
        log.error("Письмо не отправлено: %s", error)
        return False


def is_real_email(email: str) -> bool:
    return not email.endswith("@tg.windfinance.local")


class ForgotRequest(BaseModel):
    email: EmailStr


class ResetRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=8, max_length=128)
    totp_code: str | None = Field(default=None, max_length=8)


@app.post("/auth/password/forgot")
def password_forgot(payload: ForgotRequest, request: Request, background: BackgroundTasks, db: Session = Depends(get_db)):
    email = payload.email.lower()
    limiter.check(f"forgot-ip:{client_ip(request)}", 10, 3600)
    limiter.check(f"forgot-mail:{email}", 3, 3600)
    answer = {"ok": True, "message": "Если такой аккаунт есть, мы отправили ссылку для сброса пароля. Она действует 30 минут."}
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not is_real_email(user.email):
        return answer  # одинаковый ответ: по нему нельзя узнать, зарегистрирован ли email
    db.execute(update(PasswordReset).where(PasswordReset.user_id == user.id, PasswordReset.used_at.is_(None))
               .values(used_at=now_naive()))
    token = secrets.token_urlsafe(32)
    db.add(PasswordReset(user_id=user.id, token_hash=hashlib.sha256(token.encode()).hexdigest(),
                         expires_at=now_naive() + RESET_TOKEN_TTL))
    db.commit()
    link = f"{FRONTEND_URL}?reset={token}"
    background.add_task(send_email, user.email, "Wind Finance: сброс пароля",
                        f"Привет, {user.username}!\n\nЧтобы задать новый пароль, открой ссылку (действует 30 минут):\n{link}\n\n"
                        "Если ты не запрашивал сброс, просто проигнорируй это письмо — пароль останется прежним.")
    if ENV in {"dev", "test"} and not email_configured():
        answer["dev_reset_url"] = link   # только для локальной разработки без почты
    return answer


@app.post("/auth/password/reset")
def password_reset(payload: ResetRequest, request: Request, db: Session = Depends(get_db)):
    limiter.check(f"reset-ip:{client_ip(request)}", 20, 3600)
    row = db.scalar(select(PasswordReset).where(
        PasswordReset.token_hash == hashlib.sha256(payload.token.encode()).hexdigest()))
    if row is None or row.used_at is not None or row.expires_at < now_naive():
        raise HTTPException(400, "Ссылка недействительна или устарела. Запроси новую.")
    user = db.get(User, row.user_id)
    if user.totp_enabled:
        secret = reveal_totp_secret(user.totp_secret)
        if not payload.totp_code:
            raise HTTPException(401, "2fa_required")
        if not secret or not pyotp.TOTP(secret).verify(payload.totp_code.strip(), valid_window=1):
            raise HTTPException(401, "Неверный код 2FA")
    user.password_hash = password_hash.hash(payload.password)
    row.used_at = now_naive()
    db.commit()
    return token_out(user)


# ---------------- Telegram: привязка и уведомления ----------------
def telegram_link_code(user_id: int) -> str:
    exp = int(time.time()) + 3600
    sig = hmac.new(SECRET_KEY.encode(), f"tglink:{user_id}:{exp}".encode(), hashlib.sha256).hexdigest()[:16]
    return f"{user_id}-{exp}-{sig}"


def parse_link_code(code: str) -> int | None:
    try:
        uid, exp, sig = code.split("-")
        good = hmac.new(SECRET_KEY.encode(), f"tglink:{uid}:{exp}".encode(), hashlib.sha256).hexdigest()[:16]
        if hmac.compare_digest(good, sig) and int(exp) > time.time():
            return int(uid)
    except ValueError:
        return None
    return None


async def telegram_send(chat_id: int, text: str) -> bool:
    if not TG_BOT_TOKEN:
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(f"https://api.telegram.org/bot{TG_BOT_TOKEN}/sendMessage",
                                  json={"chat_id": chat_id, "text": text, "disable_web_page_preview": True})
        return r.status_code == 200
    except httpx.HTTPError:
        return False


async def stars_bot_request(method: str, payload: dict):
    try:
        async with asyncio.timeout(8), httpx.AsyncClient(timeout=6) as client:
            response = await client.post(f"https://api.telegram.org/bot{TG_BOT_TOKEN}/{method}", json=payload)
            response.raise_for_status()
            data = response.json()
        if data.get("ok") is True:
            return data.get("result")
    except (TimeoutError, httpx.HTTPError, ValueError):
        pass
    raise HTTPException(502, "Telegram не смог обработать платёж")


def matching_stars_payment(db: Session, details: dict, payer_id: int | None) -> Payment | None:
    if not payer_id or details.get("currency") != "XTR":
        return None
    return db.scalar(select(Payment).where(
        Payment.provider_id == details.get("invoice_payload"),
        Payment.method == "stars",
        Payment.stars_payer_id == payer_id,
        Payment.stars_amount == details.get("total_amount"),
    ))


async def answer_stars_checkout(db: Session, query: dict) -> None:
    query_id = query["id"]
    payment = matching_stars_payment(db, query, (query.get("from") or {}).get("id"))
    allowed = False
    if payment and payment.created_at >= now_naive() - STARS_INVOICE_TTL:
        if payment.status == "processing" and payment.stars_checkout_id == query_id:
            allowed = True
        elif payment.status == "pending" and (payment.purpose != "topup" or (SIMULATOR and not BYBIT_LIVE_TRADING)):
            result = db.execute(update(Payment).where(Payment.id == payment.id, Payment.status == "pending")
                                .values(status="processing", stars_checkout_id=query_id))
            allowed = result.rowcount == 1
            if not allowed:
                db.refresh(payment)
                allowed = payment.status == "processing" and payment.stars_checkout_id == query_id
        db.commit()
    reply = {"pre_checkout_query_id": query_id, "ok": allowed}
    if not allowed:
        reply["error_message"] = "Счёт недействителен или уже использован. Создай новый счёт в Wind Finance."
    await stars_bot_request("answerPreCheckoutQuery", reply)


def confirm_stars_payment(db: Session, details: dict, payer_id: int | None) -> None:
    payment = matching_stars_payment(db, details, payer_id)
    charge_id = details.get("telegram_payment_charge_id")
    if not payment or not isinstance(charge_id, str) or not 1 <= len(charge_id) <= 255:
        raise HTTPException(400, "Данные платежа Stars не совпадают")
    try:
        result = db.execute(update(Payment).where(Payment.id == payment.id, Payment.status == "processing")
                            .values(status="succeeded", stars_charge_id=charge_id, paid_at=now_naive()))
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Платёж Stars уже привязан к другому счёту")
    if result.rowcount != 1:
        db.refresh(payment)
        if payment.status == "succeeded" and payment.stars_charge_id == charge_id:
            return
        raise HTTPException(409, "Платёж Stars не соответствует подтверждённому счёту")
    if payment.purpose == "subscription":
        extend_paid_plan(db, payment.user_id, payment.plan)
    else:
        credit(db, payment.user_id, payment.amount_kop, "Пополнение учебного баланса · Telegram Stars")
    db.commit()


@app.post("/telegram/link")
def telegram_link(user: User = Depends(get_current_user)):
    if not TG_BOT_TOKEN or not TG_BOT_USERNAME:
        raise HTTPException(503, "Telegram-бот пока не подключён")
    return {"url": f"https://t.me/{TG_BOT_USERNAME}?start={telegram_link_code(user.id)}", "linked": user.tg_id is not None}


@app.post("/telegram/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db),
                           secret: str | None = Header(default=None, alias="X-Telegram-Bot-Api-Secret-Token")):
    if not TG_WEBHOOK_SECRET or not secret or not hmac.compare_digest(secret, TG_WEBHOOK_SECRET):
        raise HTTPException(403, "Неверный секрет")
    update_body = await request.json()
    if "pre_checkout_query" in update_body:
        await answer_stars_checkout(db, update_body["pre_checkout_query"])
        return {"ok": True}
    message = update_body.get("message") or {}
    if "successful_payment" in message:
        confirm_stars_payment(db, message["successful_payment"], (message.get("from") or {}).get("id"))
        return {"ok": True}
    text = str(message.get("text") or "")
    chat_id = (message.get("chat") or {}).get("id")
    if chat_id and text.split(maxsplit=1)[:1] in (["/paysupport"], [f"/paysupport@{TG_BOT_USERNAME}"]):
        await telegram_send(chat_id, "По вопросам оплаты открой Wind Finance и выбери «Сообщить об ошибке». Укажи номер платежа из чека Telegram.")
        return {"ok": True}
    if not chat_id or not text.startswith("/start"):
        return {"ok": True}
    parts = text.split(maxsplit=1)
    user_id = parse_link_code(parts[1]) if len(parts) == 2 else None
    if user_id is None:
        await telegram_send(chat_id, "Привет! Это бот Wind Finance. Чтобы получать ценовые уведомления, нажми «Подключить Telegram» на сайте.")
        return {"ok": True}
    owner = db.scalar(select(User).where(User.tg_id == chat_id))
    if owner and owner.id != user_id:
        await telegram_send(chat_id, "Этот Telegram уже привязан к другому аккаунту Wind Finance.")
        return {"ok": True}
    user = db.get(User, user_id)
    if user:
        user.tg_id = chat_id
        db.commit()
        await telegram_send(chat_id, f"Готово, {user.username}! Ценовые уведомления Wind Finance будут приходить сюда.")
    return {"ok": True}


# ---------------- виртуальный кошелёк ----------------
@app.get("/wallet")
def wallet(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return wallet_out(db, user.id)


@app.get("/wallet/assets")
def wallet_assets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return assets_out(db, user.id)


@app.post("/wallet/exchange")
def wallet_exchange(payload: ExchangeRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    limiter.check(f"fx:{user.id}", 30, 60)
    return exchange_assets(db, user, payload)


@app.get("/wallet/exchange/quote")
def exchange_quote(user: User = Depends(get_current_user)):
    """Комиссия считается на сервере: клиент только показывает её."""
    return {"fee_pct": str(exchange_fee_pct(user)), "min_rub": str(EXCHANGE_MIN_RUB)}


# ---------------- инвестиционный симулятор ----------------
# Справочные цены: SBER и IMOEX подменяются котировками Мосбиржи, остальные — фиксированные цены симулятора.
INSTRUMENTS = {
    "IMOEX": {"name": "Индекс Мосбиржи", "unit": "ед.", "price": Decimal("2500.00"), "live": "IMOEX"},
    "SBER": {"name": "Сбербанк", "unit": "акц.", "price": Decimal("300.00"), "live": "SBER"},
    "ETFRU": {"name": "ETF на индекс МосБиржи (TMOS)", "unit": "паёв", "price": Decimal("6.22"), "live": "TMOS"},
    "BONDS": {"name": "Фонд гособлигаций (SBGB)", "unit": "паёв", "price": Decimal("15.50"), "live": "SBGB"},
}
QTY_STEP = Decimal("0.00000001")


class InvestBuyRequest(BaseModel):
    asset: Literal["IMOEX", "SBER", "ETFRU", "BONDS"]
    amount: Decimal = Field(gt=Decimal("0"), le=Decimal("10000000"), max_digits=12, decimal_places=2)


class InvestSellRequest(BaseModel):
    asset: Literal["IMOEX", "SBER", "ETFRU", "BONDS"]
    quantity: Decimal | None = Field(default=None, gt=Decimal("0"), max_digits=28, decimal_places=8)  # None — продать всё


async def instrument_prices() -> dict[str, dict]:
    live: dict = {}
    try:
        live = await cached("stocks", 30, fetch_stocks)
    except HTTPException:
        live = {}
    out = {}
    for code, meta in INSTRUMENTS.items():
        quote = live.get(meta["live"]) if meta["live"] else None
        price = quote.get("price") if isinstance(quote, dict) else None
        out[code] = {
            "price": Decimal(str(price)) if price else meta["price"],
            "day_pct": quote.get("pct") if isinstance(quote, dict) else None,
            "source": "moex" if price else "simulator",
        }
    return out


def portfolio_out(db: Session, user_id: int, prices: dict[str, dict]) -> dict:
    rows = db.scalars(select(Holding).where(Holding.user_id == user_id, Holding.quantity > 0).order_by(Holding.asset)).all()
    positions, total_value, total_cost = [], Decimal("0"), Decimal("0")
    for row in rows:
        meta = INSTRUMENTS.get(row.asset)
        if not meta:
            continue
        price = prices[row.asset]["price"]
        value = (Decimal(row.quantity) * price).quantize(Decimal("0.01"))
        cost = Decimal(row.cost_kop) / 100
        pnl = value - cost
        total_value += value
        total_cost += cost
        positions.append({
            "asset": row.asset, "name": meta["name"], "unit": meta["unit"],
            "quantity": str(Decimal(row.quantity).normalize()), "price": str(price), "value": str(value),
            "cost": str(cost), "pnl": str(pnl), "pnl_pct": str((pnl / cost * 100).quantize(Decimal("0.01"))) if cost else "0",
            "source": prices[row.asset]["source"],
        })
    cash = Decimal(db.scalar(select(User.balance_kop).where(User.id == user_id)) or 0) / 100
    total_pnl = total_value - total_cost
    return {
        "positions": positions,
        "invested_value": str(total_value),
        "invested_cost": str(total_cost),
        "pnl": str(total_pnl),
        "pnl_pct": str((total_pnl / total_cost * 100).quantize(Decimal("0.01"))) if total_cost else "0",
        "cash": str(cash),
        "total": str(total_value + cash),
        "instruments": {code: {"name": m["name"], "unit": m["unit"], "price": str(prices[code]["price"]),
                               "day_pct": prices[code]["day_pct"], "source": prices[code]["source"]}
                        for code, m in INSTRUMENTS.items()},
    }


def holdings_value(db: Session, user_id: int, prices: dict[str, dict]) -> tuple[int, int]:
    value = cost = 0
    for row in db.scalars(select(Holding).where(Holding.user_id == user_id, Holding.quantity > 0)).all():
        if row.asset in prices:
            value += int(Decimal(row.quantity) * prices[row.asset]["price"] * 100)
            cost += row.cost_kop
    return value, cost


def record_snapshot(db: Session, user_id: int, prices: dict[str, dict]) -> None:
    """Сохраняем стоимость портфеля за сегодня: так копится история для графика."""
    value, cost = holdings_value(db, user_id, prices)
    cash = db.scalar(select(User.balance_kop).where(User.id == user_id)) or 0
    day = now_naive().strftime("%Y-%m-%d")
    row = db.scalar(select(PortfolioSnapshot).where(PortfolioSnapshot.user_id == user_id, PortfolioSnapshot.day == day))
    if row is None:
        row = PortfolioSnapshot(user_id=user_id, day=day)
        db.add(row)
    row.invested_kop, row.cost_kop, row.cash_kop = value, cost, cash
    try:
        db.commit()
    except IntegrityError:
        db.rollback()


@app.get("/invest/portfolio")
async def invest_portfolio(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    prices = await instrument_prices()
    record_snapshot(db, user.id, prices)
    return portfolio_out(db, user.id, prices)


@app.get("/invest/history")
def invest_history(days: int = 90, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    days = max(7, min(days, 365))
    since = (now_naive() - timedelta(days=days)).strftime("%Y-%m-%d")
    rows = db.scalars(select(PortfolioSnapshot).where(PortfolioSnapshot.user_id == user.id, PortfolioSnapshot.day >= since)
                      .order_by(PortfolioSnapshot.day)).all()
    trades = db.scalars(select(InvestTrade).where(InvestTrade.user_id == user.id).order_by(desc(InvestTrade.id)).limit(20)).all()
    return {
        "points": [{"day": r.day, "invested": r.invested_kop / 100, "cost": r.cost_kop / 100,
                    "total": (r.invested_kop + r.cash_kop) / 100} for r in rows],
        "trades": [{"asset": t.asset, "name": INSTRUMENTS.get(t.asset, {}).get("name", t.asset), "side": t.side,
                    "quantity": str(Decimal(t.quantity).normalize()), "price": str(t.price), "amount": t.amount_kop / 100,
                    "pnl": t.pnl_kop / 100, "at": iso(t.created_at)} for t in trades],
    }


def week_start(dt: datetime) -> datetime:
    return (dt - timedelta(days=dt.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)


MIN_COMPETITION_BASE_KOP = 100_000  # участвуют портфели от 1 000 ₽


@app.get("/invest/leaderboard")
async def invest_leaderboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Соревнование недели: доходность считает сервер по своим ценам, подделать счёт с клиента нельзя.
    Результат = реализованный за неделю + текущий нереализованный; база = вложено сейчас + себестоимость проданного за неделю."""
    prices = await instrument_prices()
    start = week_start(now_naive())
    sold = {r.user_id: (r.pnl or 0, r.cost or 0) for r in db.execute(
        select(InvestTrade.user_id, func.sum(InvestTrade.pnl_kop).label("pnl"), func.sum(InvestTrade.cost_kop).label("cost"))
        .where(InvestTrade.side == "sell", InvestTrade.created_at >= start).group_by(InvestTrade.user_id)).all()}
    holders = set(db.scalars(select(Holding.user_id).where(Holding.quantity > 0)).all())
    rows = []
    for uid in holders | set(sold):
        value, cost = holdings_value(db, uid, prices)
        realized, sold_cost = sold.get(uid, (0, 0))
        base = cost + sold_cost
        if base < MIN_COMPETITION_BASE_KOP:
            continue
        rows.append((uid, (value - cost + realized) / base * 100))
    rows.sort(key=lambda r: r[1], reverse=True)
    names = dict(db.execute(select(User.id, User.username).where(User.id.in_([r[0] for r in rows] or [0]))).all())
    top, me = [], None
    for rank, (uid, ret) in enumerate(rows, 1):
        item = {"rank": rank, "username": names.get(uid, "—"), "return_pct": round(ret, 2), "me": uid == user.id}
        if rank <= 10:
            top.append(item)
        if uid == user.id:
            me = item
    return {"week": iso_week(now_naive()), "since": iso(start), "participants": len(rows), "top": top, "me": me,
            "min_base": MIN_COMPETITION_BASE_KOP / 100}


@app.post("/invest/buy")
async def invest_buy(payload: InvestBuyRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    limiter.check(f"invest:{user.id}", 30, 60)
    if payload.amount < INVEST_MIN_RUB:
        raise HTTPException(400, f"Минимальная сумма покупки — {INVEST_MIN_RUB} ₽")
    prices = await instrument_prices()
    price = prices[payload.asset]["price"]   # цену назначает сервер, а не клиент
    qty = (payload.amount / price).quantize(QTY_STEP, rounding="ROUND_DOWN")
    if qty <= 0:
        raise HTTPException(400, "Сумма слишком мала для покупки")
    kop = int(payload.amount * 100)
    name = INSTRUMENTS[payload.asset]["name"]
    charge(db, user.id, kop, f"Покупка: {name}")
    holding = db.scalar(select(Holding).where(Holding.user_id == user.id, Holding.asset == payload.asset))
    if holding is None:
        holding = Holding(user_id=user.id, asset=payload.asset, quantity=Decimal("0"), cost_kop=0)
        db.add(holding)
        db.flush()
    db.execute(update(Holding).where(Holding.id == holding.id).values(
        quantity=Holding.quantity + qty, cost_kop=Holding.cost_kop + kop))
    db.add(InvestTrade(user_id=user.id, asset=payload.asset, side="buy", quantity=qty, price=price, amount_kop=kop))
    db.commit()
    record_snapshot(db, user.id, prices)
    return {"bought": {"asset": payload.asset, "quantity": str(qty), "price": str(price), "amount": str(payload.amount)},
            **portfolio_out(db, user.id, prices)}


@app.post("/invest/sell")
async def invest_sell(payload: InvestSellRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    limiter.check(f"invest:{user.id}", 30, 60)
    holding = db.scalar(select(Holding).where(Holding.user_id == user.id, Holding.asset == payload.asset))
    held = Decimal(holding.quantity) if holding else Decimal("0")
    if held <= 0:
        raise HTTPException(404, "Такой позиции нет в портфеле")
    qty = held if payload.quantity is None else payload.quantity
    if qty > held:
        raise HTTPException(400, "Нельзя продать больше, чем есть в портфеле")
    prices = await instrument_prices()
    price = prices[payload.asset]["price"]
    proceeds_kop = int((qty * price * 100).to_integral_value(rounding="ROUND_DOWN"))
    # себестоимость списываем пропорционально проданной доле (метод средней цены)
    cost_part = holding.cost_kop if qty == held else int(Decimal(holding.cost_kop) * qty / held)
    res = db.execute(update(Holding).where(Holding.id == holding.id, Holding.quantity >= qty).values(
        quantity=Holding.quantity - qty, cost_kop=Holding.cost_kop - cost_part))
    if res.rowcount != 1:
        db.rollback()
        raise HTTPException(409, "Позиция изменилась, попробуй ещё раз")
    if proceeds_kop > 0:
        credit(db, user.id, proceeds_kop, f"Продажа: {INSTRUMENTS[payload.asset]['name']}")
    db.add(InvestTrade(user_id=user.id, asset=payload.asset, side="sell", quantity=qty, price=price,
                       amount_kop=proceeds_kop, cost_kop=cost_part, pnl_kop=proceeds_kop - cost_part))
    db.commit()
    record_snapshot(db, user.id, prices)
    return {"sold": {"asset": payload.asset, "quantity": str(qty), "price": str(price), "amount": str(Decimal(proceeds_kop) / 100),
                     "pnl": str(Decimal(proceeds_kop - cost_part) / 100)},
            **portfolio_out(db, user.id, prices)}


# ---------------- копилки ----------------
class GoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=60)
    target: Decimal = Field(gt=Decimal("0"), le=Decimal("100000000"), max_digits=12, decimal_places=2)
    deadline: datetime | None = None


class GoalMove(BaseModel):
    amount: Decimal = Field(gt=Decimal("0"), le=Decimal("100000000"), max_digits=12, decimal_places=2)


def goal_out(g: SavingsGoal) -> dict:
    left = max(0, g.target_kop - g.saved_kop)
    monthly = None
    if g.deadline and left:
        months = max(1, round((g.deadline - now_naive()).days / 30.44))
        monthly = round(left / 100 / months, 2)
    return {"id": g.id, "title": g.title, "target": g.target_kop / 100, "saved": g.saved_kop / 100,
            "progress": round(min(1, g.saved_kop / g.target_kop) * 100, 1) if g.target_kop else 0,
            "deadline": iso(g.deadline), "monthly_needed": monthly, "done": g.saved_kop >= g.target_kop}


def own_goal(db: Session, user_id: int, goal_id: int) -> SavingsGoal:
    goal = db.scalar(select(SavingsGoal).where(SavingsGoal.id == goal_id, SavingsGoal.user_id == user_id,
                                               SavingsGoal.closed_at.is_(None)))
    if goal is None:
        raise HTTPException(404, "Копилка не найдена")
    return goal


def goals_payload(db: Session, user_id: int) -> dict:
    rows = db.scalars(select(SavingsGoal).where(SavingsGoal.user_id == user_id, SavingsGoal.closed_at.is_(None))
                      .order_by(SavingsGoal.id)).all()
    return {"goals": [goal_out(g) for g in rows], "limit": GOALS_LIMIT, **wallet_out(db, user_id)}


@app.get("/goals")
def list_goals(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return goals_payload(db, user.id)


@app.post("/goals", status_code=201)
def create_goal(payload: GoalCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    active = db.scalar(select(func.count(SavingsGoal.id)).where(SavingsGoal.user_id == user.id, SavingsGoal.closed_at.is_(None)))
    if active >= GOALS_LIMIT:
        raise HTTPException(409, f"Можно вести до {GOALS_LIMIT} копилок одновременно")
    deadline = payload.deadline.replace(tzinfo=None) if payload.deadline else None
    if deadline and deadline <= now_naive():
        raise HTTPException(400, "Срок должен быть в будущем")
    db.add(SavingsGoal(user_id=user.id, title=payload.title.strip(), target_kop=int(payload.target * 100), deadline=deadline))
    db.commit()
    return goals_payload(db, user.id)


@app.post("/goals/{goal_id}/deposit")
def goal_deposit(goal_id: int, payload: GoalMove, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = own_goal(db, user.id, goal_id)
    kop = int(payload.amount * 100)
    charge(db, user.id, kop, f"В копилку: {goal.title}")
    db.execute(update(SavingsGoal).where(SavingsGoal.id == goal.id).values(saved_kop=SavingsGoal.saved_kop + kop))
    db.commit()
    return goals_payload(db, user.id)


@app.post("/goals/{goal_id}/withdraw")
def goal_withdraw(goal_id: int, payload: GoalMove, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = own_goal(db, user.id, goal_id)
    kop = int(payload.amount * 100)
    res = db.execute(update(SavingsGoal).where(SavingsGoal.id == goal.id, SavingsGoal.saved_kop >= kop)
                     .values(saved_kop=SavingsGoal.saved_kop - kop))
    if res.rowcount != 1:
        db.rollback()
        raise HTTPException(400, "В копилке нет такой суммы")
    credit(db, user.id, kop, f"Из копилки: {goal.title}")
    db.commit()
    return goals_payload(db, user.id)


@app.delete("/goals/{goal_id}")
def close_goal(goal_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = own_goal(db, user.id, goal_id)
    if goal.saved_kop > 0:
        credit(db, user.id, goal.saved_kop, f"Копилка закрыта: {goal.title}")
    goal.saved_kop = 0
    goal.closed_at = now_naive()
    db.commit()
    return goals_payload(db, user.id)


# ---------------- ценовые уведомления (проверяет сервер) ----------------
ALERT_SYMBOLS = ("BTCUSDT", "ETHUSDT", "SOLUSDT")


class AlertCreate(BaseModel):
    symbol: Literal["BTCUSDT", "ETHUSDT", "SOLUSDT"]
    direction: Literal["above", "below"]
    price: Decimal = Field(gt=Decimal("0"), max_digits=20, decimal_places=8)
    start_price: Decimal | None = Field(default=None, gt=Decimal("0"), max_digits=20, decimal_places=8)


def alert_limit(user: User) -> int:
    return ALERT_LIMIT_PLUS if plus_info(user)["active"] else ALERT_LIMIT_FREE


def alert_out(a: PriceAlert) -> dict:
    return {"id": a.id, "symbol": a.symbol, "direction": a.direction, "price": str(a.price),
            "start_price": str(a.start_price) if a.start_price else None, "created_at": iso(a.created_at),
            "triggered_at": iso(a.triggered_at), "triggered_price": str(a.triggered_price) if a.triggered_price else None,
            "notified_via": a.notified_via}


def alerts_payload(db: Session, user: User) -> dict:
    active = db.scalars(select(PriceAlert).where(PriceAlert.user_id == user.id, PriceAlert.triggered_at.is_(None))
                        .order_by(PriceAlert.id)).all()
    fired = db.scalars(select(PriceAlert).where(PriceAlert.user_id == user.id, PriceAlert.triggered_at.is_not(None))
                       .order_by(desc(PriceAlert.triggered_at)).limit(5)).all()
    return {"active": [alert_out(a) for a in active], "fired": [alert_out(a) for a in fired],
            "limit": alert_limit(user), "telegram_linked": user.tg_id is not None}


@app.get("/alerts")
def list_alerts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return alerts_payload(db, user)


@app.post("/alerts", status_code=201)
def create_alert(payload: AlertCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    limiter.check(f"alerts:{user.id}", 30, 60)
    active = db.scalar(select(func.count(PriceAlert.id)).where(PriceAlert.user_id == user.id, PriceAlert.triggered_at.is_(None)))
    limit = alert_limit(user)
    if active >= limit:
        raise HTTPException(409, f"Лимит уведомлений: {limit}." + ("" if limit == ALERT_LIMIT_PLUS else " В Wind Plus — до 30."))
    db.add(PriceAlert(user_id=user.id, symbol=payload.symbol, direction=payload.direction, price=payload.price,
                      start_price=payload.start_price))
    db.commit()
    return alerts_payload(db, user)


@app.delete("/alerts/{alert_id}")
def delete_alert(alert_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    alert = db.scalar(select(PriceAlert).where(PriceAlert.id == alert_id, PriceAlert.user_id == user.id))
    if alert is None:
        raise HTTPException(404, "Уведомление не найдено")
    db.delete(alert)
    db.commit()
    return alerts_payload(db, user)


@app.post("/alerts/{alert_id}/ack")
def ack_alert(alert_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Сайт сам увидел срабатывание (вкладка открыта): помечаем, чтобы не сработало повторно."""
    alert = db.scalar(select(PriceAlert).where(PriceAlert.id == alert_id, PriceAlert.user_id == user.id))
    if alert and alert.triggered_at is None:
        alert.triggered_at = now_naive()
        alert.notified_via = "web"
        db.commit()
    return alerts_payload(db, user)


async def fetch_bybit_prices(symbols: set[str]) -> dict[str, Decimal]:
    async with httpx.AsyncClient(timeout=8) as client:
        r = await client.get("https://api.bybit.com/v5/market/tickers", params={"category": "spot"})
        r.raise_for_status()
        rows = r.json().get("result", {}).get("list", [])
    return {row["symbol"]: Decimal(str(row["lastPrice"])) for row in rows if row.get("symbol") in symbols and row.get("lastPrice")}


async def check_price_alerts_once() -> int:
    """Один проход проверки: возвращает число сработавших уведомлений."""
    with SessionLocal() as db:
        alerts = db.scalars(select(PriceAlert).where(PriceAlert.triggered_at.is_(None))).all()
        if not alerts:
            return 0
        prices = await fetch_bybit_prices({a.symbol for a in alerts})
        fired = 0
        for alert in alerts:
            price = prices.get(alert.symbol)
            if price is None:
                continue
            hit = price >= alert.price if alert.direction == "above" else price <= alert.price
            if not hit:
                continue
            res = db.execute(update(PriceAlert).where(PriceAlert.id == alert.id, PriceAlert.triggered_at.is_(None))
                             .values(triggered_at=now_naive(), triggered_price=price))
            if res.rowcount != 1:
                continue
            db.commit()
            fired += 1
            user = db.get(User, alert.user_id)
            text = (f"🔔 Wind Finance: {alert.symbol[:-4]}/USDT {'поднялся до' if alert.direction == 'above' else 'опустился до'} "
                    f"{alert.price.normalize()} USDT (сейчас {price.normalize()}).")
            via = None
            if user and user.tg_id and await telegram_send(user.tg_id, text):
                via = "telegram"
            elif user and is_real_email(user.email) and email_configured():
                via = "email" if await asyncio.to_thread(send_email, user.email, "Wind Finance: ценовое уведомление", text) else None
            alert.notified_via = via or "site"
            db.commit()
        return fired


async def alerts_loop():
    while True:
        try:
            await check_price_alerts_once()
        except Exception as error:  # сеть или Bybit недоступны — пробуем на следующем круге
            log.warning("Проверка уведомлений не удалась: %s", error)
        await asyncio.sleep(ALERT_CHECK_SECONDS)


@app.on_event("startup")
async def start_background_jobs():
    if ENV != "test" and os.getenv("WINDFINANCE_DISABLE_ALERT_LOOP") != "1":
        asyncio.get_running_loop().create_task(alerts_loop())


# ---------------- админка ----------------
def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.id not in ADMIN_USER_IDS:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Раздел доступен только администратору")
    return user


def partner_stats(db: Session, now: datetime, count) -> dict:
    since = now - timedelta(days=30)
    clicks = lambda kind, days: count(select(func.count(PartnerClick.id)).where(  # noqa: E731
        PartnerClick.kind == kind, PartnerClick.created_at >= now - timedelta(days=days)))
    top = db.execute(select(PartnerClick.placement, func.count(PartnerClick.id)).where(PartnerClick.created_at >= since)
                     .group_by(PartnerClick.placement).order_by(desc(func.count(PartnerClick.id))).limit(5)).all()
    return {
        "ref_code": BYBIT_REF_CODE,
        "signup_7d": clicks("signup", 7), "signup_30d": clicks("signup", 30),
        "trade_7d": clicks("trade", 7), "trade_30d": clicks("trade", 30),
        "users_30d": count(select(func.count(func.distinct(PartnerClick.user_id))).where(PartnerClick.created_at >= since)),
        "placements": [{"placement": p or "—", "clicks": c} for p, c in top],
    }


@app.get("/admin/stats")
def admin_stats(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    now = now_naive()
    count = lambda q: db.scalar(q) or 0  # noqa: E731
    paid = lambda purpose, days: count(select(func.sum(Payment.amount_kop)).where(  # noqa: E731
        Payment.status == "succeeded", Payment.method != "stars", Payment.purpose == purpose,
        Payment.paid_at >= now - timedelta(days=days))) / 100
    users_total = count(select(func.count(User.id)))
    plus_active = count(select(func.count(User.id)).where(User.plus_until > now, User.plus_plan != "trial"))
    trials = count(select(func.count(User.id)).where(User.trial_used_at.is_not(None)))
    trial_converted = count(select(func.count(func.distinct(Payment.user_id))).join(User, User.id == Payment.user_id).where(
        Payment.purpose == "subscription", Payment.status == "succeeded", User.trial_used_at.is_not(None)))
    feedback = db.scalars(select(Feedback).order_by(desc(Feedback.id)).limit(20)).all()
    return {
        "users": {"total": users_total,
                  "new_7d": count(select(func.count(User.id)).where(User.created_at >= now - timedelta(days=7))),
                  "new_30d": count(select(func.count(User.id)).where(User.created_at >= now - timedelta(days=30)))},
        "plus": {"active_paid": plus_active,
                 "trial_active": count(select(func.count(User.id)).where(User.plus_until > now, User.plus_plan == "trial")),
                 "trials_started": trials, "trial_to_paid": trial_converted,
                 "conversion_pct": round(plus_active / users_total * 100, 1) if users_total else 0},
        "revenue": {"subscriptions_30d": paid("subscription", 30), "topups_30d": paid("topup", 30)},
        "activity": {"investors": count(select(func.count(func.distinct(Holding.user_id))).where(Holding.quantity > 0)),
                     "trades_7d": count(select(func.count(InvestTrade.id)).where(InvestTrade.created_at >= now - timedelta(days=7))),
                     "goals_active": count(select(func.count(SavingsGoal.id)).where(SavingsGoal.closed_at.is_(None))),
                     "alerts_active": count(select(func.count(PriceAlert.id)).where(PriceAlert.triggered_at.is_(None)))},
        "partner": partner_stats(db, now, count),
        "feedback": [{"id": f.id, "message": f.message, "contact": f.contact, "page": f.page, "at": iso(f.created_at)} for f in feedback],
    }


def require_yookassa() -> None:
    if not YOOKASSA_SHOP_ID or not YOOKASSA_SECRET_KEY or not PUBLIC_BASE_URL:
        raise HTTPException(503, "Платежи пока не настроены")


def require_bybit_admin(user: User) -> None:
    if user.id not in BYBIT_ADMIN_USER_IDS:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Торговый контур доступен только администратору")
    if not BYBIT_LIVE_TRADING:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Реальная торговля отключена")
    if not BYBIT_API_KEY or not BYBIT_API_SECRET:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "API Bybit не настроен")


async def bybit_request(method: str, path: str, body: dict | None = None, query: str = "") -> dict:
    timestamp = str(int(time.time() * 1000))
    recv_window = "5000"
    payload = json.dumps(body or {}, separators=(",", ":"), ensure_ascii=False) if method == "POST" else query
    signature = hmac.new(
        BYBIT_API_SECRET.encode(),
        f"{timestamp}{BYBIT_API_KEY}{recv_window}{payload}".encode(),
        hashlib.sha256,
    ).hexdigest()
    headers = {
        "X-BAPI-API-KEY": BYBIT_API_KEY,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": recv_window,
        "X-BAPI-SIGN": signature,
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.request(
                method,
                f"{BYBIT_API_BASE_URL}{path}",
                headers=headers,
                content=payload.encode() if method == "POST" else None,
                params=query if method != "POST" else None,
            )
    except httpx.TimeoutException:
        raise HTTPException(status.HTTP_504_GATEWAY_TIMEOUT, "Bybit не ответил вовремя")
    except httpx.RequestError:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Bybit недоступен")
    if response.status_code >= 400:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Bybit недоступен")
    try:
        data = response.json()
    except ValueError:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Bybit вернул некорректный ответ")
    if data.get("retCode") != 0:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Bybit: {data.get('retMsg', 'ошибка запроса')}")
    return data


def trade_order_out(order: TradeOrder) -> dict:
    return {
        "id": order.id,
        "symbol": order.symbol,
        "side": order.side,
        "qty": str(order.qty),
        "status": order.status,
        "provider_order_id": order.provider_order_id,
        "client_order_id": order.client_order_id,
        "error": order.error,
        "created_at": iso(order.created_at),
        "updated_at": iso(order.updated_at),
    }


@app.get("/trading/status")
def trading_status(user: User = Depends(get_current_user)):
    if user.id not in BYBIT_ADMIN_USER_IDS:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Торговый контур доступен только администратору")
    return {
        "provider": "bybit",
        "market": "spot",
        "enabled": BYBIT_LIVE_TRADING and bool(BYBIT_API_KEY and BYBIT_API_SECRET),
        "testnet": "testnet" in BYBIT_API_BASE_URL,
        "allowed_symbols": sorted(BYBIT_ALLOWED_SYMBOLS),
        "max_notional_usdt": str(BYBIT_MAX_NOTIONAL_USDT),
    }


@app.post("/trading/orders")
async def create_trade_order(
    payload: TradeOrderRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_bybit_admin(user)
    if payload.symbol not in BYBIT_ALLOWED_SYMBOLS:
        raise HTTPException(400, "Торговая пара запрещена")
    ticker = await bybit_request(
        "GET", "/v5/market/tickers", query=f"category=spot&symbol={payload.symbol}"
    )
    ticker_row = (ticker.get("result", {}).get("list") or [{}])[0]
    last_price = Decimal(str(ticker_row.get("lastPrice", "0")))
    notional = payload.qty * last_price
    if last_price <= 0 or notional > BYBIT_MAX_NOTIONAL_USDT:
        raise HTTPException(400, "Ордер превышает разрешённый лимит")
    client_order_id = str(uuid.uuid4())
    order = TradeOrder(
        user_id=user.id, client_order_id=client_order_id,
        symbol=payload.symbol, side=payload.side, qty=payload.qty, status="submitting",
    )
    db.add(order)
    db.flush()
    try:
        result = await bybit_request("POST", "/v5/order/create", body={
            "category": "spot",
            "symbol": payload.symbol,
            "side": payload.side,
            "orderType": "Market",
            "qty": str(payload.qty),
            "timeInForce": "IOC",
            "orderLinkId": client_order_id,
            "isLeverage": 0,
            "orderFilter": "Order",
        })
        result_data = result.get("result", {})
        order.provider_order_id = result_data.get("orderId")
        order.status = "submitted"
        db.commit()
        return {
            "id": order.id, "client_order_id": client_order_id,
            "provider_order_id": order.provider_order_id, "status": order.status,
        }
    except HTTPException as error:
        order.status = "rejected"
        order.error = str(error.detail)[:500]
        db.commit()
        raise


@app.get("/trading/orders")
def list_trade_orders(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_bybit_admin(user)
    rows = db.scalars(select(TradeOrder).where(TradeOrder.user_id == user.id).order_by(desc(TradeOrder.id)).limit(50)).all()
    return {"orders": [trade_order_out(row) for row in rows]}


@app.get("/trading/orders/{order_id}")
async def get_trade_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_bybit_admin(user)
    order = db.scalar(select(TradeOrder).where(TradeOrder.id == order_id, TradeOrder.user_id == user.id))
    if order is None:
        raise HTTPException(404, "Ордер не найден")
    if order.provider_order_id:
        result = await bybit_request(
            "GET", "/v5/order/realtime",
            query=f"category=spot&symbol={order.symbol}&orderId={order.provider_order_id}",
        )
        remote = (result.get("result", {}).get("list") or [{}])[0]
        if remote.get("orderStatus"):
            order.status = str(remote["orderStatus"]).lower()
            db.commit()
    return trade_order_out(order)


@app.delete("/trading/orders/{order_id}")
async def cancel_trade_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_bybit_admin(user)
    order = db.scalar(select(TradeOrder).where(TradeOrder.id == order_id, TradeOrder.user_id == user.id))
    if order is None:
        raise HTTPException(404, "Ордер не найден")
    if not order.provider_order_id:
        raise HTTPException(409, "У ордера нет идентификатора Bybit")
    await bybit_request("POST", "/v5/order/cancel", body={
        "category": "spot", "symbol": order.symbol, "orderId": order.provider_order_id,
    })
    order.status = "cancel_requested"
    db.commit()
    return trade_order_out(order)


@app.post("/trading/reconcile")
async def reconcile_trading_account(user: User = Depends(get_current_user)):
    require_bybit_admin(user)
    result = await bybit_request(
        "GET", "/v5/account/wallet-balance", query="accountType=UNIFIED&coin=USDT,BTC,ETH,SOL",
    )
    account = (result.get("result", {}).get("list") or [{}])[0]
    coins = account.get("coin") or []
    return {
        "provider": "bybit",
        "account_type": "UNIFIED",
        "balances": {
            coin.get("coin"): {
                "wallet_balance": coin.get("walletBalance"),
                "available_to_withdraw": coin.get("availableToWithdraw"),
                "equity": coin.get("equity"),
            }
            for coin in coins if coin.get("coin")
        },
        "checked_at": iso(now_naive()),
    }


@app.post("/payments/create")
async def create_payment(payload: PaymentRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_yookassa()
    kop = to_kop(payload.amount)
    payment_key = str(uuid.uuid4())
    return_url = f"{PUBLIC_BASE_URL}/?payment=return"
    confirmation = {"type": "redirect", "return_url": return_url}
    request_body = {
        "amount": {"value": f"{kop / 100:.2f}", "currency": "RUB"},
        "capture": True,
        "confirmation": confirmation,
        "description": f"Пополнение Wind Finance · пользователь {user.id}",
        "metadata": {"user_id": str(user.id), "payment_key": payment_key},
    }
    request_body["payment_method_data"] = {
        "type": "sbp" if payload.method == "sbp" else "bank_card"
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            "https://api.yookassa.ru/v3/payments",
            auth=(YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY),
            headers={"Idempotence-Key": payment_key},
            json=request_body,
        )
    if response.status_code >= 400:
        raise HTTPException(502, "Платёжный сервис не создал счёт")
    payment = response.json()
    confirmation_url = payment.get("confirmation", {}).get("confirmation_url")
    provider_id = payment.get("id")
    if not provider_id or not confirmation_url:
        raise HTTPException(502, "Платёжный сервис вернул неполный ответ")
    db.add(Payment(provider_id=provider_id, user_id=user.id, amount_kop=kop, method=payload.method, purpose="topup"))
    db.commit()
    return {"payment_id": provider_id, "status": payment.get("status"), "confirmation_url": confirmation_url}


def available_stars_prices(user: User) -> dict[str, int]:
    if not TG_BOT_TOKEN or not TG_WEBHOOK_SECRET or not user.tg_id:
        return {}
    return {offer: price for offer, price in STARS_PRICES.items()
            if offer in PLANS or (SIMULATOR and not BYBIT_LIVE_TRADING)}


@app.get("/payments/stars/catalog")
def stars_catalog(user: User = Depends(get_current_user)):
    return {"prices": available_stars_prices(user)}


@app.post("/payments/stars/invoice", status_code=201)
async def create_stars_invoice(payload: StarsInvoiceRequest, user: User = Depends(get_current_user),
                               db: Session = Depends(get_db)):
    price = available_stars_prices(user).get(payload.offer)
    if price is None:
        raise HTTPException(503, "Этот платёж через Telegram Stars пока недоступен")
    limiter.check(f"stars-invoice:{user.id}", 10, 60)
    plan = payload.offer if payload.offer in PLANS else None
    if plan and user.plus_until and user.plus_until > now_naive() + timedelta(days=400):
        raise HTTPException(409, "Подписка уже оплачена больше чем на год вперёд")
    rubles = STARS_TOPUPS.get(payload.offer, 0)
    if plan:
        title = f"Wind Plus · {PLANS[plan][1]} дней"
        description = "Доступ к Wind Plus на выбранный срок. Разовая оплата."
    else:
        title = f"{rubles:,} учебных ₽".replace(",", " ")
        description = "Виртуальный баланс инвестиционного симулятора Wind Finance."
    payment_id = f"stars-{uuid.uuid4().hex}"
    invoice_url = await stars_bot_request("createInvoiceLink", {
        "title": title, "description": description, "payload": payment_id, "provider_token": "",
        "currency": "XTR", "prices": [{"label": title, "amount": price}],
    })
    if not isinstance(invoice_url, str) or not invoice_url.startswith("https://t.me/"):
        raise HTTPException(502, "Telegram не вернул ссылку для оплаты")
    db.add(Payment(provider_id=payment_id, user_id=user.id, amount_kop=rubles * 100, method="stars",
                   purpose="subscription" if plan else "topup", plan=plan,
                   stars_amount=price, stars_payer_id=user.tg_id))
    db.commit()
    return {"payment_id": payment_id, "invoice_url": invoice_url}


@app.get("/payments/{provider_id}")
def payment_status(provider_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    payment = db.scalar(select(Payment).where(Payment.provider_id == provider_id, Payment.user_id == user.id))
    if payment is None:
        raise HTTPException(404, "Платёж не найден")
    return {"payment_id": payment.provider_id, "status": payment.status, "balance": wallet_out(db, user.id)["balance"]}


@app.post("/payments/yookassa/webhook")
async def yookassa_webhook(payload: PaymentWebhook, db: Session = Depends(get_db)):
    if payload.event != "payment.succeeded":
        return {"ok": True}
    provider_id = payload.object.get("id")
    if not provider_id:
        raise HTTPException(400, "Нет идентификатора платежа")
    require_yookassa()
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"https://api.yookassa.ru/v3/payments/{provider_id}",
            auth=(YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY),
        )
    if response.status_code >= 400:
        raise HTTPException(502, "Не удалось проверить платёж")
    verified = response.json()
    if verified.get("status") != "succeeded" or not verified.get("paid"):
        raise HTTPException(400, "Платёж не подтверждён")
    payment = db.scalar(select(Payment).where(Payment.provider_id == provider_id).with_for_update())
    if payment is None:
        raise HTTPException(404, "Платёж не найден")
    amount = verified.get("amount", {})
    if amount.get("currency") != "RUB" or int(round(float(amount.get("value", 0)) * 100)) != payment.amount_kop:
        raise HTTPException(400, "Сумма платежа не совпадает")
    if payment.status == "succeeded":
        return {"ok": True, "duplicate": True}
    payment.status = "succeeded"
    payment.paid_at = now_naive()
    if payment.purpose == "subscription":
        if not payment.plan:
            raise HTTPException(500, "У платежа отсутствует тариф")
        extend_paid_plan(db, payment.user_id, payment.plan)
    else:
        credit(db, payment.user_id, payment.amount_kop, f"Пополнение {payment.method}")
    db.commit()
    return {"ok": True}


@app.post("/subscription")
def subscribe(payload: PlanRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    raise HTTPException(410, "Подписка оформляется только через YooKassa")


@app.post("/subscription/payment")
async def create_subscription_payment(
    payload: SubscriptionPaymentRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_yookassa()
    if user.plus_until and user.plus_until > now_naive() + timedelta(days=400):
        raise HTTPException(409, "Подписка уже оплачена больше чем на год вперёд")
    price, _ = PLANS[payload.plan]
    payment_key = str(uuid.uuid4())
    return_url = f"{PUBLIC_BASE_URL}/?subscription=return"
    request_body = {
        "amount": {"value": f"{price / 100:.2f}", "currency": "RUB"},
        "capture": True,
        "confirmation": {"type": "redirect", "return_url": return_url},
        "description": f"Wind Plus · {'год' if payload.plan == 'year' else 'месяц'} · пользователь {user.id}",
        "metadata": {
            "user_id": str(user.id),
            "payment_key": payment_key,
            "purpose": "subscription",
            "plan": payload.plan,
        },
        "payment_method_data": {"type": "sbp" if payload.method == "sbp" else "bank_card"},
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            "https://api.yookassa.ru/v3/payments",
            auth=(YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY),
            headers={"Idempotence-Key": payment_key},
            json=request_body,
        )
    if response.status_code >= 400:
        raise HTTPException(502, "Платёж подписки не создан")
    payment = response.json()
    confirmation_url = payment.get("confirmation", {}).get("confirmation_url")
    provider_id = payment.get("id")
    if not provider_id or not confirmation_url:
        raise HTTPException(502, "Платёжный сервис вернул неполный ответ")
    db.add(Payment(
        provider_id=provider_id,
        user_id=user.id,
        amount_kop=price,
        method=payload.method,
        purpose="subscription",
        plan=payload.plan,
    ))
    db.commit()
    return {"payment_id": provider_id, "status": payment.get("status"), "confirmation_url": confirmation_url}


@app.post("/subscription/trial")
def start_trial(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.trial_used_at is not None:
        raise HTTPException(409, "Пробный период уже был использован")
    if plus_info(user)["active"]:
        raise HTTPException(409, "Подписка уже активна")
    user.trial_used_at = now_naive()
    user.plus_plan = "trial"
    user.plus_until = now_naive() + timedelta(days=TRIAL_DAYS)
    db.commit()
    return {"plus": plus_info(user), "user": user_out(user)}


@app.delete("/subscription")
def cancel_subscription(user: User = Depends(get_current_user)):
    # Автосписаний нет, поэтому «отключать» нечего: оплаченный период не отнимаем.
    info = plus_info(user)
    return {"plus": info, "auto_renew": False,
            "message": "Подписка не продлевается автоматически" + (f" и действует до {info['until'][:10]}" if info["active"] else "")}


# ---------------- игра: лидерборд ----------------
def weekly_rows(db: Session, game: str, week: str, limit: int):
    best = func.max(GameScore.score).label("best")
    return db.execute(
        select(GameScore.user_id, User.username, best).join(User, User.id == GameScore.user_id)
        .where(GameScore.game == game, GameScore.week == week)
        .group_by(GameScore.user_id, User.username).order_by(desc(best)).limit(limit)
    ).all()


def bonus_for(db: Session, user: User, game: str = "drop"):
    prev = iso_week(now_naive() - timedelta(days=7))
    title = f"Бонус: топ-10 недели {prev}"
    for rank, r in enumerate(weekly_rows(db, game, prev, 10), 1):
        if r.user_id == user.id:
            if db.scalar(select(Transaction.id).where(Transaction.user_id == user.id, Transaction.title == title)):
                return None
            return {"week": prev, "rank": rank, "amount": BONUS_RUB[rank - 1], "title": title}
    return None


def board(db: Session, user: User, game: str = "drop") -> dict:
    week = iso_week(now_naive())
    top = [{"rank": i, "username": r.username, "score": r.best, "me": r.user_id == user.id}
           for i, r in enumerate(weekly_rows(db, game, week, 10), 1)]
    b = bonus_for(db, user, game)
    return {"week": week, "top": top, "bonus": {k: b[k] for k in ("week", "rank", "amount")} if b else None}


@app.post("/game/score")
def post_score(payload: ScoreRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Счёт присылает клиент, поэтому он не защищён от накрутки: для призов с реальной ценностью нужна серверная игра.
    limiter.check(f"score:{user.id}", 6, 60)
    db.add(GameScore(user_id=user.id, game=payload.game, week=iso_week(now_naive()), score=payload.score))
    db.commit()
    return board(db, user, payload.game)


@app.get("/game/leaderboard")
def leaderboard(game: Literal["drop"] = "drop", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return board(db, user, game)


@app.post("/game/claim-bonus")
def claim_bonus(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    b = bonus_for(db, user)
    if not b:
        raise HTTPException(404, "Бонус недоступен или уже получен")
    credit(db, user.id, b["amount"] * 100, b["title"])
    db.commit()
    return {**wallet_out(db, user.id), "claimed": b["amount"]}


# ---------------- обратная связь ----------------
@app.get("/partner/bybit")
def partner_bybit():
    # BYBIT_REF_CODE может быть кодом или целой партнёрской ссылкой из кабинета Bybit Affiliates
    if BYBIT_REF_CODE.startswith("https://"):
        return {"ref_code": "", "invite_url": BYBIT_REF_CODE}
    return {"ref_code": BYBIT_REF_CODE, "invite_url": f"https://www.bybit.com/invite?ref={BYBIT_REF_CODE}" if BYBIT_REF_CODE else ""}


@app.post("/partner/click", status_code=201)
def partner_click(payload: PartnerClickRequest, request: Request, user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    limiter.check(f"pc:{client_ip(request)}", 30, 3600)
    db.add(PartnerClick(user_id=user.id if user else None, kind=payload.kind, placement=payload.placement, symbol=payload.symbol))
    db.commit()
    return {"ok": True}


@app.post("/feedback", status_code=201)
def send_feedback(payload: FeedbackRequest, request: Request, user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    limiter.check(f"fb:{client_ip(request)}", 5, 3600)
    db.add(Feedback(user_id=user.id if user else None, message=payload.message.strip(), contact=payload.contact.strip(), page=payload.page))
    db.commit()
    return {"ok": True}


# ---------------- рыночные данные (с кэшем) ----------------
_cache: dict[str, tuple[float, dict]] = {}


async def cached(key: str, ttl: int, fetch):
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    try:
        data = await fetch()
    except Exception:
        if hit:
            return hit[1]  # источник недоступен: отдаём старые данные
        raise HTTPException(502, "Источник данных недоступен")
    _cache[key] = (time.time(), data)
    return data


async def fetch_rates() -> dict:
    async with httpx.AsyncClient(timeout=8) as c:
        r = await c.get("https://www.cbr-xml-daily.ru/daily_json.js")
        r.raise_for_status()
        j = r.json()
    out = {}
    for code in ("USD", "EUR", "CNY", "GBP", "AED"):
        v = j["Valute"].get(code)
        if v:
            out[code] = {"value": v["Value"] / v["Nominal"], "prev": v["Previous"] / v["Nominal"]}
    if out:
        db = SessionLocal()
        try:
            for asset, quote in out.items():
                db.add(RateSnapshot(asset=asset, rub_rate=Decimal(str(quote["value"])), source="cbr-xml-daily.ru"))
            db.commit()
        finally:
            db.close()
    return {"rates": out, "date": j.get("Date")}


async def fetch_rate_history(asset: str, end: date) -> dict:
    async with httpx.AsyncClient(timeout=8) as client:
        response = await client.get(CBR_HISTORY_URL, params=history_params(asset, end))
        response.raise_for_status()
    return parse_history(asset, end, response.content)


MOEX_SHARES = ("SBER", "TMOS", "SBGB")   # акции и фонды на основной доске TQBR


async def fetch_stocks() -> dict:
    """Котировки Мосбиржи. Вне торгов LAST бывает пустым — тогда берём рыночную цену или цену закрытия."""
    base = "https://iss.moex.com/iss/engines/stock/markets"
    async with httpx.AsyncClient(timeout=8) as c:
        shares, idx = await asyncio.gather(
            c.get(f"{base}/shares/boards/TQBR/securities.json", params={
                "iss.meta": "off", "iss.only": "marketdata,securities", "securities": ",".join(MOEX_SHARES),
                "marketdata.columns": "SECID,LAST,MARKETPRICE,LASTTOPREVPRICE,VALTODAY", "securities.columns": "SECID,PREVPRICE"}),
            c.get(f"{base}/index/securities/IMOEX.json", params={
                "iss.meta": "off", "iss.only": "marketdata", "marketdata.columns": "SECID,CURRENTVALUE,LASTCHANGEPRC,VALTODAY"}),
        )
    for r in (shares, idx):
        r.raise_for_status()

    def table(block):
        return [dict(zip(block["columns"], row)) for row in block["data"]]

    sj = shares.json()
    prev = {row["SECID"]: row.get("PREVPRICE") for row in table(sj["securities"])}
    out = {}
    for row in table(sj["marketdata"]):
        price = row.get("LAST") or row.get("MARKETPRICE") or prev.get(row["SECID"])
        out[row["SECID"]] = {"price": price, "pct": row.get("LASTTOPREVPRICE"), "volume": row.get("VALTODAY")}
    i = table(idx.json()["marketdata"])[0]
    out["IMOEX"] = {"price": i.get("CURRENTVALUE"), "pct": i.get("LASTCHANGEPRC"), "volume": i.get("VALTODAY")}
    return out


def clean_news_text(value: str, limit: int) -> str:
    value = html.unescape(re.sub(r"<[^>]+>", " ", value or ""))
    value = re.sub(r"&(?:amp;)?nbsp;?", " ", value, flags=re.IGNORECASE)
    value = value.replace("\xa0", " ")
    return re.sub(r"\s+", " ", value).strip()[:limit]


NEWS_FEEDS = {
    # тег по умолчанию для ленты; внутри всё равно уточняется по ключевым словам
    "США": "S&P 500 OR Nasdaq OR ФРС OR \"Уолл-стрит\"",
    "Россия": "Мосбиржа OR \"индекс МосБиржи\" OR \"ключевая ставка\" OR \"курс рубля\"",
    "Крипто": "биткоин OR криптовалюта OR Ethereum",
    "Экономика": "инфляция OR ЦБ OR ВВП OR нефть",
}
NEWS_TTL = 15 * 60
NEWS_RELEVANCE = (
    "рынок", "инвести", "акци", "облигац", "валют", "курс", "рубл", "доллар", "евро", "битко", "крипт", "эфир", "бирж",
    "индекс", "ставк", "инфляц", "банк", "экономик", "ввп", "нефть", "золот", "сырь", "фрс", "s&p", "nasdaq", "ethereum",
)


def news_tag(text: str, fallback: str) -> str:
    lowered = text.lower()
    rules = (
        ("Крипто", ("битко", "крипт", "эфир", "bitcoin", "ethereum", "токен", "блокчейн")),
        ("США", ("s&p", "nasdaq", "dow jones", "фрс", "уолл-стрит", "америк", "сша")),
        ("Россия", ("мосбирж", "рубл", "ключев", "цб рф", "банк россии", "сбер", "газпром")),
        ("Экономика", ("инфляц", "ставк", "ввп", "нефть", "золот", "экономик")),
    )
    for tag, words in rules:
        if any(word in lowered for word in words):
            return tag
    return fallback


async def fetch_feed(client: httpx.AsyncClient, fallback_tag: str, query: str) -> list[dict]:
    response = await client.get("https://news.google.com/rss/search",
                                params={"q": f"{query} when:2d", "hl": "ru", "gl": "RU", "ceid": "RU:ru"},
                                headers={"User-Agent": "WindFinance/1.0"})
    response.raise_for_status()
    items = []
    for item in ET.fromstring(response.content).findall("./channel/item")[:25]:
        raw_title = clean_news_text(item.findtext("title", ""), 220)
        source = clean_news_text(item.findtext("source", ""), 60)
        title = raw_title[: -len(source) - 3].strip() if source and raw_title.endswith(f" - {source}") else raw_title
        link = (item.findtext("link") or "").strip()
        summary = clean_news_text(item.findtext("description", ""), 360)
        if summary.startswith(title):
            summary = ""
        if not title or not link or not re.search(r"[А-Яа-яЁё]", title):
            continue
        if not any(word in f"{title} {summary}".lower() for word in NEWS_RELEVANCE):
            continue
        try:
            published = parsedate_to_datetime(item.findtext("pubDate") or "").astimezone(timezone.utc).replace(tzinfo=None)
        except (TypeError, ValueError):
            published = now_naive()
        items.append({"title": title, "summary": summary, "url": link, "source": source,
                      "published": iso(published), "_ts": published, "tag": news_tag(f"{title} {summary}", fallback_tag)})
    return items


async def fetch_news() -> dict:
    feeds = dict(NEWS_FEEDS)
    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        results = await asyncio.gather(*(fetch_feed(client, tag, q) for tag, q in feeds.items()), return_exceptions=True)
    seen, news = set(), []
    for batch in results:
        if isinstance(batch, Exception):
            continue
        for item in batch:
            key = re.sub(r"[^а-яёa-z0-9]", "", item["title"].lower())[:60]
            if key in seen:
                continue
            seen.add(key)
            news.append(item)
    if not news:
        raise ValueError("Ни одна лента не ответила")
    news.sort(key=lambda n: n["_ts"], reverse=True)
    news = news[:40]
    for index, item in enumerate(news):
        item.pop("_ts")
        item["id"] = "news-" + hashlib.sha1(item["url"].encode()).hexdigest()[:12]
    counts: dict[str, int] = {}
    for item in news:
        counts[item["tag"]] = counts.get(item["tag"], 0) + 1
    return {"updated_at": iso(now_naive()), "items": news, "counts": counts, "ttl": NEWS_TTL}


@app.get("/market/rates")
async def market_rates():
    return await cached("rates", 600, fetch_rates)


@app.get("/market/rates/history")
async def market_rate_history(asset: Literal["USD", "EUR", "CNY"]):
    end = datetime.now(CBR_TIMEZONE).date()
    key = f"rates-history:{asset}"
    hit = _cache.get(key)
    if hit and hit[1]["end"] != end.isoformat():
        # После смены даты обновляем диапазон. При сбое оставляем предыдущую историю.
        _cache[key] = (0, hit[1])
    return await cached(key, 3600, lambda: fetch_rate_history(asset, end))


@app.get("/market/stocks")
async def market_stocks():
    return await cached("stocks", 30, fetch_stocks)


@app.get("/market/news")
async def market_news():
    return await cached("news-v2", NEWS_TTL, fetch_news)


# ---------------- демо-пользователь и фронтенд ----------------
if ENV == "dev" and os.getenv("ALEMBIC_RUNNING") != "1":
    with SessionLocal() as _db:
        if _db.scalar(select(User.id).where(User.email == "demo@example.com")) is None:
            _db.add(User(username="demo", email="demo@example.com", password_hash=password_hash.hash("demo123456"),
                         balance_kop=START_BALANCE_KOP, accepted_terms_at=now_naive()))
            _db.commit()


@app.get("/")
def index():
    return FileResponse(FRONT_DIR / "index.html")


if FRONT_DIR.is_dir():
    app.mount("/", StaticFiles(directory=FRONT_DIR), name="front")  # должен идти после всех API-роутов
