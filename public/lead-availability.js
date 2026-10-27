(() => {
  const nodes = [...document.querySelectorAll('[data-lead-inventory]')];
  if (!nodes.length) return;
  const sellerPage = document.querySelector('#sellerPage');
  let controller, owner = '', checkedAt = 0;
  const show = text => nodes.forEach(node => { node.textContent = text; });
  const active = () => !document.hidden && (!sellerPage || sellerPage.classList.contains('is-active'));
  async function refresh(force = false) {
    const token = sessionStorage.getItem('pickquoteSellerSessionToken') || '';
    if (!active()) return;
    if (!token) { controller?.abort(); owner = ''; checkedAt = 0; show('판매자 로그인 후 고객DB 현황을 확인하세요.'); return; }
    if (token === owner && (controller || (!force && Date.now() - checkedAt < 30000))) return;
    controller?.abort();
    const current = new AbortController(); controller = current; owner = token;
    show('배정 가능한 고객DB 확인 중');
    const timer = setTimeout(() => current.abort(), 8000);
    try {
      const response = await fetch('/api/lead-availability', { cache: 'no-store', signal: current.signal, headers: { 'X-Seller-Session': token } });
      const data = await response.json();
      if (current !== controller || token !== sessionStorage.getItem('pickquoteSellerSessionToken')) return;
      if (!response.ok || !data.ok || !Number.isSafeInteger(data.availableCount) || data.availableCount < 0) throw new Error('unavailable');
      show(data.availableCount > 0 ? `현재 배정 가능한 고객DB ${data.availableCount.toLocaleString('ko-KR')}건` : '현재 배정 가능한 고객DB 0건 · 신규 고객DB 준비 중');
      checkedAt = Date.now();
    } catch {
      if (current === controller) { checkedAt = Date.now(); show('새로운 고객과의 연결, 고객DB 신청하기'); }
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
    if (!sellerPage.classList.contains('is-active')) { controller?.abort(); controller = null; owner = ''; checkedAt = 0; show('판매자 로그인 후 고객DB 현황을 확인하세요.'); }
    else void refresh();
  }).observe(sellerPage, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('click', event => {
    if (event.target.closest('#sellerRefresh')) void refresh(true);
    else if (event.target.closest('[data-seller-tab]')) void refresh();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
  window.addEventListener('focus', () => void refresh());
  window.addEventListener('pagehide', () => { controller?.abort(); });
  void refresh();
})();
