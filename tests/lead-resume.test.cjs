const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync('public/lead-workspace.js', 'utf8');

test('returning to an open DB panel reloads once without interrupting edits', () => {
  const body = source.match(/const resume = \(\) => \{([\s\S]*?)\n    \};/)[1];
  const state = { document: { hidden: false, querySelector: () => ({ classList: { contains: () => true } }) }, root: { hidden: false }, dialog: { open: false }, loading: false };
  let calls = 0;
  state.load = () => { calls++; state.loading = true; };
  vm.runInNewContext(`resume = () => {${body}}`, state);
  state.resume(); state.resume(); assert.equal(calls, 1);
  state.loading = false; state.dialog.open = true; state.resume(); assert.equal(calls, 1);
  state.dialog.open = false; state.root.hidden = true; state.resume(); assert.equal(calls, 1);
  state.root.hidden = false; state.document.hidden = true; state.resume(); assert.equal(calls, 1);
  assert.match(source, /rows = data.rows; render\(\);\s+if \(!admin\) document.dispatchEvent\(new Event\('lead-workspace-updated'\)\)/);
});
