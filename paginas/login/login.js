document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const userInput = form.querySelector('input[placeholder="Usuario"]');
  const passInput = form.querySelector('input[placeholder="Contraseña"]');

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const usuario = userInput.value.trim();
    const password = passInput.value.trim();

    // Recuperar usuarios guardados
    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    // Buscar coincidencia
    const userFound = usuarios.find(
      (u) => u.usuario === usuario && u.password === password
    );

    if (userFound) {
      localStorage.setItem("usuarioActivo", usuario);
      window.location.href = "/paginas/inicio/inicio.html";
    } else {
      alert("Usuario o contraseña incorrectos.");
    }
  });
});

function togglePassword() {
  const passInput = document.getElementById("passwordInput");

  // Alternar tipo
  const type = passInput.type === "password" ? "text" : "password";
  passInput.type = type;

  // Cambiar íconos
  const icons = document.querySelectorAll(".toggle-password i");
  icons.forEach(icon => {
    icon.className = type === "password" ? "fa-solid fa-eye" : "fa-solid fa-eye-slash";
  });
}