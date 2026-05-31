(() => {
  const CART_KEY = "zdappy_cart";
  const THEME_KEY = "zdappy_theme";

  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
  }
  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
  }
  function formatPrice(v) { return `${Math.round(Number(v)||0)} ₽`; }
  function updateCartCount() {
    const el = document.getElementById("cartCount");
    if(el) {
      const cart = getCart();
      el.textContent = cart.reduce((s,i)=>s+(i.quantity||0),0);
    }
  }

  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-theme", isDark);
    const btn = document.getElementById("themeToggle");
    if(btn) btn.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem(THEME_KEY, theme);
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Инициализация темы
    applyTheme(localStorage.getItem(THEME_KEY) || "light");
    
    // Переключатель темы
    document.getElementById("themeToggle")?.addEventListener("click", () => {
      const isDark = !document.body.classList.contains("dark-theme");
      applyTheme(isDark ? "dark" : "light");
    });

    // Кнопки "В корзину"
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".add-to-cart");
      if(!btn) return;
      const cart = getCart();
      const id = btn.dataset.id;
      const existing = cart.find(i => i.id == id);
      if(existing) existing.quantity++;
      else cart.push({id, title: btn.dataset.title, price_value: parseFloat(btn.dataset.price), quantity: 1, image: btn.dataset.image});
      saveCart(cart);
      btn.textContent = "✅"; setTimeout(()=>btn.textContent="В корзину", 800);
    });

    // Корзина
    const container = document.getElementById("cartItems");
    const totalEl = document.getElementById("totalPrice");
    if(container && totalEl) {
      const cart = getCart();
      container.innerHTML = "";
      if(!cart.length) {
        container.innerHTML = '<div class="flash flash-info">Корзина пуста.</div>';
        totalEl.textContent = "Итого: 0 ₽";
      } else {
        let total = 0;
        cart.forEach((item, idx) => {
          total += (item.price_value||0) * item.quantity;
          const row = document.createElement("div");
          row.className = "cart-item";
          row.innerHTML = `
            <img src="${item.image||'/static/images/icon.png'}">
            <div><h3>${item.title}</h3><p>${formatPrice(item.price_value)} ₽</p></div>
            <div class="qty-controls">
              <button class="qty-btn" data-act="minus" data-idx="${idx}">−</button>
              <span>${item.quantity}</span>
              <button class="qty-btn" data-act="plus" data-idx="${idx}">+</button>
              <button class="delete-btn" data-idx="${idx}">🗑️</button>
            </div>`;
          container.appendChild(row);
        });
        totalEl.textContent = `Итого: ${formatPrice(total)}`;
        
        container.addEventListener("click", (e) => {
          const btn = e.target.closest("button");
          if(!btn) return;
          const idx = Number(btn.dataset.idx);
          const act = btn.dataset.act;
          const c = getCart();
          if(act==="minus") { c[idx].quantity--; if(c[idx].quantity<=0) c.splice(idx,1); }
          else if(act==="plus") c[idx].quantity++;
          else c.splice(idx,1);
          saveCart(c);
          location.reload();
        });
      }
    }
    document.getElementById("buyBtn")?.addEventListener("click", ()=>alert("Оформление заказа"));
  });
})();