from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import pytest
from playwright.sync_api import expect, sync_playwright


SITE = Path(__file__).resolve().parents[2] / "sitefinance"
ORIGIN = "https://wind.example.test"
USER = {"id": 42, "username": "Тестовый пользователь", "balance": 24500}
RATES = {
    "date": "2026-11-20",
    "rates": {"USD": {"value": 91.5, "prev": 90}, "EUR": {"value": 99, "prev": 100}},
}
HISTORY = {
    "USD": [89.70, 90.25, 91.50],
    "EUR": [101.50, 100, 99],
}
DATES = ["2026-10-26", "2026-11-15", "2026-11-20"]

TELEGRAM_SDK = """
const handlers = {};
const state = window.testTelegram = {};
const telegram = {
    initData: 'test-init-data',
    colorScheme: 'dark',
    ready: () => { state.ready = true; },
    expand: () => { state.expanded = true; },
    onEvent: (event, callback) => { handlers[event] = callback; },
    isVersionAtLeast: () => true,
    setBackgroundColor: color => { state.background = color; },
    openInvoice: (url, callback) => { state.invoice = url; callback(state.invoiceResult || 'paid'); },
    BackButton: {
        show: () => { state.backVisible = true; },
        hide: () => { state.backVisible = false; },
        onClick: callback => { state.back = callback; },
    },
};
state.setTheme = color => { telegram.colorScheme = color; handlers.themeChanged(); };
window.Telegram = { WebApp: telegram };
document.documentElement.style.setProperty('--tg-safe-area-inset-top', '24px');
document.documentElement.style.setProperty('--tg-content-safe-area-inset-top', '16px');
document.documentElement.style.setProperty('--tg-safe-area-inset-bottom', '22px');
"""


@pytest.fixture(scope="module")
def browser():
    with sync_playwright() as p:
        chromium = p.chromium.launch()
        yield chromium
        chromium.close()


@pytest.fixture
def open_app(browser):
    contexts = []

    def open_page(width=390, telegram=False, api=None, welcome=False, backend=True):
        origin = ORIGIN if backend else "https://wind.example.github.io"
        context = browser.new_context(
            viewport={"width": width, "height": 812},
            is_mobile=width <= 620,
            has_touch=width <= 620,
            reduced_motion="reduce",
        )
        contexts.append(context)
        page = context.new_page()
        requests = []
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.add_init_script("""
            localStorage.setItem('wind_sim_ok', '1');
            localStorage.setItem('wind_tour_done_42', '1');
        """)
        if not welcome:
            page.add_init_script("sessionStorage.setItem('wind_welcome_after_login_seen', '1');")

        def serve(route):
            request = route.request
            url = urlsplit(request.url)
            path = url.path
            if request.url.startswith("https://telegram.org/js/telegram-web-app.js"):
                if telegram:
                    route.fulfill(body=TELEGRAM_SDK, content_type="application/javascript")
                else:
                    route.abort()
                return
            if url.netloc != urlsplit(origin).netloc:
                requests.append((request.method, path, None, None))
                route.abort()
                return
            if path == "/Wind-finance/config.js":
                route.fulfill(body=f"window.WIND_API_URL = '{origin if backend else ''}';",
                              content_type="application/javascript")
                return
            files = {
                "/Wind-finance/": "index.html",
                "/Wind-finance/style.css": "style.css",
                "/Wind-finance/script.js": "script.js",
                "/Wind-finance/assets/crypto-compass.svg": "assets/crypto-compass.svg",
                "/Wind-finance/assets/wind-airstream.webp": "assets/wind-airstream.webp",
                "/Wind-finance/assets/market-preview.json": "assets/market-preview.json",
            }
            if path in files:
                route.fulfill(path=SITE / files[path])
                return

            requests.append((request.method, path, request.post_data_json, request.headers.get("authorization")))
            if api and api(route, path):
                return
            if path in ("/auth/login", "/auth/telegram"):
                route.fulfill(json={"access_token": "test-session", "user": USER})
            elif path == "/auth/me":
                route.fulfill(json=USER)
            elif path in ("/health", "/market/stocks"):
                route.fulfill(json={})
            elif path == "/market/rates":
                route.fulfill(json=RATES)
            elif path == "/market/rates/history":
                asset = parse_qs(url.query)["asset"][0]
                points = [{"date": date, "value": value} for date, value in zip(DATES, HISTORY[asset])]
                route.fulfill(json={"asset": asset, "end": DATES[-1], "points": points})
            elif path == "/wallet/assets":
                route.fulfill(json={"assets": {"RUB": 24500}})
            elif path == "/payments/stars/catalog":
                route.fulfill(json={"prices": {}})
            elif path == "/goals":
                route.fulfill(json={"goals": []})
            else:
                route.fulfill(status=503, json={"detail": "Test backend has no data for this endpoint"})

        page.route("**/*", serve)
        page.goto(f"{origin}/Wind-finance/", wait_until="domcontentloaded")
        return page, requests, errors

    yield open_page
    for context in contexts:
        context.close()


