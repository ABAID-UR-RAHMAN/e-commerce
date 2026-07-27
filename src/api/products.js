// src/api/products.js
const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Products: list all with optional category / search query
router.get('/', async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const query = {};
    if (category) {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    const products = await getDb().collection('products').find(query).sort({ createdAt: -1 }).toArray();
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// Products: get single product
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid product ID format' });
    const product = await getDb().collection('products').findOne({ _id: new ObjectId(id) });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// Products: create (seller only)
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;
    if (user.role !== 'seller') return res.status(403).json({ error: 'Forbidden: sellers only' });
    const { title, category, price, availability, description, tags } = req.body;
    if (!title || !category || price === undefined || !description) {
      return res.status(400).json({ error: 'Missing required product fields' });
    }
    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    const products = getDb().collection('products');
    const product = {
      title: String(title).trim(),
      category: String(category).trim(),
      price: numericPrice,
      availability: availability || 'In stock',
      seller: user.email,
      rating: 4.8,
      description: String(description).trim(),
      tags: Array.isArray(tags) ? tags : ['Seller listing'],
      createdAt: new Date()
    };

    const result = await products.insertOne(product);
    res.json({ ok: true, product: { ...product, _id: result.insertedId } });
  } catch (err) {
    next(err);
  }
});

// Products: update (seller, must be owner)
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;
    if (user.role !== 'seller') return res.status(403).json({ error: 'Forbidden: sellers only' });

    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid product ID' });

    const productsColl = getDb().collection('products');
    const existing = await productsColl.findOne({ _id: new ObjectId(id) });
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    if (existing.seller !== user.email) return res.status(403).json({ error: 'Unauthorized to edit this product' });

    const { title, category, price, availability, description, tags } = req.body;
    const updates = {};
    if (title) updates.title = String(title).trim();
    if (category) updates.category = String(category).trim();
    if (price !== undefined) {
      const p = Number(price);
      if (isNaN(p) || p <= 0) return res.status(400).json({ error: 'Price must be a positive number' });
      updates.price = p;
    }
    if (availability) updates.availability = String(availability);
    if (description) updates.description = String(description).trim();
    if (Array.isArray(tags)) updates.tags = tags;
    updates.updatedAt = new Date();

    await productsColl.updateOne({ _id: new ObjectId(id) }, { $set: updates });
    const updated = await productsColl.findOne({ _id: new ObjectId(id) });
    res.json({ ok: true, product: updated });
  } catch (err) {
    next(err);
  }
});

// Products: delete (seller, must be owner)
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const user = req.user;
    if (user.role !== 'seller') return res.status(403).json({ error: 'Forbidden: sellers only' });

    const { id } = req.params;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid product ID' });

    const productsColl = getDb().collection('products');
    const existing = await productsColl.findOne({ _id: new ObjectId(id) });
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    if (existing.seller !== user.email) return res.status(403).json({ error: 'Unauthorized to delete this product' });

    await productsColl.deleteOne({ _id: new ObjectId(id) });
    res.json({ ok: true, message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
