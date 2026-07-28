// src/api/invoices.js
const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get user invoices (where user is buyer or seller)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userInvoices = await getDb().collection('invoices').find({
      $or: [{ buyer: req.user.email }, { seller: req.user.email }]
    }).sort({ createdAt: -1 }).toArray();
    res.json(userInvoices);
  } catch (err) {
    next(err);
  }
});

// Get a single invoice by its ID
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid invoice ID format' });
    }
    const invoice = await getDb().collection('invoices').findOne({ _id: new ObjectId(id) });
    if (!invoice || (invoice.buyer !== req.user.email && !invoice.seller.includes(req.user.email))) {
      return res.status(404).json({ error: 'Invoice not found or access denied' });
    }
    res.json(invoice);
  } catch (err) {
    next(err);
  }
});

// Create checkout invoice
router.post('/checkout', authMiddleware, async (req, res, next) => {
  try {
    const { items } = req.body; // expect [{id, qty}]
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'No items provided in cart' });
    }

    const productsCollection = getDb().collection('products');
    let total = 0;
    const lineItems = [];
    const sellersSet = new Set();

    for (const it of items) {
      if (!it.id || !ObjectId.isValid(it.id)) {
        return res.status(400).json({ error: `Invalid product ID: ${it.id}` });
      }
      const qty = Number(it.qty) || 1;
      if (qty <= 0) return res.status(400).json({ error: 'Quantity must be positive' });

      const p = await productsCollection.findOne({ _id: new ObjectId(it.id) });
      if (!p) return res.status(400).json({ error: `Product not found: ${it.id}` });

      lineItems.push({
        id: p._id.toString(),
        name: p.title,
        qty,
        price: p.price,
        seller: p.seller
      });

      if (p.seller) sellersSet.add(p.seller);
      total += p.price * qty;
    }

    const invoiceId = `INV-${Math.floor(Math.random() * 90000 + 10000)}`;
    const inv = {
      id: invoiceId,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date(),
      status: 'Paid',
      total,
      buyer: req.user.email,
      seller: Array.from(sellersSet).join(', ') || 'EcoShop Marketplace',
      items: lineItems
    };

    const db = getDb();
    const result = await db.collection('invoices').insertOne(inv);

    // Create notification for buyer
    await db.collection('notifications').insertOne({
      to: req.user.email,
      title: 'Order Confirmed',
      detail: `Your order ${invoiceId} totaling $${total.toFixed(2)} has been placed successfully.`,
      time: 'Just now',
      unread: true,
      createdAt: new Date()
    });

    res.json({ ok: true, invoice: { ...inv, _id: result.insertedId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
