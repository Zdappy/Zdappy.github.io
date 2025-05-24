document.addEventListener('DOMContentLoaded', function () {
  const btn = document.querySelector('.catalog-button');
  const menu = document.querySelector('.catalog-menu');
  const cartIcon = document.getElementById('cartIcon');
  const cartDropdown = document.getElementById('cartDropdown');
  const entrance = document.querySelector('.entrance');
  const loginModal = document.getElementById('loginModal');
  const registerModal = document.getElementById('registerModal');
  const overlay = document.getElementById('overlay');
  const loginBtn = document.getElementById('loginBtn');
  const openRegister = document.getElementById('openRegister');
  const openLogin = document.getElementById('openLogin');

  btn.addEventListener('click', () => {
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  });

  cartIcon.addEventListener('click', () => {
    cartDropdown.style.display = cartDropdown.style.display === 'block' ? 'none' : 'block';
  });

  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
      menu.style.display = 'none';
    }
    if (!cartIcon.contains(e.target) && !cartDropdown.contains(e.target)) {
      cartDropdown.style.display = 'none';
    }
    if (
      !loginModal.contains(e.target) &&
      !registerModal.contains(e.target) &&
      !entrance.contains(e.target) &&
      !openRegister.contains(e.target) &&
      !openLogin.contains(e.target)
    ) {
      loginModal.classList.add('hidden');
      registerModal.classList.add('hidden');
      overlay.classList.add('hidden');
    }
  });

  entrance.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.classList.remove('hidden');
    overlay.classList.remove('hidden');
  });

  loginBtn.addEventListener('click', () => {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    if (email === '1' && password === '123') {
      window.location.href = 'admin.html';
    } else {
      alert('Неверный логин или пароль');
    }
  });

  openRegister.addEventListener('click', () => {
    loginModal.classList.add('hidden');
    registerModal.classList.remove('hidden');
  });

  openLogin.addEventListener('click', () => {
    registerModal.classList.add('hidden');
    loginModal.classList.remove('hidden');
    overlay.classList.remove('hidden');
  });

  fetch('goods/semenaO.json')
    .then((response) => response.json())
    .then((data) => {
      const products = data[0];
      const container = document.getElementById('productList');
      for (let key in products) {
        const item = products[key];
        const title = item['название'] || item['Название'];
        const price = item['цена'] || item['Цена'];
        const desc = item['описание'] || item['Описание'];
        const img = item['изображение'];
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
          <img src="${img}" alt="${title}">
          <h3>${title}</h3>
          <p class="price">${price}</p>
          <p class="description">${desc}</p>
        `;
        container.appendChild(card);
      }
    });
});
