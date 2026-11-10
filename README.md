# Wind Finance

## GitHub Pages

The frontend is published from `sitefinance/` by
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).
Create a repository variable named `BACKEND_URL` with the public HTTPS URL of
the FastAPI service before using authentication, balances, payments, or other
server-backed features.

GitHub Pages hosts only the frontend. The backend must be deployed separately,
and its exact frontend origin must be included in `WINDFINANCE_ALLOWED_ORIGINS`.