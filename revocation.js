// In-memory denylist of revoked JWT IDs (jti).
//
// JWTs are stateless, so "logout" can't invalidate a token by itself — instead
// we record the token's jti here and reject it at the auth middleware.
//
// Caveats (single-instance only):
//  - Entries are lost on process restart (revoked tokens become valid again,
//    but only until they expire naturally via their `exp` claim).
//  - Not shared across multiple server instances. For horizontal scaling, back
//    this with Redis or a shared DB table keyed by jti.

const revoked = new Map(); // jti (string) -> expiry (epoch ms)

function revoke(jti, expSeconds) {
  if (typeof jti !== 'string' || !expSeconds) return;
  revoked.set(jti, expSeconds * 1000);
}

function isRevoked(jti) {
  return typeof jti === 'string' && revoked.has(jti);
}

function prune() {
  const now = Date.now();
  for (const [jti, exp] of revoked) {
    if (exp <= now) revoked.delete(jti);
  }
}

function startCleanup(intervalMs = 60 * 60 * 1000) {
  return setInterval(prune, intervalMs);
}

module.exports = { revoke, isRevoked, prune, startCleanup };