def test_sign_in_then_select_history_and_open_converter(open_app):
    page, requests, errors = open_app(width=1280)
    page.locator("#auth-email").fill("test@example.com")
    page.locator("#auth-password").fill("TestPassword123")
    page.locator(".auth-submit").click()
    expect(page.locator("#auth-gate")).to_be_hidden()
    assert any(method == "POST" and path == "/auth/login" for method, path, _, _ in requests)

    line = page.locator("#rate-history-line")
    expect(line).to_have_attribute("points", "3.00,84.00 317.00,8.00")
    expect(page.locator("#rate-history-area")).to_have_attribute("points", "3,92 3.00,84.00 317.00,8.00 317.00,92")
    expect(page.locator("#rate-history-end")).to_have_attribute("cy", "8.00")
    assert line.evaluate("line => line.getAnimations().length") == 0
    expect(page.locator("#rate-history-summary")).to_contain_text("15.11")
    page.get_by_role("button", name="30 дней").click()
    expect(page.locator("#rate-history-summary")).to_contain_text("26.10")
    assert len(line.get_attribute("points").split()) == 3

    page.get_by_role("button", name="EUR / RUB").press("Space")
    expect(page.locator(".focus-value")).to_have_text("99,00 ₽")
    expect(page.locator("#rate-history-summary")).to_contain_text("101,50 ₽")
    page.get_by_role("link", name="Рассчитать сумму").click()
    expect(page.locator(".converter-from")).to_have_value("EUR")
    expect(page.locator(".converter-to")).to_have_value("RUB")
    expect(page.locator(".converter-note")).to_contain_text("99,00 ₽ за 1 EUR")
    page.get_by_role("button", name="Поменять валюты").click()
    expect(page.locator(".converter-from")).to_have_value("RUB")
    expect(page.locator(".converter-to")).to_have_value("EUR")
    assert not errors


def test_demo_portfolio_chart_shows_sample_history_and_switches_period(open_app):
    page, requests, errors = open_app(width=320, backend=False)
    page.get_by_role("button", name="Попробовать демо").click()
    page.locator('.nav a[href="#investments"]').click()
    page.get_by_role("button", name="Открыть портфель").click()
    expect(page.locator("#portfolio-chart-sub")).to_contain_text("Учебный пример")
    chart = page.locator("#portfolio-chart")
    path = chart.locator(".pf-value")
    expect(chart.get_by_role("img")).to_be_visible()
    before = path.get_attribute("d")
    page.locator('#portfolio-chart-range [data-days="30"]').click()
    expect(path).not_to_have_attribute("d", before)
    expect(page.locator('#portfolio-chart-range [data-days="30"]')).to_have_attribute("aria-pressed", "true")
    assert path.evaluate("element => element.getAnimations().length") == 0
    assert not any(request[1] == "/invest/history" for request in requests)
    assert not errors


