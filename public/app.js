// Frontend API-driven app.js - Professional E-Commerce Platform
let CURRENT_USER = null;
let CART = [];
const socket = io();

socket.on('connect', () => {
  console.log('Connected to socket server');
});

socket.on('cart-updated', (updatedCart) => {
  console.log('Cart updated received', updatedCart);
  CART = updatedCart;
  renderNavStatus();
  if (['buyer', 'cart'].includes(document.body.dataset.page)) {
    renderCartSummary();
  }
});

async function fetchCart() {
  if (!CURRENT_USER) return;
  try {
    const res = await api('/cart');
    if (res.ok) {
      CART = res.cart;
      renderNavStatus();
    }
  } catch (error) {
    console.error('Failed to fetch cart', error);
  }
}

async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  return res.json();
}

function formatCurrency(v) { return `$${Number(v).toFixed(2)}`; }

function showMessage(target, message, type = 'success') {
  const container = document.querySelector(target);
  if (!container) return;
  const isOk = type === 'success';
  container.innerHTML = `
    <div class="card" style="border-left: 4px solid ${isOk ? 'var(--emerald)' : 'var(--danger)'}; background: ${isOk ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}">
      <strong>${isOk ? '✓ Success' : '✗ Error'}:</strong> ${message}
    </div>`;
  setTimeout(() => { container.innerHTML = ''; }, 5200);
}

// Modal Popup System
function openModal(title, bodyHtml) {
  let modalOverlay = document.querySelector('#global-modal');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'global-modal';
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h3 id="modal-title"></h3>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div id="modal-body"></div>
      </div>
    `;
    document.body.appendChild(modalOverlay);
  }
  document.querySelector('#modal-title').textContent = title;
  document.querySelector('#modal-body').innerHTML = bodyHtml;
  modalOverlay.classList.add('active');
}

function closeModal() {
  const modalOverlay = document.querySelector('#global-modal');
  if (modalOverlay) modalOverlay.classList.remove('active');
}

function getProductEmoji(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('electr') || cat.includes('tech')) return '💻';
  if (cat.includes('fash') || cat.includes('cloth')) return '🎒';
  if (cat.includes('home') || cat.includes('liv')) return '🏠';
  if (cat.includes('audio') || cat.includes('sound')) return '🎧';
  return '🛍️';
}

async function refreshCurrentUser() {
  try {
    const me = await api('/me');
    if (!me || me.error) {
      CURRENT_USER = null;
    } else {
      CURRENT_USER = me;
      socket.emit('join-room', `user-${me.id}`);
    }
  } catch (e) {
    CURRENT_USER = null;
  }
  await fetchCart();
  renderNavStatus();
}

function renderNavStatus() {
  const status = document.querySelector('#nav-user-status');
  const buyerCount = document.querySelector('#nav-cart-count');
  const accountBtn = document.querySelector('[href*="account.html"]') || document.querySelector('a[data-nav-account]');
  
  if (status) {
    status.textContent = CURRENT_USER ? `${CURRENT_USER.firstName} ${CURRENT_USER.lastName}` : 'Guest';
  }
  if (buyerCount) {
    const totalCount = CART.reduce((s, i) => s + (i.qty || 0), 0);
    buyerCount.textContent = totalCount;
  }
  
  if (accountBtn) {
    if (CURRENT_USER) {
      accountBtn.textContent = 'Dashboard';
      accountBtn.href = 'account.html';
    } else {
      accountBtn.textContent = 'Sign In';
      accountBtn.href = 'login.html';
    }
  }
}

function renderProductCards(products, containerSelector, showActions = true) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  if (!products.length) {
    container.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align:center;"><p>No products available matching criteria.</p></div>`;
    return;
  }

  container.innerHTML = products.map(product => `
    <article class="product-card fade-in in-view">
      <div>
        <div class="product-image-container">
          ${getProductEmoji(product.category)}
        </div>
        <div class="tag-row" style="margin-top: 0.85rem;">
          <span class="badge">${product.category}</span>
          <span style="color: var(--amber); font-weight: 600;">★ ${product.rating || 4.8}</span>
        </div>
        <h4>${product.title}</h4>
        <p>${product.description}</p>
      </div>
      <div>
        <div class="product-meta" style="margin: 0.85rem 0;">
          <span class="price">${formatCurrency(product.price)}</span>
          <small class="badge ${product.availability === 'In stock' ? 'success' : 'amber'}">${product.availability || 'In stock'}</small>
        </div>
        <div class="product-footer" style="margin-bottom: 0.85rem; font-size: 0.85rem; color: var(--muted);">
          <small>Seller: ${product.seller}</small>
        </div>
        ${showActions ? `
        <div class="product-actions">
e          <a href="product.html?id=${product._id}" class="secondary-button">Details</a>
          <button class="primary-button" type="button" onclick="buyProduct('${product._id}')">Add to cart</button>
        </div>` : ''}
      </div>
    </article>
  `).join('');
}

