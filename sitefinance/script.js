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

const updateTopupSubmit = () => {
	const submit = document.querySelector('#topup-submit');
	const customInput = document.querySelector('#custom-topup-amount');
	if (!submit) return;
	const customValue = Number(customInput?.value || 0);
	const activePreset = document.querySelector('#topup-modal .amount-option.active');
	const selectedAmount = customValue > 0 ? customValue : Number(activePreset?.dataset.amount || submit.dataset.defaultAmount || 5000);
	const formatted = `${new Intl.NumberFormat('ru-RU').format(Math.round(selectedAmount))} ₽`;
	submit.innerHTML = `Пополнить на ${formatted} <span>→</span>`;
	submit.dataset.success = `Баланс пополнен на ${formatted}`;
};

document.querySelectorAll('#topup-modal .amount-option').forEach((option) => {
	option.addEventListener('click', () => {
		document.querySelectorAll('#topup-modal .amount-option').forEach((item) => item.classList.remove('active'));
		option.classList.add('active');
		const customInput = document.querySelector('#custom-topup-amount');
		if (customInput) customInput.value = '';
		updateTopupSubmit();
	});
});

document.querySelector('#custom-topup-amount')?.addEventListener('input', () => {
	document.querySelectorAll('#topup-modal .amount-option').forEach((item) => item.classList.remove('active'));
	updateTopupSubmit();
});

document.querySelectorAll('#topup-modal .payment-option').forEach((option) => {
	option.addEventListener('click', () => {
		document.querySelectorAll('#topup-modal .payment-option').forEach((item) => item.classList.remove('active'));
		option.classList.add('active');
	});
});

const openCheckoutFlow = (amount, method = 'Карта') => {
	const modal = document.getElementById('checkout-modal');
	const amountLabel = document.getElementById('checkout-amount');
	const methodLabel = document.getElementById('checkout-method');
	const quantityInput = document.getElementById('crypto-buy-quantity');
	const priceInput = document.getElementById('crypto-buy-price');
	if (!modal || !amountLabel || !methodLabel || !quantityInput || !priceInput) return;

	const selectedSymbol = cryptoPair?.value || 'BTCUSDT';
	const fallbackPrices = { BTCUSDT: 65000, ETHUSDT: 3200, SOLUSDT: 150 };
	const currentPrice = activeCryptoPrice || fallbackPrices[selectedSymbol] || 0;
	quantityInput.value = quantityInput.value || '0.01';
	priceInput.value = currentPrice ? String(currentPrice) : '';
	updateCryptoOrderSummary();
	methodLabel.textContent = method;
	modal.hidden = false;
};

const updateCryptoOrderSummary = () => {
	const quantityInput = document.getElementById('crypto-buy-quantity');
	const priceInput = document.getElementById('crypto-buy-price');
	const quantityLabel = document.getElementById('checkout-quantity');
	const priceLabel = document.getElementById('checkout-price');
	const amountLabel = document.getElementById('checkout-amount');
	const assetLabel = document.getElementById('checkout-asset');
	if (!quantityInput || !priceInput || !quantityLabel || !priceLabel || !amountLabel) return;

	const quantity = Number(quantityInput.value || 0);
	const price = Number(priceInput.value || 0);
	const total = quantity * price;
	const symbol = cryptoPair?.value || 'BTCUSDT';
	const asset = `${symbol.slice(0, -4)} / USDT`;
	if (assetLabel) assetLabel.textContent = asset;
	quantityLabel.textContent = quantity.toLocaleString('ru-RU', { maximumFractionDigits: 8 });
	priceLabel.textContent = `${price.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} USDT`;
	amountLabel.textContent = `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(total)} USDT`;
};

document.querySelector('#crypto-buy-quantity')?.addEventListener('input', updateCryptoOrderSummary);
document.querySelector('#crypto-buy-price')?.addEventListener('input', updateCryptoOrderSummary);

const showSuccess = (message) => {
	windBurst.classList.remove('active');
	successMessage.textContent = message;
	void windBurst.offsetWidth;
	windBurst.classList.add('active');
	window.setTimeout(() => windBurst.classList.remove('active'), 2550);
	successToast.classList.remove('visible');
	void successToast.offsetWidth;
	successToast.classList.add('visible');
};

		const handleTopup = () => {
			const customInput = document.querySelector('#custom-topup-amount');
			const activePreset = document.querySelector('#topup-modal .amount-option.active');
			const amount = Number(customInput?.value || activePreset?.dataset.amount || 5000);
			
			USER_WALLETS.RUB += amount;
			saveWallets();
			showSuccess(`Баланс пополнен на ${formatMoney(amount)} ₽`);
			closeModal(document.getElementById('topup-modal'));
		};

		const topupSubmit = document.querySelector('#topup-submit');
		if (topupSubmit) {
			// Удаляем старые слушатели, если они были (в данном случае просто заменяем поведение)
			topupSubmit.addEventListener('click', (e) => {
				e.stopImmediatePropagation(); // предотвращаем стандартный обработчик [data-success]
				handleTopup();
			});
		}

const assetPickerOptions = document.querySelectorAll('.asset-picker-option');
assetPickerOptions.forEach((option) => {
	option.addEventListener('click', () => {
		assetPickerOptions.forEach((item) => item.classList.remove('active'));
		option.classList.add('active');
	});
});

document.querySelectorAll('[data-trade]').forEach((button) => {
	button.addEventListener('click', () => {
		if (button.dataset.trade === 'buy') {
			const method = document.querySelector('#topup-modal .payment-option.active')?.dataset.payment === 'sbp' ? 'СБП' : 'Карта';
			openCheckoutFlow(0, method);
			return;
		}
		const action = 'Продажа BTC/USDT подготовлена';
		showSuccess(action);
	});
});

