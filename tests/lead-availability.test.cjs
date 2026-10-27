const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync('public/lead-availability.js', 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup(reply = {}, banner) {
  const element = () => ({ textContent: '', children: [], attributes: {}, setAttribute(k,v) { this.attributes[k] = v; }, replaceChildren(...children) { this.children = children; this.textContent = children.map(child => typeof child === 'string' ? child : child.textContent).join(''); } });
  const nodes = [element(), element()], badges = [element()], events = {}, calls = [];
  const payload = { ok: true, availableCount: 12, waitingCount: 0, assignedCount: 0, unassignedCount: 0, hasPurchased: false, ...reply };
  const state = { token: 'seller-session', active: true };
  const context = {
    document: { hidden: false, createElement: element, querySelectorAll: selector => selector === '[data-lead-inventory]' ? nodes : selector === '[data-lead-badge]' ? badges : banner ? [banner] : [], querySelector: () => ({ classList: { contains: () => state.active } }), addEventListener: (type, handler) => { events[type] = handler; } },
    window: { addEventListener: (type, handler) => { events[type] = handler; } },
    sessionStorage: { getItem: () => state.token },
    MutationObserver: class { constructor(handler) { events.mutation = handler; } observe() {} },
    fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => payload }; },
    AbortController, setTimeout, clearTimeout, Date,
  };
  vm.runInNewContext(source, context);
  return { nodes, badges, events, calls, state, payload };
}
test('stock is requested once with session authentication and shared across displays', async () => {
  const s = setup(); await tick();
  assert.equal(s.calls.length, 1); assert.equal(s.calls[0].url, '/api/lead-availability');
  assert.equal(s.calls[0].options.headers['X-Seller-Session'], 'seller-session');
  assert.equal(s.calls[0].options.cache, 'no-store');
  for (const node of s.nodes) { assert.equal(node.textContent, '현재 신청 가능한 고객DB 12건'); assert.equal(node.children[1].className, 'db-quantity'); }
  assert.equal(s.badges[0].textContent, '12');
  s.events.focus(); s.events.visibilitychange(); await tick(); assert.equal(s.calls.length, 2);
  s.events.click({ target: { closest: selector => selector === '#sellerRefresh' } }); await tick(); assert.equal(s.calls.length, 3);
});
test('empty and failed stock are not presented as fabricated availability', async () => {
  const empty = setup({ ok: true, availableCount: 0 }); await tick();
  assert.match(empty.nodes[0].textContent, /0건/); assert.equal(empty.badges[0].textContent, '0');
  const failed = setup({ ok: false }); await tick();
  assert.equal(failed.nodes[0].textContent, '새로운 고객과의 연결, 고객DB 신청하기');
  assert.doesNotMatch(failed.nodes[0].textContent, /0건/);
});
test('confirmed waiting stock and personal purchases are distinguished in the red badge', async () => {
  const s = setup({ availableCount: 0, waitingCount: 20 }); await tick();
  assert.match(s.nodes[0].textContent, /20건/); assert.equal(s.badges[0].textContent, '20');
  Object.assign(s.payload, { hasPurchased: true, assignedCount: 0, unassignedCount: 5 });
  s.events['lead-purchase-updated'](); await tick();
  assert.equal(s.nodes[0].textContent, '내 DB 5건 · 배정완료 0건 · 미배정 5건'); assert.equal(s.badges[0].textContent, '5');
  Object.assign(s.payload, { assignedCount: 3, unassignedCount: 2 });
  s.events.focus(); await tick();
  assert.equal(s.nodes[0].textContent, '내 DB 5건 · 배정완료 3건 · 미배정 2건');
});
test('logout clears stock and anonymous pages do not fetch inventory', async () => {
  const s = setup(); await tick(); s.state.active = false; s.state.token = '';
  s.events.mutation(); assert.match(s.nodes[0].textContent, /로그인 후/);
  s.state.active = true; s.events.focus(); await tick(); assert.equal(s.calls.length, 1);
});
test('failed artwork retains a readable purchase link and inventory', async () => {
  const fallback = { hidden: true }, picture = { hidden: false };
  const image = { complete: true, naturalWidth: 0, addEventListener() {} };
  const s = setup(undefined, { querySelector: selector => selector === 'img' ? image : selector === 'picture' ? picture : fallback });
  await tick(); assert.equal(fallback.hidden, false); assert.equal(picture.hidden, true);
  assert.match(s.nodes[0].textContent, /12건/);
});
