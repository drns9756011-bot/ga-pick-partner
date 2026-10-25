const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('public/app.js', 'utf8');
test('empty profile cache does not erase a restored session', () => {
  const code = source.slice(source.indexOf('function hydrateApprovedSellerAccounts()'), source.indexOf('function hasPendingSellerApplication('));
  let cleared = false;
  const context = { getApprovedSellerRows: () => [], sellerAccounts: new Map(), activeSellerId: 'seller', writeActiveSellerSession: () => { cleared = true; } };
  vm.runInNewContext(`${code}; hydrateApprovedSellerAccounts();`, context);
  assert.equal(context.activeSellerId, 'seller');
  assert.equal(cleared, false);
});
test('refresh restores activity time without extending it; one-hour idle session expires', () => {
  const code = source.slice(source.indexOf('function readActiveSellerSession()'), source.indexOf('function restoreSellerFilterState()'));
  const values = new Map([['id', 'seller'], ['token', 'test'], ['last', String(Date.now() - 1800000)]]);
  const saved = values.get('last');
  const context = { activeSellerId: '', Date, STORAGE_KEYS: { activeSellerId: 'id', sellerSessionToken: 'token', sellerLastActivity: 'last' }, sessionStorage: { getItem: k => values.get(k), setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) } };
  vm.runInNewContext(`${code}; restoreActiveSellerSession();`, context);
  assert.equal(context.activeSellerId, 'seller');
  assert.equal(values.get('last'), saved);
  context.activeSellerId = '';
  values.set('last', String(Date.now() - 3600001));
  vm.runInNewContext('restoreActiveSellerSession();', context);
  assert.equal(context.activeSellerId, '');
  assert.equal(values.has('token'), false);
});
