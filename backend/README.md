# Wind Finance API

FastAPI backend for authentication, server-side asset balances, exchange operations, and verified payments.

## Run

```bash
cd backend
python3 -m pip install -r requirements.txt
export WINDFINANCE_ENV=dev WINDFINANCE_SIMULATOR=1 WINDFINANCE_LIVE_TRADING=0
python3 -m alembic upgrade head
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 5500
```

Open the site at `http://localhost:5500/` and the API docs at
`http://localhost:5500/docs`. The app and Alembic use the same local database,
`backend/windfinance-local.db`. Set `DATABASE_URL` to use a different database.

## Free Render demo

The repository includes [`render.yaml`](../render.yaml) for a public FastAPI
backend and PostgreSQL database. The frontend is published separately on
GitHub Pages. In Render, create a Blueprint from the repository and review the
generated service URL before deploying. The blueprint deliberately keeps Bybit
and YooKassa disabled; add
their credentials only as encrypted Render environment variables after the demo
is working.

The demo uses `WINDFINANCE_SIMULATOR=1` so new accounts receive sample funds.
Do not use this configuration for real payments, custody, or trading.

After Render deploys the API, create a GitHub repository variable named
`BACKEND_URL` with the exact HTTPS API URL, for example
`https://windfinance-api.onrender.com`. The Pages workflow will write that URL
to `config.js`, allowing registration and server-backed features to work on
`https://looqi1.github.io/Wind-finance/`.

For production, use PostgreSQL and an explicit origin allowlist:

```bash
DATABASE_URL='postgresql+psycopg://user:password@db/windfinance' \
WINDFINANCE_ENV=prod \
WINDFINANCE_ALLOWED_ORIGINS='https://app.example.com' \
WINDFINANCE_SECRET_KEY="$(openssl rand -hex 32)" \
uvicorn app.main:app --host 0.0.0.0 --port 5500
```

Apply schema changes before starting the application:

```bash
DATABASE_URL='postgresql+psycopg://user:password@db/windfinance' alembic upgrade head
```

## Connecting the site to the server

1. Deploy the backend (Render Blueprint from `render.yaml`) and copy its HTTPS URL.
2. In GitHub: Settings → Secrets and variables → Actions → Variables → `BACKEND_URL` = that URL.
3. Re-run the "Deploy frontend to GitHub Pages" workflow. Without `BACKEND_URL` the site shows
   a notice and only the demo mode works.
4. "Keep backend awake" pings `/health` every 10 minutes so the free Render instance does not sleep.

Password reset emails need `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`.
Telegram alerts need `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, and a webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d url="https://your-backend.example/telegram/webhook" \
  -d secret_token="$TELEGRAM_WEBHOOK_SECRET"
```

### Telegram Stars checkout

