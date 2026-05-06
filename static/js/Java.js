+function () {
  const CART_KEY = "zdappy_cart";
  const THEME_KEY = "zdappy_theme";

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (error) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
  }

  function toNumber(priceText) {
    if (typeof priceText === "number") return priceText;
    const digits = String(priceText || "").replace(/[^\d.,]/g, "").replace(",", ".");
    const value = Number.parseFloat(digits);
    return Number.isFinite(value) ? value : 0;
  }

  function formatPrice(value) {
    return `${Math.round(value)} ₽`;
  }

  function updateCartCount() {
    const countEl = document.getElementById("cartCount");
    if (!countEl) return;
    const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
    countEl.textContent = String(count);
  }

  function applyTheme(theme) {
    const dark = theme === "dark";
    document.body.classList.toggle("dark-theme", dark);
    const toggle = document.getElementById("themeToggle");
    if (toggle) toggle.textContent = dark ? "☀️" : "🌙";
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || "light";
    applyTheme(saved);
  }

  function initCatalogMenu() {
    const catalogBtn = document.querySelector(".catalog-button");
    const catalogMenu = document.querySelector(".catalog-menu");

    if (!catalogBtn || !catalogMenu) return;

    catalogBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      catalogMenu.style.display = catalogMenu.style.display === "block" ? "none" : "block";
    });

    document.addEventListener("click", (event) => {
      if (!catalogMenu.contains(event.target) && !catalogBtn.contains(event.target)) {
        catalogMenu.style.display = "none";
      }
    });
  }

  function initAuthModals() {
    const overlay = document.getElementById("overlay");
    const loginModal = document.getElementById("loginModal");
    const registerModal = document.getElementById("registerModal");
    const openLogin = document.getElementById("openLogin");
    const openRegister = document.getElementById("openRegister");
    const entrance = document.querySelector(".entrance");

    if (!overlay || !loginModal || !registerModal || !entrance) return;

    const openModal = (modal) => {
      overlay.classList.remove("hidden");
      modal.classList.remove("hidden");
    };

    const closeModals = () => {
      overlay.classList.add("hidden");
      loginModal.classList.add("hidden");
      registerModal.classList.add("hidden");
    };

    entrance.addEventListener("click", (event) => {
      event.preventDefault();
      openModal(loginModal);
    });

    openRegister?.addEventListener("click", () => {
      loginModal.classList.add("hidden");
      openModal(registerModal);
    });

    openLogin?.addEventListener("click", () => {
      registerModal.classList.add("hidden");
      openModal(loginModal);
    });

    overlay.addEventListener("click", closeModals);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModals();
    });

    document.addEventListener("click", (event) => {
      const clickedInside = loginModal.contains(event.target) || registerModal.contains(event.target);
      const clickedEntrance = event.target.closest(".entrance");
      if (!clickedInside && !clickedEntrance && !event.target.closest("#overlay")) {
        return;
      }
    });
  }

  function buildCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";

    const image = product.image || "";
    const title = product.name || "Без названия";
    const description = product.description || "";
    const priceText = product.price_text || formatPrice(product.price_value || 0);
    const category = product.category || "";

    card.innerHTML = `
      <img src="${image}" alt="${title}">
      <div class="product-body">
        <span class="badge">${category}</span>
        <h3>${title}</h3>
        <p class="product-description">${description}</p>
        <p class="price">${priceText}</p>
        <div class="card-actions">
          <button type="button" class="add-to-cart" data-title="${escapeHtml(title)}" data-price="${escapeHtml(String(priceText))}" data-image="${escapeHtml(image)}">В корзину</button>
        </div>
      </div>
    `;

    card.querySelector(".add-to-cart")?.addEventListener("click", () => {
      const cart = getCart();
      const existing = cart.find((item) => item.title === title);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({
          title,
          price_text: priceText,
          price_value: toNumber(priceText),
          image,
          quantity: 1,
        });
      }
      saveCart(cart);
    });

    return card;
  }

  function renderProducts(products) {
    const container = document.getElementById("productList");
    if (!container) return;
    container.innerHTML = "";
    if (!products.length) {
      container.innerHTML = `<div class="flash">Ничего не найдено.</div>`;
      return;
    }
    products.forEach((product) => container.appendChild(buildCard(product)));
  }

  async function loadProducts() {
    const container = document.getElementById("productList");
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const selectedCategory = container.dataset.selectedCategory || params.get("category") || "semenaO";
    const searchQuery = container.dataset.search || params.get("search") || "";
    const endpoint = container.dataset.apiUrl || "/api/products";

    const url = new URL(endpoint, window.location.origin);
    url.searchParams.set("category", selectedCategory);
    if (searchQuery) url.searchParams.set("search", searchQuery);

    try {
      const response = await fetch(url.toString());
      const products = await response.json();
      renderProducts(Array.isArray(products) ? products : []);
    } catch (error) {
      container.innerHTML = `<div class="flash">Не удалось загрузить товары.</div>`;
    }
  }

  function initSearch() {
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("searchInput");
    if (!searchForm || !searchInput) return;

    const params = new URLSearchParams(window.location.search);
    const category = params.get("category") || searchForm.querySelector('input[name="category"]')?.value || "semenaO";
    searchForm.querySelector('input[name="category"]')?.setAttribute("value", category);

    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = searchInput.value.trim();
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set("category", category);
      if (query) url.searchParams.set("search", query);
      window.location.href = url.toString();
    });
  }

  function initCatalogLinks() {
    document.querySelectorAll(".catalog-menu a").forEach((link) => {
      link.addEventListener("click", () => {
        document.querySelector(".catalog-menu").style.display = "none";
      });
    });
  }

  function renderBasket() {
    const container = document.getElementById("cartItems");
    const totalPrice = document.getElementById("totalPrice");
    const buyBtn = document.getElementById("buyBtn");
    if (!container || !totalPrice || !buyBtn) return;

    const cart = getCart();
    container.innerHTML = "";

    if (!cart.length) {
      container.innerHTML = `<div class="flash">Корзина пустая.</div>`;
      totalPrice.textContent = "Итого: 0 ₽";
      return;
    }

    let total = 0;

    cart.forEach((item, index) => {
      const itemTotal = (item.price_value || toNumber(item.price_text)) * item.quantity;
      total += itemTotal;

      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <img src="${item.image}" alt="${item.title}">
        <div>
          <h3>${item.title}</h3>
          <p>${item.price_text}</p>
          <p>Сумма: ${formatPrice(itemTotal)}</p>
        </div>
        <div class="qty-controls">
          <button type="button" class="qty-btn" data-action="minus">−</button>
          <span>${item.quantity}</span>
          <button type="button" class="qty-btn" data-action="plus">+</button>
          <button type="button" class="delete-btn">Удалить</button>
        </div>
      `;

      row.querySelector('[data-action="minus"]')?.addEventListener("click", () => {
        const currentCart = getCart();
        const current = currentCart[index];
        if (!current) return;
        current.quantity -= 1;
        if (current.quantity <= 0) {
          currentCart.splice(index, 1);
        }
        saveCart(currentCart);
        renderBasket();
      });

      row.querySelector('[data-action="plus"]')?.addEventListener("click", () => {
        const currentCart = getCart();
        const current = currentCart[index];
        if (!current) return;
        current.quantity += 1;
        saveCart(currentCart);
        renderBasket();
      });

      row.querySelector(".delete-btn")?.addEventListener("click", () => {
        const currentCart = getCart();
        currentCart.splice(index, 1);
        saveCart(currentCart);
        renderBasket();
      });

      container.appendChild(row);
    });

    totalPrice.textContent = `Итого: ${formatPrice(total)}`;
    buyBtn.addEventListener("click", () => {
      alert("Этап оформления заказа будет добавлен на следующем шаге.");
    }, { once: true });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initCatalogMenu();
    initAuthModals();
    initSearch();
    initCatalogLinks();
    updateCartCount();
    loadProducts();
    renderBasket();

    const themeToggle = document.getElementById("themeToggle");
    themeToggle?.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("dark-theme");
      localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
      themeToggle.textContent = isDark ? "☀️" : "🌙";
    });
  });
}();
