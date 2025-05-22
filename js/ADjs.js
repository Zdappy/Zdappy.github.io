document.addEventListener("DOMContentLoaded", function () {
  const categorySelect = document.getElementById("category");
  const container = document.getElementById("characteristicsContainer");
  const form = document.getElementById("productForm");
  const message = document.getElementById("message");

  const characteristics = {
    semenaO: ["Категория", "Тип растения", "Срок созревания", "Условия выращивания", "Форма плода", "Цвет плода", "Вес плода", "Урожайность"],
    ovoshi: ["Категория", "Тип растения", "Срок созревания", "Условия выращивания", "Форма плода", "Цвет плода", "Вес плода", "Урожайность"],
    cvety: ["Тип растения", "Категория", "Видовое название", "Разновидность", "Высота растения", "Диаметр куста", "Диаметр цветка", "Окраска цветка", "Способ выращивания", "Объем кашпо", "Схема посадки"],
    semenaC: ["Тип растения", "Категория", "Видовое название", "Разновидность", "Высота растения", "Диаметр куста", "Диаметр цветка", "Окраска цветка", "Способ выращивания", "Объем кашпо", "Схема посадки"],
    posadochny_material: []
  };

  function updateFields() {
    container.innerHTML = "";
    const selected = categorySelect.value;
    if (!characteristics[selected]) return;

    characteristics[selected].forEach(char => {
      const label = document.createElement("label");
      label.textContent = char;
      const input = document.createElement("input");
      input.type = "text";
      input.required = true;
      container.appendChild(label);
      container.appendChild(input);
    });
  }

  categorySelect.addEventListener("change", updateFields);
  updateFields();

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    message.textContent = "Товар сохранен!";
    message.style.color = "green";
  });
});