import { obtenerRutasDesdeSupabase, crearRutaEnSupabase, actualizarRutaEnSupabase, eliminarRutaDeSupabase, cerrarSesion, obtenerGeometriaRuta } from "./util.js";

// ---------------- Inicialización ----------------
(async function init() {
    configurarBienvenida();
    configurarTooltip();
    configurarItemsMenu();
    configurarAdmin();
    configurarSidebar();
    configurarInputBusqueda();
    await cargarRutas();
    await obtenerRutas();
    await procesarParadasGlobales();
})();

function configurarInputBusqueda() {
    const input = document.getElementById("buscar-ruta");
    const lista = document.getElementById("resultados-busqueda");
    const limpiar = document.getElementById("btn-limpiar");

    input.value = "";

    input.addEventListener("focus", () => {
        // si no hay historial no se muestra nada
        if (historialBusquedas.length === 0) return;

        lista.innerHTML = "";
        lista.classList.remove("d-none");
        limpiar.classList.remove("d-none");

        mostrarHistorial(lista, input);
    });
}

function configurarSidebar() {
    const sidebar = document.getElementById('sidebar-content');

    ['mousedown', 'mousemove', 'mouseup', 'click', 'dblclick', 'touchstart', 'touchmove', 'touchend'].forEach(evt => {
        sidebar.addEventListener(evt, function(e) {
            e.stopPropagation();  // evita que el evento llegue al mapa
        });
    });
}

function configurarAdmin() {
    localStorage.setItem("admin", "false");
    localStorage.setItem("modoCreacion", "ruta");
}

// ---------------- Inicialización del mapa ----------------
const lightTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
});

const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
});

const map = L.map('map', {
  center: [19.529825, -96.923362],
  zoom: 16,
  layers: [lightTiles]
});

// ---------------- Control Zoom ----------------
const zoomLocateControl = L.Control.extend({
    options: { position: "bottomright" },
    onAdd: function () {
        const container = L.DomUtil.create("div", "leaflet-bar");
        container.classList.add("rounded-3", "overflow-hidden");

        const zoomIn = L.DomUtil.create("a", "leaflet-control-zoom-in", container);
        zoomIn.classList.add("d-flex", "justify-content-center", "align-items-center");
        zoomIn.innerHTML = '<i class="fa-solid fa-plus fs-6"></i>';
        zoomIn.href = "#";
        L.DomEvent.on(zoomIn, "click", L.DomEvent.stop)
                  .on(zoomIn, "click", () => map.zoomIn());

        const zoomOut = L.DomUtil.create("a", "leaflet-control-zoom-out", container);
        zoomOut.classList.add("d-flex", "justify-content-center", "align-items-center");
        zoomOut.innerHTML = '<i class="fa-solid fa-minus fs-6"></i>';
        zoomOut.href = "#";
        L.DomEvent.on(zoomOut, "click", L.DomEvent.stop)
                  .on(zoomOut, "click", () => map.zoomOut());

        return container;
    }
});

// ---------------- Control Ubicación ----------------
const ubicacion = L.Control.extend({
    options: { position: "bottomright" },
    onAdd: function () {
        const container = L.DomUtil.create("div", "leaflet-bar rounded-3 overflow-hidden");

        const locateBtn = L.DomUtil.create("a", "", container);
        locateBtn.classList.add("d-flex", "justify-content-center", "align-items-center");
        locateBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs fs-6"></i>';
        locateBtn.id = "btn-ubicacion";
        locateBtn.href = "#";
        locateBtn.title = "Ver mi ubicación";
        L.DomEvent.on(locateBtn, "click", L.DomEvent.stop)
                  .on(locateBtn, "click", () => verMiUbicacion());
        return container;
    }
});

// ---------------- CONTROL DE ALERTAS ----------------
const alertasControl = L.Control.extend({
    options: { position: "bottomright" },
    onAdd: function () {
      const container = L.DomUtil.create("div", "leaflet-bar position-relative");
      container.classList.add("rounded-3", "overflow-hidden");
  
      const alertaBtn = L.DomUtil.create("a", "leaflet-control-alertas", container);
      alertaBtn.classList.add("d-flex", "justify-content-center", "align-items-center", "bg-warning", "text-dark");
      alertaBtn.innerHTML = '<i class="fa-solid fa-triangle-exclamation fs-6"></i>';
      alertaBtn.href = "#";
      alertaBtn.title = "Mostrar alertas";
  
      // Menú visible siempre sobre el mapa
      const menu = L.DomUtil.create("div", "menu-alertas bg-white border rounded shadow position-fixed");
      menu.style.cssText = `
        bottom: 80px;
        right: 20px;
        display: none;
        min-width: 200px;
        z-index: 999999 !important;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      `;
  
      const opciones = [
        { tipo: "Tráfico", icono: "fa-car", color: "text-danger" },
        { tipo: "Accidente", icono: "fa-car-burst", color: "text-warning" },
        { tipo: "Construcción", icono: "fa-person-digging", color: "text-primary" }
      ];
  
      opciones.forEach(op => {
        const btn = L.DomUtil.create("button", "btn btn-light w-100 text-start d-flex align-items-center gap-2 px-3 py-2 border-0", menu);
        btn.innerHTML = `<i class="fa-solid ${op.icono} ${op.color}"></i> ${op.tipo}`;
        btn.onclick = (e) => {
          L.DomEvent.stop(e);
          mostrarAlertaMapa(op.tipo);
          menu.style.display = "none";
        };
      });
  
      document.body.appendChild(menu); // asegura que esté por encima del mapa
  
      L.DomEvent.on(alertaBtn, "click", L.DomEvent.stop)
                .on(alertaBtn, "click", () => abrirMenu(menu));
  
      document.addEventListener("click", (e) => {
        if (!container.contains(e.target) && !menu.contains(e.target)) {
          menu.style.display = "none";
        }
      });
  
      return container;
    }
});

// ---------------- FUNCIÓN PARA ABRIR MENÚ ----------------
function abrirMenu(menu) {
    const visible = menu.style.display === "block";
    document.querySelectorAll(".menu-alertas").forEach(m => m.style.display = "none");
    menu.style.display = visible ? "none" : "block";
}

// ---------------- Mostrar alerta ----------------
function mostrarAlertaMapa(tipo) {
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString();
    const hora = ahora.toLocaleTimeString();
  
    const colores = {
      "Tráfico": "text-danger",
      "Accidente": "text-warning",
      "Construcción": "text-primary"
    };
  
    const mensaje = `
      <div class="text-center">
        <h5 class="fw-bold mb-2"><i class="fa-solid fa-triangle-exclamation ${colores[tipo]}"></i> ${tipo}</h5>
        <p class="mb-1">Fecha: ${fecha}</p>
        <p class="mb-2">Hora: ${hora}</p>
      </div>
    `;
  
    const centro = map.getCenter();
    L.popup({ closeButton: true, autoClose: true, className: "popup-alerta" })
      .setLatLng(centro)
      .setContent(mensaje)
      .openOn(map);
}

// ---------------- Control modo claro / oscuro ----------------
const modo = L.Control.extend({
    options: { position: "bottomright" },
    onAdd: function () {
        const container = L.DomUtil.create("div", "leaflet-bar rounded-3 overflow-hidden");

        const modoBtn = L.DomUtil.create("a", "leaflet-control-modo d-flex justify-content-center align-items-center", container);
        modoBtn.innerHTML = '<i class="fa-solid fa-sun fs-6"></i>';
        modoBtn.href = "#";
        modoBtn.title = "Cambiar modo claro/oscuro";

        L.DomEvent.on(modoBtn, "click", L.DomEvent.stop).on(modoBtn, "click", () => {
            document.body.classList.toggle("dark-mode");
            if (document.body.classList.contains("dark-mode")) {
                map.removeLayer(lightTiles);
                map.addLayer(darkTiles);
                modoBtn.innerHTML = '<i class="fa-solid fa-moon fs-6"></i>';
            } else {
                map.removeLayer(darkTiles);
                map.addLayer(lightTiles);
                modoBtn.innerHTML = '<i class="fa-solid fa-sun fs-6"></i>';
            }
        });

        return container;
    }
});

// ---------------- Agregar controles ----------------
map.removeControl(map.zoomControl);
map.addControl(new zoomLocateControl());
map.addControl(new ubicacion());
map.addControl(new modo());
map.addControl(new alertasControl());

// ---------------- Variables globales ----------------
let rutas = [];
let rutasSupabase = [];
let rutaEnEdicion = null;
let elementosRuta = [];
let todasLasParadas = [];

let rutasDibujadas = [];
let lineas = [];
let paradas = [];
let paradasCrearRuta = [];
let puntosRuta = [];
let puntosCrearRuta = [];
let marcadores = [];
let marcadoresParadas = [];
let marcadoresCrearRuta = [];
let datosParadas = [];
let contadorIdParada = 0;

let modoCreacionActivo = false;
let lineaPrevisualizacion = null;
let marcadorDestino = null;
let rutaSeleccionada = null;
let paradasActuales = [];
let monitoreoActivo = false;
let notificacionEnviada = false;
let intervaloMonitoreo = null;
let retrasoBusqueda = null;
let tiempoBusqueda = 1000;
let ultimoResultado = [];
let historialBusquedas = JSON.parse(localStorage.getItem("historialBusquedas")) || [];

const limiteHistorial = 5;
const areaXalapa = "-96.9667,19.4833,-96.8000,19.6000";

const destinoIcon = L.divIcon({
    html: `<div class="d-flex justify-content-center align-items-center rounded-circle border border-3 border-white bg-success shadow-sm" style="width:34px; height:34px;">
             <i class="fa-solid fa-flag text-white"></i>
           </div>`,
    className: 'marcador-destino',
    iconSize: [34, 34],
    iconAnchor: [17, 17]
});

