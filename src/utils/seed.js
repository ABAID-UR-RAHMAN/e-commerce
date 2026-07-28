// src/utils/seed.js
const bcrypt = require('bcrypt');
const { connectToDatabase, getDb, closeDatabase } = require('../config/database');

async function seed(existingDb = null) {
  console.log('🌱 Starting database seeding...');
  let db = existingDb;
  let closeWhenDone = false;

  if (!db) {
    await connectToDatabase();
    db = getDb();
    closeWhenDone = true;
  }

  const accountsColl = db.collection('accounts');
  const productsColl = db.collection('products');
  const notesColl = db.collection('notifications');

  // Hashed password for demo accounts ("Password123!")
  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  const initialProducts = [
    {
      title: 'Aurora Pro Graphic Tablet',
      category: 'Electronics',
      price: 289,
      availability: 'In stock',
      seller: 'aria@demo.com',
      rating: 4.9,
      description: 'Lightweight drawing tablet with 8192 levels of pressure sensitivity, wireless pro stylus, and true color display. Ideal for digital artists and designers.',
      tags: ['Featured', 'Popular', 'Tech'],
      createdAt: new Date()
    },
    {
      title: 'Luxe Ergonomic Leather Backpack',
      category: 'Fashion',
      price: 149,
      availability: 'In stock',
      seller: 'voyage@demo.com',
      rating: 4.7,
      description: 'Handcrafted full-grain leather travel backpack featuring waterproof laptop compartment, USB charging port, and breathable back padding.',
      tags: ['Best seller', 'Travel', 'Leather'],
      createdAt: new Date()
    },
    {
      title: 'SonicWave Noise Cancelling Headphones',
      category: 'Electronics',
      price: 199,
      availability: 'In stock',
      seller: 'aria@demo.com',
      rating: 4.8,
      description: 'Studio-grade acoustic wireless headphones with active noise cancellation, 40-hour battery life, and crisp spatial audio surround sound.',
      tags: ['Audio', 'Wireless', 'Premium'],
      createdAt: new Date()
    },
    {
      title: 'EcoSmart Stainless Steel Water Bottle',
      category: 'Home & Living',
      price: 34,
      availability: 'In stock',
      seller: 'voyage@demo.com',
      rating: 4.6,
      description: 'Double-wall vacuum insulated water bottle that keeps beverages cold for 24 hours or hot for 12 hours. BPA-free powder-coated steel finish.',
      tags: ['Eco-friendly', 'Fitness'],
      createdAt: new Date()
    },
    {
      title: 'Minimalist Mechanical Keyboard',
      category: 'Electronics',
      price: 129,
      availability: 'In stock',
      seller: 'aria@demo.com',
      rating: 4.9,
      description: 'Hot-swappable RGB mechanical keyboard with custom lubricated switches, solid aluminum chassis, and dual Bluetooth/Type-C connectivity.',
      tags: ['Gaming', 'Workstation', 'Popular'],
      createdAt: new Date()
    }
  ];

  for (const prod of initialProducts) {
    const exists = await productsColl.findOne({ title: prod.title });
    if (!exists) {
      await productsColl.insertOne(prod);
      console.log(`  ✓ Product added: ${prod.title}`);
    }
  }

  const initialNotes = [
    {
      title: 'Welcome to EcoShop',
      detail: 'Your multi-vendor e-commerce workspace is fully operational.',
      time: 'Just now',
      unread: true,
      createdAt: new Date()
    },
    {
      title: 'Special Promotion',
      detail: 'Free worldwide shipping available on all orders over $100 this week.',
      time: '2 hours ago',
      unread: true,
      createdAt: new Date()
    }
  ];

  for (const note of initialNotes) {
    const exists = await notesColl.findOne({ title: note.title });
    if (!exists) {
      await notesColl.insertOne(note);
    }
  }

  console.log('✅ Database seeding complete.');
  if (closeWhenDone) {
    await closeDatabase();
  }
}

if (require.main === module) {
  seed().catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
}

module.exports = { seed };
