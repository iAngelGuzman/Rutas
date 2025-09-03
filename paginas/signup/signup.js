document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");
    const userInput = form.querySelector('input[placeholder="Usuario"]');
    const passInput = form.querySelector('input[placeholder="Contraseña"]');

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const usuario = userInput.value.trim();
        const password = passInput.value.trim();

        if (!usuario || !password) {
            alert("Por favor llena todos los campos.");
            return;
        }

        // Recuperamos usuarios ya guardados
        let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

        // Verificar si el usuario ya existe
        if (usuarios.find(u => u.usuario === usuario)) {
            alert("El usuario ya existe, elige otro.");
            return;
        }

        // Guardar nuevo usuario
        usuarios.push({ usuario, password });
        localStorage.setItem("usuarios", JSON.stringify(usuarios));

        alert("Registro exitoso. Ahora inicia sesión.");

        // Redirigir al login
        window.location.href = "/paginas/login/login.html";
    });
});

function togglePassword() {
  const passInput = document.getElementById("passwordInput");
  const confirmPassInput = document.getElementById("confirmPasswordInput");

  // Alternar tipo
  const type = passInput.type === "password" ? "text" : "password";
  passInput.type = type;
  confirmPassInput.type = type;

  // Cambiar íconos
  const icons = document.querySelectorAll(".toggle-password i");
  icons.forEach(icon => {
    icon.className = type === "password" ? "fa-solid fa-eye" : "fa-solid fa-eye-slash";
  });
}