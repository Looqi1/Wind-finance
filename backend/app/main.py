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
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Literal
from urllib.parse import parse_qsl

import httpx
import jwt
import pyotp
from fastapi import Depends, FastAPI, HTTPException, Request, status
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
BYBIT_ADMIN_USER_IDS = {
    int(value.strip()) for value in os.getenv("BYBIT_ADMIN_USER_IDS", "").split(",")
    if value.strip().isdigit()
}
BYBIT_ALLOWED_SYMBOLS = {"BTCUSDT", "ETHUSDT", "SOLUSDT"}
BYBIT_MAX_NOTIONAL_USDT = Decimal(os.getenv("BYBIT_MAX_NOTIONAL_USDT", "100"))
ALLOWED_ORIGINS = [origin.strip().rstrip("/") for origin in os.getenv("WINDFINANCE_ALLOWED_ORIGINS", "").split(",") if origin.strip()]
NEWS_RSS_URL = os.getenv(
    "NEWS_RSS_URL",
    "https://news.google.com/rss/search?q=%28S%26P%20500%20OR%20Nasdaq%20OR%20Dow%20Jones%20OR%20%D0%A4%D0%A0%D0%A1%20OR%20%D0%B0%D0%BC%D0%B5%D1%80%D0%B8%D0%BA%D0%B0%D0%BD%D1%81%D0%BA%D0%B8%D0%B5%20%D0%B0%D0%BA%D1%86%D0%B8%D0%B8%20OR%20%D1%84%D0%BE%D0%BD%D0%B4%D0%BE%D0%B2%D1%8B%D0%B9%20%D1%80%D1%8B%D0%BD%D0%BE%D0%BA%29%20%28%D0%B0%D0%BD%D0%B0%D0%BB%D0%B8%D0%B7%20OR%20%D0%BE%D0%B1%D0%B7%D0%BE%D1%80%20OR%20%D0%BF%D1%80%D0%BE%D0%B3%D0%BD%D0%BE%D0%B7%29%20-%D1%81%D0%BC%D0%B0%D1%80%D1%82%D1%84%D0%BE%D0%BD%20-%D1%82%D0%B5%D1%85%D0%BD%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D0%B8&hl=ru&gl=RU&ceid=RU:ru",
)
TRUST_PROXY = os.getenv("TRUST_PROXY", "0") == "1"           # включи за nginx/Cloudflare
TOKEN_EXPIRE_DAYS = 7
START_BALANCE_KOP = 2_450_000 if SIMULATOR else 0
PLANS = {"month": (19_900, 30), "year": (179_000, 365)}      # цена в копейках, дней
BONUS_RUB = [5000, 3000, 2000] + [1000] * 7                  # бонус за места 1..10

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
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_naive)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class GameScore(Base):
    __tablename__ = "game_scores"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    game: Mapped[str] = mapped_column(String(20), index=True)
    week: Mapped[str] = mapped_column(String(10), index=True)
    score: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_naive)


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


def exchange_assets(db: Session, user_id: int, request: ExchangeRequest) -> dict:
    source = normalize_asset(request.from_asset)
    target = normalize_asset(request.to_asset)
    if source == target:
        raise HTTPException(400, "Активы должны отличаться")
    rates = dict(ASSET_RATES_RUB)
    for asset in (source, target):
        snapshot = db.scalar(select(RateSnapshot).where(RateSnapshot.asset == asset).order_by(desc(RateSnapshot.fetched_at)))
        if snapshot:
            rates[asset] = Decimal(snapshot.rub_rate)
    if source not in rates or target not in rates:
        raise HTTPException(400, "Этот актив пока не поддерживается")
    amount = request.amount
    source_row = ensure_asset(db, user_id, source)
    target_row = ensure_asset(db, user_id, target)
    if source == "RUB":
        user = db.scalar(select(User).where(User.id == user_id).with_for_update())
        available = Decimal(user.balance_kop) / 100
    else:
        available = Decimal(source_row.quantity or 0)
    if available < amount:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, "Недостаточно средств")
    result = (amount * rates[source] / rates[target]).quantize(Decimal("0.00000001"))
    if source == "RUB":
        charge(db, user_id, int(amount * 100), f"Обмен RUB → {target}")
        source_row.quantity = available - amount
    else:
        source_row.quantity = Decimal(source_row.quantity) - amount
    if target == "RUB":
        credit(db, user_id, int(result * 100), f"Обмен {source} → RUB")
        target_row.quantity = result
    else:
        target_row.quantity = Decimal(target_row.quantity) + result
    if source != "RUB":
        db.add(Transaction(user_id=user_id, kind="out", title=f"Обмен {source} → {target}", amount_kop=int(amount * rates[source] * 100)))
    db.commit()
    return assets_out(db, user_id)


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