const paradaIcon = L.divIcon({
    html: `<div class="d-flex justify-content-center align-items-center rounded-circle border border-3 border-white bg-primary shadow-sm" style="width:32px; height:32px; cursor: pointer;">
             <i class="fa-solid fa-bus-simple text-white"></i>
           </div>`,
    className: 'marcador-parada',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

// ---------------- Funciones auxiliares ----------------
function mostrarMensajeTemporal(mensaje) {
    const centro = map.getCenter();
    const popup = L.popup()
        .setLatLng(centro)
        .setContent(`<div class="text-center">${mensaje}</div>`)
        .openOn(map);
    setTimeout(() => {
        map.closePopup(popup);
    }, 2000);
}

// ---------------- FUNCIONES DE NOTIFICACIÓN COMPLETAS ----------------
function iniciarMonitoreoProximidad() {
    if (intervaloMonitoreo) {
        clearInterval(intervaloMonitoreo);
    }
    
    monitoreoActivo = true;
    notificacionEnviada = false;
    
    intervaloMonitoreo = setInterval(() => {
        if (!marcadorDestino || !marcadorUbicacion || !rutaSeleccionada) {
            return;
        }
        
        const ubicacionActual = marcadorUbicacion.getLatLng();
        const destino = marcadorDestino.getLatLng();
        
        // Calcular distancia actual al destino
        const distanciaAlDestino = map.distance(ubicacionActual, destino);
        
        // Verificar si está cerca (menos de 500 metros)
        if (distanciaAlDestino < 500 && !notificacionEnviada) {
            notificarProximidadDestino(distanciaAlDestino);
            notificacionEnviada = true;
        }
        
        // Verificar paradas cercanas (1-2 paradas antes)
        verificarParadasCercanas(ubicacionActual);
        
    }, 3000); // Verificar cada 3 segundos
}

function detenerMonitoreoProximidad() {
    if (intervaloMonitoreo) {
        clearInterval(intervaloMonitoreo);
        intervaloMonitoreo = null;
    }
    monitoreoActivo = false;
    notificacionEnviada = false;
    ocultarNotificacion();
}

function verificarParadasCercanas(ubicacionActual) {
    if (!paradasActuales.length || !marcadorDestino) return;
    
    const destino = marcadorDestino.getLatLng();
    
    // Encontrar el índice de la parada destino
    const indiceDestino = paradasActuales.findIndex(parada => 
        Math.abs(parada.lat - destino.lat) < 0.0001 && Math.abs(parada.lng - destino.lng) < 0.0001
    );
    
    if (indiceDestino === -1) return;
    
    // Verificar paradas 1 y 2 posiciones antes del destino
    for (let i = 1; i <= 2; i++) {
        const indiceParadaCercana = indiceDestino - i;
        if (indiceParadaCercana >= 0 && indiceParadaCercana < paradasActuales.length) {
            const parada = paradasActuales[indiceParadaCercana];
            const distanciaAParada = map.distance(
                ubicacionActual, 
                L.latLng(parada.lat, parada.lng)
            );
            
            // Si está a menos de 300 metros de una parada cercana al destino
            if (distanciaAParada < 300 && !notificacionEnviada) {
                notificarParadaCercana(i, distanciaAParada);
                notificacionEnviada = true;
                break;
            }
        }
    }
}

function notificarProximidadDestino(distancia) {
    const mensaje = `¡Estás cerca de tu destino! (${Math.round(distancia)} metros)`;
    mostrarNotificacionPermanente(mensaje);
    
    // Opcional: reproducir sonido o vibración si el navegador lo permite
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
    }
}

function notificarParadaCercana(paradasAntes, distancia) {
    const mensaje = `¡Atención! Estás a ${Math.round(distancia)} metros de tu destino. 
                    Te quedan aproximadamente ${paradasAntes} parada${paradasAntes > 1 ? 's' : ''}.`;
    mostrarNotificacionPermanente(mensaje);
}

function mostrarNotificacionPermanente(mensaje) {
    // Crear o actualizar notificación en la interfaz
    let notificacion = document.getElementById('notificacion-proximidad');
    
    if (!notificacion) {
        notificacion = document.createElement('div');
        notificacion.id = 'notificacion-proximidad';
        notificacion.className = 'alert alert-warning alert-dismissible fade show position-fixed';
        notificacion.style.cssText = `
            top: 80px;
            right: 20px;
            z-index: 1000;
            max-width: 300px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        
        notificacion.innerHTML = `
            <strong> Notificación</strong>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            <hr>
            <div id="texto-notificacion">${mensaje}</div>
        `;
        
        document.body.appendChild(notificacion);
        
        // Agregar evento para cerrar la notificación
        notificacion.querySelector('.btn-close').addEventListener('click', () => {
            ocultarNotificacion();
        });
    } else {
        document.getElementById('texto-notificacion').textContent = mensaje;
        notificacion.style.display = 'block';
    }
    
    // Auto-ocultar después de 10 segundos
    setTimeout(() => {
        ocultarNotificacion();
    }, 10000);
}

function ocultarNotificacion() {
    const notificacion = document.getElementById('notificacion-proximidad');
    if (notificacion) {
        notificacion.style.display = 'none';
        notificacionEnviada = false;
    }
}

// ---------------- Funciones de gestión de mapa ----------------
function limpiarMarcadores() {
    marcadores.forEach((m) => map.removeLayer(m));
    marcadores = [];
    puntosRuta = [];
    rutasDibujadas.forEach((r) => map.removeLayer(r));
    rutasDibujadas = [];
    marcadorUbicacion = null;
    circuloUbicacion = null;
    marcadorDestino = null;
    rutaSeleccionada = null;
    paradasActuales = [];
    detenerMonitoreoProximidad();
    document.getElementById("lista-puntos").innerHTML = "";
}

function limpiarDestino() {
    if (marcadorDestino) {
        map.removeLayer(marcadorDestino);
        marcadorDestino = null;
    }
    detenerMonitoreoProximidad();
    map.off('click.destino');
    reactivarClicEnParadas();

    if (localStorage.getItem("admin") === "true") {
        map.off('click.admin');
        map.on("click.admin", (e) => {
            const { lat, lng } = e.latlng;
            agregarPunto(lat, lng);
        });
    }
    mostrarMensajeTemporal('📍 Destino eliminado');
}

function configurarSeleccionDestino() {
    map.off('click.destino');

    // Mostrar mensaje indicando que se debe hacer clic en una parada
    mostrarMensajeTemporal('Haz clic en una parada de la ruta para seleccionar tu destino');
}

function manejarClicEnParada(e) {
    const { lat, lng } = e.latlng;

    // Verificar si el clic fue en una parada existente
    const esParada = paradasActuales.some(parada =>
        parada.lat === lat && parada.lng === lng
    );

    if (!esParada) return; // Solo procesar si es una parada

    if (marcadorDestino) {
        map.removeLayer(marcadorDestino);
    }

    marcadorDestino = L.marker([lat, lng], {
        icon: destinoIcon,
        zIndexOffset: 1000
    }).addTo(map);

    marcadorDestino.bindPopup(
        `<div class="text-center">
            <h6 class="fw-bold mb-1"> Destino seleccionado</h6>
            <p class="mb-1">Lat: ${lat.toFixed(6)}</p>
            <p class="mb-1">Lng: ${lng.toFixed(6)}</p>
            ${rutaSeleccionada ? `<p class="mb-0">Ruta: ${rutaSeleccionada.nombre}</p>` : ''}
            <button class="btn btn-sm btn-danger mt-2 w-100" onclick="limpiarDestino()">
                <i class="fa-solid fa-xmark"></i> Limpiar destino
            </button>
        </div>`
    ).openPopup();

    console.log("Destino seleccionado en parada:", { lat, lng, ruta: rutaSeleccionada?.nombre });
}

function reactivarClicEnParadas() {
    map.off('click.paradaDestino');

    // Agregar evento para clic en paradas
    map.on('click.paradaDestino', function (e) {
        manejarClicEnParada(e);
    });
}

function cargarRuta(ruta, supabase = false) {
    // limpiarDestino();
    lineas = [];
    paradas = [];
    if (supabase) crearRutaSupabase(ruta); else crearRuta(ruta);
    rutaSeleccionada = ruta;
    configurarSeleccionDestino();
    mostrarMensajeTemporal(`✅ Ruta "${ruta.nombre}" cargada. Haz clic en una parada para seleccionar destino.`);
    if (supabase) mostrarDetallesRuta(ruta, supabase); else mostrarDetallesRuta(ruta);
}

// ---------------- Funciones de rutas ----------------
function btnRuta(ruta) {
    const contenedor = document.createElement("div");
    contenedor.className = "d-flex align-items-center justify-content-between";

    // Botón principal de la ruta - CON COLOR MORADO PARA MUJER SEGURA
    const btn = document.createElement("button");
    btn.style.fontSize = ".875rem";
    btn.style.maxWidth = "20rem";
    btn.style.minWidth = "0";
    
    // Verificar si es la ruta Mujer Segura
    if (ruta["mujer segura"] === "true") {
        btn.className = "btn text-white text-start flex-grow-1 me-2";
        btn.style.backgroundColor = "#683475"; // Morado
        btn.style.borderColor = "#683475";
    } else {
        btn.className = "btn btn-secondary text-start flex-grow-1 me-2";
    }

    const icono = document.createElement("i");
    
    // Icono especial para Mujer Segura
    if (ruta["mujer segura"] === "true") {
        icono.className = "fa-solid fa-shield-heart me-2"; // Icono de escudo con corazón
    } else {
        icono.className = "fa-solid fa-bus-simple me-2";
    }
    
    btn.appendChild(icono);
    btn.appendChild(document.createTextNode(ruta.nombre));

    btn.onclick = () => { cargarRuta(ruta); };

    // Botón de horario
    const botonHorario = document.createElement("button");
    if (ruta["mujer segura"] === "true") {
        botonHorario.className = "btn btn-outline-light me-2";
        botonHorario.style.borderColor = "#683475";
        botonHorario.style.color = "#683475";
    } else {
        botonHorario.className = "btn btn-outline-secondary me-2";
    }
    botonHorario.innerHTML = '<i class="fa-solid fa-clock"></i>';

    botonHorario.onclick = () => {
        const horario = ruta.horario || {
            lunes: "6:00am - 10:00pm",
            sabado: "7:00am - 9:00pm",
            domingo: "8:00am - 8:00pm"
        };

        document.getElementById("horario-texto").innerHTML = `
            <div class="text-center">
                <h5 class="fw-bold mb-3"><i class="fa-solid fa-clock me-2"></i> Horario de la Ruta</h5>
                <p class="mb-2 fs-6 text-muted">📍 <strong>Ruta:</strong> ${ruta.nombre}</p>
                <div class="d-flex flex-column align-items-center">
                    <div class="p-2 mb-2 w-75 bg-light rounded shadow-sm">
                        <i class="fa-solid fa-sun me-2 text-warning"></i>
                        <strong>Lunes a Viernes:</strong> ${horario.lunes}
                    </div>
                    <div class="p-2 w-75 bg-light rounded shadow-sm">
                        <i class="fa-solid fa-sun-bright me-2 text-danger"></i>
                        <strong>Sabado y Domingo:</strong> ${horario.domingo}
                    </div>
                </div>
            </div>
        `;

        const horarioModal = new bootstrap.Modal(document.getElementById("horarioModal"));
        horarioModal.show();
    };

    // Botón de favorito
    const favBtn = document.createElement("button");
    if (ruta["mujer segura"] === "true") {
        favBtn.className = "btn btn-outline-light";
        favBtn.style.borderColor = "#683475";
        favBtn.style.color = "#683475";
    } else {
        favBtn.className = "btn btn-outline-dark";
    }
    // Comprueba si la ruta es favorita al momento de crear el botón.
    if (esRutaFavorita(ruta)) {
        // Ícono sólido si ya es favorita
        favBtn.innerHTML = '<i class="fa-solid fa-bookmark"></i>'; 
    } else {
        // Ícono de contorno si no es favorita
        favBtn.innerHTML = '<i class="fa-regular fa-bookmark"></i>'; 
    }
    favBtn.onclick = () => {
        guardarFavorito(ruta, favBtn);
    };

    // Agregar botones al contenedor
    contenedor.appendChild(btn);
    contenedor.appendChild(botonHorario);
    contenedor.appendChild(favBtn);
    return contenedor;
}
function crearBotonRuta(ruta) {
    const lista = document.getElementById("lista-rutas");
    const contenedor = btnRuta(ruta);
    lista.appendChild(contenedor);
}

/**
 * Crea y devuelve el conjunto de botones para una ruta específica.
 * @param {object} ruta - El objeto de la ruta, con la estructura de la tabla de Supabase.
 * @returns {HTMLElement} El elemento 'div' contenedor con todos los botones.
 */
function btnRutaSupabase(ruta) {
    const contenedor = document.createElement("div");
    contenedor.className = "d-flex align-items-center justify-content-between";

    // --- 1. Botón Principal de la Ruta ---
    const btn = document.createElement("button");
    btn.style.cssText = "font-size: .875rem; max-width: 20rem; min-width: 0;";
    
    // CAMBIO CLAVE: "mujer - segura" ahora es un booleano (true/false), no un string ("true").
    const esMujerSegura = ruta["mujer-segura"] === true;

    if (esMujerSegura) {
        btn.className = "btn text-white text-start flex-grow-1 me-2";
        btn.style.backgroundColor = "#683475"; // Morado
        btn.style.borderColor = "#683475";
    } else {
        btn.className = "btn btn-secondary text-start flex-grow-1 me-2";
    }

    const icono = document.createElement("i");
    icono.className = esMujerSegura ? "fa-solid fa-shield-heart me-2" : "fa-solid fa-bus-simple me-2";
    
    btn.appendChild(icono);
    btn.appendChild(document.createTextNode(ruta.nombre));
    btn.onclick = () => cargarRuta(ruta, true);

    // --- 2. Botón de Horario ---
    const botonHorario = document.createElement("button");
    if (esMujerSegura) {
        botonHorario.className = "btn btn-outline-light me-2";
        botonHorario.style.borderColor = "#683475";
        botonHorario.style.color = "#683475";
    } else {
        botonHorario.className = "btn btn-outline-secondary me-2";
    }
    botonHorario.innerHTML = '<i class="fa-solid fa-clock"></i>';

    botonHorario.onclick = () => {
        // Accede de forma segura al objeto de horario desde la DB
        const horario = ruta.horario;
        const horarioLV = horario?.lunes_viernes || "No disponible";
        const horarioSD = horario?.sabado_domingo || "No disponible";

        document.getElementById("horario-texto").innerHTML = `
            <div class="text-center">
                <h5 class="fw-bold mb-3"><i class="fa-solid fa-clock me-2"></i> Horario de la Ruta</h5>
                <p class="mb-2 fs-6 text-muted">📍 <strong>Ruta:</strong> ${ruta.nombre}</p>
                <div class="d-flex flex-column align-items-center">
                    <div class="p-2 mb-2 w-75 bg-light rounded shadow-sm">
                        <i class="fa-solid fa-calendar-days me-2 text-primary"></i>
                        <strong>Lunes a Viernes:</strong> ${horarioLV}
                    </div>
                    <div class="p-2 w-75 bg-light rounded shadow-sm">
                        <i class="fa-solid fa-calendar-week me-2 text-success"></i>
                        <strong>Sábado y Domingo:</strong> ${horarioSD}
                    </div>
                </div>
            </div>`;

        const horarioModal = new bootstrap.Modal(document.getElementById("horarioModal"));
        horarioModal.show();
    };

    // --- 3. Botón de Favorito ---
    const favBtn = document.createElement("button");
    if (esMujerSegura) {
        favBtn.className = "btn btn-outline-light";
        favBtn.style.borderColor = "#683475";
        favBtn.style.color = "#683475";
    } else {
        favBtn.className = "btn btn-outline-dark";
    }
    // Comprueba si la ruta es favorita al momento de crear el botón.
    if (esRutaFavorita(ruta)) {
        // Ícono sólido si ya es favorita
        favBtn.innerHTML = '<i class="fa-solid fa-bookmark"></i>'; 
    } else {
        // Ícono de contorno si no es favorita
        favBtn.innerHTML = '<i class="fa-regular fa-bookmark"></i>'; 
    }
    favBtn.onclick = () => guardarFavorito(ruta, favBtn, true);

    // --- Ensamblaje y Retorno ---
    contenedor.appendChild(btn);
    contenedor.appendChild(botonHorario);
    contenedor.appendChild(favBtn);
    return contenedor;
}

function crearBotonRutaSupabase(ruta, admin = false) {
    let lista;
    if (admin) {
        lista = document.getElementById("lista-mis-rutas");
    } else {
        lista = document.getElementById("rutas-supabase");
    }
    const contenedor = btnRutaSupabase(ruta);
    lista.appendChild(contenedor);
}

function crearBotonMiRuta(ruta) {
    const lista = document.getElementById("lista-mis-rutas");
    const contenedor = document.createElement("div");
    contenedor.className = "d-flex align-items-center justify-content-between";

    // Botón principal de la ruta - CON COLOR MORADO PARA MUJER SEGURA
    const btn = document.createElement("button");
    btn.style.fontSize = ".875rem";
    btn.style.maxWidth = "20rem";
    btn.style.minWidth = "0";
    
    // Verificar si es la ruta Mujer Segura
    if (ruta["mujer segura"] === "true") {
        btn.className = "btn text-white text-start flex-grow-1 me-2";
        btn.style.backgroundColor = "#683475"; // Morado
        btn.style.borderColor = "#683475";
    } else {
        btn.className = "btn btn-secondary text-start flex-grow-1 me-2";
    }

    const icono = document.createElement("i");
    
    // Icono especial para Mujer Segura
    if (ruta["mujer segura"] === "true") {
        icono.className = "fa-solid fa-shield-heart me-2"; // Icono de escudo con corazón
    } else {
        icono.className = "fa-solid fa-bus-simple me-2";
    }
    
    btn.appendChild(icono);
    btn.appendChild(document.createTextNode(ruta.nombre));

    btn.onclick = () => { cargarRuta(ruta); };

    // Botón de horario
    const botonHorario = document.createElement("button");
    if (ruta["mujer segura"] === "true") {
        botonHorario.className = "btn btn-outline-light me-2";
        botonHorario.style.borderColor = "#683475";
        botonHorario.style.color = "#683475";
    } else {
        botonHorario.className = "btn btn-outline-secondary me-2";
    }
    botonHorario.innerHTML = '<i class="fa-solid fa-clock"></i>';

    botonHorario.onclick = () => {
        const horario = ruta.horario || {
            lunes: "6:00am - 10:00pm",
            sabado: "7:00am - 9:00pm",
            domingo: "8:00am - 8:00pm"
        };

        document.getElementById("horario-texto").innerHTML = `
            <div class="text-center">
                <h5 class="fw-bold mb-3"><i class="fa-solid fa-clock me-2"></i> Horario de la Ruta</h5>
                <p class="mb-2 fs-6 text-muted">📍 <strong>Ruta:</strong> ${ruta.nombre}</p>
                <div class="d-flex flex-column align-items-center">
                    <div class="p-2 mb-2 w-75 bg-light rounded shadow-sm">
                        <i class="fa-solid fa-sun me-2 text-warning"></i>
                        <strong>Lunes a Viernes:</strong> ${horario.lunes}
                    </div>
                    <div class="p-2 w-75 bg-light rounded shadow-sm">
                        <i class="fa-solid fa-sun-bright me-2 text-danger"></i>
                        <strong>Sabado y Domingo:</strong> ${horario.domingo}
                    </div>
                </div>
            </div>
        `;

        const horarioModal = new bootstrap.Modal(document.getElementById("horarioModal"));
        horarioModal.show();
    };

    // Botón de favorito
    const favBtn = document.createElement("button");
    if (ruta["mujer segura"] === "true") {
        favBtn.className = "btn btn-outline-light";
        favBtn.style.borderColor = "#683475";
        favBtn.style.color = "#683475";
    } else {
        favBtn.className = "btn btn-outline-dark";
    }
    favBtn.innerHTML = '<i class="fa-solid fa-bookmark"></i>';
    favBtn.onclick = () => {
        guardarFavorito(ruta);
    };

    // Agregar botones al contenedor
    contenedor.appendChild(btn);
    contenedor.appendChild(botonHorario);
    contenedor.appendChild(favBtn);
    lista.appendChild(contenedor);
}

// Función auxiliar (opcional) para mostrar horarios manualmente
function mostrarHorario(horario) {
    document.getElementById("horario-texto").innerHTML = horario;
}

/**
 * Comprueba si una ruta ya está guardada en favoritos.
 * @param {object} ruta - El objeto de la ruta a comprobar.
 * @returns {boolean} - Devuelve true si la ruta es favorita, de lo contrario false.
 */
function esRutaFavorita(ruta) {
    const favoritos = JSON.parse(localStorage.getItem("rutasFavoritas")) || [];
    return favoritos.some(fav => fav.ruta.nombre === ruta.nombre);
}

/**
 * Guarda o elimina una ruta de favoritos en localStorage.
 * Si la ruta no es favorita, la agrega.
 * Si ya es favorita, pide confirmación para eliminarla.
 * @param {object} ruta - El objeto de la ruta a guardar/eliminar.
 * @param {boolean} supabase - Indica si la ruta proviene de Supabase o de un archivo local.
 */
function guardarFavorito(ruta, btn, supabase = false) {
    let favoritos = JSON.parse(localStorage.getItem("rutasFavoritas")) || [];
    const nombreRuta = ruta.nombre;
    const icono = btn.querySelector('i');

    // Busca el índice de la ruta en el array de favoritos.
    // Se busca dentro del objeto 'ruta' anidado.
    const indexExistente = favoritos.findIndex(fav => fav.ruta.nombre === nombreRuta);

    if (indexExistente === -1) {
        // --- Si la ruta NO está en favoritos, la agrega ---
        favoritos.push({ ruta: ruta, tipo: supabase ? 'supabase' : 'local' });
        localStorage.setItem("rutasFavoritas", JSON.stringify(favoritos));

        // Actualiza el ícono del botón a sólido
        icono.classList.remove('fa-regular');
        icono.classList.add('fa-solid');
        
        Swal.fire({
            icon: 'success',
            title: '¡Guardada!',
            text: `La ruta "${nombreRuta}" se ha añadido a tus favoritos.`,
            timer: 1500, // Cierra la alerta automáticamente
            showConfirmButton: false
        });
    } else {
        // --- Si la ruta YA está en favoritos, pide confirmación para quitarla ---
        Swal.fire({
            title: '¿Quitar de favoritos?',
            text: `La ruta "${nombreRuta}" ya está en tus favoritos. ¿Deseas eliminarla?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, quitar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                // El usuario confirmó, así que eliminamos la ruta del array
                favoritos.splice(indexExistente, 1);
                localStorage.setItem("rutasFavoritas", JSON.stringify(favoritos));

                // Actualiza el ícono del botón a contorno
                icono.classList.remove('fa-solid');
                icono.classList.add('fa-regular');

                Swal.fire(
                    '¡Eliminada!',
                    `La ruta "${nombreRuta}" ha sido eliminada de tus favoritos.`,
                    'success'
                );
                // Actualiza la lista de favoritos
                verFavoritos();
            }
        });
    }
}

