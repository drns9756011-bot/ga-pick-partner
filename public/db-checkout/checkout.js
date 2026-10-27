(() => {
  const $ = id => document.getElementById(id);
  const token = sessionStorage.getItem('pickquoteSellerSessionToken');
  const money = value => Number(value).toLocaleString('ko-KR');
  const statuses = { pending: '결제 미완료', processing: '승인 확인 중', paid: '결제 완료', cancelled: '결제 취소', partialCancelled: '부분 취소', failed: '결제 실패', expired: '결제 만료', ready: '결제 대기' };
  let ready = false, busy = false, orderId = new URLSearchParams(location.search).get('order');
  async function api(path = '', method = 'GET', body) {
    if (token !== sessionStorage.getItem('pickquoteSellerSessionToken')) throw new Error('로그인이 변경되었습니다. 판매자 페이지에서 다시 확인해주세요.');
    const response = await fetch(`/api/lead-payments${path}`, { method, cache: 'no-store', signal: AbortSignal.timeout(18000), headers: { 'X-Seller-Session': token || '', 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    if (response.status === 401) { $('login').hidden = false; $('checkout').hidden = true; $('history').hidden = true; }
    if (!response.ok || !data.ok) { if (data.orderId) { orderId = data.orderId; await showOrder(); } throw new Error(data.message || '요청을 처리하지 못했습니다.'); }
    return data;
  }
  function update() {
    const n = Number($('quantity').value), valid = Number.isInteger(n) && n >= 1 && n <= 100;
    $('summaryQuantity').textContent = valid ? `${n}건` : '-';
    $('total').textContent = valid ? money(n * 8000) : '-';
    $('originalTotal').textContent = valid ? money(n * 10000) : '-';
    $('discountTotal').textContent = valid ? money(n * 2000) : '-';
    $('pay').textContent = busy ? '결제창 연결 중' : `${valid ? money(n * 8000) : ''}원 카드결제`;
    $('pay').disabled = !ready || !valid || busy;
    $('minus').disabled = n <= 1 || busy; $('plus').disabled = n >= 100 || busy;
  }
  async function sdk() {
    if (window.AUTHNICE) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = 'https://pay.nicepay.co.kr/v1/js/';
      const timer = setTimeout(() => { s.remove(); reject(new Error('결제창 연결이 지연됩니다. 잠시 후 다시 시도해주세요.')); }, 15000);
      s.onload = () => { clearTimeout(timer); resolve(); }; s.onerror = () => { clearTimeout(timer); s.remove(); reject(new Error('결제창을 불러오지 못했습니다.')); }; document.head.append(s);
    });
  }
  async function history() {
    const data = await api('/orders'); $('orders').replaceChildren(); $('history').hidden = false;
    for (const order of data.rows) {
      const item = document.createElement('article'), info = document.createElement('div'), title = document.createElement('strong'), sub = document.createElement('small'), button = document.createElement('button');
      title.textContent = `${order.quantity}건 · ${money(order.amount)}원`;
      sub.textContent = `${statuses[order.status] || '확인 필요'}${order.mode === 'sandbox' ? ' (테스트)' : ''} · ${new Date(order.created_at).toLocaleDateString('ko-KR')}`;
      button.type = 'button'; button.textContent = '상태 확인'; button.onclick = async () => { orderId = order.id; button.disabled = true; try { await showOrder(); } catch (e) { $('notice').textContent = e.message; } finally { button.disabled = false; } };
      info.append(title, sub); item.append(info, button); $('orders').append(item);
    }
    if (!data.rows.length) $('orders').textContent = '구매 내역이 없습니다.';
  }
  async function showOrder() {
    const { order } = await api(`/orders/${encodeURIComponent(orderId)}`);
    $('result').hidden = false; $('resultTitle').textContent = statuses[order.status] || '결제 확인';
    $('resultMessage').textContent = order.status === 'paid' ? (order.mode === 'sandbox' ? '테스트 결제가 완료됐습니다. 실제 고객DB 권한이나 건수는 부여되지 않습니다.' : `${order.quantity}건 결제가 확인됐습니다. 관리자가 배정한 고객은 고객DB에서 확인할 수 있습니다.`) : order.status === 'processing' ? '승인 결과를 확인 중입니다. 중복 결제하지 말고 상태를 다시 확인해주세요.' : '결제가 완료되지 않았거나 취소되었습니다. 궁금한 점은 고객센터로 문의해주세요.';
    $('result').scrollIntoView({ block: 'nearest' });
  }
  $('verify').onclick = async () => { $('verify').disabled = true; try { await showOrder(); await history(); } catch (e) { $('notice').textContent = e.message; } finally { $('verify').disabled = false; } };
  $('quantity').addEventListener('input', update);
  for (const [id, amount] of [['minus', -1], ['plus', 1]]) $(id).onclick = () => { $('quantity').value = Math.max(1, Math.min(100, (Number($('quantity').value) || 1) + amount)); update(); };
  $('purchase').onsubmit = async event => {
    event.preventDefault(); if (busy || !ready || !$('purchase').reportValidity()) return;
    busy = true; update(); $('notice').textContent = '';
    try {
      await sdk();
      const result = await api('/orders', 'POST', { quantity: Number($('quantity').value), agreed: $('agreed').checked });
      window.AUTHNICE.requestPay({ ...result.checkout, fnError: () => { busy = false; update(); $('notice').textContent = '결제창을 닫았거나 연결하지 못했습니다. 결제 내역을 먼저 확인해주세요.'; void history().catch(() => {}); } });
    } catch (e) { busy = false; update(); $('notice').textContent = e.message; }
  };
  (async () => {
    try {
      if (!token) { $('login').hidden = false; $('notice').textContent = ''; return; }
      const data = await api(); ready = data.ready; $('checkout').hidden = false;
      $('notice').textContent = !ready ? '카드결제 연결을 준비 중입니다. 고객센터로 문의해주세요.' : data.mode === 'sandbox' ? '테스트 결제 환경입니다. 실제 이용 권한은 부여되지 않습니다.' : `미배정 DB건수 ${data.remaining}건`;
      update(); if (orderId) await showOrder(); await history();
    } catch (e) { $('notice').textContent = e.message; }
    finally { document.querySelector('main').removeAttribute('aria-busy'); }
  })();
})();
