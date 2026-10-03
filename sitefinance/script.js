const profileMenu = document.querySelector('.profile-menu');
const profileTrigger = document.querySelector('.profile-trigger');
const profileDropdown = document.querySelector('.profile-dropdown');

if (profileMenu && profileTrigger && profileDropdown) {
	const setProfileOpen = (isOpen) => {
		profileTrigger.setAttribute('aria-expanded', String(isOpen));
		profileDropdown.hidden = !isOpen;
	};

	profileTrigger.addEventListener('click', (event) => {
		event.stopPropagation();
		const isOpen = profileTrigger.getAttribute('aria-expanded') === 'true';
		setProfileOpen(!isOpen);
	});

	document.addEventListener('click', (event) => {
		if (!profileMenu.contains(event.target)) {
			setProfileOpen(false);
		}
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			setProfileOpen(false);
			profileTrigger.focus();
		}
	});
}

const modalTriggers = document.querySelectorAll('[data-modal]');
const modals = document.querySelectorAll('.modal');
const windBurst = document.querySelector('.wind-burst');
const successToast = document.querySelector('.success-toast');
const successMessage = document.querySelector('.success-message');

const closeModal = (modal) => {
	if (modal) {
		modal.hidden = true;
	}
};

modalTriggers.forEach((trigger) => {
	trigger.addEventListener('click', () => {
		const modal = document.getElementById(trigger.dataset.modal);
		if (modal) {
			modal.hidden = false;
		}
	});
});

document.querySelectorAll('[data-close-modal]').forEach((button) => {
	button.addEventListener('click', () => closeModal(button.closest('.modal')));
});

modals.forEach((modal) => {
	modal.addEventListener('click', (event) => {
		if (event.target === modal) {
			closeModal(modal);
		}
	});
});

document.querySelectorAll('.amount-option').forEach((option) => {
	option.addEventListener('click', () => {
		document.querySelectorAll('.amount-option').forEach((item) => item.classList.remove('active'));
		option.classList.add('active');
		const submit = option.closest('.modal').querySelector('.modal-submit');
		submit.dataset.success = `Баланс пополнен на ${option.textContent}`;
	});
});

const showSuccess = (message) => {
	windBurst.classList.remove('active');
	successMessage.textContent = message;
	void windBurst.offsetWidth;
	windBurst.classList.add('active');
	window.setTimeout(() => windBurst.classList.remove('active'), 950);
	successToast.classList.remove('visible');
	void successToast.offsetWidth;
	successToast.classList.add('visible');
};

document.querySelectorAll('[data-success]').forEach((button) => {
	button.addEventListener('click', () => {
		closeModal(button.closest('.modal'));
		showSuccess(button.dataset.success);
	});
});

document.querySelectorAll('[data-trade]').forEach((button) => {
	button.addEventListener('click', () => {
		const action = button.dataset.trade === 'buy' ? 'Покупка BTC/USDT подготовлена' : 'Продажа BTC/USDT подготовлена';
		showSuccess(action);
	});
});

document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') {
		modals.forEach(closeModal);
	}
});

const cryptoChartElement = document.querySelector('#crypto-chart');
const cryptoPair = document.querySelector('#crypto-pair');
const cryptoPriceLabel = document.querySelector('#crypto-price-label');
const cryptoSymbolLabel = document.querySelector('#crypto-symbol-label');
const cryptoUpdated = document.querySelector('#crypto-updated');
const timeframeButtons = document.querySelectorAll('[data-interval]');
let activeInterval = '60';
let cryptoChart;
let candleSeries;
let bybitSocket;
let streamVersion = 0;

const appNavigation = document.querySelectorAll('.nav a');
const appViews = new Set(['dashboard', 'investments', 'crypto', 'converter']);

