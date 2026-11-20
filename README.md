# Wind Finance

## GitHub Pages

The frontend is published from `sitefinance/` by
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).
Create a repository variable named `BACKEND_URL` with the public HTTPS URL of
the FastAPI service before using authentication, balances, payments, or other
server-backed features.

GitHub Pages hosts only the frontend. The backend must be deployed separately,
and its exact frontend origin must be included in `WINDFINANCE_ALLOWED_ORIGINS`.
Without `BACKEND_URL`, the demo uses the bundled Bank of Russia history. The
Pages build refreshes the snapshot when the public archive is available, and
the dashboard shows the publication date next to each quote.

## Telegram Mini App

1. Deploy the FastAPI backend and set `TELEGRAM_BOT_TOKEN` to the token of the bot that will open the Mini App. Store the token on the backend. Keep `WINDFINANCE_SIMULATOR=1` and `WINDFINANCE_LIVE_TRADING=0` for the learning experience.
2. Publish the frontend over HTTPS. On GitHub Pages, set `BACKEND_URL` to the backend's HTTPS origin. For the existing Pages site, allow `https://looqi1.github.io` in the backend's `WINDFINANCE_ALLOWED_ORIGINS`.
3. Open the bot in [@BotFather](https://t.me/BotFather) and set its Main Mini App URL to the full frontend URL, including the project path. For this repository the default Pages URL is `https://looqi1.github.io/Wind-finance/`. The app then opens from the bot profile or `https://t.me/<bot_username>?startapp`.
4. Open it from the bot on a phone and check automatic sign-in, the bottom navigation, and Telegram's Back button.

The Mini App verifies Telegram launch data on the server. Telegram payments use [Telegram Stars](https://core.telegram.org/bots/payments-stars). Browser payments use YooKassa. Demo visitors can open Wind Plus examples without a checkout.

To enable Stars payments, deploy the backend with its migrations, configure the payment webhook, and set the offer prices in Stars. See [Telegram checkout setup](backend/README.md#telegram-stars-checkout).

## Browser tests

```sh
python -m pip install playwright==1.65.2 pytest
python -m playwright install chromium
python -m pytest -q frontend/tests
```

GitHub Actions runs the backend and browser tests on pull requests and before publishing Pages. Browser tests serve the repository's frontend and use test responses for the API and the Telegram SDK.
