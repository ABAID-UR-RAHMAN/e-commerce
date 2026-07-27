// src/config/database.js
const { MongoClient } = require('mongodb');
const { MemoryDatabase } = require('./memoryDb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ecoshop';

let client;
let db;
let isMemoryFallback = false;

async function initIndexes(database) {
  try {
    await database.collection('accounts').createIndex({ email: 1 }, { unique: true });
    await database.collection('products').createIndex({ title: 'text', description: 'text', category: 'text' });
    await database.collection('invoices').createIndex({ buyer: 1 });
    await database.collection('invoices').createIndex({ seller: 1 });
    await database.collection('messages').createIndex({ to: 1, from: 1 });
  } catch (err) {
    console.warn('⚠️ Index initialization warning:', err.message);
  }
}

async function connectToDatabase(retries = 1) {
  if (db) return db;

  while (retries > 0) {
    try {
      client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 1000 });
      await client.connect();
      db = client.db();
      isMemoryFallback = false;
      await initIndexes(db);
      console.log(`✓ Connected to MongoDB at ${MONGO_URI}`);
      return db;
    } catch (err) {
      retries--;
      if (retries === 0) {
        console.warn('⚠️ Standalone MongoDB server not reachable. Initializing high-performance MemoryDatabase fallback...');
        db = new MemoryDatabase();
        isMemoryFallback = true;
        await initIndexes(db);

        // Auto-seed initial demo data in memory mode
        const { seed } = require('../utils/seed');
        await seed(db);
        console.log('✓ In-memory database initialized and seeded.');
        return db;
      }
    }
  }
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
  }
  db = null;
  isMemoryFallback = false;
}

module.exports = { connectToDatabase, getDb, closeDatabase };
