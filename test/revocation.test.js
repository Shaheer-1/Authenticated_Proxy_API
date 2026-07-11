const test = require('node:test');
const assert = require('node:assert');
const { revoke, isRevoked, prune } = require('../revocation');

test('revoke makes a jti revoked', () => {
  revoke('jti-1', Math.floor(Date.now() / 1000) + 3600);
  assert.strictEqual(isRevoked('jti-1'), true);
});

test('unknown and missing jti are not revoked', () => {
  assert.strictEqual(isRevoked('does-not-exist'), false);
  assert.strictEqual(isRevoked(undefined), false);
  assert.strictEqual(isRevoked(null), false);
});

test('prune drops expired entries', () => {
  revoke('jti-expired', Math.floor(Date.now() / 1000) - 10);
  prune();
  assert.strictEqual(isRevoked('jti-expired'), false);
});
