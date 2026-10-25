const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');

test('partner routes load the neutral palette and bottom contact control', () => {
  const root = path.join(__dirname, '../public');
  for (const file of ['seller/index.html', 'seller/register/index.html']) {
    const html = readFileSync(path.join(root, file), 'utf8');
    for (const sheet of ['partner-console-ui', 'seller-register-ui', 'seller-workspace']) {
      assert.ok(html.includes(`${sheet}.css?v=${sheet === 'partner-console-ui' ? '20261025-chat-safe' : '20261025-stone'}`));
    }
  }
  const css = readFileSync(path.join(root, 'partner-console-ui.css'), 'utf8');
  assert.match(css, /--primary: #363635/);
  assert.match(css, /\.kakao-floating-btn \{ position: fixed; top: auto/);
  assert.match(css, /bottom: calc\(82px \+ env\(safe-area-inset-bottom/);
  for (const file of ['partner-console-ui.css', 'seller-register-ui.css', 'seller-workspace.css']) {
    assert.doesNotMatch(readFileSync(path.join(root, file), 'utf8'), /#173e65|#123b67|#137e89/);
  }
});

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
