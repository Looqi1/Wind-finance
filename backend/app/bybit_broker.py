"""Per-customer Bybit OAuth connections and explicitly confirmed spot buys."""
import hashlib
import hmac
import json
import os
import secrets
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Literal
from urllib.parse import urlencode, urlsplit

import httpx
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, Session, mapped_column

from .database import Base


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class BrokerAccount(Base):
    __tablename__ = "broker_accounts"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    integration: Mapped[str] = mapped_column(String(64))
    state_hash: Mapped[str | None] = mapped_column(String(64), unique=True)
    pin_hash: Mapped[str | None] = mapped_column(String(64))
    expires: Mapped[datetime | None] = mapped_column(DateTime)
    auth_code: Mapped[str | None] = mapped_column(Text)
    uid: Mapped[str | None] = mapped_column(String(32))
    credentials: Mapped[str | None] = mapped_column(Text)


class BrokerBuy(Base):
    __tablename__ = "broker_buys"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    integration: Mapped[str] = mapped_column(String(64))
    uid: Mapped[str] = mapped_column(String(32))
    symbol: Mapped[str] = mapped_column(String(16))
    budget: Mapped[Decimal] = mapped_column(Numeric(20, 2))
    ask: Mapped[Decimal] = mapped_column(Numeric(28, 12))
    created: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(32))
    filled: Mapped[Decimal] = mapped_column(Numeric(28, 12), default=0)
    spent: Mapped[Decimal] = mapped_column(Numeric(28, 12), default=0)
    note: Mapped[str] = mapped_column(String(180), default="")


class BuyInput(BaseModel):
    symbol: Literal["BTCUSDT", "ETHUSDT", "SOLUSDT"]
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class PairInput(BaseModel):
    pin: str = Field(pattern=r"^[0-9A-F]{10}$")


@dataclass
class Config:
    network: str
    broker: str
    client: str
    secret: str
    redirect: str
    cipher: Fernet
    limit: Decimal

    @property
    def integration(self):
        return digest("|".join([self.network, self.client, self.broker]))

    @property
    def api(self):
        return "https://api.bybit.com" if self.network == "mainnet" else "https://api-testnet.bybit.com"

    @property
    def oauth(self):
        return "https://api2.bybit.com" if self.network == "mainnet" else "https://api2.testnet.bybit.com"


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def config():
    network = os.getenv("BYBIT_BROKER_NETWORK", "")
    if network not in {"testnet", "mainnet"}:
        return None
    if network == "mainnet" and os.getenv("WINDFINANCE_ENV") != "prod":
        return None
    values = [os.getenv(key, "").strip() for key in (
        "BYBIT_BROKER_ID", "BYBIT_OAUTH_CLIENT_ID", "BYBIT_OAUTH_CLIENT_SECRET", "BYBIT_OAUTH_REDIRECT_URI")]
    if not all(values) or urlsplit(values[-1]).scheme != "https":
        return None
    try:
        limit = Decimal(os.getenv("BYBIT_MAX_NOTIONAL_USDT", "100"))
        cipher = Fernet(os.getenv("BYBIT_BROKER_ENCRYPTION_KEY", "").encode())
    except (ValueError, ArithmeticError):
        return None
    if not limit.is_finite() or limit <= 0:
        return None
    return Config(network, *values, cipher, limit)


def enabled():
    cfg = config()
    if not cfg:
        raise HTTPException(503, "Подключение Bybit Broker пока недоступно")
    return cfg


class ExchangeRejection(HTTPException):
    def __init__(self, code, message):
        super().__init__(422, f"Bybit ({code}): {str(message)[:120]}")
        self.code = code


async def exchange(method, url, **kwargs):
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.request(method, url, **kwargs)
        res.raise_for_status()
        data = res.json()
        if not isinstance(data, dict):
            raise ValueError()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, "Не удалось получить ответ Bybit")
    code = data.get("retCode", data.get("ret_code"))
    if code not in (None, 0, "0"):
        raise ExchangeRejection(str(code), data.get("retMsg") or data.get("ret_msg") or "Запрос отклонён")
    result = data.get("result", data)
    if not isinstance(result, dict):
        raise HTTPException(502, "Некорректный ответ Bybit")
    return result


