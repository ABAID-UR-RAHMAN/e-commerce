// src/api/users.js
const express = require('express');
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Current user profile
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const acc = await getDb().collection('accounts').findOne({ email: req.user.email });
    if (!acc) return res.status(404).json({ error: 'User not found' });
    const safe = {
      firstName: acc.firstName,
      lastName: acc.lastName,
      email: acc.email,
      role: acc.role,
      preferences: acc.preferences || { newsletter: true, productAlerts: true }
    };
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

// Update current user profile & preferences
router.put('/me', authMiddleware, async (req, res, next) => {
  try {
    const { firstName, lastName, preferences } = req.body;
    const updates = {};
    if (firstName) updates.firstName = String(firstName).trim();
    if (lastName) updates.lastName = String(lastName).trim();
    if (preferences && typeof preferences === 'object') {
      updates.preferences = preferences;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    const accounts = getDb().collection('accounts');
    await accounts.updateOne({ email: req.user.email }, { $set: updates });
    
    const updated = await accounts.findOne({ email: req.user.email });
    res.json({
      ok: true,
      account: {
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        role: updated.role,
        preferences: updated.preferences
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get seller stats (listings count, revenue, sales count)
router.get('/seller/stats', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Seller access required' });
    }
    const email = req.user.email;
    const db = getDb();
    
    const productsCount = await db.collection('products').countDocuments({ seller: email });
    const invoices = await db.collection('invoices').find({ seller: email }).toArray();
    
    let totalRevenue = 0;
    let itemsSold = 0;
    invoices.forEach(inv => {
      totalRevenue += (inv.total || 0);
      itemsSold += (inv.items ? inv.items.reduce((acc, it) => acc + (it.qty || 1), 0) : 1);
    });

    res.json({
      ok: true,
      stats: {
        productsCount,
        ordersCount: invoices.length,
        itemsSold,
        totalRevenue
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
