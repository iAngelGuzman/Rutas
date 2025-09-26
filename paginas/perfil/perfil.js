import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://rxfqkbhymotlapterzpk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4ZnFrYmh5bW90bGFwdGVyenBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjU4MDgsImV4cCI6MjA3NDMwMTgwOH0.hymErnZfJFdGEpa9sn43Q_TOsj3rOmue6RRI6DrLv0A";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async function() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
        window.location.href = '/paginas/login/login.html';
        return;
    }

    await cargarDatosUsuario(session.user);
    
    document.getElementById('formPerfil').addEventListener('submit', guardarPerfil);
    document.getElementById('volverBtn').addEventListener('click', volverAlMapa);
    document.getElementById('cerrarSesionBtn').addEventListener('click', cerrarSesion);
    document.getElementById('fileInput').addEventListener('change', subirImagen);
});

async function cargarDatosUsuario(user) {
    try {
        const { data: perfil, error } = await supabase
            .from('perfiles')
            .select('username, email, telefono, direccion, avatar_url')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error al cargar datos del usuario:', error);
            const username = user.user_metadata.username || user.email.split('@')[0];
            document.getElementById('nombreUsuario').textContent = username;
            document.getElementById('emailUsuario').textContent = user.email;
            document.getElementById('nombreCompleto').value = username;
            document.getElementById('email').value = user.email;
            return;
        }

        if (perfil) {
            document.getElementById('nombreUsuario').textContent = perfil.username || '';
            document.getElementById('emailUsuario').textContent = perfil.email;
            document.getElementById('nombreCompleto').value = perfil.username || '';
            document.getElementById('email').value = perfil.email;
            document.getElementById('telefono').value = perfil.telefono || '';
            document.getElementById('direccion').value = perfil.direccion || '';
            
            // Cargar la imagen de perfil si existe
            if (perfil.avatar_url) {
                const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(perfil.avatar_url);
                document.getElementById('avatarImage').src = publicUrl.publicUrl;
            }
        }
    } catch (err) {
        console.error('Error al cargar datos del usuario:', err.message);
        alert('No se pudo cargar el perfil. Por favor, inténtalo de nuevo.');
    }
}

async function subirImagen(e) {
    const file = e.target.files[0];
    if (!file) return;

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session.user.id;
    const filePath = `${userId}/${Date.now()}_${file.name}`;

    try {
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (error) {
            throw error;
        }

        const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(filePath);
        document.getElementById('avatarImage').src = publicUrl.publicUrl;

        // Actualizar la URL del avatar en la tabla 'perfiles'
        await supabase
            .from('perfiles')
            .update({ avatar_url: filePath })
            .eq('id', userId);

        alert('Imagen de perfil actualizada correctamente.');
    } catch (error) {
        console.error('Error al subir la imagen:', error.message);
        alert('No se pudo actualizar la imagen de perfil.');
    }
}

async function guardarPerfil(e) {
    e.preventDefault();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        alert('No estás autenticado. Por favor, inicia sesión.');
        return;
    }

    const userId = session.user.id;
    const datosActualizados = {
        username: document.getElementById('nombreCompleto').value,
        telefono: document.getElementById('telefono').value,
        direccion: document.getElementById('direccion').value
    };
    
    try {
        const { error } = await supabase
            .from('perfiles')
            .update(datosActualizados)
            .eq('id', userId);

        if (error) {
            throw error;
        }

        alert('Perfil actualizado correctamente');
        document.getElementById('nombreUsuario').textContent = datosActualizados.username;
    } catch (error) {
        console.error('Error al actualizar el perfil:', error.message);
        alert('No se pudo actualizar el perfil. Por favor, inténtalo de nuevo.');
    }
}

function volverAlMapa() {
    window.location.href = '/paginas/inicio/inicio.html';
}

async function cerrarSesion() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error al cerrar sesión:', error.message);
            alert('No se pudo cerrar la sesión.');
        } else {
            window.location.href = '/paginas/login/login.html';
        }
    }
}