async function buyProduct(productId) {
  if (!CURRENT_USER || CURRENT_USER.role !== 'buyer') {
    // Redirect to login but remember where to come back to
    window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return;
  }
  socket.emit('add-to-cart', { productId });
  const products = await api('/products');
  const product = products.find(p => p._id === productId);
  if (product) {
    showMessage('#page-feedback', `${product.title} added to cart!`);
  }
}

async function initMarketplacePage() {
  await refreshCurrentUser();
  const products = await api('/products');
  
  // Attach Filter listeners if filter bar exists
  const catSelect = document.querySelector('#filter-category');
  const sortSelect = document.querySelector('#filter-sort');

  function applyFilters() {
    let list = [...products];
    if (catSelect && catSelect.value) {
      list = list.filter(p => p.category === catSelect.value);
    }
    if (sortSelect) {
      if (sortSelect.value === 'price-low') list.sort((a,b) => a.price - b.price);
      if (sortSelect.value === 'price-high') list.sort((a,b) => b.price - a.price);
      if (sortSelect.value === 'rating') list.sort((a,b) => (b.rating||0) - (a.rating||0));
    }
    renderProductCards(list, '#marketplace-products');
  }

  if (catSelect) catSelect.addEventListener('change', applyFilters);
  if (sortSelect) sortSelect.addEventListener('change', applyFilters);

  renderProductCards(products, '#marketplace-products');
  initHomepageStats();
}

async function initHomepageStats() {
  try {
    const res = await api('/stats');
    if (res && res.ok) {
      const { users, products, orders, revenue } = res.stats;
      const usersEl = document.querySelector('#global-stat-users');
      const productsEl = document.querySelector('#global-stat-products');
      const ordersEl = document.querySelector('#global-stat-orders');
      const revenueEl = document.querySelector('#global-stat-revenue');

      if (usersEl) usersEl.textContent = `${users.toLocaleString()}+`;
      if (productsEl) productsEl.textContent = `${products.toLocaleString()}+`;
      if (ordersEl) ordersEl.textContent = `${orders.toLocaleString()}+`;
      if (revenueEl) revenueEl.textContent = `$${(revenue / 1000000).toFixed(1)}M+`;
    }
  } catch(e) {}
}

// Signup handler
async function initSignupPage() {
  await refreshCurrentUser();
  if (CURRENT_USER) { window.location.href = 'buyer.html'; return; }
  const signupForm = document.querySelector('#signup-form');
  if (!signupForm) return;
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(signupForm));
    if (!data.firstName || !data.lastName || !data.email || !data.password || !data.role) {
      showMessage('#signup-feedback', 'Please fill all fields', 'error');
      return;
    }
    const res = await api('/signup', { method: 'POST', body: { firstName: data.firstName, lastName: data.lastName, email: data.email, password: data.password, role: data.role } });
    if (res && res.ok) {
      showMessage('#signup-feedback', '✓ Account created! Redirecting...');
      await refreshCurrentUser(); // Log the user in
      setTimeout(() => {
        // Redirect to previous page if specified, or dashboard
        const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
        window.location.href = redirectUrl || (data.role === 'seller' ? 'seller.html' : 'buyer.html');
      }, 900);
    } else {
      showMessage('#signup-feedback', res.error || 'Signup failed', 'error');
    }
  });
}

