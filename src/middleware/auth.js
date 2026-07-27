// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');

function authMiddleware(req, res, next) {
  const token = req.cookies['ecotoken'] || req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { authMiddleware };
