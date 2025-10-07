import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://rxfqkbhymotlapterzpk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4ZnFrYmh5bW90bGFwdGVyenBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjU4MDgsImV4cCI6MjA3NDMwMTgwOH0.hymErnZfJFdGEpa9sn43Q_TOsj3rOmue6RRI6DrLv0A";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------- Inicialización ----------------
(async function init() {
    modificarPerfil();
    cargarAvatarUsuario();
})();

// Verificar la sesión del usuario
async function verificarSesion() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

// Modificar el perfil para cambiar entre iniciar sesion o ver perfil
async function modificarPerfil() {
    const session = await verificarSesion();
    const perfil = document.getElementById('perfil-user');
    const logout = document.getElementById('perfil-logout');
    const login = document.getElementById('perfil-login');
    const signup = document.getElementById('perfil-signup');

    const perfilMovil = document.getElementById('perfil-user-movil');
    const logoutMovil = document.getElementById('perfil-logout-movil');
    const loginMovil = document.getElementById('perfil-login-movil');
    const signupMovil = document.getElementById('perfil-signup-movil');

    if (session) {
        perfil.classList.remove('d-none');
        logout.classList.remove('d-none');
        perfilMovil.classList.remove('d-none');
        logoutMovil.classList.remove('d-none');
    } else {
        login.classList.remove('d-none');
        signup.classList.remove('d-none');
        loginMovil.classList.remove('d-none');
        signupMovil.classList.remove('d-none');
    }
}

// NUEVA FUNCIÓN PARA CARGAR EL AVATAR
async function cargarAvatarUsuario() {
    const session = await verificarSesion();

    if (!session) return;

    const { data: perfil, error } = await supabase
        .from('perfiles')
        .select('avatar_url')
        .eq('id', session.user.id)
        .single();

    if (error) {
        console.error("Error al obtener perfil:", error);
        return;
    }

    if (perfil && perfil.avatar_url) {
        const { data: publicUrlData, error: urlError } = supabase
            .storage
            .from('avatars')
            .getPublicUrl(perfil.avatar_url);

        if (urlError) {
            console.error("Error al obtener URL pública:", urlError);
            return;
        }

        const avatarImg = document.getElementById('dropdownMenuButton');
        if (avatarImg) avatarImg.src = publicUrlData.publicUrl;

        const avatarImgMovil = document.getElementById('dropdownMenuButtonMovil');
        if (avatarImgMovil) avatarImgMovil.src = publicUrlData.publicUrl;
    }
}

async function cerrarSesion() {
    Swal.fire({
        title: '¿Cerrar sesión?',
        text: "¿Estás seguro de que quieres cerrar tu sesión?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, cerrar sesión',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { error } = await supabase.auth.signOut();
            if (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo cerrar la sesión.',
                });
                console.error('Error al cerrar sesión:', error.message);
            } else {
                // Recargar la pagina
                window.location.href = '/';
            }
        }
    });
}

window.cerrarSesion = cerrarSesion;
