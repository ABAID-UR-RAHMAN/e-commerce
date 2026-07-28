// src/api/stats.js
const express = require('express');
const { getDb } = require('../config/database');

const router = express.Router();

// Get global platform stats
router.get('/', async (req, res, next) => {
  try {
    const db = getDb();
    const accountsCount = await db.collection('accounts').countDocuments();
    const productsCount = await db.collection('products').countDocuments();
    const invoices = await db.collection('invoices').find({}).toArray();
    
    const ordersCount = invoices.length;
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);

    res.json({
      ok: true,
      stats: {
        users: accountsCount,
        products: productsCount,
        orders: ordersCount,
        revenue: totalRevenue
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;