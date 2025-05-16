document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");
    const errorMessage = document.getElementById("error-message");

    loginForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        if (username === "1" && password === "123") {
            window.location.href = "admin.html";
        } else {
            errorMessage.textContent = "Неверный логин или пароль.";
        }
    });
});
