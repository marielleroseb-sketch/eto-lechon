import { useEffect, useMemo, useState } from 'react';
import './App.css';

const STORAGE_KEY = 'eto-lechon-orders';
const REVIEWS_STORAGE_KEY = 'eto-lechon-reviews';
const INVENTORY_STORAGE_KEY = 'eto-lechon-inventory';
const ADMIN_PASSWORD = 'Manzan123';
const ORDER_API_BASE = (process.env.REACT_APP_ORDER_API_BASE || '').replace(/\/+$/, '');

async function ordersApiFetch(path, options) {
  const response = await fetch(`${ORDER_API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options && options.headers ? options.headers : {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Request failed (${response.status}).`);
  }

  if (response.status === 204) return null;
  return response.json();
}

const ordersApi = {
  enabled: Boolean(ORDER_API_BASE),
  list: () => ordersApiFetch('/orders'),
  create: (order) => ordersApiFetch('/orders', { method: 'POST', body: JSON.stringify(order) }),
  updateStatus: (id, status) => ordersApiFetch(`/orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  remove: (id) => ordersApiFetch(`/orders/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

const products = [
  {
    id: 'lechon-baboy',
    name: 'Lechon Baboy',
    category: 'Whole Lechon',
    description: 'Crispy skin, juicy meat, and a fiesta centerpiece best served warm.',
    status: 'Pre-order only / Seasonal',
    accent: '#b91c1c',
    image: '/baboy-top.jpg',
    variants: [
      { label: '30 kilos - PHP 13,500', price: 13500 },
      { label: '35 kilos - PHP 14,500', price: 14500 },
      { label: '40 kilos - PHP 15,500', price: 15500 },
      { label: '45 kilos - PHP 16,500', price: 16500 },
      { label: '50 kilos - PHP 17,500', price: 17500 },
      { label: '55 kilos - PHP 18,300', price: 18300 },
      { label: '60 kilos - PHP 19,000', price: 19000 },
      { label: '65 kilos - PHP 19,800', price: 19800 },
      { label: '70 kilos - PHP 21,500', price: 21500 },
      { label: '75 kilos - PHP 22,500', price: 22500 },
      { label: '80 kilos - PHP 23,500', price: 23500 },
      { label: '85 kilos - PHP 24,500', price: 24500 },
      { label: '90 kilos - PHP 25,500', price: 25500 },
      { label: '95 kilos - PHP 26,500', price: 26500 },
      { label: '100 kilos - PHP 28,000', price: 28000 },
    ],
  },
  {
    id: 'lechon-belly',
    name: 'Lechon Belly',
    category: 'Rolled Belly',
    description: 'Golden, crunchy, juicy belly roast for family tables and office salu-salo.',
    status: 'Pre-order only',
    accent: '#15803d',
    image: '/belly-top.jpg',
    imagePosition: '50% 72%',
    variants: [
      { label: '3 kilos - PHP 1,770', price: 1770 },
      { label: '4 kilos - PHP 2,350', price: 2350 },
      { label: '5 kilos - PHP 2,930', price: 2930 },
      { label: '6 kilos - PHP 3,540', price: 3540 },
      { label: '7 kilos - PHP 4,120', price: 4120 },
      { label: '8 kilos - PHP 4,700', price: 4700 },
      { label: '9 kilos - PHP 5,280', price: 5280 },
      { label: '10 kilos - PHP 5,860', price: 5860 },
    ],
  },
  {
    id: 'lechon-manok',
    name: 'Lechon Manok',
    category: 'Roasted Chicken',
    description: 'Tender roasted chicken with savory Filipino flavor, ready for everyday meals.',
    status: 'Available',
    accent: '#ca8a04',
    image: '/manok-top.jpg',
    imagePosition: '50% 58%',
    variants: [
      { label: 'Regular - PHP 280', price: 280 },
      { label: 'Large - PHP 310', price: 310 },
    ],
  },
];

const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'products', label: 'Products' },
  { id: 'order', label: 'Order' },
  { id: 'admin', label: 'Admin' },
];

const statusOptions = ['Pending', 'Confirmed', 'Preparing', 'Delivered', 'Cancelled'];
const paymentMethods = ['GCash - 09971701118', 'Cash on Delivery', 'Bank Transfer - BDO', 'Bank Transfer - BPI'];

