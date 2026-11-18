import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parents[1]))

os.environ.setdefault("WINDFINANCE_ENV", "test")
os.environ.setdefault("WINDFINANCE_SECRET_KEY", "test-secret-with-at-least-32-bytes")
os.environ.setdefault("WINDFINANCE_SIMULATOR", "1")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{Path(__file__).with_name('test.db')}")

from fastapi.testclient import TestClient
import pyotp

from app.main import Base, SessionLocal, app, engine


client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_database():
    from app.main import _cache, limiter

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    limiter.hits.clear()
    _cache.clear()
    yield


def register(email: str, username: str) -> str:
    response = client.post(
        "/auth/register",
        json={
            "email": email,
            "username": username,
            "password": "StrongPass123!",
            "accept_terms": True,
        },
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def test_accounts_have_isolated_wallets():
    first = register("first@example.com", "first-user")
    second = register("second@example.com", "second-user")

    first_wallet = client.get("/wallet", headers={"Authorization": f"Bearer {first}"})
    second_wallet = client.get("/wallet", headers={"Authorization": f"Bearer {second}"})

    assert first_wallet.status_code == second_wallet.status_code == 200
    assert first_wallet.json()["balance"] == second_wallet.json()["balance"] == 24500

    spend = client.post(
        "/wallet/exchange",
        headers={"Authorization": f"Bearer {first}"},
        json={"from_asset": "RUB", "to_asset": "USD", "amount": "500"},
    )
    assert spend.status_code == 200

    first_after = client.get("/wallet", headers={"Authorization": f"Bearer {first}"})
    second_after = client.get("/wallet", headers={"Authorization": f"Bearer {second}"})
    assert first_after.json()["balance"] == 24000
    assert second_after.json()["balance"] == 24500


def test_exchange_is_server_side_and_validates_balance():
    token = register("exchange@example.com", "exchange-user")
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/wallet/exchange",
        headers=headers,
        json={"from_asset": "RUB", "to_asset": "USD", "amount": "1000"},
    )
    assert response.status_code == 200
    assets = response.json()["assets"]
    assert float(assets["RUB"]) == 23500
    assert float(assets["USD"]) > 10

    denied = client.post(
        "/wallet/exchange",
        headers=headers,
        json={"from_asset": "RUB", "to_asset": "USD", "amount": "999999"},
    )
    assert denied.status_code == 402


def test_exchange_uses_latest_rate_snapshot():
    token = register("snapshot@example.com", "snapshot-user")
    headers = {"Authorization": "Bearer " + token}

    from app.main import RateSnapshot, SessionLocal, now_naive
    from decimal import Decimal

    with SessionLocal() as db:
        db.add(RateSnapshot(asset="USD", rub_rate=Decimal("100"), source="test", fetched_at=now_naive()))
        db.commit()

    response = client.post(
        "/wallet/exchange",
        headers=headers,
        json={"from_asset": "RUB", "to_asset": "USD", "amount": "1000"},
    )
    assert response.status_code == 200
    # 1000 ₽ / 100 = 10 USD минус комиссия 1%
    assert float(response.json()["assets"]["USD"]) == 9.9
    assert response.json()["fee_pct"] == "1.0"


def test_totp_secret_is_encrypted_at_rest():
    token = register("totp@example.com", "totp-user")
    headers = {"Authorization": "Bearer " + token}

    setup = client.post("/auth/2fa/setup", headers=headers)
    assert setup.status_code == 200, setup.text
    secret = setup.json()["secret"]
    assert not secret.startswith("enc:")

    from app.main import User

    with SessionLocal() as db:
        user = db.query(User).filter(User.email == "totp@example.com").one()
        assert user.totp_secret.startswith("enc:")

    code = pyotp.TOTP(secret).now()
    enabled = client.post("/auth/2fa/enable", headers=headers, json={"code": code})
    assert enabled.status_code == 200


def test_real_trading_is_not_publicly_available():
    token = register("trading@example.com", "trading-user")
    response = client.post(
        "/trading/orders",
        headers={"Authorization": "Bearer " + token},
        json={"symbol": "BTCUSDT", "side": "Buy", "qty": "0.001"},
    )
    assert response.status_code == 403


def test_trading_status_is_admin_only():
    token = register("status@example.com", "status-user")
    response = client.get(
        "/trading/status",
        headers={"Authorization": "Bearer " + token},
    )
    assert response.status_code == 403


def auth(token: str) -> dict:
    return {"Authorization": "Bearer " + token}


def set_snapshot(asset: str, rate: str) -> None:
    from app.main import RateSnapshot, now_naive
    from decimal import Decimal

    with SessionLocal() as db:
        db.add(RateSnapshot(asset=asset, rub_rate=Decimal(rate), source="test", fetched_at=now_naive()))
        db.commit()


