document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const userInput = form.querySelector('input[placeholder="Usuario"]');
  const passInput = form.querySelector('input[placeholder="Contraseña"]');

  form.addEventListener("submit", (e) => {
    e.preventDefault(); // evita que se recargue la página

    const usuario = userInput.value.trim();
    const password = passInput.value.trim();

    if (usuario && password) {
      // Guardamos en localStorage
      localStorage.setItem("usuario", usuario);
      // ⚠️ No es buena práctica guardar la contraseña en localStorage
      // pero si lo necesitas para pruebas:
      localStorage.setItem("password", password);

      // Redirigir a inicio.html
      window.location.href = "inicio.html";
    } else {
      alert("Por favor completa todos los campos.");
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
