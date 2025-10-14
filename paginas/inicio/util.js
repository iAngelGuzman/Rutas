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

    const btnCrear = document.getElementById('btn-crear');
    const btnCreadas = document.getElementById('btn-creadas');

    if (session) {
        perfil.classList.remove('d-none');
        logout.classList.remove('d-none');
        perfilMovil.classList.remove('d-none');
        logoutMovil.classList.remove('d-none');
        btnCrear.classList.add('d-flex');
        btnCrear.classList.remove('d-none');
        btnCreadas.classList.add('d-flex');
        btnCreadas.classList.remove('d-none');
    } else {
        login.classList.remove('d-none');
        signup.classList.remove('d-none');
        loginMovil.classList.remove('d-none');
        signupMovil.classList.remove('d-none');
        btnCrear.classList.remove('d-flex');
        btnCrear.classList.add('d-none');
        btnCreadas.classList.remove('d-flex');
        btnCreadas.classList.add('d-none');
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

/**
 * 📚 OBTENER TODAS LAS RUTAS
 * Reemplaza a: GET /api/rutas
 */
async function obtenerRutasDesdeSupabase() {
    try {
        const { data, error } = await supabase
            .from('rutas')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) throw error;
        
        console.log("Rutas cargadas desde Supabase:", data);
        return data; // Devuelve el array de rutas
        
    } catch (error) {
        console.error("Error al obtener las rutas:", error.message);
        Swal.fire('Error', 'No se pudieron cargar las rutas desde la base de datos.', 'error');
        return []; // Devuelve un array vacío en caso de error
    }
}

/**
 * ✨ CREAR UNA NUEVA RUTA
 * Reemplaza a: POST /api/agregar-ruta
 * @param {object} nuevaRuta - El objeto de la ruta a insertar.
 */
async function crearRutaEnSupabase(nuevaRuta) {
    try {
        // Validación básica en el cliente
        if (!nuevaRuta.nombre) {
            Swal.fire('Atención', 'El nombre de la ruta es obligatorio.', 'warning');
            return null;
        }

        const { data, error } = await supabase
            .from('rutas')
            .insert([nuevaRuta])
            .select()
            .single(); // Para obtener el objeto insertado directamente

        if (error) throw error;

        Swal.fire('¡Éxito!', `La ruta "${data.nombre}" se ha guardado correctamente.`, 'success');
        return data; // Devuelve la ruta recién creada

    } catch (error) {
        console.error("Error al crear la ruta:", error.message);
        Swal.fire('Error', `No se pudo guardar la ruta. Motivo: ${error.message}`, 'error');
        return null;
    }
}

/**
 * 🔄 ACTUALIZAR UNA RUTA EXISTENTE
 * Reemplaza a: PUT /api/actualizar-ruta/:id
 * @param {number} idRuta - El ID de la ruta a actualizar.
 * @param {object} datosActualizados - El objeto con los campos a modificar.
 */
async function actualizarRutaEnSupabase(idRuta, datosActualizados) {
    try {
        // No se deben enviar los campos de timestamp gestionados por la DB
        delete datosActualizados.creado;
        delete datosActualizados.actualizado;

        const { data, error } = await supabase
            .from('rutas')
            .update(datosActualizados)
            .eq('id', idRuta)
            .select()
            .single();

        if (error) throw error;

        Swal.fire('¡Éxito!', `La ruta "${data.nombre}" se ha actualizado correctamente.`, 'success');
        return data; // Devuelve la ruta actualizada

    } catch (error) {
        console.error("Error al actualizar la ruta:", error.message);
        Swal.fire('Error', `No se pudo actualizar la ruta. Motivo: ${error.message}`, 'error');
        return null;
    }
}

/**
 * 🗑️ ELIMINAR UNA RUTA
 * Reemplaza a: DELETE /api/eliminar-ruta/:id
 * @param {number} idRuta - El ID de la ruta a eliminar.
 */
async function eliminarRutaDeSupabase(idRuta) {
    try {
        const { error } = await supabase
            .from('rutas')
            .delete()
            .eq('id', idRuta);

        if (error) throw error;

        Swal.fire('¡Eliminada!', 'La ruta ha sido eliminada correctamente.', 'success');
        return true; // Indica que la operación fue exitosa

    } catch (error) {
        console.error("Error al eliminar la ruta:", error.message);
        Swal.fire('Error', `No se pudo eliminar la ruta. Motivo: ${error.message}`, 'error');
        return false;
    }
}

