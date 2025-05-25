document.addEventListener('DOMContentLoaded', function () {
  const btn = document.querySelector('.catalog-button');
  const menu = document.querySelector('.catalog-menu');
  const cartIcon = document.getElementById('cartIcon');
  const cartDropdown = document.getElementById('cartDropdown');
  const entrance = document.querySelector('.entrance');
  const modal = document.getElementById('loginModal');
  const registerModal = document.getElementById('registerModal');
  const overlay = document.getElementById('overlay');
  const loginBtn = document.getElementById('loginBtn');

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
    if (!modal.contains(e.target) && !registerModal.contains(e.target) && !document.getElementById('productModal').contains(e.target) && !e.target.closest('.entrance')) {
      modal.classList.add('hidden');
      registerModal.classList.add('hidden');
      document.getElementById('productModal').classList.add('hidden');
      overlay.classList.add('hidden');
    }
  });

  entrance.addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.remove('hidden');
    registerModal.classList.add('hidden');
    overlay.classList.remove('hidden');
  });

  document.getElementById('openRegister').addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.add('hidden');
    registerModal.classList.remove('hidden');
  });

  document.getElementById('openLogin').addEventListener('click', (e) => {
    e.preventDefault();
    registerModal.classList.add('hidden');
    modal.classList.remove('hidden');
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

  document.getElementById('closeProduct').addEventListener('click', () => {
    document.getElementById('productModal').classList.add('hidden');
    overlay.classList.add('hidden');
  });

  function loadGoods(filename) {
    fetch('goods/' + filename)
      .then(res => res.json())
      .then(data => {
        const container = document.getElementById('productList');
        container.innerHTML = '';
        const products = data[0];
        for (let key in products) {
          const p = products[key];
          const name = p['название'] || p['Название'];
          const price = p['цена'] || p['Цена'];
          const image = p['изображение'];
          const description = p['описание'] || p['Описание'] || '';

          const card = document.createElement('div');
          card.className = 'product-card';
          card.innerHTML = `
            <img src="${image}" alt="${name}">
            <h3>${name}</h3>
            <p class="price">${price}</p>
          `;

          card.addEventListener('click', () => {
            document.getElementById('modalTitle').textContent = name;
            document.getElementById('modalImage').src = image;
            document.getElementById('modalDescription').textContent = description;

            const table = document.getElementById('modalTable');
            table.innerHTML = '';
            for (let key in p) {
              if (!['название','Название','описание','Описание','цена','Цена','изображение'].includes(key)) {
                let row = document.createElement('tr');
                let cell1 = document.createElement('td');
                let cell2 = document.createElement('td');
                cell1.textContent = key;
                cell2.textContent = p[key];
                row.appendChild(cell1);
                row.appendChild(cell2);
                table.appendChild(row);
              }
            }

            document.getElementById('productModal').classList.remove('hidden');
            overlay.classList.remove('hidden');
          });

          container.appendChild(card);
        }
      });
  }

  loadGoods('semenaO.json');

  document.querySelectorAll('.catalog-menu a').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const file = this.getAttribute('data-json');
      loadGoods(file);
      menu.style.display = 'none';
    });
  });
});