async def v5(cfg, keys, method, path, params=None):
    params = params or {}
    stamp = str(int(time.time() * 1000))
    payload = json.dumps(params, separators=(",", ":")) if method == "POST" else urlencode(params)
    api_key, secret = keys
    signature = hmac.new(secret.encode(), f"{stamp}{api_key}5000{payload}".encode(), hashlib.sha256).hexdigest()
    headers = {"X-BAPI-API-KEY": api_key, "X-BAPI-SIGN": signature, "X-BAPI-TIMESTAMP": stamp,
               "X-BAPI-RECV-WINDOW": "5000", "X-Referer": cfg.broker, "Content-Type": "application/json"}
    url = cfg.api + path
    if method == "GET":
        return await exchange(method, url + ("?" + payload if payload else ""), headers=headers)
    return await exchange(method, url, headers=headers, content=payload.encode())


def decrypt(cfg, encrypted):
    try:
        return cfg.cipher.decrypt(encrypted.encode()).decode()
    except InvalidToken:
        raise HTTPException(409, "Подключи аккаунт Bybit заново")


def connection(db, user, cfg):
    account = db.get(BrokerAccount, user.id)
    if not account or account.integration != cfg.integration or not account.credentials:
        raise HTTPException(409, "Сначала подключи свой аккаунт Bybit")
    return account


def summary(order):
    return {"id": order.id, "symbol": order.symbol, "budget": str(order.budget), "ask": str(order.ask),
            "status": order.status, "filled": str(order.filled), "spent": str(order.spent), "note": order.note}


FINAL = {"Filled", "Cancelled", "Rejected", "PartiallyFilledCanceled", "Deactivated"}


