const tg = window.Telegram?.WebApp;
const inTelegram = Boolean(tg?.initData);
document.documentElement.classList.toggle('telegram-app', inTelegram);
if (inTelegram) {
	document.querySelector('.topbar-actions').prepend(document.querySelector('.agent-pet'));
}

const onAppView = (views, change) => {
	const gate = document.getElementById('auth-gate');
	let isActive;
	const sync = () => {
		const active = gate.hidden && views.includes(document.body.dataset.view);
		if (active === isActive) return;
		isActive = active;
		change(active);
	};
	const observer = new MutationObserver(sync);
	observer.observe(document.body, { attributes: true, attributeFilter: ['data-view'] });
	observer.observe(gate, { attributes: true, attributeFilter: ['hidden'] });
	sync();
};

const vendorSources = {
	lucide: 'https://unpkg.com/lucide@1.57.0/dist/umd/lucide.min.js',
	LightweightCharts: 'https://unpkg.com/lightweight-charts@5.2.1/dist/lightweight-charts.standalone.production.js',
	QRCode: 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
};
const vendorLoads = new Map();
const loadVendor = (name) => {
	if (window[name]) return Promise.resolve(window[name]);
	if (vendorLoads.has(name)) return vendorLoads.get(name);
	const script = document.createElement('script');
	script.src = vendorSources[name];
	const request = new Promise((resolve, reject) => {
		const fail = () => {
			vendorLoads.delete(name);
			script.remove();
			reject(new Error('Не удалось загрузить компонент'));
		};
		script.onload = () => window[name] ? resolve(window[name]) : fail();
		script.onerror = fail;
	});
	vendorLoads.set(name, request);
	document.head.append(script);
	return request;
};

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

const labField = id => document.getElementById('lab-' + id);
const labResult = document.querySelector('.lab-result');
const labPresets = document.querySelectorAll('[data-lab-change]');
const labMoney = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 });
const labValue = id => {
	const field = labField(id);
	return field.validity.valid && field.value !== '' ? field.valueAsNumber : NaN;
};
const updateScenario = () => {
	const capital = labValue('capital');
	const change = labValue('change');
	const profit = capital * change / 100;
	labResult.dataset.change = profit < 0 ? 'down' : profit > 0 ? 'up' : 'flat';
	labPresets.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.labChange) === change)));
	labField('percent').textContent = (change > 0 ? '+' : '') + change + '%';
	labField('profit').textContent = Number.isFinite(profit) ? labMoney.format(profit) : 'Проверь сумму';
	labField('total').textContent = Number.isFinite(profit) ? 'Стоимость позиции ' + labMoney.format(capital + profit) : '';
	const size = labValue('budget') / (labValue('stop') / 100);
	labField('size').textContent = Number.isFinite(size) ? 'Размер позиции ' + labMoney.format(size) : 'Проверь допустимый убыток и процент снижения.';
};
document.querySelector('.plus-lab').addEventListener('input', event => {
	updateScenario();
	if (event.target.id !== 'lab-change') return;
	playWindEffect(labField('profit'), [{ opacity: .55, translate: '0 3px' }, { opacity: 1, translate: '0 0' }], 240);
});
labPresets.forEach(button => button.addEventListener('click', () => {
	const slider = labField('change');
	slider.value = button.dataset.labChange;
	slider.dispatchEvent(new Event('input', { bubbles: true }));
}));
updateScenario();
labField('alert').addEventListener('click', () => {
	const fired = labField('alert').dataset.fired !== 'yes';
	labField('alert').dataset.fired = fired ? 'yes' : '';
	labField('alert').textContent = fired ? 'Сбросить пример' : 'Повысить цену до 70 100 USDT';
	labField('alert-state').textContent = fired ? 'Сигнал сработал · BTC пересёк 70 000 USDT' : 'Цена 69 900 USDT · ожидаем сигнал';
});

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

const openTriggeredModal = (trigger) => {
	const id = trigger.dataset.modal;
	const demo = isDemoPreview();
	if (id === 'topup-modal' && demo) return;
	if (id === 'subscription-modal') document.getElementById('plus-preview').hidden = !demo;
	if (inTelegram && !demo && (id === 'topup-modal' || id === 'subscription-modal')) loadStarsCatalog();
	const modal = document.getElementById(id);
	if (modal) {
		modal.hidden = false;
		if (id === 'subscription-modal') modal.querySelector('.plus-modal').scrollTop = 0;
	}
};
modalTriggers.forEach((trigger) => trigger.addEventListener('click', () => openTriggeredModal(trigger)));
// кнопки, которые появляются позже (например, в пустом портфеле)
document.addEventListener('click', (event) => {
	const trigger = event.target.closest('[data-modal]');
	if (!trigger || [...modalTriggers].includes(trigger)) return;
	openTriggeredModal(trigger);
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



// ================= ПАРТНЁРКА BYBIT =================
// Переменная репозитория BYBIT_REF_CODE (попадает в config.js): реферальный код
// или целая партнёрская ссылка из кабинета Bybit Affiliates (начинается с https://).
const BYBIT_REF_RAW = String(window.WIND_BYBIT_REF || '393YMZP').trim();
const BYBIT_REF_IS_URL = /^https:\/\/[^\s"'<>]+$/i.test(BYBIT_REF_RAW);
const BYBIT_REF_CODE = BYBIT_REF_IS_URL ? '' : BYBIT_REF_RAW;
const BYBIT_REFERRAL_URL = BYBIT_REF_IS_URL ? BYBIT_REF_RAW : `https://www.bybit.com/invite?ref=${encodeURIComponent(BYBIT_REF_CODE)}`;
if (BYBIT_REF_IS_URL) document.getElementById('bybit-ref-copy')?.setAttribute('hidden', '');
const bybitTradeUrl = (symbol) => {
	const m = /^([A-Z0-9]+?)(USDT|USDC|BTC|ETH)$/.exec(symbol || '');
	return m ? `https://www.bybit.com/trade/spot/${m[1]}/${m[2]}` : 'https://www.bybit.com/trade/spot/BTC/USDT';
};
const trackPartnerClick = (kind, placement, symbol = '') => {
	if (!window.WIND_API_URL && location.hostname.endsWith('.github.io')) return;
	if (typeof window.WindApi !== 'function') return;
	window.WindApi('/partner/click', { method: 'POST', body: { kind, placement, symbol }, timeoutMs: 5000 }).catch(() => {});
};
document.querySelectorAll('[data-bybit-signup]').forEach((link) => {
	link.href = BYBIT_REFERRAL_URL;
	link.addEventListener('click', () => {
		trackPartnerClick('signup', link.dataset.bybitSignup, link.dataset.symbol || '');
	});
});
const refCodeEl = document.getElementById('bybit-ref-code');
if (refCodeEl) refCodeEl.textContent = BYBIT_REF_CODE;
document.getElementById('bybit-ref-copy')?.addEventListener('click', async () => {
	try {
		await navigator.clipboard.writeText(BYBIT_REF_CODE);
		showSuccess('Реферальный код скопирован');
	} catch (e) {
		showSuccess(`Код: ${BYBIT_REF_CODE}`);
	}
});

const bybitTradeModal = document.getElementById('bybit-trade-modal');
const bybitOptTrade = document.getElementById('bybit-opt-trade');
const bybitOptSignup = document.getElementById('bybit-opt-signup');
document.querySelectorAll('[data-trade]').forEach((button) => {
	button.addEventListener('click', () => {
		const symbol = selectedCryptoPair();
		if (button.dataset.trade === 'buy') {
			window.dispatchEvent(new CustomEvent('wind-spot-buy', { detail: symbol }));
			return;
		}
		const base = symbol.replace(/(USDT|USDC)$/, '');
		if (!bybitTradeModal) {
			trackPartnerClick('signup', 'trade-sell', symbol);
			window.open(BYBIT_REFERRAL_URL, '_blank', 'noopener,noreferrer');
			return;
		}
		document.getElementById('bybit-trade-title').textContent = `Продать ${base} на Bybit`;
		document.getElementById('bybit-opt-pair').textContent = `Откроем пару ${base}/USDT`;
		bybitOptTrade.href = bybitTradeUrl(symbol);
		bybitOptTrade.dataset.symbol = symbol;
		bybitOptTrade.dataset.side = 'sell';
		bybitOptSignup.dataset.symbol = symbol;
		bybitTradeModal.hidden = false;
	});
});
bybitOptTrade?.addEventListener('click', () => {
	trackPartnerClick('trade', `trade-${bybitOptTrade.dataset.side || 'buy'}`, bybitOptTrade.dataset.symbol || '');
	window.setTimeout(() => closeModal(bybitTradeModal), 150);
});
bybitOptSignup?.addEventListener('click', () => window.setTimeout(() => closeModal(bybitTradeModal), 150));

document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') {
		modals.forEach(closeModal);
	}
});

const cryptoChartElement = document.querySelector('#crypto-chart');
const cryptoPair = document.querySelector('#crypto-pair');
const selectedCryptoPair = () => cryptoPair.querySelector('input:checked').value;
const cryptoRetry = document.getElementById('crypto-retry');
const cryptoPriceLabel = document.querySelector('#crypto-price-label');
const cryptoSymbolLabel = document.querySelector('#crypto-symbol-label');
const cryptoUpdated = document.querySelector('#crypto-updated');
const timeframeButtons = document.querySelectorAll('[data-interval]');
let activeInterval = '60';
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
		USER_WALLETS = ownerId && ownerId !== '0'
			? readWallets(ownerId, user.balance)
			: { ...DEFAULT_WALLETS, RUB: user?.balance ?? 0 };
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
		const caption = activeWalletOwner === '0' ? 'Учебные средства для пробной копилки'
			: inTelegram ? 'Средства инвестиционного симулятора' : 'Пополнения зачисляются после подтверждения платежа';
		balancesHtml += chips.length > 1
			? `<div class="balances-grid">${chips.join('')}</div>`
			: `<span class="wallet-caption">${caption}</span>`;
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
		const rate = getConverterRate(from, to);
		const rateText = rate < 1 ? rate.toLocaleString('ru-RU', { maximumFractionDigits: 4 }) : formatMoney(rate);
		const isExample = [from, to].some((code) => code !== 'RUB' && !publishedCurrencies.has(code));
		note.textContent = `${isExample ? 'Пример курса:' : 'По курсу'} ${rateText} ${CURRENCY_SYMBOLS[to] || to} за 1 ${from} · комиссия ${pc(p.fee)}%${perks ? ` (${perks})` : ''}`;
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

const applyTheme = (isDark, save = true) => {
	document.body.classList.toggle('dark-theme', isDark);
	cryptoChart?.applyOptions(cryptoChartPalette());
	if (themeToggle) {
		themeToggle.setAttribute('aria-pressed', String(isDark));
		themeToggle.innerHTML = isDark ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
		if (window.lucide) {
			window.lucide.createIcons();
		}
	}
	if (save) localStorage.setItem('wind_theme', isDark ? 'dark' : 'light');
	if (inTelegram) {
		const background = getComputedStyle(document.body).getPropertyValue('--bg-shell').trim();
		tg.setBackgroundColor?.(background);
		if (tg.isVersionAtLeast?.('6.9')) tg.setHeaderColor?.(background);
		if (tg.isVersionAtLeast?.('7.10')) tg.setBottomBarColor?.(background);
	}
	const themeValue = document.querySelector('[data-setting-theme-value]');
	if (themeValue) {
		themeValue.textContent = isDark ? 'Вкл' : 'Выкл';
		themeValue.classList.toggle('active', isDark);
	}
};

if (themeToggle) {
	const syncTheme = () => {
		const saved = localStorage.getItem('wind_theme');
		applyTheme(saved ? saved === 'dark' : inTelegram && tg.colorScheme === 'dark', false);
	};
	syncTheme();
	if (inTelegram) tg.onEvent?.('themeChanged', syncTheme);
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
	window.dispatchEvent(new Event('wind-portfolio-open'));
};

const closeInvestmentProfile = () => {
	document.body.classList.remove('show-investment-profile');
};

// Заголовок топбара под каждую вкладку
const viewTitles = {
	dashboard: ['Wind Finance', 'Ваши финансы'],
	investments: ['Симулятор', 'Инвестиции'],
	crypto: ['Bybit · P2P и спот', 'Криптовалюты'],
	converter: ['Валюты', 'Конвертер'],
	game: ['Играй и учись', 'Игровая зона'],
	settings: ['Профиль', 'Настройки'],
};
const topbarEyebrow = document.querySelector('.topbar .eyebrow');
const topbarTitle = document.querySelector('.topbar h1');
const sectionBackdrop = document.querySelector('.section-backdrop');
const windMotion = window.matchMedia('(prefers-reduced-motion: no-preference)');
const windEffects = new Map();
const playWindEffect = (element, frames, duration, delay = 0) => {
	if (!windMotion.matches || !element?.animate) return;
	windEffects.get(element)?.cancel();
	const animation = element.animate(frames, { duration, delay, fill: 'backwards', easing: 'cubic-bezier(.22,.72,.24,1)' });
	windEffects.set(element, animation);
	animation.finished.catch(() => {}).finally(() => {
		if (windEffects.get(element) === animation) windEffects.delete(element);
	});
};
windMotion.addEventListener?.('change', () => {
	if (!windMotion.matches) windEffects.forEach(animation => animation.cancel());
});
const windResponse = (element) => playWindEffect(element, [
	{ scale: '1' }, { scale: '.95', offset: .27 }, { scale: '1.035', offset: .69 }, { scale: '1' },
], 340);
const revealPlot = (element, duration) => playWindEffect(element, [
	{ clipPath: 'inset(0 100% 0 0)', opacity: .55 },
	{ clipPath: 'inset(0 0% 0 0)', opacity: 1 },
], duration);
const drawPlotLine = (element, duration) => playWindEffect(element, [
	{ strokeDashoffset: 1 }, { strokeDashoffset: 0 },
], duration);
const settlePlotPoint = (element, duration) => playWindEffect(element, [
	{ opacity: 0, scale: '.65' }, { opacity: 0, scale: '.65', offset: .72 },
	{ opacity: 1, scale: '1.35', offset: .9 }, { opacity: 1, scale: '1' },
], duration);
const paintViewTitle = (view) => {
	const [eyebrow, title] = viewTitles[view] || viewTitles.dashboard;
	if (topbarEyebrow) topbarEyebrow.textContent = eyebrow;
	if (topbarTitle) topbarTitle.textContent = title;
};

// сводка над инвест-карточками повторяет значения из профиля портфеля
const investmentFilters = document.querySelectorAll('[data-invest-filter]');
investmentFilters.forEach(button => button.addEventListener('click', () => {
	investmentFilters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
	document.querySelectorAll('#investments .invest-card').forEach(card => {
		card.hidden = button.dataset.investFilter !== 'all' && card.dataset.kind !== button.dataset.investFilter;
	});
}));

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
	appNavigation.forEach((link) => {
		const isCurrent = link.getAttribute('href') === `#${nextView}`;
		link.classList.toggle('active', isCurrent);
		if (isCurrent) link.setAttribute('aria-current', 'page');
		else link.removeAttribute('aria-current');
	});
	paintViewTitle(nextView);
	if (changed) {
		window.scrollTo({ top: 0, behavior: 'instant' });
		playWindEffect(sectionBackdrop, [
			{ opacity: .2 }, { opacity: 1 },
		], 900);
		playWindEffect(topbarTitle, [
			{ opacity: .35, translate: '-10px 4px' }, { opacity: 1, translate: '0 0' },
		], 385);
	}
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

