const productImagePath = "assets/produtos/1 produto/Site/Frontal";

const productSeed = [
  ["benfica", "Benfica", "Benfica produto frontal.png", "PC-BEN-001", "#d71920", 24],
  ["sporting", "Sporting", "sporting produto frontal.png", "PC-SCP-001", "#0f8f43", 20],
  ["psg", "Paris Saint-Germain", "psg produto frontal.png", "PC-PSG-001", "#0057a8", 18],
  ["barcelona", "Barcelona", "Barcelona produto frontal.png", "PC-BAR-001", "#a50044", 22],
  ["real-madrid", "Real Madrid", "Real Madrid produto frontal.png", "PC-RMA-001", "#111318", 19],
  ["porto", "Porto", "Porto produto frontal.png", "PC-POR-001", "#0055a5", 21],
  ["portugal", "Portugal", "Portugal produto frontal.png", "PC-PT-001", "#c8102e", 16],
  ["arsenal", "Arsenal", "arsenal produto frontal.png", "PC-ARS-001", "#ef0107", 18],
  ["atl-madrid", "Atletico Madrid", "atl madrid produto frontal.png", "PC-ATM-001", "#cb3524", 15],
  ["bayern", "Bayern", "bayern produto frontal.png", "PC-BAY-001", "#dc052d", 17],
  ["chelsea", "Chelsea", "chelsea produto frontal.png", "PC-CHE-001", "#034694", 14],
  ["flamengo", "Flamengo", "flamengo produto frontal.png", "PC-FLA-001", "#c52613", 13],
  ["man-city", "Man City", "Man City produto frontal.png", "PC-MCI-001", "#6cabdd", 18],
  ["man-utd", "Man United", "man utd produto frontal.png", "PC-MUN-001", "#da291c", 16],
  ["vasco-da-gama", "Vasco da Gama", "vasco da gama produto frontal.png", "PC-VAS-001", "#111318", 12],
];

const products = productSeed.map(([slug, club, file, sku, accent, stock]) => ({
  id: slug,
  club,
  name: `${club} ProCups`,
  slug,
  image: `${productImagePath}/${file}`,
  gallery: [`${productImagePath}/${file}`],
  price: 29.9,
  duoPrice: 39.9,
  stock,
  sku,
  status: "Active",
  accent,
}));

const defaultOrders = [
  {
    id: "#1007",
    customer: "Tiago Martins",
    email: "tiago@email.pt",
    phone: "910 000 001",
    product: "Benfica ProCups",
    total: 29.9,
    units: 2,
    status: "In production",
    payment: "Paid",
    channel: "Instagram",
  },
  {
    id: "#1006",
    customer: "Marta Silva",
    email: "marta@email.pt",
    phone: "910 000 002",
    product: "Sporting ProCups",
    total: 29.9,
    units: 2,
    status: "New",
    payment: "Pending",
    channel: "Website",
  },
];

const defaultCampaigns = [
  {
    id: "launch-bogo",
    name: "Buy 1 Get 2",
    type: "pair_same_price",
    status: "Paused",
    appliesTo: "All products",
    firstItemPrice: 29.9,
    additionalPaidItemPrice: 9.9,
    freeEverySecondItem: true,
  },
  {
    id: "two-controller-upgrade",
    name: "2-controller stand for 1-controller price",
    type: "capacity_upgrade",
    status: "Active",
    appliesTo: "All products",
    fromCapacity: "1",
    targetCapacity: "2",
  },
  {
    id: "free-shipping-50",
    name: "Free shipping over 50 EUR",
    type: "free_shipping",
    status: "Active",
    appliesTo: "All products",
    threshold: 50,
    shippingCost: 4.9,
  },
];

const orderStatuses = ["New", "Paid", "In production", "Ready to ship", "Shipped", "Cancelled"];

const nextOrderStatus = {
  New: "Paid",
  Paid: "In production",
  "In production": "Ready to ship",
  "Ready to ship": "Shipped",
};

const state = {
  cart: JSON.parse(localStorage.getItem("procups_cart") || "[]"),
  orders: JSON.parse(localStorage.getItem("procups_orders") || JSON.stringify(defaultOrders)),
  campaigns: JSON.parse(localStorage.getItem("procups_campaigns") || JSON.stringify(defaultCampaigns)),
  adminTab: "overview",
  selectedOrderId: "",
  selectedGalleryImage: "",
  productOptions: {
    capacity: "1",
    personalizedName: "no",
    customName: "",
  },
};

const app = document.querySelector("#app");
const promoBar = document.querySelector("[data-promo-bar]");
const siteHeader = document.querySelector("[data-site-header]");
const cartDrawer = document.querySelector("[data-cart-drawer]");
const cartLines = document.querySelector("[data-cart-lines]");
const cartCount = document.querySelector("[data-cart-count]");
const cartSubtotal = document.querySelector("[data-cart-subtotal]");
const cartFree = document.querySelector("[data-cart-free]");
const cartShipping = document.querySelector("[data-cart-shipping]");

function normalizeCampaigns(savedCampaigns) {
  if (savedCampaigns.some((campaign) => !campaign.type)) return defaultCampaigns;
  const savedById = new Map(savedCampaigns.map((campaign) => [campaign.id, campaign]));
  return defaultCampaigns.map((campaign) => {
    const saved = savedById.get(campaign.id);
    if (!saved) return campaign;
    return { ...campaign, ...saved, type: campaign.type };
  });
}

