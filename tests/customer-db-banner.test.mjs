import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import worker from '../src/index.js';

test('banner links to checkout with responsive uncropped artwork', () => {
  const html = readFileSync(new URL('../public/seller/index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../public/customer-db-banner.css', import.meta.url), 'utf8');
  assert.match(html, /class="customer-db-banner" href="\/db-checkout"/);
  assert.match(html, /customer-db-banner.css\?v=20261027-db-inventory/);
  assert.match(css, /width: min\(100%, 660px\)/);
  assert.match(css, /margin: 0 auto 24px/);
  assert.doesNotMatch(html, /db-banner-copy|db-banner-action/);
  assert.match(html, /customer-db-banner-complete-v3.png/);
  assert.ok(existsSync(new URL('../public/assets/customer-db-banner-complete-v3.png', import.meta.url)));
  assert.match(css, /object-fit: contain/);
  assert.ok(html.indexOf('class="customer-db-banner"') < html.indexOf('<h2>견적 관리</h2>'));
  assert.match(css, /\(hover: hover\) and \(pointer: fine\)/);
  assert.match(css, /max-width: 760px/);
  assert.ok(existsSync(new URL('../public/assets/customer-db-banner-v1.png', import.meta.url)));
  assert.doesNotMatch(css, /is-active\) \.customer-db-banner \{ display: none|seller-mobile-detail-open \.customer-db-banner/);
  for (const file of ['seller/index.html', 'seller/register/index.html']) {
    const page = readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8');
    assert.match(page, /class="customer-db-banner"/);
    assert.match(page, /data-lead-inventory/);
    assert.match(page, /db-banner-fallback/);
    assert.match(page, /lead-availability.js\?v=20261027-db-inventory/);
  }
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /pageHead.hidden = isLeadsTab/);
  assert.match(app, /pageHead.hidden = false/);
});

test('banner destination is served by the partner Worker without stale cache', async () => {
  let asset;
  const response = await worker.fetch(new Request('https://partner.ga-pick.com/db-checkout'), {
    ASSETS: { fetch: async request => { asset = new URL(request.url).pathname; return new Response('checkout'); } },
  });
  assert.equal(asset, '/db-checkout/index.html');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-GA-Pick-Partner-Route-Version'), '20261025-customer-db-banner');
});