document.addEventListener('click', (event) => {
	const control = event.target.closest('.nav a, .market-pairs button, .rate-periods button, .invest-filters button, .market-pair, .timeframes button, .learn-tabs button, .wallet-actions button, .goal-actions button, .plus-plans button, .ni-follow');
	if (!control || control.matches(':disabled') || event.target.matches('.market-pair input')) return;
	windResponse(control.querySelector('.nav-icon') || control);
});

const setAgentOpen = (isOpen) => {
	document.body.classList.toggle('agent-open', isOpen);
	document.querySelectorAll('[data-agent-toggle][aria-expanded]').forEach((button) => button.setAttribute('aria-expanded', String(isOpen)));
};
document.querySelectorAll('[data-agent-toggle]').forEach((toggle) => {
	toggle.addEventListener('click', () => {
		setAgentOpen(!document.body.classList.contains('agent-open'));
	});
});
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') setAgentOpen(false);
});


// ================= ИГРОВОЙ ПРОФИЛЬ: уровень, задание дня, награды, звук =================
(() => {
	const KEY = 'wind_game_profile';
	const today = () => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	};
	const load = () => {
		try {
			const v = JSON.parse(localStorage.getItem(KEY) || '{}');
			return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
		} catch (e) { return {}; }
	};
	const p = Object.assign({ xp: 0, played: {}, badges: {}, daily: {}, dropBest: 0, games: 0, muted: false }, load());
	const save = () => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* без хранилища прогресс живёт до перезагрузки */ } };

	const TITLES = ['Новичок', 'Наблюдатель', 'Трейдер', 'Аналитик', 'Стратег', 'Управляющий', 'Магнат', 'Легенда рынка'];
	// уровень n требует 120·n·(n−1)/2 опыта: 0, 120, 360, 720…
	const levelOf = (xp) => {
		let lvl = 1;
		while (xp >= 60 * lvl * (lvl + 1)) lvl++;
		const from = 60 * (lvl - 1) * lvl, to = 60 * lvl * (lvl + 1);
		return { lvl, title: TITLES[Math.min(TITLES.length - 1, lvl - 1)], from, to, pct: Math.min(100, ((xp - from) / (to - from)) * 100) };
	};

	const CHALLENGES = [
		{ id: 'drop5k', game: 'drop', text: 'Собери портфель $5 000 в Crypto Drop', check: (g, d) => g === 'drop' && d.score >= 5000 },
		{ id: 'drop-ch2', game: 'drop', text: 'Дойди до главы «Волатильность» в Crypto Drop', check: (g, d) => g === 'drop' && d.chapter >= 2 },
		{ id: 'candles5', game: 'candles', text: 'Раскрой 5 дел из 6 в «Детективе свечей»', check: (g, d) => g === 'candles' && d.score >= 5 },
		{ id: 'risk-dd', game: 'risk', text: 'Доведи корабль до порта с просадкой меньше 20%', check: (g, d) => g === 'risk' && !d.ruined && d.dd < 0.2 },
		{ id: 'scam8', game: 'scam', text: 'Распознай 8 сообщений из 10 в «Охоте на мошенников»', check: (g, d) => g === 'scam' && d.ok >= 8 },
		{ id: 'any3', game: null, text: 'Получи 3 звезды в любой игре', check: (g, d) => d.stars >= 3 },
		{ id: 'drop-gold', game: 'drop', text: 'Набери $12 000 в Crypto Drop', check: (g, d) => g === 'drop' && d.score >= 12000 },
	];
	const dailyFor = (day) => {
		let hsh = 0;
		for (const ch of day) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
		return CHALLENGES[hsh % CHALLENGES.length];
	};

	const BADGES = [
		{ id: 'first', icon: 'sparkles', name: 'Первый шаг', hint: 'Сыграй в любую игру' },
		{ id: 'all4', icon: 'layout-grid', name: 'Универсал', hint: 'Сыграй в четыре разные игры' },
		{ id: 'perfect', icon: 'star', name: 'Отличник', hint: 'Получи 3 звезды в игре' },
		{ id: 'daily', icon: 'calendar-check', name: 'Дисциплина', hint: 'Выполни задание дня' },
	];

	// ---------- звук (WebAudio, без файлов) ----------
	let ac = null;
	const tone = (freq, dur = 0.09, type = 'sine', vol = 0.06, when = 0) => {
		if (p.muted) return;
		try {
			ac = ac || new (window.AudioContext || window.webkitAudioContext)();
			if (ac.state === 'suspended') ac.resume();
			const t = ac.currentTime + when;
			const o = ac.createOscillator(), g = ac.createGain();
			o.type = type; o.frequency.setValueAtTime(freq, t);
			g.gain.setValueAtTime(vol, t);
			g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
			o.connect(g).connect(ac.destination);
			o.start(t); o.stop(t + dur + 0.02);
		} catch (e) { /* звук недоступен */ }
	};
	const sfx = {
		catch: (combo = 1) => tone(520 + combo * 70, 0.08, 'triangle', 0.05),
		gold: () => { tone(880, 0.1, 'triangle', 0.05); tone(1320, 0.14, 'triangle', 0.05, 0.08); },
		bad: () => { tone(180, 0.18, 'sawtooth', 0.04); tone(120, 0.22, 'sawtooth', 0.035, 0.1); },
		ok: () => { tone(660, 0.08, 'sine', 0.05); tone(990, 0.12, 'sine', 0.05, 0.07); },
		wrong: () => tone(200, 0.2, 'square', 0.03),
		win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.05, i * 0.1)),
		tick: () => tone(1200, 0.03, 'square', 0.015),
		deliver: () => [660, 880, 1100].forEach((f, i) => tone(f, 0.1, 'triangle', 0.045, i * 0.06)),
	};

	// ---------- отрисовка панели ----------
	const $ = (id) => document.getElementById(id);
	const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
	const gameIds = Array.from(document.querySelectorAll('[data-game-tab]'), tab => tab.dataset.gameTab);
	const totalStars = () => {
		let s = {};
		try { s = JSON.parse(localStorage.getItem('wind_game_stars') || '{}') || {}; } catch (e) { s = {}; }
		return gameIds.reduce((a, k) => a + Math.max(0, Math.min(3, Number(s[k]) || 0)), 0);
	};

	const render = () => {
		const L = levelOf(p.xp);
		if ($('gh-level')) $('gh-level').textContent = String(L.lvl);
		if ($('gh-title')) $('gh-title').textContent = L.title;
		if ($('gh-xp')) $('gh-xp').textContent = `${p.xp - L.from} / ${L.to - L.from} XP`;
		if ($('gh-xp-bar')) $('gh-xp-bar').style.width = `${L.pct}%`;
		$('gh-ring')?.style.setProperty('--p', `${L.pct}`);
		if ($('gh-stars')) $('gh-stars').textContent = `${totalStars()} / ${gameIds.length * 3}`;
		const ch = dailyFor(today());
		const done = p.daily[today()] === ch.id;
		if ($('gh-daily-text')) $('gh-daily-text').textContent = ch.text;
		const dc = $('gh-daily');
		if (dc) {
			dc.classList.toggle('done', done);
			dc.dataset.game = ch.game || '';
			const s = $('gh-daily-status');
			if (s) s.textContent = done ? 'Выполнено · +150 XP' : '+150 XP';
		}
		const list = $('gh-badges');
		if (list) {
			list.replaceChildren(...BADGES.map((b) => {
				const on = Boolean(p.badges[b.id]);
				const el = mk('span', `gh-badge${on ? ' on' : ''}`);
				el.title = `${b.name}: ${b.hint}`;
				el.setAttribute('aria-label', `${b.name}${on ? ', получено' : ', не получено'}: ${b.hint}`);
				const i = document.createElement('i');
				i.setAttribute('data-lucide', on ? b.icon : 'lock');
				el.append(i, mk('small', '', b.name));
				return el;
			}));
			if (window.lucide) window.lucide.createIcons();
		}
		const mute = $('gh-sound');
		if (mute) {
			mute.setAttribute('aria-pressed', String(!p.muted));
			mute.classList.toggle('off', p.muted);
			mute.title = p.muted ? 'Звук выключен' : 'Звук включён';
		}
		document.querySelectorAll('[data-best]').forEach((n) => {
			const id = n.dataset.best;
			n.textContent = id === 'drop' ? (p.dropBest ? `рекорд $${Math.round(p.dropBest).toLocaleString('ru-RU')}` : 'ещё не играл') : (p.played[id] ? `сыграно ${p.played[id]}` : 'ещё не играл');
		});
	};

	const unlock = (id) => {
		if (p.badges[id]) return;
		p.badges[id] = today();
		const b = BADGES.find((x) => x.id === id);
		if (b && typeof showSuccess === 'function') window.setTimeout(() => showSuccess(`Новая награда: «${b.name}»`), 900);
	};

	// вызывается играми по завершении: report('candles', { stars, score, ... })
	const report = (game, data = {}) => {
		const day = today();
		p.played[game] = (p.played[game] || 0) + 1;
		p.games += 1;
		let gain = 20 + (data.stars || 0) * 40;
		if (game === 'drop') {
			gain = 20 + Math.min(160, Math.round((data.score || 0) / 100));
			p.dropBest = Math.max(p.dropBest, data.score || 0);
		}
		const ch = dailyFor(day);
		if (p.daily[day] !== ch.id && ch.check(game, data)) {
			p.daily = { [day]: ch.id };
			gain += 150;
			unlock('daily');
			if (typeof showSuccess === 'function') showSuccess('Задание дня выполнено: +150 XP');
			sfx.win();
		}
		const before = levelOf(p.xp).lvl;
		p.xp += gain;
		const after = levelOf(p.xp);
		unlock('first');
		if (gameIds.filter(id => p.played[id]).length >= 4) unlock('all4');
		if ((data.stars || 0) >= 3) unlock('perfect');
		save();
		render();
		const hub = $('game-hub');
		if (hub) {
			const pop = mk('span', 'gh-xp-pop', `+${gain} XP`);
			hub.appendChild(pop);
			window.setTimeout(() => pop.remove(), 1800);
		}
		if (after.lvl > before && typeof showSuccess === 'function') {
			window.setTimeout(() => showSuccess(`Новый уровень ${after.lvl}: ${after.title}!`), 400);
			sfx.win();
		}
	};

	$('gh-sound')?.addEventListener('click', () => {
		p.muted = !p.muted;
		save();
		render();
		if (!p.muted) sfx.ok();
	});
	$('gh-daily')?.addEventListener('click', () => {
		const g = $('gh-daily').dataset.game;
		if (g) document.querySelector(`[data-game-tab="${g}"]`)?.click();
	});

	window.WindGames = { report, sfx, render, isMuted: () => p.muted };
	render();
})();

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
	const s = { px: 0, prevPx: 0, lean: 0, dir: 0, items: [], fx: [], parts: [], flash: 0, banner: 0, stack: [], debris: [], timer: 0, score: 0, lives: 3, combo: 1, caught: 0, chapter: 0, shake: 0, lastCatch: 0, best: Number(localStorage.getItem('cg_best') || 0), t: 0 };

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
		buildScenery();
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

	const floatText = (x, y, text, color, big = false) => s.fx.push({ x, y, text, color, life: 1, big });

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
		const reached = s.chapter + 1;
		const stars = result === true ? 3 : reached >= 3 ? 2 : reached >= 2 ? 1 : 0;
		try {
			const all = JSON.parse(localStorage.getItem('wind_game_stars') || '{}') || {};
			if (stars > (Number(all.drop) || 0)) { all.drop = stars; localStorage.setItem('wind_game_stars', JSON.stringify(all)); }
		} catch (e) { /* без хранилища */ }
		window.dispatchEvent(new Event('wind-game-stars'));
		if (result !== null || s.score > 0) window.WindGames?.report('drop', { score: s.score, chapter: reached, stars, win: result === true });
		if (result === true) window.WindGames?.sfx.win();
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
		if (removed.length) { floatText(s.px, basketTop() - 70, '−' + money(lost), '#ff8d7b', true); window.WindGames?.sfx.bad(); }
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
		floatText(s.px, basketTop() - 90, 'Доставка! +' + money(bonus), '#ffd978', true);
		burst(s.px, basketTop() - 40, '#ffd978', 26);
		window.WindGames?.sfx.deliver();
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
			floatText(it.x, basketTop() - 30, '−1 ♥', '#ff8d7b', true);
			burst(it.x, it.y, '#ff5a5a', 18);
			window.WindGames?.sfx.bad();
			if (navigator.vibrate) navigator.vibrate(60);
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
		floatText(it.x, landingY - 20, '+' + money(gain), it.key === 'gold' ? '#ffd978' : '#9ef0c6', it.key === 'gold');
		burst(it.x, landingY, TYPES[it.key].color, it.key === 'gold' ? 20 : 10);
		if (it.key === 'gold') window.WindGames?.sfx.gold(); else window.WindGames?.sfx.catch(s.combo);
		ui.msg.textContent = it.key === 'gold' ? 'Золотой ящик лёг на башню!' : s.combo > 1 ? `Серия ×${s.combo}! Башня растёт.` : 'Ящик уложен.';

		const fell = checkStability();
		if (!fell && s.stack.length >= STACK_MAX) deliver();

		if (s.caught >= CHAPTERS[s.chapter].goal) {
			if (s.chapter + 1 >= CHAPTERS.length) { updateUi(); finish(true); return true; }
			setChapter(s.chapter + 1);
			s.banner = 1.8;
			window.WindGames?.sfx.win();
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
		s.parts = s.parts.filter((pt) => { pt.vy += 520 * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; return (pt.life -= dt * 1.6) > 0; });
		if (s.banner > 0) s.banner -= dt;
		if (s.flash > 0) s.flash -= dt * 2.5;
		else if (s.chapter === 1 && Math.random() < dt * 0.12) s.flash = 1;
		if (s.chapter === 2) scenery.snow.forEach((f) => { f.y += f.v * dt; if (f.y > h) { f.y = -4; f.x = Math.random() * w; } });
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

	// ---------- декорации: небо главы, горизонт из свечей, звёзды, снег ----------
	const SKIES = [
		{ top: '#123f35', mid: '#2c7a5f', bot: '#f2c98a', sun: 'rgba(255,214,140,.85)', city: 'rgba(10,40,32,.55)', city2: 'rgba(10,40,32,.3)' },
		{ top: '#1d1f4a', mid: '#3c3f7a', bot: '#7d6fa8', sun: 'rgba(190,180,255,.35)', city: 'rgba(14,14,40,.6)', city2: 'rgba(14,14,40,.32)' },
		{ top: '#071426', mid: '#0f2a4a', bot: '#2d5a7c', sun: 'rgba(220,240,255,.75)', city: 'rgba(3,10,22,.7)', city2: 'rgba(3,10,22,.38)' },
	];
	const scenery = { skyline: [], skyline2: [], stars: [], snow: [], clouds: [] };
	const buildScenery = () => {
		const mkLine = (gap, minH, maxH) => {
			const out = [];
			for (let x = -20; x < w + 40; x += gap + Math.random() * gap) {
				const bodyH = minH + Math.random() * (maxH - minH);
				out.push({ x, bw: 8 + Math.random() * 10, bodyH, wick: 6 + Math.random() * 18 });
			}
			return out;
		};
		scenery.skyline = mkLine(26, h * 0.08, h * 0.24);
		scenery.skyline2 = mkLine(18, h * 0.12, h * 0.34);
		scenery.stars = Array.from({ length: Math.round(w / 9) }, () => ({ x: Math.random() * w, y: Math.random() * h * 0.6, r: Math.random() * 1.4 + 0.3, ph: Math.random() * 6 }));
		scenery.snow = Array.from({ length: Math.round(w / 7) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 2 + 0.8, v: 20 + Math.random() * 40, ph: Math.random() * 6 }));
		scenery.clouds = Array.from({ length: 4 }, (_, i) => ({ x: Math.random() * w, y: 30 + i * (h * 0.12), s: 0.6 + Math.random() * 0.8, v: 6 + Math.random() * 10 }));
	};

	const cloud = (x, y, sc, alpha) => {
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.fillStyle = '#fff';
		ctx.beginPath();
		ctx.arc(x, y, 18 * sc, 0, Math.PI * 2);
		ctx.arc(x + 20 * sc, y - 8 * sc, 22 * sc, 0, Math.PI * 2);
		ctx.arc(x + 44 * sc, y, 17 * sc, 0, Math.PI * 2);
		ctx.rect(x, y, 44 * sc, 17 * sc);
		ctx.fill();
		ctx.restore();
	};

	const drawSky = () => {
		const sk = SKIES[s.chapter] || SKIES[0];
		const g = ctx.createLinearGradient(0, 0, 0, h);
		g.addColorStop(0, sk.top); g.addColorStop(0.55, sk.mid); g.addColorStop(1, sk.bot);
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, w, h);
		// звёзды ночью и в шторм
		if (s.chapter >= 1) {
			scenery.stars.forEach((st) => {
				ctx.globalAlpha = (s.chapter === 2 ? 0.9 : 0.45) * (0.5 + 0.5 * Math.sin(s.t * 2 + st.ph));
				ctx.fillStyle = '#fff';
				ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
			});
			ctx.globalAlpha = 1;
		}
		// солнце или луна
		const sx = w * 0.78, sy = h * (s.chapter === 0 ? 0.62 : 0.2);
		const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, 90);
		glow.addColorStop(0, sk.sun); glow.addColorStop(1, 'rgba(255,255,255,0)');
		ctx.fillStyle = glow;
		ctx.fillRect(sx - 90, sy - 90, 180, 180);
		ctx.fillStyle = sk.sun;
		ctx.beginPath(); ctx.arc(sx, sy, s.chapter === 0 ? 30 : 20, 0, Math.PI * 2); ctx.fill();
		// облака
		scenery.clouds.forEach((c) => cloud(((c.x + s.t * c.v) % (w + 140)) - 70, c.y, c.s, s.chapter === 1 ? 0.12 : 0.18));
		// Дальние береговые уступы и струи воздуха движутся медленнее игрового груза.
		ctx.fillStyle = sk.city2;
		ctx.beginPath();
		ctx.moveTo(0, h);
		ctx.lineTo(0, h * .76);
		ctx.bezierCurveTo(w * .22, h * .63, w * .33, h * .85, w * .52, h * .72);
		ctx.lineTo(w * .62, h * .67);
		ctx.lineTo(w * .66, h * .7);
		ctx.bezierCurveTo(w * .83, h * .51, w * .89, h * .64, w, h * .53);
		ctx.lineTo(w, h);
		ctx.fill();
		ctx.strokeStyle = 'rgba(238,250,211,.3)';
		ctx.lineWidth = 1.2;
		for (let band = 0; band < 3; band++) {
			const x = ((s.t * (12 + band * 3) + band * w * .38) % (w + 125)) - 120;
			const y = h * (.22 + band * .16);
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.bezierCurveTo(x + 42, y + 4, x + 68, y - 21, x + 115, y - 12);
			ctx.stroke();
		}
		// горизонт из свечей с параллаксом от корзины
		const par = (s.px - w / 2) / w;
		const city = (line, col, depth, base) => {
			ctx.fillStyle = col;
			ctx.strokeStyle = col;
			ctx.lineWidth = 2;
			line.forEach((c) => {
				const x = c.x - par * depth;
				const top = base - c.bodyH;
				ctx.fillRect(x - c.bw / 2, top, c.bw, c.bodyH + 40);
				ctx.beginPath(); ctx.moveTo(x, top - c.wick); ctx.lineTo(x, top); ctx.stroke();
			});
		};
		city(scenery.skyline2, sk.city2, 14, h - 8);
		city(scenery.skyline, sk.city, 30, h + 4);
		// вспышка молнии в шторм
		if (s.flash > 0) {
			ctx.fillStyle = `rgba(230,230,255,${s.flash * 0.5})`;
			ctx.fillRect(0, 0, w, h);
		}
		// снег в крипто-зиму
		if (s.chapter === 2) {
			ctx.fillStyle = 'rgba(255,255,255,.85)';
			scenery.snow.forEach((f) => {
				ctx.beginPath();
				ctx.arc(f.x + Math.sin(s.t + f.ph) * 6, f.y, f.r, 0, Math.PI * 2);
				ctx.fill();
			});
		}
	};

	const shade = (hex, k) => {
		const n = parseInt(hex.slice(1), 16);
		const f = (v) => Math.max(0, Math.min(255, Math.round(v + (k > 0 ? (255 - v) * k : v * k))));
		return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
	};

	const drawCrate = (key, sz, x, y, rot) => {
		const t = TYPES[key];
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(rot);
		if (key === 'gold') { ctx.shadowColor = 'rgba(255,214,90,.95)'; ctx.shadowBlur = 18 + 6 * Math.sin(s.t * 6); }
		else if (key === 'rug') { ctx.shadowColor = 'rgba(255,70,70,.85)'; ctx.shadowBlur = 12 + 6 * Math.sin(s.t * 9); }
		else { ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3; }
		const g = ctx.createLinearGradient(0, -sz / 2, 0, sz / 2);
		g.addColorStop(0, shade(t.color, 0.28));
		g.addColorStop(1, shade(t.color, -0.18));
		ctx.fillStyle = g;
		rr(-sz / 2, -sz / 2, sz, sz, 9); ctx.fill();
		ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
		ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.stroke();
		// блик
		ctx.save();
		rr(-sz / 2, -sz / 2, sz, sz, 9); ctx.clip();
		ctx.fillStyle = 'rgba(255,255,255,.22)';
		ctx.beginPath(); ctx.ellipse(-sz * 0.1, -sz * 0.42, sz * 0.62, sz * 0.26, -0.2, 0, Math.PI * 2); ctx.fill();
		if (key === 'gold') {
			const sh = ((s.t * 1.2) % 2) * sz * 1.6 - sz * 0.8;
			ctx.fillStyle = 'rgba(255,255,255,.45)';
			ctx.beginPath(); ctx.moveTo(sh - 6, -sz / 2); ctx.lineTo(sh + 6, -sz / 2); ctx.lineTo(sh - 6 + sz * 0.3, sz / 2); ctx.lineTo(sh - 18 + sz * 0.3, sz / 2); ctx.fill();
		}
		ctx.restore();
		ctx.fillStyle = '#fff';
		ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 3;
		ctx.font = `700 ${Math.round(sz * 0.56)}px "Space Grotesk", sans-serif`;
		ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
		ctx.fillText(t.sym, 0, 1);
		ctx.restore();
	};

	const drawBasket = () => {
		const bx = s.px - PW / 2, by = basketTop();
		ctx.save();
		ctx.shadowColor = 'rgba(119,213,167,.6)'; ctx.shadowBlur = 18;
		const g = ctx.createLinearGradient(0, by, 0, by + PH);
		g.addColorStop(0, '#2f8d68'); g.addColorStop(1, '#174f3c');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.moveTo(bx - 6, by); ctx.lineTo(bx + PW + 6, by);
		ctx.lineTo(bx + PW - 8, by + PH); ctx.lineTo(bx + 8, by + PH);
		ctx.closePath(); ctx.fill();
		ctx.restore();
		ctx.fillStyle = '#9ef0c6';
		rr(bx - 9, by - 5, PW + 18, 9, 4); ctx.fill();
		// Иллюминаторы и медная обшивка почтового судна.
		for (const offset of [-22, 0, 22]) {
			ctx.beginPath(); ctx.arc(s.px + offset, by + 13, 5, 0, Math.PI * 2);
			ctx.fillStyle = '#f1ce88'; ctx.fill();
			ctx.beginPath(); ctx.arc(s.px + offset, by + 13, 3, 0, Math.PI * 2);
			ctx.fillStyle = '#234c55'; ctx.fill();
		}
		ctx.strokeStyle = '#db9566'; ctx.lineWidth = 3;
		ctx.beginPath(); ctx.moveTo(bx + 7, by + PH - 5); ctx.lineTo(bx + PW - 7, by + PH - 5); ctx.stroke();
		ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
		// индикатор серии над корзиной
		if (s.combo > 1) {
			const k = Math.max(0, 1 - (performance.now() - s.lastCatch) / 2200);
			ctx.save();
			ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 4;
			ctx.beginPath(); ctx.arc(bx + PW + 26, by - 4, 14, 0, Math.PI * 2); ctx.stroke();
			ctx.strokeStyle = '#f4c95d';
			ctx.beginPath(); ctx.arc(bx + PW + 26, by - 4, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
			ctx.fillStyle = '#fff';
			ctx.font = '700 12px "Space Grotesk", sans-serif';
			ctx.fillText('×' + s.combo, bx + PW + 26, by - 3);
			ctx.restore();
		}
	};

	const burst = (x, y, color, n = 12) => {
		for (let i = 0; i < n; i++) {
			const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 180;
			s.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 1, color, r: 2 + Math.random() * 3 });
		}
	};

	function draw() {
		if (!w) return;
		if (!scenery.skyline.length) buildScenery();
		ctx.clearRect(0, 0, w, h);
		ctx.save();
		if (s.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * s.shake * 4, (Math.random() - 0.5) * 10 * s.shake * 4);
		drawSky();
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
		s.parts.forEach((pt) => {
			ctx.globalAlpha = Math.max(0, pt.life);
			ctx.fillStyle = pt.color;
			ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r * pt.life + 0.5, 0, Math.PI * 2); ctx.fill();
		});
		ctx.globalAlpha = 1;
		s.fx.forEach((f) => {
			ctx.globalAlpha = Math.max(0, f.life);
			ctx.font = `800 ${f.big ? 22 : 17}px "Space Grotesk", sans-serif`;
			ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
			ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.35)';
			ctx.strokeText(f.text, f.x, f.y);
			ctx.fillStyle = f.color;
			ctx.fillText(f.text, f.x, f.y);
		});
		ctx.globalAlpha = 1;
		// баннер новой главы
		if (s.banner > 0) {
			const al = Math.min(1, s.banner * 2);
			ctx.globalAlpha = al;
			ctx.fillStyle = 'rgba(0,0,0,.35)';
			ctx.fillRect(0, h * 0.32, w, 64);
			ctx.fillStyle = '#fff';
			ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
			ctx.font = '600 12px "DM Sans", sans-serif';
			ctx.fillText(CHAPTERS[s.chapter].label.toUpperCase(), w / 2, h * 0.32 + 20);
			ctx.font = '800 22px "Space Grotesk", sans-serif';
			ctx.fillText(CHAPTERS[s.chapter].title, w / 2, h * 0.32 + 43);
			ctx.globalAlpha = 1;
		}
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
		Object.assign(s, { items: [], fx: [], parts: [], flash: 0, banner: 1.6, stack: [], debris: [], timer: 0.4, score: 0, lives: 3, combo: 1, caught: 0, shake: 0, lastCatch: 0, t: 0, dir: 0, lean: 0, px: w / 2, prevPx: w / 2 });
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
		profileDropdown?.setAttribute('hidden', '');
		profileTrigger?.setAttribute('aria-expanded', 'false');
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
	if (hash.startsWith('reset=')) {
		void checkSession();
		return;
	}
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