function money(value) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

function activeCampaigns(type) {
  return state.campaigns.filter((campaign) => campaign.status === "Active" && (!type || campaign.type === type));
}

function activePairCampaign() {
  return activeCampaigns("pair_same_price")[0] || null;
}

function activeCapacityCampaign() {
  return activeCampaigns("capacity_upgrade")[0] || null;
}

function activeShippingCampaign() {
  return activeCampaigns("free_shipping")[0] || null;
}

function totalUnits() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function regularSubtotal() {
  return state.cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
}

function cartPriceGroups() {
  const groups = new Map();
  state.cart.forEach((item) => {
    const key = item.price.toFixed(2);
    const current = groups.get(key) || { unitPrice: item.price, quantity: 0 };
    current.quantity += item.quantity;
    groups.set(key, current);
  });
  return [...groups.values()];
}

function campaignSubtotal() {
  const campaign = activePairCampaign();
  if (!campaign || !campaign.freeEverySecondItem || !totalUnits()) return regularSubtotal();
  return cartPriceGroups().reduce((sum, group) => {
    const paidSlots = Math.ceil(group.quantity / 2);
    return sum + group.unitPrice + Math.max(0, paidSlots - 1) * campaign.additionalPaidItemPrice;
  }, 0);
}

function discountTotal() {
  return Math.max(0, regularSubtotal() - campaignSubtotal());
}

function capacityUpgradeDiscount() {
  if (!activeCapacityCampaign()) return 0;
  return state.cart.reduce((sum, item) => {
    if (item.options?.capacity !== "2") return sum;
    const product = productById(item.id);
    return sum + Math.max(0, product.duoPrice - product.price) * item.quantity;
  }, 0);
}

function subtotal() {
  return campaignSubtotal();
}

function shippingCost() {
  if (!totalUnits()) return 0;
  const campaign = activeShippingCampaign();
  const baseShipping = campaign?.shippingCost ?? 4.9;
  if (campaign && subtotal() >= campaign.threshold) return 0;
  return baseShipping;
}

function orderTotal() {
  return subtotal() + shippingCost();
}

function freeUnits() {
  return cartPriceGroups().reduce((sum, group) => sum + Math.floor(group.quantity / 2), 0);
}

function campaignMatchSummary() {
  return cartPriceGroups()
    .filter((group) => group.quantity >= 2)
    .map((group) => `${Math.floor(group.quantity / 2)} pair${Math.floor(group.quantity / 2) === 1 ? "" : "s"} at ${money(group.unitPrice)}`)
    .join(" · ");
}

function saveCart() {
  localStorage.setItem("procups_cart", JSON.stringify(state.cart));
}

function saveOrders() {
  localStorage.setItem("procups_orders", JSON.stringify(state.orders));
}

function saveCampaigns() {
  localStorage.setItem("procups_campaigns", JSON.stringify(state.campaigns));
}

function renderPromoBar() {
  const campaigns = activeCampaigns();
  if (!campaigns.length) {
    promoBar.innerHTML = "<span>ProCups</span> Custom PS5 controller stands.";
    return;
  }
  promoBar.innerHTML = `<span>${campaigns.map((campaign) => campaign.name).join(" + ")}</span>`;
}

function isAdminAuthed() {
  return sessionStorage.getItem("procups_admin") === "true";
}

function productById(productId) {
  return products.find((product) => product.id === productId || product.slug === productId) || products[0];
}

function currentProductOptions() {
  return {
    capacity: state.productOptions.capacity,
    personalizedName: state.productOptions.personalizedName,
    customName: state.productOptions.customName.trim(),
  };
}

function configuredPrice(product, options) {
  const capacityCampaign = activeCapacityCampaign();
  const base = options.capacity === "2" && capacityCampaign ? product.price : options.capacity === "2" ? product.duoPrice : product.price;
  return options.personalizedName === "yes" ? base + 5 : base;
}

function optionLabel(options) {
  const capacity = options.capacity === "2" ? "Stand for 2 controllers" : "Stand for 1 controller";
  const name = options.personalizedName === "yes" ? `Custom name${options.customName ? `: ${options.customName}` : ""}` : "No custom name";
  return `${capacity} - ${name}`;
}

function cartKey(productId, options) {
  return `${productId}-${options.capacity}-${options.personalizedName}-${options.customName || "no-name"}`;
}

function addToCart(productId, rawOptions = currentProductOptions()) {
  const product = productById(productId);
  const options = { ...rawOptions, customName: rawOptions.customName?.trim() || "" };
  const key = cartKey(product.id, options);
  const itemPrice = configuredPrice(product, options);
  const current = state.cart.find((item) => item.key === key);
  if (current) {
    current.quantity += 1;
  } else {
    state.cart.push({ ...product, key, price: itemPrice, options, optionLabel: optionLabel(options), quantity: 1 });
  }
  saveCart();
  renderCart();
  openCart();
}

function refreshCartPrices() {
  state.cart = state.cart.map((item) => {
    const product = productById(item.id);
    return { ...item, price: configuredPrice(product, item.options || { capacity: "1", personalizedName: "no", customName: "" }) };
  });
  saveCart();
}

state.campaigns = normalizeCampaigns(state.campaigns);
saveCampaigns();
refreshCartPrices();