const confirmPaymentButton = document.getElementById('confirm-payment');
confirmPaymentButton?.addEventListener('click', () => {
	const quantityInput = document.getElementById('crypto-buy-quantity');
	const priceInput = document.getElementById('crypto-buy-price');
	const symbol = (cryptoPair?.value || 'BTCUSDT').replace('USDT', '');
	
	const quantity = Number(quantityInput?.value || 0);
	const price = Number(priceInput?.value || 0);
	const totalUsd = quantity * price;

	if (quantity > 0) {
		// Проверяем наличие USD (или RUB, если USD нет)
		if (USER_WALLETS.USD >= totalUsd) {
			USER_WALLETS.USD -= totalUsd;
			USER_WALLETS[symbol] = (USER_WALLETS[symbol] || 0) + quantity;
			saveWallets();
			showSuccess(`Куплено ${quantity} ${symbol}`);
			closeModal(confirmPaymentButton.closest('.modal'));
		} else {
			// Если USD мало, попробуем списать в RUB
			const totalRub = totalUsd * CURRENCY_RATES.USD;
			if (USER_WALLETS.RUB >= totalRub) {
				USER_WALLETS.RUB -= totalRub;
				USER_WALLETS[symbol] = (USER_WALLETS[symbol] || 0) + quantity;
				saveWallets();
				showSuccess(`Куплено ${quantity} ${symbol} за рубли`);
				closeModal(confirmPaymentButton.closest('.modal'));
			} else {
				showSuccess('Недостаточно средств для покупки');
			}
		}
	}
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
let activeCryptoPrice = 0;
let cryptoChart;
let candleSeries;
let bybitSocket;
let streamVersion = 0;

	const CURRENCY_RATES = { USD: 92.48, EUR: 100.21, RUB: 1, CNY: 12.86, GBP: 109.4, AED: 25.2 };

	// Инициализация балансов
	let USER_WALLETS = JSON.parse(localStorage.getItem('wind_wallets')) || {
		RUB: 24500,
		USD: 0,
		EUR: 0,
		CNY: 0,
		GBP: 0,
		AED: 0,
		BTC: 0,
		ETH: 0,
		SOL: 0
	};

	const CRYPTO_RATES = {
		BTC: 65000, // в USD (условно)
		ETH: 3200,
		SOL: 150
	};

	const saveWallets = () => {
		localStorage.setItem('wind_wallets', JSON.stringify(USER_WALLETS));
		updateBalanceUI();
	};

	const updateBalanceUI = () => {
		const mainBalanceContainer = document.querySelector('.wallet-balance');
		if (!mainBalanceContainer) return;

		let totalRub = 0;
		let balancesHtml = '<span class="wallet-label">Твои активы</span><div class="balances-grid">';
		
		Object.entries(USER_WALLETS).forEach(([code, val]) => {
			if (val > 0) {
				const isCrypto = ['BTC', 'ETH', 'SOL'].includes(code);
				const rate = isCrypto ? (CRYPTO_RATES[code] * CURRENCY_RATES.USD) : CURRENCY_RATES[code];
				totalRub += val * rate;
				
				const displayVal = isCrypto ? val.toFixed(4) : formatMoney(val);
				balancesHtml += `
					<div class="balance-item">
						<small>${code}</small>
						<strong>${displayVal}</strong>
					</div>
				`;
			}
		});

		balancesHtml += `</div><div class="total-estimate">Эквивалент: ${formatMoney(totalRub)} ₽</div>`;
		mainBalanceContainer.innerHTML = balancesHtml;

		// Обновление балансов в секции настроек
		const settingsBalance = document.querySelector('.settings-summary div:last-child strong');
		if (settingsBalance) {
			settingsBalance.textContent = `${formatMoney(totalRub)} ₽`;
		}

		// Обновление баланса в профиле инвестора (Общая стоимость)
		const portfolioTotal = document.querySelector('.portfolio-summary div:first-child strong');
		if (portfolioTotal) {
			portfolioTotal.textContent = `${formatMoney(totalRub)} ₽`;
		}

		updateConverterAvailable();
		updatePortfolioList();
	};

	const updateConverterAvailable = () => {
		const converter = document.querySelector('.schedule.converter');
		if (!converter) return;
		const fromSelect = converter.querySelector('.converter-from');
		const label = converter.querySelector('label[for="converter-amount"]') || converter.querySelector('label');
		if (fromSelect && label) {
			const currency = fromSelect.value;
			const balance = USER_WALLETS[currency] || 0;
			label.innerHTML = `У меня есть <span style="float:right; color:var(--green)">Доступно: ${formatMoney(balance)} ${currency}</span>`;
		}
	};

	const updatePortfolioList = () => {
		const portfolioList = document.querySelector('.portfolio-list');
		if (!portfolioList) return;
		
		const icons = {
			USD: 'dollar-sign',
			EUR: 'euro',
			RUB: 'wallet',
			CNY: 'japanese-yen',
			GBP: 'pound-sterling',
			AED: 'landmark'
		};

		const colors = {
			USD: 'orange',
			EUR: 'purple',
			RUB: 'teal',
			CNY: 'blue',
			GBP: 'amber',
			AED: 'teal'
		};

		let html = '';
		Object.entries(USER_WALLETS).forEach(([code, val]) => {
			if (val > 0) {
				html += `
					<div class="portfolio-item">
						<div class="portfolio-main">
							<span class="asset-icon ${colors[code] || 'teal'}"><i data-lucide="${icons[code] || 'circle'}"></i></span>
							<div><strong>${code} Balance</strong><small>${code} Валюта</small></div>
						</div>
						<div class="portfolio-side">
							<span>${formatMoney(val)} ${code}</span>
						</div>
					</div>
				`;
			}
		});
		
		portfolioList.innerHTML = html;
		if (window.lucide) window.lucide.createIcons();
	};

	const formatCurrencyCode = (code) => {
		const mapping = {
			USD: 'USD · $',
			EUR: 'EUR · €',
			RUB: 'RUB · ₽',
			CNY: 'CNY · ¥',
			GBP: 'GBP · £',
			AED: 'AED · د.إ',
		};
		return mapping[code] || code;
	};

	const formatMoney = (value) => Number(value).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

	const getConverterRate = (from, to) => {
		if (from === to) return 1;
		const fromRub = from === 'RUB' ? 1 : CURRENCY_RATES[from];
		const toRub = to === 'RUB' ? 1 : CURRENCY_RATES[to];
		return fromRub / toRub;
};

	const getDisplayRate = (from, to) => {
		if (from === 'RUB') return 1 / CURRENCY_RATES[to];
		if (to === 'RUB') return CURRENCY_RATES[from];
		return CURRENCY_RATES[from] / CURRENCY_RATES[to];
	};

	const updateConverter = () => {
		const converter = document.querySelector('.schedule.converter');
		if (!converter) return;

		const amountInput = converter.querySelector('input[type="number"]');
		const fromSelect = converter.querySelector('.converter-from');
		const toSelect = converter.querySelector('.converter-to');
		const output = converter.querySelector('.converter-output');
		const note = converter.querySelector('.converter-note');

		if (!amountInput || !fromSelect || !toSelect || !output || !note) return;

		const from = fromSelect.value;
		const to = toSelect.value;
		const amount = Number(amountInput.value || 0);
		const rate = getConverterRate(from, to);
		const displayRate = getDisplayRate(from, to);
	const result = amount * rate;
		output.textContent = formatMoney(result);
		note.textContent = `По курсу ${formatMoney(displayRate)} ${to === 'RUB' ? '₽' : to === 'USD' ? '$' : '€'} за 1 ${from}`;
};

	const executeConverter = () => {
		const converter = document.querySelector('.schedule.converter');
		if (!converter) return;

		const amountInput = converter.querySelector('input[type="number"]');
		const fromSelect = converter.querySelector('.converter-from');
		const toSelect = converter.querySelector('.converter-to');
		const button = converter.querySelector('.converter-submit');
		if (!amountInput || !fromSelect || !toSelect || !button) return;

		const from = fromSelect.value;
		const to = toSelect.value;
		const amount = Number(amountInput.value || 0);

		if (amount <= 0) {
			showSuccess('Введите сумму больше нуля');
			return;
		}

		if (USER_WALLETS[from] < amount) {
			showSuccess('Недостаточно средств на балансе');
			button.classList.add('shake-error');
			setTimeout(() => button.classList.remove('shake-error'), 400);
			return;
		}

		const rate = getConverterRate(from, to);
		const result = amount * rate;

		// Процесс обмена
		USER_WALLETS[from] -= amount;
		USER_WALLETS[to] = (USER_WALLETS[to] || 0) + result;
		
		saveWallets();

		button.classList.remove('is-animating');
		void button.offsetWidth;
		button.classList.add('is-animating');

		if (typeof showSuccess === 'function') {
			showSuccess(`Обмен выполнен: ${formatMoney(amount)} ${from} → ${formatMoney(result)} ${to}`);
		}
	};

const appNavigation = document.querySelectorAll('.nav a');
const appViews = new Set(['dashboard', 'investments', 'crypto', 'converter', 'game', 'settings']);
const themeToggle = document.querySelector('[data-theme-toggle]');
const notificationButton = document.querySelector('.notification-button');
const notificationPanel = document.querySelector('.notification-panel');
const notificationList = document.querySelector('#notification-list');

const portfolioNotifications = [
	{ type: 'positive', title: 'USD вырос на 0,34 ₽', detail: 'Сильный рост сегодня', time: '2 минуты назад' },
	{ type: 'neutral', title: 'Поступление на баланс', detail: 'Баланс обновлён на 5 000 ₽', time: 'Сегодня, 11:42' },
	{ type: 'alert', title: 'Триггер по BTC активен', detail: 'Рост выше целевого порога', time: 'Нужно проверить' }
];

const renderNotifications = () => {
	if (!notificationList) return;
	notificationList.innerHTML = portfolioNotifications.map((item) => `
		<div class="notification-item">
			<span class="notification-icon ${item.type === 'positive' ? 'positive-icon' : item.type === 'neutral' ? 'neutral-icon' : 'alert-icon'}"><i data-lucide="${item.type === 'positive' ? 'trending-up' : item.type === 'neutral' ? 'wallet' : 'bell-ring'}"></i></span>
			<div><strong>${item.title}</strong><small>${item.detail} · ${item.time}</small></div>
		</div>
	`).join('');
	if (window.lucide) window.lucide.createIcons();
	const badge = document.querySelector('#notification-badge');
	if (badge) badge.textContent = String(portfolioNotifications.length);
};

const closeNotificationPanel = () => {
	if (!notificationPanel || !notificationButton) return;
	notificationPanel.hidden = true;
	notificationButton.setAttribute('aria-expanded', 'false');
};

const toggleNotificationPanel = () => {
	if (!notificationPanel || !notificationButton) return;
	const isOpen = !notificationPanel.hidden;
	notificationPanel.hidden = isOpen;
	notificationButton.setAttribute('aria-expanded', String(!isOpen));
};

const applyTheme = (isDark) => {
	document.body.classList.toggle('dark-theme', isDark);
	if (themeToggle) {
		themeToggle.setAttribute('aria-pressed', String(isDark));
		themeToggle.innerHTML = isDark ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
		if (window.lucide) {
			window.lucide.createIcons();
		}
	}
	localStorage.setItem('wind_theme', isDark ? 'dark' : 'light');
};

if (themeToggle) {
	const savedTheme = localStorage.getItem('wind_theme');
	applyTheme(savedTheme === 'dark');
	themeToggle.addEventListener('click', () => applyTheme(!document.body.classList.contains('dark-theme')));
}

if (notificationButton && notificationPanel) {
	renderNotifications();
	notificationPanel.hidden = true;
	notificationButton.addEventListener('click', (event) => {
		event.stopPropagation();
		toggleNotificationPanel();
	});
	document.addEventListener('click', (event) => {
		if (!notificationPanel.contains(event.target) && !notificationButton.contains(event.target)) {
			closeNotificationPanel();
		}
	});
}

const openInvestmentProfile = () => {
	document.body.dataset.view = 'investments';
	document.body.classList.add('show-investment-profile');
	appNavigation.forEach((link) => {
		link.classList.toggle('active', link.getAttribute('href') === '#investments');
	});
};

const closeInvestmentProfile = () => {
	document.body.classList.remove('show-investment-profile');
};

const setAppView = (view) => {
	const nextView = appViews.has(view) ? view : 'dashboard';
	document.body.dataset.view = nextView;
	closeInvestmentProfile();
	appNavigation.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${nextView}`));
};

appNavigation.forEach((link) => {
	link.addEventListener('click', () => setAppView(link.getAttribute('href').slice(1)));
});


(() => {
	const stage = document.getElementById('cg-stage');
	const canvas = document.getElementById('cg-canvas');
	if (!stage || !canvas) return;
	const ctx = canvas.getContext('2d');
	const el = (id) => document.getElementById(id);
	const ui = {
		score: el('cg-score'), lives: el('cg-lives'), combo: el('cg-combo'), best: el('cg-best'),
		msg: el('cg-message'), bar: el('cg-progress-bar'), label: el('cg-chapter-label'),
		title: el('cg-chapter-title'), copy: el('cg-story-copy'), overlay: el('cg-overlay'),
		oTitle: el('cg-overlay-title'), oText: el('cg-overlay-text'), start: el('cg-start'),
	};

	// goal: сколько ящиков нужно уложить ВСЕГО, чтобы закончить главу
	const CHAPTERS = [
		{ label: 'Глава 1', title: 'Первый депозит', copy: 'Рынок только проснулся. Укладывай ящики в башню ровно: криво лежащие падают.', goal: 8, speed: 140, spawn: 1.0, bad: 0.10, wind: 0 },
		{ label: 'Глава 2', title: 'Волатильность', copy: 'Ящики летят вкось и быстрее. Не качай башню резкими рывками, и держи серию.', goal: 20, speed: 185, spawn: 0.8, bad: 0.18, wind: 55 },
		{ label: 'Глава 3', title: 'Крипто-зима', copy: 'Рагпуллов всё больше, они сносят верх башни. Доведи портфель до финала.', goal: 36, speed: 230, spawn: 0.65, bad: 0.24, wind: 80 },
	];
	const TYPES = {
		btc: { sym: '₿', color: '#f2a33a', value: 500 },
		eth: { sym: 'Ξ', color: '#7b83d9', value: 300 },
		sol: { sym: '◎', color: '#2bb59b', value: 150 },
		gold: { sym: '★', color: '#e0a82e', value: 2000 },
		rug: { sym: '☠', color: '#d9544f', value: 0 },
	};
	const PW = 88, PH = 34;
	const STEP = 0.88;      // насколько ящики перекрываются в башне
	const STACK_MAX = 6;    // сколько ящиков до «Доставки»
	const money = (n) => '$' + Math.round(n).toLocaleString('ru-RU');
	const keys = new Set();

	let w = 0, h = 0, raf = 0, last = 0, running = false;
	const s = { px: 0, prevPx: 0, lean: 0, dir: 0, items: [], fx: [], stack: [], debris: [], timer: 0, score: 0, lives: 3, combo: 1, caught: 0, chapter: 0, shake: 0, lastCatch: 0, best: Number(localStorage.getItem('cg_best') || 0), t: 0 };

	const clampX = (x) => Math.min(w - PW / 2, Math.max(PW / 2, x));
	const basketTop = () => h - PH - 6;

	// центры ящиков башни в мировых координатах
	const layout = () => {
		return s.stack.map((c) => ({
			x: s.px + c.dx + s.lean * (c.level + 1) * 0.6,
			y: basketTop() + 2 + c.dy
		}));
	};
	const topSurface = () => {
		let min = basketTop() + 2;
		const lay = layout();
		lay.forEach((p, i) => {
			const top = p.y - s.stack[i].size / 2;
			if (top < min) min = top;
		});
		return min - 40;
	};

	const resize = () => {
		const r = stage.getBoundingClientRect();
		if (!r.width) return;
		const dpr = window.devicePixelRatio || 1;
		w = r.width; h = r.height;
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		s.px = clampX(s.px || w / 2);
		if (!running) draw();
	};

	const setChapter = (i) => {
		s.chapter = i;
		const c = CHAPTERS[i];
		ui.label.textContent = c.label;
		ui.title.textContent = c.title;
		ui.copy.textContent = c.copy;
		stage.dataset.chapter = String(i + 1);
	};

	const updateUi = () => {
		ui.score.textContent = money(s.score);
		ui.lives.textContent = '♥'.repeat(Math.max(0, s.lives)) + '♡'.repeat(Math.max(0, 3 - s.lives));
		ui.combo.textContent = 'x' + s.combo;
		ui.best.textContent = money(s.best);
		const from = s.chapter ? CHAPTERS[s.chapter - 1].goal : 0;
		const to = CHAPTERS[s.chapter].goal;
		ui.bar.style.width = Math.min(100, ((s.caught - from) / (to - from)) * 100) + '%';
	};

	const spawn = () => {
		const c = CHAPTERS[s.chapter];
		let key;
		if (Math.random() < c.bad) key = 'rug';
		else if (Math.random() < 0.09) key = 'gold';
		else key = ['btc', 'eth', 'sol'][Math.floor(Math.random() * 3)];
		const size = key === 'gold' ? 42 : 36;
		// Ящики падают в пределах ширины корзины (с небольшим запасом)
		const range = PW + 40;
		const x = s.px - range / 2 + Math.random() * range;
		s.items.push({ key, size, x: Math.max(size, Math.min(w - size, x)), y: -size, speed: c.speed * (0.85 + Math.random() * 0.3), rot: (Math.random() - 0.5) * 0.4, spin: (Math.random() - 0.5) * 1.0, phase: Math.random() * 6 });
	};

	const floatText = (x, y, text, color) => s.fx.push({ x, y, text, color, life: 1 });

	const showOverlay = (title, text, button) => {
		ui.oTitle.textContent = title;
		ui.oText.textContent = text;
		ui.start.textContent = button;
		ui.overlay.hidden = false;
	};

	const finish = (result) => {
		running = false;
		cancelAnimationFrame(raf);
		keys.clear(); s.dir = 0;
		if (s.score > s.best) { s.best = s.score; localStorage.setItem('cg_best', String(s.best)); }
		updateUi();
		if (result === true) showOverlay('Ты пережил крипто-зиму!', `Финальный портфель: ${money(s.score)}. Рынок запомнит это имя.`, 'Сыграть ещё раз');
		else if (result === false) showOverlay('Ликвидация', `Рагпулл забрал последнюю жизнь. Портфель: ${money(s.score)}.`, 'Попробовать снова');
		else showOverlay('Рейс остановлен', `Портфель: ${money(s.score)}.`, 'Начать заново');
		draw();
	};

	// ящики башни, начиная с индекса from, падают с неё
	const detach = (from, power = 1) => {
		const lay = layout();
		const removed = s.stack.splice(from);
		let lost = 0;
		removed.forEach((c, j) => {
			const p = lay[from + j];
			const side = c.dx === 0 ? (Math.random() > 0.5 ? 1 : -1) : Math.sign(c.dx);
			s.debris.push({ key: c.key, size: c.size, x: p.x, y: p.y, vx: side * (50 + Math.random() * 120) * power, vy: -90 - Math.random() * 120, rot: c.rot, vrot: side * (2 + Math.random() * 5) });
			lost += c.gain;
		});
		s.score = Math.max(0, s.score - lost);
		s.combo = 1;
		s.shake = 0.25;
		if (removed.length) floatText(s.px, basketTop() - 70, '−' + money(lost), '#d9544f');
		return removed.length;
	};

	// башня устойчива, если центр тяжести всего, что выше, лежит над опорой
	const checkStability = () => {
		for (let k = 0; k < s.stack.length; k++) {
			const c = s.stack[k];
			const supDx = c.parentIdx === -1 ? 0 : s.stack[c.parentIdx].dx;
			const supHalf = c.parentIdx === -1 ? PW / 2 : s.stack[c.parentIdx].size / 2;
			if (Math.abs(c.dx - supDx) > supHalf * 1.1) {
				detach(k);
				ui.msg.textContent = 'Башня рухнула! Укладывай ровнее.';
				return true;
			}
		}
		return false;
	};

	const deliver = () => {
		const lay = layout();
		const sum = s.stack.reduce((a, c) => a + c.gain, 0);
		const bonus = Math.round(sum * 0.5);
		s.stack.forEach((c, i) => {
			s.debris.push({ key: c.key, size: c.size, x: lay[i].x, y: lay[i].y, vx: (Math.random() - 0.5) * 260, vy: -380 - Math.random() * 120, rot: c.rot, vrot: (Math.random() - 0.5) * 6 });
		});
		s.stack = [];
		s.score += bonus;
		floatText(s.px, basketTop() - 90, 'Доставка! +' + money(bonus), '#e0a82e');
		ui.msg.textContent = 'Башня доставлена, бонус на счёт!';
	};

	// возвращает true, если предмет «израсходован» (приземлился или взорвался)
	const land = (it) => {
		const lay = layout();
		let parentIdx = -1;
		let landingY = basketTop() + 2;

		for (let i = s.stack.length - 1; i >= 0; i--) {
			const p = lay[i], c = s.stack[i];
			if (Math.abs(it.x - p.x) < (it.size + c.size) / 2 * 0.85) {
				if (it.y + it.size / 2 >= p.y - c.size / 2 && it.y + it.size / 2 < p.y) {
					parentIdx = i;
					landingY = p.y - c.size / 2;
					break;
				}
			}
		}

		if (parentIdx === -1) {
			if (it.y + it.size / 2 >= basketTop()) {
				if (Math.abs(it.x - s.px) < PW / 2 + it.size * 0.45) {
					landingY = basketTop() + 2;
				} else {
					it.passed = true; return false;
				}
			} else return false;
		}

		if (it.key === 'rug') {
			s.lives -= 1; s.combo = 1; s.shake = 0.35;
			const n = s.stack.length;
			if (n) detach(Math.max(0, n - 2), 1.6);
			floatText(it.x, basketTop() - 30, '−1 ♥', '#d9544f');
			ui.msg.textContent = n ? 'Рагпулл снёс верх башни!' : 'Рагпулл! Проверяй, что ловишь.';
			updateUi();
			if (s.lives <= 0) finish(false);
			return true;
		}

		const now = performance.now();
		s.combo = now - s.lastCatch < 2200 ? Math.min(5, s.combo + 1) : 1;
		s.lastCatch = now;
		const gain = TYPES[it.key].value * s.combo;
		s.score += gain; s.caught += 1;
		
		const level = parentIdx === -1 ? 0 : s.stack[parentIdx].level + 1;
		const dy = (parentIdx === -1) ? -it.size / 2 : s.stack[parentIdx].dy - (s.stack[parentIdx].size + it.size) / 2 * STEP;
		
		s.stack.push({ key: it.key, size: it.size, dx: it.x - s.px, dy, level, parentIdx, rot: it.rot * 0.3, gain });
		floatText(it.x, landingY - 20, '+' + money(gain), it.key === 'gold' ? '#e0a82e' : '#24785b');
		ui.msg.textContent = it.key === 'gold' ? 'Золотой ящик лёг на башню!' : s.combo > 1 ? `Серия ×${s.combo}! Башня растёт.` : 'Ящик уложен.';

		const fell = checkStability();
		if (!fell && s.stack.length >= STACK_MAX) deliver();

		if (s.caught >= CHAPTERS[s.chapter].goal) {
			if (s.chapter + 1 >= CHAPTERS.length) { updateUi(); finish(true); return true; }
			setChapter(s.chapter + 1);
			ui.msg.textContent = 'Новая глава: ' + CHAPTERS[s.chapter].title;
		}
		updateUi();
		return true;
	};

	const update = (dt) => {
		const c = CHAPTERS[s.chapter];
		s.t += dt;
		const move = Math.max(-1, Math.min(1, s.dir + (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0)));
		s.px = clampX(s.px + move * 580 * dt);

		// раскачивание башни при движении
		const vx = dt > 0 ? (s.px - s.prevPx) / dt : 0;
		s.prevPx = s.px;
		const target = Math.max(-3, Math.min(3, -vx * 0.004));
		s.lean += (target - s.lean) * Math.min(1, dt * 8);

		s.timer -= dt;
		if (s.timer <= 0) { spawn(); s.timer = c.spawn * (0.7 + Math.random() * 0.6); }

		const alive = [];
		for (const it of s.items) {
			it.y += it.speed * dt;
			it.x += Math.sin(s.t * 1.6 + it.phase) * c.wind * dt;
			it.rot += it.spin * dt;
			if (!it.passed && it.y + it.size / 2 >= topSurface()) {
				if (land(it)) { if (!running) return; continue; }
			}
			if (it.y > h + it.size) {
				if (it.key !== 'rug' && s.combo > 1) { s.combo = 1; updateUi(); }
				continue;
			}
			alive.push(it);
		}
		s.items = alive;

		s.debris = s.debris.filter((d) => {
			d.vy += 900 * dt;
			d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vrot * dt;
			return d.y < h + 80;
		});
		s.fx = s.fx.filter((f) => (f.life -= dt * 1.2) > 0);
		s.fx.forEach((f) => { f.y -= 40 * dt; });
		if (s.shake > 0) s.shake -= dt;
	};

	const rr = (x, y, wd, ht, r) => {
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.arcTo(x + wd, y, x + wd, y + ht, r);
		ctx.arcTo(x + wd, y + ht, x, y + ht, r);
		ctx.arcTo(x, y + ht, x, y, r);
		ctx.arcTo(x, y, x + wd, y, r);
		ctx.closePath();
	};

	const drawCrate = (key, sz, x, y, rot) => {
		const t = TYPES[key];
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(rot);
		if (key === 'gold') { ctx.shadowColor = 'rgba(244,201,93,.9)'; ctx.shadowBlur = 16; }
		ctx.fillStyle = t.color;
		rr(-sz / 2, -sz / 2, sz, sz, 7); ctx.fill();
		ctx.shadowBlur = 0;
		ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.5; ctx.stroke();
		ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(-sz / 2 + 4, -sz / 2 + 4); ctx.lineTo(sz / 2 - 4, sz / 2 - 4);
		ctx.moveTo(sz / 2 - 4, -sz / 2 + 4); ctx.lineTo(-sz / 2 + 4, sz / 2 - 4);
		ctx.stroke();
		ctx.fillStyle = '#fff';
		ctx.font = `700 ${Math.round(sz * 0.55)}px "Space Grotesk", sans-serif`;
		ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
		ctx.fillText(t.sym, 0, 1);
		ctx.restore();
	};

	const drawBasket = () => {
		const bx = s.px - PW / 2, by = basketTop();
		ctx.fillStyle = '#246f55';
		ctx.beginPath();
		ctx.moveTo(bx - 6, by); ctx.lineTo(bx + PW + 6, by);
		ctx.lineTo(bx + PW - 8, by + PH); ctx.lineTo(bx + 8, by + PH);
		ctx.closePath(); ctx.fill();
		ctx.fillStyle = '#77d5a7';
		rr(bx - 9, by - 5, PW + 18, 9, 4); ctx.fill();
		ctx.fillStyle = '#fff';
		ctx.font = '700 17px "Space Grotesk", sans-serif';
		ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
		ctx.fillText('WALLET', s.px, by + PH / 2 + 3);
	};

	function draw() {
		if (!w) return;
		ctx.clearRect(0, 0, w, h);
		ctx.save();
		if (s.shake > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
		s.items.forEach((it) => drawCrate(it.key, it.size, it.x, it.y, it.rot));
		s.debris.forEach((d) => drawCrate(d.key, d.size, d.x, d.y, d.rot));
		const lay = layout();
		s.stack.forEach((c, i) => {
			// чем сильнее ящик смещён от опоры, тем заметнее он «клонится»
			const supDx = i === 0 ? 0 : s.stack[i - 1].dx;
			const supHalf = i === 0 ? PW / 2 : s.stack[i - 1].size / 2;
			const tilt = ((c.dx - supDx) / supHalf) * 0.1 + s.lean * 0.012;
			drawCrate(c.key, c.size, lay[i].x, lay[i].y, tilt + c.rot * 0.3);
		});
		drawBasket();
		s.fx.forEach((f) => {
			ctx.globalAlpha = Math.max(0, f.life);
			ctx.fillStyle = f.color;
			ctx.font = '700 16px "Space Grotesk", sans-serif';
			ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
			ctx.fillText(f.text, f.x, f.y);
		});
		ctx.restore();
	}

	const frame = (ts) => {
		if (!running) return;
		if (document.body.dataset.view !== 'game') { finish(null); return; }
		const dt = Math.min(0.04, (ts - last) / 1000 || 0);
		last = ts;
		update(dt);
		if (!running) return;
		draw();
		raf = requestAnimationFrame(frame);
	};

	const start = () => {
		resize();
		Object.assign(s, { items: [], fx: [], stack: [], debris: [], timer: 0.4, score: 0, lives: 3, combo: 1, caught: 0, shake: 0, lastCatch: 0, t: 0, dir: 0, lean: 0, px: w / 2, prevPx: w / 2 });
		setChapter(0);
		updateUi();
		ui.msg.textContent = 'Укладывай ящики в башню. Череп = рагпулл!';
		ui.overlay.hidden = true;
		running = true;
		last = performance.now();
		raf = requestAnimationFrame(frame);
	};

	const pointerMove = (e) => {
		if (!running) return;
		s.px = clampX(e.clientX - stage.getBoundingClientRect().left);
	};

	ui.start.addEventListener('click', start);
	stage.addEventListener('pointermove', pointerMove);
	stage.addEventListener('pointerdown', pointerMove);

	const bindPad = (id, dir) => {
		const b = el(id);
		if (!b) return;
		b.addEventListener('pointerdown', (e) => { e.preventDefault(); s.dir = dir; });
		['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, () => { s.dir = 0; }));
	};
	bindPad('cg-left', -1);
	bindPad('cg-right', 1);

	window.addEventListener('keydown', (e) => {
		if (!running || !['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) return;
		e.preventDefault();
		keys.add(e.code);
	});
	window.addEventListener('keyup', (e) => keys.delete(e.code));

	new ResizeObserver(resize).observe(stage);
	setChapter(0);
	updateUi();
	resize();
})();

document.querySelectorAll('[data-open-investment-profile]').forEach((button) => {
	button.addEventListener('click', openInvestmentProfile);
});

document.querySelectorAll('[data-back-view="investments"]').forEach((button) => {
	button.addEventListener('click', () => {
		closeInvestmentProfile();
		setAppView('investments');
	});
});

document.querySelectorAll('[data-back-view="settings"]').forEach((button) => {
	button.addEventListener('click', () => setAppView('dashboard'));
});

document.querySelectorAll('a[href="#settings"]').forEach((link) => {
	link.addEventListener('click', (event) => {
		event.preventDefault();
		setAppView('settings');
		window.history.replaceState(null, '', '#settings');
	});
});

window.addEventListener('hashchange', () => {
	const hash = window.location.hash.slice(1);
	if (hash === 'investment-profile') {
		openInvestmentProfile();
		return;
	}
	setAppView(hash);
});
setAppView(window.location.hash.slice(1) || 'dashboard');

const converter = document.querySelector('.schedule.converter');
const currencyButtons = document.querySelectorAll('.currency-pill');
const currencyModal = document.getElementById('currency-modal');
let activeCurrencyField = 'from';
let converterFromSelect = document.querySelector('.converter-from');
let converterToSelect = document.querySelector('.converter-to');

const pairSceneConfig = {
	USD: {
		pair: 'USD / RUB',
		unit: 'за 1 доллар',
		heading: '92,48 ₽',
		changeText: '▲ 0,34 ₽ · +0,37% за сегодня',
		trend: 'positive',
		chart: [34, 40, 36, 48, 52, 45, 68, 76],
	},
	EUR: {
		pair: 'EUR / RUB',
		unit: 'за 1 евро',
		heading: '100,21 ₽',
		changeText: '▼ 0,12 ₽ · −0,12% за сегодня',
		trend: 'negative',
		chart: [28, 30, 32, 35, 43, 38, 44, 42],
	},
	CNY: {
		pair: 'CNY / RUB',
		unit: 'за 1 юань',
		heading: '12,86 ₽',
		changeText: '▲ 0,08 ₽ · +0,08% за сегодня',
		trend: 'positive',
		chart: [20, 24, 27, 26, 38, 36, 42, 50],
	},
};

const updateFocusCard = (currencyCode) => {
	const config = pairSceneConfig[currencyCode];
	const focusCard = document.querySelector('.focus-card');
	if (!focusCard || !config) return;

	const focusTag = focusCard.querySelector('.focus-tag');
	const focusHeading = focusCard.querySelector('h2');
	const focusTrend = focusCard.querySelector('p');
	const chartBars = focusCard.querySelectorAll('.chart i');
	if (focusTag) focusTag.textContent = `Избранная пара · ${config.pair}`;
	if (focusHeading) {
		focusHeading.innerHTML = `${config.heading} <span class="unit">${config.unit}</span>`;
	}
	if (focusTrend) {
		focusTrend.textContent = config.changeText;
		focusTrend.classList.remove('positive', 'negative');
		focusTrend.classList.add(config.trend);
	}
	chartBars.forEach((bar, index) => {
		bar.style.height = `${config.chart[index] || 40}%`;
		bar.style.background = config.trend === 'positive' ? 'rgba(36,120,91,.52)' : 'rgba(203,101,85,.52)';
	});
};

const syncCurrencyButtons = () => {
	const sourceValue = converterFromSelect?.value || 'USD';
	const targetValue = converterToSelect?.value || 'RUB';
	currencyButtons.forEach((button) => {
		const field = button.dataset.currencyField;
		const value = field === 'from' ? sourceValue : targetValue;
		button.textContent = formatCurrencyCode(value);
	});
	const favoriteCards = document.querySelectorAll('.favorite-currency-card');
	favoriteCards.forEach((card) => {
		card.classList.toggle('selected', card.dataset.favoriteCurrency === sourceValue);
	});
	updateFocusCard(sourceValue);
};

const selectFavoriteCurrencyPair = (currencyCode) => {
	if (!converterFromSelect || !converterToSelect) return;
	converterFromSelect.value = currencyCode;
	converterToSelect.value = 'RUB';
	syncCurrencyButtons();
	updateConverter();

	const cryptoPairMap = {
		USD: 'BTCUSDT',
		EUR: 'ETHUSDT',
		CNY: 'SOLUSDT',
	};
	if (cryptoPair && cryptoPairMap[currencyCode]) {
		cryptoPair.value = cryptoPairMap[currencyCode];
		if (typeof loadCryptoCandles === 'function') {
			loadCryptoCandles();
		}
	}
	if (typeof showSuccess === 'function') {
		showSuccess(`Выбрана пара ${currencyCode} / RUB · график обновлён`);
	}
};

const openCurrencyModal = (field) => {
	activeCurrencyField = field;
	if (!currencyModal) return;
	currencyModal.hidden = false;
	document.querySelectorAll('.currency-choice').forEach((button) => {
		button.classList.toggle('active', button.dataset.currency === (field === 'from' ? converterFromSelect?.value || 'USD' : converterToSelect?.value || 'RUB'));
	});
};

const applyCurrencyChoice = (currencyCode) => {
	if (!converterFromSelect || !converterToSelect) return;
	const targetSelect = activeCurrencyField === 'from' ? converterFromSelect : converterToSelect;
	const otherSelect = activeCurrencyField === 'from' ? converterToSelect : converterFromSelect;
	if (targetSelect.value === currencyCode) {
		if (currencyModal) currencyModal.hidden = true;
		return;
	}
	targetSelect.value = currencyCode;
	if (converterFromSelect.value === converterToSelect.value) {
		otherSelect.value = activeCurrencyField === 'from' ? 'RUB' : 'USD';
	}
	syncCurrencyButtons();
	updateConverter();
	if (currencyModal) currencyModal.hidden = true;
};

	const initChartTooltip = () => {
		if (!cryptoChartElement) return;
		const tooltip = document.createElement('div');
		tooltip.className = 'chart-hover-tooltip';
		tooltip.hidden = true;
		cryptoChartElement.appendChild(tooltip);

		if (!cryptoChart) return;
		cryptoChart.subscribeCrosshairMove((param) => {
			if (!param.point || !param.seriesData || !param.seriesData.get) {
				tooltip.hidden = true;
				return;
			}
			const candle = param.seriesData.get(candleSeries) || param.seriesData.get?.(candleSeries);
			if (!candle || !candle.close) {
				tooltip.hidden = true;
				return;
			}
			tooltip.textContent = `${formatCryptoPrice(candle.close)} USDT`;
			tooltip.hidden = false;
			tooltip.style.left = `${Math.min(Math.max(param.point.x + 12, 14), cryptoChartElement.clientWidth - 70)}px`;
			tooltip.style.top = `${Math.max(param.point.y - 28, 12)}px`;
		});
	};

if (converter) {
	const amountInput = converter.querySelector('input[type="number"]');
	const fromSelect = converter.querySelector('.converter-from');
	const toSelect = converter.querySelector('.converter-to');
	const submitButton = converter.querySelector('.converter-submit');
	const swapButton = document.getElementById('swap-currencies');

	if (!fromSelect || !toSelect) {
		const fallbackFrom = document.createElement('select');
		fallbackFrom.className = 'converter-from';
		fallbackFrom.hidden = true;
		fallbackFrom.innerHTML = '<option value="USD">USD</option><option value="EUR">EUR</option><option value="RUB">RUB</option><option value="CNY">CNY</option><option value="GBP">GBP</option><option value="AED">AED</option>';
		const fallbackTo = document.createElement('select');
		fallbackTo.className = 'converter-to';
		fallbackTo.hidden = true;
		fallbackTo.innerHTML = '<option value="RUB">RUB</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="CNY">CNY</option><option value="GBP">GBP</option><option value="AED">AED</option>';
		converter.appendChild(fallbackFrom);
		converter.appendChild(fallbackTo);
	}

	const currentFrom = document.querySelector('.converter-from');
	const currentTo = document.querySelector('.converter-to');
	converterFromSelect = currentFrom;
	converterToSelect = currentTo;
	amountInput?.addEventListener('input', updateConverter);
	currentFrom?.addEventListener('change', () => { syncCurrencyButtons(); updateConverter(); });
	currentTo?.addEventListener('change', () => { syncCurrencyButtons(); updateConverter(); });
	submitButton?.addEventListener('click', executeConverter);
	swapButton?.addEventListener('click', () => {
		const previousFrom = currentFrom.value;
		currentFrom.value = currentTo.value;
		currentTo.value = previousFrom;
		syncCurrencyButtons();
		updateConverter();
	});
	document.querySelectorAll('.currency-pill').forEach((button) => {
		button.addEventListener('click', () => openCurrencyModal(button.dataset.currencyField));
	});
	document.querySelectorAll('.favorite-currency-card').forEach((card) => {
		card.addEventListener('click', () => selectFavoriteCurrencyPair(card.dataset.favoriteCurrency));
		card.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				selectFavoriteCurrencyPair(card.dataset.favoriteCurrency);
			}
		});
	});
	document.querySelectorAll('.currency-choice').forEach((button) => {
		button.addEventListener('click', () => applyCurrencyChoice(button.dataset.currency));
	});
	document.querySelector('.all-currency-button')?.addEventListener('click', () => openCurrencyModal('from'));
	syncCurrencyButtons();
	updateConverter();
	updateBalanceUI();
}

const getApiBase = () => window.WIND_API_URL || window.location.origin;

const apiBase = getApiBase();
const authGate = document.querySelector('#auth-gate');
const authForm = document.querySelector('#auth-form');
const authTitle = document.querySelector('#auth-title');
const authSubmitLabel = document.querySelector('#auth-submit-label');
const authError = document.querySelector('#auth-error');
const usernameField = document.querySelector('#auth-username');
const emailField = document.querySelector('#auth-email');
const passwordField = document.querySelector('#auth-password');
const demoLoginButton = document.querySelector('#demo-login-button');
const demoCredentials = { email: 'demo@example.com', password: 'demo123456' };
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

const fillDemoCredentials = () => {
	if (!emailField || !passwordField) return;
	setAuthMode('login');
	emailField.value = demoCredentials.email;
	passwordField.value = demoCredentials.password;
};

document.querySelectorAll('[data-auth-mode]').forEach((button) => {
	button.addEventListener('click', () => setAuthMode(button.dataset.authMode));
});

demoLoginButton?.addEventListener('click', async () => {
	fillDemoCredentials();
	authError.textContent = '';
	authForm.requestSubmit();
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
		authError.textContent = error instanceof TypeError
			? `API недоступен: ${apiBase}. Откройте страницу через http://localhost:8000/sitefinance/site.html и используйте demo@example.com / demo123456.`
			: error.message;
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
		activeCryptoPrice = candles[candles.length - 1].close;
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
		activeCryptoPrice = candle.close;
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
	initChartTooltip();
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

(() => {
	const modal = document.getElementById('crypto-topup-modal');
	const topup = document.getElementById('topup-modal');
	if (!modal || !topup) return;

	const COINS = {
		USDT: { networks: ['TRC20', 'BEP20', 'ERC20'], decimals: 2 },
		BTC: { networks: ['Bitcoin'], decimals: 8 },
		ETH: { networks: ['ERC20'], decimals: 6 },
		SOL: { networks: ['Solana'], decimals: 4 },
	};
	const priceUsd = { USDT: 1, BTC: 65000, ETH: 3200, SOL: 150 }; // запасные цены
	const $ = (id) => document.getElementById(id);
	const ui = {
		network: $('crypto-network'), rub: $('crypto-rub'), pay: $('crypto-pay-amount'), rate: $('crypto-rate'),
		address: $('crypto-address'), link: $('crypto-link'), qr: $('crypto-qr'), timer: $('crypto-timer'), paid: $('crypto-paid'),
	};
	let coin = 'USDT', rub = 5000, timerId = 0, qr = null, invoice = null, seq = 0;

	const fmt = (n, d = 2) => Number(n).toLocaleString('ru-RU', { maximumFractionDigits: d });

	const getRub = () => {
		const custom = Number(document.querySelector('#custom-topup-amount')?.value || 0);
		if (custom > 0) return custom;
		return Number(topup.querySelector('.amount-option.active')?.dataset.amount || 5000);
	};

	// ДЕМО-счёт. В настоящей версии счёт создаёт сервер (см. POST /payments/crypto ниже).
	const demoInvoice = () => ({ address: `DEMO-${coin}-${Math.random().toString(36).slice(2, 10).toUpperCase()}-NOT-REAL`, demo: true });

	const createInvoice = async () => {
		try {
			const token = localStorage.getItem('wind_access_token');
			const r = await fetch(`${apiBase}/payments/crypto`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ coin, network: ui.network.value, amount_rub: rub }),
			});
			if (!r.ok) throw new Error('no api');
			const d = await r.json();
			return { address: d.address, payUrl: d.pay_url, demo: false };
		} catch (e) {
			return demoInvoice();
		}
	};

	// ссылка-кошелёк (по ней же строится QR)
	const buildUri = (address, amount) => {
		const a = amount.toFixed(COINS[coin].decimals);
		if (coin === 'BTC') return `bitcoin:${address}?amount=${a}`;
		if (coin === 'SOL') return `solana:${address}?amount=${a}`;
		return address; // USDT / ETH: у кошельков нет единого формата ссылки, в QR кладём адрес
	};

	const drawQr = (text) => {
		if (!window.QRCode) { ui.qr.textContent = 'QR недоступен: не загрузилась библиотека'; return; }
		if (!qr) {
			ui.qr.textContent = '';
			qr = new QRCode(ui.qr, { text, width: 180, height: 180, colorDark: '#17201d', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
		} else {
			qr.clear();
			qr.makeCode(text);
		}
	};

	const render = () => {
		const c = COINS[coin];
		const amount = rub / CURRENCY_RATES.USD / priceUsd[coin];
		ui.rub.textContent = `${fmt(rub, 0)} ₽`;
		ui.pay.textContent = `${fmt(amount, c.decimals)} ${coin}`;
		ui.rate.textContent = `1 ${coin} ≈ ${fmt(priceUsd[coin] * CURRENCY_RATES.USD, 2)} ₽`;
		if (!invoice) return;

		const uri = invoice.payUrl || buildUri(invoice.address, amount);
		ui.address.textContent = invoice.address;
		ui.link.textContent = uri;
		if (uri.includes(':')) ui.link.setAttribute('href', uri); else ui.link.removeAttribute('href');
		drawQr(uri);
		modal.querySelectorAll('.crypto-demo-tag').forEach((t) => { t.hidden = !invoice.demo; });
	};

	const fillNetworks = () => {
		ui.network.innerHTML = COINS[coin].networks.map((n) => `<option value="${n}">${n}</option>`).join('');
	};

	const startTimer = () => {
		clearInterval(timerId);
		const expires = Date.now() + 30 * 60 * 1000;
		ui.paid.disabled = false;
		const tick = () => {
			const left = Math.max(0, expires - Date.now());
			ui.timer.textContent = `${String(Math.floor(left / 60000)).padStart(2, '0')}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`;
			if (!left) { clearInterval(timerId); ui.timer.textContent = 'время вышло'; ui.paid.disabled = true; }
		};
		tick();
		timerId = setInterval(tick, 1000);
	};

	const refresh = async () => {
		const id = ++seq;
		invoice = null;
		ui.address.textContent = 'Создаём счёт…';
		ui.link.textContent = '…';
		ui.link.removeAttribute('href');
		render();
		const inv = await createInvoice();
		if (id !== seq) return; // пока ждали, пользователь выбрал другую монету
		invoice = inv;
		render();
		startTimer();
	};

	const loadPrices = async () => {
		await Promise.all(['BTC', 'ETH', 'SOL'].map(async (c) => {
			try {
				const r = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${c}USDT`);
				const price = Number((await r.json()).result.list[0].lastPrice);
				if (price > 0) priceUsd[c] = price;
			} catch (e) { /* остаётся запасная цена */ }
		}));
		render(); // пересчитает сумму, ссылку и QR
	};

	const open = () => {
		rub = getRub();
		fillNetworks();
		modal.hidden = false;
		refresh();
		loadPrices();
	};

	// выбор «Криптовалюта» сразу открывает форму оплаты
	topup.querySelector('.payment-option[data-payment="crypto"]')?.addEventListener('click', () => {
		topup.querySelectorAll('.payment-option').forEach((o) => o.classList.toggle('active', o.dataset.payment === 'card'));
		closeModal(topup);
		open();
	});

	document.querySelectorAll('#crypto-coins .crypto-coin').forEach((btn) => {
		btn.addEventListener('click', () => {
			coin = btn.dataset.coin;
			document.querySelectorAll('#crypto-coins .crypto-coin').forEach((b) => b.classList.toggle('active', b === btn));
			fillNetworks();
			refresh();
		});
	});
	ui.network.addEventListener('change', refresh);

	modal.querySelectorAll('[data-copy]').forEach((btn) => {
		btn.addEventListener('click', async () => {
			try {
				await navigator.clipboard.writeText($(btn.dataset.copy).textContent);
				btn.textContent = 'Скопировано';
			} catch (e) {
				btn.textContent = 'Выдели вручную';
			}
			setTimeout(() => { btn.textContent = 'Копировать'; }, 1800);
		});
	});

	ui.paid.addEventListener('click', () => {
		closeModal(modal);
		showSuccess('Заявка создана. Баланс пополнится после подтверждений сети');
	});

	new MutationObserver(() => { if (modal.hidden) clearInterval(timerId); })
		.observe(modal, { attributes: true, attributeFilter: ['hidden'] });
})();

(() => {
	const form = document.getElementById('alert-form');
	if (!form) return;
	const $ = (id) => document.getElementById(id);
	const priceEl = $('alert-price'), hint = $('alert-hint'), listEl = $('alert-list'), countEl = $('alert-count');
	const currentEl = $('alert-current'), quickEl = $('alert-quick'), card = $('price-alerts');
	const KEY = 'wind_price_alerts', HKEY = 'wind_price_alerts_done';
	const MAX = 10;
	const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
	const PCTS = [1, 3, 5, 10];
	const prices = {};
	const rows = new Map();
	let symbol = 'BTCUSDT', dir = 'above', freshId = null;

	const load = (key) => {
		try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
	};
	const okDir = (d) => d === 'above' || d === 'below';
	let alerts = load(KEY)
		.filter((a) => a && typeof a.id === 'string' && SYMBOLS.includes(a.symbol) && okDir(a.dir) && Number(a.price) > 0)
		.map((a) => ({ id: a.id, symbol: a.symbol, dir: a.dir, price: Number(a.price), start: Number(a.start) > 0 ? Number(a.start) : null }));
	let history = load(HKEY)
		.filter((h) => h && SYMBOLS.includes(h.symbol) && okDir(h.dir) && Number(h.price) > 0)
		.slice(0, 3)
		.map((h) => ({ symbol: h.symbol, dir: h.dir, price: Number(h.price), time: String(h.time || '').slice(0, 20) }));

	const save = () => { try { localStorage.setItem(KEY, JSON.stringify(alerts)); } catch (e) { /* хранилище недоступно */ } };
	const saveHistory = () => { try { localStorage.setItem(HKEY, JSON.stringify(history)); } catch (e) { /* хранилище недоступно */ } };
	const fmtPrice = (p) => Number(p).toLocaleString('ru-RU', { maximumFractionDigits: p >= 1000 ? 2 : p >= 1 ? 4 : 6 });
	const label = (s) => `${s.slice(0, -4)}/USDT`;
	const signed = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
	const nowTime = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
	const setHint = (text, kind = '') => { hint.textContent = text; hint.className = `alert-hint${kind ? ' ' + kind : ''}`; };
	const mk = (tag, cls, text) => {
		const n = document.createElement(tag);
		if (cls) n.className = cls;
		if (text != null) n.textContent = text;
		return n;
	};
	const icon = (name) => { const i = document.createElement('i'); i.setAttribute('data-lucide', name); return i; };

	const fetchPrice = async (s) => {
		const r = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${s}`);
		const price = Number((await r.json()).result.list[0].lastPrice);
		if (!(price > 0)) throw new Error('bad price');
		prices[s] = price;
		return price;
	};

	// ---- живая цена выбранной монеты ----
	const showCurrent = (tick) => {
		const p = prices[symbol];
		currentEl.textContent = p ? `${fmtPrice(p)} USDT` : '…';
		if (tick) {
			currentEl.classList.remove('tick-up', 'tick-down');
			void currentEl.offsetWidth;
			currentEl.classList.add(tick);
		}
	};

	// ---- быстрые уровни ----
	const buildQuick = () => {
		PCTS.forEach((p) => {
			const b = mk('button');
			b.type = 'button';
			b.dataset.pct = String(p);
			quickEl.appendChild(b);
		});
	};
	const updateQuick = () => {
		quickEl.querySelectorAll('button').forEach((b) => { b.textContent = `${dir === 'above' ? '+' : '−'}${b.dataset.pct}%`; });
	};
	const roundPrice = (v) => (v >= 1000 ? Math.round(v) : v >= 1 ? Number(v.toFixed(2)) : Number(v.toFixed(4)));
	quickEl.addEventListener('click', (e) => {
		const b = e.target.closest('button[data-pct]');
		const cur = prices[symbol];
		if (!b) return;
		if (!cur) { setHint('Ждём текущую цену, попробуй через секунду', 'error'); return; }
		const k = 1 + (dir === 'above' ? 1 : -1) * Number(b.dataset.pct) / 100;
		priceEl.value = String(roundPrice(cur * k));
		setHint('');
	});

	// ---- выбор монеты и условия ----
	const setSymbol = (s) => {
		if (!SYMBOLS.includes(s)) return;
		symbol = s;
		document.querySelectorAll('#alert-coins .alert-coin').forEach((b) => b.classList.toggle('active', b.dataset.symbol === s));
		showCurrent();
		if (!prices[s]) fetchPrice(s).then(() => { if (symbol === s) showCurrent(); }).catch(() => {});
	};
	document.querySelectorAll('#alert-coins .alert-coin').forEach((b) => {
		b.addEventListener('click', () => { setSymbol(b.dataset.symbol); priceEl.value = ''; setHint(''); });
	});
	document.querySelectorAll('#alert-dir button').forEach((b) => {
		b.addEventListener('click', () => {
			dir = b.dataset.dir;
			document.querySelectorAll('#alert-dir button').forEach((x) => x.classList.toggle('active', x === b));
			updateQuick();
			setHint('');
		});
	});

	// ---- список ----
	const progressOf = (a, cur) => {
		if (a.start == null || a.start === a.price) return 0;
		return Math.max(0, Math.min(1, (cur - a.start) / (a.price - a.start)));
	};
	const updateRow = (r) => {
		const a = r.a;
		const cur = prices[a.symbol];
		if (!cur) { r.small.textContent = 'Ждём цену…'; return; }
		if (a.start == null) { a.start = cur; save(); }
		r.small.textContent = `Сейчас ${fmtPrice(cur)} · до цели ${signed((a.price / cur - 1) * 100)}`;
		r.bar.style.width = `${Math.round(progressOf(a, cur) * 100)}%`;
	};

	const render = () => {
		countEl.textContent = `${alerts.length} / ${MAX}`;
		listEl.textContent = '';
		rows.clear();

		if (!alerts.length) {
			const e = mk('div', 'alert-empty');
			e.append(icon('bell-off'), mk('span', '', 'Активных уведомлений нет. Задай уровень выше, и мы напомним.'));
			listEl.appendChild(e);
		}

		alerts.forEach((a) => {
			const row = mk('div', `alert-item ${a.dir === 'above' ? 'up' : 'down'}${a.id === freshId ? ' fresh' : ''}`);
			const badge = mk('div', 'alert-badge');
			badge.appendChild(icon(a.dir === 'above' ? 'trending-up' : 'trending-down'));
			const main = mk('div', 'alert-main');
			const small = mk('small', '', 'Ждём цену…');
			main.append(mk('strong', '', `${label(a.symbol)} ${a.dir === 'above' ? '≥' : '≤'} ${fmtPrice(a.price)} USDT`), small);
			const del = mk('button', 'alert-delete', '×');
			del.type = 'button';
			del.setAttribute('aria-label', 'Удалить уведомление');
			del.addEventListener('click', () => { alerts = alerts.filter((x) => x.id !== a.id); save(); render(); });
			const bar = mk('span');
			const track = mk('div', 'alert-progress');
			track.appendChild(bar);
			row.append(badge, main, del, track);
			listEl.appendChild(row);
			rows.set(a.id, { a, small, bar });
		});
		freshId = null;

		if (history.length) {
			listEl.appendChild(mk('div', 'alert-sub', 'Сработавшие'));
			history.forEach((h, i) => {
				const row = mk('div', `alert-item done ${h.dir === 'above' ? 'up' : 'down'}`);
				const badge = mk('div', 'alert-badge');
				badge.appendChild(icon('check'));
				const main = mk('div', 'alert-main');
				main.append(mk('strong', '', `${label(h.symbol)} ${h.dir === 'above' ? '≥' : '≤'} ${fmtPrice(h.price)} USDT`), mk('small', '', `Сработало${h.time ? ' в ' + h.time : ''}`));
				const del = mk('button', 'alert-delete', '×');
				del.type = 'button';
				del.setAttribute('aria-label', 'Убрать из списка');
				del.addEventListener('click', () => { history.splice(i, 1); saveHistory(); render(); });
				row.append(badge, main, del);
				listEl.appendChild(row);
			});
		}

		if (window.lucide) window.lucide.createIcons();
		void listEl.offsetWidth; // чтобы полосы прогресса плавно заполнились с нуля
		rows.forEach(updateRow);
	};

	// ---- срабатывание ----
	const fire = (a, price) => {
		const msg = `${label(a.symbol)} ${a.dir === 'above' ? 'достиг' : 'опустился до'} ${fmtPrice(a.price)} USDT`;
		portfolioNotifications.unshift({ type: 'alert', title: msg, detail: `Сейчас ${fmtPrice(price)} USDT`, time: nowTime() });
		portfolioNotifications.splice(20);
		renderNotifications();
		showSuccess(msg);
		card.classList.remove('fired');
		void card.offsetWidth;
		card.classList.add('fired');
		setTimeout(() => card.classList.remove('fired'), 1400);
		try {
			if ('Notification' in window && Notification.permission === 'granted') new Notification('Wind Finance', { body: msg });
		} catch (e) { /* системные уведомления недоступны */ }
	};

	const check = async () => {
		const before = prices[symbol];
		const symbols = [...new Set([symbol, ...alerts.map((a) => a.symbol)])];
		await Promise.all(symbols.map((s) => fetchPrice(s).catch(() => {})));
		const after = prices[symbol];
		showCurrent(before && after && before !== after ? (after > before ? 'tick-up' : 'tick-down') : undefined);

		const hit = alerts.filter((a) => prices[a.symbol] && (a.dir === 'above' ? prices[a.symbol] >= a.price : prices[a.symbol] <= a.price));
		if (hit.length) {
			alerts = alerts.filter((a) => !hit.includes(a));
			hit.forEach((a) => {
				history.unshift({ symbol: a.symbol, dir: a.dir, price: a.price, time: nowTime() });
				fire(a, prices[a.symbol]);
			});
			history = history.slice(0, 3);
			save();
			saveHistory();
			render();
		} else {
			rows.forEach(updateRow);
		}
	};

	// ---- создание ----
	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		const price = Number(priceEl.value);
		if (!(price > 0)) { setHint('Введи цену больше нуля', 'error'); return; }
		if (alerts.length >= MAX) { setHint(`Максимум ${MAX} уведомлений. Удали ненужные.`, 'error'); return; }
		if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});

		let current;
		try { current = await fetchPrice(symbol); } catch (e) { setHint('Не удалось получить текущую цену. Попробуй ещё раз.', 'error'); return; }
		showCurrent();
		if (dir === 'above' ? current >= price : current <= price) {
			setHint(`Цена уже ${dir === 'above' ? 'выше' : 'ниже'} этого уровня (сейчас ${fmtPrice(current)} USDT)`, 'error');
			return;
		}
		const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
		alerts.push({ id, symbol, dir, price, start: current });
		freshId = id;
		save();
		priceEl.value = '';
		render();
		setHint(`Готово! Напомним, когда ${label(symbol)} ${dir === 'above' ? 'поднимется' : 'опустится'} до ${fmtPrice(price)} USDT`, 'ok');
	});

	// выбранная в терминале пара подставляется сама
	if (typeof cryptoPair !== 'undefined' && cryptoPair) {
		const sync = () => setSymbol(cryptoPair.value);
		sync();
		cryptoPair.addEventListener('change', sync);
	}

	buildQuick();
	updateQuick();
	render();
	check();
	setInterval(check, 10000);
})();

(() => {
	const modal = document.getElementById('article-modal');
	if (!modal) return;
	const $ = (id) => document.getElementById(id);
	const el = { tag: $('article-tag'), info: $('article-info'), title: $('article-title'), body: $('article-body'), quiz: $('article-quiz'), note: $('article-note'), action: $('article-action') };
	const NOTE_NEWS = 'Демонстрационный материал. Не является инвестиционной рекомендацией.';
	const NOTE_EDU = 'Учебный материал. Не является инвестиционной рекомендацией.';

	const NEWS = {
		btc: {
			tag: 'BTC', tagClass: 'positive-tag', info: '12 мин назад · Позитивно · 3 мин чтения',
			title: 'Биткоин удерживает уровень после резкого роста объёмов',
			paragraphs: [
				'Всплеск торговых объёмов часто сопровождает попытку пробить значимый уровень. Если после такого движения цена не откатывается, это обычно трактуют как признак того, что покупатели готовы удерживать позиции.',
				'Но один рост объёма не гарантирует продолжения тренда. Трейдеры ждут подтверждения: закрепления цены выше локального сопротивления на нескольких свечах и сохранения высокой активности на этом уровне.',
				'Что стоит наблюдать: поведение цены у ближайшего сопротивления, соотношение объёма на росте и на коррекции, реакцию рынка на макроэкономические новости. При ложном пробое цена быстро возвращается ниже уровня, и именно для таких случаев используют стоп-приказы.',
			],
		},
		eth: {
			tag: 'ETH', tagClass: 'purple-tag', info: '28 мин назад · Нейтрально · 3 мин чтения',
			title: 'Экосистема Ethereum готовится к новой волне активности',
			paragraphs: [
				'Об оживлении сети судят по нескольким показателям: числу транзакций, размеру комиссий, количеству активных адресов и объёму средств, заблокированных в приложениях.',
				'Рост активности не всегда означает рост цены. Иногда сеть загружена из-за популярного запуска, а на котировках это почти не сказывается. И наоборот, цена может расти на ожиданиях, пока сама сеть остаётся спокойной.',
				'Для оценки полезно сравнивать несколько метрик за одинаковый период и смотреть, подтверждает ли их движение график цены.',
			],
		},
		volume: {
			tag: 'Рынок', tagClass: 'amber-tag', info: '41 мин назад · Важно для волатильности · 2 мин чтения',
			title: 'Объём торгов на споте вырос перед открытием США',
			paragraphs: [
				'Перед открытием американской сессии на рынке обычно становится больше участников. Растут объёмы, и вместе с ними нередко вырастает волатильность.',
				'При высокой волатильности цена движется быстрее, а исполнение рыночных заявок может проходить с проскальзыванием: сделка совершится по цене хуже ожидаемой. Лимитные заявки помогают контролировать цену входа.',
				'В такие часы разумно не увеличивать размер позиции из азарта и заранее определить уровень, на котором ты закроешь сделку, если рынок пойдёт против тебя.',
			],
		},
		reserves: {
			tag: 'Регуляция', tagClass: 'teal-tag', info: '1 ч назад · Долгосрочно позитивно · 4 мин чтения',
			title: 'Крупные площадки усиливают прозрачность резервов',
			paragraphs: [
				'Доказательство резервов (proof of reserves) — способ показать, что у площадки действительно есть активы, которые она хранит для клиентов. Данные публикуются так, чтобы их можно было проверить независимо.',
				'У метода есть ограничения. Он подтверждает наличие активов, но не всегда показывает обязательства площадки. Поэтому его считают одним из признаков надёжности, а не полной гарантией.',
				'Практический вывод для пользователя: не держи на бирже больше, чем готов потерять, а долгосрочные накопления храни на кошельке, где приватные ключи есть только у тебя.',
			],
		},
	};

	const LESSONS = [
		{
			id: 'blockchain', icon: 'blocks', level: 'Новичок', minutes: 4,
			title: 'Что такое криптовалюта и блокчейн', desc: 'Как устроен общий журнал операций и кому принадлежат монеты.',
			paragraphs: [
				'Криптовалюта — цифровой актив, учёт которого ведётся не в одном банке, а в распределённой сети компьютеров. Все операции записываются в блокчейн — общий журнал, где записи нельзя тихо изменить задним числом.',
				'Каждая запись (блок) связана с предыдущей через криптографический хеш. Чтобы подделать старую операцию, пришлось бы пересчитать всю цепочку после неё, а сеть отвергнет такую подделку.',
				'Владение подтверждается ключами: публичный адрес похож на номер счёта, приватный ключ — на подпись. Кто знает приватный ключ, тот управляет средствами, поэтому его нельзя никому передавать.',
			],
			quiz: { q: 'Что подтверждает право распоряжаться криптовалютой?', options: ['Публичный адрес', 'Приватный ключ', 'Название сети'], answer: 1, why: 'Приватный ключ позволяет подписывать операции, поэтому его хранят в тайне.' },
		},
		{
			id: 'candles', icon: 'trending-up', level: 'Новичок', minutes: 5,
			title: 'Как читать свечной график', desc: 'Тело, тени и цвет свечи: что они говорят о цене.',
			paragraphs: [
				'Каждая свеча показывает движение цены за выбранный период. На твоём графике это 15 минут, 1 час, 4 часа или 1 день.',
				'Тело свечи — расстояние между ценой открытия и закрытия. Тонкие линии (тени) показывают максимум и минимум за период. Зелёная свеча означает, что цена закрылась выше открытия, красная — ниже.',
				'Длинная тень говорит, что цена заходила далеко, но вернулась: рынок отверг этот уровень. Один график не даёт прогноза, поэтому смотри на несколько таймфреймов и не принимай решение по одной свече.',
			],
			quiz: { q: 'Что показывают тени свечи?', options: ['Цену открытия и закрытия', 'Максимум и минимум за период', 'Объём торгов'], answer: 1, why: 'Верхняя тень — максимум периода, нижняя — минимум.' },
		},
		{
			id: 'networks', icon: 'network', level: 'Новичок', minutes: 4,
			title: 'Сети и адреса: не потерять перевод', desc: 'Почему USDT в разных сетях это не одно и то же.',
			paragraphs: [
				'Одна и та же монета может существовать в разных сетях. USDT, например, есть в TRC20, BEP20 и ERC20. Это разные блокчейны со своими адресами и комиссиями.',
				'Если отправить монету по сети, которую получатель не поддерживает, средства обычно не вернуть. Поэтому перед переводом сверяй сеть у отправителя и у получателя.',
				'Полезная привычка: сначала отправь небольшую тестовую сумму, дождись зачисления и только потом переводи основную. Проверяй адрес целиком, а не только первые символы.',
			],
			quiz: { q: 'Что сделать перед крупным переводом?', options: ['Отправить сразу всю сумму', 'Проверить сеть и сделать тестовый перевод', 'Выбрать любую сеть, они одинаковые'], answer: 1, why: 'Тестовый перевод стоит копейки, а ошибка в сети может стоить всей суммы.' },
		},
		{
			id: 'risk', icon: 'shield-check', level: 'Средний', minutes: 6,
			title: 'Стоп-лосс и управление риском', desc: 'Как заранее ограничить убыток и посчитать размер позиции.',
			paragraphs: [
				'Рынок нельзя предсказать, но можно ограничить потери. Главное правило: заранее реши, сколько готов потерять в одной сделке. Частый ориентир — 1–2% от капитала.',
				'Стоп-лосс — заявка, которая закроет позицию при достижении заданной цены. Размер позиции считают от стопа: размер = допустимый убыток / расстояние до стопа в долях.',
				'Пример: капитал 100 000 ₽, риск 1% = 1 000 ₽. Если стоп стоит на 5% ниже входа, размер позиции будет 1 000 / 0,05 = 20 000 ₽.',
			],
			quiz: { q: 'Капитал 100 000 ₽, риск 1%, стоп в 5% от входа. Какой размер позиции?', options: ['5 000 ₽', '20 000 ₽', '50 000 ₽'], answer: 1, why: 'Допустимый убыток 1 000 ₽ делим на 0,05 и получаем 20 000 ₽.' },
		},
		{
			id: 'diversify', icon: 'layers', level: 'Средний', minutes: 5,
			title: 'Диверсификация портфеля', desc: 'Почему пять похожих монет не равны пяти разным активам.',
			paragraphs: [
				'Диверсификация — распределение денег между активами, которые ведут себя по-разному, чтобы падение одного не обрушило весь портфель.',
				'Недостаточно купить пять разных альткоинов: они часто падают одновременно с биткоином, то есть сильно коррелируют. Смешивай разные классы активов: облигации, акции, валюту и небольшую долю крипты.',
				'Доля рискованных активов зависит от срока и твоего запаса прочности: чем короче горизонт, тем меньше места для волатильных вложений. Периодически возвращай доли к плану — это называется ребалансировкой.',
			],
			quiz: { q: 'Что лучше снижает риск портфеля?', options: ['Пять похожих альткоинов', 'Активы разных классов', 'Всё в самый растущий актив'], answer: 1, why: 'Активы разных классов реже падают одновременно.' },
		},
		{
			id: 'scams', icon: 'triangle-alert', level: 'Новичок', minutes: 5,
			title: 'Мошенничество и рагпулл', desc: 'Как распознать схему и что никогда нельзя сообщать.',
			paragraphs: [
				'Рагпулл — схема, при которой создатели токена привлекают деньги, а затем выводят ликвидность и исчезают. Цена обваливается почти до нуля. Поэтому в игре Crypto Drop ящики с ☠ отнимают жизнь.',
				'Признаки риска: обещания гарантированной доходности, давление «успей сегодня», анонимная команда, невозможность продать токен, ажиотаж только в соцсетях.',
				'Золотые правила: никому не сообщай seed-фразу и приватный ключ, ни поддержке, ни «администраторам»; проверяй адрес сайта; не переходи по ссылкам из личных сообщений; вкладывай только то, что готов потерять.',
			],
			quiz: { q: 'Кому можно сообщить seed-фразу?', options: ['Поддержке биржи', 'Никому', 'Администратору чата'], answer: 1, why: 'Настоящая поддержка никогда не просит seed-фразу. Любой, кто просит, мошенник.' },
		},
	];

	// прогресс обучения
	const DONE_KEY = 'wind_lessons_done';
	let done = [];
	try { done = JSON.parse(localStorage.getItem(DONE_KEY) || '[]'); } catch (e) { done = []; }
	if (!Array.isArray(done)) done = [];
	const isDone = (id) => done.includes(id);
	let syncAction = null;

	const markDone = (id) => {
		if (!isDone(id)) {
			done.push(id);
			try { localStorage.setItem(DONE_KEY, JSON.stringify(done)); } catch (e) { /* хранилище недоступно */ }
		}
		renderEdu();
		if (syncAction) syncAction();
	};

	const renderQuiz = (lesson) => {
		const q = document.createElement('p');
		q.className = 'quiz-q';
		q.textContent = lesson.quiz.q;
		const list = document.createElement('div');
		list.className = 'quiz-options';
		const fb = document.createElement('p');
		fb.className = 'quiz-feedback';
		let answered = false;
		lesson.quiz.options.forEach((text, i) => {
			const b = document.createElement('button');
			b.type = 'button';
			b.className = 'quiz-option';
			b.textContent = text;
			b.addEventListener('click', () => {
				if (answered) return;
				if (i !== lesson.quiz.answer) {
					b.classList.add('wrong');
					b.disabled = true;
					fb.textContent = 'Не совсем. Попробуй ещё раз.';
					return;
				}
				answered = true;
				b.classList.add('correct');
				fb.textContent = `Верно! ${lesson.quiz.why}`;
				markDone(lesson.id);
			});
			list.appendChild(b);
		});
		el.quiz.append(q, list, fb);
		el.quiz.hidden = false;
	};

	const renderAction = (lesson) => {
		syncAction = () => {
			el.action.textContent = isDone(lesson.id) ? 'Урок пройден ✓' : 'Отметить пройденным';
			el.action.disabled = isDone(lesson.id);
		};
		el.action.hidden = false;
		el.action.onclick = () => markDone(lesson.id);
		syncAction();
	};

	const openArticle = ({ tag, tagClass, info, title, paragraphs, note, lesson }) => {
		el.tag.textContent = tag;
		el.tag.className = `news-tag ${tagClass}`;
		el.info.textContent = info;
		el.title.textContent = title;
		el.body.textContent = '';
		paragraphs.forEach((t) => {
			const p = document.createElement('p');
			p.textContent = t;
			el.body.appendChild(p);
		});
		el.note.textContent = note;
		el.quiz.textContent = '';
		el.quiz.hidden = true;
		el.action.hidden = true;
		el.action.onclick = null;
		syncAction = null;
		if (lesson) { renderQuiz(lesson); renderAction(lesson); }
		modal.hidden = false;
		modal.querySelector('.article-card').scrollTop = 0;
	};

	const bindOpen = (node, open) => {
		node.addEventListener('click', open);
		node.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
		});
	};

	// новости
	document.querySelectorAll('[data-news]').forEach((card) => {
		bindOpen(card, () => {
			const n = NEWS[card.dataset.news];
			if (n) openArticle({ ...n, note: NOTE_NEWS });
		});
	});

	// обучение
	const renderEdu = () => {
		const grid = $('edu-grid');
		if (!grid) return;
		grid.textContent = '';
		LESSONS.forEach((l) => {
			const card = document.createElement('article');
			card.className = `edu-card card${isDone(l.id) ? ' done' : ''}`;
			card.tabIndex = 0;
			card.setAttribute('role', 'button');
			card.setAttribute('aria-label', `Открыть урок: ${l.title}`);
			card.innerHTML = `
				<span class="edu-icon"><i data-lucide="${l.icon}"></i></span>
				<div>
					<div class="edu-meta"><span class="edu-level">${l.level}</span><span>${l.minutes} мин</span></div>
					<h4>${l.title}</h4>
					<p>${l.desc}</p>
				</div>
				<span class="edu-done">✓</span>`;
			bindOpen(card, () => openArticle({
				tag: l.level, tagClass: 'positive-tag', info: `${l.minutes} мин чтения · урок`,
				title: l.title, paragraphs: l.paragraphs, note: NOTE_EDU, lesson: l,
			}));
			grid.appendChild(card);
		});
		const count = LESSONS.filter((l) => isDone(l.id)).length;
		$('edu-progress-text').textContent = `Пройдено ${count} из ${LESSONS.length}`;
		$('edu-progress-bar').style.width = `${(count / LESSONS.length) * 100}%`;
		if (window.lucide) window.lucide.createIcons();
	};

	// вкладки «Новости» / «Обучение»
	const TABS = {
		news: { title: 'Новости рынка', sub: 'Коротко о том, что двигает криптовалюты' },
		edu: { title: 'Обучение', sub: 'Короткие уроки с проверкой знаний' },
	};
	document.querySelectorAll('[data-learn-tab]').forEach((btn) => {
		btn.addEventListener('click', () => {
			const tab = btn.dataset.learnTab;
			document.querySelectorAll('[data-learn-tab]').forEach((b) => b.classList.toggle('active', b === btn));
			$('learn-news').hidden = tab !== 'news';
			$('learn-edu').hidden = tab !== 'edu';
			$('learn-title').textContent = TABS[tab].title;
			$('learn-sub').textContent = TABS[tab].sub;
		});
	});

	renderEdu();
})();