// Login handler
async function initLoginPage() {
  await refreshCurrentUser();
  if (CURRENT_USER) { window.location.href = 'buyer.html'; return; }
  const loginForm = document.querySelector('#login-form');
  if (!loginForm) return;
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(loginForm));
    const res = await api('/login', { method: 'POST', body: { email: data.loginEmail, password: data.loginPassword } });
    if (res && res.ok) {
      showMessage('#login-feedback', '✓ Login successful! Redirecting...');
      await refreshCurrentUser();
      setTimeout(() => {
        // Redirect to previous page if specified, or dashboard
        const redirectUrl = new URLSearchParams(window.location.search).get('redirect');
        window.location.href = redirectUrl || (res.account.role === 'seller' ? 'seller.html' : 'buyer.html');
      }, 700);
    } else {
      showMessage('#login-feedback', res.error || 'Login failed', 'error');
    }
  });
}

// Account page handler
async function initAccountPage() {
  await refreshCurrentUser();
  const logoutBtn = document.querySelector('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await api('/logout', { method: 'POST' });
      CURRENT_USER = null;
      CART = [];
      window.location.href = 'login.html';
    });
  }
  if (!CURRENT_USER) {
    document.querySelector('#account-content').innerHTML = `<p>Please <a href="login.html" style="color:var(--accent-light);">login</a> or <a href="signup.html" style="color:var(--accent-light);">create an account</a> to access your dashboard.</p>`;
    return;
  }
  const userName = document.querySelector('#user-name');
  const roleTitle = document.querySelector('#account-role-title');
  const roleDesc = document.querySelector('#account-role-desc');
  const content = document.querySelector('#account-content');

  if (userName) userName.textContent = `Welcome back, ${CURRENT_USER.firstName}!`;
  if (roleTitle) roleTitle.textContent = CURRENT_USER.role === 'seller' ? 'Seller Workspace' : 'Buyer Hub';
  if (roleDesc) roleDesc.innerHTML = CURRENT_USER.role === 'seller' 
    ? '✓ Publish and manage listings<br>✓ Track store revenue & analytics<br>✓ Order processing'
    : '✓ Browse catalog & cart management<br>✓ Real-time order invoices<br>✓ Direct messaging with sellers';
  
  if (content) {
    content.innerHTML = `
      <div style="display:grid; gap:1.25rem;">
        <div style="background: rgba(15,23,42,0.6); padding: 1.25rem; border-radius: 12px; border:1px solid var(--border);">
          <p style="margin:0 0 0.5rem;"><strong>Account Email:</strong> ${CURRENT_USER.email}</p>
          <p style="margin:0;"><strong>Account Role:</strong> <span class="badge">${CURRENT_USER.role.toUpperCase()}</span></p>
        </div>
        <div style="display:grid; gap:1rem; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); margin-top:0.5rem;">
          <a href="settings.html" class="secondary-button" style="text-align:center; padding:1rem;">Account Settings</a>
          <a href="invoices.html" class="secondary-button" style="text-align:center; padding:1rem;">My Invoices</a>
          <a href="messages.html" class="secondary-button" style="text-align:center; padding:1rem;">Messages</a>
          ${CURRENT_USER.role === 'buyer' 
            ? '<a href="buyer.html" class="primary-button" style="text-align:center; padding:1rem;">Buyer Dashboard</a>' 
            : '<a href="seller.html" class="primary-button" style="text-align:center; padding:1rem;">Seller Dashboard</a>'}
        </div>
      </div>
    `;
  }
}

async function initBuyerPage() {
  await refreshCurrentUser();
  if (!CURRENT_USER || CURRENT_USER.role !== 'buyer') { window.location.href = 'login.html'; return; }
  const products = await api('/products');
  renderProductCards(products, '#buyer-products');
  renderCartSummary();
}