def test_demo_goal_moves_only_virtual_money_and_survives_reload(open_app):
    page, requests, errors = open_app(width=320)
    page.get_by_role("button", name="Попробовать демо").click()
    expect(page.locator("#wallet-demo")).to_be_visible()
    wallet = page.locator(".wallet-balance strong")
    expect(wallet).to_have_text("24 500,00 ₽")
    page.get_by_role("button", name="Создать пробную копилку").click()
    expect(page.locator("#goal-title")).to_be_focused()
    page.locator("#goal-title").fill("Велосипед")
    page.locator("#goal-target").fill("8000")
    page.get_by_role("button", name="Создать", exact=True).click()

    goal = page.locator(".goal-card")
    expect(goal).to_contain_text("Велосипед")
    goal.get_by_role("button", name="Отложить").click()
    goal.get_by_role("spinbutton").fill("30000")
    goal.get_by_role("button", name="Подтвердить").click()
    expect(page.locator(".success-message")).to_have_text("Недостаточно учебных средств")
    expect(wallet).to_have_text("24 500,00 ₽")
    goal.get_by_role("spinbutton").fill("4000")
    goal.get_by_role("button", name="Подтвердить").click()
    expect(wallet).to_have_text("20 500,00 ₽")

    page.reload(wait_until="domcontentloaded")
    expect(wallet).to_have_text("20 500,00 ₽")
    expect(goal).to_contain_text("4 000 ₽")
    goal.get_by_role("button", name="Снять").click()
    goal.get_by_role("spinbutton").fill("1000")
    goal.get_by_role("button", name="Подтвердить").click()
    expect(wallet).to_have_text("21 500,00 ₽")
    close = goal.get_by_role("button", name="Закрыть копилку и вернуть деньги на баланс")
    close.click()
    close.click()
    expect(wallet).to_have_text("24 500,00 ₽")
    expect(goal).to_have_count(0)
    assert all(not path.startswith("/goals") and auth is None for _, path, _, auth in requests)
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    assert not errors


def test_telegram_sign_in_insets_theme_and_back_button(open_app):
    page, requests, errors = open_app(telegram=True)
    expect(page.locator("#auth-gate")).to_be_hidden()
    expect(page.locator("html")).to_have_class("telegram-app")
    assert ("POST", "/auth/telegram", {"init_data": "test-init-data"}, None) in requests
    assert page.evaluate("testTelegram.ready && testTelegram.expanded")
    assert page.locator("main").evaluate("node => getComputedStyle(node).paddingTop") == "56px"
    assert page.locator(".sidebar").evaluate("node => getComputedStyle(node).paddingBottom") == "22px"
    expect(page.locator("body")).to_have_class("dark-theme")
    page.evaluate("testTelegram.setTheme('light')")
    expect(page.locator("body")).not_to_have_class("dark-theme")
    expect(page.locator('[data-modal="topup-modal"]').first).to_be_visible()
    page.get_by_role("button", name="Wind Plus", exact=True).click()
    expect(page.locator("#subscription-modal")).to_be_visible()
    expect(page.locator("#plus-subscribe")).to_be_disabled()
    page.wait_for_function("testTelegram.backVisible")
    page.evaluate("testTelegram.back()")
    expect(page.locator("#subscription-modal")).to_be_hidden()

    page.locator('.nav a[href="#converter"]').click()
    expect(page.locator("#converter")).to_be_visible()
    page.locator('[data-currency-field="from"]').click()
    expect(page.locator("#currency-modal")).to_be_visible()
    page.wait_for_function("testTelegram.backVisible")
    page.evaluate("testTelegram.back()")
    expect(page.locator("#currency-modal")).to_be_hidden()
    expect(page.locator("#converter")).to_be_visible()
    page.evaluate("testTelegram.back()")
    expect(page.locator('.nav a[href="#dashboard"]')).to_have_attribute("aria-current", "page")
    page.wait_for_function("!testTelegram.backVisible")
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    assert not errors


def test_history_failure_offers_retry_in_demo(open_app):
    fail_once = True

    def api(route, path):
        nonlocal fail_once
        if path != "/market/rates/history" or not fail_once:
            return False
        fail_once = False
        route.fulfill(status=502, json={"detail": "History source unavailable"})
        return True

    page, _, errors = open_app(api=api)
    page.get_by_role("button", name="Попробовать демо").click()
    expect(page.locator("#rate-history-status")).to_contain_text("Не удалось загрузить")
    expect(page.locator("#rate-history-figure")).to_be_hidden()
    page.get_by_role("button", name="Повторить загрузку").click()
    expect(page.locator("#rate-history-figure")).to_be_visible()
    expect(page.locator("#rate-history-status")).to_be_hidden()
    assert not errors


