const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('checkout uses unassigned DB quantity and personal purchase history labels', () => {
  const html = fs.readFileSync(path.join(__dirname, '../public/db-checkout/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '../public/db-checkout/checkout.js'), 'utf8');
  assert.match(html, /<h2>나의 구매 내역<\/h2>/);
  assert.match(html, /checkout.js\?v=20261027-db-badges/);
  assert.match(js, /미배정 DB건수 \$\{data.remaining\}건/);
  assert.match(js, /구매 내역이 없습니다\./);
  assert.doesNotMatch(html + js, /잔여 구매 건수|최근 결제 내역|결제 내역이 없습니다\./);
});
test('quantity changes keep list price, discount and payable totals consistent', () => {
  const nodes = new Map();
  const get = id => {
    if (!nodes.has(id)) nodes.set(id, { value: '1', addEventListener(name, fn) { this[name] = fn; }, removeAttribute() {} });
    return nodes.get(id);
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/db-checkout/checkout.js'), 'utf8'), {
    document: { getElementById: get, querySelector: () => get('main') },
    sessionStorage: { getItem: () => null }, location: { search: '' }, URLSearchParams,
  });
  for (const n of [1, 3, 100]) {
    get('quantity').value = String(n); get('quantity').input();
    assert.equal(get('originalTotal').textContent, (n * 10000).toLocaleString('ko-KR'));
    assert.equal(get('discountTotal').textContent, (n * 2000).toLocaleString('ko-KR'));
    assert.equal(get('total').textContent, (n * 8000).toLocaleString('ko-KR'));
  }
  get('quantity').value = '0'; get('quantity').input();
  assert.equal(get('total').textContent, '-');
  assert.equal(get('pay').disabled, true);
});
