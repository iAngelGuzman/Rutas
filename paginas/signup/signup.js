import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://rxfqkbhymotlapterzpk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4ZnFrYmh5bW90bGFwdGVyenBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjU4MDgsImV4cCI6MjA3NDMwMTgwOH0.hymErnZfJFdGEpa9sn43Q_TOsj3rOmue6RRI6DrLv0A"; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function registrarUsuario(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    console.error("Error registrando usuario:", error);
  } else {
    console.log("Usuario registrado correctamente:", data);
  }
}

// Registro de usuario
document.addEventListener("DOMContentLoaded", async () => {
  const form = document.querySelector("form");
  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");
  const confirmInput = document.getElementById("confirmPasswordInput");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const confirm = confirmInput.value.trim();

    if (!email || !password || !confirm) {
      alert("Por favor llena todos los campos.");
      return;
    }

    if (password !== confirm) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    // Registrar usuario en Supabase
    await registrarUsuario(email, password);

    alert("Registro exitoso. Revisa tu correo para confirmar.");
    form.reset(); // limpiar formulario
  });
});