const marketPairs = {
	USD: { unit: 'За 1 доллар США', value: CURRENCY_RATES.USD, prev: 92.14 },
	EUR: { unit: 'За 1 евро', value: CURRENCY_RATES.EUR, prev: 100.33 },
	CNY: { unit: 'За 1 китайский юань', value: CURRENCY_RATES.CNY, prev: 12.85 },
};
const publishedCurrencies = new Set();
const marketButtons = document.querySelectorAll('[data-market-currency]');
const marketFocus = document.querySelector('.focus-card');
let marketCurrency = 'USD';

const historyPeriods = document.querySelectorAll('[data-rate-days]');
const historyFigure = document.getElementById('rate-history-figure');
const historyStatus = document.getElementById('rate-history-status');
const historyRetry = document.getElementById('rate-history-retry');
let historyDays = 7;
let historyData;
let historyRequest = 0;
const dayMs = 86400000;
const historyDate = (value) => value.slice(5).split('-').reverse().join('.');
let marketPreviewRequest;
const loadMarketPreview = () => {
	if (!marketPreviewRequest) {
		marketPreviewRequest = fetch('assets/market-preview.json', { cache: 'no-cache' })
			.then((response) => {
				if (!response.ok) throw new Error('Архив недоступен');
				return response.json();
			}).catch((error) => {
				marketPreviewRequest = null;
				throw error;
			});
	}
	return marketPreviewRequest;
};

const renderRateHistory = () => {
	if (!historyData) return;
	const start = Date.parse(historyData.end) - (historyDays - 1) * dayMs;
	const points = historyData.points.filter((point) => Date.parse(point.date) >= start);
	historyFigure.hidden = points.length < 2;
	historyStatus.hidden = !historyFigure.hidden;
	if (historyFigure.hidden) {
		historyStatus.textContent = 'За этот период пока мало данных для графика.';
		return;
	}

	const first = points[0], last = points.at(-1);
	const low = Math.min(...points.map((point) => point.value));
	const high = Math.max(...points.map((point) => point.value));
	const firstDay = Date.parse(first.date);
	const span = Date.parse(last.date) - firstDay;
	const coordinates = points.map(({ date, value }) => {
		const x = 3 + (Date.parse(date) - firstDay) / span * 314;
		const y = high === low ? 46 : 8 + (high - value) / (high - low) * 76;
		return `${x.toFixed(2)},${y.toFixed(2)}`;
	});
	const line = document.getElementById('rate-history-line');
	const area = document.getElementById('rate-history-area');
	const end = document.getElementById('rate-history-end');
	const halo = document.getElementById('rate-history-halo');
	const [x, y] = coordinates.at(-1).split(',');
	line.setAttribute('points', coordinates.join(' '));
	area.setAttribute('points', `3,92 ${coordinates.join(' ')} ${x},92`);
	for (const marker of [end, halo]) {
		marker.setAttribute('cx', x);
		marker.setAttribute('cy', y);
		settlePlotPoint(marker, 850);
	}
	drawPlotLine(line, 690);
	revealPlot(area, 780);
	document.getElementById('rate-y-high').textContent = `${formatMoney(high)} ₽`;
	document.getElementById('rate-y-low').textContent = high === low ? '' : `${formatMoney(low)} ₽`;
	document.getElementById('rate-history-summary').textContent =
		`${historyDate(first.date)} · ${formatMoney(first.value)} ₽ → ${historyDate(last.date)} · ${formatMoney(last.value)} ₽`;
};

const loadRateHistory = async () => {
	const request = ++historyRequest;
	historyData = null;
	historyFigure.hidden = true;
	historyStatus.hidden = false;
	historyStatus.textContent = 'Загружаем котировки…';
	historyRetry.hidden = true;
	try {
		const asset = marketCurrency;
		const data = apiConfigured ? await WindApi(`/market/rates/history?asset=${asset}`)
			: (await loadMarketPreview()).history[asset];
		if (request !== historyRequest) return;
		historyData = data;
		renderRateHistory();
	} catch {
		if (request !== historyRequest) return;
		historyData = null;
		historyFigure.hidden = true;
		historyStatus.hidden = false;
		historyStatus.textContent = 'Не удалось загрузить историю курсов ЦБ РФ.';
		historyRetry.hidden = false;
	}
};
historyPeriods.forEach((button) => button.addEventListener('click', () => {
	historyDays = Number(button.dataset.rateDays);
	historyPeriods.forEach((option) => option.setAttribute('aria-pressed', String(option === button)));
	renderRateHistory();
}));
historyRetry.addEventListener('click', loadRateHistory);
onAppView(['dashboard'], (active) => { if (active && !historyData) loadRateHistory(); });