def set_stock_prices(sber: float, imoex: float) -> None:
    import time
    from app import main

    main._cache["stocks"] = (time.time(), {"SBER": {"price": sber, "pct": 1.0}, "IMOEX": {"price": imoex, "pct": 0.5},
                                          "TMOS": {"price": 6.0, "pct": 0.1}, "SBGB": {"price": 15.0, "pct": 0.0}})


def test_exchange_rejects_sub_kopeck_amounts_and_tiny_trades():
    headers = auth(register("tiny@example.com", "tiny-user"))
    sub_kopeck = client.post("/wallet/exchange", headers=headers, json={"from_asset": "RUB", "to_asset": "USD", "amount": "0.009"})
    assert sub_kopeck.status_code == 400
    too_small = client.post("/wallet/exchange", headers=headers, json={"from_asset": "RUB", "to_asset": "USD", "amount": "5"})
    assert too_small.status_code == 400
    assert client.get("/wallet", headers=headers).json()["balance"] == 24500


def test_exchange_between_currencies_cannot_overdraw():
    headers = auth(register("fx@example.com", "fx-user"))
    set_snapshot("USD", "100")
    set_snapshot("EUR", "110")
    bought = client.post("/wallet/exchange", headers=headers, json={"from_asset": "RUB", "to_asset": "USD", "amount": "1000"})
    assert bought.status_code == 200
    usd = bought.json()["assets"]["USD"]
    over = client.post("/wallet/exchange", headers=headers, json={"from_asset": "USD", "to_asset": "EUR", "amount": "100"})
    assert over.status_code == 402
    ok = client.post("/wallet/exchange", headers=headers, json={"from_asset": "USD", "to_asset": "EUR", "amount": "5"})
    assert ok.status_code == 200
    assert float(ok.json()["assets"]["USD"]) == float(usd) - 5
    # история не показывает фиктивное списание рублей за обмен USD → EUR
    history = client.get("/wallet", headers=headers).json()["history"]
    assert history[0]["type"] == "fx"


def test_invest_buy_uses_server_price_and_tracks_profit():
    headers = auth(register("investor@example.com", "investor"))
    set_stock_prices(sber=300, imoex=3000)
    buy = client.post("/invest/buy", headers=headers, json={"asset": "SBER", "amount": "3000"})
    assert buy.status_code == 200, buy.text
    assert buy.json()["bought"]["quantity"] == "10.00000000"
    assert client.get("/wallet", headers=headers).json()["balance"] == 21500

    set_stock_prices(sber=330, imoex=3000)
    portfolio = client.get("/invest/portfolio", headers=headers).json()
    position = portfolio["positions"][0]
    assert position["asset"] == "SBER"
    assert float(position["value"]) == 3300
    assert float(position["pnl"]) == 300
    assert float(portfolio["pnl_pct"]) == 10

    sell = client.post("/invest/sell", headers=headers, json={"asset": "SBER", "quantity": "5"})
    assert sell.status_code == 200, sell.text
    assert float(sell.json()["sold"]["pnl"]) == 150
    assert client.get("/wallet", headers=headers).json()["balance"] == 21500 + 1650
    remaining = sell.json()["positions"][0]
    assert float(remaining["cost"]) == 1500


def test_invest_rejects_overselling_and_small_orders():
    headers = auth(register("seller@example.com", "seller"))
    set_stock_prices(sber=300, imoex=3000)
    assert client.post("/invest/buy", headers=headers, json={"asset": "SBER", "amount": "50"}).status_code == 400
    assert client.post("/invest/sell", headers=headers, json={"asset": "SBER"}).status_code == 404
    client.post("/invest/buy", headers=headers, json={"asset": "SBER", "amount": "600"})
    assert client.post("/invest/sell", headers=headers, json={"asset": "SBER", "quantity": "3"}).status_code == 400
    sell_all = client.post("/invest/sell", headers=headers, json={"asset": "SBER"})
    assert sell_all.status_code == 200
    assert sell_all.json()["positions"] == []


def test_plus_lowers_exchange_fee():
    from app.main import User, now_naive
    from datetime import timedelta

    headers = auth(register("plus@example.com", "plus-user"))
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == "plus@example.com").one()
        user.plus_plan, user.plus_until = "month", now_naive() + timedelta(days=30)
        db.commit()
    assert client.get("/wallet/exchange/quote", headers=headers).json()["fee_pct"] == "0.6"


def test_cancel_subscription_keeps_paid_access():
    from app.main import User, now_naive
    from datetime import timedelta

    headers = auth(register("keep@example.com", "keep-user"))
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == "keep@example.com").one()
        user.plus_plan, user.plus_until = "year", now_naive() + timedelta(days=200)
        db.commit()
    response = client.delete("/subscription", headers=headers)
    assert response.status_code == 200
    assert response.json()["plus"]["active"] is True
    assert client.get("/auth/me", headers=headers).json()["plus"]["active"] is True


