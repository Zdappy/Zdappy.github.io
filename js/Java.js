document.addEventListener("DOMContentLoaded", function () {
  const catalogBtn = document.querySelector(".catalog-button")
  const catalogMenu = document.querySelector(".catalog-menu")
  const entrance = document.querySelector(".entrance")
  const loginModal = document.getElementById("loginModal")
  const registerModal = document.getElementById("registerModal")
  const overlay = document.getElementById("overlay")
  const themeToggle = document.getElementById("themeToggle")
  const searchInput = document.querySelector(".search-input")
  const basketSearchForm = document.getElementById("basketSearchForm")
  const basketSearchInput = document.getElementById("basketSearchInput")
  const body = document.body

  let allProducts = []
  const jsonFiles = [
    "semenaO.json",
    "semenaC.json",
    "cvety.json",
    "ovoshi.json",
    "posadochny_material.json",
  ]

  if (catalogBtn && catalogMenu) {
    catalogBtn.addEventListener("click", function () {
      if (catalogMenu.style.display === "block") {
        catalogMenu.style.display = "none"
      } else {
        catalogMenu.style.display = "block"
      }
    })

    document.addEventListener("click", function (e) {
      if (!catalogBtn.contains(e.target) && !catalogMenu.contains(e.target)) {
        catalogMenu.style.display = "none"
      }
    })
  }

  if (entrance && loginModal && overlay) {
    entrance.addEventListener("click", function (e) {
      e.preventDefault()
      loginModal.classList.remove("hidden")
      overlay.classList.remove("hidden")
    })

    document.addEventListener("click", function (e) {
      if (
        !loginModal.contains(e.target) &&
        !registerModal.contains(e.target) &&
        !e.target.closest(".entrance")
      ) {
        loginModal.classList.add("hidden")
        registerModal.classList.add("hidden")
        overlay.classList.add("hidden")
      }
    })

    document
      .getElementById("openRegister")
      ?.addEventListener("click", function () {
        loginModal.classList.add("hidden")
        registerModal.classList.remove("hidden")
      })

    document
      .getElementById("openLogin")
      ?.addEventListener("click", function () {
        registerModal.classList.add("hidden")
        loginModal.classList.remove("hidden")
      })

    document.getElementById("loginBtn")?.addEventListener("click", function () {
      const email = document.getElementById("emailInput").value
      const password = document.getElementById("passwordInput").value
      const errorMessage = document.getElementById("error-message")

      if (email === "1" && password === "123") {
        window.location.href = "admin.html"
      } else {
        errorMessage.textContent = "Нет такого пользователя"
      }
    })
  }

  function loadGoods(filename) {
    fetch("goods/" + filename)
      .then((res) => res.json())
      .then((data) => {
        const container = document.getElementById("productList")
        if (!container) return

        const products = Array.isArray(data) ? data : Object.values(data).flat()
        allProducts = products
        renderProducts(products)
      })
  }

  function loadAllGoodsForSearch(callback) {
    const all = []
    let loaded = 0

    jsonFiles.forEach((file) => {
      fetch("goods/" + file)
        .then((res) => res.json())
        .then((data) => {
          const products = Array.isArray(data)
            ? data
            : Object.values(data).flat()
          all.push(...products)
          loaded++
          if (loaded === jsonFiles.length) {
            callback(all)
          }
        })
    })
  }

  function renderProducts(products) {
    const container = document.getElementById("productList")
    if (!container) return

    container.innerHTML = ""

    products.forEach((p) => {
      const name = p["название"] || p["Название"]
      const price = p["цена"] || p["Цена"]
      const image = p["изображение"]

      const card = document.createElement("div")
      card.className = "product-card"
      card.innerHTML = `
        <img src="${image}" alt="${name}">
        <h3>${name}</h3>
        <p class="price">${price}</p>
        <button class="add-to-cart" data-name="${name}" data-price="${price}" data-image="${image}">Добавить в корзину</button>
      `
      container.appendChild(card)

      card.querySelector(".add-to-cart").addEventListener("click", function () {
        const name = this.dataset.name
        const price = this.dataset.price
        const image = this.dataset.image

        let cart = JSON.parse(localStorage.getItem("cart")) || []
        const index = cart.findIndex((item) => item.name === name)
        if (index !== -1) {
          cart[index].quantity += 1
        } else {
          cart.push({ name, price, image, quantity: 1 })
        }
        localStorage.setItem("cart", JSON.stringify(cart))
        updateCartCount()
      })
    })
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      const query = this.value.trim()
      if (!query) {
        renderProducts(allProducts)
        return
      }

      const fuse = new Fuse(allProducts, {
        keys: ["название", "Название"],
        threshold: 0.4,
      })

      const result = fuse.search(query).map((res) => res.item)
      renderProducts(result)
    })
  }

  basketSearchForm?.addEventListener("submit", function (e) {
    e.preventDefault()
    const query = basketSearchInput?.value.trim()
    if (query) {
      window.location.href = `index.html?search=${encodeURIComponent(query)}`
    }
  })

  function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart")) || []
    const count = cart.reduce((sum, item) => sum + item.quantity, 0)
    const countElement = document.querySelector(".cart-count")
    if (countElement) {
      countElement.textContent = count
    }
  }

  updateCartCount()

  const params = new URLSearchParams(window.location.search)
  const categoryFile = params.get("category") || "semenaO.json"
  const searchQuery = params.get("search") || ""

  if (document.getElementById("productList")) {
    if (searchQuery) {
      loadAllGoodsForSearch((all) => {
        allProducts = all
        const fuse = new Fuse(allProducts, {
          keys: ["название", "Название"],
          threshold: 0.4,
        })
        const result = fuse.search(searchQuery).map((r) => r.item)
        renderProducts(result)
      })
    } else {
      loadGoods(categoryFile)
    }
  }

  const cart = JSON.parse(localStorage.getItem("cart")) || []
  const cartContainer = document.getElementById("cartItems")
  const totalPriceBlock = document.getElementById("totalPrice")

  if (cartContainer && totalPriceBlock) {
    cartContainer.innerHTML = ""
    let total = 0

    cart.forEach((item, index) => {
      const div = document.createElement("div")
      div.classList.add("cart-item")
      div.innerHTML = `
        <img src="${item.image}" alt="${item.name}" />
        <p>${item.name}</p>
        <p>Цена: ${item.price} × ${item.quantity}</p>
        <button class="delete-btn" data-index="${index}">Удалить</button>
      `
      cartContainer.appendChild(div)
      total += parseFloat(item.price) * item.quantity
    })

    totalPriceBlock.textContent = "Итого: " + total + " ₽"

    cartContainer.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const index = this.dataset.index
        cart.splice(index, 1)
        localStorage.setItem("cart", JSON.stringify(cart))
        location.reload()
      })
    })
  }

  document.querySelectorAll(".catalog-menu a").forEach((link) => {
    link.addEventListener("click", function (e) {
      const file = this.getAttribute("data-json")
      if (file) {
        e.preventDefault()
        window.location.href = `index.html?category=${file}`
      }
    })
  })

  if (localStorage.getItem("theme") === "dark") {
    body.classList.add("dark-theme")
    if (themeToggle) themeToggle.textContent = "☀️"
  }

  themeToggle?.addEventListener("click", function () {
    body.classList.toggle("dark-theme")
    const isDark = body.classList.contains("dark-theme")
    localStorage.setItem("theme", isDark ? "dark" : "light")
    this.textContent = isDark ? "☀️" : "🌙"
  })
})
