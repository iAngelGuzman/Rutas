import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://rxfqkbhymotlapterzpk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4ZnFrYmh5bW90bGFwdGVyenBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjU4MDgsImV4cCI6MjA3NDMwMTgwOH0.hymErnZfJFdGEpa9sn43Q_TOsj3rOmue6RRI6DrLv0A";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// NUEVA FUNCIÓN PARA CARGAR EL AVATAR
async function cargarAvatarUsuario() {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        const { data: perfil, error } = await supabase
            .from('perfiles')
            .select('avatar_url')
            .eq('id', session.user.id)
            .single();

        if (perfil && perfil.avatar_url) {
            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(perfil.avatar_url);
            
            const avatarImg = document.getElementById('dropdownMenuButton');
            if (avatarImg) {
                avatarImg.src = publicUrlData.publicUrl;
            }
        }
    }
}

// ---------------- Inicialización ----------------
(async function init() {
    cargarAvatarUsuario();
})();

window.app = {
  cargarAvatarUsuario
};