def test_spend_endpoint_is_removed():
    headers = auth(register("nospend@example.com", "nospend"))
    response = client.post("/wallet/spend", headers=headers, json={"amount": 10, "title": "x"})
    assert response.status_code in (404, 405)


def test_password_reset_flow_and_single_use():
    register("reset@example.com", "reset-user")
    forgot = client.post("/auth/password/forgot", json={"email": "reset@example.com"})
    assert forgot.status_code == 200
    token = forgot.json()["dev_reset_url"].split("reset=")[1]
    unknown = client.post("/auth/password/forgot", json={"email": "nobody@example.com"})
    assert unknown.json()["message"] == forgot.json()["message"] and "dev_reset_url" not in unknown.json()

    reset = client.post("/auth/password/reset", json={"token": token, "password": "BrandNewPass1"})
    assert reset.status_code == 200 and reset.json()["access_token"]
    assert client.post("/auth/login", json={"email": "reset@example.com", "password": "BrandNewPass1"}).status_code == 200
    assert client.post("/auth/login", json={"email": "reset@example.com", "password": "StrongPass123!"}).status_code == 401
    again = client.post("/auth/password/reset", json={"token": token, "password": "AnotherPass1"})
    assert again.status_code == 400


def test_trial_is_one_time():
    headers = auth(register("trial@example.com", "trial-user"))
    first = client.post("/subscription/trial", headers=headers)
    assert first.status_code == 200 and first.json()["plus"]["active"] is True
    assert client.get("/wallet/exchange/quote", headers=headers).json()["fee_pct"] == "0.6"
    assert client.post("/subscription/trial", headers=headers).status_code == 409


def test_goals_move_money_and_return_it_on_close():
    headers = auth(register("goal@example.com", "goal-user"))
    created = client.post("/goals", headers=headers, json={"title": "Ноутбук", "target": "10000"})
    assert created.status_code == 201
    goal_id = created.json()["goals"][0]["id"]
    deposit = client.post(f"/goals/{goal_id}/deposit", headers=headers, json={"amount": "4000"})
    assert deposit.json()["balance"] == 20500
    assert deposit.json()["goals"][0]["progress"] == 40
    assert client.post(f"/goals/{goal_id}/withdraw", headers=headers, json={"amount": "5000"}).status_code == 400
    assert client.post(f"/goals/{goal_id}/deposit", headers=headers, json={"amount": "999999"}).status_code == 402
    closed = client.delete(f"/goals/{goal_id}", headers=headers)
    assert closed.json()["balance"] == 24500 and closed.json()["goals"] == []


def test_alert_limits_and_server_trigger(monkeypatch):
    import asyncio
    from decimal import Decimal
    from app import main

    headers = auth(register("alert@example.com", "alert-user"))
    for price in ("100000", "110000", "120000"):
        assert client.post("/alerts", headers=headers, json={"symbol": "BTCUSDT", "direction": "above", "price": price}).status_code == 201
    over = client.post("/alerts", headers=headers, json={"symbol": "BTCUSDT", "direction": "above", "price": "130000"})
    assert over.status_code == 409

    async def fake_prices(symbols):
        return {"BTCUSDT": Decimal("105000")}

    monkeypatch.setattr(main, "fetch_bybit_prices", fake_prices)
    assert asyncio.run(main.check_price_alerts_once()) == 1
    state = client.get("/alerts", headers=headers).json()
    assert len(state["active"]) == 2 and state["fired"][0]["price"] == "100000.00000000"
    assert state["fired"][0]["notified_via"] == "site"


def test_history_and_weekly_leaderboard():
    first = auth(register("lb1@example.com", "lb-one"))
    second = auth(register("lb2@example.com", "lb-two"))
    set_stock_prices(sber=300, imoex=3000)
    client.post("/invest/buy", headers=first, json={"asset": "SBER", "amount": "3000"})
    client.post("/invest/buy", headers=second, json={"asset": "IMOEX", "amount": "3000"})
    client.post("/invest/buy", headers=second, json={"asset": "SBER", "amount": "500"})  # маленький, но в сумме > 1000
    set_stock_prices(sber=330, imoex=2700)
    board = client.get("/invest/leaderboard", headers=first).json()
    assert board["participants"] == 2
    assert board["top"][0]["username"] == "lb-one" and board["top"][0]["return_pct"] == 10
    assert board["me"]["rank"] == 1
    history = client.get("/invest/history", headers=first).json()
    assert history["points"] and history["trades"][0]["side"] == "buy"


def test_admin_stats_are_restricted(monkeypatch):
    from app import main

    headers = auth(register("admin@example.com", "admin-user"))
    assert client.get("/admin/stats", headers=headers).status_code == 403
    me = client.get("/auth/me", headers=headers).json()
    monkeypatch.setattr(main, "ADMIN_USER_IDS", {me["id"]})
    stats = client.get("/admin/stats", headers=headers)
    assert stats.status_code == 200 and stats.json()["users"]["total"] == 1