function verFavoritos() {
    const favoritos = JSON.parse(localStorage.getItem("rutasFavoritas")) || [];
    const lista = document.getElementById("favoritos");
    lista.innerHTML = "";

    if (favoritos.length === 0) {
        lista.innerHTML = '<p class="text-muted">No tienes rutas favoritas guardadas.</p>';
    } else {
        favoritos.forEach(ruta => {
            let contenedor;
            if (ruta.tipo === 'supabase') {
                contenedor = btnRutaSupabase(ruta.ruta);
            } else {
                contenedor = btnRuta(ruta.ruta);
            }
            lista.appendChild(contenedor);
        });
    }
}

function dibujarRuta(ruta, lineas, paradas = [], supabase = false) {
    // Limpiar marcadores excepto el destino
    marcadores.forEach((m) => {
        if (m !== marcadorDestino) {
            map.removeLayer(m);
        }
    });
    marcadores = marcadores.filter(m => m === marcadorDestino);
    // puntosRuta = [];

    // Limpiar rutas dibujadas excepto el destino
    rutasDibujadas.forEach((r) => {
        if (r !== marcadorDestino) {
            map.removeLayer(r);
        }
    });
    rutasDibujadas = rutasDibujadas.filter(r => r === marcadorDestino);

    // Dibujar líneas
    lineas.forEach(l => {
        const polyline = L.polyline(l.coords, {
            color: l.color,
            weight: 5,
            dashArray: l.estilo === "dashed" ? "8, 6" : null
        }).addTo(map);
        // Adjunta el objeto 'ruta' a la polilínea.
        polyline.rutaData = ruta; 
        polyline.esSupabase = supabase; // Guardamos también el tipo de ruta
        rutasDibujadas.push(polyline);

        polyline.on("click", function (e) {
            L.DomEvent.stopPropagation(e);
            
            // Obtén los datos desde la polilínea que fue clickeada.
            const rutaCorrecta = e.target.rutaData;
            const esDeSupabase = e.target.esSupabase;
            
            mostrarDetallesRuta(rutaCorrecta, esDeSupabase);
        });
    });

    // Limpiar paradas anteriores
    paradasActuales = [];

    // Dibujar paradas
    paradas.forEach(p => {
        const stop = L.marker(p, {
            icon: paradaIcon,
            zIndexOffset: 500
        }).addTo(map);

        const paradaInfo = { lat: p[0], lng: p[1], marker: stop };
        paradasActuales.push(paradaInfo);
        rutasDibujadas.push(stop);

        stop.bindTooltip('Parada - Haz clic para seleccionar destino', { direction: 'top', permanent: false });

        stop.on("click", function (e) {
            L.DomEvent.stopPropagation(e);

            if (marcadorDestino) {
                map.removeLayer(marcadorDestino);
            }

            marcadorDestino = L.marker(p, { icon: destinoIcon, zIndexOffset: 1000 }).addTo(map);
            marcadorDestino.bindPopup(
                `<div class="text-center">
                    <h6 class="fw-bold mb-1">Destino seleccionado</h6>
                    <p class="mb-1">Lat: ${p[0].toFixed(6)}</p>
                    <p class="mb-1">Lng: ${p[1].toFixed(6)}</p>
                    ${rutaSeleccionada ? `<p class="mb-0">Ruta: ${rutaSeleccionada.nombre}</p>` : ''}
                    <button class="btn btn-sm btn-danger mt-2 w-100" onclick="limpiarDestino()">
                        <i class="fa-solid fa-xmark"></i> Limpiar destino
                    </button>
                </div>`
            ).openPopup();

            console.log("Destino seleccionado:", { lat: p[0], lng: p[1], ruta: rutaSeleccionada?.nombre });
        });

        stop.on("contextmenu", function (e) {
            L.DomEvent.stopPropagation(e);
            if (!marcadorDestino || (marcadorDestino.getLatLng().lat !== p[0] && marcadorDestino.getLatLng().lng !== p[1])) {
                map.removeLayer(stop);
                rutasDibujadas = rutasDibujadas.filter(r => r !== stop);
                paradasActuales = paradasActuales.filter(parada => parada.lat !== p[0] && parada.lng !== p[1]);
            }
        });
    });

    // Reactivar clic en paradas si tienes esa función
    reactivarClicEnParadas();

    // Centrar mapa en la ruta y destino (si existe)
    elementosRuta = [...rutasDibujadas];
    if (marcadorDestino) elementosRuta.push(marcadorDestino);

    if (elementosRuta.length > 0) {
        const group = new L.featureGroup(elementosRuta);
        map.fitBounds(group.getBounds(), {
            padding: [50, 50],
            maxZoom: 17
        });
    }
}


async function crearRuta(ruta) {
    try {
        const archivos = ruta.archivos;
        
        if (archivos.ruta) {
            const coords = await cargarGeoJSON(archivos.ruta);
            lineas.push({ coords, color: ruta.color, estilo: "solid" });

            if (archivos.paradas) {
                paradas = await cargarParadas(archivos.paradas);
            }
        }

        if (archivos.ida) {
            const ida = await cargarGeoJSON(archivos.ida);
            lineas.push({ coords: ida, color: ruta.color, estilo: "solid" });

            if (archivos["ida-paradas"]) {
                const p = await cargarParadas(archivos["ida-paradas"]);
                paradas = paradas.concat(p);
            }
        }

        if (archivos.vuelta) {
            const vuelta = await cargarGeoJSON(archivos.vuelta);
            lineas.push({ coords: vuelta, color: ruta.color, estilo: "dashed" });

            if (archivos["vuelta-paradas"]) {
                const p = await cargarParadas(archivos["vuelta-paradas"]);
                paradas = paradas.concat(p);
            }
        }

        dibujarRuta(ruta, lineas, paradas);
    } catch (err) {
        console.error("Error cargando ruta:", err);
    }
}