function renderCartSummary() {
  const container = document.querySelector('#cart-summary');
  if (!container) return;
  if (!CART.length) { 
    container.innerHTML = '<div class="card"><p>Your shopping cart is currently empty.</p></div>';
    return;
  }
  const total = CART.reduce((s, i) => s + (i.price * (i.qty || 0)), 0);
  container.innerHTML = `
    <div class="card">
      <h3 style="margin-top:0;">Order Summary</h3>
      <ul style="list-style:none; padding:0; margin: 1rem 0;">
        ${CART.map((item, idx) => `
          <li style="padding:0.6rem 0; display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid var(--border);">
            <div>
              <strong>${item.title}</strong>
              <div style="font-size:0.85rem; color:var(--muted);">${item.qty} × ${formatCurrency(item.price)}</div>
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <strong>${formatCurrency(item.price * item.qty)}</strong>
              <button class="danger-button" style="padding:0.2rem 0.5rem; font-size:0.8rem;" onclick="removeFromCart(${idx})">✕</button>
            </div>
          </li>
        `).join('')}
      </ul>
      <div style="display:flex; justify-content:space-between; font-size:1.2rem; margin-bottom:1.5rem;">
        <strong>Total:</strong>
        <strong style="color:#38bdf8;">${formatCurrency(total)}</strong>
      </div>
      <button class="primary-button" id="checkout-btn" type="button" style="width:100%;">Proceed to Checkout</button>
    </div>
  `;

  const checkoutBtn = document.querySelector('#checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', async () => {
      if (!CART.length) { showMessage('#buyer-feedback', 'Cart is empty', 'error'); return; }
      const items = CART.map(i => ({ id: i.id, qty: i.qty }));
      const res = await api('/invoices/checkout', { method: 'POST', body: { items } });
      if (res && res.ok) {
        CART = [];
        saveCartToStorage();
        window.location.href = `order-confirmation.html?invoiceId=${res.invoice._id}`;
      } else {
        showMessage('#cart-feedback', res.error || 'Checkout failed', 'error');
      }
    });
  }
}

function removeFromCart(idx) {
  socket.emit('remove-from-cart', { idx });
}

async function initCartPage() {
  await refreshCurrentUser();
  renderCartSummary();
  renderNavStatus();
}

// Seller Dashboard Page Handler
async function initSellerPage() {
  await refreshCurrentUser();
  if (!CURRENT_USER || CURRENT_USER.role !== 'seller') { window.location.href = 'login.html'; return; }
  
  // Load Stats
  try {
    const statsRes = await api('/seller/stats');
    if (statsRes && statsRes.ok) {
      const { productsCount, ordersCount, totalRevenue } = statsRes.stats;
      const countEl = document.querySelector('#stat-products-count');
      const ordersEl = document.querySelector('#stat-orders-count');
      const revEl = document.querySelector('#stat-total-revenue');
      if (countEl) countEl.textContent = productsCount;
      if (ordersEl) ordersEl.textContent = ordersCount;
      if (revEl) revEl.textContent = formatCurrency(totalRevenue);
    }
  } catch (e) {}

  const products = await api('/products');
  const myProducts = products.filter(p => p.seller === CURRENT_USER.email);
  renderSellerInventory(myProducts);

  const addProductForm = document.querySelector('#seller-product-form');
  if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(addProductForm);
      const title = data.get('title');
      const category = data.get('category');
      const price = Number(data.get('price'));
      const availability = data.get('availability');
      const description = data.get('description');
      if (!title || !category || !price || !description) {
        showMessage('#seller-feedback', 'Please fill all required fields', 'error');
        return;
      }
      const res = await api('/products', { method: 'POST', body: { title, category, price, availability, description, tags: ['Seller listing'] } });
      if (res && res.ok) {
        addProductForm.reset();
        const updated = await api('/products');
        renderSellerInventory(updated.filter(p => p.seller === CURRENT_USER.email));
        showMessage('#seller-feedback', 'Product published successfully!');
      } else {
        showMessage('#seller-feedback', res.error || 'Publish failed', 'error');
      }
    });
  }
}

