(() => {
  const nodes = [...document.querySelectorAll('[data-lead-inventory]')];
  const badges = [...document.querySelectorAll('[data-lead-badge]')];
  if (!nodes.length) return;
  const sellerPage = document.querySelector('#sellerPage');
  let controller, owner = '', checkedAt = 0;
  const setBadges = (value, description) => badges.forEach(badge => { badge.textContent = value; badge.setAttribute('title', description); });
  const show = (text, badge = '…') => { nodes.forEach(node => { node.textContent = text; }); setBadges(badge, text); };
  const quantity = value => {
    const strong = document.createElement('strong'); strong.className = 'db-quantity';
    strong.textContent = `${value.toLocaleString('ko-KR')}건`; return strong;
  };
  function render(data) {
    const available = data.availableCount + data.waitingCount;
    const mine = data.assignedCount + data.unassignedCount;
    for (const node of nodes) {
      if (data.hasPurchased) node.replaceChildren('내 DB ', quantity(mine), ' · 배정완료 ', quantity(data.assignedCount), ' · 미배정 ', quantity(data.unassignedCount));
      else node.replaceChildren('현재 신청 가능한 고객DB ', quantity(available));
    }
    setBadges((data.hasPurchased ? mine : available).toLocaleString('ko-KR'), data.hasPurchased
      ? `내 DB ${mine}건: 배정완료 ${data.assignedCount}건, 미배정 ${data.unassignedCount}건`
      : `신청 가능한 고객DB ${available}건`);
  }
  const active = () => !document.hidden && (!sellerPage || sellerPage.classList.contains('is-active'));
  async function refresh(force = false) {
    const token = sessionStorage.getItem('pickquoteSellerSessionToken') || '';
    if (!active()) return;
    if (!token) { controller?.abort(); owner = ''; checkedAt = 0; show('판매자 로그인 후 고객DB 현황을 확인하세요.', '0'); return; }
    if (token === owner && (controller || (!force && Date.now() - checkedAt < 30000))) return;
    const sameOwner = token === owner;
    controller?.abort();
    const current = new AbortController(); controller = current; owner = token;
    if (!sameOwner || !checkedAt) show('고객DB 현황 확인 중');
    const timer = setTimeout(() => current.abort(), 8000);
    try {
      const response = await fetch('/api/lead-availability', { cache: 'no-store', signal: current.signal, headers: { 'X-Seller-Session': token } });
      const data = await response.json();
      if (current !== controller || token !== sessionStorage.getItem('pickquoteSellerSessionToken')) return;
      if (!response.ok || !data.ok || typeof data.hasPurchased !== 'boolean'
        || !['availableCount', 'waitingCount', 'assignedCount', 'unassignedCount'].every(key => Number.isSafeInteger(data[key]) && data[key] >= 0)
        || !Number.isSafeInteger(data.availableCount + data.waitingCount) || !Number.isSafeInteger(data.assignedCount + data.unassignedCount)) throw new Error('unavailable');
      render(data);
      checkedAt = Date.now();
    } catch {
      if (current === controller) { checkedAt = Date.now(); show('새로운 고객과의 연결, 고객DB 신청하기', '-'); }
    } finally {
      clearTimeout(timer);
      if (current === controller) controller = null;
    }
  }
  for (const banner of document.querySelectorAll('.customer-db-banner')) {
    const image = banner.querySelector('img'), fallback = banner.querySelector('.db-banner-fallback');
    const failed = () => { if (fallback) { fallback.hidden = false; banner.querySelector('picture').hidden = true; } };
    image?.addEventListener('error', failed);
    if (image?.complete && !image.naturalWidth) failed();
  }
  if (sellerPage) new MutationObserver(() => {
    if (!sellerPage.classList.contains('is-active')) { controller?.abort(); controller = null; owner = ''; checkedAt = 0; show('판매자 로그인 후 고객DB 현황을 확인하세요.', '0'); }
    else void refresh();
  }).observe(sellerPage, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('click', event => {
    if (event.target.closest('#sellerRefresh')) void refresh(true);
    else if (event.target.closest('[data-seller-tab]')) void refresh();
  });
  document.addEventListener('lead-purchase-updated', () => void refresh(true));
  document.addEventListener('lead-workspace-updated', () => void refresh(true));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(true); });
  window.addEventListener('focus', () => void refresh(true));
  window.addEventListener('pagehide', () => { controller?.abort(); });
  void refresh();
})();