/**
 * Procesa un objeto de ruta obtenido de Supabase y lo prepara para ser dibujado en el mapa.
 * @param {object} ruta - El objeto de la ruta con la estructura de la tabla de Supabase.
*/
async function crearRutaSupabase(ruta) {
    try {
        // 1. Procesar rutas y paradas
        if (ruta["ruta"] && ruta["ruta"] !== null) {
            const coordsLngLat = ruta["ruta"];
            // IMPORTANTE: Transformar de GeoJSON [lng, lat] a Leaflet [lat, lng]
            const coordsLatLng = coordsLngLat.map(coord => [coord[1], coord[0]]);
            
            lineas.push({
                coords: coordsLatLng,
                color: ruta["ruta - color"] || '#FF5733', // Color por defecto si no hay
                estilo: "solid"
            });
        }

        // 2. Procesa la RUTA DE IDA si existe
        if (ruta["ruta-ida"] && ruta["ruta-ida"].coordinates) {
            const coordsLngLat = ruta["ruta-ida"].coordinates;
            // IMPORTANTE: Transformar de GeoJSON [lng, lat] a Leaflet [lat, lng]
            const coordsLatLng = coordsLngLat.map(coord => [coord[1], coord[0]]);
            
            lineas.push({
                coords: coordsLatLng,
                color: ruta["ruta-ida-color"] || '#FF5733', // Color por defecto si no hay
                estilo: "solid"
            });
        }

        // 3. Procesa la RUTA DE VUELTA si existe
        if (ruta["ruta-vuelta"] && ruta["ruta-vuelta"].coordinates) {
            const coordsLngLat = ruta["ruta-vuelta"].coordinates;
            const coordsLatLng = coordsLngLat.map(coord => [coord[1], coord[0]]);
            
            lineas.push({
                coords: coordsLatLng,
                color: ruta["ruta-vuelta-color"] || '#3375FF',
                estilo: "dashed" // Estilo diferente para la vuelta
            });
        }
        
        // 4. Procesa las PARADAS si existen
        // 'paradas' en la DB es un array de objetos: [{"nombre": "...", "coords": [lng, lat]}]
        if (ruta.paradas && Array.isArray(ruta.paradas)) {
            // Procesa las nuevas paradas transformando sus coordenadas
            const nuevasParadas = ruta.paradas.map(parada => {
                // Transforma de [lng, lat] a [lat, lng]
                return [parada.coords[1], parada.coords[0]];
            });

            // ✅ SUMA las nuevas paradas al array existente en lugar de reemplazarlo
            paradas = [...paradas, ...nuevasParadas];
        }

        // 4. Llama a la función que dibuja todo en el mapa
        dibujarRuta(ruta, lineas, paradas, true);

    } catch (err) {
        console.error("Error al procesar la ruta:", ruta.nombre, err);
        // Opcional: Mostrar un mensaje de error al usuario
        // mostrarMensajeTemporal(`Error al cargar la ruta "${ruta.nombre}"`);
    }
}

async function cargarGeoJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudo cargar: " + url);
    const data = await res.json();
    return data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
}

async function cargarParadas(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudo cargar: " + url);
    const data = await res.json();
    const dataMap = data.features.map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]]);
    return dataMap;
}

// ---------------- Funciones de administración ----------------
// util
function swap(arr, i, j) { [arr[i], arr[j]] = [arr[j], arr[i]]; }

// Agregar punto de parada con menú
function agregarPuntoParada(lat, lng, id = null) {
    let paradaId;
    if (id) {
        paradaId = id;
    } else {
        paradaId = Date.now() + (contadorIdParada++);
    }

    // Guardar los datos de la parada
    const nuevaParada = {
        id: paradaId,
        coords: [lng, lat] 
    };
    datosParadas.push(nuevaParada);

    // Crear el marcador en el mapa
    const marker = L.marker([lat, lng], { 
        icon: paradaIcon,
        draggable: true
    }).addTo(map);
    
    // ¡IMPORTANTE! Guardamos el ID en el propio marcador.
    marker.paradaId = paradaId; 
    marcadoresParadas.push(marker);
    
    // --- El código para crear el elemento <li> en la lista se mantiene igual ---
    const li = document.createElement("li");
    li.className = "d-flex align-items-center mb-2";
    li.dataset.id = paradaId; 
    li.innerHTML = `
        <i class="fa-solid fa-bus text-primary me-2"></i>
        <input type="text" class="form-control form-control-sm me-2" value="[${lat}, ${lng}]" readonly>
        <button type="button" class="btn btn-sm btn-outline-danger btn-delete-parada">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;
    document.getElementById("lista-paradas").appendChild(li);
    
    const inputElement = li.querySelector("input");
    li.querySelector(".btn-delete-parada").addEventListener("click", () => eliminarPuntoParada(paradaId));
    marker.on("dragend", (event) => {
        const newPos = event.target.getLatLng();
        const paradaData = datosParadas.find(p => p.id === paradaId);
        
        // Actualiza el array de datos en memoria
        if (paradaData) {
            paradaData.coords = [newPos.lng.toFixed(6), newPos.lat.toFixed(6)];
        }

        // --- ✅ PASO 2: ACTUALIZAR LA INTERFAZ DE USUARIO (UI) ---
        // Esta es la línea que faltaba.
        inputElement.value = `[${newPos.lat.toFixed(6)}, ${newPos.lng.toFixed(6)}]`;
    });

    // --- Lógica del Menú Popup CORREGIDA ---
    const popupHTML = `
      <div class="list-group rounded-4 shadow-sm" style="font-size: .9rem;">
        <button class="list-group-item list-group-item-action text-danger" data-action="delete">
          <i class="fa-solid fa-trash me-2"></i> Eliminar parada
        </button>
      </div>
    `;
    marker.bindPopup(popupHTML, { closeOnClick: false, autoClose: false });

    // Cuando se abre el popup, añadimos el listener de forma segura
    marker.on("popupopen", (e) => {
        const popupEl = e.popup.getElement();
        if (!popupEl) return;

        L.DomEvent.disableClickPropagation(popupEl);

        // ✅ CAMBIO 1: Obtenemos el ID directamente del marcador que disparó el evento.
        const idParaEliminar = e.target.paradaId;

        const deleteBtn = popupEl.querySelector("button[data-action='delete']");
        
        // ✅ CAMBIO 2: Reemplazamos el botón para limpiar listeners antiguos y evitar duplicados.
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

        // Añadimos el listener al nuevo botón clonado.
        newDeleteBtn.addEventListener("click", () => {
            marker.closePopup();
            // Usamos el ID que obtuvimos de forma segura.
            eliminarPuntoParada(idParaEliminar);
        });
    });
    
    marker.on("contextmenu", (e) => {
        e.originalEvent.preventDefault();
        marker.openPopup();
    });
}

// Eliminar un punto de parada por su ID
function eliminarPuntoParada(id) {
    // Eliminar el marcador del mapa y del array
    const markerIndex = marcadoresParadas.findIndex(m => m.paradaId === id);
    if (markerIndex !== -1) {
        map.removeLayer(marcadoresParadas[markerIndex]);
        marcadoresParadas.splice(markerIndex, 1);
    }

    // Eliminar los datos de la parada del array de datos
    const dataIndex = datosParadas.findIndex(p => p.id === id);
    if (dataIndex !== -1) {
        datosParadas.splice(dataIndex, 1);
    }

    // Eliminar el elemento de la lista del panel
    const li = document.querySelector(`#lista-paradas li[data-id='${id}']`);
    if (li) {
        li.remove();
    }
}