function renderSellerInventory(myProducts) {
  const container = document.querySelector('#seller-listings');
  if (!container) return;
  if (!myProducts.length) {
    container.innerHTML = `<div class="card"><p>You haven't listed any products yet. Use the form above to add your first product.</p></div>`;
    return;
  }
  container.innerHTML = myProducts.map(p => `
    <div class="panel">
      <div style="display:flex; justify-content:space-between; align-items:start;">
        <div>
          <span class="badge">${p.category}</span>
          <h4 style="margin: 0.5rem 0 0.25rem;">${p.title}</h4>
        </div>
        <strong style="color:#38bdf8; font-size:1.2rem;">${formatCurrency(p.price)}</strong>
      </div>
      <p style="color:var(--muted); font-size:0.9rem;">${p.description}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.75rem;">
        <small>${p.availability || 'In stock'}</small>
        <div style="display:flex; gap:0.5rem;">
          <button class="secondary-button" style="padding:0.3rem 0.75rem; font-size:0.85rem;" onclick="editProductModal('${p._id}')">Edit</button>
          <button class="danger-button" style="padding:0.3rem 0.75rem; font-size:0.85rem;" onclick="deleteProduct('${p._id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function editProductModal(id) {
  const products = await api('/products');
  const p = products.find(x => x._id === id);
  if (!p) return;

  openModal('Edit Product', `
    <form id="edit-product-form" style="display:grid; gap:1rem;">
      <div>
        <label>Title</label>
        <input type="text" name="title" value="${p.title}" required />
      </div>
      <div>
        <label>Category</label>
        <select name="category">
          <option value="Electronics" ${p.category === 'Electronics' ? 'selected' : ''}>Electronics</option>
          <option value="Fashion" ${p.category === 'Fashion' ? 'selected' : ''}>Fashion</option>
          <option value="Home & Living" ${p.category === 'Home & Living' ? 'selected' : ''}>Home & Living</option>
        </select>
      </div>
      <div>
        <label>Price ($)</label>
        <input type="number" name="price" step="0.01" value="${p.price}" required />
      </div>
      <div>
        <label>Description</label>
        <textarea name="description" required>${p.description}</textarea>
      </div>
      <div style="display:flex; gap:1rem; justify-content:flex-end;">
        <button type="button" class="secondary-button" onclick="closeModal()">Cancel</button>
        <button type="submit" class="primary-button">Save Changes</button>
      </div>
    </form>
  `);

  document.querySelector('#edit-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const res = await api(`/products/${id}`, { method: 'PUT', body: data });
    if (res && res.ok) {
      closeModal();
      initSellerPage();
    } else {
      alert(res.error || 'Failed to update product');
    }
  });
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to delete this product listing?')) return;
  const res = await api(`/products/${id}`, { method: 'DELETE' });
  if (res && res.ok) {
    initSellerPage();
  } else {
    alert(res.error || 'Failed to delete product');
  }
}

async function initSearchPage() {
  await refreshCurrentUser();
  const searchInput = document.querySelector('#search-query');
  const searchButton = document.querySelector('#search-button');
  const resultGrid = document.querySelector('#search-results');
  const products = await api('/products');

  function runSearch(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      resultGrid.innerHTML = '<div class="card"><p>Enter a search term above to filter marketplace items.</p></div>';
      return;
    }
    const matches = products.filter(item => 
      (item.title || '').toLowerCase().includes(q) || 
      (item.category || '').toLowerCase().includes(q) || 
      (item.description || '').toLowerCase().includes(q)
    );
    if (!matches.length) {
      resultGrid.innerHTML = `<div class="card"><p>No product results found for "${query}"</p></div>`;
      return;
    }
    renderProductCards(matches, '#search-results');
  }

  if (searchButton) searchButton.addEventListener('click', () => runSearch(searchInput.value));
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') runSearch(searchInput.value); });
  }
  resultGrid.innerHTML = '<div class="card"><p>Type a search term above to find products.</p></div>';
}

async function initMessagesPage() {
  await refreshCurrentUser();
  if (!CURRENT_USER) { window.location.href = 'login.html'; return; }
  const msgs = await api('/messages');
  const container = document.querySelector('#messages-list');
  if (!container) return;
  if (!msgs.length) {
    container.innerHTML = '<div class="card"><p>No messages in your inbox.</p></div>';
    return;
  }
  container.innerHTML = msgs.map(m => `
    <article class="message-card">
      <div class="tag-row">
        <span class="badge">${m.from || 'System'}</span>
        <span style="color:${m.unread ? 'var(--coral)' : 'var(--muted)'}; font-weight:600;">${m.unread ? '● Unread' : 'Read'}</span>
      </div>
      <h4 style="margin:0.5rem 0;">${m.subject}</h4>
      <p>${m.preview || m.body}</p>
      <button class="secondary-button" type="button" style="justify-self:start; margin-top:0.5rem;" onclick="openMessage('${m._id}')">Open Thread</button>
    </article>
  `).join('');
}

async function openMessage(id) {
  const msgs = await api('/messages');
  const m = msgs.find(x => x._id === id);
  if (!m) return;
  
  // Mark as read in backend
  await api(`/messages/${id}/read`, { method: 'PUT' });

  const conversation = document.querySelector('#message-thread');
  if (!conversation) return;
  conversation.innerHTML = `
    <div class="card">
      <h3 style="margin-top:0;">${m.subject}</h3>
      <p style="font-size:0.9rem; color:var(--muted);"><strong>From:</strong> ${m.from} &nbsp;|&nbsp; <strong>Date:</strong> ${new Date(m.date || m.createdAt).toLocaleString()}</p>
      <hr style="border:none; border-top:1px solid var(--border); margin:1rem 0;">
      <p style="line-height:1.6; white-space:pre-wrap;">${m.body}</p>
      <form id="reply-form" style="margin-top:1.5rem;">
        <textarea name="reply" placeholder="Type your reply to ${m.from}..." style="margin-bottom:0.75rem;"></textarea>
        <button class="primary-button" type="submit">Send Reply</button>
      </form>
    </div>
  `;

  const replyForm = document.querySelector('#reply-form');
  if (replyForm) {
    replyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = new FormData(replyForm).get('reply');
      if (!body) return;
      const res = await api('/messages', { method: 'POST', body: { to: m.from, subject: `Re: ${m.subject}`, body } });
      if (res && res.ok) {
        showMessage('#messages-feedback', '✓ Reply sent!');
        replyForm.reset();
        setTimeout(() => initMessagesPage(), 1000);
      } else {
        showMessage('#messages-feedback', res.error || 'Failed to send', 'error');
      }
    });
  }
}

async function initNotificationsPage() {
  await refreshCurrentUser();
  const notes = await api('/notifications');
  const container = document.querySelector('#notifications-list');
  if (!container) return;
  if (!notes.length) {
    container.innerHTML = '<div class="card"><p>No notifications.</p></div>';
    return;
  }
  container.innerHTML = notes.map(n => `
    <article class="notification-card">
      <div class="tag-row">
        <strong style="color:white;">${n.title}</strong>
        <small style="color:var(--muted);">${n.time || 'recently'}</small>
      </div>
      <p style="margin-top:0.5rem; color:var(--muted);">${n.detail}</p>
    </article>
  `).join('');
}

async function initSettingsPage() {
  await refreshCurrentUser();
  if (!CURRENT_USER) { window.location.href = 'login.html'; return; }
  const settingsForm = document.querySelector('#settings-form');
  const preferences = document.querySelector('#settings-preferences');
  if (!settingsForm) return;

  settingsForm.elements['firstName'].value = CURRENT_USER.firstName || '';
  settingsForm.elements['lastName'].value = CURRENT_USER.lastName || '';
  settingsForm.elements['email'].value = CURRENT_USER.email || '';
  if (settingsForm.elements['newsletter']) {
    settingsForm.elements['newsletter'].checked = CURRENT_USER.preferences?.newsletter ?? true;
  }
  if (settingsForm.elements['alerts']) {
    settingsForm.elements['alerts'].checked = CURRENT_USER.preferences?.productAlerts ?? true;
  }
  if (preferences) {
    preferences.textContent = `Account role: ${CURRENT_USER.role.toUpperCase()}`;
  }

  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = settingsForm.elements['firstName'].value;
    const lastName = settingsForm.elements['lastName'].value;
    const newsletter = settingsForm.elements['newsletter'] ? settingsForm.elements['newsletter'].checked : true;
    const alerts = settingsForm.elements['alerts'] ? settingsForm.elements['alerts'].checked : true;

    const res = await api('/me', {
      method: 'PUT',
      body: {
        firstName,
        lastName,
        preferences: { newsletter, productAlerts: alerts }
      }
    });

    if (res && res.ok) {
      await refreshCurrentUser();
      showMessage('#settings-feedback', 'Account preferences updated successfully!');
    } else {
      showMessage('#settings-feedback', res.error || 'Failed to update preferences', 'error');
    }
  });
}

async function initInvoicesPage() {
  await refreshCurrentUser();
  if (!CURRENT_USER) { window.location.href = 'login.html'; return; }
  const invoices = await api('/invoices');
  const container = document.querySelector('#invoice-list');
  if (!container) return;
  if (!invoices.length) {
    container.innerHTML = '<div class="card"><p>No billing invoices generated yet.</p></div>';
    return;
  }
  container.innerHTML = invoices.map(inv => `
    <article class="invoice-card">
      <div class="tag-row">
        <span class="badge">${inv.id}</span>
        <span class="badge success">${inv.status}</span>
      </div>
      <h4 style="margin:0.5rem 0; font-size:1.3rem; color:#38bdf8;">${formatCurrency(inv.total)} — ${inv.date}</h4>
      <p style="color:var(--muted);">${(inv.items || []).length} item(s)</p>
      <button class="secondary-button" type="button" style="justify-self:start;" onclick="viewInvoice('${inv._id}')">View Details</button>
    </article>
  `).join('');
}

async function viewInvoice(id) {
  const invoices = await api('/invoices');
  const inv = invoices.find(x => x._id === id);
  if (!inv) return;

  const itemsHtml = (inv.items || []).map(i => `
    <tr style="border-bottom:1px solid var(--border);">
      <td style="padding:0.5rem 0;">${i.name}</td>
      <td style="text-align:center;">${i.qty}</td>
      <td style="text-align:right;">${formatCurrency(i.price)}</td>
      <td style="text-align:right;">${formatCurrency(i.price * i.qty)}</td>
    </tr>
  `).join('');

  openModal(`Invoice ${inv.id}`, `
    <div style="display:grid; gap:1rem;">
      <div style="display:flex; justify-content:space-between; background:rgba(15,23,42,0.6); padding:1rem; border-radius:10px;">
        <div>
          <p style="margin:0;"><strong>Date:</strong> ${inv.date}</p>
          <p style="margin:0;"><strong>Buyer:</strong> ${inv.buyer}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;"><strong>Status:</strong> <span class="badge success">${inv.status}</span></p>
          <p style="margin:0;"><strong>Seller(s):</strong> ${inv.seller}</p>
        </div>
      </div>
      <table style="width:100%; border-collapse:collapse; margin-top:0.5rem;">
        <thead>
          <tr style="border-bottom:1px solid var(--border); text-align:left; color:var(--muted); font-size:0.85rem;">
            <th>Item</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Price</th>
            <th style="text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:2px solid var(--accent); padding-top:1rem; font-size:1.3rem;">
        <strong>Total Paid:</strong>
        <strong style="color:#38bdf8;">${formatCurrency(inv.total)}</strong>
      </div>
      <div style="display:flex; justify-content:flex-end; margin-top:1rem;">
        <button class="secondary-button" onclick="closeModal()">Close</button>
      </div>
    </div>
  `);
}

async function initProductPage() {
  await refreshCurrentUser();
  const container = document.querySelector('#product-detail-content');
  const productId = new URLSearchParams(window.location.search).get('id');

  if (!productId) {
    container.innerHTML = '<div class="card"><p>No product specified. Return to the <a href="index.html">marketplace</a>.</p></div>';
    return;
  }

  try {
    const p = await api(`/products/${productId}`);
    if (!p || p.error) {
      container.innerHTML = `<div class="card"><p>Could not find product with ID ${productId}.</p></div>`;
      return;
    }

    document.title = `${p.title} - EcoShop`;
    container.innerHTML = `
      <div class="product-detail-card">
        <article class="product-detail-grid">
          <div class="product-image-container large-image">
            ${getProductEmoji(p.category)}
          </div>
          <div class="product-detail-info">
            <span class="badge">${p.category}</span>
            <h1 class="product-title-large">${p.title}</h1>
            <div class="tag-row" style="margin-bottom: 1rem;">
              <span style="color: var(--amber); font-weight: 600; font-size: 1.1rem;">★ ${p.rating || 4.8}</span>
              <span class="badge ${p.availability === 'In stock' ? 'success' : 'amber'}">${p.availability || 'In stock'}</span>
            </div>
            <p class="product-description-large">${p.description}</p>
            <p style="font-size: 0.9rem; color: var(--muted);">Sold by: <strong>${p.seller}</strong></p>
            <div class="product-purchase-box">
              <h2 class="price">${formatCurrency(p.price)}</h2>
              <button class="primary-button large" type="button" onclick="buyProduct('${p._id}')">Add to Cart</button>
            </div>
          </div>
        </article>
      </div>
      <section class="related-products-section">
        <h2 class="section-title">Related Products</h2>
        <div id="related-products-grid" class="product-grid"></div>
      </section>
    `;
    renderRelatedProducts(p);
  } catch (e) {
    container.innerHTML = '<div class="card"><p>There was an error loading this product.</p></div>';
  }
}

async function renderRelatedProducts(currentProduct) {
  const allProducts = await api('/products');
  const related = allProducts.filter(p => p.category === currentProduct.category && p._id !== currentProduct._id).slice(0, 3);
  if (related.length > 0) {
    renderProductCards(related, '#related-products-grid', true);
  } else {
    const relatedContainer = document.querySelector('.related-products-section');
    if(relatedContainer) relatedContainer.style.display = 'none';
  }
}

async function initOrderConfirmationPage() {
  await refreshCurrentUser();
  const container = document.querySelector('#confirmation-content');
  const invoiceId = new URLSearchParams(window.location.search).get('invoiceId');

  if (!invoiceId) {
    container.innerHTML = '<div class="card"><p>No order specified. View your orders in your <a href="invoices.html">account dashboard</a>.</p></div>';
    return;
  }

  try {
    const inv = await api(`/invoices/${invoiceId}`);
    if (!inv || inv.error) {
      container.innerHTML = `<div class="card"><p>Could not find details for order ID ${invoiceId}.</p></div>`;
      return;
    }

    const itemsHtml = (inv.items || []).map(i => `
      <li style="display:flex; justify-content:space-between; align-items:center; padding: 0.75rem 0; border-bottom: 1px solid var(--border);">
        <div>
          <strong>${i.name}</strong>
          <div style="font-size:0.9rem; color:var(--muted);">${i.qty} × ${formatCurrency(i.price)}</div>
        </div>
        <strong>${formatCurrency(i.price * i.qty)}</strong>
      </li>
    `).join('');

    container.innerHTML = `
      <div class="section-panel" style="text-align:center; border-color: var(--emerald); background: rgba(16, 185, 129, 0.05);">
        <div style="font-size: 3rem;">🎉</div>
        <h2 style="font-size:1.8rem; margin:0.5rem 0;">Order Confirmed!</h2>
        <p style="color:var(--muted);">Thank you for your purchase. Your order <strong>${inv.id}</strong> has been placed successfully.</p>
        <a href="marketplace.html" class="primary-button" style="margin-top:1rem;">Continue Shopping</a>
      </div>
      <div class="card" style="margin-top:2rem;">
        <h3 style="margin-top:0;">Order Summary</h3>
        <ul style="list-style:none; padding:0; margin:0;">${itemsHtml}</ul>
        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:1rem; margin-top:1rem; border-top: 2px solid var(--border); font-size:1.2rem;">
          <strong>Total Paid:</strong>
          <strong style="color:var(--accent); font-size:1.5rem;">${formatCurrency(inv.total)}</strong>
        </div>
        <p style="font-size:0.9rem; color:var(--muted); margin-top:1.5rem;">A confirmation has been sent to your email and you can view this invoice anytime in your <a href="invoices.html" style="font-weight:600; color:var(--accent);">account dashboard</a>.</p>
      </div>
    `;
  } catch (e) {
    container.innerHTML = '<div class="card"><p>There was an error loading your order confirmation.</p></div>';
  }
}

function initPage() {
  const page = document.body.dataset.page;
  if (page !== 'product') {
    document.body.classList.remove('product-page-active');
  }
  switch (page) {
    case 'signup': initSignupPage(); break;
    case 'login': initLoginPage(); break;
    case 'account': initAccountPage(); break;
    case 'marketplace': initMarketplacePage(); break;
    case 'buyer': initBuyerPage(); break;
    case 'seller': initSellerPage(); break;
    case 'search': initSearchPage(); break;
    case 'messages': initMessagesPage(); break;
    case 'notifications': initNotificationsPage(); break;
    case 'settings': initSettingsPage(); break;
    case 'invoices': initInvoicesPage(); break;
    case 'product': initProductPage(); break;
    case 'cart': initCartPage(); break;
    case 'order-confirmation': initOrderConfirmationPage(); break;
    default: refreshCurrentUser(); break;
  }
  if (page === 'product') {
    document.body.classList.add('product-page-active');
  }
}

window.addEventListener('DOMContentLoaded', initPage);
