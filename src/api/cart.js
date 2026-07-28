// src/api/cart.js
const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const { carts } = require('../store');

// Get user's cart
router.get('/cart', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const cart = carts[userId] || [];
  res.json({ ok: true, cart });
});

module.exports = router;
