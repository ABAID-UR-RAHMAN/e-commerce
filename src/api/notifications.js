// src/api/notifications.js
const express = require('express');
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get notifications for the current user
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const db = getDb();
    // Find notifications for this user OR global notifications (no 'to' field)
    const notifications = await db.collection('notifications').find({
      $or: [{ to: req.user.email }, { to: { $exists: false } }]
    }).sort({ createdAt: -1 }).toArray();
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

module.exports = router;