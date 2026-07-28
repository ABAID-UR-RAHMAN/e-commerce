// src/api/seller.js
const express = require('express');
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get stats for the logged-in seller
router.get('/stats', authMiddleware, async (req, res, next) => {
  if (req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const db = getDb();
    const sellerEmail = req.user.email;
    
    const productsCount = await db.collection('products').countDocuments({ seller: sellerEmail });
    const sellerInvoices = await db.collection('invoices').find({ seller: { $regex: new RegExp(sellerEmail) } }).toArray();
    const ordersCount = sellerInvoices.length;
    const totalRevenue = sellerInvoices.reduce((sum, inv) => sum + inv.total, 0);

    res.json({
      ok: true,
      stats: { productsCount, ordersCount, totalRevenue }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;