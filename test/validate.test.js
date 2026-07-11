const test = require('node:test');
const assert = require('node:assert');
const { isValidCity, normalizeTitle, isValidTitle, isValidStatus, TASK_STATUSES, MAX_TITLE } = require('../validate');

test('isValidCity: accepts real names, rejects junk and empty', () => {
  assert.strictEqual(isValidCity('London'), true);
  assert.strictEqual(isValidCity('São Paulo'), true);
  assert.strictEqual(isValidCity('New York'), true);
  assert.strictEqual(isValidCity(''), false);
  assert.strictEqual(isValidCity('   '), false);
  assert.strictEqual(isValidCity('London<script>'), false);
  assert.strictEqual(isValidCity(undefined), false);
});

test('normalizeTitle trims and coerces non-strings', () => {
  assert.strictEqual(normalizeTitle('  hi  '), 'hi');
  assert.strictEqual(normalizeTitle(123), '');
  assert.strictEqual(normalizeTitle(undefined), '');
});

test('isValidTitle enforces presence and max length', () => {
  assert.strictEqual(isValidTitle('ok'), true);
  assert.strictEqual(isValidTitle('   '), false);
  assert.strictEqual(isValidTitle('a'.repeat(MAX_TITLE)), true);
  assert.strictEqual(isValidTitle('a'.repeat(MAX_TITLE + 1)), false);
});

test('isValidStatus only allows the known set', () => {
  for (const s of TASK_STATUSES) assert.strictEqual(isValidStatus(s), true);
  assert.strictEqual(isValidStatus('done'), false);
  assert.strictEqual(isValidStatus(''), false);
});
