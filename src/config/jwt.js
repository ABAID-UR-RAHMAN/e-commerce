// src/config/jwt.js
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

module.exports = { JWT_SECRET };
