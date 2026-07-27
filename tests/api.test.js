const request = require('supertest');
const app = require('../src/server');
const { connectToDatabase, closeDatabase, getDb } = require('../src/config/database');

jest.setTimeout(30000);

describe('EcoShop Production API Tests', () => {
  let db;
  let buyerToken;
  let sellerToken;
  let testProductId;

  beforeAll(async () => {
    try {
      db = await connectToDatabase();
      // Clean test collections
      await db.collection('accounts').deleteMany({ email: /@test\.com$/ });
      await db.collection('products').deleteMany({ seller: /@test\.com$/ });
      await db.collection('invoices').deleteMany({ buyer: /@test\.com$/ });
    } catch (err) {
      console.warn('MongoDB connection not available for test run, skipping DB setup:', err.message);
    }
  }, 30000);

  afterAll(async () => {
    try {
      if (db) {
        await db.collection('accounts').deleteMany({ email: /@test\.com$/ });
        await db.collection('products').deleteMany({ seller: /@test\.com$/ });
        await db.collection('invoices').deleteMany({ buyer: /@test\.com$/ });
      }
      await closeDatabase();
    } catch (e) {
      // ignore
    }
  }, 30000);

  describe('Health Check', () => {
    test('GET /health should return 200 OK', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('ok');
    });
  });

  describe('Authentication API', () => {
    test('POST /api/signup - create seller account', async () => {
      const res = await request(app)
        .post('/api/signup')
        .send({
          firstName: 'Test',
          lastName: 'Seller',
          email: 'seller@test.com',
          password: 'Password123!',
          role: 'seller'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.account.email).toEqual('seller@test.com');
      sellerToken = res.body.token;
    });

    test('POST /api/signup - create buyer account', async () => {
      const res = await request(app)
        .post('/api/signup')
        .send({
          firstName: 'Test',
          lastName: 'Buyer',
          email: 'buyer@test.com',
          password: 'Password123!',
          role: 'buyer'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.account.email).toEqual('buyer@test.com');
      buyerToken = res.body.token;
    });

    test('POST /api/login - login existing account', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'seller@test.com',
          password: 'Password123!'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    test('POST /api/login - reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'seller@test.com',
          password: 'WrongPassword'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('Products API', () => {
    test('GET /api/products - list products', async () => {
      const res = await request(app).get('/api/products');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('POST /api/products - seller can create product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Test Pro Tablet',
          category: 'Electronics',
          price: 299,
          availability: 'In stock',
          description: 'A test high quality tablet'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.product._id).toBeDefined();
      testProductId = res.body.product._id;
    });

    test('POST /api/products - buyer cannot create product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          title: 'Illegal Buyer Product',
          category: 'Electronics',
          price: 100,
          description: 'Should be rejected'
        });

      expect(res.statusCode).toEqual(403);
    });

    test('PUT /api/products/:id - seller can update owned product', async () => {
      if (!testProductId) return;
      const res = await request(app)
        .put(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Updated Test Pro Tablet',
          price: 349
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.product.price).toEqual(349);
    });

    test('DELETE /api/products/:id - seller can delete owned product', async () => {
      if (!testProductId) return;
      const res = await request(app)
        .delete(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('User Profile API', () => {
    test('GET /api/me - fetch current profile', async () => {
      const res = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.email).toEqual('buyer@test.com');
    });

    test('PUT /api/me - update current profile', async () => {
      const res = await request(app)
        .put('/api/me')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          firstName: 'UpdatedFirstName',
          preferences: { newsletter: false, productAlerts: true }
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.account.firstName).toEqual('UpdatedFirstName');
    });
  });
});