def test_telegram_unavailable_then_retry(open_app):
    attempts = 0

    def api(route, path):
        nonlocal attempts
        if path != "/auth/telegram":
            return False
        attempts += 1
        if attempts > 1:
            return False
        route.fulfill(status=503, json={"detail": "Telegram auth temporarily unavailable"})
        return True

    page, _, errors = open_app(telegram=True, api=api)
    expect(page.locator("#auth-notice")).to_contain_text("Не удалось войти через Telegram")
    expect(page.get_by_role("button", name="Попробовать демо")).to_be_enabled()
    page.get_by_role("button", name="Войти через Telegram").click()
    expect(page.locator("#auth-gate")).to_be_hidden()
    assert attempts == 2
    assert not errors


def test_demo_plus_is_a_preview_without_checkout(open_app):
    page, requests, errors = open_app(width=320)
    page.get_by_role("button", name="Попробовать демо").click()
    page.get_by_role("button", name="Пример Wind Plus").click()
    expect(page.locator("#plus-preview")).to_be_visible()
    expect(page.locator("#plus-preview")).to_contain_text("RSI 56")
    page.locator("#plus-preview summary").get_by_text("Радар крипторынка").click()
    expect(page.get_by_text("ETH +3,2% · SOL −1,4%")).to_be_visible()
    expect(page.locator("#plus-subscribe")).to_be_hidden()
    expect(page.locator("#plus-trial")).to_be_hidden()
    assert not any(path.startswith(("/payments", "/subscription")) for _, path, _, _ in requests)
    assert not errors


def test_telegram_topup_and_plus_use_stars_and_confirmed_server_state(open_app):
    offers = []
    checks = 0

    def api(route, path):
        nonlocal checks
        if path == "/payments/stars/catalog":
            route.fulfill(json={"prices": {"topup_1000": 75, "month": 125}})
        elif path == "/payments/stars/invoice":
            offer = route.request.post_data_json["offer"]
            offers.append(offer)
            checks = 0
            route.fulfill(json={"payment_id": offer, "invoice_url": f"https://t.me/${offer}"})
        elif path.startswith("/payments/"):
            checks += 1
            route.fulfill(json={"status": "succeeded" if checks > 1 else "processing"})
        elif path == "/wallet":
            route.fulfill(json={"balance": 25500})
        elif path == "/auth/me":
            route.fulfill(json={**USER, "plus": {"active": True, "plan": "month", "until": "2099-01-01"}})
        else:
            return False
        return True

    page, _, errors = open_app(telegram=True, api=api)
    page.locator('.wallet-actions [data-modal="topup-modal"]').click()
    expect(page.locator("#topup-submit")).to_be_hidden()
    page.get_by_role("button", name="1 000 ₽ на баланс 75 Stars").click()
    expect(page.locator("#topup-modal")).to_be_hidden()
    expect(page.locator(".wallet-balance strong")).to_have_text("25 500,00 ₽")
    assert offers == ["topup_1000"] and checks == 2

    page.get_by_role("button", name="Wind Plus", exact=True).click()
    page.get_by_role("button", name="Оформить за 125 Stars").click()
    expect(page.locator("#plus-status")).to_contain_text("Активна до")
    assert offers == ["topup_1000", "month"] and checks == 2
    assert not errors


def test_browser_checkout_uses_existing_yookassa_endpoints(open_app):
    page, requests, errors = open_app()
    page.locator("#auth-email").fill("test@example.com")
    page.locator("#auth-password").fill("TestPassword123")
    page.locator(".auth-submit").click()
    page.locator('.wallet-actions [data-modal="topup-modal"]').click()
    page.locator("#topup-submit").click()
    page.locator("#pay-submit").click()
    expect(page.locator("#pay-card-error")).to_contain_text("Test backend")
    assert ("POST", "/payments/create", {"amount": 5000, "method": "card"}, "Bearer test-session") in requests
    page.locator("#pay-topup-modal [data-close-modal]").click()
    page.get_by_role("button", name="Wind Plus", exact=True).click()
    page.locator("#plus-subscribe").click()
    expect(page.locator("#plus-status")).to_contain_text("Test backend")
    assert ("POST", "/subscription/payment", {"plan": "month", "method": "card"}, "Bearer test-session") in requests
    assert not errors