(() => {
	const cards = document.querySelectorAll('.invest-card');
	if (!cards.length) return;
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reduce || !('IntersectionObserver' in window)) return; // без анимации остаются готовые значения из HTML

	const counters = document.querySelectorAll('.invest-card [data-count]');
	counters.forEach((n) => { n.dataset.final = n.textContent; });

	const animate = (node) => {
		cancelAnimationFrame(node._raf);
		const to = Number(node.dataset.count);
		const dec = Number(node.dataset.decimals || 0);
		const pre = node.dataset.prefix || '';
		const suf = node.dataset.suffix || '';
		const start = performance.now();
		const step = (now) => {
			const k = Math.min(1, (now - start) / 1100);
			const v = to * (1 - Math.pow(1 - k, 3));
			node.textContent = pre + v.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
			if (k < 1) node._raf = requestAnimationFrame(step);
			else node.textContent = node.dataset.final;
		};
		node._raf = requestAnimationFrame(step);
	};

	document.documentElement.classList.add('inv-anim');
	const io = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			const card = entry.target;
			if (entry.isIntersecting) {
				card.classList.add('in-view');
				card.querySelectorAll('[data-count]').forEach(animate);
			} else {
				card.classList.remove('in-view'); // при следующем показе анимация сыграет заново
				card.querySelectorAll('[data-count]').forEach((n) => { cancelAnimationFrame(n._raf); n.textContent = n.dataset.final; });
			}
		});
	}, { threshold: 0.2 });
	cards.forEach((c) => io.observe(c));
})();

