const jwt = require('jsonwebtoken');
const { isRevoked } = require('./revocation');

function authenticate(req, res, next) {
  // Token arrives as: Authorization: Bearer eyJhbGc...
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Reject tokens that have been explicitly revoked (see /auth/logout).
    if (isRevoked(decoded.jti)) {
      return res.status(401).json({ error: 'Token revoked' });
    }

    req.user = decoded; // { userId: 1, email: "user@example.com", jti: "..." }
    next();             // hand control to the route handler
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authenticate;