// Añadir punto de ruta con menú en popup (mover arriba/abajo, eliminar)
function agregarPuntoRuta(lat, lng) {
    puntosCrearRuta.push([lng, lat]);
    const index = puntosCrearRuta.length;

    const rutaIcon = L.divIcon({
        html: `<div class="d-flex justify-content-center align-items-center rounded-circle border border-2 border-white bg-danger" style="width:32px; height:32px;">
                 <span class="text-white fw-bold">${index}</span>
               </div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    const marker = L.marker([lat, lng], { icon: rutaIcon, draggable: true }).addTo(map);
    marcadoresCrearRuta.push(marker);

    // crear fila en la lista
    const li = document.createElement("li");
    li.className = "d-flex align-items-center mb-1";
    li.innerHTML = `
        <span class="me-2 fw-bold">${index}</span>
        <input type="text" class="form-control form-control-sm me-2" value="[${lat.toFixed(6)}, ${lng.toFixed(6)}]" readonly>
        <button type="button" class="btn btn-sm btn-outline-danger btn-delete">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;
    document.getElementById("lista-puntos").appendChild(li);

    const input = li.querySelector("input");
    const deleteBtn = li.querySelector(".btn-delete");

    // Popup HTML (sin id fijo)
    const popupHTML = `
      <div class="list-group rounded-4 shadow-sm">
        <button class="list-group-item list-group-item-action" data-action="up">
          <i class="fa-solid fa-arrow-up me-2"></i> Mover arriba
        </button>
        <button class="list-group-item list-group-item-action" data-action="down">
          <i class="fa-solid fa-arrow-down me-2"></i> Mover abajo
        </button>
        <button class="list-group-item list-group-item-action text-danger" data-action="delete">
          <i class="fa-solid fa-trash me-2"></i> Eliminar
        </button>
      </div>
    `;

    // Bind popup evitando que se cierre por clicks en mapa
    marker.bindPopup(popupHTML, { closeOnClick: false, autoClose: false });

    // Cuando se abre el popup, añadimos listeners seguros a sus botones
    marker.on("popupopen", (e) => {
        const popupEl = e.popup.getElement();
        if (!popupEl) return;

        // Evita que los clicks dentro del popup lleguen al mapa y provoquen zoom/añadir puntos
        L.DomEvent.disableClickPropagation(popupEl);
        L.DomEvent.disableScrollPropagation(popupEl);

        // Seleccionamos botones y los manejamos
        popupEl.querySelectorAll("button[data-action]").forEach(btn => {
            // antes de añadir, quitamos cualquier handler previo para evitar duplicados
            btn.replaceWith(btn.cloneNode(true));
        });

        // Re-obtener botones (clonados)
        popupEl.querySelectorAll("button[data-action]").forEach(btn => {
            btn.addEventListener("click", (ev) => {
                ev.preventDefault();
                ev.stopPropagation(); // importantísimo: que no burbujee al mapa

                const action = btn.dataset.action;
                const i = marcadoresCrearRuta.indexOf(marker); // indice actual del marcador

                if (action === "up") moverArriba(i);
                else if (action === "down") moverAbajo(i);
                else if (action === "delete") eliminarPunto(i);

                // No hace falta reabrir el popup normalmente porque cerramos el popup manualmente sólo si borramos.
                // Si quieres mantenerlo abierto tras mover, lo reabrimos:
                setTimeout(() => {
                    if (marker._map && !marker.getPopup().isOpen()) marker.openPopup();
                }, 10);
            });
        });
    });

    // Dragend actualiza coords
    marker.on("dragend", (event) => {
        const newPos = event.target.getLatLng();
        const i = marcadoresCrearRuta.indexOf(marker);
        if (i !== -1) {
            puntosCrearRuta[i] = [newPos.lng, newPos.lat];
            input.value = `[${newPos.lat.toFixed(6)}, ${newPos.lng.toFixed(6)}]`;
        }
    });

    // abrir popup con click derecho (útil)
    marker.on("contextmenu", (e) => {
        e.originalEvent && e.originalEvent.preventDefault();
        marker.openPopup();
    });

    // botón eliminar en la lista
    deleteBtn.addEventListener("click", () => {
        const i = marcadoresCrearRuta.indexOf(marker);
        eliminarPunto(i);
    });

    reindexar();
}

// Reindexa números y actualiza iconos
function reindexar() {
    const lis = document.querySelectorAll("#lista-puntos li");
    lis.forEach((li, index) => {
        const span = li.querySelector("span");
        if (span) span.innerText = index + 1;
    });

    marcadoresCrearRuta.forEach((marker, idx) => {
        // actualizar icono para que muestre el índice correcto
        const newIcon = L.divIcon({
            html: `<div class="d-flex justify-content-center align-items-center rounded-circle border border-2 border-white bg-danger" style="width:32px; height:32px;">
                     <span class="text-white fw-bold">${idx + 1}</span>
                   </div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
        marker.setIcon(newIcon);
    });
}

// eliminar marcador y fila asociada
function eliminarPunto(i) {
    if (i >= 0 && i < marcadoresCrearRuta.length) {
        map.removeLayer(marcadoresCrearRuta[i]);
        marcadoresCrearRuta.splice(i, 1);
        puntosCrearRuta.splice(i, 1);

        const lista = document.getElementById("lista-puntos");
        if (lista && lista.children[i]) lista.children[i].remove();

        reindexar();
    }
}

// mover arriba
function moverArriba(i) {
    if (i > 0) {
        swap(marcadoresCrearRuta, i, i - 1);
        swap(puntosCrearRuta, i, i - 1);

        const lista = document.getElementById("lista-puntos");
        lista.insertBefore(lista.children[i], lista.children[i - 1]);

        reindexar();
    }
}

// mover abajo
function moverAbajo(i) {
    if (i < marcadoresCrearRuta.length - 1) {
        swap(marcadoresCrearRuta, i, i + 1);
        swap(puntosCrearRuta, i, i + 1);

        const lista = document.getElementById("lista-puntos");
        lista.insertBefore(lista.children[i + 1], lista.children[i]);

        reindexar();
    }
}

// FUNCIÓN PARA PREVISUALIZAR LA RUTA USANDO EL BACKEND Y ORS
async function previsualizarRuta() {
    // 1. Validar que existan al menos dos puntos para trazar una ruta
    if (puntosCrearRuta.length < 2) {
        Swal.fire({
            icon: 'warning',
            title: 'Puntos insuficientes',
            text: 'Agrega al menos 2 puntos en el mapa para previsualizar la ruta.',
            confirmButtonText: 'Entendido'
        });
        return;
    }

    // Opcional: Mostrar un indicador de carga
    // (ej. cambiar el texto del botón, mostrar un spinner)
    const boton = document.getElementById("btn-prev-ruta");
    boton.disabled = true;
    boton.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Calculando...';

    try {
        const routeGeometry = await obtenerGeometriaRuta(puntosCrearRuta);

        // Si ya hay una línea de previsualización en el mapa, la borramos
        if (lineaPrevisualizacion) {
            map.removeLayer(lineaPrevisualizacion);
        }

        // Dibujar la nueva ruta en el mapa
        // OpenRouteService devuelve [lng, lat], Leaflet necesita [lat, lng]. ¡Hay que invertirlos!
        const latLngs = routeGeometry.map(coord => [coord[1], coord[0]]);

        lineaPrevisualizacion = L.polyline(latLngs, {
            color: document.getElementById('color-ruta').value || '#3388ff', // Usa el color seleccionado
            weight: 5,
            opacity: 0.8
        }).addTo(map);

        // Ajustar el zoom del mapa para que se vea toda la ruta
        map.fitBounds(lineaPrevisualizacion.getBounds());

    } catch (error) {
        console.error("Error al previsualizar la ruta:", error);
        alert(`Error: ${error.message}`);
    } finally {
        // Restaurar el botón a su estado original
        boton.disabled = false;
        boton.innerHTML = '<i class="fa-solid fa-route me-1"></i> Previsualizar ruta';
    }
}

/**
 * Limpia solo los puntos de la ruta del mapa y del panel.
 * No afecta los campos del formulario como nombre o color.
 */
function limpiarRuta() {
    // Limpia los marcadores y la línea del mapa
    marcadoresCrearRuta.forEach(marker => {
        map.removeLayer(marker);
    });

    if (lineaPrevisualizacion) {
        map.removeLayer(lineaPrevisualizacion);
        lineaPrevisualizacion = null;
    }

    // Resetea los arrays de datos de los puntos
    marcadoresCrearRuta = [];
    puntosCrearRuta = [];

    // Limpia la lista de puntos en el panel
    const listaPuntosUI = document.getElementById("lista-puntos");
    if (listaPuntosUI) {
        listaPuntosUI.innerHTML = "";
    }
}

/**
 * Elimina todos los marcadores y datos de las paradas.
 */
function limpiarParadas() {
    // 1. Elimina cada marcador del mapa
    marcadoresParadas.forEach(marker => {
        map.removeLayer(marker);
    });

    // 2. Resetea los arrays de datos y marcadores
    marcadoresParadas.forEach(m => map.removeLayer(m));
    marcadoresParadas = [];
    datosParadas.forEach(p => map.removeLayer(p));
    datosParadas = [];

    // 3. Limpia la lista de paradas en el panel HTML
    const listaParadasUI = document.getElementById("lista-paradas");
    if (listaParadasUI) {
        listaParadasUI.innerHTML = "";
    }
}

// ---------------- Eventos del mapa ----------------
map.on("click", (e) => {
    const { lat, lng } = e.latlng;

    // Verifica si es admin
    if (localStorage.getItem("admin") === "true") {
        const modo = localStorage.getItem("modoCreacion");

        if (modo === "ruta") {
            // Si el modo actual es "ruta"
            agregarPuntoRuta(lat, lng);
        } else if (modo === "parada") {
            // Si el modo actual es "parada"
            agregarPuntoParada(lat, lng);
        } else {
            console.warn("Selecciona un modo de creación (ruta o parada)");
        }

    } else {
        // Si no es admin, el click sirve para establecer destino
        establecerDestino(lat, lng);
    }
});


// Icono de destino
const iconoDestino = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://unpkg.com/leaflet/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -35],
    shadowSize: [41, 41]
});

function establecerDestino(lat, lng) {
    if (marcadorDestino) {
        map.removeLayer(marcadorDestino);
    }

    marcadorDestino = L.marker([lat, lng], {
        icon: iconoDestino,
        draggable: true
    }).addTo(map);

    // centrar mapa en el destino
    map.setView([lat, lng], 15);

    marcadorDestino.setZIndexOffset(1200);

    // Popup con menú de opciones
    marcadorDestino.bindPopup(`
        <div class="list-group rounded-4 shadow">
          <button class="list-group-item list-group-item-action" onclick="verDetalles()"> 
            <i class="fa-solid fa-circle-info me-2"></i> Ver detalles 
          </button>
          <button class="list-group-item list-group-item-action" onclick="establecerRuta(${lat}, ${lng})"> 
            <i class="fa-solid fa-route me-2"></i> Establecer ruta 
          </button>
          <button class="list-group-item list-group-item-action text-danger" onclick="eliminarDestino()"> 
            <i class="fa-solid fa-trash me-2"></i> Eliminar 
          </button>
        </div>
    `);

    marcadorDestino.on("popupopen", (e) => {
        // Contenido del popup
        const content = e.popup._contentNode;
        content.classList.add("popup-destino-content");

        // Wrapper principal
        const wrapper = content.closest(".leaflet-popup-content-wrapper");
        if (wrapper) wrapper.classList.add("popup-destino-wrapper");

        // Botón de cerrar (no está dentro de content, está al mismo nivel del wrapper)
        const popupEl = wrapper?.parentElement; // .leaflet-popup
        if (popupEl) {
            const close = popupEl.querySelector(".leaflet-popup-close-button");
            if (close) close.classList.add("popup-destino-close");
        }
        e.popup.update();
    });

    marcadorDestino.on("dragend", function (e) {
        const { lat, lng } = e.target.getLatLng();
        console.log("Nuevo destino:", lat, lng);
    });
}

// --- Funciones de ejemplo para el menú ---
function verDetalles() {
    alert("Detalles del destino");
}

/**
 * Busca la ruta óptima basada en un destino y la ubicación del usuario.
 * @param {number} lat - Latitud del punto de destino seleccionado.
 * @param {number} lng - Longitud del punto de destino seleccionado.
 */
async function establecerRuta(lat, lng) {
    ocultarTodasLasRutas();

    const destinoLatLng = L.latLng(lat, lng);

    if (todasLasParadas.length === 0) { return; }

    console.log("Paradas globales procesadas:", todasLasParadas);
    // --- Validación inicial ---
    if (!marcadorUbicacion) {
        mostrarMensajeTemporal("Por favor, activa primero tu ubicación.");
        verMiUbicacion(); // Intenta activar la ubicación
        return;
    }
    if (todasLasParadas.length === 0) {
        mostrarMensajeTemporal("No hay paradas cargadas para buscar.");
        return;
    }

    const ubicacionActualLatLng = marcadorUbicacion.getLatLng();

    // --- Paso 1: Encontrar la Parada Destino (la más cercana al clic) ---
    let paradaDestino = null;
    let distanciaMinimaADestino = Infinity;

    todasLasParadas.forEach(parada => {
        const distancia = destinoLatLng.distanceTo(parada.latlng);
        if (distancia < distanciaMinimaADestino) {
            distanciaMinimaADestino = distancia;
            paradaDestino = parada;
        }
    });

    if (!paradaDestino) {
        mostrarMensajeTemporal("No se encontró ninguna parada cerca de tu destino.");
        return;
    }

    // --- Paso 2: Encontrar la Parada Origen (la más cercana al usuario en la misma ruta) ---
    const rutaEncontrada = paradaDestino;
    let paradaOrigen = null;
    let distanciaMinimaAUsuario = Infinity;

    // Filtramos solo las paradas que pertenecen a la ruta encontrada
    const paradasDeLaRuta = todasLasParadas.filter(p => p.ruta.nombre === rutaEncontrada.ruta.nombre);

    paradasDeLaRuta.forEach(parada => {
        const distancia = ubicacionActualLatLng.distanceTo(parada.latlng);
        if (distancia < distanciaMinimaAUsuario) {
            distanciaMinimaAUsuario = distancia;
            paradaOrigen = parada;
        }
    });

    if (!paradaOrigen) {
        // Esto es poco probable si ya encontramos una parada destino, pero es una buena verificación
        mostrarMensajeTemporal("No se pudo encontrar una parada de origen en la ruta.");
        return;
    }

    ocultarTodasLasRutas();

    // Dibuja la ruta encontrada
    if (rutaEncontrada.esSupabase) {
        console.log("Ruta desde Supabase:", rutaEncontrada.ruta);
        mostrarDetallesRuta(rutaEncontrada.ruta, true);
        crearRutaSupabase(rutaEncontrada.ruta);
    } else {
        console.log("Ruta desde archivos:", rutaEncontrada.ruta);
        mostrarDetallesRuta(rutaEncontrada.ruta);
        crearRuta(rutaEncontrada.ruta);
    }

    // Marcador para la parada de origen (donde el usuario debe subir)
    L.marker(paradaOrigen.latlng, { icon: paradaIcon })
        .addTo(map)
        .bindPopup(`<b>Sube aquí</b><br>Parada más cercana a tu ubicación en la ruta "${rutaEncontrada.nombre}"`)
        .openPopup();

    // Marcador para la parada de destino (donde el usuario debe bajar)
    L.marker(paradaDestino.latlng, { icon: destinoIcon })
        .addTo(map)
        .bindPopup(`<b>Baja aquí</b><br>Parada más cercana a tu destino.`);

    mostrarMensajeTemporal(`Ruta encontrada: "${rutaEncontrada.ruta.nombre}"`);
}

function eliminarDestino() {
    if (marcadorDestino) {
        map.removeLayer(marcadorDestino);
        marcadorDestino = null;
    }
}

// ---------------- Ubicación del usuario ----------------
let popupUbicacion = null;
let marcadorUbicacion = null;
let circuloUbicacion = null;
let circuloPulsante = null;
let animando = false;
let isWatchingLocation = false;

function verMiUbicacion(btn) {
    const locateBtn = btn || document.getElementById("btn-ubicacion");
    
    // Si ya estamos siguiendo la ubicación, la detenemos
    if (isWatchingLocation) {
        map.stopLocate();
        locateBtn.classList.remove("gradiente", "active-location");
        isWatchingLocation = false;
        // Opcional: Ocultar los marcadores de ubicación al detener
        if (marcadorUbicacion) map.removeLayer(marcadorUbicacion);
        if (circuloUbicacion) map.removeLayer(circuloUbicacion);
        if (circuloPulsante) map.removeLayer(circuloPulsante);
        marcadorUbicacion = circuloUbicacion = circuloPulsante = null;
        animando = false;
        return;
    }

    // Inicia el efecto de carga en el botón
    locateBtn.classList.add("gradiente");
    
    // Inicia la geolocalización
    map.locate({ setView: false, watch: true });
    isWatchingLocation = true;
    locateBtn.classList.add("active-location");

    // --- MANEJADORES DE EVENTOS (se adjuntan solo una vez si no existen) ---
    if (!map._locationHandlersAttached) {
        map._locationHandlersAttached = true;

        // Se ejecuta LA PRIMERA VEZ que se encuentra la ubicación
        map.once("locationfound", (e) => {
            map.setView(e.latlng, 17);

            locateBtn.classList.remove("gradiente");
            crearMarcadoresUbicacion(e.latlng);

            // Muestra el popup temporal
            const popup = L.popup({ closeButton: false, autoClose: true, className: "popup-ubicacion" })
                .setLatLng(e.latlng)
                .setContent("¡Aquí estás!")
                .openOn(map);
            setTimeout(() => map.closePopup(popup), 2000);
        });

        // Se ejecuta CADA VEZ que la ubicación se actualiza
        map.on("locationfound", (e) => {
            if (marcadorUbicacion) {
                marcadorUbicacion.setLatLng(e.latlng);
                circuloUbicacion.setLatLng(e.latlng);
                circuloPulsante.setLatLng(e.latlng);
            } else {
                // Si los marcadores fueron borrados, los recrea
                crearMarcadoresUbicacion(e.latlng);
            }
            locateBtn.classList.remove("gradiente");
        });

        // Se ejecuta si hay un ERROR
        map.on("locationerror", (e) => {
            Swal.fire({
                icon: 'error',
                title: 'Error de Ubicación',
                text: 'No se pudo obtener tu ubicación. Por favor, revisa los permisos en tu navegador.'
            });
            locateBtn.classList.remove("gradiente", "active-location");
            map.stopLocate();
            isWatchingLocation = false;
        });
    }
}

/**
 * Crea los 3 círculos que representan la ubicación del usuario.
 */
function crearMarcadoresUbicacion(latlng) {
    marcadorUbicacion = L.circle(latlng, { radius: 8, color: "blue", fillColor: "rgba(0, 0, 200, 1)", fillOpacity: 1 }).addTo(map);
    circuloUbicacion = L.circle(latlng, { radius: 110, color: "blue", weight: 1, fillColor: "rgba(0, 179, 255, 1)", fillOpacity: 0.2 }).addTo(map);
    circuloPulsante = L.circle(latlng, { radius: 0, color: "blue", weight: 2, fillColor: "rgba(0, 179, 255, 1)", fillOpacity: 0.5 }).addTo(map);
    animarCirculo();
}


// Tu función de animación (con una pequeña mejora para detenerse)
function animarCirculo() {
    if (animando) return; // Evita iniciar múltiples animaciones
    animando = true;

    let radio = 0;
    const radioMax = 110;

    function frame() {
        if (!isWatchingLocation) {
            animando = false;
            return; // Detiene la animación si se apaga el seguimiento
        }
        radio = (radio + 1) % radioMax;
        const opacity = Math.max(0, 0.5 * (1 - radio / radioMax));
        circuloPulsante.setRadius(radio);
        circuloPulsante.setStyle({ fillOpacity: opacity, opacity: opacity });
        requestAnimationFrame(frame);
    }
    frame();
}

// ---------------- Funciones de carga ----------------
async function cargarRutas() {
    try {
        const res = await fetch("/rutas.json");
        const data = await res.json();
        rutas = data.rutas;
    } catch (err) {
        console.error("Error cargando rutas:", err);
    }
}

function configurarBienvenida() {
    if (localStorage.getItem("mostrarBienvenida") === null) {
        localStorage.setItem("mostrarBienvenida", "true");
    }

    if (localStorage.getItem("mostrarBienvenida") === "true") {
        const modalEl = document.getElementById("bienvenidaModal");
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        modalEl.addEventListener("hidden.bs.modal", () => {
            const noMostrar = document.getElementById("no-mostrar").checked;
            if (noMostrar) {
                localStorage.setItem("mostrarBienvenida", "false");
            }
        });
    }
}

function configurarTooltip() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    })
}

// ---------------- Funciones de sidebar ----------------
function confirmarSalidaDeCreacion() {
    return Swal.fire({
        title: '¿Estás seguro?',
        text: "Se perderán los puntos y la información no guardada de la ruta.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, salir sin guardar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        // La promesa se resolverá a `true` solo si el usuario confirma.
        return result.isConfirmed; 
    });
}

function salirModoCreacion() {
    modoCreacionActivo = false;
    rutaEnEdicion = null;
    paradasCrearRuta.forEach(m => m.removeFrom(map));
    paradasCrearRuta = [];
    puntosCrearRuta = [];
    marcadoresCrearRuta.forEach(m => m.removeFrom(map));
    marcadoresCrearRuta = [];
}

async function actualizarSidebar(clave) {
    const sidebar = document.getElementById("sidebar-content");
    if (!sidebar) return;

    // Condición para mostrar la alerta
    const hayCambiosSinGuardar = modoCreacionActivo && puntosCrearRuta.length > 0;

    // Si el usuario intenta cerrar el sidebar o cambiar a otra sección mientras crea una ruta...
    if (hayCambiosSinGuardar && (sidebar.dataset.abierto === clave || sidebar.dataset.abierto === "crear")) {
        // Esperamos la confirmación del usuario. El código se pausa aquí.
        const confirmoSalir = await confirmarSalidaDeCreacion();

        // Si el usuario hizo clic en "Cancelar", no hacemos nada más.
        if (!confirmoSalir) {
            return;
        }
        
        // Si confirmó, limpiamos todo.
        salirModoCreacion(); 
    }

    localStorage.removeItem("admin");
    localStorage.removeItem("modoCreacion");

    if (sidebar.dataset.abierto === clave) {
        sidebar.classList.remove("show");
        sidebar.removeAttribute("data-abierto");
        return;
    }

    sidebar.dataset.abierto = clave;

    switch (clave) {
        case "rutas":
            mostrarRutas(sidebar);
            break;
        case "favoritos":
            mostrarFavoritos(sidebar);
            break;
        case "crear":
            mostrarCrearRutas(sidebar);
            break;
        case "mis-rutas":
            mostrarMisRutas(sidebar);
            break;
        default:
            sidebar.innerHTML = "";
            sidebar.removeAttribute("data-abierto");
            break;
    }

    sidebar.classList.add("show");
}

function mostrarMisRutas(sidebar) {
    sidebar.innerHTML = `
        <div class="d-flex flex-column p-3 h-100 overflow-auto bg-white">
            <div class="d-flex justify-content-start align-items-center gap-2">
                <button class="close-btn btn btn-outline-secondary bg-transparent border-0 fs-3 p-0 d-flex d-md-none" onclick="abrirMenuMovil()">
                    <i class="fa-solid fa-circle-arrow-left"></i>
                </button>
                <h4 class="fw-bold m-0">Mis Rutas</h4>
            </div>
            <div class="btn-group mt-3">
                <button class="btn btn-success" onclick="mostrarTodasLasRutas(true)">
                    <i class="fa-solid fa-bus-simple me-2"></i> Mostrar todas
                </button>
                <button class="btn btn-danger" onclick="ocultarTodasLasRutas()">
                    <i class="fa-solid fa-ban me-2"></i> Ocultar todas
                </button>
            </div>
            <div id="lista-mis-rutas" class="d-flex flex-column gap-2 mt-3"></div>
        </div>
    `;
    if (rutasSupabase.length > 0) {
        rutasSupabase.forEach((ruta) => {
            crearBotonRutaSupabase(ruta, true);
        });
        document.getElementById("lista-mis-rutas").classList.remove("d-none");
    }
}

function mostrarRutas(sidebar) {
    sidebar.innerHTML = `
        <div class="d-flex flex-column p-3 h-100 overflow-auto">
            <div class="d-flex justify-content-start align-items-center gap-2">
                <button class="close-btn btn btn-outline-secondary bg-transparent border-0 fs-3 p-0 d-flex d-md-none" onclick="abrirMenuMovil()">
                    <i class="fa-solid fa-circle-arrow-left"></i>
                </button>
                <h4 class="fw-bold m-0">Rutas</h4>
            </div>
            <div class="btn-group my-3">
                <button class="btn btn-success" onclick="mostrarTodasLasRutas()">
                    <i class="fa-solid fa-bus-simple me-2"></i> Mostrar todas
                </button>
                <button class="btn btn-danger" onclick="ocultarTodasLasRutas()">
                    <i class="fa-solid fa-ban me-2"></i> Ocultar todas
                </button>
            </div>
            <div id="rutas-supabase" class="d-flex flex-column gap-2 d-none mb-2"></div>
            <div id="lista-rutas" class="d-flex flex-column gap-2"></div>
        </div>
    `;
    rutas.forEach((ruta) => crearBotonRuta(ruta));
    if (rutasSupabase.length > 0) {
        rutasSupabase.forEach((ruta) => {
            if (ruta["activo"] === false) return;
            crearBotonRutaSupabase(ruta);
        });
        document.getElementById("rutas-supabase").classList.remove("d-none");
    }
}

function cerrarDetallesRuta() {
    const sidebar = document.getElementById("sidebar-content");
    sidebar.classList.remove("show");
    sidebar.removeAttribute("data-abierto");
}

function tieneModoCreacion() {
    return localStorage.getItem("modoCreacion") === "ruta";
}

function mostrarDetallesRuta(ruta, supabase = false) {
    console.log("Mostrando detalles de la ruta:", ruta);
    const sidebar = document.getElementById("sidebar-content");
    if (!sidebar) return;

    if (tieneModoCreacion()) return;

    let imagen = null;
    // Imagen con respaldo
    if (supabase) {
        imagen = ruta["imagen"] || "/icon.png";
    } else {
        imagen = ruta.archivos?.imagen || "/icon.png";
    }

    // Horarios
    let horarioLunes = null;
    let horarioSabado = null;
    if (supabase) {
        let horarios = ruta["horario"];
        if (horarios) {
        horarioLunes = horarios["lunes_viernes"] || "No disponible";
        horarioSabado = horarios["sabado_domingo"] || "No disponible";
        } else {
            horarioLunes = "No disponible";
            horarioSabado = "No disponible";
        }
    } else {
        horarioLunes = ruta.horario?.lunes || "No disponible";
        horarioSabado = ruta.horario?.sabado || ruta.horario?.domingo || "No disponible";
    }

    // Nombre
    let nombre = null;
    if (supabase) {
        nombre = ruta["nombre"] || "Ruta sin nombre";
    } else {
        nombre = ruta.nombre || "Ruta sin nombre";
    }

    // Color fijo azul
    const colorFijo = "#0d2e52";
    const colorFondo = "#f9f9fb";
    const sombra = "0 4px 20px rgba(0, 0, 0, 0.1)";

    // Inicializa alertas si no existen
    if (!ruta.alertas) ruta.alertas = [];

    // Crea el sidebar
    sidebar.innerHTML = `
        <div class="d-flex flex-column h-100 overflow-auto" 
            style="max-width: 22rem; background: ${colorFondo}; border-left: 1px solid #ddd; box-shadow: ${sombra}; border-radius: 12px 0 0 12px;">
        
        <!-- Imagen de cabecera -->
        <div class="position-relative" style="height: 12rem; overflow: hidden; border-radius: 12px 12px 0 0;">
            <img src="${imagen}" alt="${nombre}" 
                style="width: 100%; height: 100%; object-fit: cover; filter: brightness(0.6);">
            <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
            <h5 style="color: white; font-weight: bold; text-align: center; text-shadow: 0 2px 8px rgba(0,0,0,0.6); padding: 0 10px;">${nombre}</h5>
            </div>
            <button class="btn bg-transparent border-0 position-absolute p-0" 
                    style="top: 0.6rem; right: 0.8rem; color: white;" 
                    onclick="cerrarDetallesRuta()">
            <i class="fa-solid fa-xmark" style="font-size: 1.6rem; text-shadow: 0 0 8px black;"></i>
            </button>
        </div>

        <!-- Contenido -->
        <div id="detalles-ruta" class="p-3" style="flex-grow: 1; display: flex; flex-direction: column; gap: 1rem;">
            
            <!-- Horario -->
            <div>
            <h6 class="fw-bold mb-2" style="color: ${colorFijo};"><i class="fa-solid fa-clock me-2"></i>Horario</h6>
            <div class="p-2 rounded" style="background: white; border: 1px solid #eee; box-shadow: ${sombra}; color: ${colorFijo};">
                <p class="mb-1"><strong>Lunes a Viernes:</strong> ${horarioLunes}</p>
                <p class="mb-0"><strong>Sábado y Domingo:</strong> ${horarioSabado}</p>
            </div>
            </div>

            <!-- Alertas -->
            <div>
            <h6 class="fw-bold mb-2" style="color: ${colorFijo};"><i class="fa-solid fa-triangle-exclamation me-2"></i>Alertas</h6>
            
            <!-- Contenedor de alertas existentes -->
            <div id="alertaContainer" class="d-flex flex-column gap-2 mb-2"></div>
            
            <!-- Botón para agregar alerta -->
            <button id="btnAgregarAlerta" class="btn btn-primary w-100">Agregar alerta</button>
            </div>

            <!-- Editar ruta -->
            <button id="btnEditarRuta" class="btn btn-success w-100 d-none" type="button">
            <i class="fa-solid fa-pencil-alt me-1"></i> Editar ruta
            </button>

            <!-- Eliminar ruta -->
            <button id="btnEliminarRuta" class="btn btn-danger w-100 d-none" type="button">
            <i class="fa-solid fa-trash me-1"></i> Eliminar ruta
            </button>

            <div class="mt-auto text-center">
            <span style="display:inline-block; background:${colorFijo}; width:60%; height:5px; border-radius:4px;"></span>
            <p class="text-muted mt-2" style="font-size:0.85rem; color:${colorFijo}">Ruta destacada de Xalapa</p>
            </div>

        </div>
        </div>
    `;
    document.getElementById("btnEditarRuta").addEventListener("click", editarRuta);
    document.getElementById("btnEliminarRuta").addEventListener("click", eliminarRuta);

    if (supabase) rutaEnEdicion = ruta;
    if (supabase) document.getElementById("btnEditarRuta").classList.remove("d-none");
    if (supabase) document.getElementById("btnEliminarRuta").classList.remove("d-none");

    sidebar.classList.add("show");

    // ======= ALERTAS =======
    const alertaContainer = document.getElementById("alertaContainer");

    // Función para renderizar alertas
    function renderAlertas() {
        alertaContainer.innerHTML = "";
        ruta.alertas.forEach((tipo, index) => {
        const div = document.createElement("div");
        div.className = "d-flex align-items-center justify-content-between gap-2 p-2 rounded border";
        div.style.background = "#fff5f5";
        div.style.border = "1px solid #f0dede";

        const icono = tipo === "Tráfico" ? "fa-car" :
                        tipo === "Accidente" ? "fa-car-burst" : "fa-person-digging";
        const colorIcono = tipo === "Tráfico" ? "text-danger" :
                            tipo === "Accidente" ? "text-warning" : "text-primary";

        div.innerHTML = `
            <div class="d-flex align-items-center gap-2">
            <i class="fa-solid ${icono} ${colorIcono}"></i> ${tipo}
            </div>
            <button class="btn btn-sm btn-outline-secondary"><i class="fa-solid fa-trash"></i></button>
        `;

        // Quitar alerta al hacer click en el basurero
        div.querySelector("button").onclick = () => {
            ruta.alertas.splice(index, 1);
            renderAlertas();
        };

        alertaContainer.appendChild(div);
        });
    }

    renderAlertas();

    // Botón agregar alerta
    const btnAgregarAlerta = document.getElementById("btnAgregarAlerta");
    btnAgregarAlerta.onclick = () => {
        // Evitar que se duplique el menú
        if (document.getElementById("miniMenuAlertas")) return;

        // Crear mini menú dentro del sidebar
        const menu = document.createElement("div");
        menu.id = "miniMenuAlertas";
        menu.style.background = "#ffffff";
        menu.style.border = "1px solid #ddd";
        menu.style.borderRadius = "10px";
        menu.style.padding = "8px";
        menu.style.marginTop = "5px";
        menu.style.boxShadow = sombra;

        const opciones = [
        { tipo: "Tráfico", icono: "fa-car", color: "text-danger" },
        { tipo: "Accidente", icono: "fa-car-burst", color: "text-warning" },
        { tipo: "Construcción", icono: "fa-person-digging", color: "text-primary" }
        ];

        opciones.forEach(op => {
        const boton = document.createElement("button");
        boton.className = `btn btn-light w-100 text-start d-flex align-items-center gap-2 mb-1`;
        boton.innerHTML = `<i class="fa-solid ${op.icono} ${op.color}"></i> ${op.tipo}`;
        boton.onclick = () => {
            if (!ruta.alertas.includes(op.tipo)) ruta.alertas.push(op.tipo);
            renderAlertas();
            menu.remove();
        };
        menu.appendChild(boton);
        });

        btnAgregarAlerta.insertAdjacentElement("afterend", menu);
    };
}

function mostrarFavoritos(sidebar) {
    sidebar.innerHTML = `
        <div class="d-flex flex-column p-3 bg-white" id="lista-favoritos">
            <div class="d-flex justify-content-start align-items-center gap-2">
                <button id="btn-menu-movil-fav" class="close-btn btn btn-outline-secondary bg-transparent border-0 fs-3 p-0 d-flex d-md-none">
                    <i class="fa-solid fa-circle-arrow-left"></i>
                </button>
                <h4 class="fw-bold m-0">Rutas Favoritas</h4>
            </div>
            <div id="favoritos" class="d-flex flex-column gap-2 mt-3"></div>
            <button id="btn-limpiar-fav" class="btn btn-warning mt-2">
                <i class="fa-solid fa-flag"></i> Limpiar destino
            </button>
        </div>
    `;
    document.getElementById("btn-menu-movil-fav").addEventListener("click", abrirMenuMovil);
    document.getElementById("btn-limpiar-fav").addEventListener("click", limpiarDestino);
    verFavoritos();
}

async function mostrarCrearRutas(sidebar) {
    const crear = document.getElementById("crear-rutas");
    sidebar.innerHTML = crear.innerHTML;
    localStorage.setItem("admin", "true");
    localStorage.setItem("modoCreacion", "ruta");
    modoCreacionActivo = true;
    marcadores.forEach(m => map.removeLayer(m));
    marcadores = [];
    rutasDibujadas.forEach(r => map.removeLayer(r));
    rutasDibujadas = [];
    lineas.forEach(l => map.removeLayer(l));
    lineas = [];
    paradas.forEach(p => map.removeLayer(p));
    paradas = [];
}

// ---------------- Funciones adicionales ----------------
function limpiarFormulario() {
    document.getElementById("form-ruta").reset();
    limpiarRuta();
    limpiarParadas();
}

/**
 * Obtiene los horarios del formulario y los formatea en un objeto.
 * @returns {object} El objeto de horario para la base de datos.
 */
function obtenerHorarios() {
    const inicioLV = document.getElementById('hora-inicio-lv').value;
    const finLV = document.getElementById('hora-fin-lv').value;
    const inicioSD = document.getElementById('hora-inicio-sd').value;
    const finSD = document.getElementById('hora-fin-sd').value;

    return {
        lunes_viernes: (inicioLV && finLV) ? `${inicioLV} - ${finLV}` : null,
        sabado_domingo: (inicioSD && finSD) ? `${inicioSD} - ${finSD}` : null
    };
}

/**
 * Recopila todos los datos del formulario, los procesa y los envía al backend para guardarlos en la base de datos.
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
            
            // --- Procesamiento de la RUTA (la pestaña "Ruta" se considera "ida") ---
            "ruta-color": document.getElementById('color-ruta').value,
            "ruta-puntos": puntosCrearRuta,
            "ruta": await obtenerGeometriaRuta(puntosCrearRuta), // Llama a ORS para la geometría

            // Dejamos los campos de 'vuelta' como null, ya que el form no los tiene
            "ruta-ida": null,
            "ruta-ida-color": null,
            "ruta-ida-puntos": null,
            "ruta-vuelta": null,
            "ruta-vuelta-color": null,
            "ruta-vuelta-puntos": null,

            // La imagen se manejará por separado si es necesario, o se puede incluir la URL aquí.
            // Por ahora, la dejamos como null.
            imagen: null,
            actualizado: new Date().toISOString()
        };

        // --- 4. ENVÍO AL BACKEND ---
        let response;
        if (rutaEnEdicion) {
            // --- MODO ACTUALIZACIÓN ---
            console.log(`Actualizando ruta con ID: ${rutaEnEdicion.id}`);
            let url = `http://localhost:3000/api/actualizar-ruta/${rutaEnEdicion.id}`; // Añadir el ID a la URL
            
            response = await fetch(url, {
                method: 'PUT', // o 'PATCH'
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosParaGuardar)
            });
        } else {
            // --- MODO CREACIÓN ---
            console.log("Creando nueva ruta...");
            response = await fetch('http://localhost:3000/api/agregar-ruta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosParaGuardar)
            });
        }

        const resultado = await response.json();

        if (!response.ok) {
            // Si el servidor devuelve un error, lo mostramos
            throw new Error(resultado.details || 'Error desconocido del servidor');
        }

        // --- 5. ÉXITO ---
        Swal.fire({
            icon: 'success',
            title: `¡Ruta ${rutaEnEdicion ? 'Actualizada' : 'Guardada'}!`,
            text: `La ruta se ha ${rutaEnEdicion ? 'actualizado' : 'guardado'} correctamente.`,
        });

        // Opcional: Limpiar todo el formulario después de guardar
        limpiarFormulario();

        obtenerRutas(); // Refresca las rutas en el mapa y sidebar

    } catch (error) {
        // --- 6. MANEJO DE ERRORES ---
        console.error('Error al guardar la ruta:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error al Guardar',
            text: `No se pudo guardar la ruta. Motivo: ${error.message}`
        });
    } finally {
        // --- 7. RESTAURAR BOTÓN ---
        botonGuardar.disabled = false;
        botonGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk me-1"></i> Guardar ruta';
    }
}

// Drag & Drop para lista de puntos
const lista = document.getElementById("lista-puntos");
Sortable.create(lista, {
    animation: 150,
    onEnd: function (evt) {
        const movedMarker = marcadores.splice(evt.oldIndex, 1)[0];
        const movedPoint = puntosRuta.splice(evt.oldIndex, 1)[0];
        marcadores.splice(evt.newIndex, 0, movedMarker);
        puntosRuta.splice(evt.newIndex, 0, movedPoint);
        reindexar();
    }
});

function filtrarRutas() {
    const input = document.getElementById("buscar-ruta");
    const query = input.value.toLowerCase();
    const lista = document.getElementById("resultados-busqueda");
    const limpiar = document.getElementById("btn-limpiar");

    lista.innerHTML = "";
    limpiar.classList.add("d-none");

    if (input.value === "" || input === null || query === null || query === "") {
        return;
    }

    // Mostrar todas calles que contengan el texto ingresado
    buscarDireccion(input, query, lista, limpiar);
}

function buscarDireccion(input, query, lista, limpiar) {
    if (retrasoBusqueda) clearTimeout(retrasoBusqueda);

    retrasoBusqueda = setTimeout(() => {
        if (input.value === "" || input === null || query === null || query === "") {
            return;
        }
        lista.classList.remove("d-none");
        limpiar.classList.remove("d-none");

        const noRes = document.createElement("div");
        noRes.className = "text-muted text-center py-3 border border-secondary-subtle border-bottom-0 border-start-0 border-end-0 w-100 gradiente-inverso";
        lista.appendChild(noRes);

        console.log("Buscando dirección.");

        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&viewbox=${areaXalapa}&bounded=1`)
            .then(res => res.json())
            .then(data => {
                lista.innerHTML = "";

                if (data.length === 0) {
                    const noResultados = document.createElement("div");
                    noResultados.className = "text-muted text-center py-2 border border-secondary-subtle border-bottom-0 border-start-0 border-end-0 w-100";
                    noResultados.style.fontSize = "0.875rem";
                    noResultados.textContent = "No se encontró la dirección.";
                    lista.appendChild(noResultados);
                    return;
                }

                lista.classList.remove("d-none");
                limpiar.classList.remove("d-none");

                // guardamos los resultados actuales
                ultimoResultado = data;

                data.forEach(item => {
                    const btn = document.createElement("button");
                    btn.className = "btn btn-sm btn-outline-secondary rounded-0 border-secondary-subtle border-start-0 border-end-0 border-bottom-0 w-100 py-2 text-start";
                    btn.style.fontSize = "0.875rem";
                    btn.innerHTML = `<i class="fa-solid fa-location-dot me-1"></i> ${item.display_name}`;

                    btn.addEventListener("click", () => {
                        establecerDestino(item.lat, item.lon);

                        lista.classList.add("d-none");
                        input.value = item.display_name;
                        guardarEnHistorial(item);
                    });

                    lista.appendChild(btn);
                });

                // mostrar historial si existe
                mostrarHistorial(lista, input);
            })
            .catch(err => console.error("Error en búsqueda:", err));
    }, tiempoBusqueda);
}

function guardarEnHistorial(item) {
    // Evita duplicados (mismo nombre)
    historialBusquedas = historialBusquedas.filter(h => h.display_name !== item.display_name);

    // Agrega al inicio
    historialBusquedas.unshift(item);

    // Limita a máximo
    if (historialBusquedas.length > limiteHistorial) {
        historialBusquedas.pop();
    }

    // Guarda en localStorage
    localStorage.setItem("historialBusquedas", JSON.stringify(historialBusquedas));
}

function mostrarHistorial(lista, input) {
    if (historialBusquedas.length === 0) return;

    const titulo = document.createElement("div");
    titulo.className = "fw-bold text-secondary p-2 border border-secondary-subtle border-start-0 border-end-0 border-bottom-0 w-100";
    titulo.style.fontSize = "0.8rem";
    titulo.textContent = "Últimas búsquedas:";
    lista.appendChild(titulo);

    historialBusquedas.forEach(item => {
        const btn = document.createElement("button");
        btn.className = "btn btn-sm btn-outline-secondary rounded-0 border-secondary-subtle border-start-0 border-end-0 border-bottom-0 w-100 py-2 text-start";
        btn.style.fontSize = "0.875rem";
        btn.innerHTML = `<i class="fa-solid fa-clock me-1"></i> ${item.display_name}`;

        btn.addEventListener("click", () => {
            establecerDestino(item.lat, item.lon);

            lista.classList.add("d-none");
            input.value = item.display_name;
            guardarEnHistorial(item);
        });

        lista.appendChild(btn);
    });
}

function reMostrarResultados() {
    const input = document.getElementById("buscar-ruta");
    const lista = document.getElementById("resultados-busqueda");
    const limpiar = document.getElementById("btn-limpiar");

    input.addEventListener("focus", () => {
        // si no hay historial no se muestra nada
        if (historialBusquedas.length === 0) return;

        lista.innerHTML = "";
        lista.classList.remove("d-none");
        limpiar.classList.remove("d-none");

        mostrarHistorial(lista, input);
    });

    document.addEventListener("click", (e) => {
        if (!lista.contains(e.target) && e.target !== input) {
            lista.classList.add("d-none");
        }
    });
}

function limpiarBusqueda() {
    document.getElementById('buscar-ruta').value = '';
    document.getElementById('resultados-busqueda').innerHTML = '';
    document.getElementById('resultados-busqueda').classList.add('d-none');
    document.getElementById('btn-limpiar').classList.add('d-none');
}

function seleccionarRuta(nombre) {
    document.getElementById('buscar-ruta').value = nombre;
    document.getElementById('dropdown-rutas').style.display = 'none';
}

document.addEventListener("DOMContentLoaded", () => {
  const busqueda = document.getElementById("busqueda");
  const resultados = document.getElementById("resultados-busqueda");
  const sidebarContent = document.getElementById("sidebar-content");
  const menuMovil = document.getElementById("menu-movil");

  // Evitar que los clics y scrolls se propaguen al mapa
  if (busqueda) {
    L.DomEvent.disableClickPropagation(busqueda);
    L.DomEvent.disableScrollPropagation(busqueda);
  }
  if (resultados) {
    L.DomEvent.disableClickPropagation(resultados);
    L.DomEvent.disableScrollPropagation(resultados);
  }
  if (sidebarContent) {
    L.DomEvent.disableClickPropagation(sidebarContent);
    L.DomEvent.disableScrollPropagation(sidebarContent);
  }
  if (menuMovil) {
    L.DomEvent.disableClickPropagation(menuMovil);
    L.DomEvent.disableScrollPropagation(menuMovil);
  }
});


function actualizarBotonLimpiar() {
    const buscarRuta = document.getElementById("buscar-ruta");
    const btnLimpiar = document.getElementById("btn-limpiar");
    btnLimpiar.classList.toggle("d-none", !buscarRuta.value);
    btnLimpiar.classList.toggle("d-flex", !!buscarRuta.value);
}

function configurarItemsMenu() {
    const items = document.querySelectorAll('.menu-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            items.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
    const itemsMovil = document.querySelectorAll('.menu-item-movil');
    itemsMovil.forEach(item => {
        item.addEventListener('click', () => {
            itemsMovil.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            cerrarMenuMovil();
        });
    });
    items[0].classList.add('active');
    itemsMovil[0].classList.add('active');
}

function abrirMenuMovil() {
    cerrarDetallesRuta();

    const contenedor = document.getElementById("contenedor-movil");
    contenedor.classList.add("active");
}

function cerrarMenuMovil() {
    const contenedor = document.getElementById("contenedor-movil");
    contenedor.classList.remove("active");
}

function cargarNuevaImagen(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const nuevaImagen = e.target.result;
        document.getElementById("imagen-principal").src = nuevaImagen;
        document.getElementById("fondo-imagen").src = nuevaImagen;
    };
    reader.readAsDataURL(file);
}

function mostrarTodasLasRutas(supabase = false) {
    ocultarTodasLasRutas();
    if (supabase) {
        rutasSupabase.forEach((ruta) => crearRutaSupabase(ruta));
    } else {
        rutas.forEach((ruta) => crearRuta(ruta));
        rutasSupabase.forEach((ruta) => crearRutaSupabase(ruta));
    }
    cerrarDetallesRuta();
}

function ocultarTodasLasRutas() {
    rutasDibujadas.forEach((r) => map.removeLayer(r));
    rutasDibujadas = [];
    lineas = [];
    paradas = [];
    cerrarDetallesRuta();
}

document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.querySelector('.dropdown-item[onclick="logout()"]');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault(); // Previene cualquier comportamiento por defecto
            logout(); // Llama a tu función logout que ya existe
        });
    }
});

function adminModoRuta() {
    localStorage.setItem("modoCreacion", "ruta");
}

function adminModoParadas() {
    localStorage.setItem("modoCreacion", "parada");
}

async function obtenerRutas() {
    try {
        // Convertimos la respuesta a JSON
        rutasSupabase = await obtenerRutasDesdeSupabase();
        console.log("Cargadas las rutas:", rutasSupabase);

    } catch (error) {
        console.error("Error al obtener las rutas:", error);
        // Muestra un error al usuario de forma amigable
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Hubo un problema al cargar las rutas. Inténtalo de nuevo más tarde.'
        });
    }
}

function editarRuta() {
    if (!rutaEnEdicion) {
        console.error("No hay ninguna ruta seleccionada para editar.");
        return;
    }

    // 1. Cambia la vista del sidebar al formulario de creación/edición
    actualizarSidebar('crear');

    // 2. Espera un breve momento para que el DOM del formulario se renderice
    setTimeout(() => {
        llenarFormularioConRuta(rutaEnEdicion);
    }, 100); // 100ms suele ser suficiente
}

/**
 * Muestra una alerta de confirmación antes de eliminar la ruta.
 * Llama a la función de borrado si el usuario confirma.
 */
function eliminarRuta() {
    if (!rutaEnEdicion) {
        console.error("No hay ninguna ruta seleccionada para eliminar.");
        return;
    }
    const nombreRuta = rutaEnEdicion.nombre;
    Swal.fire({
        title: '¿Estás seguro?',
        text: `Esta acción no se puede deshacer. Se eliminará permanentemente la ruta "${nombreRuta}".`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, ¡eliminar!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            // Si el usuario confirma, procede con la eliminación
            eliminarRutaEnDB(rutaEnEdicion.id);
        }
    });
}

/**
 * Envía la petición DELETE al backend para eliminar la ruta de la base de datos.
 * @param {number} id - El ID de la ruta a eliminar.
 */
async function eliminarRutaEnDB(id) {
    try {
        const response = await fetch(`http://localhost:3000/api/eliminar-ruta/${id}`, {
            method: 'DELETE'
        });
        const resultado = await response.json();
        if (!response.ok) {
            throw new Error(resultado.details || 'Error del servidor');
        }
        Swal.fire(
            '¡Eliminada!',
            resultado.message,
            'success'
        );
        cerrarDetallesRuta();
        ocultarTodasLasRutas();
        obtenerRutas();
    } catch (error) {
        console.error('Error al eliminar la ruta:', error);
        Swal.fire(
            'Error',
            `No se pudo eliminar la ruta. Motivo: ${error.message}`,
            'error'
        );
    }
}