function changeQuantity(productId, delta) {
  const current = state.cart.find((item) => item.key === productId || item.id === productId);
  if (!current) return;
  current.quantity += delta;
  if (current.quantity <= 0) {
    state.cart = state.cart.filter((item) => item.key !== productId && item.id !== productId);
  }
  saveCart();
  renderCart();
}

function renderCart() {
  const pairCampaign = activePairCampaign();
  const shippingCampaign = activeShippingCampaign();
  cartCount.textContent = totalUnits();
  cartSubtotal.textContent = money(subtotal());
  cartFree.textContent = discountTotal() > 0 ? `-${money(discountTotal())}` : "No discount";
  cartShipping.textContent = shippingCost() === 0 && totalUnits() ? "Free" : money(shippingCost());
  renderPromoBar();

  if (!state.cart.length) {
    cartLines.innerHTML = '<div class="empty-state">Your cart is empty.</div>';
    return;
  }

  cartLines.innerHTML = state.cart
    .map(
      (item) => `
        <div class="cart-line">
          <img src="${item.image}" alt="${item.name}" />
          <div>
            <strong>${item.name}</strong>
            <p>${item.optionLabel || ""}</p>
            <p>${item.quantity} unit${item.quantity === 1 ? "" : "s"}</p>
            <div class="line-controls">
              <button type="button" data-qty="${item.key || item.id}" data-delta="-1" aria-label="Remove unit">-</button>
              <span>${item.quantity}</span>
              <button type="button" data-qty="${item.key || item.id}" data-delta="1" aria-label="Add unit">+</button>
            </div>
          </div>
          <strong>${money(item.quantity * item.price)}</strong>
        </div>
      `
    )
    .join("") +
    (pairCampaign && discountTotal() > 0
      ? `
        <div class="cart-promo">
          <strong>${pairCampaign.name}</strong>
          <span>${freeUnits()} free unit${freeUnits() === 1 ? "" : "s"} applied across matching-price products</span>
          <span>${campaignMatchSummary()}</span>
          <em>-${money(discountTotal())}</em>
        </div>
      `
      : "") +
    (shippingCampaign
      ? `
        <div class="cart-promo">
          <strong>${shippingCampaign.name}</strong>
          <span>${subtotal() >= shippingCampaign.threshold ? "Free shipping applied" : `${money(Math.max(0, shippingCampaign.threshold - subtotal()))} away from free shipping`}</span>
          <em>${shippingCost() === 0 && totalUnits() ? "Free" : money(shippingCost())}</em>
        </div>
      `
      : "") +
    (activeCapacityCampaign() && capacityUpgradeDiscount() > 0
      ? `
        <div class="cart-promo">
          <strong>${activeCapacityCampaign().name}</strong>
          <span>2-controller stand priced as 1-controller stand</span>
          <em>-${money(capacityUpgradeDiscount())}</em>
        </div>
      `
      : "");
}

function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
}

function showPublicHeader(show = true) {
  promoBar.hidden = !show;
  siteHeader.hidden = !show;
}

function routeTo(hash) {
  window.location.hash = hash;
}

