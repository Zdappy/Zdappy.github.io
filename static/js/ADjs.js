+function () {
  const fieldsByCategory = {
    semenaO: ["Категория", "Тип растения", "Срок созревания", "Условия выращивания", "Форма плода", "Цвет плода", "Вес плода", "Урожайность"],
    ovoshi: ["Категория", "Тип растения", "Срок созревания", "Условия выращивания", "Форма плода", "Цвет плода", "Вес плода", "Урожайность"],
    cvety: ["Тип растения", "Категория", "Видовое название", "Разновидность", "Высота растения", "Диаметр куста", "Диаметр цветка", "Окраска цветка", "Способ выращивания", "Объем кашпо", "Схема посадки"],
    semenaC: ["Тип растения", "Категория", "Видовое название", "Разновидность", "Высота растения", "Диаметр куста", "Диаметр цветка", "Окраска цветка", "Способ выращивания", "Объем кашпо", "Схема посадки"],
    posadochny_material: []
  };

  function updateFields() {
    const select = document.getElementById("category");
    const container = document.getElementById("characteristicsContainer");
    if (!select || !container) return;

    const fields = fieldsByCategory[select.value] || [];
    container.innerHTML = "";

    fields.forEach((field) => {
      const label = document.createElement("label");
      label.textContent = field;

      const input = document.createElement("input");
      input.type = "text";
      input.required = true;
      input.placeholder = field;

      container.appendChild(label);
      container.appendChild(input);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const category = document.getElementById("category");
    const form = document.getElementById("productForm");
    const message = document.getElementById("message");
    const image = document.getElementById("image");

    if (!category || !form || !message) return;

    category.addEventListener("change", updateFields);
    updateFields();

    image?.addEventListener("change", () => {
      message.textContent = image.files?.[0] ? `Выбран файл: ${image.files[0].name}` : "";
      message.style.color = "var(--secondary)";
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      message.textContent = "Черновик товара сохранен. Следующий шаг — подключение БД и API.";
      message.style.color = "var(--primary)";
    });

    if (localStorage.getItem("zdappy_theme") === "dark") {
      document.body.classList.add("dark-theme");
    }
  });
}();