(() => {
	const modal = document.getElementById('buy-asset-modal');
	if (!modal) return;
	const $ = (id) => document.getElementById(id);
	const ui = {
		title: $('buy-asset-title'), price: $('buy-asset-price'), name: $('buy-asset-name'), qty: $('buy-asset-qty'),
		sum: $('buy-asset-sum'), balance: $('buy-asset-balance'), amount: $('buy-asset-amount'), error: $('buy-asset-error'),
		confirm: $('buy-asset-confirm'),
	};
	const presets = modal.querySelectorAll('#buy-asset-presets .amount-option');
	let asset = null;

	const fmt = (n, d = 2) => Number(n).toLocaleString('ru-RU', { maximumFractionDigits: d });
	const getBalance = () => {
		const node = document.querySelector('.wallet-balance strong');
		return Number((node?.dataset.fxFinal || node?.textContent || '').replace(/\D/g, '')) || 0;
	};
	const getAmount = () => {
		const custom = Number(ui.amount.value || 0);
		if (custom > 0) return custom;
		return Number(modal.querySelector('#buy-asset-presets .amount-option.active')?.dataset.amount || 0);
	};

	const render = () => {
		if (!asset) return;
		const amount = getAmount();
		ui.qty.textContent = `${fmt(amount / asset.price, 4)} ${asset.unit}`;
		ui.sum.textContent = `${fmt(amount)} ₽`;
		ui.balance.textContent = `${fmt(getBalance(), 0)} ₽`;
		ui.error.textContent = '';
	};

	document.querySelectorAll('[data-buy-asset]').forEach((btn) => {
		btn.addEventListener('click', () => {
			const card = btn.closest('.invest-card');
			if (!card) return;
			asset = { name: card.dataset.assetName, price: Number(card.dataset.price), unit: card.dataset.unit || 'ед.' };
			if (!(asset.price > 0)) return;
			ui.title.textContent = `Купить: ${asset.name}`;
			ui.name.textContent = asset.name;
			ui.price.textContent = `${fmt(asset.price)} ₽`;
			ui.amount.value = '';
			presets.forEach((p) => p.classList.toggle('active', p.dataset.amount === '5000'));
			render();
			modal.hidden = false;
		});
	});

	presets.forEach((p) => {
		p.addEventListener('click', () => {
			presets.forEach((x) => x.classList.toggle('active', x === p));
			ui.amount.value = '';
			render();
		});
	});
	ui.amount.addEventListener('input', () => {
		presets.forEach((x) => x.classList.remove('active'));
		render();
	});

	ui.confirm.addEventListener('click', () => {
		if (!asset) return;
		const amount = getAmount();
		if (amount < 100) { ui.error.textContent = 'Минимальная сумма — 100 ₽'; return; }
		if (amount > getBalance()) { ui.error.textContent = 'Недостаточно средств на балансе'; return; }
		const qty = fmt(amount / asset.price, 4);
		closeModal(modal);
		showSuccess(`Куплено ${qty} ${asset.unit} «${asset.name}» на ${fmt(amount)} ₽`);
		portfolioNotifications.unshift({
			type: 'neutral', title: `Покупка: ${asset.name}`, detail: `${qty} ${asset.unit} на ${fmt(amount)} ₽`,
			time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
		});
		portfolioNotifications.splice(20);
		renderNotifications();
	});
})();