const setAppView = (view) => {
	const nextView = appViews.has(view) ? view : 'dashboard';
	document.body.dataset.view = nextView;
	appNavigation.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${nextView}`));
};

appNavigation.forEach((link) => {
	link.addEventListener('click', () => setAppView(link.getAttribute('href').slice(1)));
});

window.addEventListener('hashchange', () => setAppView(window.location.hash.slice(1)));
setAppView(window.location.hash.slice(1) || 'dashboard');

const getApiBase = () => {
	if (window.WIND_API_URL) return window.WIND_API_URL;
	const hostname = window.location.hostname;
	if (hostname.includes('-5500.') || hostname.includes('-8000.') || window.location.port === '5500' || window.location.port === '8000') {
		return window.location.origin;
	}
	return `${window.location.protocol}//${hostname}:8000`;
};

const apiBase = getApiBase();
const authGate = document.querySelector('#auth-gate');
const authForm = document.querySelector('#auth-form');
const authTitle = document.querySelector('#auth-title');
const authSubmitLabel = document.querySelector('#auth-submit-label');
const authError = document.querySelector('#auth-error');
const usernameField = document.querySelector('#auth-username');
let authMode = 'login';

const updateProfile = (user) => {
	document.querySelectorAll('.profile-name').forEach((element) => { element.textContent = user.username; });
	document.querySelectorAll('.dropdown-user strong').forEach((element) => { element.textContent = user.username; });
};

const setAuthMode = (mode) => {
	authMode = mode;
	const isRegister = mode === 'register';
	authTitle.textContent = isRegister ? 'Создать аккаунт' : 'Войти в аккаунт';
	authSubmitLabel.textContent = isRegister ? 'Зарегистрироваться' : 'Войти';
	usernameField.closest('label').hidden = !isRegister;
	usernameField.required = isRegister;
	document.querySelectorAll('[data-auth-mode]').forEach((button) => button.classList.toggle('active', button.dataset.authMode === mode));
	authError.textContent = '';
};

document.querySelectorAll('[data-auth-mode]').forEach((button) => {
	button.addEventListener('click', () => setAuthMode(button.dataset.authMode));
});

const showAuth = () => {
	authGate.hidden = false;
	setAuthMode('login');
};