function renderBestSellers() {
  return products
    .map(
      (product) => `
        <article class="seller-card">
          <a class="seller-media" href="#produto/${product.slug}" aria-label="View ${product.name}">
            <img src="${product.image}" alt="${product.name}" />
          </a>
          <div class="seller-copy">
            <h3>${product.name}</h3>
            <button class="text-button" type="button" data-add="${product.id}">Add to cart</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderHome() {
  showPublicHeader(true);
  app.innerHTML = `
    <section class="hero" id="loja">
      <div class="hero-stage">
        <div class="hero-copy">
          <h1>Buy 1<br />Get 2</h1>
          <p>Custom PS5 controller stands for your club. Limited launch offer.</p>
          <div class="hero-actions">
            <a class="primary-button" href="#produto/benfica">Shop now</a>
            <a class="ghost-button" href="#produtos">View collection</a>
          </div>
        </div>
      </div>
    </section>

    <section class="store-section best-sellers" id="produtos">
      <div class="section-header compact">
        <p class="eyebrow">Validated collection</p>
        <h2>Choose your ProCups</h2>
        <p>All available clubs and national teams, ready for guest checkout.</p>
      </div>
      <div class="seller-grid">${renderBestSellers()}</div>
    </section>

    <section class="how-section" id="personalizar">
      <div class="section-header centered">
        <p class="eyebrow">3 simple steps</p>
        <h2>How it works</h2>
      </div>
      <div class="steps-layout">
        <article class="step-card">
          <span>1</span>
          <div class="step-image soft-red"><img src="${productImagePath}/benfica produto frontal.png" alt="Choose a ProCups club" /></div>
          <div><h3>Choose the club</h3><p>Select your emblem or request a custom club.</p></div>
        </article>
        <article class="step-card step-right">
          <span>2</span>
          <div class="step-image soft-green"><img src="${productImagePath}/psg produto frontal.png" alt="Confirm a ProCups order" /></div>
          <div><h3>Checkout as a guest</h3><p>Leave your email, phone and shipping address. No account needed.</p></div>
        </article>
        <article class="step-card">
          <span>3</span>
          <div class="step-image soft-grey"><img src="${productImagePath}/Portugal produto frontal.png" alt="Receive ProCups updates" /></div>
          <div><h3>Get updates</h3><p>The backend will send automatic emails with confirmation and order status.</p></div>
        </article>
      </div>
    </section>

    <section class="testimonials-section">
      <div class="section-header centered">
        <p class="eyebrow">Setup approved</p>
        <h2>Made to be seen.</h2>
      </div>
      <div class="testimonial-gallery">
        <img src="${productImagePath}/sporting produto frontal.png" alt="ProCups Sporting" />
        <img src="${productImagePath}/psg produto frontal.png" alt="ProCups PSG" />
        <img src="${productImagePath}/vasco da gama produto frontal.png" alt="ProCups Vasco da Gama" />
      </div>
      <article class="quote-card">
        <span class="quote-mark">"</span>
        <p>I bought it as a gift and it looked even better than expected. The controller stays tidy and the team emblem stands out instantly.</p>
        <strong>ProCups customer</strong>
      </article>
    </section>
  `;
}

function renderProduct(productId) {
  showPublicHeader(true);
  const product = productById(productId);
  const mainImage = state.selectedGalleryImage || product.gallery[0];
  const options = currentProductOptions();
  const activePrice = configuredPrice(product, options);
  app.innerHTML = `
    <section class="product-page">
      <div class="product-gallery">
        <div class="gallery-main"><img src="${mainImage}" alt="${product.name}" /></div>
        <div class="gallery-thumbs">
          ${product.gallery
            .map(
              (image) => `
                <button class="${image === mainImage ? "active" : ""}" type="button" data-gallery="${image}" aria-label="View product image">
                  <img src="${image}" alt="" />
                </button>
              `
            )
            .join("")}
        </div>
      </div>
      <div class="product-info">
        <p class="eyebrow">Your club, your setup</p>
        <h1>${product.name}</h1>
        <p class="product-lead">ProCups ${product.club}, made to order for PS5 controllers. This page is only for this club/product; choose the 1 or 2 controller version and whether you want a custom name.</p>
        <div class="product-price-row">
          <strong>${money(activePrice)}</strong>
          <span class="badge green">You get 2</span>
        </div>
        <div class="option-panel">
          <label>Capacity</label>
          <div class="choice-grid" role="radiogroup" aria-label="Stand capacity">
            <button class="${options.capacity === "1" ? "active" : ""}" type="button" data-option="capacity" data-value="1">
              <strong>1 controller</strong>
              <span>${money(product.price)}</span>
            </button>
            <button class="${options.capacity === "2" ? "active" : ""}" type="button" data-option="capacity" data-value="2">
              <strong>2 controllers</strong>
              <span>${money(configuredPrice(product, { ...options, capacity: "2", personalizedName: "no", customName: "" }))}${activeCapacityCampaign() ? " campaign" : ""}</span>
            </button>
          </div>
        </div>
        <div class="option-panel">
          <label>Custom name</label>
          <div class="choice-grid" role="radiogroup" aria-label="Custom name">
            <button class="${options.personalizedName === "no" ? "active" : ""}" type="button" data-option="personalizedName" data-value="no">
              <strong>No name</strong>
              <span>Included</span>
            </button>
            <button class="${options.personalizedName === "yes" ? "active" : ""}" type="button" data-option="personalizedName" data-value="yes">
              <strong>With name</strong>
              <span>+ ${money(5)}</span>
            </button>
          </div>
          <input class="custom-name-input" ${options.personalizedName === "yes" ? "" : "hidden"} value="${options.customName}" data-custom-name maxlength="18" placeholder="Name to add to your ProCups" />
        </div>
        <div class="trust-list">
          <span>No account required</span>
          <span>Online payment in the backend phase</span>
          <span>Current stock: ${product.stock}</span>
        </div>
        <div class="product-actions">
          <button id="main-add-to-cart" class="primary-button" type="button" data-add="${product.id}">Add to cart</button>
          <a class="secondary-button" href="#checkout">Checkout</a>
        </div>
      </div>
    </section>
  `;
}

function renderCheckout() {
  showPublicHeader(true);
  if (!state.cart.length) {
    app.innerHTML = `
      <section class="checkout-page narrow">
        <p class="eyebrow">Checkout</p>
        <h1>Your cart is empty.</h1>
        <p>Choose a ProCups to continue.</p>
        <a class="primary-button" href="#produtos">View products</a>
      </section>
    `;
    return;
  }

  app.innerHTML = `
    <section class="checkout-page">
      <form class="checkout-form" data-checkout-form>
        <div>
          <p class="eyebrow">Guest checkout</p>
          <h1>Complete your order</h1>
          <p>No login. We only use your details to confirm the order and prepare shipping.</p>
        </div>
        <div class="form-grid">
          <label>Full name<input required name="name" autocomplete="name" placeholder="Ex. Tiago Martins" /></label>
          <label>Email<input required type="email" name="email" autocomplete="email" placeholder="nome@email.com" /></label>
          <label>Phone<input required name="phone" autocomplete="tel" placeholder="+351 9..." /></label>
          <label>Address<input required name="address" autocomplete="street-address" placeholder="Street, number, floor" /></label>
          <label>City<input required name="city" autocomplete="address-level2" placeholder="Lisbon" /></label>
          <label>Postal code<input required name="postal" autocomplete="postal-code" placeholder="0000-000" /></label>
        </div>
        <label>Optional notes<textarea name="notes" rows="3" placeholder="Custom club, delivery details, etc."></textarea></label>
        <button class="primary-button" type="submit">Confirm order</button>
      </form>
      <aside class="checkout-summary">
        <h2>Summary</h2>
        ${state.cart
          .map(
            (item) => `
              <div class="summary-line">
                <img src="${item.image}" alt="${item.name}" />
                <div><strong>${item.name}</strong><span>${item.optionLabel || ""}</span><span>${item.quantity} unit${item.quantity === 1 ? "" : "s"}</span></div>
                <strong>${money(item.quantity * item.price)}</strong>
              </div>
            `
          )
          .join("")}
        ${
          activePairCampaign() && discountTotal() > 0
            ? `<div class="summary-line discount-line"><div><strong>${activePairCampaign().name}</strong><span>${freeUnits()} free unit${freeUnits() === 1 ? "" : "s"} applied across matching-price products</span><span>${campaignMatchSummary()}</span></div><strong>-${money(discountTotal())}</strong></div>`
            : ""
        }
        ${
          activeShippingCampaign()
            ? `<div class="summary-line discount-line"><div><strong>${activeShippingCampaign().name}</strong><span>${subtotal() >= activeShippingCampaign().threshold ? "Free shipping applied" : `${money(Math.max(0, activeShippingCampaign().threshold - subtotal()))} away from free shipping`}</span></div><strong>${shippingCost() === 0 && totalUnits() ? "Free" : money(shippingCost())}</strong></div>`
            : `<div class="summary-line discount-line"><div><strong>Shipping</strong></div><strong>${money(shippingCost())}</strong></div>`
        }
        ${
          activeCapacityCampaign() && capacityUpgradeDiscount() > 0
            ? `<div class="summary-line discount-line"><div><strong>${activeCapacityCampaign().name}</strong><span>2-controller stand priced as 1-controller stand</span></div><strong>-${money(capacityUpgradeDiscount())}</strong></div>`
            : ""
        }
        <div class="summary-total"><span>Total</span><strong>${money(orderTotal())}</strong></div>
        <p>Stripe/MB Way payment comes in the backend phase. In this prototype, the order is stored locally.</p>
      </aside>
    </section>
  `;
}

function renderThankYou(orderId) {
  showPublicHeader(true);
  app.innerHTML = `
    <section class="thank-you-page">
      <p class="eyebrow">Order received</p>
      <h1>Thank you. Your order ${orderId} has been registered.</h1>
      <p>In the backend version, this step creates the order in the database and automatically sends the confirmation email.</p>
      <div class="thank-you-actions">
        <a class="primary-button" href="#loja">Back to store</a>
      </div>
    </section>
  `;
}

function renderAdminLogin() {
  showPublicHeader(false);
  app.innerHTML = `
    <section class="login-page">
      <form class="login-panel" data-admin-login>
        <img src="assets/logotipo/logo procups.png" alt="ProCups" />
        <p class="eyebrow">Restricted area</p>
        <h1>Admin ProCups</h1>
        <label>Password<input required type="password" name="password" placeholder="Password admin" /></label>
        <button class="primary-button" type="submit">Log in</button>
        <p class="login-hint">Local prototype mock. Real backend: Supabase Auth.</p>
      </form>
    </section>
  `;
}

function adminMetrics() {
  const revenue = state.orders.reduce((sum, order) => sum + order.total, 0);
  return `
    <div class="metric-grid">
      <article class="admin-card"><span>Sales</span><strong>${money(revenue)}</strong><p>Total registered.</p></article>
      <article class="admin-card"><span>Open</span><strong>${state.orders.filter((o) => o.status !== "Shipped").length}</strong><p>Need action.</p></article>
      <article class="admin-card"><span>Customers</span><strong>${new Set(state.orders.map((o) => o.email)).size}</strong><p>Unique buyers.</p></article>
      <article class="admin-card"><span>Products</span><strong>${products.length}</strong><p>Active catalog.</p></article>
    </div>
  `;
}

function ordersTable() {
  return `
    <table class="data-table">
      <thead><tr><th>Order</th><th>Customer</th><th>Product</th><th>Units</th><th>Total</th><th>Status</th><th>Payment</th></tr></thead>
      <tbody>
        ${state.orders
          .map(
            (order) => `
              <tr>
                <td><strong>${order.id}</strong></td>
                <td>${order.customer}<br /><span>${order.email}</span></td>
                <td>${order.product}</td>
                <td>${order.units}</td>
                <td>${money(order.total)}</td>
                <td><span class="badge ${order.status === "Shipped" ? "green" : order.status === "New" ? "red" : "blue"}">${order.status}</span></td>
                <td>${order.payment}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function orderById(orderId) {
  return state.orders.find((order) => order.id === orderId);
}

function orderStatusClass(status) {
  if (status === "Shipped" || status === "Paid") return "green";
  if (status === "New" || status === "Cancelled") return "red";
  return "blue";
}

function renderOrderCard(order) {
  const nextStatus = nextOrderStatus[order.status];
  return `
    <article class="order-mini-card" data-order-open="${order.id}">
      <div>
        <strong>${order.id}</strong>
        <span class="badge ${orderStatusClass(order.status)}">${order.status}</span>
      </div>
      <h3>${order.customer}</h3>
      <p>${order.product}</p>
      <div class="order-mini-meta">
        <span>${order.units} unit${order.units === 1 ? "" : "s"}</span>
        <strong>${money(order.total)}</strong>
      </div>
      <div class="row-actions">
        ${nextStatus ? `<button class="text-button" type="button" data-order-status="${order.id}" data-status="${nextStatus}">Mark ${nextStatus}</button>` : ""}
        <button class="text-button" type="button" data-order-open="${order.id}">Details</button>
      </div>
    </article>
  `;
}

function renderOrderDetail() {
  const order = orderById(state.selectedOrderId);
  if (!order) return "";
  const nextStatus = nextOrderStatus[order.status];
  return `
    <aside class="order-detail-panel" data-order-panel>
      <div class="drawer-header">
        <div>
          <p class="eyebrow">Order detail</p>
          <h2>${order.id}</h2>
        </div>
        <button class="icon-button" type="button" data-order-close aria-label="Close order detail">x</button>
      </div>
      <div class="order-detail-body">
        <section>
          <span class="badge ${orderStatusClass(order.status)}">${order.status}</span>
          <h3>${order.customer}</h3>
          <p>${order.email}<br />${order.phone || ""}</p>
        </section>
        <section>
          <h4>Items</h4>
          <p>${order.product}</p>
          <strong>${order.units} unit${order.units === 1 ? "" : "s"} · ${money(order.total)}</strong>
        </section>
        <section>
          <h4>Shipping</h4>
          <p>${order.address || "Address captured at checkout."}</p>
        </section>
        <section>
          <h4>Internal notes</h4>
          <p>${order.notes || "No notes yet."}</p>
        </section>
        <section>
          <h4>Timeline</h4>
          <div class="timeline-list">
            ${(order.timeline || [{ label: "Order created", at: "Prototype" }]).map((event) => `<div><strong>${event.label}</strong><span>${event.at}</span></div>`).join("")}
          </div>
        </section>
      </div>
      <div class="order-detail-actions">
        ${nextStatus ? `<button class="primary-button" type="button" data-order-status="${order.id}" data-status="${nextStatus}">Mark ${nextStatus}</button>` : ""}
        <button class="ghost-button" type="button" data-order-status="${order.id}" data-status="Cancelled">Cancel order</button>
      </div>
    </aside>
  `;
}

function renderOrdersCommandCenter() {
  const statusCounts = orderStatuses.map((status) => `${status}: ${state.orders.filter((order) => order.status === status).length}`).join(" · ");
  return `
    <section class="table-card">
      <div class="table-header">
        <div><h2>Orders command center</h2><p>${statusCounts}</p></div>
      </div>
      <div class="orders-board">
        ${orderStatuses
          .map((status) => {
            const orders = state.orders.filter((order) => order.status === status);
            return `
              <section class="workflow-column">
                <header><h3>${status}</h3><span>${orders.length}</span></header>
                <div class="workflow-list">
                  ${orders.length ? orders.map(renderOrderCard).join("") : `<div class="empty-state">No ${status.toLowerCase()} orders.</div>`}
                </div>
              </section>
            `;
          })
          .join("")}
      </div>
    </section>
    ${renderOrderDetail()}
  `;
}

function campaignExampleRows(campaign) {
  if (campaign.type === "free_shipping") {
    return [29.9, 50, 59.8].map((value) => `<div><span>${money(value)} cart</span><strong>${value >= campaign.threshold ? "Free shipping" : money(campaign.shippingCost)}</strong></div>`).join("");
  }
  if (campaign.type === "capacity_upgrade") {
    return `<div><span>1-controller stand</span><strong>${money(29.9)}</strong></div><div><span>2-controller stand</span><strong>${money(29.9)}</strong></div>`;
  }
  return [1, 2, 3, 4]
    .map((units) => {
      const paidSlots = Math.ceil(units / 2);
      const total = campaign.firstItemPrice + Math.max(0, paidSlots - 1) * campaign.additionalPaidItemPrice;
      return `<div><span>${units} item${units === 1 ? "" : "s"}</span><strong>${money(total)}</strong></div>`;
    })
    .join("");
}

function campaignRuleCopy(campaign) {
  if (campaign.type === "free_shipping") return `Shipping becomes free when the cart subtotal reaches ${money(campaign.threshold)}. Standard shipping is ${money(campaign.shippingCost)}.`;
  if (campaign.type === "capacity_upgrade") return "The 2-controller stand uses the same base price as the 1-controller stand. Custom name still adds its own price.";
  return `Pairs can mix different products, but only when they have the same unit price. Each next paid item in the same price group adds ${money(campaign.additionalPaidItemPrice)}.`;
}

function renderCampaignEditor(campaign) {
  return `
    <article class="campaign-card">
      <form class="campaign-form" data-campaign-form data-campaign-id="${campaign.id}">
        <label>Campaign name<input required name="name" value="${campaign.name}" /></label>
        <label>Status
          <select name="status">
            <option ${campaign.status === "Active" ? "selected" : ""}>Active</option>
            <option ${campaign.status === "Draft" ? "selected" : ""}>Draft</option>
            <option ${campaign.status === "Paused" ? "selected" : ""}>Paused</option>
          </select>
        </label>
        <label>Applies to<input required name="appliesTo" value="${campaign.appliesTo}" /></label>
        ${
          campaign.type === "pair_same_price"
            ? `<label>Example item price<input required type="number" min="0" step="0.01" name="firstItemPrice" value="${campaign.firstItemPrice}" /></label>
               <label>Next paid item price per group<input required type="number" min="0" step="0.01" name="additionalPaidItemPrice" value="${campaign.additionalPaidItemPrice}" /></label>
               <label class="checkbox-line"><input type="checkbox" name="freeEverySecondItem" ${campaign.freeEverySecondItem ? "checked" : ""} /> Every second item is free</label>`
            : ""
        }
        ${
          campaign.type === "free_shipping"
            ? `<label>Free shipping threshold<input required type="number" min="0" step="0.01" name="threshold" value="${campaign.threshold}" /></label>
               <label>Standard shipping cost<input required type="number" min="0" step="0.01" name="shippingCost" value="${campaign.shippingCost}" /></label>`
            : ""
        }
        <button class="primary-button" type="submit">Save campaign</button>
      </form>
      <aside class="campaign-preview">
        <p class="eyebrow">${campaign.status}</p>
        <h3>${campaign.name}</h3>
        <p>${campaignRuleCopy(campaign)}</p>
        <div class="campaign-examples">${campaignExampleRows(campaign)}</div>
      </aside>
    </article>
  `;
}

function adminContent() {
  if (state.adminTab === "orders") {
    return renderOrdersCommandCenter();
  }
  if (state.adminTab === "products") {
    return `
      <section class="table-card">
        <div class="table-header"><div><h2>Products</h2><p>Catalog and stock registry.</p></div><button class="primary-button" type="button">New product</button></div>
        <table class="data-table">
          <thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
          <tbody>${products.map((product) => `<tr><td><strong>${product.name}</strong><br /><span>${product.club}</span></td><td>${product.sku}</td><td>${money(product.price)}</td><td>${product.stock}</td><td><span class="badge green">${product.status}</span></td></tr>`).join("")}</tbody>
        </table>
      </section>`;
  }
  if (state.adminTab === "customers") {
    const customers = state.orders.map((order) => ({ name: order.customer, email: order.email, phone: order.phone, channel: order.channel }));
    return `
      <section class="table-card">
        <div class="table-header"><div><h2>Customers</h2><p>Contacts captured through guest checkout.</p></div></div>
        <table class="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Source</th></tr></thead>
          <tbody>${customers.map((customer) => `<tr><td><strong>${customer.name}</strong></td><td>${customer.email}</td><td>${customer.phone}</td><td>${customer.channel}</td></tr>`).join("")}</tbody>
        </table>
      </section>`;
  }
  if (state.adminTab === "campaigns") {
    return `
      <section class="table-card">
        <div class="table-header">
          <div><h2>Campaigns & discounts</h2><p>Edit product, cart and shipping promotions before connecting the database.</p></div>
          <span class="badge green">${activeCampaigns().length} active</span>
        </div>
        <div class="campaign-editor">
          ${state.campaigns.map(renderCampaignEditor).join("")}
        </div>
      </section>`;
  }
  return `
    ${adminMetrics()}
    <div class="admin-layout">
      <section class="table-card"><div class="table-header"><div><h2>Recent orders</h2><p>Payment, production and shipping.</p></div></div>${ordersTable()}</section>
      <section class="table-card">
        <div class="table-header"><div><h2>Automations</h2><p>Prepared for the backend.</p></div></div>
        <div class="task-list">
          <div class="order-card"><strong>Confirmation email</strong><span class="badge blue">Webhook</span><p>Trigger when checkout creates an order.</p></div>
          <div class="order-card"><strong>Payment confirmed</strong><span class="badge green">Stripe</span><p>Update order to Paid.</p></div>
          <div class="order-card"><strong>Shipping prepared</strong><span class="badge">Manual</span><p>Update tracking and send email.</p></div>
        </div>
      </section>
    </div>
  `;
}

function renderAdmin() {
  if (!isAdminAuthed()) {
    routeTo("admin-login");
    return;
  }
  showPublicHeader(false);
  const tabs = [
    ["overview", "Home"],
    ["orders", "Orders"],
    ["products", "Products"],
    ["customers", "Customers"],
    ["campaigns", "Campaigns"],
  ];
  app.innerHTML = `
    <section class="admin-shell">
      <aside class="admin-sidebar">
        <div class="admin-brand"><img src="assets/logotipo/logo procups.png" alt="ProCups" /><strong>Admin</strong></div>
        <nav class="admin-nav" aria-label="Dashboard">
          ${tabs.map(([id, label]) => `<button class="tab-button ${state.adminTab === id ? "active" : ""}" type="button" data-admin-tab="${id}">${label}</button>`).join("")}
        </nav>
        <button class="ghost-button admin-logout" type="button" data-admin-logout>Log out</button>
      </aside>
      <div class="admin-main">
        <div class="admin-topbar">
          <div><p class="eyebrow">Restricted backoffice</p><h1>ProCups management</h1><p>Orders, customers and products in a simple panel.</p></div>
        </div>
        ${adminContent()}
      </div>
    </section>
  `;
}

function route() {
  const hash = window.location.hash.replace("#", "") || "loja";
  state.selectedGalleryImage = "";
  if (hash.startsWith("produto/")) return renderProduct(hash.split("/")[1]);
  if (hash === "checkout") return renderCheckout();
  if (hash.startsWith("obrigado/")) return renderThankYou(`#${hash.split("/")[1]}`);
  if (hash === "admin-login") return renderAdminLogin();
  if (hash === "admin") return renderAdmin();
  renderHome();
  if (hash && hash !== "loja") {
    requestAnimationFrame(() => document.querySelector(`#${hash}`)?.scrollIntoView({ block: "start" }));
  }
}

function submitCheckout(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const orderId = `#${1000 + state.orders.length + 1}`;
  const productsLabel = state.cart.map((item) => `${item.name} (${item.optionLabel || "standard"})`).join(", ");
  const units = totalUnits();
  state.orders = [
    {
      id: orderId,
      customer: data.name,
      email: data.email,
      phone: data.phone,
      product: productsLabel,
      total: orderTotal(),
      units,
      status: "New",
      payment: "Pending",
      channel: "Website",
      address: `${data.address}, ${data.postal} ${data.city}`,
      notes: data.notes || "",
      campaigns: activeCampaigns().map((campaign) => campaign.name),
      campaign: activeCampaigns().length
        ? {
            name: activeCampaigns().map((campaign) => campaign.name).join(" + "),
            discount: discountTotal(),
            regularTotal: regularSubtotal(),
            shipping: shippingCost(),
          }
        : null,
      timeline: [{ label: "Order created", at: new Date().toLocaleString("en-GB") }],
    },
    ...state.orders,
  ];
  state.cart = [];
  saveOrders();
  saveCart();
  renderCart();
  routeTo(`obrigado/${orderId.replace("#", "")}`);
}

document.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add]");
  const openButton = event.target.closest("[data-open-cart]");
  const closeButton = event.target.closest("[data-close-cart]");
  const qtyButton = event.target.closest("[data-qty]");
  const checkoutButton = event.target.closest("[data-checkout]");
  const galleryButton = event.target.closest("[data-gallery]");
  const optionButton = event.target.closest("[data-option]");
  const adminTab = event.target.closest("[data-admin-tab]");
  const adminLogout = event.target.closest("[data-admin-logout]");
  const orderOpen = event.target.closest("[data-order-open]");
  const orderClose = event.target.closest("[data-order-close]");
  const orderStatus = event.target.closest("[data-order-status]");

  if (orderStatus) {
    const order = orderById(orderStatus.dataset.orderStatus);
    if (order) {
      order.status = orderStatus.dataset.status;
      if (order.status === "Paid") order.payment = "Paid";
      order.timeline = [
        ...(order.timeline || []),
        { label: `Marked ${order.status}`, at: new Date().toLocaleString("en-GB") },
      ];
      saveOrders();
      renderAdmin();
    }
    return;
  }
  if (orderOpen) {
    state.selectedOrderId = orderOpen.dataset.orderOpen;
    renderAdmin();
    return;
  }
  if (orderClose) {
    state.selectedOrderId = "";
    renderAdmin();
    return;
  }
  if (addButton) addToCart(addButton.dataset.add);
  if (openButton) openCart();
  if (closeButton) closeCart();
  if (qtyButton) changeQuantity(qtyButton.dataset.qty, Number(qtyButton.dataset.delta));
  if (checkoutButton) {
    closeCart();
    routeTo("checkout");
  }
  if (galleryButton) {
    state.selectedGalleryImage = galleryButton.dataset.gallery;
    const hash = window.location.hash.replace("#produto/", "");
    renderProduct(hash);
  }
  if (optionButton) {
    state.productOptions[optionButton.dataset.option] = optionButton.dataset.value;
    if (optionButton.dataset.option === "personalizedName" && optionButton.dataset.value === "no") {
      state.productOptions.customName = "";
    }
    const hash = window.location.hash.replace("#produto/", "");
    renderProduct(hash);
  }
  if (adminTab) {
    state.adminTab = adminTab.dataset.adminTab;
    renderAdmin();
  }
  if (adminLogout) {
    sessionStorage.removeItem("procups_admin");
    routeTo("admin-login");
  }
});

