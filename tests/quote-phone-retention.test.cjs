const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');

test('selected seller visibility requires an authoritative unexpired deadline', () => {
  let bid = { id: 'selected' };
  const context = vm.createContext({ getActiveSellerBid: () => bid, sameId: (a, b) => a === b });
  const start = source.indexOf('function canActiveSellerSeeCustomerPhone(');
  vm.runInContext(source.slice(start, source.indexOf('function isActiveSellerSelectedRequest(', start)), context);
  const row = { selectedBidId: 'selected', phoneAccessExpiresAt: new Date(Date.now() + 60000).toISOString() };
  assert.equal(context.canActiveSellerSeeCustomerPhone(row), true);
  assert.equal(context.canActiveSellerSeeCustomerPhone({ ...row, phoneAccessExpiresAt: new Date(Date.now() - 1).toISOString() }), false);
  assert.equal(context.canActiveSellerSeeCustomerPhone({ ...row, phoneAccessExpiresAt: '' }), false);
  bid = { id: 'other' };
  assert.equal(context.canActiveSellerSeeCustomerPhone(row), false);
});

test('open pages erase cached phone values at expiry and refresh the visible view', () => {
  let refreshes = 0;
  const rows = [
    { phone: '01012345678', phoneAccessExpiresAt: new Date(Date.now() - 1).toISOString() },
    { phone: '01011112222', phoneAccessExpiresAt: new Date(Date.now() + 60000).toISOString() },
  ];
  const context = vm.createContext({
    requests: rows, document: { querySelectorAll: () => [] },
    normalizePhone: (value) => value.replace(/\D/g, ''),
    queueQuoteCountdownViewRefresh: () => { refreshes++; },
  });
  const start = source.indexOf('function updateQuoteCountdowns(');
  vm.runInContext(source.slice(start, source.indexOf('function startQuoteCountdownTimer(', start)), context);
  context.updateQuoteCountdowns();
  assert.equal(rows[0].phone, '***-****-****');
  assert.equal(rows[1].phone, '01011112222');
  assert.equal(refreshes, 1);
  context.updateQuoteCountdowns();
  assert.equal(refreshes, 1);
});

test('seller pages use the current shared script and quote consent duration', () => {
  for (const file of ['seller/index.html', 'seller/register/index.html']) {
    const html = readFileSync(path.join(__dirname, '../public', file), 'utf8');
    assert.match(html, /app\.js\?v=20261007-selection-retention/);
    assert.match(html, /보유 기간: 견적 등록일로부터 30일/);
  }
});