# ---------------- виртуальный кошелёк ----------------
@app.get("/wallet")
def wallet(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return wallet_out(db, user.id)


@app.get("/wallet/assets")
def wallet_assets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return assets_out(db, user.id)


@app.post("/wallet/exchange")
def wallet_exchange(payload: ExchangeRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return exchange_assets(db, user.id, payload)


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
    db.add(Payment(provider_id=provider_id, user_id=user.id, amount_kop=kop, method=payload.method))
    db.commit()
    return {"payment_id": provider_id, "status": payment.get("status"), "confirmation_url": confirmation_url}


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
    credit(db, payment.user_id, payment.amount_kop, f"Пополнение {payment.method}")
    db.commit()
    return {"ok": True}


@app.post("/wallet/spend")
def spend(payload: MoneyRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Списание виртуальных денег. С реальными деньгами это должны быть проверенные заказы, а не свободная сумма."""
    charge(db, user.id, to_kop(payload.amount), payload.title or "Списание")
    db.commit()
    return wallet_out(db, user.id)


@app.post("/subscription")
def subscribe(payload: PlanRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.plus_until and user.plus_until > now_naive():
        raise HTTPException(409, "Подписка уже активна")
    price, days = PLANS[payload.plan]
    charge(db, user.id, price, f"Подписка Wind Plus · {'год' if payload.plan == 'year' else 'месяц'}")
    db.execute(update(User).where(User.id == user.id).values(plus_plan=payload.plan, plus_until=now_naive() + timedelta(days=days)))
    db.commit()
    db.refresh(user)
    return {"plus": plus_info(user), "balance": user.balance_kop / 100}


@app.delete("/subscription")
def cancel_subscription(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.plus_until = None
    user.plus_plan = None
    db.commit()
    return {"plus": plus_info(user)}


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


async def fetch_stocks() -> dict:
    cols = {"iss.meta": "off", "iss.only": "marketdata"}
    async with httpx.AsyncClient(timeout=8) as c:
        sber = await c.get("https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities/SBER.json",
                           params={**cols, "marketdata.columns": "SECID,LAST,LASTTOPREVPRICE"})
        idx = await c.get("https://iss.moex.com/iss/engines/stock/markets/index/securities/IMOEX.json",
                          params={**cols, "marketdata.columns": "SECID,CURRENTVALUE,LASTCHANGEPRCNT"})
    for r in (sber, idx):
        r.raise_for_status()

    def first(resp):
        md = resp.json()["marketdata"]
        return dict(zip(md["columns"], md["data"][0]))

    s, i = first(sber), first(idx)
    return {"SBER": {"price": s.get("LAST"), "pct": s.get("LASTTOPREVPRICE")},
            "IMOEX": {"price": i.get("CURRENTVALUE"), "pct": i.get("LASTCHANGEPRCNT")}}


def clean_news_text(value: str, limit: int) -> str:
    value = html.unescape(re.sub(r"<[^>]+>", " ", value or ""))
    value = re.sub(r"&(?:amp;)?nbsp;?", " ", value, flags=re.IGNORECASE)
    value = value.replace("\xa0", " ")
    return re.sub(r"\s+", " ", value).strip()[:limit]


async def fetch_news() -> dict:
    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
        response = await client.get(NEWS_RSS_URL, headers={"User-Agent": "WindFinance/1.0"})
        response.raise_for_status()
    root = ET.fromstring(response.content)
    items = root.findall("./channel/item")[:12]
    news = []
    for index, item in enumerate(items):
        title = clean_news_text(item.findtext("title", ""), 180)
        summary = clean_news_text(item.findtext("description", ""), 360)
        link = (item.findtext("link") or "").strip()
        published = (item.findtext("pubDate") or "").strip()
        if not title or not link or not re.search(r"[А-Яа-яЁё]", title):
            continue
        lowered = f"{title} {summary}".lower()
        relevance = (
            "рынок", "инвести", "акци", "облигац", "валют", "форекс", "курс",
            "рубл", "доллар", "евро", "битко", "крипт", "эфир", "бирж",
            "индекс", "ставк", "инфляц", "центральн", "экономик", "ввп",
            "нефть", "золот", "сырь", "stock", "equity", "market", "invest",
            "currency", "bitcoin", "crypto", "forex", "inflation", "rate",
        )
        if not any(word in lowered for word in relevance):
            continue
        tag = "Рынок"
        if any(word in lowered for word in ("s&p", "nasdaq", "dow jones", "фрс", "американск", "америк")):
            tag = "США"
        elif any(word in lowered for word in ("акци", "облигац", "индекс", "stock", "equity")):
            tag = "Акции"
        elif any(word in lowered for word in ("битко", "крипт", "эфир", "bitcoin", "ethereum", "crypto")):
            tag = "Крипто"
        elif any(word in lowered for word in ("инфляц", "ставк", "центральн", "ввп", "экономик", "inflation", "rate", "central bank")):
            tag = "Экономика"
        news.append({
            "id": f"news-{index}",
            "tag": tag,
            "title": title,
            "summary": summary or "Свежий анализ мировых финансовых рынков.",
            "published": published,
            "url": link,
        })
    if not news:
        raise ValueError("RSS не содержит новостей")
    return {"updated_at": now_naive().isoformat() + "Z", "items": news}


@app.get("/market/rates")
async def market_rates():
    return await cached("rates", 600, fetch_rates)


@app.get("/market/stocks")
async def market_stocks():
    return await cached("stocks", 30, fetch_stocks)


@app.get("/market/news")
async def market_news():
    return await cached("news-us-market", 86_400, fetch_news)


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