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
        if(btn) btn.textContent = isDark ? "️" : "🌙";
        localStorage.setItem(THEME_KEY, theme);
    }

    function showNotification(message, type) {
        const notif = document.getElementById("cartNotification");
        if(!notif) return;
        notif.textContent = message;
        notif.className = `cart-notification cart-notification-${type}`;
        notif.style.display = "block";
        setTimeout(() => { notif.style.display = "none"; }, 3000);
    }

    let isProcessing = false;

    document.addEventListener("DOMContentLoaded", () => {
        applyTheme(localStorage.getItem(THEME_KEY) || "light");
        document.getElementById("themeToggle")?.addEventListener("click", () => {
            const isDark = !document.body.classList.contains("dark-theme");
            applyTheme(isDark ? "dark" : "light");
        });

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
                        <div><h3>${item.title}</h3><p>${formatPrice(item.price_value)}</p></div>
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
                    if(act==="minus") { c[idx].quantity--; if(c[idx].quantity <=0) c.splice(idx,1); }
                    else if(act==="plus") c[idx].quantity++;
                    else c.splice(idx,1);
                    saveCart(c);
                    location.reload();
                });
            }
        }

        const modal = document.getElementById("checkoutModal");
        const modalList = document.getElementById("modalOrderList");
        const modalTotal = document.getElementById("modalTotal");
        const checkoutBtn = document.getElementById("checkoutBtn");
        const closeBtn = document.getElementById("modalClose");
        const cancelBtn = document.getElementById("modalCancel");
        const confirmBtn = document.getElementById("modalConfirm");

        function openModal() {
            const cart = getCart();
            if (!cart.length) {
                showNotification("Корзина пуста!", "error");
                return;
            }
            modalList.innerHTML = "";
            let total = 0;
            cart.forEach(item => {
                total += (item.price_value||0) * item.quantity;
                const li = document.createElement("li");
                li.textContent = `${item.title} × ${item.quantity} — ${formatPrice(item.price_value * item.quantity)}`;
                modalList.appendChild(li);
            });
            modalTotal.textContent = formatPrice(total);
            modal.style.display = "flex";
        }
        function closeModal() { if(modal) modal.style.display = "none"; }

        if(checkoutBtn) {
            checkoutBtn.addEventListener("click", (e) => {
                e.preventDefault();
                const cart = getCart();
                if (!cart.length) {
                    showNotification("Корзина пуста!", "error");
                } else {
                    openModal();
                }
            });
        }

        if(closeBtn) closeBtn.addEventListener("click", closeModal);
        if(cancelBtn) cancelBtn.addEventListener("click", closeModal);
        if(modal) modal.addEventListener("click", (e) => { if(e.target === modal) closeModal(); });

        if(confirmBtn) {
            confirmBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isProcessing) return;
                isProcessing = true;
                confirmBtn.disabled = true;
                confirmBtn.textContent = "Обработка...";
                try {
                    const res = await fetch("/api/checkout", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": document.querySelector('meta[name="csrf-token"]')?.content || ""
                        },
                        body: JSON.stringify({ items: getCart() })
                    });
                    const data = await res.json();
                    if(data.success) {
                        localStorage.removeItem(CART_KEY);
                        updateCartCount();
                        closeModal();
                        showNotification("Заказ успешно оформлен!", "success");
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        showNotification(data.error || "Не удалось оформить заказ", "error");
                    }
                } catch (err) {
                    showNotification("Ошибка сети. Попробуйте позже.", "error");
                } finally {
                    isProcessing = false;
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = "Подтвердить";
                }
            });
        }
    });
})();