def test_welcome_opens_full_screen_only_after_successful_sign_in(open_app):
    first_attempt = True

    def api(route, path):
        nonlocal first_attempt
        if path != "/auth/login" or not first_attempt:
            return False
        first_attempt = False
        route.fulfill(status=401, json={"detail": "Неверный пароль"})
        return True

    page, requests, errors = open_app(welcome=True, api=api)
    welcome = page.get_by_role("dialog", name="Привет, я Винд!")
    expect(page.get_by_role("heading", name="Войти в аккаунт")).to_be_visible()
    expect(welcome).to_be_hidden()
    assert not any(path.startswith(("/market/", "/v5/")) or "qrcode" in path or "lightweight-charts" in path
                   for _, path, _, _ in requests)
    page.locator("#auth-email").fill("test@example.com")
    page.locator("#auth-password").fill("Incorrect123")
    page.locator(".auth-submit").click()
    expect(page.locator("#auth-error")).to_have_text("Неверный пароль")
    expect(welcome).to_be_hidden()
    page.locator("#auth-password").fill("TestPassword123")
    page.locator(".auth-submit").click()
    expect(page.locator("#auth-gate")).to_be_hidden()
    expect(welcome).to_be_visible()
    expect(welcome.get_by_role("button", name="Продолжить")).to_be_focused()
    box = welcome.bounding_box()
    assert box["width"] == 390 and box["height"] == 812
    page.keyboard.press("Escape")
    expect(welcome).to_be_hidden()
    page.reload(wait_until="domcontentloaded")
    expect(page.locator("#auth-gate")).to_be_hidden()
    expect(page.locator("#rate-history-figure")).to_be_visible()
    expect(welcome).to_be_hidden()
    assert not errors


def test_welcome_reappears_after_exiting_and_entering_demo(open_app):
    page, _, errors = open_app(welcome=True)
    welcome = page.get_by_role("dialog", name="Привет, я Винд!")
    # The old version marked the greeting as seen before the visitor entered.
    page.evaluate("sessionStorage.setItem('wind_welcome_seen', '1')")
    page.get_by_role("button", name="Попробовать демо").click()
    expect(page.locator("#auth-gate")).to_be_hidden()
    expect(welcome).to_be_visible()
    welcome.get_by_role("button", name="Продолжить").click()
    expect(welcome).to_be_hidden()
    page.locator(".profile-trigger").click()
    page.locator(".logout").click()
    expect(page.locator("#auth-gate")).to_be_visible()
    expect(welcome).to_be_hidden()
    page.get_by_role("button", name="Попробовать демо").click()
    expect(welcome).to_be_visible()
    assert not errors


def test_telegram_native_back_dismisses_welcome(open_app):
    page, _, errors = open_app(telegram=True, welcome=True)
    expect(page.locator("#auth-gate")).to_be_hidden()
    expect(page.locator("#wind-welcome")).to_be_visible()
    page.wait_for_function("testTelegram.backVisible")
    page.evaluate("testTelegram.back()")
    expect(page.locator("#wind-welcome")).to_be_hidden()
    expect(page.locator("#auth-gate")).to_be_hidden()
    assert not errors


def test_market_widgets_are_loaded_when_opened(open_app):
    page, requests, errors = open_app()
    page.get_by_role("button", name="Попробовать демо").click()
    expect(page.locator("#rate-history-figure")).to_be_visible()
    assert not any("lightweight-charts" in path or path in ("/market/news", "/market/stocks")
                   for _, path, _, _ in requests)
    page.locator('.nav a[href="#crypto"]').click()
    expect(page.locator("#crypto-price-label")).to_have_text("Не удалось загрузить график")
    assert any("lightweight-charts" in path for _, path, _, _ in requests)
    page.locator('.nav a[href="#investments"]').click()
    page.wait_for_function("document.body.dataset.view === 'investments'")
    page.get_by_role("button", name="Помощник Винд").click()
    expect(page.locator("#agent-speech-text")).to_contain_text("Новости сейчас недоступны")
    assert any(path == "/market/stocks" for _, path, _, _ in requests)
    assert any(path == "/market/news" for _, path, _, _ in requests)
    assert not errors


