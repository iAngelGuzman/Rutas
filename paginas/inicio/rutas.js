// ------------- RUTAS ACTUALIZADAS -------------
(async function init() {
    await cargarRutas();
})();

export async function cargarRutas() {
    try {
        // Hacemos la petición a nuestro propio backend
        const response = await fetch('http://localhost:3000/api/rutas');

        if (!response.ok) {
            // Si el servidor respondió con un error (ej. 500), lo manejamos
            const errorInfo = await response.json();
            throw new Error(errorInfo.error || "No se pudieron cargar las rutas.");
        }

        // Convertimos la respuesta a JSON
        const rutas = await response.json();
        console.log("Cargadas las rutas:", rutas);
        return rutas;

    } catch (error) {
        console.error("Error al obtener las rutas:", error);
        // Muestra un error al usuario de forma amigable
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Hubo un problema al cargar las rutas. Inténtalo de nuevo más tarde.'
        });
        return null;
    }
}