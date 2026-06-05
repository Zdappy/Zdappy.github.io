(() => {
  const fieldsByCategory = {
    semenaO: ["Тип растения", "Срок созревания", "Условия выращивания", "Форма плода", "Цвет плода", "Вес плода", "Урожайность"],
    ovoshi: ["Тип растения", "Срок созревания", "Условия выращивания", "Форма плода", "Цвет плода", "Вес плода", "Урожайность"],
    cvety: ["Видовое название", "Разновидность", "Высота растения", "Диаметр куста", "Диаметр цветка", "Окраска цветка", "Способ выращивания", "Объем кашпо", "Схема посадки"],
    semenaC: ["Видовое название", "Разновидность", "Высота растения", "Диаметр куста", "Диаметр цветка", "Окраска цветка", "Способ выращивания", "Объем кашпо", "Схема посадки"],
    posadochny_material: []
  };

  function updateFields() {
    const select = document.getElementById("category");
    const container = document.getElementById("characteristics-container");
    if (!select || !container) return;

    const fields = fieldsByCategory[select.value] || [];
    container.innerHTML = "";

    fields.forEach((field, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "form-group dynamic-field";

      const label = document.createElement("label");
      label.textContent = field;
      label.setAttribute("for", `char_${index}`);

      const input = document.createElement("input");
      input.type = "text";
      input.name = `characteristics[${index}]`; // Ключ для Flask
      input.id = `char_${index}`;
      input.placeholder = field;
      input.className = "form-control";

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      container.appendChild(wrapper);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const category = document.getElementById("category");
    const imageInput = document.getElementById("image");
    const messageEl = document.getElementById("upload-message");

    if (category) {
      category.addEventListener("change", updateFields);
      updateFields(); // Инициализация при загрузке
    }

    imageInput?.addEventListener("change", () => {
      if (messageEl) {
        messageEl.textContent = imageInput.files?.[0] ? `Выбран файл: ${imageInput.files[0].name}` : "";
        messageEl.style.color = "var(--success-color, green)";
      }
    });
  });
})();