function currency(value) {
  return `PHP ${Number(value || 0).toLocaleString('en-PH')}`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

function getStoredOrders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function getStoredReviews() {
  try {
    return JSON.parse(localStorage.getItem(REVIEWS_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function getDefaultInventory() {
  return products.map((product) => ({
    productId: product.id,
    productName: product.name,
    stock: product.id === 'lechon-manok' ? 120 : 40,
  }));
}

function getStoredInventory() {
  const fallback = getDefaultInventory();
  try {
    const stored = JSON.parse(localStorage.getItem(INVENTORY_STORAGE_KEY)) || [];
    return fallback.map((item) => {
      const match = stored.find((entry) => entry.productId === item.productId);
      return match ? { ...item, stock: Number(match.stock) || 0 } : item;
    });
  } catch {
    return fallback;
  }
}

function LogoMark() {
  return (
    <img className="logo-mark" src="/business-logo.jpg" alt="ETO Lechon House logo" />
  );
}

function App() {
  const [page, setPage] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [orders, setOrders] = useState(getStoredOrders);
  const [reviews, setReviews] = useState(getStoredReviews);
  const [inventory, setInventory] = useState(getStoredInventory);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [ordersSyncError, setOrdersSyncError] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    let alive = true;
    if (!ordersApi.enabled) return undefined;

    (async () => {
      try {
        const remoteOrders = await ordersApi.list();
        if (!alive) return;
        if (Array.isArray(remoteOrders)) setOrders(remoteOrders);
        setOrdersSyncError('');
      } catch (error) {
        if (!alive) return;
        setOrdersSyncError(error instanceof Error ? error.message : 'Failed to sync orders.');
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const goTo = (nextPage) => {
    setPage(nextPage);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const refreshOrders = async () => {
    if (!ordersApi.enabled) return;
    try {
      const remoteOrders = await ordersApi.list();
      if (Array.isArray(remoteOrders)) setOrders(remoteOrders);
      setOrdersSyncError('');
    } catch (error) {
      setOrdersSyncError(error instanceof Error ? error.message : 'Failed to sync orders.');
    }
  };

  const addOrder = async (order) => {
    setOrders((current) => [order, ...current]);
    setPage('order');
    if (!ordersApi.enabled) return;
    try {
      await ordersApi.create(order);
      await refreshOrders();
      setOrdersSyncError('');
    } catch (error) {
      setOrdersSyncError(error instanceof Error ? error.message : 'Failed to send order to server.');
    }
  };

  return (
    <div className="site-shell">
      <header className="site-header">
        <button className="brand-button" onClick={() => goTo('home')} aria-label="Go to home page">
          <LogoMark />
          <span>
            <strong>ETO Lechon</strong>
            <small>Eto na ang paborito mo</small>
          </span>
        </button>

        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
          <span />
          <span />
          <span />
        </button>

        <nav className={menuOpen ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? 'active' : ''}
              onClick={() => goTo(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {page === 'home' && <HomePage goTo={goTo} reviews={reviews} />}
        {page === 'products' && <ProductsPage goTo={goTo} />}
        {page === 'order' && <OrderPage addOrder={addOrder} orders={orders} reviews={reviews} setReviews={setReviews} />}
        {page === 'admin' && (
          <AdminPage
            orders={orders}
            setOrders={setOrders}
            inventory={inventory}
            setInventory={setInventory}
            unlocked={adminUnlocked}
            setUnlocked={setAdminUnlocked}
            ordersSyncError={ordersSyncError}
            ordersApiEnabled={ordersApi.enabled}
            refreshOrders={refreshOrders}
          />
        )}
      </main>

      <a
        className="floating-contact"
        href="https://www.facebook.com/share/1NHZttCDKS/"
        target="_blank"
        rel="noreferrer"
      >
        Message on Facebook
      </a>

      <footer className="site-footer">
        <LogoMark />
        <div>
          <strong>ETO Lechon House</strong>
          <p>Abaca, Tobias Fornier, Antique</p>
        </div>
        <div className="footer-contact">
          <span>09971701118</span>
          <span>christinejoymanzan87@gmail.com</span>
          <span>Monday-Sunday, 8AM-6PM</span>
        </div>
      </footer>
    </div>
  );
}

function HomePage({ goTo, reviews }) {
  const [reviewFilter, setReviewFilter] = useState('all');
  const reviewCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => {
      const rating = Number(review.rating);
      if (counts[rating] !== undefined) counts[rating] += 1;
    });
    return counts;
  }, [reviews]);
  const totalReviews = reviews.length;
  const averageRating = totalReviews
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / totalReviews
    : 0;
  const filteredReviews = reviewFilter === 'all'
    ? reviews
    : reviews.filter((review) => Number(review.rating) === Number(reviewFilter));

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Fresh lechon service in Abaca, Tobias Fornier, Antique</p>
          <h1>ETO Na Ang Lechon na Hinahanap Mo!</h1>
          <p className="hero-subtitle">Manok, Baboy, Belly - lutong siguradong panalo.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => goTo('order')}>Order Now</button>
            <button className="secondary-button" onClick={() => goTo('products')}>View Menu</button>
          </div>
          <div className="service-strip">
            <span>Pickup available</span>
            <span>Delivery with fee</span>
            <span>GCash, COD, bank transfer</span>
          </div>
        </div>
        <div className="hero-photo-wrap">
          <img className="hero-photo" src="/eto-logo-transparent.png" alt="ETO Lechon House logo" />
        </div>
      </section>

      <section className="section about-band">
        <div>
          <p className="eyebrow">Our story</p>
          <h2>Family craft, fiesta reputation.</h2>
        </div>
        <p>
          ETO Lechon House began with the lechon-making experience of the current owner's father,
          who learned the craft in Iloilo and built the business in Abaca, Tobias Fornier, Antique. Today,
          Ms. Cristine Nadong Manzan manages the business, growing its name after the Lechon Festival
          and serving customers in Abaca, Tobias Fornier, Antique with quality and tradition.
        </p>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Why choose us</p>
          <h2>Reliable lechon for everyday cravings and big celebrations.</h2>
        </div>
        <div className="feature-grid">
          {['Made fresh every day', 'No preservatives, all-natural ingredients', 'Available for delivery and pick-up', 'Prepared with a proud Antique lechon tradition'].map((item) => (
            <article className="feature-card" key={item}>
              <span className="feature-dot" />
              <h3>{item}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="section menu-preview">
        <div className="section-heading">
          <p className="eyebrow">Signature orders</p>
          <h2>Fiesta-ready favorites.</h2>
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Customer feedback</p>
          <h2>What finished customers say.</h2>
        </div>
        <div className="rating-overview">
          <div className="rating-score">
            <strong>{averageRating ? averageRating.toFixed(1) : '0.0'}</strong>
            <p className="rating-stars">
              {'★'.repeat(Math.round(averageRating))}
              {'☆'.repeat(5 - Math.round(averageRating))}
            </p>
          </div>
          <div className="rating-filters">
            <button
              className={reviewFilter === 'all' ? 'active' : ''}
              onClick={() => setReviewFilter('all')}
            >
              All ({totalReviews})
            </button>
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                className={Number(reviewFilter) === rating ? 'active' : ''}
                onClick={() => setReviewFilter(rating)}
              >
                {rating} Star ({reviewCounts[rating]})
              </button>
            ))}
          </div>
        </div>
        <div className="reviews-grid">
          {filteredReviews.length ? filteredReviews.slice(0, 6).map((review) => (
            <article className="review-card" key={review.id}>
              <p className="review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
              <p className="review-text">"{review.comment}"</p>
              <strong>{review.customerName}</strong>
              <small>{new Date(review.createdAt).toLocaleDateString()}</small>
            </article>
          )) : (
            <p className="empty-chart">{reviews.length ? 'No reviews for this rating yet.' : 'No reviews yet. Delivered customers can submit feedback from the Order page.'}</p>
          )}
        </div>
      </section>
    </>
  );
}

function ProductsPage({ goTo }) {
  return (
    <section className="section page-section">
      <div className="page-title">
        <p className="eyebrow">Products and services</p>
        <h1>Choose your lechon.</h1>
        <p>All orders are best served warm. Whole lechon and belly orders are prepared by pre-order.</p>
      </div>
      <div className="product-grid detailed">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <div className="order-banner">
        <div>
          <h2>Ready to reserve your order?</h2>
          <p>Submit the form and ETO Lechon House will contact you to confirm details.</p>
        </div>
        <button className="primary-button" onClick={() => goTo('order')}>Start Order</button>
      </div>
    </section>
  );
}

function ProductCard({ product, compact = false }) {
  const showRealPhoto = Boolean(product.image);

  return (
    <article className="product-card" style={{ '--accent': product.accent }}>
      <div className="product-visual">
        {showRealPhoto ? (
          <img
            className="product-photo"
            src={product.image}
            alt={product.name}
            style={{ objectPosition: product.imagePosition || 'center' }}
          />
        ) : (
          <span>{product.name.split(' ')[product.name.split(' ').length - 1]}</span>
        )}
      </div>
      <div className="product-content">
        <div className="product-meta">
          <span>{product.category}</span>
          <span>{product.status}</span>
        </div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        {!compact && (
          <div className="price-list">
            {product.variants.map((variant) => (
              <span key={variant.label}>{variant.label}</span>
            ))}
          </div>
        )}
        {compact && <strong className="starting-price">Starts at {currency(product.variants[0].price)}</strong>}
      </div>
    </article>
  );
}

function OrderPage({ addOrder, orders, reviews, setReviews }) {
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [proofError, setProofError] = useState('');
  const [reviewForm, setReviewForm] = useState({
    name: '',
    rating: 5,
    comment: '',
  });
  const [reviewMessage, setReviewMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    contact: '',
    email: '',
    notes: '',
    payment: paymentMethods[0],
    date: '',
    proofOfPayment: '',
    proofOfPaymentName: '',
  });
  const [items, setItems] = useState([{ productId: products[0].id, variantIndex: 0, quantity: 1 }]);

  const orderItems = items.map((item) => {
    const product = products.find((entry) => entry.id === item.productId) || products[0];
    const variant = product.variants[item.variantIndex] || product.variants[0];
    return {
      productId: product.id,
      productName: product.name,
      variant: variant.label,
      unitPrice: variant.price,
      quantity: Number(item.quantity) || 1,
      lineTotal: variant.price * (Number(item.quantity) || 1),
    };
  });

  const total = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);

  const updateItem = (index, key, value) => {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      if (key === 'productId') return { productId: value, variantIndex: 0, quantity: item.quantity };
      return { ...item, [key]: value };
    }));
  };

  const submitOrder = (event) => {
    event.preventDefault();
    const order = {
      id: `ETO-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      customer: { ...form },
      items: orderItems,
      total,
      pickupOnly: true,
      status: 'Pending',
    };
    addOrder(order);
    setSubmittedOrder(order);
    setForm({
      name: '',
      contact: '',
      email: '',
      notes: '',
      payment: paymentMethods[0],
      date: '',
      proofOfPayment: '',
      proofOfPaymentName: '',
    });
    setProofError('');
    setItems([{ productId: products[0].id, variantIndex: 0, quantity: 1 }]);
  };

  const handleProofUpload = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProofError('Please upload an image file only.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setProofError('Image is too large. Please upload up to 4MB.');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm({
        ...form,
        proofOfPayment: dataUrl,
        proofOfPaymentName: file.name,
      });
      setProofError('');
    } catch {
      setProofError('Could not process this image. Try another screenshot.');
    }
  };

  const submitReview = (event) => {
    event.preventDefault();
    const cleanName = reviewForm.name.trim();
    const nextReview = {
      id: `RV-${Date.now().toString().slice(-6)}`,
      customerName: cleanName || 'Anonymous Customer',
      rating: Number(reviewForm.rating),
      comment: reviewForm.comment.trim(),
      createdAt: new Date().toISOString(),
    };
    setReviews((current) => [nextReview, ...current]);
    setReviewForm({ name: '', rating: 5, comment: '' });
    setReviewMessage('Thank you. Your feedback is now visible on the Home page.');
  };

  return (
    <section className="section page-section">
      <div className="page-title">
        <p className="eyebrow">Checkout</p>
        <h1>Reserve your ETO Lechon order.</h1>
        <p>Pickup only is selected for now. Delivery can still be arranged with a fee after confirmation.</p>
      </div>

      <div className="checkout-layout">
        <form className="order-form" onSubmit={submitOrder}>
          <div className="form-grid">
            <label>
              Customer Full Name
              <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label>
              Contact Number
              <input required value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} />
            </label>
            <label>
              Email Address (optional)
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label>
              Preferred Delivery Date (optional)
              <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            </label>
          </div>

          <div className="pickup-panel">
            <input type="checkbox" checked readOnly />
            <span>Pick-up only selected. Delivery with fee can be discussed during confirmation.</span>
          </div>

          <div className="line-items">
            <div className="line-items-header">
              <h2>Items</h2>
              <button type="button" className="small-button" onClick={() => setItems([...items, { productId: products[0].id, variantIndex: 0, quantity: 1 }])}>
                Add Item
              </button>
            </div>
            {items.map((item, index) => {
              const product = products.find((entry) => entry.id === item.productId) || products[0];
              return (
                <div className="item-row" key={`${item.productId}-${index}`}>
                  <label>
                    Product
                    <select value={item.productId} onChange={(event) => updateItem(index, 'productId', event.target.value)}>
                      {products.map((entry) => <option value={entry.id} key={entry.id}>{entry.name}</option>)}
                    </select>
                  </label>
                  <label>
                    Size / Price
                    <select value={item.variantIndex} onChange={(event) => updateItem(index, 'variantIndex', Number(event.target.value))}>
                      {product.variants.map((variant, variantIndex) => <option value={variantIndex} key={variant.label}>{variant.label}</option>)}
                    </select>
                  </label>
                  <label>
                    Qty
                    <input min="1" type="number" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} />
                  </label>
                  {items.length > 1 && (
                    <button type="button" className="remove-button" onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}>
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <label>
            Preferred Payment Method
            <select value={form.payment} onChange={(event) => setForm({ ...form, payment: event.target.value })}>
              {paymentMethods.map((method) => <option key={method}>{method}</option>)}
            </select>
          </label>

          <label>
            Proof of Payment (screenshot)
            <input type="file" accept="image/*" onChange={handleProofUpload} />
            {form.proofOfPaymentName ? <small className="upload-note">Uploaded: {form.proofOfPaymentName}</small> : null}
            {proofError ? <small className="upload-error">{proofError}</small> : null}
          </label>

          <label>
            Special Instructions / Notes
            <textarea rows="4" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>

          <button className="primary-button wide" type="submit">Submit Order</button>
        </form>

        <aside className="order-summary">
          <h2>Order Summary</h2>
          {orderItems.map((item) => (
            <div className="summary-line" key={`${item.productName}-${item.variant}`}>
              <span>{item.quantity} x {item.productName}<small>{item.variant}</small></span>
              <strong>{currency(item.lineTotal)}</strong>
            </div>
          ))}
          <div className="summary-total">
            <span>Total Amount</span>
            <strong>{currency(total)}</strong>
          </div>
          <p className="summary-note">{orders.length} saved order{orders.length === 1 ? '' : 's'} in this browser.</p>
        </aside>
      </div>

      {submittedOrder && (
        <div className="confirmation-panel">
          <h2>Thank you, {submittedOrder.customer.name}!</h2>
          <p>
            Your order {submittedOrder.id} has been received. We will contact you within 24 hours to confirm.
            For urgent orders, message us on Facebook or call 09971701118.
          </p>
        </div>
      )}

      <div className="review-form-panel">
        <h2>Leave a Review (For Completed Orders)</h2>
        <p>Share your experience so new customers can see your feedback.</p>
        <form className="review-form" onSubmit={submitReview}>
          <label>
            Customer Name (optional)
            <input
              value={reviewForm.name}
              onChange={(event) => setReviewForm({ ...reviewForm, name: event.target.value })}
              placeholder="Leave blank to post as Anonymous Customer"
            />
          </label>
          <label>
            Rating
            <div className="star-picker" role="radiogroup" aria-label="Choose star rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={reviewForm.rating === star}
                  className={reviewForm.rating >= star ? 'star active' : 'star'}
                  onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                >
                  ★
                </button>
              ))}
              <span className="star-label">{reviewForm.rating} / 5</span>
            </div>
          </label>
          <label>
            Feedback
            <textarea
              required
              minLength="8"
              rows="4"
              value={reviewForm.comment}
              onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })}
              placeholder="Share your experience with ETO Lechon House."
            />
          </label>
          <button className="primary-button" type="submit">Submit Review</button>
        </form>
        {reviewMessage ? <p className="review-message">{reviewMessage}</p> : null}
      </div>
    </section>
  );
}

function AdminPage({
  orders,
  setOrders,
  inventory,
  setInventory,
  unlocked,
  setUnlocked,
  ordersSyncError,
  ordersApiEnabled,
  refreshOrders,
}) {
  const [password, setPassword] = useState('');
  const analytics = useMemo(() => getAnalytics(orders), [orders]);
  const soldByProduct = useMemo(() => {
    const soldMap = new Map(products.map((product) => [product.id, 0]));
    orders
      .filter((order) => order.status !== 'Cancelled')
      .forEach((order) => {
        order.items.forEach((item) => {
          soldMap.set(item.productId, (soldMap.get(item.productId) || 0) + item.quantity);
        });
      });
    return soldMap;
  }, [orders]);

  const unlock = (event) => {
    event.preventDefault();
    if (password === ADMIN_PASSWORD) setUnlocked(true);
  };

  const updateStatus = async (id, status) => {
    setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
    if (ordersApiEnabled) {
      try {
        await ordersApi.updateStatus(id, status);
        await refreshOrders();
      } catch {
        // keep optimistic UI; sync error is shown globally if configured at app-level
      }
    }
  };

  const deleteOrder = async (id) => {
    setOrders((current) => current.filter((order) => order.id !== id));
    if (ordersApiEnabled) {
      try {
        await ordersApi.remove(id);
        await refreshOrders();
      } catch {
        // keep optimistic UI; sync error is shown globally if configured at app-level
      }
    }
  };

  const updateInventoryStock = (productId, stockValue) => {
    const safeStock = Math.max(0, Number(stockValue) || 0);
    setInventory((current) => current.map((item) => (
      item.productId === productId ? { ...item, stock: safeStock } : item
    )));
  };

  const exportCsv = () => {
    const headers = ['Order Number', 'Date', 'Customer', 'Contact', 'Items', 'Total', 'Payment', 'Proof Uploaded', 'Address', 'Status'];
    const rows = orders.map((order) => [
      order.id,
      new Date(order.createdAt).toLocaleString(),
      order.customer.name,
      order.customer.contact,
      order.items.map((item) => `${item.quantity} x ${item.productName} (${item.variant})`).join('; '),
      order.total,
      order.customer.payment,
      order.customer.proofOfPayment ? 'Yes' : 'No',
      'Pick-up only',
      order.status,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'eto-lechon-orders.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!unlocked) {
    return (
      <section className="section admin-login">
        <form onSubmit={unlock}>
          <LogoMark />
          <h1>Eto Lechon House Admin</h1>
          <p>Enter the admin password to view orders and analytics.</p>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button className="primary-button wide" type="submit">Unlock Dashboard</button>
        </form>
      </section>
    );
  }

  return (
    <section className="section page-section admin-page">
      <div className="dashboard-title">
        <div>
          <p className="eyebrow">Admin dashboard</p>
          <h1>Eto Lechon House</h1>
        </div>
        <button className="secondary-button" onClick={exportCsv}>Download CSV</button>
      </div>
      {ordersApiEnabled ? (
        <p className="summary-note">
          Live orders sync is enabled.{ordersSyncError ? ` Sync issue: ${ordersSyncError}` : ''}
        </p>
      ) : (
        <p className="summary-note">
          Orders are saved only in this device/browser. To see customer orders on all devices, set `REACT_APP_ORDER_API_BASE`.
        </p>
      )}

      <div className="stat-grid">
        <Stat label="Total Revenue" value={currency(analytics.totalRevenue)} />
        <Stat label="This Month" value={currency(analytics.monthRevenue)} />
        <Stat label="Total Orders" value={orders.length} />
        <Stat label="Average Order Value" value={currency(analytics.averageOrder)} />
      </div>

      <div className="analytics-grid">
        <ChartCard title="Best-Selling Products">
          <BarList data={analytics.productTotals} />
        </ChartCard>
        <ChartCard title="Orders by Status">
          <StatusDonut data={analytics.statusTotals} />
        </ChartCard>
        <ChartCard title="Daily Order Volume">
          <LineChart data={analytics.dailyTotals} />
        </ChartCard>
        <ChartCard title="Top Customers">
          <BarList data={analytics.customerTotals} />
        </ChartCard>
      </div>

      <div className="inventory-panel">
        <div className="line-items-header">
          <h2>Inventory Monitor</h2>
          <span>Track stock and sales</span>
        </div>
        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Current Stock</th>
                <th>Sold Units</th>
                <th>Remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const sold = soldByProduct.get(item.productId) || 0;
                const remaining = item.stock - sold;
                const low = remaining <= 10;
                return (
                  <tr key={item.productId}>
                    <td>{item.productName}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        className="inventory-input"
                        value={item.stock}
                        onChange={(event) => updateInventoryStock(item.productId, event.target.value)}
                      />
                    </td>
                    <td>{sold}</td>
                    <td>{remaining}</td>
                    <td>
                      <span className={low ? 'stock-badge low' : 'stock-badge ok'}>
                        {low ? 'Low Stock' : 'Healthy'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="orders-panel">
        <div className="line-items-header">
          <h2>Orders</h2>
          <span>{orders.length} total</span>
        </div>
        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date & Time</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Proof</th>
                <th>Address</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{new Date(order.createdAt).toLocaleString()}</td>
                  <td>{order.customer.name}<small>{order.customer.contact}</small></td>
                  <td>{order.items.map((item) => <small key={`${item.productName}-${item.variant}`}>{item.quantity} x {item.productName} - {item.variant}</small>)}</td>
                  <td>{currency(order.total)}</td>
                  <td>{order.customer.payment}</td>
                  <td>
                    {order.customer.proofOfPayment ? (
                      <a className="proof-link" href={order.customer.proofOfPayment} target="_blank" rel="noreferrer">
                        View Proof
                      </a>
                    ) : (
                      <small>No upload</small>
                    )}
                  </td>
                  <td>Pick-up only</td>
                  <td>
                    <select value={order.status} onChange={(event) => updateStatus(order.id, event.target.value)}>
                      {statusOptions.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </td>
                  <td><button className="remove-button" onClick={() => deleteOrder(order.id)}>Delete</button></td>
                </tr>
              ))}
              {!orders.length && (
                <tr>
                  <td colSpan="10" className="empty-cell">No orders yet. Submitted customer orders will appear here.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function ChartCard({ title, children }) {
  return (
    <article className="chart-card">
      <h2>{title}</h2>
      {children}
    </article>
  );
}

function BarList({ data }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  if (!data.length) return <p className="empty-chart">No data yet.</p>;
  return (
    <div className="bar-list">
      {data.map((item) => (
        <div className="bar-row" key={item.name}>
          <span>{item.name}</span>
          <div><i style={{ width: `${(item.value / max) * 100}%` }} /></div>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function StatusDonut({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (!total) return <p className="empty-chart">No status data yet.</p>;
  let running = 0;
  const colors = ['#b91c1c', '#facc15', '#15803d', '#111827', '#6b7280'];
  const gradient = data.map((item, index) => {
    const start = (running / total) * 100;
    running += item.value;
    const end = (running / total) * 100;
    return `${colors[index % colors.length]} ${start}% ${end}%`;
  }).join(', ');
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background: `conic-gradient(${gradient})` }}>
        <span>{total}</span>
      </div>
      <div className="status-legend">
        {data.map((item, index) => <span key={item.name}><i style={{ background: colors[index % colors.length] }} />{item.name}: {item.value}</span>)}
      </div>
    </div>
  );
}

function LineChart({ data }) {
  if (!data.length) return <p className="empty-chart">No order volume yet.</p>;
  const max = Math.max(...data.map((item) => item.value), 1);
  const points = data.map((item, index) => {
    const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
    const y = 100 - (item.value / max) * 86 - 7;
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="line-chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points={points} />
      </svg>
      <div className="line-labels">
        {data.map((item) => <span key={item.name}>{item.name.slice(5)}</span>)}
      </div>
    </div>
  );
}

function getAnalytics(orders) {
  const now = new Date();
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const monthRevenue = orders
    .filter((order) => {
      const date = new Date(order.createdAt);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, order) => sum + order.total, 0);

  const productMap = new Map();
  const statusMap = new Map(statusOptions.map((status) => [status, 0]));
  const dailyMap = new Map();
  const customerMap = new Map();

  orders.forEach((order) => {
    statusMap.set(order.status, (statusMap.get(order.status) || 0) + 1);
    const day = order.createdAt.slice(0, 10);
    dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
    customerMap.set(order.customer.name, (customerMap.get(order.customer.name) || 0) + 1);
    order.items.forEach((item) => {
      productMap.set(item.productName, (productMap.get(item.productName) || 0) + item.quantity);
    });
  });

  return {
    totalRevenue,
    monthRevenue,
    averageOrder: orders.length ? totalRevenue / orders.length : 0,
    productTotals: [...productMap].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    statusTotals: [...statusMap].map(([name, value]) => ({ name, value })).filter((item) => item.value > 0),
    dailyTotals: [...dailyMap].map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name)).slice(-7),
    customerTotals: [...customerMap].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
  };
}

export default App;
