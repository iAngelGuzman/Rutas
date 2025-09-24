import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Reemplaza con tus credenciales de Supabase
const SUPABASE_URL = "https://rxfqkbhymotlapterzpk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4ZnFrYmh5bW90bGFwdGVyenBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjU4MDgsImV4cCI6MjA3NDMwMTgwOH0.hymErnZfJFdGEpa9sn43Q_TOsj3rOmue6RRI6DrLv0A";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");
    const emailInput = document.getElementById("emailInput");
    const passwordInput = document.getElementById("passwordInput");
    const errorMessage = document.getElementById("error-message");
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

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        errorMessage.textContent = "";

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            errorMessage.textContent = error.message;
        } else {
            console.log("Sesión iniciada con éxito:", data);
            window.location.href = "/paginas/inicio/inicio.html";
        }
    });
});