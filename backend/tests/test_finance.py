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
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
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
        "/wallet/spend",
        headers={"Authorization": f"Bearer {first}"},
        json={"amount": 500, "title": "test spend"},
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
    assert float(response.json()["assets"]["USD"]) == 10


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
