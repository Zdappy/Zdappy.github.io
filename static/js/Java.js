(() => {
  const CART_KEY = "zdappy_cart";
  const THEME_KEY = "zdappy_theme";

  function getCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CART_KEY));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
  }

  function formatPrice(value) {
    const number = Number(value) || 0;
    return `${Math.round(number)} ₽`;
  }

  function updateCartCount() {
    const countEl = document.getElementById("cartCount");
    if (!countEl) return;
    const count = getCart().reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    countEl.textContent = String(count);
  }

  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-theme", isDark);
    const toggle = document.getElementById("themeToggle");
    if (toggle) toggle.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }

  function initTheme() {
    applyTheme(localStorage.getItem(THEME_KEY) || "light");
  }

  function attachCartButtons() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest(".add-to-cart");
      if (!button) return;

      const title = button.dataset.title || "Без названия";
      const image = button.dataset.image || "/static/images/icon.png";
      const priceText = button.dataset.price || formatPrice(button.dataset.priceValue || 0);
      const priceValue = Number(button.dataset.priceValue || 0);

      const cart = getCart();
      const existing = cart.find((item) => item.title === title);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ title, price_text: priceText, price_value: priceValue, image, quantity: 1 });
      }
      saveCart(cart);
      button.textContent = "Добавлено";
      window.setTimeout(() => {
        button.textContent = "В корзину";
      }, 900);
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
      const itemPrice = Number(item.price_value || 0);
      const quantity = Number(item.quantity || 1);
      const itemTotal = itemPrice * quantity;
      total += itemTotal;

      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <img src="${item.image || "/static/images/icon.png"}" alt="${item.title}">
        <div>
          <h3>${item.title}</h3>
          <p>${item.price_text || formatPrice(itemPrice)}</p>
          <p>Сумма: ${formatPrice(itemTotal)}</p>
        </div>
        <div class="qty-controls">
          <button type="button" class="qty-btn" data-action="minus">−</button>
          <span>${quantity}</span>
          <button type="button" class="qty-btn" data-action="plus">+</button>
          <button type="button" class="delete-btn">Удалить</button>
        </div>
      `;

      row.querySelector('[data-action="minus"]')?.addEventListener("click", () => {
        const currentCart = getCart();
        const current = currentCart[index];
        if (!current) return;
        current.quantity -= 1;
        if (current.quantity <= 0) currentCart.splice(index, 1);
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
    buyBtn.onclick = () => {
      alert("Оформление заказа можно добавить следующим шагом.");
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    updateCartCount();
    attachCartButtons();
    renderBasket();

    const themeToggle = document.getElementById("themeToggle");
    themeToggle?.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("dark-theme");
      localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
      themeToggle.textContent = isDark ? "☀️" : "🌙";
    });
  });
})();
