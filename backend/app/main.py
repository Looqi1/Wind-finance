import hashlib
import hmac
import json
import os
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
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
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text, create_engine, desc, func, select, update
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
TG_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
SIMULATOR = os.getenv("WINDFINANCE_SIMULATOR", "1") == "1"   # виртуальные деньги
TRUST_PROXY = os.getenv("TRUST_PROXY", "0") == "1"           # включи за nginx/Cloudflare
TOKEN_EXPIRE_DAYS = 7
START_BALANCE_KOP = 2_450_000
DAILY_TOPUP_LIMIT_KOP = 10_000_000
PLANS = {"month": (19_900, 30), "year": (179_000, 365)}      # цена в копейках, дней
BONUS_RUB = [5000, 3000, 2000] + [1000] * 7                  # бонус за места 1..10

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
password_hash = PasswordHash.recommended()
DUMMY_HASH = password_hash.hash("dummy-password-for-timing")
bearer_scheme = HTTPBearer(auto_error=False)


def now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


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
    totp_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)  # в проде шифруй
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

if ENV == "dev":  # в проде фронтенд отдаётся с того же адреса, CORS не нужен
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$",
        allow_methods=["*"], allow_headers=["*"],
    )


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
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
        if not pyotp.TOTP(user.totp_secret).verify(payload.totp_code.strip(), valid_window=1):
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
    return token_out(user)


@app.get("/auth/me")
def me(user: User = Depends(get_current_user)):
    return user_out(user)


@app.post("/auth/2fa/setup")
def twofa_setup(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.totp_enabled:
        raise HTTPException(409, "2FA уже включена")
    user.totp_secret = pyotp.random_base32()
    db.commit()
    uri = pyotp.TOTP(user.totp_secret).provisioning_uri(name=user.email, issuer_name="Wind Finance")
    return {"secret": user.totp_secret, "uri": uri}


@app.post("/auth/2fa/enable")
def twofa_enable(payload: CodeRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    limiter.check(f"2fa:{user.id}", 10, 300)
    if not user.totp_secret:
        raise HTTPException(400, "Сначала запроси ключ")
    if not pyotp.TOTP(user.totp_secret).verify(payload.code.strip(), valid_window=1):
        raise HTTPException(400, "Неверный код")
    user.totp_enabled = True
    db.commit()
    return {"totp_enabled": True}


@app.post("/auth/2fa/disable")
def twofa_disable(payload: CodeRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    limiter.check(f"2fa:{user.id}", 10, 300)
    if not user.totp_enabled or not pyotp.TOTP(user.totp_secret).verify(payload.code.strip(), valid_window=1):
        raise HTTPException(400, "Неверный код")
    user.totp_enabled = False
    user.totp_secret = None
    db.commit()
    return {"totp_enabled": False}


# ---------------- виртуальный кошелёк ----------------
@app.get("/wallet")
def wallet(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return wallet_out(db, user.id)


@app.post("/wallet/demo-topup")
def demo_topup(payload: MoneyRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Демо-пополнение виртуального баланса. Работает только в режиме симулятора."""
    if not SIMULATOR:
        raise HTTPException(403, "Демо-пополнение отключено")
    kop = to_kop(payload.amount)
    day_start = now_naive().replace(hour=0, minute=0, second=0, microsecond=0)
    today = db.scalar(select(func.coalesce(func.sum(Transaction.amount_kop), 0)).where(
        Transaction.user_id == user.id, Transaction.kind == "in",
        Transaction.title.like("Пополнение (демо)%"), Transaction.created_at >= day_start)) or 0
    if today + kop > DAILY_TOPUP_LIMIT_KOP:
        raise HTTPException(429, "Дневной лимит демо-пополнения исчерпан")
    credit(db, user.id, kop, f"Пополнение (демо): {payload.title}"[:80])
    db.commit()
    return wallet_out(db, user.id)


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


@app.get("/market/rates")
async def market_rates():
    return await cached("rates", 600, fetch_rates)


@app.get("/market/stocks")
async def market_stocks():
    return await cached("stocks", 30, fetch_stocks)


# ---------------- демо-пользователь и фронтенд ----------------
if ENV == "dev":
    with SessionLocal() as _db:
        if _db.scalar(select(User.id).where(User.email == "demo@example.com")) is None:
            _db.add(User(username="demo", email="demo@example.com", password_hash=password_hash.hash("demo123456"),
                         balance_kop=START_BALANCE_KOP, accepted_terms_at=now_naive()))
            _db.commit()


@app.get("/")
def index():
    return FileResponse(FRONT_DIR / "site.html")


if FRONT_DIR.is_dir():
    app.mount("/", StaticFiles(directory=FRONT_DIR), name="front")  # должен идти после всех API-роутов