document.addEventListener('DOMContentLoaded', function () {
  const btn = document.querySelector('.catalog-button');
  const menu = document.querySelector('.catalog-menu');
  const cartIcon = document.getElementById('cartIcon');
  const cartDropdown = document.getElementById('cartDropdown');
  const entrance = document.querySelector('.entrance');
  const modal = document.getElementById('loginModal');
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
    if (!modal.contains(e.target) && !entrance.contains(e.target)) {
      modal.classList.add('hidden');
      overlay.classList.add('hidden');
    }
  });

  entrance.addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.remove('hidden');
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
});
