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
// кнопки, которые появляются позже (например, в пустом портфеле)
document.addEventListener('click', (event) => {
	const trigger = event.target.closest('[data-modal]');
	if (!trigger || [...modalTriggers].includes(trigger)) return;
	const modal = document.getElementById(trigger.dataset.modal);
	if (modal) modal.hidden = false;
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

const openCheckoutFlow = (amount, method = 'Bybit Spot') => {
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

let pendingTradeSide = 'Buy';

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

const showSuccess = (message, type = 'success') => {
	const isError = type === 'error';
	successToast.classList.toggle('is-error', isError);
	const toastTitle = successToast.querySelector('.success-content strong');
	if (toastTitle) toastTitle.textContent = isError ? 'Не получилось' : 'Успешно';
	windBurst.classList.remove('active');
	successMessage.textContent = message;
	if (isError) {
		successToast.classList.remove('visible');
		void successToast.offsetWidth;
		successToast.classList.add('visible');
		return;
	}
	void windBurst.offsetWidth;
	windBurst.classList.add('active');
	window.setTimeout(() => windBurst.classList.remove('active'), 2550);
	successToast.classList.remove('visible');
	void successToast.offsetWidth;
	successToast.classList.add('visible');
};

const assetPickerOptions = document.querySelectorAll('.asset-picker-option');
const BYBIT_REFERRAL_URL = 'https://www.bybit.com/invite?ref=393YMZP';
assetPickerOptions.forEach((option) => {
	option.addEventListener('click', () => {
		assetPickerOptions.forEach((item) => item.classList.remove('active'));
		option.classList.add('active');
	});
});

document.querySelectorAll('[data-trade]').forEach((button) => {
	button.addEventListener('click', () => {
		window.open(BYBIT_REFERRAL_URL, '_blank', 'noopener,noreferrer');
	});
});

const confirmPaymentButton = document.getElementById('confirm-payment');
confirmPaymentButton?.addEventListener('click', async () => {
	const quantity = Number(document.getElementById('crypto-buy-quantity')?.value || 0);
	const symbol = cryptoPair?.value || 'BTCUSDT';
	if (!(quantity > 0)) {
		showSuccess('Укажите корректное количество', 'error');
		return;
	}
	confirmPaymentButton.disabled = true;
	try {
		const result = await window.WindApi('/trading/orders', {
			method: 'POST',
			body: { symbol, side: pendingTradeSide, qty: String(quantity) },
		});
		closeModal(document.getElementById('checkout-modal'));
		showSuccess(`Ордер ${result.id} отправлен в Bybit · статус: ${result.status}`);
	} catch (error) {
		showSuccess(error.message || 'Ордер не отправлен', 'error');
	} finally {
		confirmPaymentButton.disabled = false;
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
	const DEFAULT_WALLETS = {
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
	let activeWalletOwner = null;
	const getWalletStorageKey = (ownerId) => `wind_wallets_${ownerId}`;
	const readWallets = (ownerId, serverBalance) => {
		try {
			const stored = JSON.parse(localStorage.getItem(getWalletStorageKey(ownerId)) || 'null');
			const source = stored && typeof stored === 'object' ? stored : DEFAULT_WALLETS;
			const wallet = Object.keys(DEFAULT_WALLETS).reduce((result, code) => {
				const amount = Number(source[code]);
				result[code] = Number.isFinite(amount) && amount >= 0 ? amount : DEFAULT_WALLETS[code];
				return result;
			}, {});
			if (Number.isFinite(Number(serverBalance))) wallet.RUB = Math.max(0, Number(serverBalance));
			return wallet;
		} catch (error) {
			return { ...DEFAULT_WALLETS, RUB: Math.max(0, Number(serverBalance) || 0) };
		}
	};
	let USER_WALLETS = { ...DEFAULT_WALLETS, RUB: 0 };

	const selectWallet = (user) => {
		const ownerId = user && user.id != null ? String(user.id) : null;
		activeWalletOwner = ownerId;
		USER_WALLETS = ownerId ? readWallets(ownerId, user.balance) : { ...DEFAULT_WALLETS, RUB: 0 };
		updateBalanceUI();
		// В демо-просмотре нет токена: запрос к серверу заведомо вернёт 401.
		if (ownerId && ownerId !== '0' && window.WindApi) {
			window.WindApi('/wallet/assets').then((data) => {
				const serverAssets = data && data.assets;
				if (!serverAssets || activeWalletOwner !== ownerId) return;
				USER_WALLETS = Object.keys(DEFAULT_WALLETS).reduce((wallet, code) => {
					const amount = Number(serverAssets[code]);
					wallet[code] = Number.isFinite(amount) && amount >= 0 ? amount : 0;
					return wallet;
				}, {});
				updateBalanceUI();
			}).catch(() => {
				showSuccess('Не удалось загрузить активы аккаунта', 'error');
			});
		}
	};

	window.addEventListener('wind-auth', (event) => selectWallet(event.detail));
	window.addEventListener('wind-portfolio', () => updateBalanceUI());
	window.addEventListener('wind-logout', () => selectWallet(null));

	const CRYPTO_RATES = {
		BTC: 65000, // в USD (условно)
		ETH: 3200,
		SOL: 150
	};

	const saveWallets = () => {
		if (!activeWalletOwner) return;
		try {
			localStorage.setItem(getWalletStorageKey(activeWalletOwner), JSON.stringify(USER_WALLETS));
		} catch (error) {
			// Кошелёк продолжает работать в памяти, если браузер запретил storage.
		}
		updateBalanceUI();
	};

	const updateBalanceUI = () => {
		const mainBalanceContainer = document.querySelector('.wallet-balance');
		if (!mainBalanceContainer) return;

		let totalRub = 0;
		const chips = [];
		Object.entries(USER_WALLETS).forEach(([code, val]) => {
			if (val > 0) {
				const isCrypto = ['BTC', 'ETH', 'SOL'].includes(code);
				const rate = isCrypto ? (CRYPTO_RATES[code] * CURRENCY_RATES.USD) : CURRENCY_RATES[code];
				totalRub += val * rate;
				const displayVal = isCrypto ? val.toFixed(4) : formatMoney(val);
				chips.push(`<span class="balance-item"><small>${code}</small><b>${displayVal}</b></span>`);
			}
		});
		// Разбивку по валютам показываем, только если валют больше одной: иначе она дублирует итог.
		let balancesHtml = `<span class="wallet-label">${chips.length > 1 ? 'Деньги и валюты в рублях' : 'Доступно на балансе'}</span><strong>${formatMoney(totalRub)} ₽</strong>`;
		balancesHtml += chips.length > 1
			? `<div class="balances-grid">${chips.join('')}</div>`
			: `<span class="wallet-caption">${totalRub > 0 ? 'Пополнение зачисляется после подтверждения платежа' : 'Пополни баланс, чтобы начать'}</span>`;
		mainBalanceContainer.innerHTML = balancesHtml;

		// Обновление балансов в секции настроек
		const settingsBalance = document.querySelector('.settings-summary div:last-child strong');
		if (settingsBalance) {
			settingsBalance.textContent = `${formatMoney(totalRub)} ₽`;
		}

		// Общая стоимость = деньги и валюты в рублях + текущая стоимость инвестиций
		const portfolioTotal = document.querySelector('.portfolio-summary div:first-child strong');
		if (portfolioTotal) {
			const invested = window.WindPortfolio ? window.WindPortfolio.investedValue() : 0;
			const text = `${formatMoney(totalRub + invested)} ₽`;
			portfolioTotal.textContent = text;
			if (portfolioTotal.dataset.fxFinal !== undefined) { portfolioTotal.dataset.fxFinal = text; portfolioTotal._fx = null; }
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
		const portfolioList = document.getElementById('portfolio-cash');
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

		const names = {
			USD: 'Доллар США',
			EUR: 'Евро',
			RUB: 'Российский рубль',
			CNY: 'Китайский юань',
			GBP: 'Фунт стерлингов',
			AED: 'Дирхам ОАЭ'
		};

		let html = '';
		Object.entries(USER_WALLETS).forEach(([code, val]) => {
			if (val > 0) {
				html += `
					<div class="portfolio-item">
						<div class="portfolio-main">
							<span class="asset-icon ${colors[code] || 'teal'}"><i data-lucide="${icons[code] || 'circle'}"></i></span>
							<div><strong>${names[code] || code}</strong><small>Валютный счёт · ${code}</small></div>
						</div>
						<div class="portfolio-side">
							<span>${formatMoney(val)} ${code}</span>
						</div>
					</div>
				`;
			}
		});

		if (html) html = `<p class="portfolio-subhead">Валютные счета</p>${html}`;

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

	const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', RUB: '₽', CNY: '¥', GBP: '£', AED: 'د.إ' };

	const updateConverter = () => {
		const converter = document.querySelector('.schedule.converter');
		if (!converter) return;
		const amountInput = converter.querySelector('input[type="number"]');
		const fromSelect = converter.querySelector('.converter-from');
		const toSelect = converter.querySelector('.converter-to');
		const output = converter.querySelector('.converter-output');
		const note = converter.querySelector('.converter-note');
		if (!amountInput || !fromSelect || !toSelect || !output || !note) return;

		updateConverterAvailable();
		const from = fromSelect.value;
		const to = toSelect.value;
		const amount = Number(amountInput.value || 0);
		const p = window.WindFee ? WindFee.parts() : { fee: 0, plus: 0, game: 0 };
		output.textContent = formatMoney(amount * getConverterRate(from, to) * (1 - p.fee / 100));
		const pc = (v) => v.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
		const perks = [p.plus ? `Plus −${pc(p.plus)}%` : '', p.game ? `игры −${pc(p.game)}%` : ''].filter(Boolean).join(', ');
		const rate = getDisplayRate(from, to);
		const rateText = rate < 1 ? rate.toLocaleString('ru-RU', { maximumFractionDigits: 4 }) : formatMoney(rate);
		note.textContent = `По курсу ${rateText} ${CURRENCY_SYMBOLS[to] || to} за 1 ${from} · комиссия ${pc(p.fee)}%${perks ? ` (${perks})` : ''}`;
	};

	const executeConverter = async () => {
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
		if (!Number.isFinite(amount) || amount <= 0) {
			showSuccess('Введите сумму больше нуля', 'error');
			return;
		}
		if (from === to) {
			showSuccess('Выберите разные валюты', 'error');
			return;
		}
		if (amount > (USER_WALLETS[from] || 0)) {
			showSuccess(`Недостаточно ${from}. Доступно: ${formatMoney(USER_WALLETS[from] || 0)} ${from}`, 'error');
			return;
		}
		const fee = window.WindFee ? WindFee.rate() : 0;
		const result = amount * getConverterRate(from, to) * (1 - fee / 100);
		if (!Number.isFinite(result) || result <= 0) {
			showSuccess('Не удалось рассчитать обмен', 'error');
			return;
		}

		button.classList.remove('is-animating');
		void button.offsetWidth;
		button.classList.add('is-animating');
		if (!activeWalletOwner || !window.WindApi) {
			showSuccess('Войдите в аккаунт для обмена', 'error');
			return;
		}
		try {
			const data = await window.WindApi('/wallet/exchange', {
				method: 'POST',
				body: { from_asset: from, to_asset: to, amount },
			});
			const serverAssets = data.assets || {};
			Object.keys(DEFAULT_WALLETS).forEach((code) => {
				USER_WALLETS[code] = Math.max(0, Number(serverAssets[code]) || 0);
			});
			updateBalanceUI();
			await window.Wallet?.load();
			const received = Number(data.received);
			showSuccess(`Обмен выполнен: ${formatMoney(amount)} ${from} → ${formatMoney(Number.isFinite(received) ? received : result)} ${to}`);
		} catch (error) {
			showSuccess(error.message || 'Обмен не выполнен', 'error');
		}
	};

const appNavigation = document.querySelectorAll('.nav a');
const appViews = new Set(['dashboard', 'investments', 'crypto', 'converter', 'game', 'settings']);
const themeToggle = document.querySelector('[data-theme-toggle]');
const notificationButton = document.querySelector('.notification-button');
const notificationPanel = document.querySelector('.notification-panel');
const notificationList = document.querySelector('#notification-list');
const notificationMenu = document.querySelector('.notification-menu');

const portfolioNotifications = [
	{ type: 'positive', title: 'USD вырос на 0,34 ₽', detail: 'Сильный рост сегодня', time: '2 минуты назад' },
	{ type: 'neutral', title: 'Поступление на баланс', detail: 'Баланс обновлён на 5 000 ₽', time: 'Сегодня, 11:42' },
	{ type: 'alert', title: 'Триггер по BTC активен', detail: 'Рост выше целевого порога', time: 'Нужно проверить' }
];

const renderNotifications = () => {
	if (!notificationList) return;
	if (localStorage.getItem('wind_notifications_enabled') === 'off') {
		notificationList.innerHTML = '<div class="notification-empty">Уведомления отключены</div>';
		const disabledBadge = document.querySelector('#notification-badge');
		if (disabledBadge) disabledBadge.textContent = '0';
		return;
	}
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
	if (localStorage.getItem('wind_notifications_enabled') === 'off') {
		showSuccess('Уведомления отключены в настройках');
		return;
	}
	const isOpen = !notificationPanel.hidden;
	notificationPanel.hidden = isOpen;
	notificationButton.setAttribute('aria-expanded', String(!isOpen));
};

const syncNotificationIndicator = () => {
	const disabled = localStorage.getItem('wind_notifications_enabled') === 'off';
	notificationButton?.classList.toggle('is-disabled', disabled);
	notificationButton?.setAttribute('aria-label', disabled ? 'Уведомления отключены' : 'Уведомления');
	document.querySelector('.notification-button .notif-dot')?.classList.toggle('is-hidden', disabled);
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
	const themeValue = document.querySelector('[data-setting-theme-value]');
	if (themeValue) {
		themeValue.textContent = isDark ? 'Вкл' : 'Выкл';
		themeValue.classList.toggle('active', isDark);
	}
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
	notificationMenu?.addEventListener('click', (event) => event.stopPropagation());
	document.addEventListener('click', (event) => {
		if (!notificationPanel.contains(event.target) && !notificationButton.contains(event.target)) {
			closeNotificationPanel();
		}
	});
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') closeNotificationPanel();
	});
}

const notificationsSettingKey = 'wind_notifications_enabled';
const notificationsEnabled = () => localStorage.getItem(notificationsSettingKey) !== 'off';
const paintNotificationSetting = () => {
	const value = document.querySelector('[data-setting-notifications-value]');
	if (!value) return;
	const enabled = notificationsEnabled();
	value.textContent = enabled ? 'Вкл' : 'Выкл';
	value.classList.toggle('active', enabled);
};
document.querySelector('[data-setting-notifications]')?.addEventListener('click', () => {
	const enabled = !notificationsEnabled();
	localStorage.setItem(notificationsSettingKey, enabled ? 'on' : 'off');
	paintNotificationSetting();
	if (!enabled) closeNotificationPanel();
	renderNotifications();
	syncNotificationIndicator();
	showSuccess(enabled ? 'Уведомления включены' : 'Уведомления отключены');
});
document.querySelector('[data-setting-theme]')?.addEventListener('click', () => {
	applyTheme(!document.body.classList.contains('dark-theme'));
	showSuccess(document.body.classList.contains('dark-theme') ? 'Темная тема включена' : 'Темная тема отключена');
});
paintNotificationSetting();
syncNotificationIndicator();

const openInvestmentProfile = () => {
	document.body.dataset.view = 'investments';
	document.body.classList.add('show-investment-profile');
	appNavigation.forEach((link) => {
		link.classList.toggle('active', link.getAttribute('href') === '#investments');
	});
	if (topbarEyebrow) topbarEyebrow.textContent = 'Инвестиции';
	if (topbarTitle) topbarTitle.textContent = 'Мой портфель';
	window.scrollTo({ top: 0, behavior: 'instant' });
};

const closeInvestmentProfile = () => {
	document.body.classList.remove('show-investment-profile');
};

// Заголовок топбара под каждую вкладку
const viewTitles = {
	dashboard: ['Wind Finance', 'Ваши финансы'],
	investments: ['Симулятор', 'Инвестиции'],
	crypto: ['Bybit · спот', 'Криптовалюты'],
	converter: ['Валюты', 'Конвертер'],
	game: ['Играй и учись', 'Игровая зона'],
	settings: ['Профиль', 'Настройки'],
};
const topbarEyebrow = document.querySelector('.topbar .eyebrow');
const topbarTitle = document.querySelector('.topbar h1');
const paintViewTitle = (view) => {
	const [eyebrow, title] = viewTitles[view] || viewTitles.dashboard;
	if (topbarEyebrow) topbarEyebrow.textContent = eyebrow;
	if (topbarTitle) topbarTitle.textContent = title;
};

// сводка над инвест-карточками повторяет значения из профиля портфеля
const syncInvSummary = () => {
	const source = document.querySelectorAll('#investment-profile .portfolio-summary strong');
	document.querySelectorAll('[data-inv-summary]').forEach((tile) => {
		const node = source[Number(tile.dataset.invSummary)];
		if (node) tile.textContent = node.dataset.fxFinal || node.textContent;
	});
};
const invSummarySource = document.querySelector('#investment-profile .portfolio-summary');
if (invSummarySource) {
	new MutationObserver(() => {
		window.clearTimeout(syncInvSummary._t);
		syncInvSummary._t = window.setTimeout(syncInvSummary, 120);
	}).observe(invSummarySource, { subtree: true, childList: true, characterData: true });
}

const setAppView = (view) => {
	const nextView = appViews.has(view) ? view : 'dashboard';
	const changed = document.body.dataset.view !== nextView;
	if (nextView === 'investments') syncInvSummary();
	document.body.dataset.view = nextView;
	closeInvestmentProfile();
	appNavigation.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${nextView}`));
	paintViewTitle(nextView);
	if (changed) window.scrollTo({ top: 0, behavior: 'instant' });
};

appNavigation.forEach((link) => {
	link.addEventListener('click', (event) => {
		// без прыжка к якорю: показываем вкладку сверху, с шапкой
		event.preventDefault();
		const view = link.getAttribute('href').slice(1);
		window.history.replaceState(null, '', `#${view}`);
		setAppView(view);
	});
});

document.querySelectorAll('[data-agent-toggle]').forEach((toggle) => {
	toggle.addEventListener('click', () => {
		const isOpen = document.body.classList.toggle('agent-open');
		document.querySelectorAll('[data-agent-toggle]').forEach((button) => button.setAttribute('aria-expanded', String(isOpen)));
	});
});
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') document.body.classList.remove('agent-open');
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
		if (window.WindLB) WindLB.submit(s.score);
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
		if (document.body.dataset.view !== 'game' || !stage.offsetParent) { finish(null); return; }
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

document.querySelectorAll('.profile-dropdown a[href="#currency"]').forEach((link) => {
	link.addEventListener('click', (event) => {
		event.preventDefault();
		profileDropdown?.setAttribute('hidden', '');
		profileTrigger?.setAttribute('aria-expanded', 'false');
		setAppView('settings');
		window.history.replaceState(null, '', '#settings');
		setTimeout(() => openCurrencyModal('from'), 0);
	});
});

document.querySelectorAll('.profile-dropdown a[href="#alerts"]').forEach((link) => {
	link.addEventListener('click', (event) => {
		event.preventDefault();
		profileDropdown?.setAttribute('hidden', '');
		profileTrigger?.setAttribute('aria-expanded', 'false');
		setAppView('crypto');
		window.history.replaceState(null, '', '#crypto');
		document.querySelector('#price-alerts')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
	// форма столбиков следует за направлением курса: при падении график снижается
	const shape = config.trend === 'negative' ? [...config.chart].reverse() : config.chart;
	chartBars.forEach((bar, index) => {
		bar.style.height = `${shape[index] || 40}%`;
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

const currencyNames = {
	RUB: 'Российский рубль',
	USD: 'Доллар США',
	EUR: 'Евро',
	CNY: 'Китайский юань',
	GBP: 'Фунт стерлингов',
	AED: 'Дирхам ОАЭ',
};
const currencyPreferenceKey = () => {
	const token = localStorage.getItem('wind_access_token') || 'guest';
	return `wind_primary_currency_${token.slice(-16)}`;
};
const paintPrimaryCurrency = (code = localStorage.getItem(currencyPreferenceKey()) || 'RUB') => {
	const value = document.querySelector('[data-setting-currency-value]');
	const label = document.querySelector('[data-setting-currency-label]');
	if (value) value.textContent = code;
	if (label) label.textContent = currencyNames[code] || code;
	const profileCurrency = document.querySelector('.profile-dropdown a[href="#currency"] b');
	if (profileCurrency) profileCurrency.textContent = code;
};
document.querySelector('[data-setting-currency]')?.addEventListener('click', () => openCurrencyModal('from'));
document.querySelectorAll('.currency-choice').forEach((button) => {
	button.addEventListener('click', () => {
		if (activeCurrencyField !== 'from') return;
		const code = button.dataset.currency;
		if (!code) return;
		localStorage.setItem(currencyPreferenceKey(), code);
		paintPrimaryCurrency(code);
	});
});
paintPrimaryCurrency();

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
const totpField = document.querySelector('#auth-totp');
const consentBox = document.querySelector('#auth-consent');
const demoLoginButton = document.querySelector('#demo-login-button');
const demoCredentials = { email: 'demo@example.com', password: 'demo123456' };
const passwordMeter = document.querySelector('#password-meter');
const passwordMeterBar = document.querySelector('#password-meter-bar');
const passwordMeterLabel = document.querySelector('#password-meter-label');
const authHelper = document.querySelector('#auth-helper');
const authHelperText = document.querySelector('#auth-helper-text');
let authMode = 'login';
let needTotp = false;
const DEMO_PREVIEW_KEY = 'wind_demo_preview';
const demoPreviewUser = {
	id: 0,
	username: 'Демо-просмотр',
	balance: 24500,
	plus: false,
	totp_enabled: false,
};

// единая точка обращения к серверу: токен подставляется сам
const api = async (path, { method = 'GET', body, timeoutMs = 10000 } = {}) => {
	const token = localStorage.getItem('wind_access_token');
	const headers = { 'Content-Type': 'application/json' };
	if (token) headers.Authorization = `Bearer ${token}`;
	const controller = new AbortController();
	const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
	let response;
	try {
		response = await fetch(`${apiBase}${path}`, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: controller.signal,
		});
	} catch (error) {
		if (error.name === 'AbortError') throw new Error('Сервер отвечает слишком долго. Попробуй ещё раз.');
		throw error;
	} finally {
		window.clearTimeout(timeout);
	}
	let data = null;
	try { data = await response.json(); } catch (e) { data = null; }
	if (!response.ok) {
		const d = data && data.detail;
		const err = new Error(typeof d === 'string' ? d : Array.isArray(d) && d[0] && d[0].msg ? d[0].msg : 'Ошибка запроса');
		err.status = response.status;
		throw err;
	}
	return data;
};
window.WindApi = api;

const updateProfile = (user) => {
	document.querySelectorAll('.profile-name').forEach((el) => { el.textContent = user.username; });
	document.querySelectorAll('.dropdown-user strong').forEach((el) => { el.textContent = user.username; });
	document.querySelectorAll('[data-profile-id]').forEach((el) => {
		el.textContent = `ID пользователя: ${user.id}`;
	});
	window.setTimeout(() => {
		window.dispatchEvent(new CustomEvent('wind-auth', { detail: user }));
	}, 0);
};

const authNotice = document.querySelector('#auth-notice');
const forgotButton = document.querySelector('#auth-forgot');
let resetToken = null;
const setNotice = (text, kind = '') => {
	if (!authNotice) return;
	authNotice.hidden = !text;
	authNotice.textContent = text || '';
	authNotice.className = `auth-notice${kind ? ' ' + kind : ''}`;
};
const setFieldLabel = (input, text) => {
	const label = input.closest('label');
	if (label && label.firstChild && label.firstChild.nodeType === Node.TEXT_NODE) label.firstChild.textContent = text;
};

const AUTH_MODES = {
	login: { title: 'Войти в аккаунт', submit: 'Войти', helper: 'Войди, чтобы продолжить спокойный обзор портфеля.' },
	register: { title: 'Создать аккаунт', submit: 'Зарегистрироваться', helper: 'Создай профиль — и я помогу собрать первый спокойный портфель.' },
	forgot: { title: 'Восстановить пароль', submit: 'Отправить ссылку', helper: 'Пришлём на почту ссылку для нового пароля. Она действует 30 минут.' },
	reset: { title: 'Новый пароль', submit: 'Сохранить пароль', helper: 'Придумай новый пароль: минимум 8 символов, лучше с цифрами и знаками.' },
};

const setAuthMode = (mode) => {
	authMode = mode;
	needTotp = false;
	const isRegister = mode === 'register', isForgot = mode === 'forgot', isReset = mode === 'reset';
	const meta = AUTH_MODES[mode] || AUTH_MODES.login;
	authTitle.textContent = meta.title;
	authSubmitLabel.textContent = meta.submit;
	usernameField.closest('label').hidden = !isRegister;
	usernameField.required = isRegister;
	consentBox.closest('label').hidden = !isRegister;
	emailField.closest('label').hidden = isReset;
	emailField.required = !isReset;
	passwordField.closest('label').hidden = isForgot;
	passwordField.required = !isForgot;
	setFieldLabel(passwordField, isReset ? 'Новый пароль' : 'Пароль');
	if (forgotButton) forgotButton.hidden = mode !== 'login';
	totpField.closest('label').hidden = true;
	totpField.value = '';
	passwordField.autocomplete = isRegister || isReset ? 'new-password' : 'current-password';
	passwordMeter.hidden = !(isRegister || isReset);
	if (!isRegister) passwordField.value = '';
	if (authHelperText) authHelperText.textContent = meta.helper;
	document.querySelectorAll('[data-auth-mode]').forEach((b) => b.classList.toggle('active', b.dataset.authMode === mode));
	authError.textContent = '';
};
forgotButton?.addEventListener('click', () => { setAuthMode('forgot'); setNotice(''); emailField.focus(); });

// ---- доступность сервера ----
// На GitHub Pages адрес API задаётся переменной BACKEND_URL. Без неё запросы уходили на сам github.io.
const apiConfigured = Boolean(window.WIND_API_URL) || !/\.github\.io$/.test(window.location.hostname);
let serverAwake = false;
const wakeServer = () => {
	if (!apiConfigured) return Promise.resolve(false);
	// бесплатный хостинг засыпает: первый запрос будит сервер, пока человек вводит пароль
	return fetch(`${apiBase}/health`, { cache: 'no-store' }).then((r) => { serverAwake = r.ok; return r.ok; }).catch(() => false);
};
const wakePromise = wakeServer();
// подсказка «сервер просыпается», если запрос идёт дольше 3 секунд
const withWakeHint = async (promise, label) => {
	const timer = window.setTimeout(() => {
		if (!serverAwake) setNotice('Сервер просыпается после простоя — это может занять до минуты. Не закрывай страницу.', 'wait');
		if (label) label.textContent = 'Подключаемся…';
	}, 3000);
	try { return await promise; } finally { window.clearTimeout(timer); }
};
if (!apiConfigured) {
	setNotice('Сервер ещё не подключён к этому сайту, поэтому вход и регистрация недоступны. Нажми «Войти как demo», чтобы посмотреть приложение.', 'warn');
}

document.querySelectorAll('[data-auth-mode]').forEach((b) => b.addEventListener('click', () => setAuthMode(b.dataset.authMode)));

const updatePasswordMeter = () => {
	if (!passwordMeterBar || !passwordMeterLabel) return;
	const value = passwordField.value;
	const checks = [value.length >= 8, /[A-ZА-Я]/.test(value), /\d/.test(value), /[^A-Za-zА-Яа-я0-9]/.test(value)];
	const score = checks.filter(Boolean).length;
	const states = [
		['Добавь символы', '34%'],
		['Нужна ещё защита', '54%'],
		['Хороший пароль', '76%'],
		['Отличный пароль', '100%'],
	];
	const [label, width] = states[Math.max(0, score - 1)] || states[0];
	passwordMeterLabel.textContent = value ? label : 'Добавь символы';
	passwordMeterBar.style.width = value ? width : '8%';
	passwordMeterBar.style.background = score >= 3 ? 'var(--green)' : score === 2 ? 'var(--yellow)' : 'var(--coral)';
};
passwordField.addEventListener('input', updatePasswordMeter);

document.querySelector('[data-auth-tip]')?.addEventListener('click', (event) => {
	const chip = event.currentTarget;
	if (authHelperText) authHelperText.textContent = chip.dataset.authTip;
	authHelper?.classList.remove('is-hidden');
});
document.querySelector('#auth-helper-close')?.addEventListener('click', () => authHelper?.classList.add('is-hidden'));

document.querySelector('.auth-showcase')?.addEventListener('pointermove', (event) => {
	const card = event.currentTarget.querySelector('.auth-mini-portfolio');
	if (!card || window.matchMedia('(max-width: 760px)').matches) return;
	const rect = event.currentTarget.getBoundingClientRect();
	const x = (event.clientX - rect.left) / rect.width - 0.5;
	const y = (event.clientY - rect.top) / rect.height - 0.5;
	card.style.transform = `perspective(700px) rotateY(${x * 5}deg) rotateX(${y * -4}deg)`;
});
document.querySelector('.auth-showcase')?.addEventListener('pointerleave', (event) => {
	const card = event.currentTarget.querySelector('.auth-mini-portfolio');
	if (card) card.style.transform = '';
});

demoLoginButton?.addEventListener('click', () => {
	sessionStorage.setItem(DEMO_PREVIEW_KEY, '1');
	updateProfile(demoPreviewUser);
	authGate.hidden = true;
	authForm.reset();
});

const showAuth = () => { authGate.hidden = false; setAuthMode('login'); };
const isDemoPreview = () => sessionStorage.getItem(DEMO_PREVIEW_KEY) === '1';

// вход через Telegram Mini App
const tg = window.Telegram && window.Telegram.WebApp;
const tgLogin = async () => {
	if (!tg || !tg.initData) return false;
	try {
		tg.ready();
		tg.expand();
		const r = await api('/auth/telegram', { method: 'POST', body: { init_data: tg.initData }, timeoutMs: 15000 });
		localStorage.setItem('wind_access_token', r.access_token);
		updateProfile(r.user);
		authGate.hidden = true;
		return true;
	} catch (e) { return false; }
};

const checkSession = async () => {
	const params = new URLSearchParams(window.location.search);
	if (params.get('reset')) {
		// ссылка из письма важнее демо-режима и старой сессии
		resetToken = params.get('reset');
		params.delete('reset');
		window.history.replaceState(null, '', `${window.location.pathname}${params.toString() ? '?' + params : ''}${window.location.hash}`);
		sessionStorage.removeItem(DEMO_PREVIEW_KEY);
		showAuth();
		setAuthMode('reset');
		return;
	}
	if (isDemoPreview()) {
		updateProfile(demoPreviewUser);
		authGate.hidden = true;
		return;
	}
	if (localStorage.getItem('wind_access_token') && apiConfigured) {
		setNotice('Восстанавливаем сессию…', 'wait');
		try {
			updateProfile(await withWakeHint(api('/auth/me', { timeoutMs: 70000 })));
			setNotice('');
			authGate.hidden = true;
			return;
		} catch (e) {
			setNotice('');
			if (e.status === 401) localStorage.removeItem('wind_access_token'); // токен чистим только при 401
			else if (e.status === undefined) { showAuth(); setNotice('Сервер не ответил. Проверь интернет и попробуй войти ещё раз.', 'warn'); return; }
		}
	}
	if (await tgLogin()) return;
	showAuth();
};

authForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	authError.textContent = '';
	const submitButton = authForm.querySelector('.auth-submit');
	const submitLabel = submitButton.querySelector('#auth-submit-label');
	submitButton.disabled = true;
	submitButton.classList.add('is-loading');
	if (submitLabel) submitLabel.textContent = 'Входим…';
	const finish = () => {
		submitButton.disabled = false;
		submitButton.classList.remove('is-loading');
		if (submitLabel) submitLabel.textContent = (AUTH_MODES[authMode] || AUTH_MODES.login).submit;
	};
	if (!apiConfigured) {
		authError.textContent = 'Сервер не подключён. Войди как demo или попробуй позже.';
		finish();
		return;
	}
	if (authMode === 'forgot') {
		try {
			const r = await withWakeHint(api('/auth/password/forgot', { method: 'POST', body: { email: emailField.value }, timeoutMs: 70000 }), submitLabel);
			setNotice(r.message, 'ok');
			if (r.dev_reset_url) console.info('Ссылка сброса (только для разработки):', r.dev_reset_url);
		} catch (error) {
			authError.textContent = error.message;
		}
		finish();
		return;
	}
	if (authMode === 'reset') {
		try {
			const body = { token: resetToken, password: passwordField.value };
			if (needTotp) body.totp_code = totpField.value.trim();
			const result = await withWakeHint(api('/auth/password/reset', { method: 'POST', body, timeoutMs: 70000 }), submitLabel);
			localStorage.setItem('wind_access_token', result.access_token);
			resetToken = null;
			updateProfile(result.user);
			authGate.hidden = true;
			authForm.reset();
			setNotice('');
			showSuccess('Пароль изменён, ты в аккаунте');
		} catch (error) {
			if (error.message === '2fa_required') {
				needTotp = true;
				totpField.closest('label').hidden = false;
				authError.textContent = 'Введи код из приложения-аутентификатора';
			} else authError.textContent = error.message;
		}
		finish();
		return;
	}
	const body = { email: emailField.value, password: passwordField.value };
	if (authMode === 'register') {
		if (!consentBox.checked) {
			authError.textContent = 'Нужно принять условия и политику конфиденциальности';
			submitButton.disabled = false;
			submitButton.classList.remove('is-loading');
			if (submitLabel) submitLabel.textContent = 'Зарегистрироваться';
			return;
		}
		body.username = usernameField.value;
		body.accept_terms = true;
	} else if (needTotp) {
		body.totp_code = totpField.value.trim();
	}
	try {
		const result = await withWakeHint(api(`/auth/${authMode}`, { method: 'POST', body, timeoutMs: 70000 }), submitLabel);
		setNotice('');
		localStorage.setItem('wind_access_token', result.access_token);
		updateProfile(result.user);
		authGate.hidden = true;
		authForm.reset();
		submitButton.disabled = false;
		submitButton.classList.remove('is-loading');
		if (submitLabel) submitLabel.textContent = authMode === 'register' ? 'Зарегистрироваться' : 'Войти';
	} catch (error) {
		if (error.message === '2fa_required') {
			needTotp = true;
			totpField.closest('label').hidden = false;
			totpField.focus();
			authError.textContent = 'Введи код из приложения-аутентификатора';
			submitButton.disabled = false;
			submitButton.classList.remove('is-loading');
			if (submitLabel) submitLabel.textContent = 'Войти';
			return;
		}
		setNotice('');
		authError.textContent = error instanceof TypeError ? 'Сервер недоступен. Проверь соединение и попробуй ещё раз.' : error.message;
		submitButton.disabled = false;
		submitButton.classList.remove('is-loading');
		if (submitLabel) submitLabel.textContent = authMode === 'register' ? 'Зарегистрироваться' : 'Войти';
	}
});

document.querySelector('.logout')?.addEventListener('click', (event) => {
	event.preventDefault();
	sessionStorage.removeItem(DEMO_PREVIEW_KEY);
	localStorage.removeItem('wind_access_token');
	window.dispatchEvent(new Event('wind-logout'));
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
	let chartWasHidden = cryptoChartElement.clientWidth === 0;
	new ResizeObserver(() => {
		const width = cryptoChartElement.clientWidth;
		cryptoChart.applyOptions({ width, height: cryptoChartElement.clientHeight });
		// График создаётся, пока вкладка скрыта: при первом показе заново вписываем свечи в ширину.
		if (width > 0 && chartWasHidden) cryptoChart.timeScale().fitContent();
		chartWasHidden = width === 0;
	}).observe(cryptoChartElement);
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
		cryptoUpdated.textContent = `Котировки Bybit · ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
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
		cryptoUpdated.textContent = `LIVE · котировки Bybit · ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
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
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const fmt = (v) => `${Number(v).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;
	const listeners = [];
	let balance = 0, history = [];

	const nodes = () => [
		document.querySelector('.wallet-balance strong'),
		document.querySelector('.settings-summary > div:last-child strong'),
	].filter(Boolean);

	const paint = (from) => {
		nodes().forEach((n) => {
			cancelAnimationFrame(n._wraf);
			const final = fmt(balance);
			n.dataset.fxFinal = final;
			if (n._fx) n._fx = { pre: '', suf: ' ₽', num: balance, dec: Number.isInteger(balance) ? 0 : 2 };
			if (from == null || reduce || from === balance) { n.textContent = final; return; }
			n.classList.remove('flash-up', 'flash-down');
			void n.offsetWidth;
			n.classList.add(balance > from ? 'flash-up' : 'flash-down');
			const t0 = performance.now();
			const step = (now) => {
				const k = Math.min(1, (now - t0) / 700);
				n.textContent = fmt(k < 1 ? Math.round(from + (balance - from) * (1 - Math.pow(1 - k, 3))) : balance);
				if (k < 1) n._wraf = requestAnimationFrame(step);
			};
			n._wraf = requestAnimationFrame(step);
		});
	};

	const renderHistory = () => {
		const list = document.querySelector('.ledger-list');
		if (!list) return;
		list.querySelectorAll('.wallet-tx').forEach((r) => r.remove());
		const frag = document.createDocumentFragment();
		history.slice(0, 6).forEach((h) => {
			const row = document.createElement('div');
			row.className = 'ledger-row wallet-tx';
			const tag = document.createElement('span');
			const isBuy = /^Покупка/.test(h.title), isSale = /^Продажа/.test(h.title);
			const kind = h.type === 'fx' ? ['transfer', 'Обмен'] : isBuy ? ['buy', 'Покупка'] : isSale ? ['sell', 'Продажа']
				: h.type === 'in' ? ['transfer', 'Поступление'] : ['sell', 'Списание'];
			tag.className = `ledger-tag ${kind[0]}`;
			tag.textContent = kind[1];
			const mid = document.createElement('div');
			const s = document.createElement('strong');
			s.textContent = h.title;
			const sm = document.createElement('small');
			sm.textContent = new Date(h.ts).toLocaleDateString('ru-RU');
			mid.append(s, sm);
			const b = document.createElement('b');
			b.textContent = h.type === 'fx' ? `≈${fmt(h.amount)}` : `${h.type === 'in' ? '+' : '−'}${fmt(h.amount)}`;
			row.append(tag, mid, b);
			frag.appendChild(row);
		});
		list.prepend(frag);
	};

	const apply = (d) => {
		const from = balance;
		balance = Number(d.balance);
		if (Array.isArray(d.history)) { history = d.history.slice(0, 30); renderHistory(); }
		paint(from || null);
		listeners.forEach((fn) => fn(balance));
	};
	const fail = (e) => {
		Wallet.load().catch(() => {}); // вернуть серверное значение
		if (typeof portfolioNotifications !== 'undefined') {
			portfolioNotifications.unshift({ type: 'alert', title: 'Операция не выполнена', detail: e.message, time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) });
			portfolioNotifications.splice(20);
			renderNotifications();
		}
	};

	const Wallet = {
		get: () => balance,
		format: fmt,
		load: async () => apply(await window.WindApi('/wallet')),
		add(amount, title) {
			const a = Number(amount);
			if (!(a > 0)) return false;
			fail(new Error('Пополнение выполняется только через подтверждённый платёж'));
			return false;
		},
		spend(amount, title) {
			const a = Number(amount);
			if (!(a > 0) || a > balance) return false;
			window.WindApi('/wallet/spend', { method: 'POST', body: { amount: a, title } }).then(apply).catch(fail);
			return true;
		},
		onChange: (fn) => listeners.push(fn),
	};
	window.Wallet = Wallet;
	Wallet.onChange((value) => {
		if (!activeWalletOwner) return;
		USER_WALLETS.RUB = Math.max(0, Number(value) || 0);
		saveWallets();
	});

	window.addEventListener('wind-auth', (e) => { apply({ balance: e.detail.balance }); });
})();

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

	const createInvoice = async () => {
		throw new Error('Криптоплатежи пока не настроены. Баланс не изменён.');
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
		let inv;
		try {
			inv = await createInvoice();
		} catch (error) {
			ui.address.textContent = error.message;
			ui.link.textContent = '—';
			ui.paid.disabled = true;
			return;
		}
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
		showSuccess('Криптоплатежи пока не настроены. Баланс не изменён', 'error');
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
	const SOUND_KEY = 'wind_price_alert_sound';
	let MAX = 3; // бесплатный тариф; с сервера приходит фактический лимит (в Plus — 30)
	const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
	const PCTS = [1, 3, 5, 10];
	const prices = {};
	const rows = new Map();
	let audioContext = null;
	let soundEnabled = localStorage.getItem(SOUND_KEY) !== '0';
	let symbol = 'BTCUSDT', dir = 'above', freshId = null;
	const soundToggle = $('alert-sound-toggle');

	const paintSoundToggle = () => {
		if (!soundToggle) return;
		soundToggle.setAttribute('aria-pressed', String(soundEnabled));
		const text = soundToggle.querySelector('span');
		if (text) text.textContent = soundEnabled ? 'Звук включён' : 'Звук выключен';
		const iconName = soundEnabled ? 'volume-2' : 'volume-x';
		soundToggle.querySelector('i')?.setAttribute('data-lucide', iconName);
		if (window.lucide) window.lucide.createIcons();
	};
	const unlockAudio = () => {
		if (!soundEnabled || !('AudioContext' in window || 'webkitAudioContext' in window)) return;
		const AudioCtor = window.AudioContext || window.webkitAudioContext;
		audioContext ||= new AudioCtor();
		if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
	};
	const playAlertSound = () => {
		if (!soundEnabled || !audioContext || audioContext.state !== 'running') return;
		const start = audioContext.currentTime;
		const duration = 1.25;
		const gain = audioContext.createGain();
		gain.gain.setValueAtTime(0.0001, start);
		gain.gain.exponentialRampToValueAtTime(0.11, start + 0.06);
		gain.gain.setValueAtTime(0.08, start + 0.92);
		gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
		gain.connect(audioContext.destination);
		[523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
			const oscillator = audioContext.createOscillator();
			oscillator.type = 'sine';
			oscillator.frequency.value = frequency;
			oscillator.connect(gain);
			oscillator.start(start + index * 0.18);
			oscillator.stop(start + index * 0.18 + 0.42);
		});
		const sparkle = audioContext.createOscillator();
		const sparkleGain = audioContext.createGain();
		sparkle.type = 'triangle';
		sparkle.frequency.setValueAtTime(1046.5, start + 0.72);
		sparkle.frequency.exponentialRampToValueAtTime(1568, start + 1.02);
		sparkleGain.gain.setValueAtTime(0.0001, start + 0.72);
		sparkleGain.gain.exponentialRampToValueAtTime(0.04, start + 0.78);
		sparkleGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
		sparkle.connect(sparkleGain);
		sparkleGain.connect(audioContext.destination);
		sparkle.start(start + 0.72);
		sparkle.stop(start + duration);
	};
	soundToggle?.addEventListener('click', () => {
		soundEnabled = !soundEnabled;
		localStorage.setItem(SOUND_KEY, soundEnabled ? '1' : '0');
		if (soundEnabled) unlockAudio();
		paintSoundToggle();
	});
	document.addEventListener('pointerdown', unlockAudio, { once: true });
	document.addEventListener('keydown', unlockAudio, { once: true });
	paintSoundToggle();

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

	const save = () => { try { localStorage.setItem(KEY, JSON.stringify(alerts.filter((a) => !a.serverId))); } catch (e) { /* хранилище недоступно */ } };
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

	// ---- синхронизация с сервером: он проверяет цены и шлёт уведомление в Telegram, даже когда сайт закрыт ----
	const serverMode = () => Boolean(localStorage.getItem('wind_access_token')) && window.WindApi;
	const tgButton = $('alert-telegram');
	let telegramLinked = false;
	const paintTelegram = () => {
		if (!tgButton) return;
		tgButton.hidden = !serverMode();
		tgButton.classList.toggle('linked', telegramLinked);
		tgButton.querySelector('span').textContent = telegramLinked ? 'Telegram подключён' : 'Подключить Telegram';
	};
	const fromServer = (data) => {
		if (!data || !Array.isArray(data.active)) return;
		MAX = Number(data.limit) || MAX;
		telegramLinked = Boolean(data.telegram_linked);
		alerts = data.active.map((a) => ({ id: `s${a.id}`, serverId: a.id, symbol: a.symbol, dir: a.direction, price: Number(a.price),
			start: a.start_price ? Number(a.start_price) : null }));
		history = data.fired.slice(0, 3).map((a) => ({ symbol: a.symbol, dir: a.direction, price: Number(a.price),
			time: a.triggered_at ? new Date(a.triggered_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '',
			via: a.notified_via }));
		paintTelegram();
		render();
	};
	const syncFromServer = async () => {
		if (!serverMode()) { paintTelegram(); return; }
		// уведомления, созданные до входа, переносим в аккаунт
		const local = alerts.filter((a) => !a.serverId);
		for (const a of local) {
			try { await WindApi('/alerts', { method: 'POST', body: { symbol: a.symbol, direction: a.dir, price: a.price, start_price: a.start || undefined } }); }
			catch (e) { /* лимит или сеть: оставшиеся не переносим */ break; }
		}
		if (local.length) { try { localStorage.removeItem(KEY); } catch (e) { /* хранилище недоступно */ } }
		try { fromServer(await WindApi('/alerts')); } catch (e) { /* остаёмся на локальном списке */ }
	};
	tgButton?.addEventListener('click', async () => {
		try {
			const d = await WindApi('/telegram/link', { method: 'POST' });
			window.open(d.url, '_blank', 'noopener');
			setHint('Открой бота и нажми «Start» — после этого уведомления будут приходить в Telegram.', 'ok');
		} catch (e) { setHint(e.message, 'error'); }
	});
	window.addEventListener('wind-auth', syncFromServer);
	document.addEventListener('wind-plus-change', syncFromServer); // с Plus лимит растёт до 30
	window.addEventListener('wind-logout', () => { alerts = load(KEY).filter((a) => !a.serverId); MAX = 3; paintTelegram(); render(); });

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
			del.addEventListener('click', async () => {
				if (a.serverId && serverMode()) {
					try { fromServer(await WindApi(`/alerts/${a.serverId}`, { method: 'DELETE' })); } catch (e) { setHint(e.message, 'error'); }
					return;
				}
				alerts = alerts.filter((x) => x.id !== a.id); save(); render();
			});
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
		playAlertSound();
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
				if (a.serverId && serverMode()) WindApi(`/alerts/${a.serverId}/ack`, { method: 'POST' }).catch(() => {});
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
		if (serverMode()) {
			try {
				fromServer(await WindApi('/alerts', { method: 'POST', body: { symbol, direction: dir, price, start_price: current } }));
			} catch (e) { setHint(e.message, 'error'); return; }
			priceEl.value = '';
			setHint(`Готово! ${telegramLinked ? 'Пришлём в Telegram' : 'Напомним'}, когда ${label(symbol)} ${dir === 'above' ? 'поднимется' : 'опустится'} до ${fmtPrice(price)} USDT`, 'ok');
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
	syncFromServer();
	setInterval(syncFromServer, 60000); // подтянуть то, что сработало на сервере (например, пока вкладка спала)
})();

(() => {
	const modal = document.getElementById('article-modal');
	if (!modal) return;
	const $ = (id) => document.getElementById(id);
	const el = { tag: $('article-tag'), info: $('article-info'), title: $('article-title'), body: $('article-body'), quiz: $('article-quiz'), note: $('article-note'), action: $('article-action') };
	const NOTE_NEWS = 'Заголовок и выжимка из открытых источников (Google Новости). Не является инвестиционной рекомендацией.';
	const NOTE_EDU = 'Учебный материал. Не является инвестиционной рекомендацией.';

	let NEWS = {
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
		global: {
			tag: 'Мир', tagClass: 'amber-tag', info: 'Сегодня · Мировой анализ',
			title: 'Мировой рынок: свежий анализ и прогнозы',
			paragraphs: ['Лента загружает свежие публикации о глобальных финансовых рынках, макроэкономике и ключевых классах активов.'],
		},
		macro: {
			tag: 'Макро', tagClass: 'purple-tag', info: 'Сегодня · Мировой анализ',
			title: 'Макроэкономика и решения центральных банков',
			paragraphs: ['Следи за аналитикой инфляции, ставок, роста экономики и решений центральных банков.'],
		},
		stocks: {
			tag: 'Акции', tagClass: 'positive-tag', info: 'Сегодня · Мировой анализ',
			title: 'Глобальные фондовые индексы и рыночные ожидания',
			paragraphs: ['Публикации о фондовых индексах, корпоративных результатах и ожиданиях инвесторов.'],
		},
		commodities: {
			tag: 'Сырьё', tagClass: 'amber-tag', info: 'Сегодня · Мировой анализ',
			title: 'Нефть, золото и сырьевые рынки в фокусе',
			paragraphs: ['Аналитика динамики нефти, золота, металлов и других сырьевых активов.'],
		},
	};

	// ---- живая лента новостей ----
	const NEWS_REFRESH_MS = 10 * 60 * 1000;   // сервер обновляет ленты раз в 15 минут
	const NEWS_PAGE = 8;
	const SEEN_KEY = 'wind_news_seen';
	const TAG_STYLE = {
		'Россия': ['positive-tag', 'teal', 'landmark'],
		'США': ['amber-tag', 'amber', 'chart-no-axes-combined'],
		'Крипто': ['teal-tag', 'teal', 'bitcoin'],
		'Экономика': ['purple-tag', 'purple', 'globe-2'],
	};
	const styleOf = (tag) => TAG_STYLE[tag] || ['amber-tag', 'purple', 'newspaper'];
	let newsItems = [], newsFilter = 'all', newsShown = NEWS_PAGE, newsLoadedAt = 0, newsUpdatedAt = null;
	const readSeen = () => { try { const v = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
	const ago = (value) => {
		const date = value ? new Date(value) : null;
		if (!date || Number.isNaN(date.getTime())) return 'сегодня';
		const min = Math.round((Date.now() - date.getTime()) / 60000);
		if (min < 1) return 'только что';
		if (min < 60) return `${min} мин назад`;
		if (min < 24 * 60) return `${Math.round(min / 60)} ч назад`;
		return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
	};

	const paintBadge = () => {
		const badge = $('agent-pet-badge');
		if (!badge) return;
		const seen = new Set(readSeen());
		const fresh = newsItems.filter((n) => !seen.has(n.id)).length;
		badge.hidden = !fresh || document.body.classList.contains('agent-open');
		badge.textContent = fresh > 9 ? '9+' : String(fresh);
	};
	const markSeen = () => {
		try { localStorage.setItem(SEEN_KEY, JSON.stringify(newsItems.map((n) => n.id).slice(0, 80))); } catch (e) { /* хранилище недоступно */ }
		paintBadge();
	};

	const newsCard = (item, feature) => {
		const [tagClass, iconClass, iconName] = styleOf(item.tag);
		const card = document.createElement('article');
		card.className = `${feature ? 'crypto-news-feature' : 'crypto-news-item'} card news-clickable`;
		card.dataset.news = item.id;
		card.tabIndex = 0;
		card.setAttribute('role', 'button');
		card.setAttribute('aria-label', `Читать новость: ${item.title}`);
		const meta = `<div class="news-meta"><span class="news-tag ${tagClass}"></span><time></time></div>`;
		if (feature) {
			card.innerHTML = `<div class="news-feature-art"><span class="news-orbit orbit-one"></span><span class="news-orbit orbit-two"></span><span class="news-coin"></span><span class="news-feature-label">Главное</span></div><div class="news-feature-copy">${meta}<h3></h3><p></p><div class="news-footer"><span class="news-source"></span><button type="button" aria-label="Открыть новость"><i data-lucide="arrow-up-right"></i></button></div></div>`;
			card.querySelector('.news-coin').textContent = item.tag === 'Крипто' ? '₿' : item.tag === 'США' ? '$' : item.tag === 'Россия' ? '₽' : '%';
			card.querySelector('p').textContent = item.summary;
		} else {
			card.innerHTML = `<span class="news-icon ${iconClass}"><i data-lucide="${iconName}"></i></span><div>${meta}<h3></h3><span class="news-source"></span></div><button type="button" aria-label="Открыть новость"><i data-lucide="arrow-up-right"></i></button>`;
		}
		card.querySelector('.news-tag').textContent = item.tag;
		const time = card.querySelector('time');
		time.textContent = ago(item.published);
		time.dateTime = item.published || '';
		card.querySelector('h3').textContent = item.title;
		card.querySelector('.news-source').textContent = item.source || '';
		return card;
	};

	const renderNewsList = () => {
		const grid = $('learn-news');
		if (!grid || !newsItems.length) return;
		const filtered = newsFilter === 'all' ? newsItems : newsItems.filter((n) => n.tag === newsFilter);
		grid.textContent = '';
		if (!filtered.length) {
			const empty = document.createElement('p');
			empty.className = 'news-empty';
			empty.textContent = 'По этой теме свежих новостей пока нет.';
			grid.append(empty);
			return;
		}
		grid.append(newsCard(filtered[0], true));
		const list = document.createElement('div');
		list.className = 'crypto-news-list';
		filtered.slice(1, newsShown).forEach((item) => list.append(newsCard(item, false)));
		grid.append(list);
		if (filtered.length > newsShown) {
			const more = document.createElement('button');
			more.type = 'button';
			more.className = 'news-more';
			more.textContent = `Показать ещё (${filtered.length - newsShown})`;
			more.addEventListener('click', () => { newsShown += NEWS_PAGE; renderNewsList(); });
			grid.append(more);
		}
		if (window.lucide) window.lucide.createIcons();
		bindNewsCards();
	};

	const renderRemoteNews = (items) => {
		if (!Array.isArray(items) || !items.length) return;
		newsItems = items;
		NEWS = Object.fromEntries(items.map((item) => [item.id, {
			tag: item.tag,
			tagClass: styleOf(item.tag)[0],
			info: `${ago(item.published)}${item.source ? ' · ' + item.source : ''}`,
			title: item.title,
			paragraphs: [item.summary, 'Это короткая выжимка. Открой первоисточник, чтобы прочитать материал полностью и проверить контекст.'],
			url: item.url,
		}]));
		renderNewsList();
		paintBadge();
	};

	const paintScan = () => {
		const scan = $('agent-last-scan');
		if (scan && newsUpdatedAt) scan.textContent = `Обновлено ${ago(newsUpdatedAt)}`;
	};

	const loadRemoteNews = async () => {
		try {
			const data = await window.WindApi('/market/news', { timeoutMs: 30000 });
			newsLoadedAt = Date.now();
			newsUpdatedAt = data.updated_at || new Date().toISOString();
			renderRemoteNews(data.items);
			paintScan();
			const counts = data.counts || {};
			const parts = ['Россия', 'США', 'Крипто', 'Экономика'].filter((t) => counts[t]).map((t) => `${t} ${counts[t]}`);
			const sub = $('learn-sub');
			if (sub) sub.textContent = `${data.items.length} новостей за двое суток${parts.length ? ' · ' + parts.join(' · ') : ''}`;
			const speech = $('agent-speech-text');
			if (speech && data.items[0]) speech.textContent = `Свежее: «${data.items[0].title}». Ниже — всё главное по темам.`;
		} catch (error) {
			const speech = $('agent-speech-text');
			if (speech && !newsItems.length) speech.textContent = 'Новости сейчас недоступны — попробую обновить чуть позже.';
			console.warn('Новости не обновились:', error.message);
		}
	};
	// обновляем ленту, если она устарела: по таймеру, при открытии агента и при возврате на вкладку
	const refreshIfStale = (maxAge = 5 * 60 * 1000) => { if (Date.now() - newsLoadedAt > maxAge) loadRemoteNews(); };
	new MutationObserver(() => {
		if (document.body.classList.contains('agent-open')) { refreshIfStale(); markSeen(); }
		paintBadge();
	}).observe(document.body, { attributes: true, attributeFilter: ['class'] });
	document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshIfStale(); });
	window.setInterval(paintScan, 60000);

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

	const openArticle = ({ tag, tagClass, info, title, paragraphs, note, lesson, url }) => {
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
		if (url && /^https?:\/\//i.test(url)) {
			const link = document.createElement('a');
			link.className = 'article-source';
			link.href = url;
			link.target = '_blank';
			link.rel = 'noopener noreferrer';
			link.textContent = 'Читать в источнике ↗';
			el.body.appendChild(link);
		}
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
	const bindNewsCards = () => {
		document.querySelectorAll('[data-news]').forEach((card) => {
			if (card.dataset.newsBound) return;
			card.dataset.newsBound = '1';
		});
	};
	const newsGrid = $('learn-news');
	newsGrid?.addEventListener('click', (event) => {
		const card = event.target.closest('[data-news]');
		if (!card || !newsGrid.contains(card)) return;
		const n = NEWS[card.dataset.news];
		if (n) openArticle({ ...n, note: NOTE_NEWS });
	});
	newsGrid?.addEventListener('keydown', (event) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		const card = event.target.closest('[data-news]');
		if (!card || !newsGrid.contains(card)) return;
		event.preventDefault();
		const n = NEWS[card.dataset.news];
		if (n) openArticle({ ...n, note: NOTE_NEWS });
	});
	bindNewsCards();
	window.WindNews = { refresh: loadRemoteNews };
	loadRemoteNews();
	window.setInterval(() => { if (!document.hidden) loadRemoteNews(); }, NEWS_REFRESH_MS);
	const refreshButton = $('news-refresh');
	refreshButton?.addEventListener('click', async () => {
		refreshButton.disabled = true;
		try {
			await loadRemoteNews();
		} finally {
			refreshButton.disabled = false;
		}
	});
	document.querySelectorAll('[data-news-filter]').forEach((button) => {
		button.addEventListener('click', () => {
			document.querySelectorAll('[data-news-filter]').forEach((item) => item.classList.toggle('active', item === button));
			newsFilter = button.dataset.newsFilter;
			newsShown = NEWS_PAGE;
			renderNewsList();
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
		news: { title: 'Американский рынок сегодня', sub: 'S&P 500 · Nasdaq · Dow Jones · ФРС' },
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
	const getBalance = () => Wallet.get();
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
			asset = { code: card.dataset.assetCode, name: card.dataset.assetName, price: Number(card.dataset.price), unit: card.dataset.unit || 'ед.' };
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

	ui.confirm.addEventListener('click', async () => {
		if (!asset) return;
		const amount = Math.round(getAmount() * 100) / 100;
		if (amount < 100) { ui.error.textContent = 'Минимальная сумма — 100 ₽'; return; }
		if (amount > getBalance()) { ui.error.textContent = 'Недостаточно средств на балансе'; return; }
		if (!localStorage.getItem('wind_access_token')) { ui.error.textContent = 'Войди в аккаунт, чтобы покупать активы'; return; }
		ui.confirm.disabled = true;
		let data;
		try {
			// цену и количество считает сервер — клиент передаёт только сумму
			data = await WindApi('/invest/buy', { method: 'POST', body: { asset: asset.code, amount } });
		} catch (e) {
			ui.error.textContent = e.message || 'Покупка не выполнена';
			return;
		} finally {
			ui.confirm.disabled = false;
		}
		window.WindPortfolio?.apply(data);
		await Wallet.load().catch(() => {});
		const qty = fmt(Number(data.bought.quantity), 4);
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

// ================= ИНВЕСТИЦИОННЫЙ ПОРТФЕЛЬ (данные с сервера) =================
(() => {
	const list = document.getElementById('portfolio-positions');
	if (!list) return;
	const ICONS = { IMOEX: ['teal', 'landmark'], SBER: ['amber', 'factory'], ETFRU: ['purple', 'briefcase-business'], BONDS: ['orange', 'trending-up'] };
	const fmt = (n, d = 2) => Number(n).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: d });
	const signed = (n, suffix) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}${suffix}`;
	let state = null;

	const setText = (node, text, trend) => {
		if (!node) return;
		node.textContent = text;
		if (node.dataset.fxFinal !== undefined) { node.dataset.fxFinal = text; node._fx = null; }
		node.classList.toggle('positive', trend > 0);
		node.classList.toggle('negative', trend < 0);
	};

	const mk = (tag, cls, text) => {
		const el = document.createElement(tag);
		if (cls) el.className = cls;
		if (text != null) el.textContent = text;
		return el;
	};

	const renderEmpty = (title, text, withButton) => {
		const box = mk('div', 'portfolio-empty');
		const icon = mk('span', 'portfolio-empty-icon');
		icon.innerHTML = '<i data-lucide="sprout"></i>';
		box.append(icon, mk('strong', '', title), mk('p', '', text));
		if (withButton) {
			const btn = mk('button', 'button', 'Выбрать актив →');
			btn.type = 'button';
			btn.addEventListener('click', () => document.querySelector('[data-back-view="investments"]')?.click());
			box.append(btn);
		}
		list.replaceChildren(box);
	};

	const sell = async (asset, button) => {
		if (button.dataset.armed !== '1') {
			button.dataset.armed = '1';
			button.textContent = 'Точно продать?';
			window.setTimeout(() => { button.dataset.armed = ''; button.textContent = 'Продать'; }, 3000);
			return;
		}
		button.disabled = true;
		try {
			const data = await WindApi('/invest/sell', { method: 'POST', body: { asset } });
			apply(data);
			await window.Wallet?.load().catch(() => {});
			const pnl = Number(data.sold.pnl);
			showSuccess(`Продано на ${fmt(data.sold.amount)} ₽ · результат ${signed(pnl, ' ₽')}`);
		} catch (e) {
			button.disabled = false;
			showSuccess(e.message || 'Продажа не выполнена', 'error');
		}
	};

	const render = () => {
		if (!state) return;
		if (!state.positions.length) {
			renderEmpty('Инвестиций пока нет', 'Купи первый актив на вкладке «Инвестиции» — здесь появятся позиции и доходность.', true);
		} else {
			const frag = document.createDocumentFragment();
			frag.append(mk('p', 'portfolio-subhead', 'Инвестиции'));
			state.positions.forEach((p) => {
				const [color, icon] = ICONS[p.asset] || ['teal', 'circle'];
				const row = mk('div', 'portfolio-item');
				const main = mk('div', 'portfolio-main');
				const ic = mk('span', `asset-icon ${color}`);
				ic.innerHTML = `<i data-lucide="${icon}"></i>`;
				const info = mk('div');
				info.append(mk('strong', '', p.name), mk('small', '', `${fmt(p.quantity, 4)} ${p.unit} · вложено ${fmt(p.cost)} ₽`));
				main.append(ic, info);
				const side = mk('div', 'portfolio-side');
				const pnl = Number(p.pnl);
				const em = mk('em', pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : '', `${signed(pnl, ' ₽')} · ${signed(Number(p.pnl_pct), '%')}`);
				const sellBtn = mk('button', 'portfolio-sell', 'Продать');
				sellBtn.type = 'button';
				sellBtn.addEventListener('click', () => sell(p.asset, sellBtn));
				side.append(mk('span', '', `${fmt(p.value)} ₽`), em, sellBtn);
				row.append(main, side);
				frag.append(row);
			});
			list.replaceChildren(frag);
		}
		if (window.lucide) window.lucide.createIcons();

		const pnl = Number(state.pnl), pct = Number(state.pnl_pct), has = state.positions.length > 0;
		const strongs = document.querySelectorAll('#investment-profile .portfolio-summary strong');
		setText(strongs[1], has ? signed(pnl, ' ₽') : '0 ₽', has ? pnl : 0);
		setText(strongs[2], has ? signed(pct, '%') : '—', has ? pct : 0);
		setText(document.querySelector('[data-settings-yield]'), has ? signed(pct, '%') : '—', has ? pct : 0);

		// на карточках инвестиций показываем, сколько уже есть в портфеле
		document.querySelectorAll('.invest-card').forEach((card) => {
			const pos = state.positions.find((p) => p.asset === card.dataset.assetCode);
			let owned = card.querySelector('.inv-owned');
			if (!pos) { owned?.remove(); return; }
			if (!owned) {
				owned = mk('span', 'inv-owned');
				card.querySelector('.inv-title')?.append(owned);
			}
			owned.textContent = `В портфеле: ${fmt(pos.value)} ₽`;
		});
		window.dispatchEvent(new Event('wind-portfolio'));
	};

	const apply = (data) => {
		if (!data || !Array.isArray(data.positions)) return;
		state = data;
		render();
	};

	const load = async () => {
		if (!localStorage.getItem('wind_access_token')) {
			state = null;
			renderEmpty('Портфель доступен после входа', 'Войди в аккаунт, чтобы покупать активы и следить за доходностью.', false);
			window.dispatchEvent(new Event('wind-portfolio'));
			return;
		}
		try { apply(await WindApi('/invest/portfolio')); }
		catch (e) { renderEmpty('Не удалось загрузить портфель', e.message || 'Попробуй обновить страницу.', false); }
	};

	window.WindPortfolio = {
		apply,
		load,
		investedValue: () => (state ? Number(state.invested_value) || 0 : 0),
	};
	window.addEventListener('wind-auth', load);
	window.addEventListener('wind-logout', () => { state = null; load(); });
	document.querySelector('[data-open-investment-profile]')?.addEventListener('click', load);
	load();
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
		if (!d) { resetNum(n); return; }
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

(() => {
	const modal = document.getElementById('pay-topup-modal');
	const topup = document.getElementById('topup-modal');
	const topupSubmit = document.getElementById('topup-submit');
	if (!modal || !topup) return;
	const $ = (id) => document.getElementById(id);

	const cardPanel = $('pay-card-panel'), sbpPanel = $('pay-sbp-panel');
	const f = { number: $('pay-number'), name: $('pay-name'), exp: $('pay-exp'), cvc: $('pay-cvc') };
	const pv = { box: $('pay-card-visual'), number: $('pv-number'), name: $('pv-name'), exp: $('pv-exp'), cvc: $('pv-cvc'), brand: $('pv-brand') };
	const submit = $('pay-submit'), submitLabel = $('pay-submit-label'), spin = $('pay-spin'), cardErr = $('pay-card-error');
	const linkEl = $('pay-sbp-link'), timerEl = $('pay-sbp-timer'), sbpPaid = $('pay-sbp-paid'), sbpNote = $('pay-sbp-note');
	const TITLES = { card: 'Оплата картой', sbp: 'Оплата через СБП' };
	const fmt = (n) => Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 0 });

	let method = 'card', rub = 5000, busy = false, payTimeout = 0, sbpTimer = 0, sbpSeq = 0, sbpQr = null, sbpDemo = true;
	modal.querySelectorAll('#pay-card-panel .pay-card, #pay-card-panel .pay-field, #pay-card-panel .pay-demo-note').forEach((el) => { el.hidden = true; });

	const getRub = () => {
		const custom = Number($('custom-topup-amount')?.value || 0);
		if (custom > 0) return custom;
		return Number(topup.querySelector('.amount-option.active')?.dataset.amount || 5000);
	};

	// ---------- карта: картинка ----------
	const brandOf = (d) => {
		if (/^4/.test(d)) return ['visa', 'VISA'];
		if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720)/.test(d)) return ['mc', 'MASTERCARD'];
		if (/^220[0-4]/.test(d)) return ['mir', 'МИР'];
		return ['card', 'CARD'];
	};
	const updateVisual = () => {
		const d = f.number.value.replace(/\D/g, '');
		pv.number.textContent = (d + '•'.repeat(Math.max(0, 16 - d.length))).replace(/(.{4})/g, '$1 ').trim();
		pv.name.textContent = f.name.value.trim() || 'IVAN IVANOV';
		pv.exp.textContent = f.exp.value || 'ММ/ГГ';
		pv.cvc.textContent = '•'.repeat(f.cvc.value.length) || '•••';
		const [key, label] = brandOf(d);
		pv.box.dataset.brand = key;
		pv.brand.textContent = label;
	};

	// ---------- карта: ошибки и проверки ----------
	const wrap = (el) => el.closest('.pay-field');
	const showErr = (el, msg) => {
		const w = wrap(el);
		el.setAttribute('aria-invalid', 'true');
		w.querySelector('.pay-err').textContent = msg;
		w.classList.remove('shake');
		void w.offsetWidth;
		w.classList.add('shake');
	};
	const clearErr = (el) => {
		el.removeAttribute('aria-invalid');
		wrap(el).querySelector('.pay-err').textContent = '';
	};
	const luhn = (n) => {
		let sum = 0, alt = false;
		for (let i = n.length - 1; i >= 0; i--) {
			let x = Number(n[i]);
			if (alt) { x *= 2; if (x > 9) x -= 9; }
			sum += x;
			alt = !alt;
		}
		return sum % 10 === 0;
	};
	const validators = {
		number: () => {
			const d = f.number.value.replace(/\D/g, '');
			if (d.length < 13) return 'Введи номер карты полностью';
			return luhn(d) ? '' : 'Проверь номер карты';
		},
		name: () => {
			const v = f.name.value.trim();
			return v.length >= 3 && v.includes(' ') ? '' : 'Имя и фамилия латиницей, как на карте';
		},
		exp: () => {
			const v = f.exp.value;
			if (!/^\d{2}\/\d{2}$/.test(v)) return 'Формат ММ/ГГ';
			const m = Number(v.slice(0, 2)), y = 2000 + Number(v.slice(3));
			if (m < 1 || m > 12) return 'Неверный месяц';
			const now = new Date();
			if (y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1)) return 'Срок действия истёк';
			return '';
		},
		cvc: () => (f.cvc.value.length === 3 ? '' : 'Три цифры на обороте карты'),
	};

	// ---------- карта: ввод ----------
	f.number.addEventListener('input', () => {
		const d = f.number.value.replace(/\D/g, '').slice(0, 19);
		f.number.value = d.replace(/(.{4})/g, '$1 ').trim();
		clearErr(f.number);
		updateVisual();
	});
	f.name.addEventListener('input', () => {
		f.name.value = f.name.value.toUpperCase().replace(/[^A-Z .'-]/g, '');
		clearErr(f.name);
		updateVisual();
	});
	f.exp.addEventListener('input', () => {
		let d = f.exp.value.replace(/\D/g, '').slice(0, 4);
		if (d.length >= 3) d = `${d.slice(0, 2)}/${d.slice(2)}`;
		f.exp.value = d;
		clearErr(f.exp);
		updateVisual();
	});
	f.cvc.addEventListener('input', () => {
		f.cvc.value = f.cvc.value.replace(/\D/g, '').slice(0, 3);
		clearErr(f.cvc);
		updateVisual();
	});
	f.cvc.addEventListener('focus', () => pv.box.classList.add('flipped'));
	f.cvc.addEventListener('blur', () => pv.box.classList.remove('flipped'));
	Object.keys(f).forEach((k) => {
		f[k].addEventListener('blur', () => {
			if (!f[k].value) return;
			const msg = validators[k]();
			if (msg) showErr(f[k], msg);
		});
	});

	const resetCard = () => {
		cardPanel.reset();
		Object.values(f).forEach(clearErr);
		cardErr.textContent = '';
		pv.box.classList.remove('flipped');
		busy = false;
		submit.disabled = false;
		spin.hidden = true;
		submitLabel.textContent = `Оплатить ${fmt(rub)} ₽`;
		updateVisual();
	};

	cardPanel.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (busy) return;
		if (rub < 100) { cardErr.textContent = 'Минимальная сумма пополнения — 100 ₽. Нажми «Изменить» и увеличь сумму.'; return; }
		cardErr.textContent = '';
		busy = true;
		submit.disabled = true;
		spin.hidden = false;
		submitLabel.textContent = 'Проверяем платёж…';
		try {
			const payment = await window.WindApi('/payments/create', {
				method: 'POST',
				body: { amount: rub, method: 'card' },
			});
			window.location.assign(payment.confirmation_url);
		} catch (error) {
			busy = false;
			submit.disabled = false;
			spin.hidden = true;
			cardErr.textContent = error.message;
			submitLabel.textContent = `Оплатить ${fmt(rub)} ₽`;
		}
	});

	// ---------- СБП ----------
	const createSbp = async () => {
		const d = await window.WindApi('/payments/create', {
			method: 'POST',
			body: { amount: rub, method: 'sbp' },
		});
		if (typeof d.confirmation_url !== 'string' || !/^https:\/\//i.test(d.confirmation_url)) throw new Error('Платёжный сервис вернул неверную ссылку');
		return { url: d.confirmation_url, demo: false, paymentId: d.payment_id };
	};
	const drawSbpQr = (text) => {
		const box = $('pay-sbp-qr');
		if (!window.QRCode) { box.textContent = 'QR недоступен: не загрузилась библиотека'; return; }
		if (!sbpQr) {
			box.textContent = '';
			sbpQr = new QRCode(box, { text, width: 180, height: 180, colorDark: '#17201d', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
		} else {
			sbpQr.clear();
			sbpQr.makeCode(text);
		}
	};
	const runTimer = (ms) => {
		clearInterval(sbpTimer);
		const end = Date.now() + ms;
		sbpPaid.disabled = false;
		const tick = () => {
			const left = Math.max(0, end - Date.now());
			timerEl.textContent = `${String(Math.floor(left / 60000)).padStart(2, '0')}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`;
			if (!left) { clearInterval(sbpTimer); timerEl.textContent = 'время вышло'; sbpPaid.disabled = true; }
		};
		tick();
		sbpTimer = setInterval(tick, 1000);
	};
	const stopSbp = () => { clearInterval(sbpTimer); sbpSeq++; };
	const startSbp = async () => {
		const id = ++sbpSeq;
		clearInterval(sbpTimer);
		linkEl.removeAttribute('href');
		sbpPaid.disabled = true;
		if (rub < 100) {
			linkEl.textContent = 'Минимальная сумма — 100 ₽. Нажми «Изменить».';
			timerEl.textContent = '—';
			return;
		}
		linkEl.textContent = 'Создаём QR…';
		let inv;
		try { inv = await createSbp(); } catch (error) { linkEl.textContent = error.message; sbpNote.hidden = true; return; }
		if (id !== sbpSeq || method !== 'sbp' || modal.hidden) return; // пока ждали, пользователь ушёл
		sbpDemo = inv.demo;
		linkEl.textContent = inv.url;
		if (!inv.demo) linkEl.href = inv.url;
		sbpNote.hidden = !inv.demo;
		drawSbpQr(inv.url);
		runTimer(10 * 60 * 1000);
	};

	sbpPaid.addEventListener('click', () => {
		const amount = rub;
		closeModal(modal);
		showSuccess('Платёж обрабатывается. Баланс изменится только после подтверждения банка');
		Wallet.load().catch(() => {});
	});

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

	// ---------- переключение способов ----------
	const setMethod = (m) => {
		if (m === 'crypto') {
			closeModal(modal);
			topup.querySelector('.payment-option[data-payment="crypto"]')?.click();
			return;
		}
		method = m;
		$('pay-title').textContent = TITLES[m];
		modal.querySelectorAll('[data-pay-tab]').forEach((b) => b.classList.toggle('active', b.dataset.payTab === m));
		topup.querySelectorAll('.payment-option').forEach((o) => o.classList.toggle('active', o.dataset.payment === m));
		const show = m === 'card' ? cardPanel : sbpPanel;
		(m === 'card' ? sbpPanel : cardPanel).hidden = true;
		show.hidden = false;
		show.classList.remove('show');
		void show.offsetWidth;
		show.classList.add('show');
		if (m === 'sbp') startSbp();
		else {
			stopSbp();
			if (window.matchMedia('(hover: hover)').matches) setTimeout(() => f.number.focus(), 350);
		}
	};

	const open = (m) => {
		rub = getRub();
		$('pay-sum').textContent = `${fmt(rub)} ₽`;
		submitLabel.textContent = `Оплатить ${fmt(rub)} ₽`;
		modal.hidden = false;
		setMethod(m);
	};

	modal.querySelectorAll('[data-pay-tab]').forEach((b) => b.addEventListener('click', () => setMethod(b.dataset.payTab)));
	$('pay-change').addEventListener('click', () => { closeModal(modal); topup.hidden = false; });

	// выбор «Карта» или «СБП» в окне пополнения сразу открывает форму
	topup.querySelectorAll('.payment-option[data-payment="card"], .payment-option[data-payment="sbp"]').forEach((opt) => {
		opt.addEventListener('click', () => { closeModal(topup); open(opt.dataset.payment); });
	});
	// кнопка «Пополнить» открывает форму выбранного способа
	topupSubmit?.addEventListener('click', () => {
		const m = topup.querySelector('.payment-option.active')?.dataset.payment;
		if (m === 'card' || m === 'sbp') { closeModal(topup); open(m); }
	});

	// при закрытии окна чистим данные, таймеры и запросы
	new MutationObserver(() => {
		if (!modal.hidden) return;
		clearTimeout(payTimeout);
		stopSbp();
		resetCard();
	}).observe(modal, { attributes: true, attributeFilter: ['hidden'] });

	updateVisual();
})();



(() => {
	const modal = document.getElementById('subscription-modal');
	if (!modal) return;
	const $ = (id) => document.getElementById(id);
	const KEY = 'wind_plus';
	const PLANS = { month: { price: '199 ₽ / мес', days: 30, cost: 199 }, year: { price: '1 790 ₽ / год', days: 365, cost: 1790 } };
	const TF = { 15: '15 минут', 60: '1 час', 240: '4 часа', D: '1 день' };
	const COIN = (s) => s.slice(0, -4);
	const nowTime = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
	const fmtPrice = (p) => Number(p).toLocaleString('ru-RU', { maximumFractionDigits: p >= 1000 ? 2 : p >= 1 ? 4 : 6 });
	const pct = (v, d = 1) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
	const fmtVol = (v) => (v >= 1e9 ? `${(v / 1e9).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млрд $` : `${Math.round(v / 1e6).toLocaleString('ru-RU')} млн $`);
	const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
	const mk = (tag, cls, text) => {
		const n = document.createElement(tag);
		if (cls) n.className = cls;
		if (text != null) n.textContent = text;
		return n;
	};
	const icon = (name) => { const i = document.createElement('i'); i.setAttribute('data-lucide', name); return i; };
	const icons = () => { if (window.lucide) window.lucide.createIcons(); };
	const notify = (type, title, detail) => {
		portfolioNotifications.unshift({ type, title, detail, time: nowTime() });
		portfolioNotifications.splice(20);
		renderNotifications();
	};
	const readJSON = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? fb : v; } catch (e) { return fb; } };
	const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* хранилище недоступно */ } };

	// ---------- состояние подписки ----------
	const readState = () => {
		const s = readJSON(KEY, null);
		return s && PLANS[s.plan] && Number(s.until) > Date.now() ? { plan: s.plan, until: Number(s.until) } : null;
	};
	let state = null;
	const setPlus = (p) => { state = p && p.active ? { plan: p.plan, until: new Date(p.until).getTime() } : null; };
	let trialAvailable = false;
	window.addEventListener('wind-auth', (e) => {
		setPlus(e.detail && e.detail.plus);
		trialAvailable = Boolean(e.detail && e.detail.trial_available) && Boolean(localStorage.getItem('wind_access_token'));
		applyPlan();
	});
	window.addEventListener('wind-logout', () => { state = null; applyPlan(); });
	let plan = 'month';
	const isPlus = () => !!state && state.until > Date.now();

	const m = { sub: $('plus-subscribe'), status: $('plus-status'), plans: modal.querySelectorAll('[data-plan]') };
		const renderModal = () => {
		const on = isPlus();
		m.plans.forEach((b) => { b.classList.toggle('active', b.dataset.plan === plan); b.disabled = false; });
		const cost = PLANS[plan].cost;
		// Оплата идёт картой/СБП через ЮKassa, а не с баланса. Активную подписку можно продлить.
		m.sub.disabled = false;
		m.sub.textContent = on ? `Продлить на ${plan === 'year' ? 'год' : 'месяц'} · ${Wallet.format(cost)} →` : `Оформить за ${Wallet.format(cost)} →`;
		m.status.textContent = on
			? `Активна до ${new Date(state.until).toLocaleDateString('ru-RU')} · автосписаний нет`
			: 'Оплата картой или СБП · без автосписаний';
		m.status.classList.remove('warn');
		const trialBtn = $('plus-trial');
		if (trialBtn) trialBtn.hidden = on || !trialAvailable;
	};
	const applyPlan = () => {
		const on = isPlus();
		const name = on ? 'Wind Plus' : 'Free';
		document.body.classList.toggle('plus-active', on);
		document.querySelectorAll('.profile-meta').forEach((n) => { n.textContent = name; });
		document.querySelectorAll('.dropdown-user div span').forEach((n) => { n.textContent = `${name} · личный аккаунт`; });
		const sum = document.querySelector('.settings-summary > div:first-child strong');
		if (sum) sum.textContent = name;
		renderModal();
		document.dispatchEvent(new Event('wind-plus-change'));
	};

	m.plans.forEach((b) => b.addEventListener('click', () => { plan = b.dataset.plan; renderModal(); }));
	$('plus-trial')?.addEventListener('click', async (event) => {
		const btn = event.currentTarget;
		btn.disabled = true;
		try {
			const d = await WindApi('/subscription/trial', { method: 'POST' });
			trialAvailable = false;
			setPlus(d.plus);
			applyPlan();
			showSuccess('Wind Plus включён на 7 дней — без оплаты и автосписаний');
		} catch (e) {
			m.status.textContent = e.message;
			m.status.classList.add('warn');
		} finally {
			btn.disabled = false;
		}
	});
	m.sub.addEventListener('click', async () => {
		m.sub.disabled = true;
		try {
			const d = await WindApi('/subscription/payment', { method: 'POST', body: { plan, method: 'card' } });
			window.location.assign(d.confirmation_url);
		} catch (e) {
			m.sub.disabled = false;
			m.status.textContent = e.message;
			m.status.classList.add('warn');
		}
	});

	// ---------- заглушка «скелетон» для закрытых блоков ----------
	const skeleton = (box, n) => {
		box.textContent = '';
		for (let i = 0; i < n; i++) box.appendChild(mk('div', 'plus-skel'));
	};
	const message = (box, text) => { box.textContent = ''; box.appendChild(mk('div', 'alert-empty', text)); };

	// =====================================================
	//  АНАЛИЗ РЫНКА
	// =====================================================
	const an = { body: $('an-body'), sym: 'BTCUSDT', tf: '60', seq: 0, last: 0 };

	const ema = (arr, n) => {
		const k = 2 / (n + 1);
		const out = [arr[0]];
		for (let i = 1; i < arr.length; i++) out.push(arr[i] * k + out[i - 1] * (1 - k));
		return out;
	};
	const rsi = (c, n = 14) => {
		let g = 0, l = 0;
		for (let i = 1; i <= n; i++) { const d = c[i] - c[i - 1]; if (d >= 0) g += d; else l -= d; }
		let ag = g / n, al = l / n;
		for (let i = n + 1; i < c.length; i++) {
			const d = c[i] - c[i - 1];
			ag = (ag * (n - 1) + Math.max(d, 0)) / n;
			al = (al * (n - 1) + Math.max(-d, 0)) / n;
		}
		return al === 0 ? 100 : 100 - 100 / (1 + ag / al);
	};
	const sd = (a) => { const mean = avg(a); return Math.sqrt(avg(a.map((x) => (x - mean) * (x - mean)))); };

	const analyze = (cs) => {
		const closes = cs.map((c) => c.c);
		const n = closes.length;
		const last = closes[n - 1];
		const s20 = avg(closes.slice(-20)), s50 = avg(closes.slice(-50));
		const trend = last > s50 && s20 > s50 ? 1 : last < s50 && s20 < s50 ? -1 : 0;
		const e12 = ema(closes, 12), e26 = ema(closes, 26);
		const macdLine = e12.map((v, i) => v - e26[i]);
		const signal = ema(macdLine, 9);
		const hist = macdLine[n - 1] - signal[n - 1];
		const macd = Math.abs(hist) < last * 0.00003 ? 0 : hist > 0 ? 1 : -1;
		const r = rsi(closes);
		const rsiSig = r >= 70 ? -1 : r <= 30 ? 1 : 0;
		const mom = (last / closes[n - 25] - 1) * 100;
		const momSig = mom > 1 ? 1 : mom < -1 ? -1 : 0;
		const v50 = avg(cs.slice(-50).map((c) => c.v));
		const volRatio = v50 ? avg(cs.slice(-5).map((c) => c.v)) / v50 : 1;
		const rets = closes.slice(1).map((c, i) => Math.log(c / closes[i]));
		const volat = sd(rets.slice(-20)) / (sd(rets.slice(-100)) || 1);
		const support = Math.min(...cs.slice(-50).map((c) => c.l));
		const resistance = Math.max(...cs.slice(-50).map((c) => c.h));
		const sum = trend + macd + rsiSig + momSig;
		return { last, s20, s50, trend, macd, hist, r, rsiSig, mom, momSig, volRatio, volat, support, resistance, score: 50 + sum * 12.5 };
	};

	const renderAnalysis = (a) => {
		const body = an.body;
		body.textContent = '';
		const [verdict, vcls] = a.score >= 62 ? ['Бычий уклон', 'pos'] : a.score <= 38 ? ['Медвежий уклон', 'neg'] : ['Нейтрально', 'neu'];

		const head = mk('div', 'an-verdict');
		head.append(mk('strong', vcls, verdict), mk('span', '', `${COIN(an.sym)}/USDT · ${TF[an.tf]} · оценка ${Math.round(a.score)} из 100`));
		const track = mk('div', 'an-track');
		const marker = mk('span', 'an-marker');
		track.appendChild(marker);
		const scale = mk('div', 'an-scale');
		scale.append(mk('span', '', 'Медвежий'), mk('span', '', 'Нейтральный'), mk('span', '', 'Бычий'));

		const chip = (sig) => mk('span', `an-chip ${sig > 0 ? 'pos' : sig < 0 ? 'neg' : 'neu'}`, sig > 0 ? 'Позитив' : sig < 0 ? 'Негатив' : 'Нейтрально');
		const info = () => mk('span', 'an-chip neu', 'Инфо');
		const ind = (name, value, chipEl, text) => {
			const box = mk('div', 'an-ind');
			const top = mk('div', 'an-ind-top');
			top.append(mk('span', '', name), chipEl);
			box.append(top, mk('strong', '', value), mk('p', '', text));
			return box;
		};
		const grid = mk('div', 'an-grid');
		grid.append(
			ind('Тренд (SMA 20/50)', `${pct((a.last / a.s50 - 1) * 100)} к SMA50`, chip(a.trend),
				a.trend > 0 ? 'Цена выше средней за 50 свечей, короткая средняя выше длинной: восходящий тренд.' : a.trend < 0 ? 'Цена ниже средней за 50 свечей, короткая средняя ниже длинной: нисходящий тренд.' : 'Сигналы средних противоречат друг другу: чёткого тренда нет.'),
			ind('MACD', a.macd > 0 ? 'Бычий' : a.macd < 0 ? 'Медвежий' : 'Нейтральный', chip(a.macd),
				a.macd > 0 ? 'Гистограмма выше нуля: импульс на стороне покупателей.' : a.macd < 0 ? 'Гистограмма ниже нуля: импульс на стороне продавцов.' : 'Гистограмма около нуля: импульса нет.'),
			ind('RSI (14)', a.r.toFixed(0), chip(a.rsiSig),
				a.r >= 70 ? 'Зона перекупленности: после сильного роста возможна коррекция.' : a.r <= 30 ? 'Зона перепроданности: после сильного падения возможен отскок.' : 'Нейтральная зона: ни перекупленности, ни перепроданности.'),
			ind('Импульс, 24 свечи', pct(a.mom), chip(a.momSig),
				a.momSig > 0 ? 'Цена заметно выросла за последние 24 свечи.' : a.momSig < 0 ? 'Цена заметно снизилась за последние 24 свечи.' : 'Изменение за 24 свечи небольшое.'),
			ind('Объём торгов', `×${a.volRatio.toFixed(1)}`, info(),
				a.volRatio > 1.5 ? 'Объём последних 5 свечей заметно выше среднего: интерес к движению вырос.' : a.volRatio < 0.7 ? 'Объём ниже среднего: рынок затих.' : 'Объём близок к среднему за 50 свечей.'),
			ind('Волатильность', `×${a.volat.toFixed(1)}`, info(),
				a.volat > 1.3 ? 'Колебания сильнее обычного: движения резче, риск выше.' : a.volat < 0.8 ? 'Колебания слабее обычного: рынок спокоен.' : 'Колебания в пределах нормы.'),
		);

		const level = (title, value, note) => {
			const b = mk('div', 'an-level');
			b.append(mk('small', '', title), mk('strong', '', fmtPrice(value)), mk('span', '', note));
			return b;
		};
		const levels = mk('div', 'an-levels');
		levels.append(
			level('Поддержка (50 свечей)', a.support, pct((a.support / a.last - 1) * 100) + ' от цены'),
			level('Сейчас', a.last, 'USDT'),
			level('Сопротивление (50 свечей)', a.resistance, pct((a.resistance / a.last - 1) * 100) + ' от цены'),
		);

		const parts = [`${COIN(an.sym)} на таймфрейме «${TF[an.tf]}»: ${verdict.toLowerCase()}.`];
		parts.push(a.trend > 0 ? 'Тренд восходящий.' : a.trend < 0 ? 'Тренд нисходящий.' : 'Чёткого тренда нет.');
		if (a.rsiSig < 0) parts.push('RSI в зоне перекупленности, при росте стоит быть осторожнее.');
		if (a.rsiSig > 0) parts.push('RSI в зоне перепроданности, возможен отскок.');
		parts.push(`До поддержки около ${Math.abs((a.support / a.last - 1) * 100).toFixed(1)}%, до сопротивления около ${((a.resistance / a.last - 1) * 100).toFixed(1)}%.`);
		const summary = mk('p', 'an-summary', parts.join(' '));
		const note = mk('p', 'an-note', 'Расчёт по индикаторам, а не прогноз и не инвестиционная рекомендация.');

		body.append(head, track, scale, grid, levels, summary, note);
		requestAnimationFrame(() => requestAnimationFrame(() => { marker.style.left = `${a.score}%`; }));
	};

	const loadAnalysis = async () => {
		if (!isPlus() || !an.body) return;
		const id = ++an.seq;
		an.last = Date.now();
		try {
			const r = await fetch(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${an.sym}&interval=${an.tf}&limit=200`);
			const j = await r.json();
			if (j.retCode !== 0) throw new Error(j.retMsg);
			if (id !== an.seq) return;
			const cs = j.result.list.slice().reverse().map(([, , h, l, c, v]) => ({ h: Number(h), l: Number(l), c: Number(c), v: Number(v) }));
			if (cs.length < 60) throw new Error('few candles');
			renderAnalysis(analyze(cs));
		} catch (e) {
			if (id === an.seq) message(an.body, 'Не удалось получить данные. Проверь соединение.');
		}
	};

	document.querySelectorAll('#an-coins .alert-coin').forEach((b) => b.addEventListener('click', () => {
		an.sym = b.dataset.symbol;
		document.querySelectorAll('#an-coins .alert-coin').forEach((x) => x.classList.toggle('active', x === b));
		loadAnalysis();
	}));
	document.querySelectorAll('#an-tf button').forEach((b) => b.addEventListener('click', () => {
		an.tf = b.dataset.tf;
		document.querySelectorAll('#an-tf button').forEach((x) => x.classList.toggle('active', x === b));
		loadAnalysis();
	}));

	// =====================================================
	//  РАДАР КРИПТОРЫНКА И НОВЫЕ ЛИСТИНГИ
	// =====================================================
	const rd = { body: $('radar-body'), tab: 'up', liquid: [], seq: 0, last: 0 };
	const KNOWN = 'wind_known_symbols', LIST = 'wind_new_listings';
	let known = readJSON(KNOWN, null);
	if (!Array.isArray(known)) known = null; else known = known.filter((s) => typeof s === 'string');
	let listings = readJSON(LIST, []);
	listings = (Array.isArray(listings) ? listings : [])
		.filter((x) => x && /^[A-Z0-9]{2,20}USDT$/.test(x.symbol) && Number(x.ts) > 0)
		.map((x) => ({ symbol: x.symbol, price: Number(x.price) || 0, ts: Number(x.ts) }));

	const detect = (all) => {
		if (all.length < 100) return; // неполный ответ биржи не учитываем
		if (!known) { known = all.map((t) => t.symbol); writeJSON(KNOWN, known); return; }
		const set = new Set(known);
		const fresh = all.filter((t) => !set.has(t.symbol));
		if (!fresh.length) return;
		known = known.concat(fresh.map((t) => t.symbol));
		writeJSON(KNOWN, known);
		if (fresh.length > 30) return; // скорее всего, первый список был неполным
		fresh.forEach((t) => listings.unshift({ symbol: t.symbol, price: t.price, ts: Date.now() }));
		listings = listings.slice(0, 20);
		writeJSON(LIST, listings);
		const title = `Новый листинг: ${COIN(fresh[0].symbol)}/USDT${fresh.length > 1 ? ` и ещё ${fresh.length - 1}` : ''}`;
		notify('positive', title, 'Пара появилась на Bybit Spot');
		showSuccess(title);
	};

	const renderRadar = () => {
		const body = rd.body;
		if (!body) return;
		body.textContent = '';
		const list = mk('div', 'rd-list');
		if (rd.tab === 'new') {
			const fresh = listings.filter((x) => Date.now() - x.ts < 7 * 864e5);
			if (!fresh.length) {
				message(body, known ? `Радар следит за ${known.length} парами. Новая пара появится здесь и в уведомлениях, как только её добавит Bybit.` : 'Радар запоминает список пар. Новые листинги появятся здесь при следующих проверках.');
				return;
			}
			fresh.forEach((x, i) => {
				const row = mk('div', 'rd-row');
				row.style.setProperty('--i', i);
				const name = mk('div', 'rd-name');
				name.append(mk('strong', '', `${COIN(x.symbol)}/USDT`), mk('small', '', `Обнаружена ${new Date(x.ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`));
				const badge = mk('span', 'asset-badge badge-new');
				badge.append(icon('sparkles'), document.createTextNode(' Новое'));
				row.append(mk('span', 'rd-ava', COIN(x.symbol).slice(0, 3)), name, mk('div', 'rd-price', x.price ? fmtPrice(x.price) : '—'), badge);
				list.appendChild(row);
			});
			body.appendChild(list);
			icons();
			return;
		}
		if (!rd.liquid.length) { skeleton(body, 5); return; }
		rd.liquid.slice().sort((a, b) => (rd.tab === 'up' ? b.pct - a.pct : a.pct - b.pct)).slice(0, 6).forEach((t, i) => {
			const row = mk('div', 'rd-row');
			row.style.setProperty('--i', i);
			const name = mk('div', 'rd-name');
			name.append(mk('strong', '', `${COIN(t.symbol)}/USDT`), mk('small', '', `Объём 24ч: ${fmtVol(t.turnover)}`));
			const pill = mk('span', `change-pill ${t.pct >= 0 ? 'up' : 'down'}`, `${t.pct >= 0 ? '▲' : '▼'} ${Math.abs(t.pct).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`);
			row.append(mk('span', 'rd-ava', COIN(t.symbol).slice(0, 3)), name, mk('div', 'rd-price', fmtPrice(t.price)), pill);
			list.appendChild(row);
		});
		body.appendChild(list);
	};

	const loadRadar = async () => {
		if (!isPlus() || !rd.body) return;
		const id = ++rd.seq;
		rd.last = Date.now();
		try {
			const r = await fetch('https://api.bybit.com/v5/market/tickers?category=spot');
			const j = await r.json();
			if (j.retCode !== 0) throw new Error(j.retMsg);
			if (id !== rd.seq) return;
			const all = j.result.list
				.filter((t) => /^[A-Z0-9]+USDT$/.test(t.symbol))
				.map((t) => ({ symbol: t.symbol, price: Number(t.lastPrice), pct: Number(t.price24hPcnt) * 100, turnover: Number(t.turnover24h) }))
				.filter((t) => t.price > 0 && Number.isFinite(t.pct));
			detect(all);
			rd.liquid = all.filter((t) => t.turnover >= 1e6);
			renderRadar();
		} catch (e) {
			if (id === rd.seq && !rd.liquid.length && rd.tab !== 'new') message(rd.body, 'Не удалось получить данные. Проверь соединение.');
		}
	};

	document.querySelectorAll('[data-radar-tab]').forEach((b) => b.addEventListener('click', () => {
		rd.tab = b.dataset.radarTab;
		document.querySelectorAll('[data-radar-tab]').forEach((x) => x.classList.toggle('active', x === b));
		renderRadar();
	}));

	// =====================================================
	//  РАДАР НОВЫХ ИНВЕСТИЦИЙ (демо-данные)
	// =====================================================
	const NEW_ITEMS = [
		{ id: 'etf-tech', icon: 'cpu', name: 'БПИФ на технологические компании', type: 'ETF', risk: 'mid', term: 'от 1 года', min: 1000, note: 'Фонд на акции российских технологических компаний' },
		{ id: 'ofz-float', icon: 'landmark', name: 'ОФЗ с плавающим купоном', type: 'Облигации', risk: 'low', term: '3–5 лет', min: 1000, note: 'Купон привязан к ключевой ставке' },
		{ id: 'green-bond', icon: 'leaf', name: 'Зелёные облигации', type: 'Облигации', risk: 'low', term: '2–4 года', min: 1000, note: 'Выпуск для финансирования экологических проектов' },
		{ id: 'ipo', icon: 'rocket', name: 'Первичное размещение акций (IPO)', type: 'IPO', risk: 'high', term: 'от 1 года', min: 5000, note: 'Участие в размещении акций новой компании' },
		{ id: 'crypto-index', icon: 'bitcoin', name: 'Индекс крупнейших криптовалют', type: 'Крипто', risk: 'high', term: 'от 1 года', min: 3000, note: 'Корзина из нескольких крупных монет' },
	];
	const RISK = { low: 'Риск: низкий', mid: 'Риск: средний', high: 'Риск: высокий' };
	let followed = readJSON('wind_followed', []);
	followed = (Array.isArray(followed) ? followed : []).filter((id) => NEW_ITEMS.some((x) => x.id === id));

	const renderNew = () => {
		const list = $('ni-list');
		if (!list) return;
		list.textContent = '';
		NEW_ITEMS.forEach((it) => {
			const on = followed.includes(it.id);
			const row = mk('div', 'ni-row');
			const ico = mk('span', 'ni-icon');
			ico.appendChild(icon(it.icon));
			const top = mk('div', 'ni-top');
			const badge = mk('span', 'asset-badge badge-new');
			badge.append(icon('sparkles'), document.createTextNode(' Новое'));
			top.append(mk('strong', '', it.name), badge);
			const chips = mk('div', 'ni-chips');
			chips.append(mk('span', 'ni-chip', it.type), mk('span', `ni-chip risk-${it.risk}`, RISK[it.risk]), mk('span', 'ni-chip', `Срок: ${it.term}`), mk('span', 'ni-chip', `От ${it.min.toLocaleString('ru-RU')} ₽`));
			const main = mk('div', 'ni-main');
			main.append(top, mk('p', '', it.note), chips);
			const btn = mk('button', `ni-follow${on ? ' on' : ''}`, on ? 'Отслеживается ✓' : 'Следить');
			btn.type = 'button';
			btn.addEventListener('click', () => {
				if (!isPlus()) return;
				followed = on ? followed.filter((x) => x !== it.id) : followed.concat(it.id);
				writeJSON('wind_followed', followed);
				if (!on) notify('neutral', `Следим: ${it.name}`, 'Сообщим о новых выпусках и размещениях');
				showSuccess(on ? `Отслеживание отключено: ${it.name}` : `Следим: ${it.name}`);
				renderNew();
			});
			row.append(ico, main, btn);
			list.appendChild(row);
		});
		icons();
	};

	// =====================================================
	//  ЗАГРУЗКА / ОБНОВЛЕНИЕ
	// =====================================================
	const tick = () => {
		if (!isPlus()) return;
		const onCrypto = document.body.dataset.view === 'crypto';
		if (onCrypto && Date.now() - an.last > 60000) loadAnalysis();
		if (Date.now() - rd.last > (onCrypto ? 30000 : 300000)) loadRadar();
	};

	document.addEventListener('wind-plus-change', () => {
		if (isPlus()) {
			if (an.body) message(an.body, 'Загружаем анализ…');
			an.last = 0; rd.last = 0;
			tick();
		} else {
			an.seq++; rd.seq++;
			if (an.body) skeleton(an.body, 4);
			if (rd.body) skeleton(rd.body, 5);
		}
		renderNew();
	});
	new MutationObserver(tick).observe(document.body, { attributes: true, attributeFilter: ['data-view'] });
	setInterval(tick, 5000);
	Wallet.onChange(renderModal);
	applyPlan();
})();

(() => {
	const tabs = document.querySelectorAll('[data-game-tab]');
	if (!tabs.length) return;
	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// ---------- общие помощники ----------
	const mk = (tag, cls, text) => {
		const n = document.createElement(tag);
		if (cls) n.className = cls;
		if (text != null) n.textContent = text;
		return n;
	};
	const icon = (name) => { const i = document.createElement('i'); i.setAttribute('data-lucide', name); return i; };
	const icons = () => { if (window.lucide) window.lucide.createIcons(); };
	const btn = (cls, text, onClick) => { const b = mk('button', cls, text); b.type = 'button'; if (onClick) b.addEventListener('click', onClick); return b; };
	const shuffle = (a) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
	const money = (n) => `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n)).toLocaleString('ru-RU')}`;
	const fit = (cv) => {
		const r = cv.getBoundingClientRect();
		const dpr = window.devicePixelRatio || 1;
		cv.width = Math.max(1, Math.round(r.width * dpr));
		cv.height = Math.max(1, Math.round(r.height * dpr));
		return dpr;
	};
	const tween = (node, from, to, ms, fmt) => {
		const t0 = performance.now();
		const step = (now) => {
			const k = reduce ? 1 : Math.min(1, (now - t0) / ms);
			node.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3)));
			if (k < 1) requestAnimationFrame(step);
		};
		requestAnimationFrame(step);
	};

	// ---------- звёзды ----------
	const SKEY = 'wind_game_stars';
	let stars = {};
	try { const v = JSON.parse(localStorage.getItem(SKEY) || '{}'); if (v && typeof v === 'object' && !Array.isArray(v)) stars = v; } catch (e) { stars = {}; }
	const getStars = (id) => { const n = Number(stars[id]); return Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0; };
	const paintStars = () => document.querySelectorAll('[data-stars]').forEach((e) => {
		const n = getStars(e.dataset.stars);
		e.textContent = '★'.repeat(n) + '☆'.repeat(3 - n);
	});
	const setStars = (id, n) => {
		if (n > getStars(id)) {
			stars[id] = n;
			try { localStorage.setItem(SKEY, JSON.stringify(stars)); } catch (e) { /* хранилище недоступно */ }
		}
		paintStars();
	};

	const confetti = (host) => {
		if (reduce) return;
		const wrap = mk('div', 'confetti');
		const colors = ['#2d9b6f', '#f4c95d', '#ed8069', '#7b83d9', '#77d5a7'];
		for (let i = 0; i < 36; i++) {
			const p = mk('i');
			p.style.setProperty('--x', `${Math.random() * 100}%`);
			p.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
			p.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
			p.style.setProperty('--d', `${1.6 + Math.random() * 1.4}s`);
			p.style.setProperty('--w', `${Math.random() * 0.5}s`);
			p.style.background = colors[i % colors.length];
			wrap.appendChild(p);
		}
		host.appendChild(wrap);
		setTimeout(() => wrap.remove(), 3400);
	};

	// ---------- экраны: сцена, вступление, итоги ----------
	const scene = (root, kicker, title, text) => {
		root.textContent = '';
		const story = mk('div', 'cg-story');
		const ch = mk('div', 'cg-chapter');
		ch.append(mk('span', '', kicker), mk('strong', '', title));
		story.append(ch, mk('p', '', text));
		const stage = mk('div', 'gm-stage');
		root.append(story, stage);
		return stage;
	};
	const intro = (stage, { ico, heading, lines, label, onStart }) => {
		const box = mk('div', 'gm-intro');
		const ic = mk('span', 'gm-intro-icon');
		ic.appendChild(icon(ico));
		const ul = mk('ul', 'gm-rules');
		lines.forEach((t) => ul.appendChild(mk('li', '', t)));
		box.append(ic, mk('strong', '', heading), ul, btn('button', label, onStart));
		stage.appendChild(box);
		icons();
	};
	const result = (root, id, o) => {
		const stage = scene(root, o.kicker, o.title, o.text);
		const box = mk('div', 'gm-result');
		const ic = mk('span', `gm-intro-icon${o.win ? '' : ' lose'}`);
		ic.appendChild(icon(o.win ? 'trophy' : 'frown'));
		const row = mk('div', 'gm-stars');
		for (let i = 0; i < 3; i++) {
			const s = mk('span', i < o.stars ? 'on' : '', '★');
			s.style.setProperty('--i', i);
			row.appendChild(s);
		}
		const list = mk('div', 'gm-stats-list');
		o.rows.forEach(([k, v]) => {
			const r = mk('div');
			r.append(mk('span', '', k), mk('strong', '', v));
			list.appendChild(r);
		});
		box.append(ic, mk('strong', 'gm-result-title', o.heading), row, list);
		if (o.extra) box.appendChild(o.extra);
		box.append(mk('p', 'gm-tip', o.tip), btn('button', 'Сыграть ещё раз', o.again));
		stage.appendChild(box);
		setStars(id, o.stars);
		if (o.stars >= 2) confetti(root);
		icons();
	};

	// =====================================================
	//  ИГРА 1. ДЕТЕКТИВ СВЕЧЕЙ
	// =====================================================
	const initCandles = (root) => {
		const cd = (o, c, up, dn) => ({ o, c, h: Math.max(o, c) + up, l: Math.min(o, c) - dn });
		const PATTERNS = [
			{ name: 'Молот', dir: -1, make: (p) => [cd(p - 0.4, p + 1.2, 0.3, 6)], text: 'Маленькое тело вверху и длинная нижняя тень после падения. Продавцы давили цену вниз, но покупатели выкупили её обратно. Часто это сигнал возможного разворота вверх.' },
			{ name: 'Падающая звезда', dir: 1, make: (p) => [cd(p + 0.4, p - 1.2, 6, 0.3)], text: 'Длинная верхняя тень и маленькое тело после роста. Покупатели пытались поднять цену, но продавцы вернули её вниз. Возможен разворот вниз.' },
			{ name: 'Бычье поглощение', dir: -1, inc: 1, make: (p, prev) => [cd(prev.c - 0.8, prev.o + 2, 0.6, 0.6)], text: 'Зелёная свеча полностью перекрывает тело предыдущей красной. Покупатели перехватили инициативу у продавцов. Возможен разворот вверх.' },
			{ name: 'Медвежье поглощение', dir: 1, inc: 1, make: (p, prev) => [cd(prev.c + 0.8, prev.o - 2, 0.6, 0.6)], text: 'Красная свеча полностью перекрывает тело предыдущей зелёной. Продавцы перехватили инициативу. Возможен разворот вниз.' },
			{ name: 'Доджи', dir: 1, make: (p) => [cd(p, p + 0.15, 5, 5)], text: 'Цена открытия и закрытия почти совпали, а тени длинные. Рынок не может определиться. После сильного движения доджи часто предупреждает об остановке или развороте.' },
			{ name: 'Три белых солдата', dir: -1, make: (p) => { const a = cd(p - 0.3, p + 4, 0.5, 0.4); const b = cd(a.c - 0.5, a.c + 4, 0.5, 0.4); const c = cd(b.c - 0.5, b.c + 4, 0.5, 0.4); return [a, b, c]; }, text: 'Три подряд уверенные зелёные свечи с небольшими тенями после падения. Покупатели берут рынок под контроль. Это сильный сигнал разворота вверх.' },
		];
		const TITLES = ['Тихий разворот', 'Тень над рынком', 'Перехват инициативы', 'Падение с высоты', 'Минута молчания', 'Марш на север'];
		let raf = 0;
		const stop = () => cancelAnimationFrame(raf);

		const trend = (n, start, dir) => {
			const out = [];
			let p = start;
			for (let i = 0; i < n; i++) {
				let step = dir * (2 + Math.random() * 2);
				if (i < n - 1 && Math.random() < 0.2) step = -step * 0.4;
				out.push(cd(p, p + step, Math.random() * 1.2, Math.random() * 1.2));
				p += step;
			}
			return out;
		};
		const makeCase = (pat) => {
			const tr = trend(9, pat.dir < 0 ? 80 : 30, pat.dir);
			const last = tr[tr.length - 1];
			return { cs: tr.concat(pat.make(last.c, last)), hi: tr.length - (pat.inc || 0), pat };
		};

		const drawChart = (cv, a) => {
			const ctx = cv.getContext('2d');
			const w = cv.width / a.dpr, h = cv.height / a.dpr;
			ctx.setTransform(a.dpr, 0, 0, a.dpr, 0, 0);
			ctx.clearRect(0, 0, w, h);
			const lo = Math.min(...a.cs.map((c) => c.l)), hi = Math.max(...a.cs.map((c) => c.h));
			const span = hi - lo || 1;
			const min = lo - span * 0.08, max = hi + span * 0.3;
			const y = (v) => h - ((v - min) / (max - min)) * h;
			ctx.strokeStyle = 'rgba(120,140,130,.2)';
			ctx.lineWidth = 1;
			for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(0, (h / 5) * k); ctx.lineTo(w, (h / 5) * k); ctx.stroke(); }
			const cw = w / (a.cs.length + 1);
			a.cs.forEach((c, i) => {
				const al = Math.max(0, Math.min(1, a.reveal - i));
				if (al <= 0) return;
				const x = (i + 1) * cw;
				const col = c.c >= c.o ? '#2d9b6f' : '#d97867';
				ctx.globalAlpha = al;
				ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
				ctx.beginPath(); ctx.moveTo(x, y(c.h)); ctx.lineTo(x, y(c.l)); ctx.stroke();
				ctx.fillRect(x - cw * 0.28, y(Math.max(c.o, c.c)), cw * 0.56, Math.max(2, Math.abs(y(c.o) - y(c.c))));
			});
			ctx.globalAlpha = 1;
			if (a.mark) {
				const x0 = (a.hi + 1) * cw - cw * 0.6, x1 = a.cs.length * cw + cw * 0.6;
				const pts = a.cs.slice(a.hi);
				const yT = y(Math.max(...pts.map((c) => c.h))) - 8, yB = y(Math.min(...pts.map((c) => c.l))) + 8;
				ctx.save();
				ctx.shadowColor = '#f4c95d'; ctx.shadowBlur = 10 + 8 * Math.sin(a.t * 5);
				ctx.strokeStyle = '#e0a82e'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
				ctx.strokeRect(x0, yT, x1 - x0, yB - yT);
				ctx.restore();
				ctx.fillStyle = '#e0a82e';
				ctx.font = '700 14px "Space Grotesk", sans-serif';
				ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
				ctx.fillText(a.pat.name, Math.min(w - 70, Math.max(70, (x0 + x1) / 2)), Math.max(16, yT - 4));
			}
		};

		let score = 0;
		const showCase = (order, idx) => {
			stop();
			const c = makeCase(order[idx]);
			const stage = scene(root, `Дело №${idx + 1} из ${order.length}`, TITLES[idx], 'Изучи свечи на графике и назови паттерн, который формируют последние свечи.');
			const bar = mk('div', 'gm-progress');
			const barFill = mk('span');
			barFill.style.width = `${(idx / order.length) * 100}%`;
			bar.appendChild(barFill);
			const box = mk('div', 'gm-chart-box');
			const cv = mk('canvas', 'gm-canvas');
			const stamp = mk('div', 'gm-stamp');
			stamp.hidden = true;
			box.append(cv, stamp);
			const opts = mk('div', 'gm-options');
			const fb = mk('div', 'gm-feedback');
			fb.hidden = true;
			stage.append(bar, box, mk('p', 'gm-question', 'Какой это паттерн?'), opts, fb);

			const a = { cs: c.cs, hi: c.hi, pat: c.pat, reveal: 0, mark: false, t: 0, dpr: fit(cv) };
			new ResizeObserver(() => { a.dpr = fit(cv); }).observe(cv);
			let last = performance.now();
			const loop = (now) => {
				const dt = Math.min(0.05, (now - last) / 1000);
				last = now;
				if (root.offsetParent) {
					a.t += dt;
					if (a.reveal < a.cs.length) a.reveal = Math.min(a.cs.length, a.reveal + dt * (reduce ? 100 : 9));
					drawChart(cv, a);
				}
				raf = requestAnimationFrame(loop);
			};
			raf = requestAnimationFrame(loop);

			const names = shuffle([c.pat.name].concat(shuffle(PATTERNS.filter((p) => p !== c.pat)).slice(0, 2).map((p) => p.name)));
			names.forEach((n) => {
				const b = btn('gm-option', n, () => {
					const ok = n === c.pat.name;
					if (ok) score++;
					opts.querySelectorAll('button').forEach((x) => {
						x.disabled = true;
						if (x.textContent === c.pat.name) x.classList.add('correct');
						else if (x === b) x.classList.add('wrong');
					});
					a.mark = true;
					a.reveal = a.cs.length;
					stamp.hidden = false;
					stamp.className = `gm-stamp ${ok ? 'ok' : 'bad'}`;
					stamp.textContent = ok ? 'РАСКРЫТО' : 'УЛИКА УПУЩЕНА';
					fb.hidden = false;
					fb.className = `gm-feedback ${ok ? 'good' : 'bad'}`;
					fb.append(mk('strong', '', ok ? `Верно: ${c.pat.name}` : `Это было: ${c.pat.name}`), mk('p', '', c.pat.text));
					const last = idx + 1 >= order.length;
					fb.appendChild(btn('button', last ? 'Закрыть дело →' : 'Следующее дело →', () => (last ? finish(order.length) : showCase(order, idx + 1))));
				});
				opts.appendChild(b);
			});
		};

		const finish = (n) => {
			stop();
			const st = score >= 5 ? 3 : score >= 4 ? 2 : score >= 2 ? 1 : 0;
			result(root, 'candles', {
				kicker: 'Дело закрыто', title: 'Детектив свечей', text: 'Агентство «Свеча» подводит итоги расследования.',
				win: st >= 1, stars: st,
				heading: st === 3 ? 'Лучший детектив города' : st === 2 ? 'Опытный следователь' : st === 1 ? 'Стажёр с потенциалом' : 'Улики ускользнули',
				rows: [['Раскрыто дел', `${score} из ${n}`]],
				tip: 'Свечной паттерн это подсказка, а не прогноз. Подтверждай сигнал уровнями, объёмом и индикаторами (их считает раздел «Анализ рынка» в Wind Plus).',
				again: open,
			});
		};

		const open = () => {
			stop();
			score = 0;
			const stage = scene(root, 'Дело о фальшивых сигналах', 'Детектив свечей', 'В Wind Finance кто-то подбрасывает ложные сигналы. Ты младший аналитик агентства «Свеча». Улики спрятаны в графиках: узнавай паттерны, пока вор не ушёл.');
			intro(stage, {
				ico: 'search', heading: 'Готов к расследованию?',
				lines: ['6 дел, в каждом график с одним свечным паттерном', 'Выбери верное название из трёх вариантов', 'После ответа узнаешь, что паттерн значит на практике'],
				label: 'Начать расследование', onStart: () => showCase(shuffle(PATTERNS), 0),
			});
		};
		open();
	};

	// =====================================================
	//  ИГРА 2. РИСК-КАПИТАН
	// =====================================================
	const initRisk = (root) => {
		const START = 10000;
		const SEQ = ['L', 'L', 'L', 'L', 'W', 'L', 'W', 'L', 'W', 'W'];
		const RISKS = [1, 5, 20, 50];
		const STORY = [
			'Утро. Громкий твит двигает рынок. Первая сделка рейса.',
			'Новости о регуляторах. Волны крепчают.',
			'Крупный игрок продаёт позицию. Паруса дрожат.',
			'Ложный пробой: рынок обманул всех.',
			'Макроданные вышли лучше ожиданий.',
			'Боковик: цена мечется между уровнями.',
			'Пробой уровня на высоком объёме.',
			'Эхо вчерашней паники ещё не стихло.',
			'Рынок успокаивается, тренд набирает силу.',
			'Финальный рывок: порт уже виден.',
		];
		let raf = 0;
		const stop = () => cancelAnimationFrame(raf);
		const st = { cap: START, peak: START, dd: 0, i: 0, ruined: false };

		const sim = (r) => {
			let cap = START, peak = START, dd = 0, ruined = false;
			for (const s of SEQ) {
				cap *= s === 'W' ? 1 + (2 * r) / 100 : 1 - r / 100;
				peak = Math.max(peak, cap);
				dd = Math.max(dd, 1 - cap / peak);
				if (cap < START * 0.1) { ruined = true; break; }
			}
			return { cap, dd, ruined };
		};

		const makePath = (win) => {
			const N = 70, end = win ? 2 : -1;
			const ph = [Math.random() * 6, Math.random() * 6, Math.random() * 6];
			const pts = [];
			for (let k = 0; k <= N; k++) {
				const t = k / N;
				const base = end * (t * t * (3 - 2 * t) * 0.6 + t * 0.4);
				const noise = (Math.sin(t * 9 + ph[0]) * 0.22 + Math.sin(t * 17 + ph[1]) * 0.12 + Math.sin(t * 31 + ph[2]) * 0.05) * Math.sin(Math.PI * t);
				pts.push(Math.max(-0.92, Math.min(1.92, base + noise)));
			}
			pts[N] = end;
			return pts;
		};

		const drawPath = (cv, a) => {
			const ctx = cv.getContext('2d');
			const w = cv.width / a.dpr, h = cv.height / a.dpr;
			ctx.setTransform(a.dpr, 0, 0, a.dpr, 0, 0);
			ctx.clearRect(0, 0, w, h);
			const Y = (v) => h - ((v + 1.3) / 3.7) * h;
			const line = (v, col, label) => {
				ctx.setLineDash([6, 5]); ctx.strokeStyle = col; ctx.lineWidth = 1.5;
				ctx.beginPath(); ctx.moveTo(0, Y(v)); ctx.lineTo(w, Y(v)); ctx.stroke();
				ctx.setLineDash([]);
				ctx.fillStyle = col; ctx.font = '700 11px "DM Sans", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
				ctx.fillText(label, 8, Y(v) - 3);
			};
			line(2, '#2d9b6f', 'ЦЕЛЬ'); line(-1, '#d97867', 'СТОП'); line(0, 'rgba(120,140,130,.8)', 'ВХОД');
			if (!a.pts) return;
			const n = a.pts.length - 1, upto = a.p * n;
			const X = (k) => 8 + (k / n) * (w - 16);
			const color = a.p >= 1 ? (a.win ? '#2d9b6f' : '#d97867') : '#e0a82e';
			ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineJoin = 'round';
			ctx.beginPath(); ctx.moveTo(X(0), Y(a.pts[0]));
			for (let k = 1; k <= Math.floor(upto); k++) ctx.lineTo(X(k), Y(a.pts[k]));
			let hx = X(Math.floor(upto)), hy = Y(a.pts[Math.floor(upto)]);
			if (Math.floor(upto) < n) {
				const f = upto - Math.floor(upto), k = Math.floor(upto);
				hx = X(k + f); hy = Y(a.pts[k] + (a.pts[k + 1] - a.pts[k]) * f);
				ctx.lineTo(hx, hy);
			}
			ctx.stroke();
			ctx.save();
			ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.fillStyle = color;
			ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2); ctx.fill();
			ctx.restore();
		};

		const round = () => {
			stop();
			const win = SEQ[st.i] === 'W';
			const stopPct = [1.5, 2, 2.5, 3][Math.floor(Math.random() * 4)];
			const entry = 20 + Math.random() * 380;
			const fix = (v) => v.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
			const stage = scene(root, `Сделка ${st.i + 1} из ${SEQ.length}`, 'Штормовое море', STORY[st.i]);

			const capEl = mk('strong', '', money(st.cap));
			const ddEl = mk('strong', '', `${Math.round(st.dd * 100)}%`);
			const stat = (label, node) => { const d = mk('div'); d.append(mk('span', '', label), node); return d; };
			const stats = mk('div', 'gm-stat-row');
			stats.append(stat('Капитал', capEl), stat('Просадка', ddEl), stat('Сделка', mk('strong', '', `${st.i + 1}/${SEQ.length}`)));
			const hull = mk('div', 'rk-hull');
			const hullBar = mk('span');
			hull.appendChild(hullBar);
			const paintHull = () => {
				const p = Math.max(0, Math.min(100, (st.cap / START) * 100));
				hullBar.style.width = `${p}%`;
				hull.dataset.level = p > 70 ? 'ok' : p > 40 ? 'warn' : 'bad';
			};
			paintHull();

			const setup = mk('div', 'rk-setup');
			[['Вход', fix(entry), ''], ['Стоп', fix(entry * (1 - stopPct / 100)), `−${stopPct}%`], ['Цель', fix(entry * (1 + (2 * stopPct) / 100)), `+${2 * stopPct}%`]].forEach(([k, v, s]) => {
				const d = mk('div');
				const strong = mk('strong', '', v);
				if (s) strong.appendChild(mk('small', '', s));
				d.append(mk('span', '', k), strong);
				setup.appendChild(d);
			});

			const box = mk('div', 'gm-chart-box rk-chart');
			const cv = mk('canvas', 'gm-canvas');
			box.appendChild(cv);
			const grid = mk('div', 'rk-risks');
			const banner = mk('div', 'rk-banner');
			banner.hidden = true;
			stage.append(stats, hull, setup, box, mk('p', 'gm-question', 'Какую долю капитала ты ставишь на риск? Цель приносит вдвое больше, чем стоп отнимает.'), grid, banner);

			const a = { pts: null, p: 0, win, dpr: fit(cv) };
			drawPath(cv, a);
			new ResizeObserver(() => { a.dpr = fit(cv); drawPath(cv, a); }).observe(cv);

			const end = (risk) => {
				const delta = win ? risk * 2 : -risk;
				const from = st.cap;
				st.cap = Math.max(0, st.cap + delta);
				st.peak = Math.max(st.peak, st.cap);
				st.dd = Math.max(st.dd, 1 - st.cap / st.peak);
				st.ruined = st.cap < START * 0.1;
				tween(capEl, from, st.cap, 700, money);
				ddEl.textContent = `${Math.round(st.dd * 100)}%`;
				paintHull();
				box.classList.add(win ? 'win' : 'loss');
				banner.hidden = false;
				banner.className = `rk-banner ${win ? 'win' : 'loss'}`;
				banner.append(
					mk('strong', '', win ? `Цель достигнута: +${money(risk * 2)}` : `Стоп сработал: −${money(risk)}`),
					btn('button', st.ruined ? 'Margin call →' : st.i + 1 >= SEQ.length ? 'К итогам →' : 'Следующая сделка →', () => {
						st.i++;
						if (st.ruined || st.i >= SEQ.length) finish(); else round();
					}),
				);
			};

			RISKS.forEach((r) => {
				const b = btn('rk-risk', '', () => {
					grid.querySelectorAll('button').forEach((x) => { x.disabled = true; });
					b.classList.add('picked');
					a.pts = makePath(win);
					const risk = (st.cap * r) / 100;
					const t0 = performance.now(), DUR = reduce ? 1 : 1900;
					const loop = (now) => {
						a.p = Math.min(1, (now - t0) / DUR);
						drawPath(cv, a);
						if (a.p < 1) raf = requestAnimationFrame(loop); else end(risk);
					};
					raf = requestAnimationFrame(loop);
				});
				b.append(mk('strong', '', `${r}%`), mk('small', '', `рискуешь ${money((st.cap * r) / 100)}`));
				grid.appendChild(b);
			});
		};

		const finish = () => {
			stop();
			const table = mk('div', 'gm-table');
			const row = (cls, a, b, c) => { const d = mk('div', cls); d.append(mk('span', '', a), mk('span', '', b), mk('span', '', c)); table.appendChild(d); };
			row('head', 'Стратегия', 'Итог', 'Просадка');
			row('you', 'Ты', money(st.cap), `−${Math.round(st.dd * 100)}%`);
			RISKS.forEach((r) => { const s = sim(r); row('', `${r}% на сделку`, s.ruined ? 'Margin call' : money(s.cap), `−${Math.round(s.dd * 100)}%`); });
			const s = st.ruined ? 0 : st.dd <= 0.12 ? 3 : st.dd <= 0.35 ? 2 : 1;
			result(root, 'risk', {
				kicker: 'Порт', title: 'Риск-капитан', text: 'Рейс завершён. Сравни свой результат с ровной стратегией на тех же сделках.',
				win: !st.ruined, stars: s,
				heading: st.ruined ? 'Margin call: корабль затонул' : s === 3 ? 'Капитан года' : s === 2 ? 'Дошёл до порта' : 'Еле выбрался из шторма',
				rows: [['Итоговый капитал', money(st.cap)], ['Максимальная просадка', `−${Math.round(st.dd * 100)}%`]],
				extra: table,
				tip: 'Чем глубже убыток, тем больше нужно, чтобы вернуться: после −50% требуется +100%. Серия из 4 убытков при риске 1% стоит около 4%, при 20% уже около 59%, при 50% почти 94% капитала. Поэтому профессионалы рискуют 1–2% на сделку.',
				again: open,
			});
		};

		const open = () => {
			stop();
			Object.assign(st, { cap: START, peak: START, dd: 0, i: 0, ruined: false });
			const stage = scene(root, 'Шторм волатильности', 'Риск-капитан', 'Ураган накрыл рынок. Тебя назначили капитаном фонда «Wind Capital» с капиталом $10 000. Перед каждой сделкой решай, какую долю капитала поставить под удар.');
			intro(stage, {
				ico: 'anchor', heading: 'Выведи корабль в порт',
				lines: ['10 сделок: убыток равен выбранному %, прибыль вдвое больше', 'Исход заранее неизвестен: серии убытков случаются', 'Упадёт капитал ниже $1 000 и будет margin call'],
				label: 'Выйти в море', onStart: round,
			});
		};
		open();
	};

	// =====================================================
	//  ИГРА 3. ОХОТА НА МОШЕННИКОВ
	// =====================================================
	const initScam = (root) => {
		const TIME = 14000;
		const MSGS = [
			{ from: 'Поддержка Wind', via: 'Telegram', ava: 'W', scam: true, text: 'Ваш аккаунт временно заблокирован. Чтобы вернуть доступ, отправьте в ответ seed-фразу от кошелька. Это займёт минуту.', marks: ['seed-фразу'], flags: ['Seed-фразу не просит никто и никогда: с ней забирают все средства', 'Выдуманная «блокировка» нужна, чтобы напугать'] },
			{ from: 'Wind Finance', via: 'SMS', ava: 'W', scam: false, text: 'Код подтверждения входа: 482913. Никому не сообщайте код. Если вы не входили в аккаунт, смените пароль в настройках.', why: 'Это обычный код после твоего входа: в нём нет просьб и ссылок, и он сам предупреждает не передавать код.' },
			{ from: 'Крипто-гуру', via: 'Чат', ava: 'К', scam: true, text: 'Гарантирую +300% за неделю! Переведи 0.1 BTC, через 7 дней верну 0.4 BTC. Осталось 2 места, только сегодня!', marks: ['Гарантирую +300% за неделю', 'только сегодня'], flags: ['Гарантированной доходности не бывает', 'Давление срочностью: «только сегодня», «осталось 2 места»', 'Просьба перевести деньги незнакомцу'] },
			{ from: 'Wind Finance', via: 'Уведомление', ava: 'W', scam: false, text: 'Платёж на 5 000 ₽ по карте успешно зачислен на баланс. Если это были не вы, смените пароль в настройках.', why: 'Сообщение сообщает о понятной операции и не просит ни переходить по ссылкам, ни вводить данные.' },
			{ from: 'Служба безопасности', via: 'Почта', ava: 'С', scam: true, text: 'Подозрительный вход! Подтвердите личность в течение 10 минут: wind-finance-secure-login.top/verify', marks: ['wind-finance-secure-login.top/verify', 'в течение 10 минут'], flags: ['Адрес сайта поддельный: официальный домен другой', 'Страх и спешка: «10 минут»', 'Ссылки из писем не открывают, а заходят через приложение или закладку'] },
			{ from: 'Конкурс Wind', via: 'SMS', ava: 'К', scam: true, text: 'Поздравляем! Вы выиграли iPhone. Оплатите доставку 990 ₽ по ссылке, и приз ваш.', marks: ['Оплатите доставку 990 ₽'], flags: ['Приз в конкурсе, в котором ты не участвовал', 'Просят заплатить вперёд: так воруют данные карты'] },
			{ from: 'Wind Finance', via: 'Уведомление', ava: 'W', scam: false, text: 'Ценовое уведомление сработало: BTC/USDT достиг 70 000 USDT. Посмотреть график можно в разделе «Крипто».', why: 'Это уведомление, которое ты настроил сам. Ссылок на сторонние сайты и просьб в нём нет.' },
			{ from: 'Помощник биржи', via: 'Telegram', ava: 'П', scam: true, text: 'Я из поддержки биржи. Чтобы вернуть ваши деньги, установите программу AnyDesk и сообщите мне код доступа.', marks: ['установите программу AnyDesk', 'сообщите мне код доступа'], flags: ['Удалённый доступ даёт полный контроль над твоими счетами', 'Настоящая поддержка не просит ставить программы и называть коды'] },
			{ from: 'Wind Finance', via: 'Уведомление', ava: 'W', scam: false, text: 'Вышло обновление приложения: новые уроки и улучшенный анализ рынка. Подробности в разделе «Настройки».', why: 'Обычная новость без ссылок на сторонние сайты и без просьб что-то отправить.' },
			{ from: 'Саша (друг)', via: 'Мессенджер', ava: 'С', scam: true, text: 'Привет, это Саша, мой аккаунт взломали, пишу с нового. Срочно займи 5 000 ₽ до завтра, переведи на карту 2200 0000 0000 0000.', marks: ['Срочно займи 5 000 ₽', 'пишу с нового'], flags: ['Просьба о деньгах от «друга» с нового аккаунта: сначала позвони ему', 'Срочность и просьба перевести на карту'] },
		];
		let timer = 0, typing = 0;
		const clear = () => { clearTimeout(timer); clearTimeout(typing); };
		const st = { order: [], i: 0, lives: 3, ok: 0, streak: 0, best: 0 };

		const fillText = (el, text, marks = []) => {
			el.textContent = '';
			const spots = marks.map((m) => [text.indexOf(m), m]).filter(([i]) => i >= 0).sort((a, b) => a[0] - b[0]);
			let pos = 0;
			spots.forEach(([i, m]) => {
				if (i < pos) return;
				el.appendChild(document.createTextNode(text.slice(pos, i)));
				el.appendChild(mk('mark', '', m));
				pos = i + m.length;
			});
			el.appendChild(document.createTextNode(text.slice(pos)));
		};
		const hearts = () => '♥'.repeat(Math.max(0, st.lives)) + '♡'.repeat(3 - Math.max(0, st.lives));

		const show = () => {
			clear();
			const m = st.order[st.i];
			const stage = scene(root, `Сообщение ${st.i + 1} из ${st.order.length}`, 'Центр безопасности', 'Реши до конца таймера: это мошенник или безопасное сообщение?');
			const livesEl = mk('strong', 'sc-lives', hearts());
			const streakEl = mk('strong', '', `×${st.streak}`);
			const okEl = mk('strong', '', String(st.ok));
			const stat = (label, node) => { const d = mk('div'); d.append(mk('span', '', label), node); return d; };
			const stats = mk('div', 'gm-stat-row');
			stats.append(stat('Репутация', livesEl), stat('Серия', streakEl), stat('Верно', okEl));
			const bar = mk('div', 'gm-progress');
			const barFill = mk('span');
			barFill.style.width = `${(st.i / st.order.length) * 100}%`;
			bar.appendChild(barFill);

			const phone = mk('div', 'sc-phone');
			const head = mk('div', 'sc-head');
			const who = mk('div');
			who.append(mk('strong', '', m.from), mk('small', '', m.via));
			head.append(mk('span', 'sc-ava', m.ava), who);
			const body = mk('div', 'sc-body');
			const bubble = mk('div', 'sc-bubble typing');
			bubble.append(mk('i'), mk('i'), mk('i'));
			body.appendChild(bubble);
			const track = mk('div', 'sc-timer');
			const tbar = mk('span');
			track.appendChild(tbar);
			phone.append(head, body, track);

			const actions = mk('div', 'sc-actions');
			const bScam = btn('sc-btn scam', 'Мошенник');
			const bSafe = btn('sc-btn safe', 'Безопасно');
			bScam.disabled = true; bSafe.disabled = true;
			actions.append(bScam, bSafe);
			const fb = mk('div', 'gm-feedback');
			fb.hidden = true;
			stage.append(stats, bar, phone, actions, fb);

			let done = false;
			const resolve = (said) => {
				if (done) return;
				done = true;
				clearTimeout(timer);
				const tw = track.getBoundingClientRect().width || 1;
				tbar.style.transition = 'none';
				tbar.style.width = `${(tbar.getBoundingClientRect().width / tw) * 100}%`;
				bScam.disabled = true; bSafe.disabled = true;
				const ok = said === m.scam;
				if (ok) { st.ok++; st.streak++; st.best = Math.max(st.best, st.streak); }
				else { st.lives--; st.streak = 0; livesEl.classList.add('hit'); }
				livesEl.textContent = hearts();
				streakEl.textContent = `×${st.streak}`;
				okEl.textContent = String(st.ok);

				fb.hidden = false;
				fb.className = `gm-feedback ${ok ? 'good' : 'bad'}`;
				fb.append(mk('strong', '', ok ? 'Верно!' : said === null ? 'Время вышло' : 'Ошибка'));
				if (m.scam) {
					fillText(bubble, m.text, m.marks);
					const ul = mk('ul', 'sc-flags');
					m.flags.forEach((f) => ul.appendChild(mk('li', '', f)));
					fb.append(mk('p', '', ok ? 'Это мошенничество. Признаки:' : 'Это было мошенничество, и клиент потерял деньги. Признаки:'), ul);
				} else {
					fb.append(mk('p', '', ok ? m.why : `Это было безопасное сообщение, и ты зря напугал клиента. ${m.why}`));
				}
				const last = st.i + 1 >= st.order.length;
				const dead = st.lives <= 0;
				fb.appendChild(btn('button', dead || last ? 'К итогам →' : 'Следующее сообщение →', () => {
					st.i++;
					if (dead || last) finish(dead); else show();
				}));
			};
			bScam.addEventListener('click', () => resolve(true));
			bSafe.addEventListener('click', () => resolve(false));

			typing = setTimeout(() => {
				bubble.classList.remove('typing');
				fillText(bubble, m.text);
				bScam.disabled = false; bSafe.disabled = false;
				tbar.style.transition = 'none';
				tbar.style.width = '100%';
				void tbar.offsetWidth;
				tbar.style.transition = `width ${TIME}ms linear`;
				tbar.style.width = '0%';
				timer = setTimeout(() => resolve(null), TIME);
			}, reduce ? 50 : 900);
		};

		const finish = (dead) => {
			clear();
			const n = st.order.length;
			const s = dead ? 0 : st.ok >= 9 ? 3 : st.ok >= 7 ? 2 : 1;
			result(root, 'scam', {
				kicker: 'Смена окончена', title: 'Охота на мошенников', text: 'Центр безопасности Wind Finance подводит итоги смены.',
				win: !dead, stars: s,
				heading: dead ? 'Репутация уничтожена' : s === 3 ? 'Непробиваемая защита' : s === 2 ? 'Надёжный страж' : 'Смена прошла, но есть над чем поработать',
				rows: [['Верных ответов', `${st.ok} из ${Math.min(st.i, n)}`], ['Лучшая серия', `×${st.best}`], ['Репутация', dead ? 'потеряна' : hearts()]],
				tip: 'Золотые правила: никому не сообщай seed-фразу, пароли и коды. Настоящая поддержка не просит удалённый доступ. «Гарантированная доходность» и «только сегодня» это признаки обмана. Всегда проверяй адрес сайта.',
				again: open,
			});
		};

		const open = () => {
			clear();
			Object.assign(st, { order: shuffle(MSGS), i: 0, lives: 3, ok: 0, streak: 0, best: 0 });
			const stage = scene(root, 'Ночная смена', 'Охота на мошенников', 'Ты дежурный в центре безопасности Wind Finance. Сообщения приходят одно за другим, и у тебя мало времени. Пропустишь мошенника или ошибочно заблокируешь клиента, потеряешь репутацию.');
			intro(stage, {
				ico: 'shield-alert', heading: 'Защити клиентов',
				lines: ['10 сообщений: часть от мошенников, часть настоящие', 'На каждое 14 секунд, ошибка стоит одно сердце репутации', 'После ответа покажем красные флаги прямо в тексте'],
				label: 'Начать смену', onStart: show,
			});
		};
		open();
	};

	// ---------- запуск и вкладки ----------
	initCandles(document.getElementById('gm-candles'));
	initRisk(document.getElementById('gm-risk'));
	initScam(document.getElementById('gm-scam'));
	paintStars();

	tabs.forEach((b) => b.addEventListener('click', () => {
		const id = b.dataset.gameTab;
		tabs.forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', String(x === b)); });
		document.querySelectorAll('[data-game-panel]').forEach((p) => { p.hidden = p.dataset.gamePanel !== id; });
	}));
})();




(() => {
	const $ = (id) => document.getElementById(id);
	const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
	const fmt2 = (v) => Number(v).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

	// ================= ЮРИДИЧЕСКИЕ ТЕКСТЫ (ЧЕРНОВИКИ) =================
	const LEGAL = {
		terms: {
			title: 'Пользовательское соглашение · черновик',
			paragraphs: [
				'ЧЕРНОВИК ДЛЯ ПРОСМОТРА. Документ не является опубликованной офертой. Перед приёмом реальных платежей владелец должен заполнить реквизиты, проверить текст у российского юриста и разместить актуальную версию.',
				'1. Исполнитель. Исполнитель: [ФИО / наименование], ИНН [заполнить], адрес для обращений [заполнить], email [заполнить]. Сервис Wind Finance предоставляет доступ к программному интерфейсу и образовательным материалам.',
				'2. Предмет. Пользователь получает неисключительное право пользоваться доступными функциями сервиса в течение оплаченного периода. Сервис не продаёт финансовые инструменты и не обещает доходность.',
				'3. Запрещённые услуги. Wind Finance не является банком, брокером, дилером, биржей, платёжной системой, инвестиционным советником, доверительным управляющим или криптообменником. Пользовательские средства не принимаются в управление, не хранятся и не инвестируются сервисом.',
				'4. Виртуальные функции. Демонстрационные балансы, активы, котировки, результаты игр и операции в симуляторе не являются деньгами или цифровой валютой, не имеют стоимости и не подлежат выводу.',
				'5. Криптораздел. Пользовательские криптовалютные сделки, обмен, хранение и вывод средств через сервис не предоставляются. Любые административные интеграции с внешними провайдерами не являются услугой для пользователя и не дают ему права требовать исполнения сделки.',
				'6. Информация и риски. Курсы, графики и аналитика имеют образовательный и справочный характер, могут содержать задержки и ошибки и не являются индивидуальной инвестиционной рекомендацией. Пользователь самостоятельно оценивает решения и риски.',
				'7. Wind Plus. Подписка предоставляет доступ к функциям интерфейса и материалам, перечисленным на странице тарифа. Цена, срок, момент активации, порядок отмены и возврата должны быть указаны до оплаты. Автоматическое продление не применяется, если прямо не указано иначе.',
				'8. Оплата и возвраты. Платёж обрабатывает подключённый платёжный провайдер. Условия возврата, реквизиты чека и порядок обращений должны быть опубликованы до запуска продаж и соответствовать применимому законодательству.',
				'9. Аккаунт и безопасность. Пользователь отвечает за сохранность данных входа. Запрещены взлом, обход ограничений, автоматизированная накрутка, мошенничество и использование сервиса для незаконных операций.',
				'10. Изменение и прекращение. Владелец может обновлять функции и временно ограничивать доступ при технических работах или нарушении условий. Существенные изменения условий публикуются до их применения.',
				'11. Реквизиты и версия. Дата редакции: [заполнить]. Контакт для обращений: [email]. Настоящий текст необходимо адаптировать под статус исполнителя и фактическую модель продаж.',
			],
		},
		privacy: {
			title: 'Политика конфиденциальности · черновик',
			paragraphs: [
				'ЧЕРНОВИК ДЛЯ ПРОСМОТРА. До публикации нужно заполнить реквизиты оператора, фактические сроки хранения, список подрядчиков и проверить документ по 152-ФЗ и другим применимым требованиям.',
				'1. Оператор. Оператор персональных данных: [ФИО / наименование], ИНН [заполнить], адрес [заполнить], email [заполнить].',
				'2. Данные. Сервис может обрабатывать email, имя пользователя, идентификатор аккаунта, хеш пароля, Telegram ID при соответствующем входе, сведения о подписке, технические данные запроса, сообщения поддержки и журналы виртуальных операций.',
				'3. Цели. Данные используются для регистрации и авторизации, работы функций, защиты аккаунтов, поддержки, обработки подписки, исполнения требований закона и предотвращения злоупотреблений.',
				'4. Правовые основания. Обработка производится для исполнения соглашения, с согласия пользователя в предусмотренных случаях и для выполнения обязанностей оператора. Согласие не должно подменять обязательные основания обработки.',
				'5. Платёжные данные. Данные банковской карты не вводятся и не хранятся в Wind Finance; их обрабатывает платёжный провайдер по своим документам.',
				'6. Подрядчики. Данные могут передаваться хостингу, базе данных, сервису авторизации, платёжному провайдеру и техническим подрядчикам только в объёме, необходимом для работы. Перечень подрядчиков: [заполнить].',
				'7. Хранение и защита. Сроки хранения, место размещения баз данных, резервное копирование и меры защиты: [заполнить фактическими сведениями]. Пароли хранятся только в виде криптографического хеша.',
				'8. Файлы браузера. В браузере могут сохраняться токен сессии, настройки интерфейса, прогресс обучения и демо-состояние. Пользователь может удалить их настройками браузера, но это может завершить сессию.',
				'9. Права пользователя. Пользователь может запросить сведения об обработке, исправление, блокирование или удаление данных в случаях, предусмотренных законом, направив обращение на [email].',
				'10. Изменения. Актуальная редакция публикуется в сервисе с указанием даты. При изменении целей или состава обработки может потребоваться новое согласие.',
				'11. Версия. Дата редакции: [заполнить]. Документ не заменяет уведомление оператора в Роскомнадзор и иные обязательные документы.',
			],
		},
	};
	const openLegal = (key) => {
		const doc = LEGAL[key];
		if (!doc) return;
		$('legal-title').textContent = doc.title;
		const body = $('legal-body');
		body.textContent = '';
		doc.paragraphs.forEach((t) => body.appendChild(mk('p', '', t)));
		$('legal-modal').hidden = false;
	};
	document.addEventListener('click', (e) => {
		const b = e.target.closest('[data-legal]');
		if (b) { e.preventDefault(); openLegal(b.dataset.legal); }
	});

	// ================= БАННЕР СИМУЛЯТОРА =================
	const banner = $('sim-banner');
	if (banner) {
		try { if (localStorage.getItem('wind_sim_ok')) banner.hidden = true; } catch (e) { /* хранилище недоступно */ }
		$('sim-ok')?.addEventListener('click', () => {
			banner.hidden = true;
			try { localStorage.setItem('wind_sim_ok', '1'); } catch (e) { /* хранилище недоступно */ }
		});
	}

	// ================= ОБРАТНАЯ СВЯЗЬ =================
	const fb = { modal: $('feedback-modal'), msg: $('fb-message'), contact: $('fb-contact'), status: $('fb-status'), send: $('fb-send') };
	$('open-feedback')?.addEventListener('click', () => { fb.status.textContent = ''; fb.modal.hidden = false; fb.msg.focus(); });
	fb.send?.addEventListener('click', async () => {
		const message = fb.msg.value.trim();
		if (message.length < 5) { fb.status.textContent = 'Опиши проблему хотя бы в нескольких словах'; return; }
		fb.send.disabled = true;
		try {
			await WindApi('/feedback', { method: 'POST', body: { message, contact: fb.contact.value.trim(), page: document.body.dataset.view || '' } });
			fb.msg.value = '';
			fb.modal.hidden = true;
			showSuccess('Спасибо! Сообщение отправлено');
		} catch (e) {
			fb.status.textContent = e.message;
		} finally {
			fb.send.disabled = false;
		}
	});

	// ================= СИМУЛЯТОР / РЕГИОН =================
	window.addEventListener('wind-auth', (e) => {
		if (e.detail && e.detail.simulator) {
			const c = document.querySelector('#topup-modal .modal-copy');
			if (c) c.textContent = 'Демо-пополнение виртуального баланса. Реальные деньги не списываются, платёжные данные вводить не нужно.';
		}
		if (window.WIND_REGION === 'RU') {
			document.querySelector('#topup-modal .payment-option[data-payment="crypto"]')?.setAttribute('hidden', '');
			document.querySelector('#pay-topup-modal [data-pay-tab="crypto"]')?.setAttribute('hidden', '');
		}
	});

	// ================= 2FA (TOTP) =================
	const tf = { btn: $('twofa-btn'), modal: $('twofa-modal'), intro: $('twofa-intro'), setup: $('twofa-setup'), qr: $('twofa-qr'), secret: $('twofa-secret'), code: $('twofa-code'), status: $('twofa-status'), ok: $('twofa-confirm') };
	if (tf.btn && tf.modal) {
		let enabled = false, mode = 'enable', qr = null;
		const paint = () => { tf.btn.textContent = enabled ? 'Включена ✓' : 'Настроить'; tf.btn.classList.toggle('on', enabled); };
		window.addEventListener('wind-auth', (e) => { enabled = !!(e.detail && e.detail.totp_enabled); paint(); });
		tf.btn.addEventListener('click', async () => {
			tf.status.textContent = '';
			tf.code.value = '';
			tf.modal.hidden = false;
			if (enabled) {
				mode = 'disable';
				tf.setup.hidden = true;
				tf.intro.textContent = 'Чтобы отключить защиту, введи текущий код из приложения-аутентификатора.';
				tf.ok.textContent = 'Отключить';
				return;
			}
			mode = 'enable';
			tf.setup.hidden = true;
			tf.intro.textContent = 'Отсканируй QR-код в приложении-аутентификаторе (Google Authenticator, 2FA, Aegis), затем введи 6-значный код.';
			tf.ok.textContent = 'Включить';
			tf.status.textContent = 'Готовим ключ…';
			try {
				const d = await WindApi('/auth/2fa/setup', { method: 'POST' });
				tf.status.textContent = '';
				tf.secret.textContent = d.secret;
				tf.setup.hidden = false;
				if (window.QRCode) {
					if (!qr) { tf.qr.textContent = ''; qr = new QRCode(tf.qr, { text: d.uri, width: 180, height: 180, colorDark: '#17201d', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M }); }
					else { qr.clear(); qr.makeCode(d.uri); }
				}
			} catch (e) { tf.status.textContent = e.message; }
		});
		tf.ok.addEventListener('click', async () => {
			const code = tf.code.value.trim();
			if (code.length < 6) { tf.status.textContent = 'Введи 6 цифр из приложения'; return; }
			tf.ok.disabled = true;
			try {
				await WindApi(`/auth/2fa/${mode}`, { method: 'POST', body: { code } });
				enabled = mode === 'enable';
				paint();
				tf.modal.hidden = true;
				showSuccess(enabled ? 'Двухфакторная защита включена' : 'Двухфакторная защита отключена');
			} catch (e) { tf.status.textContent = e.message; }
			finally { tf.ok.disabled = false; }
		});
	}

	// ================= ЛИДЕРБОРД CRYPTO DROP =================
	const lbList = $('lb-list');
	if (lbList) {
		const claim = $('lb-claim');
		const render = (d) => {
			$('lb-week').textContent = d.week;
			lbList.textContent = '';
			if (!d.top.length) lbList.appendChild(mk('li', 'lb-empty', 'Пока никого. Сыграй и стань первым!'));
			d.top.forEach((r) => {
				const li = mk('li', r.me ? 'me' : '');
				li.append(mk('span', 'lb-rank', String(r.rank)), mk('span', '', r.username + (r.me ? ' (ты)' : '')), mk('span', 'lb-score', `$${r.score.toLocaleString('ru-RU')}`));
				lbList.appendChild(li);
			});
			claim.hidden = !d.bonus;
			if (d.bonus) claim.textContent = `Забрать бонус: ${d.bonus.amount.toLocaleString('ru-RU')} ₽ за ${d.bonus.rank}-е место (неделя ${d.bonus.week})`;
		};
		const refresh = async () => { try { render(await WindApi('/game/leaderboard?game=drop')); } catch (e) { /* нет сети или не вошли */ } };
		window.WindLB = {
			refresh,
			submit: async (score) => {
				if (!(score > 0)) return;
				try { render(await WindApi('/game/score', { method: 'POST', body: { game: 'drop', score: Math.round(score) } })); } catch (e) { /* пропускаем */ }
			},
		};
		claim.addEventListener('click', async () => {
			claim.disabled = true;
			try {
				const d = await WindApi('/game/claim-bonus', { method: 'POST' });
				await Wallet.load();
				showSuccess(`Бонус ${d.claimed.toLocaleString('ru-RU')} ₽ зачислен`);
				refresh();
			} catch (e) { showSuccess(e.message, 'error'); }
			finally { claim.disabled = false; }
		});
		window.addEventListener('wind-auth', refresh);
		document.querySelector('[data-game-tab="drop"]')?.addEventListener('click', refresh);
	}

	// ================= КОМИССИЯ ОБМЕНА И СКИДКИ =================
	(() => {
		// Комиссию начисляет сервер (1%, с Plus — 0,6%). Здесь только показываем её.
		// Скидку за игровые звёзды убрали: звёзды хранятся в браузере, сервер не может их проверить.
		const BASE = 1.0, PLUS_FEE = 0.6;
		let serverFee = null;
		const loadQuote = async () => {
			try { serverFee = Number((await WindApi('/wallet/exchange/quote')).fee_pct); } catch (e) { serverFee = null; }
			if (typeof updateConverter === 'function') updateConverter();
		};
		window.addEventListener('wind-auth', loadQuote);
		document.addEventListener('wind-plus-change', loadQuote);
		const parts = () => {
			const plusOn = document.body.classList.contains('plus-active');
			const fee = Number.isFinite(serverFee) && serverFee > 0 ? serverFee : (plusOn ? PLUS_FEE : BASE);
			return { fee, plus: plusOn ? BASE - fee : 0, game: 0 };
		};
		window.WindFee = { rate: () => parts().fee, parts };
		const refresh = () => { if (typeof updateConverter === 'function') updateConverter(); };
		document.addEventListener('wind-plus-change', refresh);
		new MutationObserver(refresh).observe(document.body, { attributes: true, attributeFilter: ['data-view'] });
		refresh();
	})();

	// ================= РЕАЛЬНЫЕ КУРСЫ (ЦБ РФ) И АКЦИИ (МОСБИРЖА) =================
	const setNum = (node, text) => {
		if (!node) return;
		node.textContent = text;
		if (node.dataset.fxFinal !== undefined) { node.dataset.fxFinal = text; node._fx = null; }
	};
	const loadRates = async () => {
		try {
			const r = (await WindApi('/market/rates')).rates;
			['USD', 'EUR', 'CNY', 'GBP', 'AED'].forEach((c) => { if (r[c]) CURRENCY_RATES[c] = r[c].value; });
			const sign = (v) => (v >= 0 ? '+' : '−');
			document.querySelectorAll('.favorite-currency-card').forEach((card) => {
				const c = card.dataset.favoriteCurrency, x = r[c];
				if (!x) return;
				const diff = x.value - x.prev, pct = (diff / x.prev) * 100;
				card.querySelector('p').textContent = `1 ${c} = ${fmt2(x.value)} RUB`;
				const ch = card.querySelector('.rate-change');
				setNum(ch, `${sign(pct)}${fmt2(Math.abs(pct))}%`);
				ch.classList.toggle('positive', pct >= 0);
				ch.classList.toggle('negative', pct < 0);
				if (pairSceneConfig[c]) Object.assign(pairSceneConfig[c], {
					heading: `${fmt2(x.value)} ₽`,
					changeText: `${diff >= 0 ? '▲' : '▼'} ${fmt2(Math.abs(diff))} ₽ · ${sign(pct)}${fmt2(Math.abs(pct))}% за сегодня`,
					trend: diff >= 0 ? 'positive' : 'negative',
				});
			});
			const rows = document.querySelectorAll('.stats-card .stat-value');
			['USD', 'EUR', 'CNY'].forEach((c, i) => {
				const x = r[c];
				if (!x || !rows[i]) return;
				const pct = ((x.value - x.prev) / x.prev) * 100;
				setNum(rows[i], `${sign(pct)}${fmt2(Math.abs(pct))}%`);
				rows[i].classList.toggle('positive', pct >= 0);
				rows[i].classList.toggle('negative', pct < 0);
			});
			syncCurrencyButtons();
			updateConverter();
		} catch (e) { /* остаются прежние курсы */ }
	};

	const loadStocks = async () => {
		try {
			const d = await WindApi('/market/stocks');
			const map = { IMOEX: d.IMOEX, SBER: d.SBER, ETFRU: d.TMOS, BONDS: d.SBGB };
			const volumes = Object.values(map).map((x) => Number(x && x.volume) || 0);
			const maxVolume = Math.max(...volumes, 1);
			const money = (v) => (v >= 1e9 ? `${fmt2(v / 1e9)} млрд ₽` : v >= 1e6 ? `${Math.round(v / 1e6).toLocaleString('ru-RU')} млн ₽` : `${Math.round(v).toLocaleString('ru-RU')} ₽`);
			document.querySelectorAll('.invest-card').forEach((card) => {
				const x = map[card.dataset.assetCode];
				if (!x || x.price == null) return; // вне торгов биржа может не отдавать значения
				card.dataset.price = String(x.price);
				const value = card.querySelector('.asset-value');
				if (value) value.textContent = card.dataset.assetCode === 'IMOEX' ? `${fmt2(x.price)} пт.` : `${Number(x.price).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} ₽`;
				const vol = Number(x.volume) || 0;
				const volText = card.querySelector('.inv-vol-value');
				if (volText) volText.textContent = vol ? money(vol) : '—';
				const bar = card.querySelector('.inv-volbar span');
				// шкала логарифмическая: обороты фондов и Сбера отличаются в сотни раз
				if (bar) bar.style.setProperty('--lvl', vol ? `${Math.max(6, Math.round(Math.log10(vol) / Math.log10(maxVolume) * 100))}%` : '0%');
				if (x.pct == null) return;
				const up = x.pct >= 0;
				const pill = card.querySelector('.change-pill');
				const b = pill && pill.querySelector('b');
				if (b) {
					const text = `${up ? '+' : '−'}${fmt2(Math.abs(x.pct))}%`;
					b.textContent = text; b.dataset.final = text; b.dataset.count = String(Math.abs(x.pct)); b.dataset.decimals = '2'; b.dataset.prefix = up ? '+' : '−';
					pill.classList.toggle('up', up);
					pill.classList.toggle('down', !up);
					pill.querySelector('i, svg')?.setAttribute('data-lucide', up ? 'arrow-up-right' : 'arrow-down-right');
				}
			});
			if (window.lucide) window.lucide.createIcons();
		} catch (e) { /* остаются прежние значения */ }
	};

	loadStocks();
	window.addEventListener('wind-auth', () => { loadRates(); loadStocks(); });
	setInterval(loadRates, 5 * 60 * 1000);
	setInterval(loadStocks, 60 * 1000);
})();

if (window.lucide) {
	lucide.createIcons();
}

// ================= КОПИЛКИ =================
(() => {
	const grid = document.getElementById('goals-grid');
	const form = document.getElementById('goal-form');
	if (!grid || !form) return;
	const toggle = document.getElementById('goal-new-toggle');
	const fmt = (n) => Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
	const mk = (tag, cls, text) => {
		const el = document.createElement(tag);
		if (cls) el.className = cls;
		if (text != null) el.textContent = text;
		return el;
	};
	const authed = () => Boolean(localStorage.getItem('wind_access_token'));
	const empty = (text) => grid.replaceChildren(mk('div', 'goals-empty', text));

	const afterMoney = (data) => {
		window.Wallet?.load().catch(() => {});
		render(data);
	};

	const moneyRow = (goal) => {
		const row = mk('form', 'goal-move');
		row.hidden = true;
		const input = mk('input');
		input.type = 'number'; input.min = '1'; input.step = '1'; input.inputMode = 'numeric'; input.placeholder = 'Сумма, ₽'; input.required = true;
		const ok = mk('button', 'button', 'OK');
		ok.type = 'submit';
		row.append(input, ok);
		row.addEventListener('submit', async (event) => {
			event.preventDefault();
			ok.disabled = true;
			try {
				const data = await WindApi(`/goals/${goal.id}/${row.dataset.action}`, { method: 'POST', body: { amount: Number(input.value) } });
				afterMoney(data);
				showSuccess(row.dataset.action === 'deposit' ? `В копилку «${goal.title}» отложено ${fmt(input.value)} ₽` : `Из копилки снято ${fmt(input.value)} ₽`);
			} catch (e) {
				showSuccess(e.message, 'error');
				ok.disabled = false;
			}
		});
		return row;
	};

	const card = (goal) => {
		const el = mk('article', `card goal-card${goal.done ? ' done' : ''}`);
		const head = mk('div', 'goal-head');
		const icon = mk('span', 'asset-icon teal');
		icon.innerHTML = `<i data-lucide="${goal.done ? 'party-popper' : 'piggy-bank'}"></i>`;
		const title = mk('div', 'goal-title');
		title.append(mk('strong', '', goal.title), mk('small', '', goal.deadline ? `до ${new Date(goal.deadline).toLocaleDateString('ru-RU')}` : 'без срока'));
		const close = mk('button', 'goal-close', '×');
		close.type = 'button';
		close.setAttribute('aria-label', 'Закрыть копилку и вернуть деньги на баланс');
		close.addEventListener('click', async () => {
			if (close.dataset.armed !== '1') {
				close.dataset.armed = '1';
				close.textContent = 'Закрыть?';
				window.setTimeout(() => { close.dataset.armed = ''; close.textContent = '×'; }, 3000);
				return;
			}
			try { afterMoney(await WindApi(`/goals/${goal.id}`, { method: 'DELETE' })); showSuccess('Копилка закрыта, деньги вернулись на баланс'); }
			catch (e) { showSuccess(e.message, 'error'); }
		});
		head.append(icon, title, close);

		const sums = mk('div', 'goal-sums');
		sums.append(mk('strong', '', `${fmt(goal.saved)} ₽`), mk('span', '', `из ${fmt(goal.target)} ₽`));
		const bar = mk('div', 'goal-bar');
		const fill = mk('span');
		fill.style.width = `${goal.progress}%`;
		bar.append(fill);
		const plan = mk('p', 'goal-plan', goal.done ? 'Цель достигнута! 🎉'
			: goal.monthly_needed ? `Откладывай ${fmt(goal.monthly_needed)} ₽ в месяц, чтобы успеть` : `Осталось ${fmt(goal.target - goal.saved)} ₽`);

		const actions = mk('div', 'goal-actions');
		const move = moneyRow(goal);
		const add = mk('button', 'goal-btn primary', '+ Отложить');
		const take = mk('button', 'goal-btn', 'Снять');
		[add, take].forEach((b) => { b.type = 'button'; });
		add.addEventListener('click', () => { move.dataset.action = 'deposit'; move.hidden = false; move.querySelector('input').focus(); });
		take.addEventListener('click', () => { move.dataset.action = 'withdraw'; move.hidden = false; move.querySelector('input').focus(); });
		if (!goal.saved) take.disabled = true;
		actions.append(add, take);
		el.append(head, sums, bar, plan, actions, move);
		return el;
	};

	const render = (data) => {
		if (!data || !Array.isArray(data.goals)) return;
		if (!data.goals.length) {
			empty('Заведи первую копилку: укажи цель и срок — посчитаем, сколько откладывать в месяц.');
		} else {
			grid.replaceChildren(...data.goals.map(card));
		}
		if (window.lucide) window.lucide.createIcons();
	};

	const load = async () => {
		if (!authed()) { empty('Копилки доступны после входа в аккаунт.'); return; }
		try { render(await WindApi('/goals')); } catch (e) { empty('Не удалось загрузить копилки.'); }
	};

	toggle?.addEventListener('click', () => {
		if (!authed()) { showSuccess('Войди в аккаунт, чтобы создать копилку', 'error'); return; }
		form.hidden = !form.hidden;
		if (!form.hidden) form.querySelector('#goal-title').focus();
	});
	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		const deadline = form.querySelector('#goal-deadline').value;
		try {
			const data = await WindApi('/goals', { method: 'POST', body: {
				title: form.querySelector('#goal-title').value,
				target: Number(form.querySelector('#goal-target').value),
				deadline: deadline ? `${deadline}T23:59:00` : null,
			} });
			form.reset();
			form.hidden = true;
			render(data);
			showSuccess('Копилка создана');
		} catch (e) {
			showSuccess(e.message, 'error');
		}
	});
	window.addEventListener('wind-auth', load);
	window.addEventListener('wind-logout', load);
	load();
})();

// ================= СОРЕВНОВАНИЕ НЕДЕЛИ И ГРАФИК ПОРТФЕЛЯ =================
(() => {
	const list = document.getElementById('invest-board-list');
	const chart = document.getElementById('portfolio-chart');
	const authed = () => Boolean(localStorage.getItem('wind_access_token'));
	const mk = (tag, cls, text) => {
		const el = document.createElement(tag);
		if (cls) el.className = cls;
		if (text != null) el.textContent = text;
		return el;
	};
	const pct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}%`;

	const loadBoard = async () => {
		if (!list) return;
		const me = document.getElementById('invest-board-me');
		if (!authed()) { list.replaceChildren(mk('li', 'invest-board-empty', 'Войди в аккаунт, чтобы участвовать.')); me.textContent = ''; return; }
		try {
			const d = await WindApi('/invest/leaderboard');
			document.getElementById('invest-board-week').textContent = `${d.participants} участн.`;
			if (!d.top.length) {
				list.replaceChildren(mk('li', 'invest-board-empty', 'Пока никого: купи активы на 1 000 ₽ и больше — и попадёшь в рейтинг.'));
			} else {
				list.replaceChildren(...d.top.map((r) => {
					const li = mk('li', r.me ? 'me' : '');
					li.append(mk('span', 'lb-rank', String(r.rank)), mk('span', '', r.username + (r.me ? ' (ты)' : '')),
						mk('span', `lb-score ${r.return_pct >= 0 ? 'positive' : 'negative'}`, pct(r.return_pct)));
					return li;
				}));
			}
			me.textContent = d.me ? (d.me.rank > 10 ? `Твоё место: ${d.me.rank} · ${pct(d.me.return_pct)}` : '')
				: `Чтобы участвовать, вложи от ${Number(d.min_base).toLocaleString('ru-RU')} ₽. Рейтинг обнуляется в понедельник.`;
		} catch (e) {
			list.replaceChildren(mk('li', 'invest-board-empty', 'Рейтинг временно недоступен.'));
		}
	};

	let days = 90;
	const drawChart = (points) => {
		if (!chart) return;
		if (points.length < 2) {
			chart.replaceChildren(mk('p', 'portfolio-chart-empty', 'График появится со второго дня: стоимость портфеля сохраняется раз в день, когда ты заходишь или совершаешь сделку.'));
			return;
		}
		const W = 640, H = 180, P = 8;
		const values = points.flatMap((p) => [p.invested, p.cost]);
		const min = Math.min(...values), max = Math.max(...values);
		const span = max - min || 1;
		const x = (i) => P + (i / (points.length - 1)) * (W - P * 2);
		const y = (v) => H - P - ((v - min) / span) * (H - P * 2);
		const line = (key) => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(' ');
		const last = points[points.length - 1];
		const up = last.invested >= last.cost;
		const area = `${line('invested')} L${x(points.length - 1).toFixed(1)} ${H - P} L${x(0).toFixed(1)} ${H - P} Z`;
		chart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Стоимость портфеля по дням">
			<defs><linearGradient id="pf-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".22"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
			<path d="${area}" fill="url(#pf-fill)" stroke="none"/>
			<path d="${line('cost')}" class="pf-cost" fill="none"/>
			<path d="${line('invested')}" class="pf-value" fill="none"/>
		</svg>`;
		chart.classList.toggle('down', !up);
		const fmt = (v) => `${Number(v).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`;
		const first = new Date(points[0].day).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
		const legend = mk('div', 'portfolio-chart-legend');
		legend.append(mk('span', 'pf-legend-value', `Стоимость: ${fmt(last.invested)}`), mk('span', 'pf-legend-cost', `Вложено: ${fmt(last.cost)}`), mk('span', '', `с ${first}`));
		chart.append(legend);
	};

	const loadHistory = async () => {
		if (!chart || !authed()) return;
		try { drawChart((await WindApi(`/invest/history?days=${days}`)).points); }
		catch (e) { chart.replaceChildren(mk('p', 'portfolio-chart-empty', 'Не удалось загрузить историю.')); }
	};
	document.querySelectorAll('#portfolio-chart-range [data-days]').forEach((b) => b.addEventListener('click', () => {
		days = Number(b.dataset.days);
		document.querySelectorAll('#portfolio-chart-range [data-days]').forEach((x) => x.classList.toggle('active', x === b));
		loadHistory();
	}));

	window.addEventListener('wind-auth', () => { loadBoard(); loadHistory(); });
	window.addEventListener('wind-portfolio', () => { loadBoard(); loadHistory(); });
	document.querySelector('.nav a[href="#investments"]')?.addEventListener('click', loadBoard);
	setInterval(() => { if (document.body.dataset.view === 'investments') loadBoard(); }, 120000);
	loadBoard();
})();

// ================= АДМИНКА =================
(() => {
	const cardEl = document.getElementById('admin-card');
	if (!cardEl) return;
	const stats = document.getElementById('admin-stats');
	const feedback = document.getElementById('admin-feedback');
	const mk = (tag, cls, text) => {
		const el = document.createElement(tag);
		if (cls) el.className = cls;
		if (text != null) el.textContent = text;
		return el;
	};
	const num = (v) => Number(v || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 });
	const tile = (label, value, hint) => {
		const t = mk('div', 'admin-tile');
		t.append(mk('span', '', label), mk('strong', '', value));
		if (hint) t.append(mk('small', '', hint));
		return t;
	};
	const load = async () => {
		try {
			const d = await WindApi('/admin/stats');
			stats.replaceChildren(
				tile('Пользователи', num(d.users.total), `+${num(d.users.new_7d)} за 7 дней · +${num(d.users.new_30d)} за 30`),
				tile('Платный Plus', num(d.plus.active_paid), `конверсия ${num(d.plus.conversion_pct)}%`),
				tile('Пробный Plus', num(d.plus.trial_active), `стартов ${num(d.plus.trials_started)} · купили ${num(d.plus.trial_to_paid)}`),
				tile('Выручка за 30 дней', `${num(d.revenue.subscriptions_30d)} ₽`, `пополнения ${num(d.revenue.topups_30d)} ₽`),
				tile('Инвесторы', num(d.activity.investors), `сделок за неделю: ${num(d.activity.trades_7d)}`),
				tile('Копилки и уведомления', `${num(d.activity.goals_active)} / ${num(d.activity.alerts_active)}`, 'активные'),
			);
			feedback.replaceChildren(...(d.feedback.length ? d.feedback.map((f) => {
				const row = mk('div', 'admin-fb');
				row.append(mk('p', '', f.message), mk('small', '', `${new Date(f.at).toLocaleString('ru-RU')}${f.page ? ' · ' + f.page : ''}${f.contact ? ' · ' + f.contact : ''}`));
				return row;
			}) : [mk('p', 'admin-empty', 'Сообщений пока нет.')]));
		} catch (e) {
			stats.replaceChildren(mk('p', 'admin-empty', e.message));
		}
	};
	window.addEventListener('wind-auth', (e) => {
		const isAdmin = Boolean(e.detail && e.detail.is_admin);
		cardEl.hidden = !isAdmin;
		if (isAdmin) load();
	});
	window.addEventListener('wind-logout', () => { cardEl.hidden = true; });
	document.getElementById('admin-refresh')?.addEventListener('click', load);
})();