document.addEventListener("input", (event) => {
  const customName = event.target.closest("[data-custom-name]");
  if (!customName) return;
  state.productOptions.customName = customName.value;
});

document.addEventListener("submit", (event) => {
  const checkoutForm = event.target.closest("[data-checkout-form]");
  const loginForm = event.target.closest("[data-admin-login]");
  const campaignForm = event.target.closest("[data-campaign-form]");
  if (checkoutForm) {
    event.preventDefault();
    submitCheckout(checkoutForm);
  }
  if (campaignForm) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(campaignForm).entries());
    const campaignId = campaignForm.dataset.campaignId;
    state.campaigns = state.campaigns.map((campaign) => {
      if (campaign.id !== campaignId) return campaign;
      return {
        ...campaign,
        name: data.name,
        status: data.status,
        appliesTo: data.appliesTo,
        firstItemPrice: data.firstItemPrice ? Number(data.firstItemPrice) : campaign.firstItemPrice,
        additionalPaidItemPrice: data.additionalPaidItemPrice ? Number(data.additionalPaidItemPrice) : campaign.additionalPaidItemPrice,
        threshold: data.threshold ? Number(data.threshold) : campaign.threshold,
        shippingCost: data.shippingCost ? Number(data.shippingCost) : campaign.shippingCost,
        freeEverySecondItem: campaign.type === "pair_same_price" ? data.freeEverySecondItem === "on" : campaign.freeEverySecondItem,
      };
    });
    saveCampaigns();
    refreshCartPrices();
    renderCart();
    renderAdmin();
  }
  if (loginForm) {
    event.preventDefault();
    const password = new FormData(loginForm).get("password");
    if (password === "procups2026") {
      sessionStorage.setItem("procups_admin", "true");
      routeTo("admin");
    } else {
      loginForm.querySelector("input").setCustomValidity("Incorrect password");
      loginForm.reportValidity();
      loginForm.querySelector("input").setCustomValidity("");
    }
  }
});

window.addEventListener("hashchange", route);
route();
renderCart();
