(() => {
	const el = id => document.getElementById(id);
	const form = el('spot-form');
	const amount = el('spot-amount');
	const confirm = el('spot-confirm');
	const reset = el('spot-reset');
	const review = el('purchase-review');
	const modes = document.querySelectorAll('[data-purchase-mode]');
	const presets = form.querySelectorAll('[data-spot-budget]');
	const priceRefresh = el('spot-refresh');
	const qtyFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 8 });
	const finalStatuses = ['Filled', 'Cancelled', 'Rejected', 'PartiallyFilledCanceled', 'Deactivated'];
	let account = null;
	let order = null;
	let demo = true;
	let generation = 0;
	let busy = false;
	let price = null;
	let priceRequest = 0;
	const selectedSymbol = () => form.elements['spot-asset'].value;
	const baseCoin = symbol => symbol.replace(/USDT$/, '');

	function selectMode(mode) {
		modes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.purchaseMode === mode)));
		el('purchase-p2p').hidden = mode !== 'p2p';
		el('purchase-spot').hidden = mode !== 'spot';
		if (mode === 'spot') refreshPrice();
	}
	modes.forEach(button => button.addEventListener('click', () => selectMode(button.dataset.purchaseMode)));
	const offers = el('purchase-offers');
	const p2pCoin = () => document.querySelector('[name="p2p-coin"]:checked').value;
	el('purchase-p2p').addEventListener('change', () => {
		offers.href = 'https://www.bybit.com/ru-RU/p2p/buy/' + p2pCoin() + '/RUB';
		offers.firstChild.textContent = 'Предложения ' + p2pCoin() + ' на Bybit ';
	});
	offers.addEventListener('click', () => trackPartnerClick('trade', 'p2p-buy', p2pCoin() + 'RUB'));

	function renderPrice() {
		const symbol = selectedSymbol();
		const base = baseCoin(symbol);
		const snapshot = price?.symbol === symbol ? price : null;
		const ask = demo ? CRYPTO_RATES[base] : snapshot?.ask;
		const budget = amount.valueAsNumber;
		el('spot-price-asset').textContent = base;
		el('spot-price').textContent = ask ? qtyFormat.format(ask) + ' USDT' : '—';
		el('spot-estimate').textContent = ask && amount.validity.valid && budget > 0
			? '≈ ' + qtyFormat.format(budget / ask) + ' ' + base : '—';
		const note = demo ? 'Учебный курс' : snapshot?.loading ? 'Получаем цену Bybit…'
			: ask ? 'Снимок лучшей цены продажи · уточним перед заявкой' : 'Цена сейчас недоступна. Можно обновить курс.';
		if (el('spot-price-note').textContent !== note) el('spot-price-note').textContent = note;
		priceRefresh.hidden = demo;
		priceRefresh.disabled = Boolean(snapshot?.loading);
	}

	async function refreshPrice() {
		if (demo || !account?.enabled || form.hidden || el('purchase-spot').hidden) return;
		const symbol = selectedSymbol();
		if (price?.symbol === symbol && price.loading) return;
		const request = ++priceRequest;
		price = { symbol, loading: true };
		renderPrice();
		try {
			const snapshot = await window.WindApi('/broker/bybit/prices/' + symbol);
			const ask = Number(snapshot.ask);
			if (request === priceRequest && snapshot.symbol === symbol && Number.isFinite(ask) && ask > 0) price.ask = ask;
		} catch {
			// A failed preview can be retried separately from requesting a firm order preview.
		} finally {
			if (request === priceRequest) {
				price.loading = false;
				renderPrice();
			}
		}
	}
	priceRefresh.addEventListener('click', refreshPrice);
	form.addEventListener('change', event => {
		if (event.target.name === 'spot-asset') { renderPrice(); refreshPrice(); }
	});
	amount.addEventListener('input', renderPrice);
	presets.forEach(button => button.addEventListener('click', () => {
		amount.value = button.dataset.spotBudget;
		renderPrice();
	}));

	function render() {
		const connected = Boolean(account?.uid);
		const waiting = !demo && !account?.enabled;
		const editable = demo || Boolean(account?.enabled);
		el('spot-source').textContent = demo ? 'Учебный пример · без списаний'
			: waiting ? 'Подключение к Bybit' : (account.network === 'testnet' ? 'Bybit Testnet · тестовые USDT' : 'Bybit · реальные USDT')
				+ (connected ? ' · UID ' + account.uid : '');
		el('spot-disconnect').hidden = !connected;
		el('spot-connect').hidden = waiting || demo || connected;
		form.hidden = !editable || Boolean(order);
		review.hidden = !editable || !order;
		amount.max = demo ? '1000000' : account?.max_usdt || '';
		el('spot-review-start').hidden = !demo && !connected;
		el('spot-review-start').disabled = busy;
		confirm.disabled = busy;
		presets.forEach(button => {
			button.hidden = Boolean(amount.max && Number(button.dataset.spotBudget) > Number(amount.max));
		});
		if (!form.hidden) renderPrice();
		if (review.hidden) return;

		const base = baseCoin(order.symbol);
		const preview = order.status === 'preview';
		const done = finalStatuses.includes(order.status);
		const spent = Number(order.spent || 0);
		const filled = Number(order.filled || 0);
		const quantity = preview ? Number(order.budget) / Number(order.ask) : filled;
		const pricePerCoin = preview ? Number(order.ask) : done && filled ? spent / filled : 0;
		const titles = {
			Filled: demo ? 'Учебная покупка завершена' : 'Покупка исполнена',
			Cancelled: filled ? 'Частичное исполнение' : 'Заявка отменена',
			PartiallyFilledCanceled: 'Частичное исполнение', Rejected: 'Заявка отклонена', Deactivated: 'Заявка снята',
		};
		el('spot-title').textContent = preview ? 'Проверка покупки' : titles[order.status] || 'Ожидаем результат Bybit';
		el('spot-review-price-row').hidden = !pricePerCoin;
		el('spot-review-price-label').textContent = (preview ? 'Цена за ' : 'Средняя цена за ') + base;
		el('spot-review-price').textContent = pricePerCoin ? qtyFormat.format(pricePerCoin) + ' USDT' : '';
		el('spot-total').textContent = qtyFormat.format(preview || !done ? order.budget : spent) + ' USDT';
		el('spot-qty-label').textContent = preview ? 'Ориентировочно' : 'Исполнено';
		el('spot-qty').textContent = qtyFormat.format(quantity) + ' ' + base;
		el('spot-note').textContent = preview
			? (demo ? 'В демо используются условные средства.'
				: 'Рыночная заявка. Итоговое количество зависит от исполнения и торговой комиссии.')
			: order.note || (demo ? 'Все шаги пройдены на учебных средствах.'
				: done ? 'Результат по данным Bybit. Количество указано до торговой комиссии.' : 'Статус можно проверить здесь. Повторная отправка заявки не требуется.');
		confirm.hidden = done;
		confirm.textContent = preview ? (demo ? 'Подтвердить демо-покупку' : 'Купить за ' + qtyFormat.format(order.budget) + ' USDT') : 'Проверить статус';
		reset.hidden = !preview && !done;
		reset.textContent = preview ? 'Изменить' : 'Новая покупка';
	}

	async function run(action) {
		if (busy) return;
		busy = true;
		el('spot-review-start').disabled = true;
		confirm.disabled = true;
		const version = generation;
		el('purchase-spot').setAttribute('aria-busy', 'true');
		el('spot-message').textContent = '';
		const call = async (path, options) => {
			const data = await window.WindApi('/broker/bybit' + path, options);
			if (version !== generation) throw new Error();
			return data;
		};
		try { await action(call); }
		catch (error) {
			if (version === generation) el('spot-message').textContent = error.message || 'Проверь соединение и попробуй снова.';
		} finally {
			if (version === generation) {
				busy = false;
				el('purchase-spot').removeAttribute('aria-busy');
				render();
			}
		}
	}

	function loadAccount() {
		generation++;
		priceRequest++;
		price = null;
		busy = false;
		account = order = null;
		el('spot-message').textContent = '';
		el('spot-retry').hidden = true;
		el('spot-pairing').hidden = true;
		el('spot-pin-form').reset();
		el('spot-connect-start').hidden = false;
		el('spot-authorize').removeAttribute('href');
		el('purchase-spot').removeAttribute('aria-busy');
		demo = inTelegram || isDemoPreview() || !sessionStorage.getItem('wind_access_token');
		render();
		if (demo) return;
		const version = generation;
		run(async call => {
			el('spot-retry').hidden = false;
			account = await call('/status');
			demo = !account.enabled;
			order = account.latest || null;
			el('spot-retry').hidden = true;
		}).then(() => { if (version === generation) refreshPrice(); });
	}
	window.addEventListener('wind-logout', () => { form.reset(); loadAccount(); });
	// Navigating away preserves a quote and an unfinished OAuth handshake.
	let loadedFor;
	const syncAccount = () => {
		const session = isDemoPreview() ? 'demo' : sessionStorage.getItem('wind_access_token');
		if (loadedFor !== session) { loadedFor = session; loadAccount(); }
		else refreshPrice();
	};
	window.addEventListener('wind-auth', () => { if (document.body.dataset.view === 'crypto') syncAccount(); });
	onAppView(['crypto'], active => {
		if (active) syncAccount();
	});
	el('spot-retry').addEventListener('click', loadAccount);

	const connect = () => run(async call => {
		const { url } = await call('/connect', { method: 'POST' });
		el('spot-pin-form').reset();
		el('spot-authorize').href = url;
		el('spot-pairing').hidden = false;
		el('spot-connect-start').hidden = true;
		el('spot-authorize').focus();
	});
	el('spot-connect-start').addEventListener('click', connect);
	el('spot-connect-restart').addEventListener('click', connect);
	el('spot-pin-form').addEventListener('submit', event => {
		event.preventDefault();
		run(async call => {
			const { uid } = await call('/pair', { method: 'POST', body: { pin: el('spot-pin').value.trim().toUpperCase() } });
			account.uid = uid;
			el('spot-pin-form').reset();
			el('spot-pairing').hidden = true;
			el('spot-authorize').removeAttribute('href');
		});
	});
	el('spot-disconnect').addEventListener('click', () => run(async call => {
		await call('/connection', { method: 'DELETE' });
		account.uid = null;
		order = null;
		el('spot-connect-start').hidden = false;
		el('spot-message').textContent = 'Аккаунт отключён от Wind.';
	}));

	form.addEventListener('submit', event => {
		event.preventDefault();
		if (!form.reportValidity() || (!demo && !account?.uid)) return;
		const symbol = selectedSymbol();
		const budget = amount.value;
		run(async call => {
			order = demo ? { symbol, budget, ask: CRYPTO_RATES[symbol.slice(0, -4)], status: 'preview' }
				: await call('/quotes', { method: 'POST', body: { symbol, amount: budget } });
			render();
			review.focus();
		});
	});
	confirm.addEventListener('click', () => run(async call => {
		if (!order || finalStatuses.includes(order.status)) return;
		if (demo) {
			order.status = 'Filled';
			order.spent = order.budget;
			order.filled = order.budget / order.ask;
		} else if (order.status === 'preview') {
			order.status = 'pending';
			render();
			try {
				order = await call('/orders/' + order.id + '/confirm', { method: 'POST', timeoutMs: 16000 });
			} catch (error) {
				if (error.status === 409) order = null;
				throw error;
			}
		} else {
			order = await call('/orders/' + order.id);
			if (order.status === 'preview') {
				order = null;
				el('spot-message').textContent = 'Заявка не отправлена. Рассчитай покупку ещё раз.';
			}
		}
	}));
	reset.addEventListener('click', () => {
		if (busy) return;
		order = null;
		el('spot-message').textContent = '';
		render();
		refreshPrice();
		amount.focus();
	});
	window.addEventListener('wind-spot-buy', event => {
		if (!order) form.elements['spot-asset'].value = event.detail;
		renderPrice();
		selectMode('spot');
		el('spot-panel').scrollIntoView({ block: 'center', behavior: windMotion.matches ? 'smooth' : 'instant' });
	});
	render();
})();
