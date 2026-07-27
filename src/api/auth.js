// src/api/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');
const { JWT_SECRET } = require('../config/jwt');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Auth: signup
router.post('/signup', async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const validRoles = ['buyer', 'seller'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Role must be buyer or seller' });
    }

    const accounts = getDb().collection('accounts');
    const existingAccount = await accounts.findOne({ email: cleanEmail });
    if (existingAccount) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const account = {
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email: cleanEmail,
      password: hashedPassword,
      role,
      preferences: { newsletter: true, productAlerts: true },
      createdAt: new Date().toISOString()
    };

    const result = await accounts.insertOne(account);
    const token = jwt.sign(
      { email: account.email, role: account.role, id: result.insertedId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('ecotoken', token, { httpOnly: true, sameSite: 'lax' });
    res.json({
      ok: true,
      token,
      account: {
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        role: account.role
      }
    });
  } catch (err) {
    next(err);
  }
});

// Auth: login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const accounts = getDb().collection('accounts');
    const account = await accounts.findOne({ email: cleanEmail });
    if (!account) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, account.password);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { email: account.email, role: account.role, id: account._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('ecotoken', token, { httpOnly: true, sameSite: 'lax' });
    res.json({
      ok: true,
      token,
      account: {
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        role: account.role
      }
    });
  } catch (err) {
    next(err);
  }
});

// Auth: logout
router.post('/logout', (req, res) => {
  res.clearCookie('ecotoken');
  res.json({ ok: true });
});

module.exports = router;