/**
 * Llena todos los campos del formulario con los datos de un objeto de ruta.
 * @param {object} ruta - El objeto de la ruta a editar.
 */
function llenarFormularioConRuta(ruta) {
    // --- Llenar campos de texto y checkboxes ---
    document.getElementById('nombre-ruta').value = ruta.nombre || '';
    document.getElementById('mujer-segura').checked = ruta['mujer-segura'] === true;
    document.getElementById('ruta-activada').checked = ruta.activo === true;
    
    // --- Llenar horarios (parseando el string) ---
    if (ruta.horario?.lunes_viernes) {
        const [inicio, fin] = ruta.horario.lunes_viernes.split(' - ');
        document.getElementById('hora-inicio-lv').value = inicio || '';
        document.getElementById('hora-fin-lv').value = fin || '';
    }
    if (ruta.horario?.sabado_domingo) {
        const [inicio, fin] = ruta.horario.sabado_domingo.split(' - ');
        document.getElementById('hora-inicio-sd').value = inicio || '';
        document.getElementById('hora-fin-sd').value = fin || '';
    }

    // --- Llenar imagen y color ---
    document.getElementById('imagen-principal').src = ruta.imagen || 'https://cdn-icons-png.freepik.com/512/13434/13434886.png';
    document.getElementById('fondo-imagen').src = ruta.imagen || '';
    // Asumimos que la pestaña "Ruta" corresponde a "ida"
    document.getElementById('color-ruta').value = ruta['ruta-ida-color'] || '#ff0000';

    // --- ¡CRÍTICO! Limpiar y dibujar los puntos y paradas existentes ---
    limpiarRuta();
    limpiarParadas();

    // Dibujar los puntos de la ruta
    if (ruta['ruta-puntos'] && Array.isArray(ruta['ruta-puntos'])) {
        ruta['ruta-puntos'].forEach(punto => {
            // Tu función espera (lat, lng), pero la DB guarda [lng, lat]
            agregarPuntoRuta(punto[1], punto[0]);
        });
    }

    // Dibujar las paradas
    if (ruta.paradas && Array.isArray(ruta.paradas)) {
        ruta.paradas.forEach(parada => {
            // Tu función espera (lat, lng), pero la DB guarda [lng, lat]
            agregarPuntoParada(parada.coords[1], parada.coords[0], parada.id);
        });
    }

    // Previsualizar la ruta
    previsualizarRuta();

    // Cambiar texto del botón de guardar para reflejar la acción de edición
    const botonGuardar = document.querySelector('button[onclick="guardarRuta()"]');
    if(botonGuardar) {
        botonGuardar.innerHTML = '<i class="fa-solid fa-sync-alt me-1"></i> Actualizar ruta';
    }
}