// =============================================================================
// LÓGICA DE GUARDADO INTEGRADA CON EL FORMULARIO
// =============================================================================

/**
 * Recopila, procesa y guarda (crea o actualiza) una ruta en Supabase.
 */
async function guardarRuta() {
    const botonGuardar = document.querySelector('button[onclick="guardarRuta()"]');
    
    // --- 1. VALIDACIÓN ---
    const nombre = document.getElementById('nombre-ruta').value.trim();
    if (!nombre || puntosCrearRuta.length < 2) {
        Swal.fire({
            icon: 'warning',
            title: 'Faltan Datos',
            text: 'Debes proporcionar un nombre y al menos 2 puntos en el mapa para la ruta.'
        });
        return;
    }

    // --- 2. MOSTRAR ESTADO DE CARGA ---
    botonGuardar.disabled = true;
    botonGuardar.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Guardando...';

    try {
        // --- 3. RECOPILACIÓN DE DATOS ---
        const datosParaGuardar = {
            nombre: nombre,
            "mujer-segura": document.getElementById('mujer-segura').checked,
            activo: document.getElementById('ruta-activada').checked,
            horario: obtenerHorarios(),
            paradas: datosParadas,
            "ruta-color": document.getElementById('color-ruta').value,
            "ruta-puntos": puntosCrearRuta,
            "ruta": await obtenerGeometriaRuta(puntosCrearRuta),
            // Asegúrate de limpiar los campos no necesarios o ponerlos en null
            "ruta-ida": null,
            "ruta-ida-color": null,
            "ruta-ida-puntos": null,
            "ruta-vuelta": null,
            "ruta-vuelta-color": null,
            "ruta-vuelta-puntos": null,
            imagen: null,
        };

        // --- 4. DECIDIR SI CREAR O ACTUALIZAR Y ENVIAR A SUPABASE ---
        let resultado;
        if (rutaEnEdicion) {
            // MODO ACTUALIZACIÓN
            console.log(`Actualizando ruta con ID: ${rutaEnEdicion.id}`);
            resultado = await actualizarRutaEnSupabase(rutaEnEdicion.id, datosParaGuardar);
        } else {
            // MODO CREACIÓN
            console.log("Creando nueva ruta...");
            resultado = await crearRutaEnSupabase(datosParaGuardar);
        }

        // --- 5. ÉXITO ---
        if (resultado) {
            limpiarFormulario(); // Asumiendo que esta función limpia el formulario
            await cargarRutasDesdeAPI(); // Refresca la lista de rutas
            procesarParadasGlobales(); // Actualiza la lista global de paradas
        }
        // Las funciones de Supabase ya muestran la alerta de éxito/error

    } catch (error) {
        // --- 6. MANEJO DE ERRORES INESPERADOS ---
        console.error('Error en el proceso de guardarRuta:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error Inesperado',
            text: `Ocurrió un problema durante el guardado: ${error.message}`
        });
    } finally {
        // --- 7. RESTAURAR BOTÓN ---
        botonGuardar.disabled = false;
        botonGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk me-1"></i> Guardar ruta';
    }
}


/**
 * Función auxiliar para obtener los horarios del formulario.
 * @returns {object}
 */
function obtenerHorarios() {
    const inicioLV = document.getElementById('hora-inicio-lv')?.value;
    const finLV = document.getElementById('hora-fin-lv')?.value;
    const inicioSD = document.getElementById('hora-inicio-sd')?.value;
    const finSD = document.getElementById('hora-fin-sd')?.value;

    return {
        lunes_viernes: (inicioLV && finLV) ? `${inicioLV} - ${finLV}` : null,
        sabado_domingo: (inicioSD && finSD) ? `${inicioSD} - ${finSD}` : null
    };
}



window.cerrarSesion = cerrarSesion;
window.guardarRuta = guardarRuta;
export { obtenerRutasDesdeSupabase, crearRutaEnSupabase, actualizarRutaEnSupabase, eliminarRutaDeSupabase };
