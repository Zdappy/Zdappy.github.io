document.addEventListener('DOMContentLoaded', function () {
  const catalogBtn = document.querySelector('.catalog-button');
  const catalogMenu = document.querySelector('.catalog-menu');
  const entrance = document.querySelector('.entrance');
  const loginModal = document.getElementById('loginModal');
  const registerModal = document.getElementById('registerModal');
  const overlay = document.getElementById('overlay');
  const themeToggle = document.getElementById('themeToggle');
  const body = document.body;

  if (catalogBtn && catalogMenu) {
    catalogBtn.addEventListener('click', () => {
      catalogMenu.style.display = catalogMenu.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (!catalogBtn.contains(e.target) && !catalogMenu.contains(e.target)) {
        catalogMenu.style.display = 'none';
      }
    });
  }

  if (entrance && loginModal && overlay) {
    entrance.addEventListener('click', (e) => {
      e.preventDefault();
      loginModal.classList.remove('hidden');
      overlay.classList.remove('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!loginModal.contains(e.target) &&
          !registerModal.contains(e.target) &&
          !e.target.closest('.entrance')) {
        loginModal.classList.add('hidden');
        registerModal.classList.add('hidden');
        overlay.classList.add('hidden');
      }
    });

    document.getElementById('openRegister')?.addEventListener('click', () => {
      loginModal.classList.add('hidden');
      registerModal.classList.remove('hidden');
    });

    document.getElementById('openLogin')?.addEventListener('click', () => {
      registerModal.classList.add('hidden');
      loginModal.classList.remove('hidden');
    });

    document.getElementById('loginBtn')?.addEventListener('click', () => {
      const email = document.getElementById('emailInput').value;
      const password = document.getElementById('passwordInput').value;
      const errorMessage = document.getElementById('error-message');

      if (email === '1' && password === '123') {
        window.location.href = 'admin.html';
      } else {
        errorMessage.textContent = 'Нет такого пользователя';
      }
    });
  }

  function loadGoods(filename) {
    fetch('goods/' + filename)
      .then(res => res.json())
      .then(data => {
        const container = document.getElementById('productList');
        if (!container) return;

        container.innerHTML = '';
        const products = Array.isArray(data) ? data : Object.values(data).flat();

        products.forEach(p => {
          const name = p['название'] || p['Название'];
          const price = p['цена'] || p['Цена'];
          const image = p['изображение'];

          const card = document.createElement('div');
          card.className = 'product-card';
          card.innerHTML = `
            <img src="${image}" alt="${name}">
            <h3>${name}</h3>
            <p class="price">${price}</p>
            <button class="add-to-cart" data-name="${name}" data-price="${price}" data-image="${image}">Добавить в корзину</button>
          `;
          container.appendChild(card);

          card.querySelector('.add-to-cart').addEventListener('click', function () {
            const name = this.dataset.name;
            const price = this.dataset.price;
            const image = this.dataset.image;

            let cart = JSON.parse(localStorage.getItem('cart')) || [];
            const index = cart.findIndex(item => item.name === name);
            if (index !== -1) {
              cart[index].quantity += 1;
            } else {
              cart.push({ name, price, image, quantity: 1 });
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
          });
        });
      });
  }

  function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const countElement = document.querySelector('.cart-count');
    if (countElement) {
      countElement.textContent = count;
    }
  }

  updateCartCount();

  const params = new URLSearchParams(window.location.search);
  const categoryFile = params.get('category') || 'semenaO.json';
  if (document.getElementById('productList')) {
    loadGoods(categoryFile);
  }

  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const cartContainer = document.getElementById('cartItems');
  const totalPriceBlock = document.getElementById('totalPrice');

  if (cartContainer && totalPriceBlock) {
    cartContainer.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
      const div = document.createElement('div');
      div.classList.add('cart-item');
      div.innerHTML = `
        <img src="${item.image}" alt="${item.name}" />
        <p>${item.name}</p>
        <p>Цена: ${item.price} × ${item.quantity}</p>
        <button class="delete-btn" data-index="${index}">Удалить</button>
      `;
      cartContainer.appendChild(div);
      total += parseFloat(item.price) * item.quantity;
    });

    totalPriceBlock.textContent = 'Итого: ' + total + ' ₽';

    cartContainer.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const index = this.dataset.index;
        cart.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(cart));
        location.reload();
      });
    });
  }

  document.querySelectorAll('.catalog-menu a').forEach(link => {
    link.addEventListener('click', function (e) {
      const file = this.getAttribute('data-json');
      if (file) {
        e.preventDefault();
        window.location.href = `index.html?category=${file}`;
      }
    });
  });

  if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark-theme');
    if (themeToggle) themeToggle.textContent = '☀️';
  }

  themeToggle?.addEventListener('click', () => {
    body.classList.toggle('dark-theme');
    const isDark = body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
  });
});