/**
 * Procesa el array de rutas y crea una lista unificada de todas las paradas.
 * Llama a esta función después de cargar tus rutas desde Supabase.
 */
async function procesarParadasGlobales() {
    todasLasParadas = []; // Limpia el array antes de llenarlo

    for (const ruta of rutas) {
        const archivos = ruta.archivos;
        if (archivos.ruta && archivos.paradas) {
            try {
                const paradasArray = await cargarParadas(archivos.paradas);
                paradasArray.forEach(paradaCoords => {
                    const lat = paradaCoords[0];
                    const lng = paradaCoords[1];
                    todasLasParadas.push({
                        ruta: ruta,
                        esSupabase: false,
                        latlng: L.latLng(lat, lng)
                    });
                });
            } catch (error) {
                console.error("Error al procesar las paradas locales:", error);
            }
        }
        if (archivos.ida && archivos["ida-paradas"]) {
            try {
                const paradasArray = await cargarParadas(archivos["ida-paradas"]);
                paradasArray.forEach(paradaCoords => {
                    const lat = paradaCoords[0];
                    const lng = paradaCoords[1];
                    todasLasParadas.push({
                        ruta: ruta,
                        esSupabase: false,
                        latlng: L.latLng(lat, lng)
                    });
                });
            } catch (error) {
                console.error("Error al procesar las paradas locales:", error);
            }
        }
        if (archivos.vuelta && archivos["vuelta-paradas"]) {
            try {
                const paradasArray = await cargarParadas(archivos["vuelta-paradas"]);
                paradasArray.forEach(paradaCoords => {
                    const lat = paradaCoords[0];
                    const lng = paradaCoords[1];
                    todasLasParadas.push({
                        ruta: ruta,
                        esSupabase: false,
                        latlng: L.latLng(lat, lng)
                    });
                });
            } catch (error) {
                console.error("Error al procesar las paradas locales:", error);
            }
        }
    };
    rutasSupabase.forEach(ruta => {
        if (ruta.paradas && Array.isArray(ruta.paradas)) {
            ruta.paradas.forEach(parada => {
                todasLasParadas.push({
                    ruta: ruta,
                    esSupabase: true,
                    latlng: L.latLng(parada.coords[1], parada.coords[0]) 
                });
            });
        }
    });
}

