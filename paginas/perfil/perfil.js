document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario está logueado
    const usuarioActivo = localStorage.getItem('usuarioActivo');
    if (!usuarioActivo) {
        window.location.href = '/paginas/login/login.html';
        return;
    }

    // Cargar datos del usuario
    cargarDatosUsuario(usuarioActivo);
    
    // Configurar el evento del formulario
    document.getElementById('formPerfil').addEventListener('submit', guardarPerfil);
});

function cargarDatosUsuario(usuario) {
    // Cargar datos desde localStorage o usar valores por defecto
    const datosUsuario = JSON.parse(localStorage.getItem(`perfil_${usuario}`)) || {
        nombreCompleto: usuario,
        email: `${usuario}@email.com`,
        telefono: '',
        direccion: 'Xalapa, Veracruz'
    };

    // Mostrar datos en el formulario
    document.getElementById('nombreUsuario').textContent = datosUsuario.nombreCompleto;
    document.getElementById('emailUsuario').textContent = datosUsuario.email;
    document.getElementById('nombreCompleto').value = datosUsuario.nombreCompleto;
    document.getElementById('email').value = datosUsuario.email;
    document.getElementById('telefono').value = datosUsuario.telefono;
    document.getElementById('direccion').value = datosUsuario.direccion;
}

function guardarPerfil(e) {
    e.preventDefault();
    
    const usuario = localStorage.getItem('usuarioActivo');
    const datosUsuario = {
        nombreCompleto: document.getElementById('nombreCompleto').value,
        email: document.getElementById('email').value,
        telefono: document.getElementById('telefono').value,
        direccion: document.getElementById('direccion').value
    };
    
    // Guardar en localStorage
    localStorage.setItem(`perfil_${usuario}`, JSON.stringify(datosUsuario));
    
    // Actualizar la visualización
    document.getElementById('nombreUsuario').textContent = datosUsuario.nombreCompleto;
    document.getElementById('emailUsuario').textContent = datosUsuario.email;
    
    // Mostrar mensaje de éxito
    alert('Perfil actualizado correctamente');
}

function volverAlMapa() {
    window.location.href = '/paginas/inicio/inicio.html';
}

function cerrarSesion() {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        localStorage.removeItem('usuarioActivo');
        window.location.href = '/paginas/login/login.html';
    }
}