(() => {
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const $ = (id) => document.getElementById(id);

	// ---------- «вспышка» цены и «прыжок» результата (работают и при reduce-motion только как класс, без движения не мешают) ----------
	const price = $('crypto-price-label');
	if (price && !reduce) {
		let last = null;
		new MutationObserver(() => {
			const v = Number(price.textContent.replace(/[^\d,]/g, '').replace(',', '.'));
			if (!v) { last = null; return; }
			if (last !== null && v !== last) {
				price.classList.remove('flash-up', 'flash-down');
				void price.offsetWidth;
				price.classList.add(v > last ? 'flash-up' : 'flash-down');
			}
			last = v;
		}).observe(price, { childList: true, characterData: true, subtree: true });
	}
	const out = document.querySelector('.converter-output');
	if (out && !reduce) {
		new MutationObserver(() => {
			out.classList.remove('bump');
			void out.offsetWidth;
			out.classList.add('bump');
		}).observe(out, { childList: true, characterData: true, subtree: true });
	}

	if (reduce || !('IntersectionObserver' in window)) return;

	// ---------- что появляется с анимацией ----------
	const REVEAL = [
		'.topbar', '.brand', '.nav a', '.sidebar-bottom',
		'.wallet-bar', '.focus-card', '.stats-card', '.stat-row', '#converter .converter', '.course', '.section-heading',
		'.crypto-terminal', '.alerts-card', '.crypto-news-feature', '.crypto-news-item', '.edu-progress', '.edu-card',
		'.profile-hero', '.portfolio-card', '.portfolio-item', '.ledger-row',
		'.settings-card', '.setting-item', '.insight-item', '.cg-card',
	].join(',');

	// какие числа «набегают»
	const NUMS = '.wallet-balance strong, .stat-value, .course .rate-change, .portfolio-summary strong, .settings-summary strong, .portfolio-side span, .portfolio-side em, .ledger-row b';

	const parse = (text) => {
		const m = text.trim().match(/^([^\d]*)(\d[\d\s\u00a0\u202f]*(?:,\d+)?)([^\d]*)$/);
		if (!m) return null;
		const num = Number(m[2].replace(/[\s\u00a0\u202f]/g, '').replace(',', '.'));
		if (!Number.isFinite(num)) return null;
		return { pre: m[1], suf: m[3], num, dec: m[2].includes(',') ? m[2].split(',')[1].length : 0 };
	};

	const runNum = (n) => {
		cancelAnimationFrame(n._raf);
		const d = n._fx;
		const start = performance.now();
		const step = (now) => {
			const k = Math.min(1, (now - start) / 1000);
			const v = d.num * (1 - Math.pow(1 - k, 3));
			n.textContent = d.pre + v.toLocaleString('ru-RU', { minimumFractionDigits: d.dec, maximumFractionDigits: d.dec }) + d.suf;
			if (k < 1) n._raf = requestAnimationFrame(step);
			else n.textContent = n.dataset.fxFinal;
		};
		n._raf = requestAnimationFrame(step);
	};
	const resetNum = (n) => { cancelAnimationFrame(n._raf); n.textContent = n.dataset.fxFinal; };

	const io = new IntersectionObserver((entries) => {
		entries.forEach(({ target, isIntersecting }) => target.classList.toggle('in-view', isIntersecting));
	}, { threshold: 0.12 });

	const ioNum = new IntersectionObserver((entries) => {
		entries.forEach(({ target, isIntersecting }) => (isIntersecting ? runNum(target) : resetNum(target)));
	}, { threshold: 0.3 });

	const tagged = new Set();
	const numbers = new Set();

	const scan = () => {
		document.documentElement.classList.add('fx-ready');
		const counts = new Map();
		document.querySelectorAll(REVEAL).forEach((el) => {
			if (tagged.has(el) || el.closest('.invest-card')) return;
			tagged.add(el);
			const parent = el.parentElement;
			const i = counts.get(parent) || 0;
			counts.set(parent, i + 1);
			el.setAttribute('data-fx', '');
			el.style.setProperty('--fx-i', Math.min(i, 9));
			io.observe(el);
		});
		document.querySelectorAll(NUMS).forEach((n) => {
			if (numbers.has(n) || n.children.length || n.closest('.invest-card')) return;
			const d = parse(n.textContent);
			if (!d) return;
			numbers.add(n);
			n._fx = d;
			n.dataset.fxFinal = n.textContent;
			ioNum.observe(n);
		});
	};

	scan();

	// новые карточки уроков (после прохождения урока список перерисовывается)
	const eduGrid = $('edu-grid');
	if (eduGrid) new MutationObserver(scan).observe(eduGrid, { childList: true });

	// после входа в аккаунт запускаем анимации заново, чтобы они не прошли под окном входа
	const gate = $('auth-gate');
	if (gate) {
		new MutationObserver(() => {
			if (!gate.hidden) return;
			tagged.forEach((el) => { el.classList.remove('in-view'); io.unobserve(el); });
			numbers.forEach((n) => { resetNum(n); ioNum.unobserve(n); });
			requestAnimationFrame(() => {
				tagged.forEach((el) => io.observe(el));
				numbers.forEach((n) => ioNum.observe(n));
			});
		}).observe(gate, { attributes: true, attributeFilter: ['hidden'] });
	}
})();

if (window.lucide) {
	lucide.createIcons();
}