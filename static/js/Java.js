(() => {
    const CART_KEY = "zdappy_cart";
    const THEME_KEY = "zdappy_theme";

    // ===== СИСТЕМА УВЕДОМЛЕНИЙ О ЗАКАЗАХ =====
    const NOTIF_KEY = "zdappy_order_notifications";

    function getNotifications() {
        try { return JSON.parse(localStorage.getItem(NOTIF_KEY)) || []; }
        catch { return []; }
    }

    function saveNotifications(list) {
        localStorage.setItem(NOTIF_KEY, JSON.stringify(list));
    }

    function addOrderNotification(orderNumber, orderTotal, orderItems) {
        const list = getNotifications();
        const notif = {
            id: Date.now(),
            orderNumber,
            total: orderTotal,
            items: orderItems, // [{name, quantity, price}]
            createdAt: new Date().toISOString(),
            read: false
        };
        list.unshift(notif);
        // Хранить не более 30 уведомлений
        if (list.length > 30) list.splice(30);
        saveNotifications(list);
        renderNotifPanel();
        updateNotifBadge();
    }

    function markAllRead() {
        const list = getNotifications().map(n => ({ ...n, read: true }));
        saveNotifications(list);
        updateNotifBadge();
        renderNotifPanel();
    }

    function clearAllNotifications() {
        saveNotifications([]);
        renderNotifPanel();
        updateNotifBadge();
    }

    function updateNotifBadge() {
        const badge = document.getElementById("notifBadge");
        const bellBtn = document.getElementById("notifBellBtn");
        if (!badge || !bellBtn) return;
        const unread = getNotifications().filter(n => !n.read).length;
        if (unread > 0) {
            badge.textContent = unread > 9 ? "9+" : String(unread);
            badge.style.display = "flex";
            bellBtn.classList.add("has-unread");
        } else {
            badge.style.display = "none";
            bellBtn.classList.remove("has-unread");
        }
    }

    function formatNotifDate(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHour = Math.floor(diffMs / 3600000);
        const diffDay = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return "только что";
        if (diffMin < 60) return `${diffMin} мин. назад`;
        if (diffHour < 24) return `${diffHour} ч. назад`;
        if (diffDay < 7) return `${diffDay} дн. назад`;

        return date.toLocaleDateString("ru-RU", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    }

    function renderNotifPanel() {
        const list = document.getElementById("notifList");
        if (!list) return;
        const notifs = getNotifications();

        if (notifs.length === 0) {
            list.innerHTML = '<div class="notif-empty">Пока нет уведомлений о заказах</div>';
            return;
        }

        list.innerHTML = notifs.map(n => {
            const itemsText = n.items
                .map(it => `${it.name} × ${it.quantity} шт.`)
                .join(", ");
            const totalFormatted = `${Math.round(n.total)} ₽`;
            const dateStr = formatNotifDate(n.createdAt);
            const unreadClass = n.read ? "" : " unread";

            return `
                <div class="notif-item${unreadClass}" data-id="${n.id}">
                    <div class="notif-item-header">
                        <span class="notif-item-title">📦 Заказ #${n.orderNumber} прибыл!</span>
                        <span class="notif-item-time">${dateStr}</span>
                    </div>
                    <div class="notif-item-products">${itemsText}</div>
                    <div class="notif-item-total">Сумма: ${totalFormatted}</div>
                    <a href="/profile" class="notif-item-link">Перейти к заказу →</a>
                </div>
            `;
        }).join("");
    }

    function initNotifPanel() {
        const bellBtn = document.getElementById("notifBellBtn");
        const panel = document.getElementById("notifPanel");
        const clearBtn = document.getElementById("notifClearBtn");
        const wrapper = document.getElementById("notifBellWrapper");

        if (!bellBtn || !panel) return;

        updateNotifBadge();
        renderNotifPanel();

        bellBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = panel.style.display !== "none";
            if (isOpen) {
                panel.style.display = "none";
            } else {
                panel.style.display = "flex";
                markAllRead();
            }
        });

        clearBtn?.addEventListener("click", (e) => {
            e.stopPropagation();
            clearAllNotifications();
        });

        // Закрытие по клику вне панели
        document.addEventListener("click", (e) => {
            if (wrapper && !wrapper.contains(e.target)) {
                panel.style.display = "none";
            }
        });
    }
    // ===== КОНЕЦ СИСТЕМЫ УВЕДОМЛЕНИЙ =====

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
        if (btn) btn.textContent = isDark ? "☀️" : "🌙";
        localStorage.setItem(THEME_KEY, theme);
    }

    function showNotification(message, type, duration = 3000) {
        const notif = document.getElementById("cartNotification");
        if(!notif) return;
        notif.textContent = message;
        notif.className = `cart-notification cart-notification-${type}`;
        notif.style.display = "block";
        setTimeout(() => { notif.style.display = "none"; }, duration);
    }

    // ----- Функция для галереи (стрелки + миниатюры) -----
    function initGallery() {
        const thumbnails = document.querySelectorAll('.thumbnail');
        const mainImage = document.getElementById('mainProductImage');
        const prevBtn = document.getElementById('prevImageBtn');
        const nextBtn = document.getElementById('nextImageBtn');
        if (!mainImage || thumbnails.length === 0) return; // галереи нет на этой странице

        let currentIndex = 0;
        let imagesList = [];

        thumbnails.forEach((thumb, idx) => {
            const url = thumb.getAttribute('data-full');
            if (url) imagesList.push(url);
            if (thumb.classList.contains('active')) currentIndex = idx;
        });

        function updateGallery(index) {
            if (imagesList.length === 0) return;
            if (index < 0) index = 0;
            if (index >= imagesList.length) index = imagesList.length - 1;
            currentIndex = index;
            mainImage.src = imagesList[currentIndex];
            thumbnails.forEach((thumb, i) => {
                if (i === currentIndex) thumb.classList.add('active');
                else thumb.classList.remove('active');
            });
        }

        if (prevBtn) prevBtn.addEventListener('click', () => updateGallery(currentIndex - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => updateGallery(currentIndex + 1));
        thumbnails.forEach((thumb, idx) => {
            thumb.addEventListener('click', () => updateGallery(idx));
        });

        if (imagesList.length <= 1) {
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
        }
    }

    // --- Уведомление о прибытии заказа ---
    function requestNotificationPermission() {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }

    function showOrderArrivedNotification(orderNumber) {
        if (!("Notification" in window)) return;
        if (Notification.permission === "granted") {
            const notif = new Notification("📦 Ваш заказ прибыл!", {
                body: `Заказ #${orderNumber} успешно оформлен и уже доставлен вам!`,
                icon: "/static/images/icon.png",
                badge: "/static/images/icon.png",
                tag: "order-arrived-" + orderNumber,
                requireInteraction: false
            });
            notif.onclick = () => {
                window.focus();
                window.location.href = "/profile";
                notif.close();
            };
        } else if (Notification.permission === "default") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    showOrderArrivedNotification(orderNumber);
                }
            });
        }
    }
    // --- Конец функции уведомлений ---

    let isProcessing = false;

    document.addEventListener("DOMContentLoaded", () => {
        applyTheme(localStorage.getItem(THEME_KEY) || "light");
        requestNotificationPermission();
        initNotifPanel();
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
                // Сохраняем снимок корзины до очистки
                const cartSnapshot = getCart();
                try {
                    const res = await fetch("/api/checkout", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-CSRFToken": document.querySelector('meta[name="csrf-token"]')?.content || ""
                        },
                        body: JSON.stringify({ items: cartSnapshot })
                    });

                    const data = await res.json().catch(() => ({}));

                    if (res.status === 401) {
                        showNotification(data.error || "Сначала войдите в аккаунт, чтобы оформить заказ.", "error", 5000);
                        setTimeout(() => {
                            window.location.href = "/auth/login";
                        }, 5000);
                        return;
                    }

                    if(data.success) {
                        // Собираем данные для уведомления из снимка корзины
                        const orderTotal = cartSnapshot.reduce((sum, i) => sum + (parseFloat(i.price_value) || 0) * (i.quantity || 1), 0);
                        const orderItems = cartSnapshot.map(i => ({
                            name: i.title || i.name || "Товар",
                            quantity: i.quantity || 1,
                            price: parseFloat(i.price_value) || 0
                        }));
                        localStorage.removeItem(CART_KEY);
                        updateCartCount();
                        closeModal();
                        showNotification("Заказ успешно оформлен!", "success");
                        showOrderArrivedNotification(data.order_number);
                        addOrderNotification(data.order_number, orderTotal, orderItems);
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

        // --- Инициализация галереи (если есть на странице) ---
        initGallery();
    });

    // ---------- ДОБАВЛЕННЫЙ ОБРАБОТЧИК ДЛЯ СИНХРОНИЗАЦИИ ТЕМЫ ПРИ НАВИГАЦИИ НАЗАД/ВПЕРЁД ----------
    window.addEventListener('pageshow', function(event) {
        const savedTheme = localStorage.getItem(THEME_KEY) || "light";
        applyTheme(savedTheme);
    });
    // -------------------------------------------------------------------------------------------
})();