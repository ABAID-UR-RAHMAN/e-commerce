// src/api/messages.js
const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get messages for current user
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const messages = await getDb().collection('messages').find({
      $or: [{ to: req.user.email }, { from: req.user.email }, { to: { $exists: false } }]
    }).sort({ createdAt: -1, date: -1 }).toArray();
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// Post a message
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Recipient, subject, and body are required' });
    }

    const messages = getDb().collection('messages');
    const msg = {
      from: req.user.email,
      to: String(to).trim().toLowerCase(),
      subject: String(subject).trim(),
      preview: String(body).slice(0, 120),
      body: String(body).trim(),
      unread: true,
      date: new Date().toISOString(),
      createdAt: new Date()
    };

    const result = await messages.insertOne(msg);
    res.json({ ok: true, msg: { ...msg, _id: result.insertedId } });
  } catch (err) {
    next(err);
  }
});

// Mark message as read
router.put('/:id/read', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID' });
    await getDb().collection('messages').updateOne({ _id: new ObjectId(id) }, { $set: { unread: false } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