const renderMarketPair = () => {
	const { unit, value, prev, source = 'Пример данных' } = marketPairs[marketCurrency];
	document.getElementById('market-source').textContent = source;
	const change = (value - prev) / prev * 100;
	const sign = change > 0 ? '+' : change < 0 ? '−' : '';
	marketFocus.querySelector('.focus-unit').textContent = unit;
	marketFocus.querySelector('.focus-value').textContent = `${formatMoney(value)} ₽`;
	marketFocus.querySelector('.focus-previous').textContent = `Было ${formatMoney(prev)} ₽`;
	const trend = marketFocus.querySelector('.focus-change');
	trend.textContent = `${sign}${formatMoney(Math.abs(change))}%`;
	trend.classList.toggle('positive', change > 0);
	trend.classList.toggle('negative', change < 0);
	marketButtons.forEach((button) => {
		button.setAttribute('aria-pressed', String(button.dataset.marketCurrency === marketCurrency));
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
};

marketButtons.forEach((button) => {
	button.addEventListener('click', () => {
		if (marketCurrency === button.dataset.marketCurrency) return;
		marketCurrency = button.dataset.marketCurrency;
		renderMarketPair();
		playWindEffect(marketFocus.querySelector('.focus-value'), [
			{ opacity: .25, translate: '-6px 3px' }, { opacity: 1, translate: '0 0' },
		], 340);
		loadRateHistory();
	});
});
document.querySelector('.stats-link').addEventListener('click', () => {
	converterFromSelect.value = marketCurrency;
	converterToSelect.value = 'RUB';
	syncCurrencyButtons();
	updateConverter();
});

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
	const previousCode = targetSelect.value;
	targetSelect.value = currencyCode;
	if (otherSelect.value === currencyCode) otherSelect.value = previousCode;
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
const appShell = document.querySelector('.app');
new MutationObserver(() => { appShell.inert = !authGate.hidden; })
	.observe(authGate, { attributes: true, attributeFilter: ['hidden'] });
const authForm = document.querySelector('#auth-form');
const authTitle = document.querySelector('#auth-title');
const authDescription = document.querySelector('#auth-description');
const authSubmitLabel = document.querySelector('#auth-submit-label');
const authError = document.querySelector('#auth-error');
const usernameField = document.querySelector('#auth-username');
const emailField = document.querySelector('#auth-email');
const passwordField = document.querySelector('#auth-password');
const passwordToggle = document.querySelector('#auth-password-toggle');
const passwordRow = document.querySelector('#auth-password-field');
const totpField = document.querySelector('#auth-totp');
const consentBox = document.querySelector('#auth-consent');
const demoLoginButton = document.querySelector('#demo-login-button');
const demoCredentials = { email: 'demo@example.com', password: 'demo123456' };
const passwordMeter = document.querySelector('#password-meter');
const passwordMeterBar = document.querySelector('#password-meter-bar');
const passwordMeterLabel = document.querySelector('#password-meter-label');
const authTabs = document.querySelector('.auth-tabs');
const authModeButtons = authTabs.querySelectorAll('[data-auth-mode]');
const authBack = document.querySelector('#auth-back');
const resetAgain = document.querySelector('#auth-reset-again');
const telegramLoginButton = document.getElementById('telegram-login-button');
let authMode = 'login';
let needTotp = false;
const DEMO_PREVIEW_KEY = 'wind_demo_preview';
const DEMO_GOALS_KEY = 'wind_demo_goals';
const isDemoPreview = () => sessionStorage.getItem(DEMO_PREVIEW_KEY) === '1';
const demoPreviewUser = {
	id: 0,
	username: 'Демо-просмотр',
	balance: 24500,
	plus: false,
	totp_enabled: false,
};
let demoGoals = [];
try {
	const stored = JSON.parse(sessionStorage.getItem(DEMO_GOALS_KEY) || '[]');
	if (Array.isArray(stored)) demoGoals = stored;
} catch { /* Демо доступно и без сохранённой сессии. */ }
const demoBalanceKop = () => demoPreviewUser.balance * 100
	- demoGoals.reduce((sum, goal) => sum + goal.savedKop, 0);

// единая точка обращения к серверу: токен подставляется сам
const api = async (path, { method = 'GET', body, timeoutMs = 10000 } = {}) => {
	const token = isDemoPreview() ? null : localStorage.getItem('wind_access_token');
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

let starsPrices = null;
let starsCatalogError = '';
let starsCatalogRequest = 0;
const formatStars = (price) => `${price.toLocaleString('ru-RU')} Stars`;
const loadStarsCatalog = async () => {
	const request = ++starsCatalogRequest;
	starsCatalogError = '';
	try {
		if (!tg?.openInvoice || !tg.isVersionAtLeast?.('6.1')) throw new Error('Обнови Telegram, чтобы открыть оплату Stars.');
		const { prices } = await WindApi('/payments/stars/catalog');
		if (request !== starsCatalogRequest) return;
		starsPrices = prices || {};
	} catch (error) {
		if (request !== starsCatalogRequest) return;
		starsPrices = {};
		starsCatalogError = error.message;
	}
	document.dispatchEvent(new Event('wind-stars-catalog'));
};
window.addEventListener('wind-logout', () => {
	starsCatalogRequest++;
	starsPrices = null;
	starsCatalogError = '';
});

let starsCheckoutActive = false;
const checkoutWithStars = async (offer) => {
	if (starsCheckoutActive) throw new Error('Сначала закрой текущий счёт Telegram.');
	starsCheckoutActive = true;
	const token = localStorage.getItem('wind_access_token');
	const sameSession = () => !isDemoPreview() && localStorage.getItem('wind_access_token') === token;
	try {
		const { invoice_url, payment_id } = await WindApi('/payments/stars/invoice', {
			method: 'POST', body: { offer },
		});
		if (!sameSession()) return 'stale';
		const invoiceStatus = await new Promise((resolve) => tg.openInvoice(invoice_url, resolve));
		if (invoiceStatus === 'cancelled') return 'cancelled';
		if (invoiceStatus === 'failed') throw new Error('Telegram не смог провести оплату.');
		// Статус из интерфейса Telegram не подтверждает зачисление. Ждём серверный webhook.
		const deadline = Date.now() + 15000;
		while (sameSession() && Date.now() < deadline) {
			const payment = await WindApi(`/payments/${encodeURIComponent(payment_id)}`, { timeoutMs: 4000 }).catch(() => null);
			if (payment?.status === 'succeeded') return sameSession() ? 'succeeded' : 'stale';
			await new Promise((resolve) => window.setTimeout(resolve, 800));
		}
		return sameSession() ? 'pending' : 'stale';
	} finally {
		starsCheckoutActive = false;
	}
};
const starsPaymentMessage = (status) => status === 'cancelled' ? 'Оплата отменена.'
	: 'Платёж ожидает подтверждения. Проверь баланс или подписку позже.';

const updateProfile = (user) => {
	document.getElementById('wallet-demo').hidden = user.id !== 0;
	document.body.classList.toggle('demo-preview', user.id === 0);
	document.getElementById('demo-goal-shortcut').hidden = user.id !== 0;
	document.getElementById('wallet-plus-button').textContent = user.id === 0 ? 'Пример Wind Plus' : 'Wind Plus';
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
const clearPasswordReset = () => {
	resetToken = null;
	const url = new URL(location.href);
	if (url.hash.startsWith('#reset=')) {
		url.hash = '';
		history.replaceState(null, '', url);
	}
};
const setNotice = (text, kind = '') => {
	if (!authNotice) return;
	authNotice.hidden = !text;
	authNotice.textContent = text || '';
	authNotice.className = `auth-notice${kind ? ' ' + kind : ''}`;
};
const showPassword = (visible) => {
	passwordField.type = visible ? 'text' : 'password';
	passwordToggle.textContent = visible ? 'Скрыть' : 'Показать';
	passwordToggle.setAttribute('aria-label', visible ? 'Скрыть пароль' : 'Показать пароль');
};
passwordToggle.addEventListener('click', () => showPassword(passwordField.type === 'password'));
authForm.addEventListener('reset', () => {
	showPassword(false);
	queueMicrotask(updatePasswordMeter);
});

const AUTH_MODES = {
	login: { title: 'Войти в аккаунт', submit: 'Войти', busy: 'Входим…', copy: 'Открой свой портфель и копилки.' },
	register: { title: 'Создать аккаунт', submit: 'Зарегистрироваться', busy: 'Создаём аккаунт…', copy: 'Заведи копилку и собери свой учебный портфель.' },
	forgot: { title: 'Восстановить пароль', submit: 'Отправить ссылку', busy: 'Отправляем ссылку…', copy: 'Ссылка придёт на почту. Она действует 30 минут.' },
	reset: { title: 'Новый пароль', submit: 'Сохранить пароль', busy: 'Сохраняем пароль…', copy: 'Для нового пароля используй минимум 8 символов.' },
};

const animateAuthFields = () => {
	const fields = authForm.querySelectorAll(':scope > :is(label, .auth-password-field, .password-meter, .auth-submit):not([hidden])');
	fields.forEach((field, index) => playWindEffect(field, [
		{ opacity: .5, translate: '0 9px' }, { opacity: 1, translate: '0 0' },
	], 420, index * 38));
};

const setAuthMode = (mode) => {
	const changed = authMode !== mode;
	authMode = mode;
	authGate.dataset.mode = mode;
	needTotp = false;
	const isRegister = mode === 'register', isForgot = mode === 'forgot', isReset = mode === 'reset';
	const meta = AUTH_MODES[mode] || AUTH_MODES.login;
	authTitle.textContent = meta.title;
	authDescription.textContent = meta.copy;
	authSubmitLabel.textContent = meta.submit;
	authTabs.hidden = isForgot || isReset;
	authBack.hidden = !authTabs.hidden;
	resetAgain.hidden = true;
	telegramLoginButton.hidden = !inTelegram || isReset;
	usernameField.closest('label').hidden = !isRegister;
	usernameField.required = isRegister;
	consentBox.closest('label').hidden = !isRegister;
	emailField.closest('label').hidden = isReset;
	emailField.required = !isReset;
	passwordRow.hidden = isForgot;
	passwordField.required = !isForgot;
	document.getElementById('auth-password-label').textContent = isReset ? 'Новый пароль' : 'Пароль';
	passwordField.placeholder = isRegister || isReset ? 'Минимум 8 символов' : 'Твой пароль';
	if (forgotButton) forgotButton.hidden = mode !== 'login';
	totpField.closest('label').hidden = true;
	totpField.value = '';
	passwordField.autocomplete = isRegister || isReset ? 'new-password' : 'current-password';
	passwordMeter.hidden = !(isRegister || isReset);
	if (!isRegister) passwordField.value = '';
	showPassword(false);
	updatePasswordMeter();
	authModeButtons.forEach(button => {
		const active = button.dataset.authMode === mode;
		button.classList.toggle('active', active);
		button.setAttribute('aria-pressed', String(active));
	});
	authError.textContent = '';
	if (changed) {
		playWindEffect(authTitle.parentElement, [
			{ opacity: .55, translate: '-6px 3px' }, { opacity: 1, translate: '0 0' },
		], 320);
		animateAuthFields();
	}
};
const showForgotPassword = () => {
	clearPasswordReset();
	setAuthMode('forgot');
	if (apiConfigured) setNotice('');
	emailField.focus();
};
forgotButton.addEventListener('click', showForgotPassword);
resetAgain.addEventListener('click', showForgotPassword);
authBack.addEventListener('click', () => {
	clearPasswordReset();
	setAuthMode('login');
	if (apiConfigured) setNotice('');
	authModeButtons[0].focus();
});

// ---- доступность сервера ----
// На GitHub Pages адрес API задаётся переменной BACKEND_URL. Без неё запросы уходили на сам github.io.
const apiConfigured = Boolean(window.WIND_API_URL) || !/\.github\.io$/.test(window.location.hostname);
let serverAwake = false;
const wakeServer = () => {
	if (!apiConfigured) return Promise.resolve(false);
	// бесплатный хостинг засыпает: первый запрос будит сервер, пока человек вводит пароль
	return fetch(`${apiBase}/health`, { cache: 'no-store' }).then((r) => { serverAwake = r.ok; return r.ok; }).catch(() => false);
};
if (!inTelegram && !localStorage.getItem('wind_access_token') && !isDemoPreview()) wakeServer();
// подсказка «сервер просыпается», если запрос идёт дольше 3 секунд
const withWakeHint = async (promise, label) => {
	const timer = window.setTimeout(() => {
		if (!serverAwake) setNotice('Сервер просыпается после простоя — это может занять до минуты. Не закрывай страницу.', 'wait');
		if (label) label.textContent = 'Подключаемся…';
	}, 3000);
	try { return await promise; } finally { window.clearTimeout(timer); }
};
if (!apiConfigured) {
	setNotice('Вход и регистрация доступны после подключения сервера. Демо уже работает.', 'setup');
}

authModeButtons.forEach(button => button.addEventListener('click', () => {
	if (button.dataset.authMode !== authMode) setAuthMode(button.dataset.authMode);
}));

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

document.querySelector('.auth-showcase')?.addEventListener('pointermove', (event) => {
	const card = event.currentTarget.querySelector('.auth-mini-portfolio');
	if (!windMotion.matches || !card || event.pointerType !== 'mouse' || window.matchMedia('(max-width: 760px)').matches) return;
	const rect = event.currentTarget.getBoundingClientRect();
	const x = (event.clientX - rect.left) / rect.width - 0.5;
	const y = (event.clientY - rect.top) / rect.height - 0.5;
	card.style.transform = `perspective(700px) rotateY(${x * 5}deg) rotateX(${y * -4}deg)`;
});
document.querySelector('.auth-showcase')?.addEventListener('pointerleave', (event) => {
	const card = event.currentTarget.querySelector('.auth-mini-portfolio');
	if (card) card.style.transform = '';
});

const showDemo = () => {
	updateProfile({ ...demoPreviewUser, balance: demoBalanceKop() / 100 });
	authGate.hidden = true;
};
demoLoginButton?.addEventListener('click', () => {
	telegramLoginRequest++;
	clearPasswordReset();
	sessionStorage.setItem(DEMO_PREVIEW_KEY, '1');
	window.history.replaceState(null, '', '#dashboard');
	setAppView('dashboard');
	showDemo();
	authForm.reset();
});

const showAuth = () => {
	const alreadyLogin = authMode === 'login';
	authGate.hidden = false;
	setAuthMode('login');
	if (alreadyLogin) animateAuthFields();
};

telegramLoginButton.hidden = !inTelegram;
let telegramLoginRequest = 0;
const tgLogin = async () => {
	if (!inTelegram || telegramLoginButton.disabled || authForm.querySelector('.auth-submit').disabled) return;
	const request = ++telegramLoginRequest;
	telegramLoginButton.disabled = true;
	setNotice('Входим через Telegram…', 'wait');
	try {
		const r = await api('/auth/telegram', { method: 'POST', body: { init_data: tg.initData }, timeoutMs: 70000 });
		if (request !== telegramLoginRequest) return;
		localStorage.setItem('wind_access_token', r.access_token);
		sessionStorage.removeItem(DEMO_PREVIEW_KEY);
		updateProfile(r.user);
		setNotice('');
		authGate.hidden = true;
	} catch (e) {
		if (request !== telegramLoginRequest) return;
		const detail = e.status === 401 ? 'Открой приложение заново из чата с ботом.'
			: 'Можно повторить попытку, войти по почте или открыть демо.';
		setNotice(`Не удалось войти через Telegram. ${detail}`, 'warn');
	} finally {
		telegramLoginButton.disabled = false;
	}
};
telegramLoginButton.addEventListener('click', tgLogin);

const checkSession = async () => {
	const url = new URL(location.href);
	const fragmentToken = url.hash.startsWith('#reset=') ? new URLSearchParams(url.hash.slice(1)).get('reset') : null;
	const legacyToken = url.searchParams.get('reset');
	resetToken = fragmentToken ?? legacyToken;
	if (resetToken) {
		telegramLoginRequest++;
		if (url.searchParams.has('reset')) {
			url.searchParams.delete('reset');
			url.hash = new URLSearchParams({ reset: resetToken }).toString();
			history.replaceState(null, '', url);
		}
		sessionStorage.removeItem(DEMO_PREVIEW_KEY);
		if (apiConfigured) setNotice('');
		showAuth();
		setAuthMode('reset');
		return;
	}
	if (isDemoPreview()) {
		showDemo();
		return;
	}
	if (inTelegram) {
		localStorage.removeItem('wind_access_token');
		showAuth();
		await tgLogin();
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
	showAuth();
};

authForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	if (authForm.hasAttribute('aria-busy')) return;
	telegramLoginRequest++;
	authError.textContent = '';
	const submitButton = authForm.querySelector('.auth-submit');
	const submitLabel = authSubmitLabel;
	const modeActions = [...authModeButtons, authBack, forgotButton, resetAgain, demoLoginButton];
	modeActions.forEach(button => { button.disabled = true; });
	authForm.setAttribute('aria-busy', 'true');
	submitButton.disabled = true;
	submitButton.classList.add('is-loading');
	submitLabel.textContent = AUTH_MODES[authMode].busy;
	const finish = () => {
		authForm.removeAttribute('aria-busy');
		modeActions.forEach(button => { button.disabled = false; });
		submitButton.disabled = false;
		submitButton.classList.remove('is-loading');
		submitLabel.textContent = AUTH_MODES[authMode].submit;
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
		} catch (error) {
			setNotice('');
			authError.textContent = error instanceof TypeError ? 'Сервер восстановления недоступен. Попробуй позже.' : error.message;
		}
		finish();
		return;
	}
	if (authMode === 'reset') {
		resetAgain.hidden = true;
		try {
			const body = { token: resetToken, password: passwordField.value };
			if (needTotp) body.totp_code = totpField.value.trim();
			const result = await withWakeHint(api('/auth/password/reset', { method: 'POST', body, timeoutMs: 70000 }), submitLabel);
			localStorage.setItem('wind_access_token', result.access_token);
			clearPasswordReset();
			updateProfile(result.user);
			authGate.hidden = true;
			authForm.reset();
			setNotice('');
			showSuccess('Пароль изменён, ты в аккаунте');
		} catch (error) {
			setNotice('');
			if (error.message === '2fa_required') {
				needTotp = true;
				totpField.closest('label').hidden = false;
				totpField.focus();
				authError.textContent = 'Введи код из приложения-аутентификатора';
			} else {
				authError.textContent = error instanceof TypeError ? 'Сервер восстановления недоступен. Попробуй позже.' : error.message;
				resetAgain.hidden = error.status !== 400;
			}
		}
		finish();
		return;
	}
	const body = { email: emailField.value, password: passwordField.value };
	if (authMode === 'register') {
		if (!consentBox.checked) {
			authError.textContent = 'Нужно принять условия и политику конфиденциальности';
			finish();
			consentBox.focus();
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
	} catch (error) {
		if (error.message === '2fa_required') {
			needTotp = true;
			totpField.closest('label').hidden = false;
			totpField.focus();
			authError.textContent = 'Введи код из приложения-аутентификатора';
			return;
		}
		setNotice('');
		authError.textContent = error instanceof TypeError ? 'Сервер недоступен. Проверь соединение и попробуй ещё раз.' : error.message;
	} finally {
		finish();
	}
});

document.querySelector('.logout')?.addEventListener('click', (event) => {
	event.preventDefault();
	sessionStorage.removeItem(DEMO_PREVIEW_KEY);
	localStorage.removeItem('wind_access_token');
	document.body.classList.remove('demo-preview');
	document.getElementById('wallet-demo').hidden = true;
	document.getElementById('demo-goal-shortcut').hidden = true;
	window.dispatchEvent(new Event('wind-logout'));
	showAuth();
});

if (inTelegram) {
	tg.ready?.();
	tg.expand?.();
}
checkSession();

const formatCryptoPrice = (price) => {
	const digits = price >= 1000 ? 0 : price >= 1 ? 2 : 4;
	return Number(price).toLocaleString('ru-RU', { maximumFractionDigits: digits });
};

function cryptoChartPalette() {
	const dark = document.body.classList.contains('dark-theme');
	const grid = { color: dark ? '#3c3a2f' : '#f1e5d4' };
	const borderColor = dark ? '#574831' : '#e9d6bb';
	return {
		layout: { background: { color: dark ? '#22241e' : '#fffaf3' }, textColor: dark ? '#ead1ad' : '#715539' },
		grid: { vertLines: grid, horzLines: grid },
		rightPriceScale: { borderColor },
		timeScale: { borderColor, timeVisible: true, secondsVisible: false },
	};
}

const createCryptoChart = () => {
	if (!cryptoChartElement || !window.LightweightCharts) {
		return;
	}

	cryptoChart = LightweightCharts.createChart(cryptoChartElement, {
		width: cryptoChartElement.clientWidth,
		height: cryptoChartElement.clientHeight,
		...cryptoChartPalette(),
		crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
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

	const symbol = selectedCryptoPair();
	const interval = activeInterval;
	closeBybitStream();
	const request = streamVersion;
	cryptoPriceLabel.textContent = 'Загрузка свечей...';
	try {
		const response = await fetch(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${interval}&limit=100`, { signal: AbortSignal.timeout(12000) });
		const payload = await response.json();
		if (request !== streamVersion) return;
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
		cryptoChartElement.style.visibility = '';
		cryptoPriceLabel.textContent = `${formatCryptoPrice(candles[candles.length - 1].close)} USDT`;
		cryptoUpdated.textContent = `Котировки Bybit · ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
		cryptoChart.timeScale().fitContent();
		revealPlot(cryptoChartElement, 640);
		connectBybitStream(symbol, interval);
	} catch (error) {
		if (request !== streamVersion) return;
		cryptoPriceLabel.textContent = 'Не удалось загрузить данные';
		showChartUnavailable();
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
		cryptoUpdated.textContent = `LIVE · котировки Bybit · ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
	});
	bybitSocket.addEventListener('close', () => {
		if (currentVersion === streamVersion) window.setTimeout(() => {
			if (currentVersion === streamVersion) connectBybitStream(symbol, interval);
		}, 3000);
	});
};

const showChartUnavailable = () => {
	cryptoChartElement.hidden = true;
	cryptoUpdated.textContent = 'Свечи Bybit сейчас недоступны.';
	cryptoRetry.hidden = false;
};

if (cryptoChartElement && cryptoPair) {
	const showCrypto = async () => {
		cryptoRetry.hidden = true;
		cryptoChartElement.hidden = false;
		cryptoChartElement.style.visibility = 'hidden';
		cryptoSymbolLabel.textContent = `${selectedCryptoPair().slice(0, -4)} / USDT`;
		cryptoPriceLabel.textContent = 'Загрузка свечей…';
		cryptoUpdated.textContent = 'Загружаем свечи Bybit…';
		try {
			if (!cryptoChart) await loadVendor('LightweightCharts');
			if (document.body.dataset.view !== 'crypto' || !document.getElementById('auth-gate').hidden) return;
			if (!cryptoChart) {
				createCryptoChart();
				initChartTooltip();
			}
			loadCryptoCandles();
		} catch {
			cryptoPriceLabel.textContent = 'Не удалось загрузить график';
			showChartUnavailable();
		}
	};
	onAppView(['crypto'], (active) => {
		if (active) showCrypto();
		else closeBybitStream();
	});
	cryptoRetry.addEventListener('click', showCrypto);
	cryptoPair.addEventListener('change', showCrypto);
	timeframeButtons.forEach((button) => {
		button.addEventListener('click', () => {
			activeInterval = button.dataset.interval;
			timeframeButtons.forEach((item) => {
				item.classList.toggle('active', item === button);
				item.setAttribute('aria-pressed', String(item === button));
			});
			showCrypto();
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
		get: () => activeWalletOwner === '0' ? demoBalanceKop() / 100 : balance,
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

	window.addEventListener('wind-auth', (e) => {
		if (e.detail.id !== 0) apply({ balance: e.detail.balance });
	});
})();

if (inTelegram) {
	const panel = document.getElementById('stars-topup');
	const options = document.getElementById('stars-topup-options');
	const status = document.getElementById('stars-topup-status');
	panel.hidden = false;
	let busy = false;

	const payTopup = async (offer) => {
		if (busy || isDemoPreview()) return;
		busy = true;
		options.querySelectorAll('button').forEach((button) => { button.disabled = true; });
		status.textContent = 'Открываем счёт Telegram…';
		try {
			const result = await checkoutWithStars(offer);
			if (result === 'succeeded') {
				await Wallet.load().catch(() => {});
				closeModal(panel.closest('.modal'));
				showSuccess('Учебный баланс пополнен');
			} else if (result !== 'stale') {
				status.textContent = starsPaymentMessage(result);
			}
		} catch (error) {
			status.textContent = error.message;
		} finally {
			busy = false;
			options.querySelectorAll('button').forEach((button) => { button.disabled = false; });
		}
	};

	document.addEventListener('wind-stars-catalog', () => {
		if (busy) return;
		options.replaceChildren();
		for (const amount of [1000, 5000, 10000]) {
			const offer = `topup_${amount}`;
			const price = starsPrices?.[offer];
			if (!price) continue;
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'button';
			const label = document.createElement('span');
			label.textContent = `${Wallet.format(amount)} на баланс`;
			const priceLabel = document.createElement('strong');
			priceLabel.textContent = formatStars(price);
			button.append(label, priceLabel);
			button.addEventListener('click', () => payTopup(offer));
			options.append(button);
		}
		status.textContent = starsCatalogError || (options.childElementCount ? '' : 'Пополнение через Telegram Stars пока недоступно.');
	});
}



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

	const quoteNodes = new Map(Array.from(document.querySelectorAll('[data-quote]'), node => [node.dataset.quote, node]));
	let nextQuoteRefresh = 0;

	const fetchPrice = async (s) => {
		const node = quoteNodes.get(s);
		try {
			const response = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${s}`, { signal: AbortSignal.timeout(8000) });
			const data = await response.json();
			const price = Number(data.result?.list?.[0]?.lastPrice);
			if (!response.ok || data.retCode !== 0 || !(price > 0)) throw new Error('Цена недоступна');
			prices[s] = price;
			if (node) node.textContent = formatCryptoPrice(price);
			return price;
		} catch (error) {
			if (node) node.textContent = '—';
			throw error;
		}
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
		const symbols = new Set([symbol, ...alerts.map((a) => a.symbol)]);
		if (authGate.hidden && document.body.dataset.view === 'crypto' && Date.now() >= nextQuoteRefresh) {
			for (const pair of quoteNodes.keys()) symbols.add(pair);
			nextQuoteRefresh = Date.now() + 60000;
		}
		await Promise.all(Array.from(symbols, (s) => fetchPrice(s).catch(() => {})));
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
		const sync = () => setSymbol(selectedCryptoPair());
		cryptoPair.addEventListener('change', sync);
	}

	buildQuick();
	updateQuick();
	render();
	onAppView(['crypto'], (active) => {
		if (active) {
			nextQuoteRefresh = 0;
			check();
		}
	});
	setInterval(() => {
		if (!document.hidden && (alerts.length || document.body.dataset.view === 'crypto')) check();
	}, 10000);
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
	const NEWS_PAGE = 10;
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

	const TAG_KEY = { 'Россия': 'ru', 'США': 'us', 'Крипто': 'crypto', 'Экономика': 'macro' };
	const TAG_GLYPH = { 'Россия': '₽', 'США': '$', 'Крипто': '₿', 'Экономика': '%' };
	const tagKey = (tag) => TAG_KEY[tag] || 'macro';
	const make = (tag, cls, text) => {
		const el = document.createElement(tag);
		if (cls) el.className = cls;
		if (text != null) el.textContent = text;
		return el;
	};
	const asButton = (el, title) => {
		el.tabIndex = 0;
		el.setAttribute('role', 'button');
		el.setAttribute('aria-label', `Читать новость: ${title}`);
	};

	// главная новость — широкая цветная карточка
	const leadCard = (item) => {
		const card = make('article', `news-lead tag-${tagKey(item.tag)}`);
		card.dataset.news = item.id;
		asButton(card, item.title);
		const top = make('div', 'news-lead-top');
		top.append(make('span', 'news-chip', item.tag), make('span', 'news-lead-label', 'Главное сейчас'), make('time', 'news-time', ago(item.published)));
		const foot = make('div', 'news-lead-foot');
		foot.append(make('span', 'news-source', item.source || 'Источник'), make('span', 'news-read', 'Читать →'));
		card.append(make('span', 'news-lead-glyph', TAG_GLYPH[item.tag] || '%'), top, make('h3', '', item.title));
		if (item.summary) card.append(make('p', '', item.summary));
		card.append(foot);
		return card;
	};

	// остальные — строки одного списка
	const newsRow = (item) => {
		const row = make('article', `news-row tag-${tagKey(item.tag)}`);
		row.dataset.news = item.id;
		asButton(row, item.title);
		const body = make('div', 'news-row-body');
		const meta = make('div', 'news-row-meta');
		meta.append(make('span', 'news-chip', item.tag), make('span', '', item.source || ''), make('time', 'news-time', ago(item.published)));
		body.append(make('h4', '', item.title), meta);
		const arrow = make('span', 'news-row-arrow');
		arrow.innerHTML = '<i data-lucide="arrow-up-right"></i>';
		row.append(body, arrow);
		return row;
	};

	const paintFilterCounts = () => {
		document.querySelectorAll('[data-news-filter]').forEach((button) => {
			const f = button.dataset.newsFilter;
			const count = f === 'all' ? newsItems.length : newsItems.filter((n) => n.tag === f).length;
			button.dataset.count = count ? String(count) : '';
			button.disabled = f !== 'all' && !count;
		});
	};

	const renderNewsList = () => {
		const grid = $('learn-news');
		if (!grid || !newsItems.length) return;
		grid.classList.add('news-feed');
		const filtered = newsFilter === 'all' ? newsItems : newsItems.filter((n) => n.tag === newsFilter);
		grid.textContent = '';
		if (!filtered.length) {
			grid.append(make('p', 'news-empty', 'По этой теме свежих новостей пока нет.'));
			return;
		}
		grid.append(leadCard(filtered[0]));
		const rest = filtered.slice(1, newsShown);
		if (rest.length) {
			const list = make('div', 'news-rows');
			rest.forEach((item) => list.append(newsRow(item)));
			grid.append(list);
		}
		if (filtered.length > newsShown) {
			const more = make('button', 'news-more', `Показать ещё ${Math.min(NEWS_PAGE, filtered.length - newsShown)} из ${filtered.length - newsShown}`);
			more.type = 'button';
			more.addEventListener('click', () => { newsShown += NEWS_PAGE; renderNewsList(); });
			grid.append(more);
		}
		paintFilterCounts();
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
			paragraphs: item.summary ? [item.summary, 'Это короткая выжимка. Полный материал и контекст — в первоисточнике.'] : ['Полный текст новости — в первоисточнике по ссылке ниже.'],
			url: item.url,
		}]));
		renderNewsList();
		paintBadge();
	};

	const paintScan = () => {
		const scan = $('agent-last-scan');
		if (scan && newsUpdatedAt) scan.textContent = `Обновлено ${ago(newsUpdatedAt)}`;
	};

	let newsLoading = false;
	const loadRemoteNews = async () => {
		if (newsLoading) return;
		newsLoading = true;
		$('news').setAttribute('aria-busy', 'true');
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
			if (!newsUpdatedAt) $('agent-last-scan').textContent = 'Нет свежих данных';
			if (speech && !newsItems.length) speech.textContent = 'Новости сейчас недоступны — попробую обновить чуть позже.';
			console.warn('Новости не обновились:', error.message);
		} finally {
			newsLoading = false;
			$('news').setAttribute('aria-busy', 'false');
		}
	};
	// обновляем ленту, если она устарела: по таймеру, при открытии агента и при возврате на вкладку
	const refreshIfStale = (maxAge = 5 * 60 * 1000) => { if (Date.now() - newsLoadedAt > maxAge) loadRemoteNews(); };
	new MutationObserver(() => {
		if (document.body.classList.contains('agent-open')) { refreshIfStale(); markSeen(); }
		paintBadge();
	}).observe(document.body, { attributes: true, attributeFilter: ['class'] });
	document.addEventListener('visibilitychange', () => {
		if (!document.hidden && document.body.classList.contains('agent-open')) refreshIfStale();
	});
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
	window.setInterval(() => { if (!document.hidden && document.body.classList.contains('agent-open')) loadRemoteNews(); }, NEWS_REFRESH_MS);
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
		'.wallet-bar', '.stats-card', '.invest-overview', '.bybit-partner-card', '#converter .converter', '.section-heading',
		'.crypto-terminal', '.alerts-card', '.crypto-news-feature', '.crypto-news-item', '.edu-progress', '.edu-card',
		'.profile-hero', '.portfolio-card', '.portfolio-item', '.ledger-row',
		'.settings-card', '.setting-item', '.insight-item', '.cg-card',
	].join(',');

	// какие числа «набегают»
	const NUMS = '.wallet-balance strong, .portfolio-summary strong, .settings-summary strong, .portfolio-side span, .portfolio-side em, .ledger-row b';

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

	let method = 'card', rub = 5000, busy = false, payTimeout = 0, sbpTimer = 0, sbpSeq = 0, sbpDemo = true;
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
	const drawSbpQr = async (text, request) => {
		const box = $('pay-sbp-qr');
		box.textContent = 'Загружаем QR…';
		try { await loadVendor('QRCode'); }
		catch {
			if (request === sbpSeq) box.textContent = 'Открой ссылку для оплаты через СБП';
			return;
		}
		if (request !== sbpSeq || modal.hidden) return;
		box.textContent = '';
		new QRCode(box, { text, width: 180, height: 180, colorDark: '#17201d', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
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
		drawSbpQr(inv.url, id);
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
		if (inTelegram || isDemoPreview()) return;
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
	$('plus-show-analysis').addEventListener('click', () => {
		closeModal(modal);
		history.replaceState(null, '', '#crypto');
		setAppView('crypto');
		const analysis = $('analysis-card');
		analysis.tabIndex = -1;
		analysis.focus({ preventScroll: true });
		analysis.scrollIntoView({ block: 'start', behavior: windMotion.matches ? 'smooth' : 'instant' });
	});
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
	window.addEventListener('wind-logout', () => { state = null; trialAvailable = false; applyPlan(); });
	let plan = 'month';
	let checkoutBusy = false;
	const isPlus = () => !!state && state.until > Date.now();

	const m = { sub: $('plus-subscribe'), status: $('plus-status'), plans: modal.querySelectorAll('[data-plan]') };
	const renderModal = () => {
		const on = isPlus();
		if (inTelegram && !starsPrices?.[plan]) plan = starsPrices?.month ? 'month' : 'year';
		m.plans.forEach((button) => {
			const key = button.dataset.plan;
			const price = starsPrices?.[key];
			const selected = key === plan && (!inTelegram || Boolean(price));
			button.classList.toggle('active', selected);
			button.setAttribute('aria-pressed', String(selected));
			button.disabled = checkoutBusy || (inTelegram && !price);
			if (inTelegram) {
				button.querySelector('strong').textContent = price ? formatStars(price) : '—';
				button.querySelector('small').textContent = `на ${PLANS[key].days} дней`;
			}
		});
		const price = inTelegram ? starsPrices?.[plan] : PLANS[plan].cost;
		const amount = price ? (inTelegram ? formatStars(price) : Wallet.format(price)) : '';
		m.sub.disabled = checkoutBusy || !price;
		m.sub.textContent = amount ? `${on ? 'Продлить за' : 'Оформить за'} ${amount}` : 'Оформить Wind Plus';
		if (checkoutBusy) return;
		const paymentCopy = !inTelegram ? 'Оплата через ЮKassa · без автосписаний'
			: starsCatalogError || (price ? 'Разовая оплата в Telegram Stars'
				: starsPrices ? 'Оплата Wind Plus пока недоступна.' : 'Загружаем тарифы Telegram Stars…');
		m.status.textContent = on ? `Активна до ${new Date(state.until).toLocaleDateString('ru-RU')} · ${paymentCopy}` : paymentCopy;
		m.status.classList.remove('warn');
		const trialBtn = $('plus-trial');
		if (trialBtn) trialBtn.hidden = on || !trialAvailable;
	};
	document.addEventListener('wind-stars-catalog', renderModal);
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

	m.plans.forEach(button => button.addEventListener('click', () => {
		plan = button.dataset.plan;
		renderModal();
		windResponse(m.sub);
	}));
	$('plus-trial')?.addEventListener('click', async (event) => {
		if (isDemoPreview()) return;
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
		if (isDemoPreview() || checkoutBusy) return;
		checkoutBusy = true;
		renderModal();
		m.status.textContent = 'Открываем счёт…';
		let feedback = '';
		try {
			if (inTelegram) {
				const result = await checkoutWithStars(plan);
				if (result === 'succeeded') {
					const user = await WindApi('/auth/me').catch(() => null);
					if (user?.plus) {
						setPlus(user.plus);
						applyPlan();
					}
					showSuccess('Оплата Wind Plus подтверждена');
				} else if (result !== 'stale') {
					feedback = starsPaymentMessage(result);
				}
			} else {
				const d = await WindApi('/subscription/payment', { method: 'POST', body: { plan, method: 'card' } });
				window.location.assign(d.confirmation_url);
			}
		} catch (error) {
			feedback = error.message;
		} finally {
			checkoutBusy = false;
			renderModal();
			if (feedback) m.status.textContent = feedback;
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
		const expanded = body.querySelector('.an-details')?.open || false;
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

		const parts = [a.trend > 0 ? 'Тренд восходящий.' : a.trend < 0 ? 'Тренд нисходящий.' : 'Чёткого тренда нет.'];
		if (a.rsiSig < 0) parts.push('RSI находится в зоне перекупленности.');
		if (a.rsiSig > 0) parts.push('RSI находится в зоне перепроданности.');
		parts.push(`До поддержки около ${Math.abs((a.support / a.last - 1) * 100).toFixed(1)}%, до сопротивления около ${((a.resistance / a.last - 1) * 100).toFixed(1)}%.`);
		const summary = mk('p', 'an-summary', parts.join(' '));
		const note = mk('p', 'an-note', 'Оценка описывает текущие показания индикаторов.');
		const overview = mk('div', 'an-overview');
		overview.append(head, track, scale, summary, note);
		const details = mk('details', 'an-details');
		details.open = expanded;
		details.append(mk('summary', '', 'Смотреть 6 индикаторов'), grid);
		body.append(overview, levels, details);
		playWindEffect(overview, [{ opacity: .55, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], 330);
		requestAnimationFrame(() => requestAnimationFrame(() => { marker.style.left = `${a.score}%`; }));
	};

	const loadAnalysis = async () => {
		if (isDemoPreview()) {
			const base = { BTCUSDT: 70000, ETHUSDT: 3000, SOLUSDT: 150 }[an.sym];
			const scale = { '15': 1, '60': 2, '240': 3, D: 4 }[an.tf];
			const phase = Math.log(base);
			const candles = Array.from({length: 160}, (_, i) => {
				const c = base * (1 + .025 * Math.sin(i / (4 + scale) + phase) + .012 * Math.cos(i / 3 + phase));
				return { c, h: c * 1.004, l: c * .996, v: 120 + 35 * Math.sin(i / scale) };
			});
			renderAnalysis(analyze(candles));
			return;
		}
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
			const fresh = isDemoPreview() ? [{ symbol: "WINDUSDT", price: 1.25 }] : listings.filter((x) => Date.now() - x.ts < 7 * 864e5);
			if (!fresh.length) {
				message(body, known ? `Радар следит за ${known.length} парами. Новая пара появится здесь и в уведомлениях, как только её добавит Bybit.` : 'Радар запоминает список пар. Новые листинги появятся здесь при следующих проверках.');
				return;
			}
			fresh.forEach((x, i) => {
				const row = mk('div', 'rd-row');
				row.style.setProperty('--i', i);
				const name = mk('div', 'rd-name');
				name.append(mk('strong', '', `${COIN(x.symbol)}/USDT`), mk('small', '', isDemoPreview() ? "Пример нового листинга" : `Обнаружена ${new Date(x.ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`));
				const badge = mk('span', 'asset-badge badge-new');
				badge.append(icon('sparkles'), document.createTextNode(' Новое'));
				row.append(mk('span', 'rd-ava', COIN(x.symbol).slice(0, 3)), name, mk('div', 'rd-price', x.price ? fmtPrice(x.price) : '—'), badge);
				list.appendChild(row);
			});
			body.appendChild(list);
			icons();
			return;
		}
		const pairs = isDemoPreview() ? [
			{symbol: 'ETHUSDT', price: 3000, pct: 3.2, turnover: 38000000},
			{symbol: 'BTCUSDT', price: 70000, pct: 1.1, turnover: 68000000},
			{symbol: 'SOLUSDT', price: 150, pct: -1.4, turnover: 12000000},
			{symbol: 'ADAUSDT', price: .42, pct: -2.5, turnover: 3000000},
		].filter(t => rd.tab === 'up' ? t.pct > 0 : t.pct < 0) : rd.liquid;
		if (!pairs.length) { skeleton(body, 5); return; }
		pairs.slice().sort((a, b) => (rd.tab === 'up' ? b.pct - a.pct : a.pct - b.pct)).slice(0, 6).forEach((t, i) => {
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
	const renderNew = () => {
		const list = $('ni-list');
		const demo = isDemoPreview();
		const key = demo ? 'wind_demo_followed' : 'wind_followed';
		const saved = readJSON(key, []);
		const followed = Array.isArray(saved) ? saved : [];
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
			btn.disabled = !demo && !isPlus();
			btn.setAttribute('aria-pressed', String(on));
			btn.addEventListener('click', () => {
				if (!isDemoPreview() && !isPlus()) return;
				const next = on ? followed.filter((x) => x !== it.id) : followed.concat(it.id);
				writeJSON(key, next);
				if (!demo && !on) notify('neutral', `Следим: ${it.name}`, 'Сообщим о новых выпусках и размещениях');
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

	window.addEventListener('wind-auth', () => {
		renderNew();
		if (isDemoPreview()) { loadAnalysis(); renderRadar(); }
	});
	window.addEventListener('wind-logout', renderNew);
	document.addEventListener('wind-plus-change', () => {
		if (isDemoPreview()) {
			an.seq++; rd.seq++;
			loadAnalysis(); renderRadar();
		} else if (isPlus()) {
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
		if (o.stars >= 2) { confetti(root); window.WindGames?.sfx.win(); }
		window.WindGames?.report(id, Object.assign({ stars: o.stars }, o.data || {}));
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
				const col = c.c >= c.o ? '#89e0bf' : '#ff9c87';
				ctx.globalAlpha = al;
				ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
				const open = y(c.o);
				const ease = 1 - (1 - al) ** 3;
				const close = open + (y(c.c) - open) * ease;
				ctx.beginPath();
				ctx.moveTo(x, open + (y(c.h) - open) * ease);
				ctx.lineTo(x, open + (y(c.l) - open) * ease);
				ctx.stroke();
				ctx.fillRect(x - cw * 0.28, Math.min(open, close), cw * 0.56, Math.max(2, Math.abs(open - close)));
			});
			ctx.globalAlpha = 1;
			if (a.mark) {
				const x0 = (a.hi + 1) * cw - cw * 0.6, x1 = a.cs.length * cw + cw * 0.6;
				const pts = a.cs.slice(a.hi);
				const yT = y(Math.max(...pts.map((c) => c.h))) - 8, yB = y(Math.min(...pts.map((c) => c.l))) + 8;
				ctx.save();
				ctx.shadowColor = '#f4c95d'; ctx.shadowBlur = 14;
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

			const a = { cs: c.cs, hi: c.hi, pat: c.pat, reveal: reduce ? c.cs.length : 0, mark: false, dpr: fit(cv) };
			new ResizeObserver(() => { a.dpr = fit(cv); drawChart(cv, a); }).observe(cv);
			const started = performance.now();
			const loop = (now) => {
				a.reveal = Math.min(a.cs.length, (now - started) / 90);
				drawChart(cv, a);
				if (a.reveal < a.cs.length) raf = requestAnimationFrame(loop);
			};
			if (!reduce) raf = requestAnimationFrame(loop);

			const names = shuffle([c.pat.name].concat(shuffle(PATTERNS.filter((p) => p !== c.pat)).slice(0, 2).map((p) => p.name)));
			names.forEach((n) => {
				const b = btn('gm-option', n, () => {
					const ok = n === c.pat.name;
					if (ok) score++;
					if (ok) window.WindGames?.sfx.ok(); else window.WindGames?.sfx.wrong();
					opts.querySelectorAll('button').forEach((x) => {
						x.disabled = true;
						if (x.textContent === c.pat.name) x.classList.add('correct');
						else if (x === b) x.classList.add('wrong');
					});
					a.mark = true;
					a.reveal = a.cs.length;
				stop();
				drawChart(cv, a);
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
				data: { score },
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
			line(2, '#91e5c3', 'ЦЕЛЬ'); line(-1, '#ffa68b', 'СТОП'); line(0, '#c3dadb', 'ВХОД');
			if (!a.pts) return;
			const n = a.pts.length - 1, upto = a.p * n;
			const X = (k) => 8 + (k / n) * (w - 16);
			const color = a.p >= 1 ? (a.win ? '#91e5c3' : '#ffa68b') : '#ffda86';
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
			ctx.lineTo(hx, h);
			ctx.lineTo(X(0), h);
			ctx.closePath();
			const fill = ctx.createLinearGradient(0, 0, 0, h);
			fill.addColorStop(0, `${color}4d`);
			fill.addColorStop(1, `${color}00`);
			ctx.fillStyle = fill;
			ctx.fill();
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
				if (win) window.WindGames?.sfx.ok(); else window.WindGames?.sfx.wrong();
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
				data: { dd: st.dd, ruined: st.ruined, cap: st.cap },
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
				if (ok) { st.ok++; st.streak++; st.best = Math.max(st.best, st.streak); window.WindGames?.sfx.ok(); }
				else { st.lives--; st.streak = 0; livesEl.classList.add('hit'); window.WindGames?.sfx.wrong(); }
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
				data: { ok: st.ok },
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
	window.addEventListener('wind-game-stars', () => {
		try { const v = JSON.parse(localStorage.getItem(SKEY) || '{}'); if (v && typeof v === 'object') stars = v; } catch (e) { /* хранилище недоступно */ }
		paintStars();
		window.WindGames?.render();
	});

	const selectTab = (tab) => {
		const id = tab.dataset.gameTab;
		tabs.forEach((item) => {
			const active = item === tab;
			item.classList.toggle('active', active);
			item.setAttribute('aria-selected', String(active));
			item.tabIndex = active ? 0 : -1;
		});
		document.querySelectorAll('[data-game-panel]').forEach((panel) => { panel.hidden = panel.dataset.gamePanel !== id; });
		const strip = tab.parentElement;
		strip.dataset.active = id;
		const bounds = strip.getBoundingClientRect();
		const card = tab.getBoundingClientRect();
		if (card.right > bounds.right) strip.scrollLeft += card.right - bounds.right;
		if (card.left < bounds.left) strip.scrollLeft += card.left - bounds.left;
	};
	tabs.forEach((tab, index) => {
		const id = tab.dataset.gameTab;
		const panel = document.querySelector(`[data-game-panel="${id}"]`);
		tab.id = `game-tab-${id}`;
		panel.id = `game-panel-${id}`;
		tab.setAttribute('aria-controls', panel.id);
		panel.setAttribute('role', 'tabpanel');
		panel.setAttribute('aria-labelledby', tab.id);
		tab.addEventListener('click', () => selectTab(tab));
		tab.addEventListener('keydown', event => {
			const positions = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 };
			const next = tabs[positions[event.key]];
			if (!next) return;
			event.preventDefault();
			next.focus();
			selectTab(next);
		});
	});
	selectTab(document.querySelector('[data-game-tab].active'));
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
				'5. Криптораздел. Демо показывает покупку на условных средствах. При подключённом брокерском API пользователь может подтвердить спотовую заявку со своего счёта Bybit. Исполнение, торговая комиссия и учёт криптовалюты происходят на стороне Bybit. Для покупки за рубли открываются предложения Bybit P2P.',
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
				'2. Данные. Сервис может обрабатывать email, имя пользователя, идентификатор аккаунта, хеш пароля, Telegram ID при соответствующем входе, сведения о подписке, технические данные запроса, сообщения поддержки и журналы виртуальных операций. При подключении Bybit сервер Wind хранит UID, зашифрованные торговые ключи и сведения о заявках. Отключение аккаунта удаляет сохранённые ключи.',
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
			const c = document.querySelector('#topup-modal .modal-copy.web-payment');
			if (c) c.textContent = 'Это пополнение учебного баланса. Оплата проходит на стороне ЮKassa.';
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
				const QR = await loadVendor('QRCode').catch(() => null);
				if (QR && !tf.modal.hidden && !tf.setup.hidden) {
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
		onAppView(['game'], (active) => { if (active) refresh(); });
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
	const loadRates = async () => {
		try {
			const { rates, date } = apiConfigured ? await WindApi('/market/rates') : (await loadMarketPreview()).quotes;
			const validQuotes = Object.entries(rates).filter(([code, quote]) =>
				code !== 'RUB' && Object.hasOwn(CURRENCY_RATES, code) &&
				Number.isFinite(quote?.value) && quote.value > 0 &&
				Number.isFinite(quote.prev) && quote.prev > 0
			);
			for (const [code, { value, prev, date: published }] of validQuotes) {
				const rateDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(published || date || '');
				const source = rateDate ? `ЦБ РФ · ${rateDate[3]}.${rateDate[2]}.${rateDate[1]}` : 'ЦБ РФ';
				CURRENCY_RATES[code] = value;
				publishedCurrencies.add(code);
				if (Object.hasOwn(marketPairs, code)) Object.assign(marketPairs[code], { value, prev, source });
			}
			renderMarketPair();
			updateBalanceUI();
			updateConverter();
		} catch {
			// Сохраняем предыдущие данные и дату их публикации.
		}
	};

	const loadStocks = async () => {
		if (!apiConfigured) return;
		try {
			const d = await WindApi('/market/stocks');
			const map = { IMOEX: d.IMOEX, SBER: d.SBER, ETFRU: d.TMOS, BONDS: d.SBGB };
			const volumes = Object.values(map).map((x) => Number(x && x.volume) || 0);
			const maxVolume = Math.max(...volumes, 1);
			const money = (v) => (v >= 1e9 ? `${fmt2(v / 1e9)} млрд ₽` : v >= 1e6 ? `${Math.round(v / 1e6).toLocaleString('ru-RU')} млн ₽` : `${Math.round(v).toLocaleString('ru-RU')} ₽`);
			document.querySelectorAll('.invest-card').forEach((card) => {
				const x = map[card.dataset.assetCode];
				if (!x || x.price == null) return; // вне торгов биржа может не отдавать значения
				card.querySelector('.asset-gain').textContent = 'Данные Мосбиржи';
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

	window.addEventListener('wind-auth', loadRates);
	onAppView(['investments'], (active) => { if (active) loadStocks(); });
	setInterval(() => {
		if (!document.hidden && document.getElementById('auth-gate').hidden) loadRates();
	}, 5 * 60 * 1000);
	setInterval(() => {
		if (!document.hidden && document.body.dataset.view === 'investments' && document.getElementById('auth-gate').hidden) loadStocks();
	}, 60 * 1000);
})();

const paintIcons = () => loadVendor('lucide').then((icons) => icons.createIcons()).catch(() => {});
if (window.requestIdleCallback) window.requestIdleCallback(paintIcons, { timeout: 800 });
else window.setTimeout(paintIcons, 200);

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
	const goalSession = () => isDemoPreview() ? 'demo' : localStorage.getItem('wind_access_token');
	const empty = (text) => grid.replaceChildren(mk('div', 'goals-empty', text));
	const description = document.getElementById('goals-description');

	const demoGoalData = () => ({ goals: demoGoals.map((goal) => {
		const remaining = Math.max(0, goal.targetKop - goal.savedKop);
		const months = goal.deadline
			? Math.max(1, Math.round((Date.parse(goal.deadline) - Date.now()) / (30.44 * dayMs))) : null;
		return {
			id: goal.id, title: goal.title, deadline: goal.deadline,
			target: goal.targetKop / 100, saved: goal.savedKop / 100,
			progress: Math.min(100, goal.savedKop / goal.targetKop * 100),
			monthly_needed: months ? remaining / 100 / months : null,
			done: remaining === 0,
		};
	}) });

	const saveDemoGoals = (goals) => {
		demoGoals = goals;
		try { sessionStorage.setItem(DEMO_GOALS_KEY, JSON.stringify(goals)); }
		catch { /* При недоступном хранилище копилки живут до перезагрузки. */ }
		USER_WALLETS.RUB = demoBalanceKop() / 100;
		updateBalanceUI();
		return demoGoalData();
	};

	const changeDemoGoal = (id, action, amount) => {
		const goal = demoGoals.find((item) => item.id === id);
		if (!goal) throw new Error('Копилка не найдена');
		if (action === 'close') return saveDemoGoals(demoGoals.filter((item) => item.id !== id));
		const kop = Math.round(amount * 100);
		if (!Number.isSafeInteger(kop) || kop <= 0) throw new Error('Введи сумму больше нуля');
		if (action === 'deposit' && kop > demoBalanceKop()) throw new Error('Недостаточно учебных средств');
		if (action === 'withdraw' && kop > goal.savedKop) throw new Error('В копилке нет такой суммы');
		return saveDemoGoals(demoGoals.map((item) => item.id === id
			? { ...item, savedKop: item.savedKop + (action === 'deposit' ? kop : -kop) } : item));
	};

	const afterMoney = (data, demo) => {
		if (!demo) window.Wallet?.load().catch(() => {});
		render(data);
	};

	const moneyRow = (goal) => {
		const row = mk('form', 'goal-move');
		row.hidden = true;
		const input = mk('input');
		input.type = 'number'; input.min = '1'; input.max = '100000000'; input.step = '1';
		input.inputMode = 'numeric'; input.placeholder = 'Сумма, ₽'; input.required = true;
		input.setAttribute('aria-label', 'Сумма, ₽');
		const ok = mk('button', 'button', 'Подтвердить');
		ok.type = 'submit';
		row.append(input, ok);
		row.addEventListener('submit', async (event) => {
			event.preventDefault();
			const session = goalSession();
			if (!session) return;
			ok.disabled = true;
			try {
				const demo = session === 'demo', action = row.dataset.action, amount = Number(input.value);
				const data = demo ? changeDemoGoal(goal.id, action, amount)
					: await WindApi(`/goals/${goal.id}/${action}`, { method: 'POST', body: { amount } });
				if (goalSession() !== session) return;
				afterMoney(data, demo);
				showSuccess(action === 'deposit' ? `В копилку «${goal.title}» отложено ${fmt(amount)} ₽` : `Из копилки снято ${fmt(amount)} ₽`);
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
			const session = goalSession();
			if (!session) return;
			if (close.dataset.armed !== '1') {
				close.dataset.armed = '1';
				close.textContent = 'Закрыть?';
				window.setTimeout(() => { close.dataset.armed = ''; close.textContent = '×'; }, 3000);
				return;
			}
			close.disabled = true;
			try {
				const demo = session === 'demo';
				const data = demo ? changeDemoGoal(goal.id, 'close')
					: await WindApi(`/goals/${goal.id}`, { method: 'DELETE' });
				if (goalSession() !== session) return;
				afterMoney(data, demo);
				showSuccess('Копилка закрыта, деньги вернулись на баланс');
			} catch (e) {
				close.disabled = false;
				showSuccess(e.message, 'error');
			}
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

	const showGoalForm = (show) => {
		form.hidden = !show;
		toggle.setAttribute('aria-expanded', String(show));
	};
	const load = async () => {
		const session = goalSession(), demo = session === 'demo';
		toggle.hidden = !session;
		description.textContent = demo ? 'Попробуй отложить виртуальные рубли на свою цель' : 'План накоплений к выбранной дате';
		const deadline = form.querySelector('#goal-deadline');
		deadline.min = new Date().toLocaleDateString('sv-SE');
		if (demo) {
			render(demoGoalData());
			return;
		}
		if (toggle.hidden) {
			showGoalForm(false);
			empty('Копилки доступны после входа в аккаунт.');
			return;
		}
		try {
			const data = await WindApi('/goals');
			if (goalSession() === session) render(data);
		} catch {
			if (goalSession() === session) empty('Не удалось загрузить копилки.');
		}
	};

	toggle?.addEventListener('click', () => {
		if (!goalSession()) return;
		showGoalForm(form.hidden);
		if (!form.hidden) form.querySelector('#goal-title').focus();
	});
	document.getElementById('demo-goal-shortcut').addEventListener('click', () => {
		if (!isDemoPreview()) return;
		showGoalForm(true);
		form.querySelector('#goal-title').focus();
	});
	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		const session = goalSession();
		if (!session) return;
		const submit = event.submitter || form.querySelector('button[type="submit"]');
		submit.disabled = true;
		try {
			const date = form.querySelector('#goal-deadline').value;
			const values = {
				title: form.querySelector('#goal-title').value.trim(),
				target: Number(form.querySelector('#goal-target').value),
				deadline: date ? `${date}T23:59:00` : null,
			};
			if (!values.title) throw new Error('Введи название копилки');
			let data;
			if (session === 'demo') {
				if (demoGoals.length >= 10) throw new Error('Можно вести до 10 копилок одновременно');
				if (values.deadline && Date.parse(values.deadline) <= Date.now()) throw new Error('Срок должен быть в будущем');
				data = saveDemoGoals([...demoGoals, {
					id: crypto.randomUUID(), title: values.title, deadline: values.deadline,
					targetKop: Math.round(values.target * 100), savedKop: 0,
				}]);
			} else {
				data = await WindApi('/goals', { method: 'POST', body: values });
			}
			if (goalSession() !== session) return;
			form.reset();
			showGoalForm(false);
			toggle.focus();
			render(data);
			showSuccess('Копилка создана');
		} catch (e) {
			showSuccess(e.message, 'error');
		} finally {
			submit.disabled = false;
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
	const chartSubtitle = document.getElementById('portfolio-chart-sub');
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

	const demoHistory = [
		[349, 10000, 10000], [276, 11200, 11000], [190, 12350, 12000], [115, 15000, 15000],
		[87, 15600, 15000], [73, 14800, 15000], [52, 17400, 16500], [34, 17150, 16500],
		[28, 18000, 17000], [22, 17400, 17000], [17, 18300, 17500], [10, 18600, 17500],
		[5, 18450, 17500], [0, 19600, 18000],
	];
	let days = 90, historyRevision = 0;
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
		const start = Date.parse(points[0].day);
		const daySpan = Date.parse(points.at(-1).day) - start;
		const x = (i) => P + (daySpan ? (Date.parse(points[i].day) - start) / daySpan : i / (points.length - 1)) * (W - P * 2);
		const y = (v) => max === min ? H / 2 : H - P - ((v - min) / span) * (H - P * 2);
		const line = (key) => points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(' ');
		const last = points[points.length - 1];
		const up = last.invested >= last.cost;
		const lastX = x(points.length - 1).toFixed(1);
		const lastY = y(last.invested).toFixed(1);
		const area = `${line('invested')} L${lastX} ${H - P} L${x(0).toFixed(1)} ${H - P} Z`;
		chart.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Стоимость портфеля по дням">
			<defs><linearGradient id="pf-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".22"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
			<path class="plot-grid" d="M0 8H640 M0 49H640 M0 90H640 M0 131H640 M0 172H640"/>
			<path d="${area}" class="pf-area" fill="url(#pf-fill)" stroke="none"/>
			<path d="${line('cost')}" class="pf-cost" fill="none"/>
			<path d="${line('invested')}" class="pf-value" fill="none" pathLength="1"/>
			<ellipse class="plot-halo" cx="${lastX}" cy="${lastY}" rx="9" ry="7"/>
			<ellipse class="pf-end" cx="${lastX}" cy="${lastY}" rx="5" ry="4"/>
		</svg>`;
		chart.classList.toggle('down', !up);
		playWindEffect(chart.querySelector('.pf-cost'), [
			{ clipPath: 'inset(0 100% 0 0) view-box', opacity: .35 },
			{ clipPath: 'inset(0 0 0 0) view-box', opacity: 1 },
		], 445);
		drawPlotLine(chart.querySelector('.pf-value'), 820);
		revealPlot(chart.querySelector('.pf-area'), 875);
		chart.querySelectorAll('.pf-end, .plot-halo').forEach(marker => settlePlotPoint(marker, 950));
		const fmt = (v) => `${Number(v).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`;
		const first = new Date(points[0].day).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' });
		const legend = mk('div', 'portfolio-chart-legend');
		legend.append(mk('span', 'pf-legend-value', `Стоимость: ${fmt(last.invested)}`), mk('span', 'pf-legend-cost', `Вложено: ${fmt(last.cost)}`), mk('span', '', `с ${first}`));
		chart.append(legend);
	};

	const loadHistory = async () => {
		if (!chart || !document.body.classList.contains('show-investment-profile')) return;
		const request = ++historyRevision;
		const demo = isDemoPreview();
		chartSubtitle.textContent = demo ? 'Учебный пример · стоимость и вложения' : 'Стоимость инвестиций по дням';
		if (demo) {
			const sampleDate = Date.UTC(2026, 0, 15);
			drawChart(demoHistory.filter(([age]) => age < days).map(([age, invested, cost]) => ({
				day: new Date(sampleDate - age * dayMs).toISOString().slice(0, 10), invested, cost,
			})));
			return;
		}
		if (!authed()) { chart.replaceChildren(); return; }
		const isCurrent = () => historyRevision === request && authed() && document.body.classList.contains('show-investment-profile');
		try {
			const data = await WindApi(`/invest/history?days=${days}`);
			if (isCurrent()) drawChart(data.points);
		} catch {
			if (isCurrent()) chart.replaceChildren(mk('p', 'portfolio-chart-empty', 'Не удалось загрузить историю.'));
		}
	};
	document.querySelectorAll('#portfolio-chart-range [data-days]').forEach((b) => b.addEventListener('click', () => {
		days = Number(b.dataset.days);
		document.querySelectorAll('#portfolio-chart-range [data-days]').forEach((x) => {
			x.classList.toggle('active', x === b);
			x.setAttribute('aria-pressed', String(x === b));
		});
		loadHistory();
	}));

	const boardVisible = () => document.getElementById('auth-gate').hidden && document.body.dataset.view === 'investments';
	window.addEventListener('wind-portfolio-open', loadHistory);
	window.addEventListener('wind-portfolio', () => { if (boardVisible()) { loadBoard(); if (!isDemoPreview()) loadHistory(); } });
	window.addEventListener('wind-logout', () => { historyRevision++; chart?.replaceChildren(); });
	onAppView(['investments'], (active) => { if (active) { loadBoard(); loadHistory(); } });
	setInterval(() => { if (!document.hidden && boardVisible()) loadBoard(); }, 120000);
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
				...(d.partner ? [
					tile('Переходы к регистрации Bybit', num(d.partner.signup_30d), `за 30 дней · за 7: ${num(d.partner.signup_7d)} · код ${d.partner.ref_code}`),
					tile('Bybit: к торговле', num(d.partner.trade_30d), `за 30 дней · пользователей: ${num(d.partner.users_30d)}${d.partner.placements.length ? ' · топ: ' + d.partner.placements[0].placement : ''}`),
				] : []),
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

// ================= АГЕНТ-ГИД: обучение по сайту при первом входе =================
(() => {
	const STEPS = [
		{ title: 'Привет! Я Винд', text: 'Твой помощник в Wind Finance. За минуту покажу, где баланс, инвестиции, крипта и игры. Можно пропустить и вернуться к обучению в настройках.' },
		{ view: 'dashboard', target: '.wallet-bar', title: 'Баланс', text: 'Здесь видны средства, доступные для сделок в симуляторе и накоплений в копилках.' },
		{ view: 'dashboard', target: '.stats-card', title: 'Курсы валют', text: 'Выбери пару и посмотри историю курса за 7 или 30 дней. «Рассчитать сумму» откроет эту пару в конвертере.' },
		{ view: 'dashboard', target: '#goals', title: 'Копилки', text: 'Поставь цель и срок, например «Отпуск к лету», и я посчитаю, сколько откладывать каждый месяц.' },
		{ view: 'investments', target: '.asset-grid', title: 'Инвестиции', text: 'Индекс, акции, фонды и облигации по реальным котировкам Мосбиржи. Покупки идут с виртуального баланса: это тренажёр, учиться можно без риска.' },
		{ view: 'investments', target: '[data-open-investment-profile]', title: 'Твой портфель', text: 'Здесь доходность, история сделок и график стоимости портфеля. А в «Топ недели» видно, кто из игроков в плюсе.' },
		{ view: 'crypto', target: '.crypto-terminal', title: 'Крипто', text: inTelegram
			? 'Выбери пару и таймфрейм, чтобы посмотреть свечи. Учебная покупка доступна с условным балансом.'
			: 'Выбери пару и таймфрейм, чтобы посмотреть свечи. Покупка открывается в Wind, продажа — на Bybit.' },
		{ view: 'crypto', target: '#price-alerts', title: 'Уведомления о цене', text: 'Задай уровень, например «BTC поднимется до 70 000», и я напомню в браузере или в Telegram.' },
		{ view: 'converter', target: '#converter .converter', title: 'Конвертер', text: 'Пересчитай сумму между валютами по актуальному курсу. Стрелки меняют валюты местами.' },
		{ view: 'game', target: '#game-hub', title: 'Игры', text: 'Проходи игры про рынок и зарабатывай звёзды. Заодно научишься читать графики и распознавать мошенников.' },
		{ view: 'dashboard', target: '.agent-pet', title: 'А это я', text: 'Нажми на меня в любой момент: покажу свежие новости по России, США, крипте и экономике. Значок с цифрой значит, что есть непрочитанные.' },
		{ view: 'dashboard', target: '.profile-trigger', title: 'Профиль и настройки', text: 'Тема, основная валюта, двухфакторная защита и твой ID. Там же можно пройти это обучение заново.' },
		{ view: 'dashboard', title: 'Готово!', text: 'Попробуй создать копилку или загляни в «Инвестиции».', last: true },
	];
	const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
	let root = null, spot = null, card = null, idx = 0, user = null, startedThisLoad = false, raf = 0;

	const isDemo = (u) => Boolean(u) && (u.id === 0 || String(u.email || '').toLowerCase() === 'demo@example.com');
	const tourStorage = (u) => isDemo(u) ? sessionStorage : localStorage;
	const doneKey = (u) => `wind_tour_done_${u && u.id != null ? u.id : 'guest'}`;
	const visible = (el) => el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

	const place = () => {
		if (!root) return;
		const st = STEPS[idx];
		const el = st.target ? document.querySelector(st.target) : null;
		const vw = window.innerWidth, vh = window.innerHeight;
		const mobile = vw <= 620;
		if (!visible(el)) {
			spot.classList.add('center');
			spot.style.cssText = `left:${vw / 2}px;top:${vh / 2}px;width:0;height:0;`;
			card.classList.add('centered');
			card.style.left = ''; card.style.top = ''; card.style.bottom = '';
			return;
		}
		spot.classList.remove('center');
		card.classList.remove('centered');
		const r = el.getBoundingClientRect();
		const pad = 8;
		const top = Math.max(4, r.top - pad), left = Math.max(4, r.left - pad);
		const width = Math.min(vw - left - 4, r.width + pad * 2), height = Math.min(vh - top - 4, r.height + pad * 2);
		spot.style.cssText = `left:${left}px;top:${top}px;width:${width}px;height:${height}px;`;
		const cw = card.offsetWidth, ch = card.offsetHeight;
		if (mobile) {
			const below = top + height + ch + 24 < vh - 70;
			card.style.left = '12px';
			card.style.top = below ? `${top + height + 12}px` : '';
			card.style.bottom = below ? '' : `${Math.max(78, vh - top + 12)}px`;
			if (!below && vh - top + 12 + ch > vh - 8) { card.style.bottom = ''; card.style.top = '12px'; }
			return;
		}
		card.style.bottom = '';
		let cx, cy;
		if (r.right + 20 + cw < vw) { cx = r.right + 20; cy = r.top + r.height / 2 - ch / 2; }
		else if (r.left - 20 - cw > 0) { cx = r.left - 20 - cw; cy = r.top + r.height / 2 - ch / 2; }
		else if (r.bottom + 16 + ch < vh) { cx = r.left + r.width / 2 - cw / 2; cy = r.bottom + 16; }
		else { cx = r.left + r.width / 2 - cw / 2; cy = r.top - 16 - ch; }
		card.style.left = `${Math.max(12, Math.min(vw - cw - 12, cx))}px`;
		card.style.top = `${Math.max(12, Math.min(vh - ch - 12, cy))}px`;
	};
	const follow = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };

	const render = () => {
		const st = STEPS[idx];
		card.replaceChildren();
		const head = mk('div', 'wt-head');
		const ava = mk('span', 'wt-ava');
		const ic = document.createElement('i');
		ic.setAttribute('data-lucide', 'brain-circuit');
		ava.appendChild(ic);
		const who = mk('div', 'wt-who');
		who.append(mk('strong', '', 'Винд'), mk('small', '', `Шаг ${idx + 1} из ${STEPS.length}`));
		const close = mk('button', 'wt-close');
		close.type = 'button';
		close.setAttribute('aria-label', 'Закрыть обучение');
		close.textContent = '×';
		close.addEventListener('click', () => end(true));
		head.append(ava, who, close);
		const dots = mk('div', 'wt-dots');
		STEPS.forEach((_, i) => dots.appendChild(mk('i', i === idx ? 'on' : i < idx ? 'past' : '')));
		const actions = mk('div', 'wt-actions');
		if (idx > 0 && !st.last) {
			const back = mk('button', 'wt-back', 'Назад');
			back.type = 'button';
			back.addEventListener('click', () => go(idx - 1));
			actions.appendChild(back);
		} else if (!st.last) {
			const skip = mk('button', 'wt-back', 'Пропустить');
			skip.type = 'button';
			skip.addEventListener('click', () => end(true));
			actions.appendChild(skip);
		}
		const next = mk('button', 'wt-next', st.last ? 'Начать пользоваться' : idx === 0 ? 'Показать' : 'Далее');
		next.type = 'button';
		next.addEventListener('click', () => (st.last ? end(true) : go(idx + 1)));
		actions.appendChild(next);
		card.append(head, mk('h3', 'wt-title', st.title), mk('p', 'wt-text', st.text), dots, actions);
		if (window.lucide) window.lucide.createIcons();
		card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
		window.setTimeout(() => next.focus({ preventScroll: true }), 50);
	};

	const go = (i) => {
		idx = Math.max(0, Math.min(STEPS.length - 1, i));
		const st = STEPS[idx];
		document.body.classList.remove('agent-open');
		if (st.view && document.body.dataset.view !== st.view && typeof setAppView === 'function') {
			window.history.replaceState(null, '', `#${st.view}`);
			setAppView(st.view);
		}
		render();
		const el = st.target ? document.querySelector(st.target) : null;
		if (visible(el)) {
			const r = el.getBoundingClientRect();
			const fixed = getComputedStyle(el).position === 'fixed';
			if (!fixed && (r.top < 70 || r.bottom > window.innerHeight - 90)) {
				el.scrollIntoView({ block: r.height > window.innerHeight * 0.6 ? 'start' : 'center', behavior: 'smooth' });
			}
		}
		place();
		window.setTimeout(place, 380);
	};

	const end = (markDone) => {
		if (!root) return;
		if (markDone && user) {
			try { tourStorage(user).setItem(doneKey(user), '1'); } catch (e) { /* без хранилища покажем снова */ }
		}
		root.remove();
		root = null;
		document.body.classList.remove('tour-on');
		window.removeEventListener('resize', follow);
		window.removeEventListener('scroll', follow, true);
		if (typeof setAppView === 'function') { window.history.replaceState(null, '', '#dashboard'); setAppView('dashboard'); }
	};

	const start = () => {
		if (root) return;
		document.querySelectorAll('.modal').forEach((m) => { m.hidden = true; });
		root = mk('div', 'wind-tour');
		root.setAttribute('role', 'dialog');
		root.setAttribute('aria-modal', 'true');
		root.setAttribute('aria-label', 'Обучение по сайту');
		spot = mk('div', 'wt-spot');
		card = mk('div', 'wt-card');
		root.append(spot, card);
		root.addEventListener('click', (e) => { if (e.target === root) go(idx + 1 < STEPS.length ? idx + 1 : idx); });
		document.body.appendChild(root);
		document.body.classList.add('tour-on');
		window.addEventListener('resize', follow);
		window.addEventListener('scroll', follow, true);
		go(0);
	};

	document.addEventListener('keydown', (e) => {
		if (!root) return;
		if (e.key === 'Escape') end(true);
		else if (e.key === 'ArrowRight') go(idx + 1);
		else if (e.key === 'ArrowLeft') go(idx - 1);
	});

	window.addEventListener('wind-auth', (e) => {
		user = e.detail || null;
		if (startedThisLoad || !user || isDemo(user) || inTelegram) return;
		let done = false;
		try { done = tourStorage(user).getItem(doneKey(user)) === '1'; } catch (err) { done = false; }
		if (!done) {
			startedThisLoad = true;
			window.setTimeout(() => {
				const gate = document.getElementById('auth-gate');
				if (gate && !gate.hidden) { startedThisLoad = false; return; }
				if (welcomeDialog.open) welcomeDialog.addEventListener('close', () => { if (gate.hidden) start(); }, { once: true });
				else start();
			}, 900);
		}
	});
	window.addEventListener('wind-logout', () => { startedThisLoad = false; end(false); });
	document.getElementById('tour-restart')?.addEventListener('click', start);
	window.WindTour = { start, close: () => end(true) };
})();

const welcomeDialog = document.getElementById('wind-welcome');
const welcomeSessionKey = 'wind_welcome_after_login_seen';
let welcomeCloseTimer;
const dismissWelcome = () => {
	if (!welcomeDialog.open || welcomeDialog.hasAttribute('data-closing')) return;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		welcomeDialog.close();
		return;
	}
	welcomeDialog.setAttribute('data-closing', '');
	welcomeCloseTimer = window.setTimeout(() => welcomeDialog.close(), 240);
};
welcomeDialog.querySelectorAll('[data-close-welcome]').forEach((button) => button.addEventListener('click', dismissWelcome));
welcomeDialog.addEventListener('close', () => {
	window.clearTimeout(welcomeCloseTimer);
	welcomeDialog.removeAttribute('data-closing');
});
welcomeDialog.addEventListener('cancel', (event) => {
	event.preventDefault();
	dismissWelcome();
});
window.addEventListener('wind-auth', () => {
	if (!authGate.hidden || welcomeDialog.open || typeof welcomeDialog.showModal !== 'function') return;
	try {
		if (sessionStorage.getItem(welcomeSessionKey)) return;
	} catch { /* Приветствие всё равно можно открыть. */ }
	const mascot = document.querySelector('.agent-pet').getBoundingClientRect();
	welcomeDialog.style.setProperty('--welcome-x', `${mascot.left + mascot.width / 2}px`);
	welcomeDialog.style.setProperty('--welcome-y', `${mascot.top + mascot.height / 2}px`);
	welcomeDialog.showModal();
	try { sessionStorage.setItem(welcomeSessionKey, '1'); } catch { /* Хранилище недоступно. */ }
});
window.addEventListener('wind-logout', () => {
	if (welcomeDialog.open) welcomeDialog.close();
	try { sessionStorage.removeItem(welcomeSessionKey); } catch { /* Хранилище недоступно. */ }
});

if (inTelegram && tg.BackButton && tg.isVersionAtLeast?.('6.1')) {
	const openModal = () => document.querySelector('.modal:not([hidden])');
	const overlayOpen = () => welcomeDialog.open || openModal() || document.body.classList.contains('agent-open')
		|| document.body.classList.contains('tour-on');
	const syncBackButton = () => {
		if (overlayOpen() || (authGate.hidden && document.body.dataset.view !== 'dashboard')) tg.BackButton.show();
		else tg.BackButton.hide();
	};
	tg.BackButton.onClick(() => {
		if (welcomeDialog.open) {
			dismissWelcome();
			return;
		}
		const modal = openModal();
		if (modal) {
			closeModal(modal);
			return;
		}
		if (document.body.classList.contains('tour-on')) {
			window.WindTour.close();
			return;
		}
		if (document.body.classList.contains('agent-open')) {
			setAgentOpen(false);
			return;
		}
		const view = document.body.classList.contains('show-investment-profile') ? 'investments' : 'dashboard';
		window.history.replaceState(null, '', `#${view}`);
		setAppView(view);
	});
	const backObserver = new MutationObserver(syncBackButton);
	backObserver.observe(document.body, { attributes: true, attributeFilter: ['data-view', 'class'] });
	[authGate, ...modals].forEach((node) => backObserver.observe(node, { attributes: true, attributeFilter: ['hidden'] }));
	backObserver.observe(welcomeDialog, { attributes: true, attributeFilter: ['open'] });
	syncBackButton();
}