def test_pages_demo_shows_dated_quotes_when_backend_is_unconfigured(open_app):
    page, requests, errors = open_app(backend=False)
    expect(page.locator("#auth-notice")).to_contain_text("после подключения сервера")
    page.get_by_role("button", name="Попробовать демо").click()
    expect(page.locator("#rate-history-figure")).to_be_visible()
    expect(page.locator("#market-source")).to_contain_text("ЦБ РФ ·")
    page.get_by_role("button", name="EUR / RUB").click()
    expect(page.locator("#rate-history-figure")).to_be_visible()
    page.get_by_role("button", name="30 дней").click()
    assert len(page.locator("#rate-history-line").get_attribute("points").split()) > 2
    assert not any(path.startswith("/market/") for _, path, _, _ in requests)
    assert not errors


def test_mobile_crypto_pair_controls_trade_alert_and_partner_link(open_app):
    page, _, errors = open_app(width=320, backend=False)
    page.get_by_role("button", name="Попробовать демо").click()
    page.locator('.nav a[href="#crypto"]').click()
    signup = page.locator('#bybit-partner [data-bybit-signup]')
    expect(signup).to_be_in_viewport()
    assert signup.get_attribute("href").startswith("https://www.bybit.com/invite?ref=")
    page.locator(".market-pair").filter(has_text="ETH").click()
    expect(page.locator('input[value="ETHUSDT"]')).to_be_checked()
    expect(page.locator("#crypto-symbol-label")).to_have_text("ETH / USDT")
    expect(page.locator("#alert-coins .active")).to_have_text("ETH")
    page.locator('[data-interval="240"]').click()
    expect(page.locator('[data-interval="240"]')).to_have_attribute("aria-pressed", "true")
    expect(page.locator("#crypto-retry")).to_be_visible()
    page.get_by_role("button", name="Купить на Bybit").click()
    expect(page.locator("#bybit-trade-title")).to_have_text("Купить ETH на Bybit")
    expect(page.locator("#bybit-opt-trade")).to_have_attribute("href", "https://www.bybit.com/trade/spot/ETH/USDT")
    expect(page.locator("#bybit-opt-signup")).to_have_attribute("href", signup.get_attribute("href"))
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    assert not errors


def test_agent_uses_wind_motion_while_fetching_news(open_app):
    page, _, errors = open_app(welcome=True)
    page.emulate_media(reduced_motion="no-preference")
    pending = []
    page.route("**/market/news", lambda route: pending.append(route))
    page.get_by_role("button", name="Попробовать демо").click()
    robot = page.locator(".welcome-robot")
    expect(robot).to_be_visible()
    assert "wind-arrival" in robot.evaluate("node => getComputedStyle(node).animationName")
    page.get_by_role("button", name="Продолжить").click()
    page.get_by_role("button", name="Помощник Винд").click()
    expect(page.locator("#news")).to_have_attribute("aria-busy", "true")
    body = page.locator(".agent-character-body")
    expect(body).to_have_css("animation-name", "wind-search")
    assert pending
    pending[0].fulfill(json={"items": [], "counts": {}})
    expect(page.locator("#news")).to_have_attribute("aria-busy", "false")
    expect(body).to_have_css("animation-name", "wind-drift")
    page.emulate_media(reduced_motion="reduce")
    expect(body).to_have_css("animation-name", "none")
    assert not errors


def test_mobile_game_library_and_saved_stars(open_app):
    page, _, errors = open_app(width=320, backend=False)
    page.evaluate("localStorage.setItem('wind_game_stars', JSON.stringify({drop: 2}))")
    page.reload(wait_until="domcontentloaded")
    page.get_by_role("button", name="Попробовать демо").click()
    page.locator('.nav a[href="#game"]').click()
    expect(page.locator("[data-game-tab]")).to_have_count(4)
    for game in ["drop", "candles", "risk", "scam"]:
        tab = page.locator(f'[data-game-tab="{game}"]')
        tab.click()
        expect(tab).to_have_attribute("aria-selected", "true")
        expect(page.locator(f'[data-game-panel="{game}"]')).to_be_visible()
    page.locator('[data-game-tab="scam"]').press("Home")
    expect(page.locator("#game-panel-drop")).to_be_visible()
    page.reload(wait_until="domcontentloaded")
    expect(page.locator("#gh-stars")).to_have_text("2 / 12")
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    assert not errors
