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
  }

  document.addEventListener('click', (e) => {
    if (catalogBtn && catalogMenu && !catalogBtn.contains(e.target) && !catalogMenu.contains(e.target)) {
      catalogMenu.style.display = 'none';
    }

    if (!loginModal?.contains(e.target) &&
        !registerModal?.contains(e.target) &&
        !e.target.closest('.entrance')) {
      loginModal?.classList.add('hidden');
      registerModal?.classList.add('hidden');
      overlay?.classList.add('hidden');
    }
  });

  if (entrance && loginModal && overlay) {
    entrance.addEventListener('click', (e) => {
      e.preventDefault();
      loginModal.classList.remove('hidden');
      overlay.classList.remove('hidden');
    });
  }

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

  function loadGoods(filename) {
    fetch('goods/' + filename)
      .then(res => res.json())
      .then(data => {
        const container = document.getElementById('productList');
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
          `;
          container.appendChild(card);
        });
      })
      .catch(() => {
        alert('Не удалось загрузить товары');
      });
  }

  loadGoods('semenaO.json');

  document.querySelectorAll('.catalog-menu a').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const file = this.getAttribute('data-json');
      loadGoods(file);
      catalogMenu.style.display = 'none';
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
