import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://rxfqkbhymotlapterzpk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4ZnFrYmh5bW90bGFwdGVyenBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjU4MDgsImV4cCI6MjA3NDMwMTgwOH0.hymErnZfJFdGEpa9sn43Q_TOsj3rOmue6RRI6DrLv0A";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// La función ahora devuelve el resultado para manejarlo afuera
async function registrarUsuario(email, password, username) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
        data: {
            username: username
        }
    }
  });
  
  // Si no hay error en el registro, crea el perfil
  if (!error && data.user) {
      const { error: profileError } = await supabase
          .from('perfiles')
          .insert([{ id: data.user.id, username: username, email: email }]);
      
      if (profileError) {
          // Devuelve el error del perfil si falla la inserción
          return { data: null, error: profileError };
      }
  }

  return { data, error };
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const usernameInput = document.getElementById("usernameInput"); // Asumiendo que tienes un input para el nombre
  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");
  const confirmInput = document.getElementById("confirmPasswordInput");
  const toggleButtons = document.querySelectorAll(".toggle-password");

  // Función para alternar la visibilidad de la contraseña
  function togglePassword(e) {
      const targetInput = e.currentTarget.previousElementSibling;
      const type = targetInput.type === "password" ? "text" : "password";
      targetInput.type = type;
      e.currentTarget.querySelector('i').className = type === "password" ? "fa-solid fa-eye" : "fa-solid fa-eye-slash";
  }

  toggleButtons.forEach(button => {
      button.addEventListener('click', togglePassword);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const confirm = confirmInput.value.trim();

    if (!username || !email || !password || !confirm) {
        // 💡 ALERTA DE VALIDACIÓN
        Swal.fire({
            icon: 'warning',
            title: 'Campos incompletos',
            text: 'Por favor, llena todos los campos.',
        });
        return;
    }

    if (password !== confirm) {
        // 💡 ALERTA DE VALIDACIÓN
        Swal.fire({
            icon: 'error',
            title: 'Contraseñas no coinciden',
            text: 'Asegúrate de que ambas contraseñas sean iguales.',
        });
        return;
    }

    // Registrar usuario en Supabase
    const { data, error } = await registrarUsuario(email, password, username);

    if (error) {
        // 💡 ALERTA DE ERROR DE SUPABASE
        Swal.fire({
            icon: 'error',
            title: 'Error en el registro',
            text: error.message,
        });
    } else {
        // ✅ ALERTA DE ÉXITO
        Swal.fire({
            icon: 'success',
            title: '¡Registro Exitoso!',
            text: 'Revisa tu bandeja de entrada para confirmar tu correo electrónico.',
        }).then(() => {
            // Redirige al login después de que el usuario cierre la alerta
            window.location.href = '/paginas/login/login.html';
        });
        form.reset(); // Limpiar formulario
    }
  });
});