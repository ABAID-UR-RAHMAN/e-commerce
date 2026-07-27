// src/api/notifications.js
const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Notifications list (user-scoped or global)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const notes = await getDb().collection('notifications').find({
      $or: [{ to: req.user.email }, { to: { $exists: false } }]
    }).sort({ createdAt: -1 }).toArray();
    res.json(notes);
  } catch (err) {
    next(err);
  }
});

// Mark notification read
router.put('/:id/read', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID' });
    await getDb().collection('notifications').updateOne({ _id: new ObjectId(id) }, { $set: { unread: false } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
