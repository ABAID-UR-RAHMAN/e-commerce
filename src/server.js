// EcoShop Production Backend
// Express.js server with JWT auth, product management, invoicing, and messaging.
// Data is persisted in MongoDB.

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { connectToDatabase } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');

const PORT = process.env.PORT || 3000;
const app = express();

// Security and Rate Limiting
app.use(helmet({
  contentSecurityPolicy: false // Allow static assets & external images/gifs
}));
app.use(cors({ origin: true, credentials: true }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

app.use('/api/', apiLimiter);
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
const authRouter = require('./api/auth');
app.use('/api', authRouter);

const productsRouter = require('./api/products');
app.use('/api/products', productsRouter);

const messagesRouter = require('./api/messages');
app.use('/api/messages', messagesRouter);

const notificationsRouter = require('./api/notifications');
app.use('/api/notifications', notificationsRouter);

const invoicesRouter = require('./api/invoices');
app.use('/api/invoices', invoicesRouter);

const usersRouter = require('./api/users');
app.use('/api', usersRouter);

// Serve README
app.get('/readme', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'README.html'));
});

// Global Error Handler
app.use(errorHandler);

// Start server if main module
if (require.main === module) {
  connectToDatabase()
    .then(() => {
      app.listen(PORT, () => console.log(`✓ EcoShop backend listening on http://localhost:${PORT}`));
    })
    .catch(err => {
      console.error('✗ Failed to connect to MongoDB', err);
      process.exit(1);
    });
}

module.exports = app;
