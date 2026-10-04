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

document.querySelectorAll('[data-success]').forEach((button) => {
	button.addEventListener('click', () => {
		closeModal(button.closest('.modal'));
		if (button.closest('#add-asset-modal')) {
			const selected = document.querySelector('.asset-picker-option.active');
			if (selected) {
				showSuccess(`Актив «${selected.dataset.assetName}» добавлен в портфель`);
				return;
			}
		}
		showSuccess(button.dataset.success);
	});
});

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
	closeModal(confirmPaymentButton.closest('.modal'));
	showSuccess('Покупка подтверждена, средства зарезервированы');
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
		const result = amount * getConverterRate(from, to);

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

const gameArena = document.querySelector('#wind-game-arena');
const gameObjects = document.querySelector('#game-objects');
const gamePlayer = document.querySelector('#game-player');
const gameStart = document.querySelector('#game-start');
const gameLeft = document.querySelector('#game-left');
const gameRight = document.querySelector('#game-right');
const gameScore = document.querySelector('#game-score');
const gameTime = document.querySelector('#game-time');
const gameComboLabel = document.querySelector('#game-combo');
const gameBest = document.querySelector('#game-best');
const gameMessage = document.querySelector('#game-message');
const gameChapterLabel = document.querySelector('#game-chapter-label');
const gameChapterTitle = document.querySelector('#game-chapter-title');
const gameStoryCopy = document.querySelector('#game-story-copy');
const gameMission = document.querySelector('#game-mission');
const gameProgressBar = document.querySelector('#game-progress-bar');
let gameTimer;
let gameRunning = false;
let gameScoreValue = 0;
let gameTimeValue = 30;
let gameComboValue = 0;
let gameChapter = 1;
let lastCatchAt = 0;
let gamePlayerX = .5;
let gameAnimationFrame;
let gameSpawnTimer;
let gameLastFrame = 0;
let gameObjectsState = [];
let gameStack = [];
let gameBestValue = Number(localStorage.getItem('wind_game_best') || 0);

const gameChapters = [
	{ label: 'Глава 1', title: 'Первый груз', copy: 'Курьерский маршрут только открылся. Поймай 5 целых коробок и довези первый заказ.', mission: 5 },
	{ label: 'Глава 2', title: 'Час пик', copy: 'Заказы идут один за другим. Быстрые доставки дают серию, а каждая третья коробка приносит двойную награду.', mission: 12 },
	{ label: 'Глава 3', title: 'Ночной склад', copy: 'Финальный рейс. Повреждённые коробки смешались с ценным грузом, поэтому каждая дорожка теперь важна.', mission: 20 },
];

const updateGameChapter = () => {
	const nextChapter = gameScoreValue >= 12 ? 3 : gameScoreValue >= 5 ? 2 : 1;
	gameChapter = nextChapter;
	const chapter = gameChapters[nextChapter - 1];
	if (gameChapterLabel) gameChapterLabel.textContent = chapter.label;
	if (gameChapterTitle) gameChapterTitle.textContent = chapter.title;
	if (gameStoryCopy) gameStoryCopy.textContent = chapter.copy;
	if (gameMission) gameMission.textContent = `Цель: ${chapter.mission} коробок`;
	if (gameProgressBar) gameProgressBar.style.width = `${Math.min(100, (gameScoreValue / chapter.mission) * 100)}%`;
	gameArena?.classList.toggle('storm-mode', nextChapter === 2);
	gameArena?.classList.toggle('eye-mode', nextChapter === 3);
};

const updateGameStats = () => {
	if (gameScore) gameScore.textContent = String(gameScoreValue);
	if (gameTime) gameTime.textContent = String(gameTimeValue);
	if (gameComboLabel) gameComboLabel.textContent = gameComboValue > 1 ? `x${gameComboValue}` : '0';
	if (gameBest) gameBest.textContent = String(gameBestValue);
	updateGameChapter();
};

const setGamePlayerPosition = (clientX) => {
	if (!gameArena || !gamePlayer) return;
	const bounds = gameArena.getBoundingClientRect();
	moveGamePosition((clientX - bounds.left) / bounds.width);
};

const moveGamePosition = (position) => {
	gamePlayerX = Math.min(.94, Math.max(.06, position));
	if (gamePlayer) gamePlayer.style.left = `${gamePlayerX * 100}%`;
	gameStack.forEach((object, index) => {
		object.element.style.left = `calc(${gamePlayerX * 100}% + ${object.stackOffset}px)`;
		object.element.style.bottom = `${58 + index * 27}px`;
	});
};

