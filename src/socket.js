// src/socket.js
const { Server } = require('socket.io');
const { getDb } = require('./config/database');
const { ObjectId } = require('mongodb');

const { carts } = require('./store');
let productsCache = [];

async function cacheProducts() {
  try {
    const products = await getDb().collection('products').find({}).toArray();
    console.log('✓ Products cached');
    return products;
  } catch (error) {
    console.error('✗ Failed to cache products', error);
    return [];
  }
}

function initSocket(server, productsCache) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join-room', (room) => {
      console.log(`User ${socket.id} joined room ${room}`);
      socket.join(room);
      // Extract user ID from room name and attach to socket
      const userId = room.split('-')[1];
      socket.userId = userId;
      // If user has no cart, create one
      if (userId && !carts[userId]) {
        carts[userId] = [];
      }
      // Emit initial cart state
      socket.emit('cart-updated', carts[userId] || []);
    });

    socket.on('add-to-cart', async ({ productId }) => {
      if (!socket.userId) return;
      const cart = carts[socket.userId];
      const product = productsCache.find(p => p._id.toString() === productId);

      if (product) {
        const existing = cart.find(i => i.id === productId);
        if (existing) {
          existing.qty += 1;
        } else {
          cart.push({ id: product._id, title: product.title, price: product.price, qty: 1 });
        }
        io.to(`user-${socket.userId}`).emit('cart-updated', cart);
      }
    });

    socket.on('remove-from-cart', ({ idx }) => {
      if (!socket.userId) return;
      const cart = carts[socket.userId];
      if (cart && cart[idx]) {
        cart.splice(idx, 1);
        io.to(`user-${socket.userId}`).emit('cart-updated', cart);
      }
    });

    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
  });

  return io;
}

module.exports = { initSocket, cacheProducts };