def router_for(current_user, get_db, limiter):
    router = APIRouter(prefix="/broker/bybit", tags=["Bybit Broker"])

    def trader(user=Depends(current_user)):
        if user.email == "demo@example.com":
            raise HTTPException(403, "Для подключения нужен личный аккаунт Wind")
        return user

    @router.get("/status")
    def status(user=Depends(trader), db: Session = Depends(get_db)):
        cfg = config()
        if not cfg:
            return {"enabled": False}
        account = db.get(BrokerAccount, user.id)
        uid = account.uid if account and account.integration == cfg.integration and account.credentials else None
        latest = db.scalar(select(BrokerBuy).where(
            BrokerBuy.user_id == user.id, BrokerBuy.uid == uid, BrokerBuy.integration == cfg.integration,
            BrokerBuy.status != "preview").order_by(BrokerBuy.created.desc()).limit(1)) if uid else None
        return {"enabled": True, "network": cfg.network, "uid": uid, "max_usdt": str(cfg.limit),
                "latest": summary(latest) if latest else None}

    @router.post("/connect")
    def connect(user=Depends(trader), db: Session = Depends(get_db), cfg=Depends(enabled)):
        limiter.check(f"broker-connect:{user.id}", 10, 300)
        account = db.get(BrokerAccount, user.id)
        if account and account.integration == cfg.integration and account.credentials:
            raise HTTPException(409, "Аккаунт уже подключён")
        state = secrets.token_urlsafe(32)
        if not account:
            account = BrokerAccount(user_id=user.id)
            db.add(account)
        account.integration, account.state_hash = cfg.integration, digest(state)
        account.expires = now() + timedelta(minutes=10)
        account.pin_hash = account.auth_code = account.credentials = account.uid = None
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, "Повтори подключение")
        host = "https://www.bybit.com" if cfg.network == "mainnet" else "https://testnet.bybit.com"
        params = {"client_id": cfg.client, "response_type": "code", "scope": "openapi",
                  "redirect_uri": cfg.redirect, "state": state}
        return {"url": host + "/oauth?" + urlencode(params)}

    @router.get("/callback", response_class=HTMLResponse)
    def callback(state: str = "", code: str = "", client_id: str = "", cfg=Depends(enabled), db: Session = Depends(get_db)):
        if not state or not code or len(code) > 2048 or (client_id and client_id != cfg.client):
            raise HTTPException(400, "Подключение отменено. Вернись в Wind.")
        pin = secrets.token_hex(5).upper()
        changed = db.execute(update(BrokerAccount).where(
            BrokerAccount.integration == cfg.integration, BrokerAccount.state_hash == digest(state),
            BrokerAccount.expires > now()).values(state_hash=None, pin_hash=digest(pin),
            auth_code=cfg.cipher.encrypt(code.encode()).decode(), expires=now() + timedelta(minutes=3)))
        if changed.rowcount != 1:
            raise HTTPException(400, "Ссылка истекла или уже использована")
        db.commit()
        return HTMLResponse(f"""<!doctype html><html lang="ru"><meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1"><title>Подключение Bybit · Wind Finance</title>
            <style>body{{font:1rem/1.6 system-ui;background:#242019;color:#fff4df;max-width:30rem;margin:12vh auto;padding:20px}}
            strong{{display:block;letter-spacing:.12em;font:700 2rem monospace;color:#ffdb9c;user-select:all}}</style>
            <main><h1>Вернись в Wind Finance</h1><p>Введи этот код в том же аккаунте Wind, где начал подключение.</p>
            <strong>{pin}</strong><p>Код действует 3 минуты. Вводи его только в своём приложении.</p></main></html>""",
            headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
                     "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"})

    @router.post("/pair")
    async def pair(payload: PairInput, user=Depends(trader), db: Session = Depends(get_db), cfg=Depends(enabled)):
        limiter.check(f"broker-pin:{user.id}", 10, 180)
        match = (BrokerAccount.user_id == user.id, BrokerAccount.integration == cfg.integration,
                 BrokerAccount.pin_hash == digest(payload.pin), BrokerAccount.expires > now())
        account = db.scalar(select(BrokerAccount).where(*match))
        if not account:
            raise HTTPException(400, "Код неверен или истёк")
        code = decrypt(cfg, account.auth_code)
        token = await exchange("POST", cfg.oauth + "/oauth/v1/public/access_token", data={
            "client_id": cfg.client, "client_secret": cfg.secret, "code": code})
        if not token.get("access_token"):
            raise HTTPException(502, "Bybit не подтвердил подключение")
        resource = await exchange("GET", cfg.oauth + "/oauth/v1/resource/restrict/openapi",
                                  headers={"Authorization": "Bearer " + token["access_token"]})
        keys = [resource.get("api_key"), resource.get("api_secret")]
        if not all(keys):
            raise HTTPException(502, "Bybit не предоставил доступ к спотовой торговле")
        info = await v5(cfg, keys, "GET", "/v5/user/query-api")
        perms = info.get("permissions") or {}
        uid = str(info.get("userID") or "")
        if not uid.isdigit() or str(info.get("readOnly")) != "0" or "SpotTrade" not in perms.get("Spot", []) or perms.get("Wallet"):
            raise HTTPException(403, "Для Wind нужен доступ к споту без переводов и вывода средств")
        updated = db.execute(update(BrokerAccount).where(*match).values(
            credentials=cfg.cipher.encrypt(json.dumps(keys).encode()).decode(), uid=uid,
            auth_code=None, pin_hash=None, expires=None))
        if updated.rowcount != 1:
            raise HTTPException(409, "Подключение устарело, начни заново")
        db.commit()
        return {"uid": uid}

    @router.delete("/connection")
    def disconnect(user=Depends(trader), db: Session = Depends(get_db)):
        account = db.get(BrokerAccount, user.id)
        if account:
            db.delete(account)
            db.commit()
        return {"ok": True}

    @router.post("/quotes")
    async def quote(payload: BuyInput, user=Depends(trader), db: Session = Depends(get_db), cfg=Depends(enabled)):
        account = connection(db, user, cfg)
        limiter.check(f"broker-quote:{user.id}", 20, 60)
        if payload.amount > cfg.limit:
            raise HTTPException(400, "Сумма превышает лимит на одну покупку")
        ticks = await exchange("GET", cfg.api + "/v5/market/tickers", params={"category": "spot", "symbol": payload.symbol})
        rows = ticks.get("list") or []
        try:
            ask = Decimal(str(rows[0]["ask1Price"])) if rows and rows[0].get("symbol") == payload.symbol else Decimal(0)
        except (ArithmeticError, KeyError, TypeError):
            ask = Decimal(0)
        if not ask.is_finite() or ask <= 0:
            raise HTTPException(502, "Нет актуальной цены предложения")
        order = BrokerBuy(id=uuid.uuid4().hex, user_id=user.id, uid=account.uid, integration=cfg.integration,
                          symbol=payload.symbol, budget=payload.amount, ask=ask, created=now(), status="preview")
        db.add(order)
        db.commit()
        return summary(order)

    def owned_order(db, user, cfg, order_id):
        account = connection(db, user, cfg)
        order = db.get(BrokerBuy, order_id)
        if not order or (order.user_id, order.uid, order.integration) != (user.id, account.uid, cfg.integration):
            raise HTTPException(404, "Заявка не найдена")
        return order, json.loads(decrypt(cfg, account.credentials))

    @router.post("/orders/{order_id}/confirm")
    async def confirm(order_id: str, user=Depends(trader), db: Session = Depends(get_db), cfg=Depends(enabled)):
        order, keys = owned_order(db, user, cfg, order_id)
        if order.status != "preview":
            return summary(order)
        claimed = db.execute(update(BrokerBuy).where(BrokerBuy.id == order_id, BrokerBuy.status == "preview",
            BrokerBuy.created > now() - timedelta(seconds=45), BrokerBuy.budget <= cfg.limit).values(status="pending"))
        db.commit()
        if not claimed.rowcount:
            db.refresh(order)
            if order.status == "preview":
                raise HTTPException(409, "Расчёт устарел. Получи новую цену.")
            return summary(order)
        params = {"category": "spot", "symbol": order.symbol, "side": "Buy", "orderType": "Market",
                  "qty": format(order.budget, "f"), "marketUnit": "quoteCoin", "orderLinkId": order.id,
                  "isLeverage": 0, "orderFilter": "Order", "slippageToleranceType": "Percent", "slippageTolerance": "0.50"}
        try:
            await v5(cfg, keys, "POST", "/v5/order/create", params)
        except ExchangeRejection as error:
            # Mark only definitive permission, parameter, size or funds rejections terminal.
            rejected = error.code in {"10001", "10003", "10004", "10005", "10010", "170131",
                                      "170134", "170135", "170136", "170137", "170140", "170148"}
            db.execute(update(BrokerBuy).where(BrokerBuy.id == order_id, BrokerBuy.status == "pending").values(
                status="Rejected" if rejected else "pending", note=error.detail))
            db.commit()
        except HTTPException:
            pass  # Keep the durable orderLinkId for reconciliation. Never resubmit here.
        return summary(db.get(BrokerBuy, order_id))

    @router.get("/orders/{order_id}")
    async def check_order(order_id: str, user=Depends(trader), db: Session = Depends(get_db), cfg=Depends(enabled)):
        order, keys = owned_order(db, user, cfg, order_id)
        if order.status in FINAL or order.status == "preview":
            return summary(order)
        params = {"category": "spot", "symbol": order.symbol, "orderLinkId": order.id}
        old_status, old_filled = order.status, order.filled
        for path in ("/v5/order/realtime", "/v5/order/history"):
            result = await v5(cfg, keys, "GET", path, params)
            row = next((x for x in result.get("list", []) if x.get("orderLinkId") == order.id), None)
            if row:
                db.execute(update(BrokerBuy).where(BrokerBuy.id == order.id, BrokerBuy.status == old_status,
                    BrokerBuy.filled == old_filled).values(status=row["orderStatus"],
                    filled=Decimal(row.get("cumExecQty") or "0"), spent=Decimal(row.get("cumExecValue") or "0"), note=""))
                db.commit()
                break
        return summary(order)

    return router