const clearGameObjects = () => {
	window.cancelAnimationFrame(gameAnimationFrame);
	window.clearInterval(gameSpawnTimer);
	gameObjectsState = [];
	gameStack = [];
	if (gameObjects) gameObjects.innerHTML = '';
};

const spawnGameObject = () => {
	if (!gameRunning || !gameObjects) return;
	const isBomb = Math.random() < (gameChapter === 3 ? .28 : .17);
	const isBonus = !isBomb && Math.random() < .14;
	const element = document.createElement('span');
	element.className = `game-falling-object ${isBomb ? 'bomb' : isBonus ? 'bonus' : 'crate'}`;
	element.textContent = isBomb ? '●' : isBonus ? '★' : '▣';
	const x = .08 + Math.random() * .84;
	element.style.left = `${x * 100}%`;
	element.style.top = '-34px';
	gameObjects.appendChild(element);
	gameObjectsState.push({ element, x, y: -34, speed: 105 + gameChapter * 22 + Math.random() * 45, rotation: (Math.random() - .5) * 24, type: isBomb ? 'bomb' : isBonus ? 'bonus' : 'crate' });
};

const landCrate = (object) => {
	const stackIndex = gameStack.length;
	const supportOffset = gameStack.length ? gameStack[gameStack.length - 1].stackOffset : 0;
	const stackOffset = supportOffset + (Math.random() - .5) * 28;
	if (gameStack.length && Math.abs(stackOffset - supportOffset) > 11) {
		object.element.classList.add('slide-off');
		object.element.style.setProperty('--slide-x', `${stackOffset < supportOffset ? -90 : 90}px`);
		window.setTimeout(() => object.element.remove(), 360);
		gameMessage.textContent = 'Коробка не попала на опору и соскользнула.';
		return;
	}
	object.element.classList.add('stacked');
	object.stackOffset = stackOffset;
	object.element.style.left = `calc(${gamePlayerX * 100}% + ${stackOffset}px)`;
	object.element.style.top = 'auto';
	object.element.style.bottom = `${58 + stackIndex * 27}px`;
	object.element.style.transform = `translateX(-50%) rotate(${object.rotation}deg)`;
	gameStack.push(object);
	const now = Date.now();
	gameComboValue = now - lastCatchAt < 1600 ? gameComboValue + 1 : 1;
	lastCatchAt = now;
	gameScoreValue += object.type === 'bonus' ? 3 : gameChapter === 2 && gameComboValue % 3 === 0 ? 2 : 1;
	gameMessage.textContent = object.type === 'bonus' ? 'Золотая посылка легла на вершину башни.' : gameComboValue > 1 ? `Серия x${gameComboValue}! Башня растёт.` : 'Коробка аккуратно уложена.';
};

const explodeBomb = (bombX) => {
	gameComboValue = 0;
	const arenaWidth = gameArena.clientWidth;
	const blastRadius = Math.min(150, arenaWidth * .32);
	const removed = gameStack.filter((object) => Math.abs((gamePlayerX + object.stackOffset / arenaWidth) - bombX) * arenaWidth <= blastRadius);
	gameStack = gameStack.filter((object) => !removed.includes(object));
	moveGamePosition(gamePlayerX);
	removed.forEach((object) => {
		object.element.classList.add('explode');
		const direction = object.stackOffset / Math.max(1, Math.abs(object.stackOffset));
		object.element.style.setProperty('--blast-x', `${(direction || (Math.random() > .5 ? 1 : -1)) * 90}px`);
		window.setTimeout(() => object.element.remove(), 260);
	});
	gameMessage.textContent = removed.length ? `Взрыв задел ${removed.length} ${removed.length === 1 ? 'коробку' : 'коробки'} в радиусе.` : 'Бомба взорвалась рядом, башня устояла.';
	gameArena.classList.add('hit');
	window.setTimeout(() => gameArena.classList.remove('hit'), 300);
};

