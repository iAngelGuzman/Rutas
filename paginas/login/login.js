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

  // Mostrar / ocultar contraseña
  const togglePassword = document.getElementById("togglePassword");
  togglePassword.addEventListener("click", () => {
    const type =
      passInput.getAttribute("type") === "password" ? "text" : "password";
    passInput.setAttribute("type", type);
    togglePassword.innerHTML =
      type === "password"
        ? '<i class="fa-solid fa-eye"></i>'
        : '<i class="fa-solid fa-eye-slash"></i>';
  });
});
