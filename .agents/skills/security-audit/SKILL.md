---
name: security-audit
description: Perform a defensive security review of Wind Finance source code, configuration, and existing test coverage. Use for authentication, account data, payments, broker integrations, and deployment hardening.
---

# Wind Finance defensive security review

- Scope the review to the requested code and configuration. Start with `backend/app/`, `backend/tests/test_finance.py`, and the corresponding calls in `sitefinance/script.js` or `sitefinance/assets/bybit-spot.js`. Inspect `.github/workflows/deploy-pages.yml`, `Dockerfile`, or `render.yaml` when deployment is relevant. Treat the browser and published `config.js` as public and untrusted.
- Trace authorized actions from request to server-side validation and persistence. For sign-in review token lifetime and handling, account scoping, Telegram launch-data verification, password reset reuse protections, and CORS. For balances and payments review server-owned amounts, authenticated provider confirmation, idempotency, and atomic updates. For broker flows check simulator and live-trading gates, account binding, and server-side credential handling. Choose the checks that match scope.
- Review secret boundaries and dependency manifests without printing secret values or personal data. Distinguish source findings from runtime configuration that could not be verified. Use existing tests or normal-input assertions with mocked providers and disposable test data for defensive verification. Do not create exploit payloads, reproduce vulnerabilities, run intrusion scans, or exercise payments or trades on live services.
- Report findings with severity, file and line, affected trust boundary, evidence, and a concrete mitigation. Mark assumptions and unverified conditions. For requested remediation, preserve intended routes and simulator behavior, run `python3 -m pytest -q backend/tests` from the root, and run `python3 -m pytest -q frontend/tests` if client behavior changed.