const runGameFrame = (timestamp) => {
	if (!gameRunning || !gameArena || !gamePlayer) return;
	const delta = Math.min(.04, (timestamp - gameLastFrame) / 1000 || 0);
	gameLastFrame = timestamp;
	const arenaHeight = gameArena.clientHeight;
	const playerRect = gamePlayer.getBoundingClientRect();
	const arenaRect = gameArena.getBoundingClientRect();
	const playerLeft = playerRect.left - arenaRect.left;
	const playerRight = playerLeft + playerRect.width;
	gameObjectsState = gameObjectsState.filter((object) => {
		object.y += object.speed * delta;
		object.element.style.transform = `translate(-50%, ${object.y}px) rotate(${object.rotation + object.y * .04}deg)`;
		const objectRect = object.element.getBoundingClientRect();
		const objectLeft = objectRect.left - arenaRect.left;
		const objectRight = objectLeft + objectRect.width;
		const atBase = object.y + objectRect.height >= arenaHeight - 68 && object.y <= arenaHeight - 20 && objectRight >= playerLeft && objectLeft <= playerRight;
		if (atBase && object.type === 'bomb') explodeBomb(object.x);
		if (atBase && object.type !== 'bomb') landCrate(object);
		if (atBase || object.y > arenaHeight + 40) {
			if (!atBase || object.type === 'bomb') object.element.remove();
			return false;
		}
		return true;
	});
	updateGameStats();
	gameAnimationFrame = window.requestAnimationFrame(runGameFrame);
};

const finishGame = () => {
	gameRunning = false;
	window.clearInterval(gameTimer);
	gameArena?.classList.remove('running');
	gameArena?.classList.remove('storm-mode', 'eye-mode');
	clearGameObjects();
	gameComboValue = 0;
	if (gameScoreValue > gameBestValue) {
		gameBestValue = gameScoreValue;
		localStorage.setItem('wind_game_best', String(gameBestValue));
		gameMessage.textContent = 'Новый рекорд! Сегодня склад работает на тебя.';
	} else {
		gameMessage.textContent = `Маршрут завершён. Доставлено коробок: ${gameScoreValue}`;
	}
	gameStart.innerHTML = '<i data-lucide="rotate-cw"></i> Пройти ещё раз';
	if (window.lucide) window.lucide.createIcons();
	updateGameStats();
};

const startGame = () => {
	if (!gameArena || !gamePlayer || !gameStart) return;
	window.clearInterval(gameTimer);
	gameRunning = true;
	gameScoreValue = 0;
	gameTimeValue = 30;
	gameComboValue = 0;
	lastCatchAt = 0;
	gamePlayerX = .5;
	gameArena.classList.add('running');
	gameArena.classList.remove('storm-mode', 'eye-mode');
	gameStart.innerHTML = '<i data-lucide="timer"></i> История идёт';
	gameMessage.textContent = 'Лови коробки быстрее, пока склад не закрылся!';
	clearGameObjects();
	moveGamePosition(.5);
	gameSpawnTimer = window.setInterval(spawnGameObject, 620 - gameChapter * 70);
	spawnGameObject();
	updateGameStats();
	if (window.lucide) window.lucide.createIcons();
	gameLastFrame = performance.now();
	gameAnimationFrame = window.requestAnimationFrame(runGameFrame);
	gameTimer = window.setInterval(() => {
		gameTimeValue -= 1;
		updateGameStats();
		if (gameTimeValue <= 0) finishGame();
	}, 1000);
};

gameStart?.addEventListener('click', startGame);
gameLeft?.addEventListener('click', () => moveGamePosition(gamePlayerX - .12));
gameRight?.addEventListener('click', () => moveGamePosition(gamePlayerX + .12));
gameArena?.addEventListener('pointermove', (event) => {
	if (gameRunning) setGamePlayerPosition(event.clientX);
});
gameArena?.addEventListener('pointerdown', (event) => {
	if (gameRunning) setGamePlayerPosition(event.clientX);
});
window.addEventListener('keydown', (event) => {
	if (!gameRunning || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
	event.preventDefault();
	moveGamePosition(gamePlayerX + (event.key === 'ArrowLeft' ? -.1 : .1));
});
updateGameStats();

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
}

const getApiBase = () => {
	if (window.WIND_API_URL) return window.WIND_API_URL;
	const hostname = window.location.hostname;
	if (window.location.port === '5500' || hostname.includes('-5500.')) {
		return window.location.origin;
	}
	if (hostname.includes('-8000.')) {
		return `${window.location.protocol}//${hostname.replace('-8000.', '-5500.')}`;
	}
	return `${window.location.protocol}//${hostname}:5500`;
};

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

if (window.lucide) {
	lucide.createIcons();
}