1. Run `alembic upgrade head` and set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` on the backend.
2. Register the same `/telegram/webhook` URL with Telegram. Include `message` and `pre_checkout_query` in the `allowed_updates` list. Keep any update types your bot already uses.
3. Set `WINDFINANCE_STARS_PRICES` to a JSON object with the prices you choose in Stars. Supported keys are `topup_1000`, `topup_5000`, `topup_10000`, `month`, and `year`. Omitted offers stay unavailable. The top-up offers credit the named amount in virtual rubles and are available only in simulator mode with live trading disabled. Plus is a one-time purchase for 30 or 365 days.

The webhook answers `pre_checkout_query` and fulfills paid invoices on `successful_payment`. For support, users can send `/paysupport` to the bot. Operators can match receipts to `payments.stars_charge_id` and handle refunds through the [Telegram Bot API](https://core.telegram.org/bots/api#refundstarpayment), with a corresponding account adjustment.

## Payments

Real top-ups use YooKassa. The server credits the balance only after receiving
the provider webhook and fetching the payment again for verification. Card
details never enter this application.

Set `PUBLIC_BASE_URL`, `YOOKASSA_SHOP_ID`, and `YOOKASSA_SECRET_KEY`, then
configure the YooKassa webhook URL:

```text
https://your-backend.example/payments/yookassa/webhook
```

## Endpoints

- `POST /auth/register` — create an account and receive a JWT
- `POST /auth/login` — sign in and receive a JWT
- `GET /auth/me` — get the authenticated user
- `GET /wallet` — get the server-side balance and history
- `GET /wallet/assets` — get the authenticated user's asset balances
- `POST /wallet/exchange` — atomically exchange supported fiat assets (fee 1%, 0.6% with Plus)
- `GET /wallet/exchange/quote` — current exchange fee for the user
- `POST /auth/password/forgot`, `POST /auth/password/reset` — password recovery by email link (30 min)
- `GET /invest/portfolio`, `POST /invest/buy`, `POST /invest/sell` — investment simulator with MOEX prices
- `GET /invest/history` — daily portfolio value and recent trades
- `GET /invest/leaderboard` — weekly portfolio competition (server-computed return)
- `GET|POST /goals`, `POST /goals/{id}/deposit|withdraw`, `DELETE /goals/{id}` — savings goals
- `GET|POST /alerts`, `DELETE /alerts/{id}` — price alerts checked by the server, sent to Telegram or email
- `POST /telegram/link`, `POST /telegram/webhook` — link a Telegram chat for alerts
- `GET /market/rates/history?asset=USD` — dated Bank of Russia rates over the last 30 calendar days for USD, EUR, or CNY, in RUB per unit
- `POST /subscription/trial` — one-time 7-day Wind Plus trial
- `GET /admin/stats` — admin dashboard (`WINDFINANCE_ADMIN_USER_IDS`)
- `POST /payments/create` — create a card or SBP payment
- `GET /payments/{payment_id}` — check payment status
- `POST /payments/yookassa/webhook` — verified YooKassa notification
- `POST /subscription/payment` — create a YooKassa payment for Wind Plus
- `GET /health` — service health check
- `POST /trading/orders` — restricted Bybit Spot market order for configured administrators
- `GET /trading/orders` — restricted local order journal
- `GET /trading/status` — provider, testnet, limits, and enabled state
- `GET /trading/orders/{id}` — refresh one order status from Bybit
- `DELETE /trading/orders/{id}` — request cancellation of an open order
- `POST /trading/reconcile` — read-only provider balance reconciliation

Set `WINDFINANCE_SECRET_KEY` before deploying outside local development.
Never use the development SQLite database, demo account, simulator balance,
or wildcard CORS settings in production. Add database migrations before
changing existing production schemas, and back up PostgreSQL before every
deployment.
TOTP secrets are encrypted at rest using a key derived from
`WINDFINANCE_SECRET_KEY`; rotating that secret requires a planned token and
2FA-secret migration.

## Launch checklist

- Configure HTTPS at the reverse proxy and set `WINDFINANCE_ENV=prod`.
- Set a unique secret of at least 32 random bytes.
- Set `WINDFINANCE_ALLOWED_ORIGINS` to the exact frontend origin.
- Run `alembic upgrade head` against a backup of the production database.
- Configure YooKassa webhook delivery and verify a real payment in staging.
- Replace the in-process rate limiter with Redis before running multiple workers.
- Add PostgreSQL backups, restore drills, error monitoring, and alerting.
- Publish terms, privacy policy, refund rules, and financial risk disclosures
  reviewed for the target jurisdiction.
- Do not enable public user crypto trading or investment execution until
  settlement, reconciliation, custody, and operational controls are implemented.
- Bybit trading is disabled unless `WINDFINANCE_LIVE_TRADING=1`, credentials,
  administrator IDs, and a small notional limit are configured. Start with
  Bybit testnet and API keys without withdrawal permission.

  ### Bybit testnet smoke test

  Create a Bybit testnet API key with trading permission only, set its values in
  the backend environment, and add the numeric Wind Finance user ID to
  `BYBIT_ADMIN_USER_IDS`. Never put these values in source control or chat.
  Keep `BYBIT_API_BASE_URL=https://api-testnet.bybit.com` and
  `WINDFINANCE_LIVE_TRADING=1` for the first test.

  After applying migrations and starting the backend:

  ```bash
  TOKEN='Bearer <admin-jwt>'
  curl -H "Authorization: $TOKEN" http://localhost:5500/trading/status
  curl -H "Authorization: $TOKEN" -X POST http://localhost:5500/trading/orders \
    -H 'Content-Type: application/json' \
    -d '{"symbol":"BTCUSDT","side":"Buy","qty":"0.001"}'
  curl -H "Authorization: $TOKEN" http://localhost:5500/trading/orders
  curl -H "Authorization: $TOKEN" -X POST http://localhost:5500/trading/reconcile
  ```

  Use the returned local order ID with `GET /trading/orders/{id}`. Market orders
  can fill immediately, so cancellation is only useful for orders that remain
  open. Do not switch to the mainnet URL or increase the limit until testnet
  reconciliation and operational review pass.