const checkSession = async () => {
	const token = localStorage.getItem('wind_access_token');
	if (!token) {
		showAuth();
		return;
	}
	try {
		const response = await fetch(`${apiBase}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
		if (!response.ok) throw new Error('expired');
		const user = await response.json();
		updateProfile(user);
		authGate.hidden = true;
	} catch (error) {
		localStorage.removeItem('wind_access_token');
		showAuth();
	}
};

authForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	authError.textContent = '';
	const body = { email: document.querySelector('#auth-email').value, password: document.querySelector('#auth-password').value };
	if (authMode === 'register') body.username = usernameField.value;
	try {
		const response = await fetch(`${apiBase}/auth/${authMode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
		const result = await response.json();
		if (!response.ok) throw new Error(result.detail || 'Не удалось выполнить действие');
		localStorage.setItem('wind_access_token', result.access_token);
		updateProfile(result.user);
		authGate.hidden = true;
	} catch (error) {
		authError.textContent = error instanceof TypeError ? `API недоступен: ${apiBase}` : error.message;
	}
});

document.querySelector('.logout')?.addEventListener('click', (event) => {
	event.preventDefault();
	localStorage.removeItem('wind_access_token');
	showAuth();
});

checkSession();

const formatCryptoPrice = (price) => {
	const digits = price >= 1000 ? 0 : price >= 1 ? 2 : 4;
	return Number(price).toLocaleString('ru-RU', { maximumFractionDigits: digits });
};

const createCryptoChart = () => {
	if (!cryptoChartElement || !window.LightweightCharts) {
		return;
	}

	cryptoChart = LightweightCharts.createChart(cryptoChartElement, {
		width: cryptoChartElement.clientWidth,
		height: cryptoChartElement.clientHeight,
		layout: { background: { color: '#ffffff' }, textColor: '#71807b' },
		grid: { vertLines: { color: '#f0f4f0' }, horzLines: { color: '#f0f4f0' } },
		crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
		rightPriceScale: { borderColor: '#dfe7df' },
		timeScale: { borderColor: '#dfe7df', timeVisible: true, secondsVisible: false },
	});

	const candleOptions = { upColor: '#2d9b6f', downColor: '#d97867', borderVisible: false, wickUpColor: '#2d9b6f', wickDownColor: '#d97867' };
	candleSeries = cryptoChart.addCandlestickSeries ? cryptoChart.addCandlestickSeries(candleOptions) : cryptoChart.addSeries(LightweightCharts.CandlestickSeries, candleOptions);
	new ResizeObserver(() => cryptoChart.applyOptions({ width: cryptoChartElement.clientWidth, height: cryptoChartElement.clientHeight })).observe(cryptoChartElement);
};

const loadCryptoCandles = async () => {
	if (!cryptoChart || !candleSeries || !cryptoPair) {
		return;
	}

	const symbol = cryptoPair.value;
	closeBybitStream();
	cryptoPriceLabel.textContent = 'Загрузка свечей...';
	try {
		const response = await fetch(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${activeInterval}&limit=100`);
		const payload = await response.json();
		if (payload.retCode !== 0) {
			throw new Error(payload.retMsg);
		}

		const candles = payload.result.list.reverse().map(([time, open, high, low, close]) => ({
			time: Number(time) / 1000,
			open: Number(open),
			high: Number(high),
			low: Number(low),
			close: Number(close),
		}));
		candleSeries.setData(candles);
		cryptoSymbolLabel.textContent = `${symbol.slice(0, -4)} / USDT`;
		cryptoPriceLabel.textContent = `${formatCryptoPrice(candles[candles.length - 1].close)} USDT`;
		cryptoUpdated.textContent = `Bybit Spot · ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
		cryptoChart.timeScale().fitContent();
		connectBybitStream(symbol, activeInterval);
	} catch (error) {
		cryptoPriceLabel.textContent = 'Не удалось загрузить данные';
		cryptoUpdated.textContent = 'Проверь соединение';
	}
};

const closeBybitStream = () => {
	streamVersion += 1;
	if (bybitSocket) {
		bybitSocket.close();
		bybitSocket = null;
	}
};

const connectBybitStream = (symbol, interval) => {
	if (!window.WebSocket) {
		return;
	}

	const currentVersion = ++streamVersion;
	bybitSocket = new WebSocket('wss://stream.bybit.com/v5/public/spot');
	bybitSocket.addEventListener('open', () => {
		if (currentVersion === streamVersion) {
			bybitSocket.send(JSON.stringify({ op: 'subscribe', args: [`kline.${interval}.${symbol}`] }));
		}
	});
	bybitSocket.addEventListener('message', (event) => {
		const payload = JSON.parse(event.data);
		const update = payload.data && payload.data[0];
		if (currentVersion !== streamVersion || !update || !payload.topic.startsWith('kline.')) {
			return;
		}

		const candle = {
			time: Number(update.start) / 1000,
			open: Number(update.open),
			high: Number(update.high),
			low: Number(update.low),
			close: Number(update.close),
		};
		candleSeries.update(candle);
		cryptoPriceLabel.textContent = `${formatCryptoPrice(candle.close)} USDT`;
		cryptoUpdated.textContent = `LIVE · Bybit Spot · ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
	});
	bybitSocket.addEventListener('close', () => {
		if (currentVersion === streamVersion) {
			window.setTimeout(() => connectBybitStream(cryptoPair.value, activeInterval), 3000);
		}
	});
};

if (cryptoChartElement && window.LightweightCharts) {
	createCryptoChart();
	loadCryptoCandles();
	cryptoPair.addEventListener('change', loadCryptoCandles);
	timeframeButtons.forEach((button) => {
		button.addEventListener('click', () => {
			activeInterval = button.dataset.interval;
			timeframeButtons.forEach((item) => item.classList.toggle('active', item === button));
			loadCryptoCandles();
		});
	});
}

if (window.lucide) {
	lucide.createIcons();
}