window.mostrarTodasLasRutas = mostrarTodasLasRutas;
window.ocultarTodasLasRutas = ocultarTodasLasRutas;

document.getElementById("btn-rutas").addEventListener("click", () => {
    actualizarSidebar('rutas')
});
document.getElementById("btn-favoritos").addEventListener("click", () => {
    actualizarSidebar('favoritos')
});
document.getElementById("btn-crear").addEventListener("click", () => {
    actualizarSidebar('crear')
});
document.getElementById("btn-creadas").addEventListener("click", () => {
    actualizarSidebar('mis-rutas')
});
document.getElementById("btn-rutas-movil").addEventListener("click", () => {
    actualizarSidebar('rutas')
});
document.getElementById("btn-favoritos-movil").addEventListener("click", () => {
    actualizarSidebar('favoritos')
});
document.getElementById("btn-crear-movil").addEventListener("click", () => {
    actualizarSidebar('crear')
});
document.getElementById("btn-creadas-movil").addEventListener("click", () => {
    actualizarSidebar('mis-rutas')
});
document.getElementById("perfil-logout").addEventListener("click", () => {
    cerrarSesion();
});
document.getElementById("perfil-logout-movil").addEventListener("click", () => {
    cerrarSesion();
});
document.getElementById("btn-menu-movil").addEventListener("click", () => {
    abrirMenuMovil();
});
document.getElementById("btn-cerrar-movil").addEventListener("click", () => {
    cerrarMenuMovil();
});
document.getElementById("buscar-ruta").addEventListener("input", () => {
    filtrarRutas();
});
document.getElementById("buscar-ruta").addEventListener("focus", () => {
    reMostrarResultados();
});
document.getElementById("btn-limpiar").addEventListener("click", () => {
    limpiarBusqueda();
});
document.getElementById("imagen-principal").addEventListener("click", () => {
    document.getElementById("input-imagen").click();
});
document.getElementById("input-imagen").addEventListener("change", (event) => {
    cargarNuevaImagen(event);
});
document.getElementById("tab-ruta").addEventListener("click", () => {
    adminModoRuta();
});
document.getElementById("tab-paradas").addEventListener("click", () => {
    adminModoParadas();
});
document.getElementById("btn-prev-ruta").addEventListener("click", () => {
    previsualizarRuta();
});
document.getElementById("btn-limpiar-ruta").addEventListener("click", () => {
    limpiarRuta();
});
document.getElementById("btn-limpiar-paradas").addEventListener("click", () => {
    limpiarParadas();
});
document.getElementById("btn-guardar-ruta").addEventListener("click", () => {
    guardarRuta();
});