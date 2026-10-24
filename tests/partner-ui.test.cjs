const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');

test('seller routes no longer load or generate the onboarding modal', () => {
  const root = path.join(__dirname, '../public');
  for (const file of ['seller/index.html', 'seller/register/index.html']) {
    const html = readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(html, /page-guide\.js|pageGuideModal|guide-seller-preview/);
    assert.match(html, /name="branch" placeholder="예: 강남점"/);
    assert.doesNotMatch(html, /placeholder="예: 성서점"/);
    assert.match(html, /id="sellerRegisterForm"/);
  }
  assert.equal(existsSync(path.join(root, 'page-guide.js')), false);
});
