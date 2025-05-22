document.addEventListener("DOMContentLoaded", function () {
    const categorySelect = document.getElementById("category");
    const characteristicsContainer = document.getElementById("characteristicsContainer");

    const characteristicsByCategory = {
        "semenaO": [
            { id: "k", label: "Категория" },
            { id: "t", label: "Тип растения" },
            { id: "s", label: "Срок созревания" },
            { id: "y", label: "Условия выращивания" },
            { id: "f", label: "Форма плода" },
            { id: "c", label: "Цвет плода" },
            { id: "v", label: "Вес плода" },
            { id: "yr", label: "Урожайность" }
        ],
        "ovoshi": [
            { id: "k", label: "Категория" },
            { id: "t", label: "Тип растения" },
            { id: "s", label: "Срок созревания" },
            { id: "y", label: "Условия выращивания" },
            { id: "f", label: "Форма плода" },
            { id: "c", label: "Цвет плода" },
            { id: "v", label: "Вес плода" },
            { id: "yr", label: "Урожайность" }
        ],
        "cvety": [
            { id: "t", label: "Тип растения" },
            { id: "k", label: "Категория" },
            { id: "vn", label: "Видовое название" },
            { id: "r", label: "Разновидность" },
            { id: "h", label: "Высота растения" },
            { id: "d", label: "Диаметр куста" },
            { id: "df", label: "Диаметр цветка" },
            { id: "color", label: "Окраска цветка" },
            { id: "g", label: "Способ выращивания" },
            { id: "p", label: "Объем кашпо" },
            { id: "s", label: "Схема посадки" }
        ],
        "semenaC": [
            { id: "t", label: "Тип растения" },
            { id: "k", label: "Категория" },
            { id: "vn", label: "Видовое название" },
            { id: "r", label: "Разновидность" },
            { id: "h", label: "Высота растения" },
            { id: "d", label: "Диаметр куста" },
            { id: "df", label: "Диаметр цветка" },
            { id: "color", label: "Окраска цветка" },
            { id: "g", label: "Способ выращивания" },
            { id: "p", label: "Объем кашпо" },
            { id: "s", label: "Схема посадки" }
        ],
        "posadochny_material": []
    };

    function updateCharacteristicsFields(category) {
        characteristicsContainer.innerHTML = "";

        const fields = characteristicsByCategory[category] || [];
        fields.forEach(field => {
            const label = document.createElement("label");
            label.setAttribute("for", field.id);
            label.textContent = field.label;

            const input = document.createElement("input");
            input.type = "text";
            input.id = field.id;
            input.name = field.id;
            input.required = true;

            characteristicsContainer.appendChild(label);
            characteristicsContainer.appendChild(input);
        });
    }

    categorySelect.addEventListener("change", function () {
        updateCharacteristicsFields(this.value);
    });

    updateCharacteristicsFields(categorySelect.value);
});
