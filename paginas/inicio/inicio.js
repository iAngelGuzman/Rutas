// ---------------- Inicialización ----------------
(async function init() {
    configurarBienvenida();
    configurarTooltip();
    configurarItemsMenu();
    configurarAdmin();
    configurarSidebar();
    await cargarRutas();
})();

function configurarSidebar() {
    const sidebar = document.getElementById('sidebar-content');

    ['mousedown', 'mousemove', 'mouseup', 'click', 'dblclick', 'touchstart', 'touchmove', 'touchend'].forEach(evt => {
        sidebar.addEventListener(evt, function(e) {
            e.stopPropagation();  // evita que el evento llegue al mapa
        });
    });
}

// Variables globales
let rutas = [];

function configurarAdmin() {
    localStorage.setItem("admin", "false");
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
        locateBtn.href = "#";
        locateBtn.title = "Ver mi ubicación";
        L.DomEvent.on(locateBtn, "click", L.DomEvent.stop)
                  .on(locateBtn, "click", () => verMiUbicacion(locateBtn));
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
let rutasDibujadas = [];
let puntosRuta = [];
let marcadores = [];
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

const busIcon = L.divIcon({
    html: `<div class="d-flex justify-content-center align-items-center rounded-circle border border-2 border-white bg-primary" style="width:26px; height:26px;">
             <i class="fa-solid fa-bus-simple text-white"></i>
           </div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
});

const destinoIcon = L.divIcon({
    html: `<div class="d-flex justify-content-center align-items-center rounded-circle border border-3 border-white bg-success shadow-lg" style="width:32px; height:32px;">
             <i class="fa-solid fa-flag text-white"></i>
           </div>`,
    className: 'marcador-destino',
    iconSize: [34, 34],
    iconAnchor: [17, 17]
});

const paradaIcon = L.divIcon({
    html: `<div class="d-flex justify-content-center align-items-center rounded-circle border border-3 border-white bg-primary shadow-lg" style="width:30px; height:30px; cursor: pointer;">
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

function cargarRuta(ruta) {
    // limpiarDestino();
    crearRuta(ruta);
    rutaSeleccionada = ruta;
    configurarSeleccionDestino();
    mostrarMensajeTemporal(`✅ Ruta "${ruta.nombre}" cargada. Haz clic en una parada para seleccionar destino.`);
    mostrarDetallesRuta(ruta);
}

// ---------------- Funciones de rutas ----------------
function crearBotonRuta(ruta) {
    const lista = document.getElementById("lista-rutas");
    const contenedor = document.createElement("div");
    contenedor.className = "d-flex align-items-center justify-content-between";

    // Botón principal de la ruta - CON COLOR MORADO PARA MUJER SEGURA
    const btn = document.createElement("button");
    btn.style.fontSize = ".875rem";
    
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


function guardarFavorito(ruta) {
    let favoritos = JSON.parse(localStorage.getItem("rutasFavoritas")) || [];
    if (!favoritos.some(fav => fav.nombre === ruta.nombre)) {
        favoritos.push(ruta);
        localStorage.setItem("rutasFavoritas", JSON.stringify(favoritos));
        alert(`Ruta "${ruta.nombre}" guardada en favoritos.`);
    } else {
        alert(`La ruta "${ruta.nombre}" ya está en favoritos.`);
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
            const btn = document.createElement("button");
            btn.className = "btn btn-outline-primary w-100 text-start";
            btn.innerHTML = `<i class="fa-solid fa-bus-simple me-2"></i> ${ruta.nombre}`;
            btn.onclick = () => {
                limpiarDestino();
                crearRuta(ruta);
                rutaSeleccionada = ruta;
                configurarSeleccionDestino();
            };
            lista.appendChild(btn);
        });
    }
}

function dibujarRuta(ruta, lineas, paradas = []) {
    let elementosRuta = [];

    // Limpiar marcadores excepto el destino
    marcadores.forEach((m) => {
        if (m !== marcadorDestino) {
            map.removeLayer(m);
        }
    });
    marcadores = marcadores.filter(m => m === marcadorDestino);
    puntosRuta = [];

    // Limpiar rutas dibujadas excepto el destino
    rutasDibujadas.forEach((r) => {
        if (r !== marcadorDestino) {
            map.removeLayer(r);
        }
    });
    rutasDibujadas = rutasDibujadas.filter(r => r === marcadorDestino);

    document.getElementById("lista-puntos").innerHTML = "";

    // Dibujar líneas
    lineas.forEach(l => {
        const polyline = L.polyline(l.coords, {
            color: l.color,
            weight: 5,
            dashArray: l.estilo === "dashed" ? "8, 6" : null
        }).addTo(map);
        rutasDibujadas.push(polyline);

        polyline.on("click", function (e) {
            L.DomEvent.stopPropagation(e);
            mostrarDetallesRuta(ruta);
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

    // ✅ Centrar mapa en la ruta y destino (si existe)
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
        let lineas = [];
        let paradas = [];

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
    return data.features.map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]]);
}

// ---------------- Funciones de administración ----------------
function swap(arr, i, j) {
    [arr[i], arr[j]] = [arr[j], arr[i]];
}

function agregarPunto(lat, lng) {
    puntosRuta.push([lng, lat]);
    const index = puntosRuta.length;

    const marker = L.marker([lat, lng], { draggable: true })
        .addTo(map)
        .bindTooltip(`${index}`, {
            permanent: true,
            direction: "top",
            className: "fw-bold text-white bg-danger border-0 shadow rounded px-2 opacity-100",
            offset: [-14.5, 14],
        });

    marcadores.push(marker);

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

    marker.on("dragend", (event) => {
        const newPos = event.target.getLatLng();
        const i = marcadores.indexOf(marker);
        if (i !== -1) {
            puntosRuta[i] = [newPos.lng, newPos.lat];
            input.value = `[${newPos.lat.toFixed(6)}, ${newPos.lng.toFixed(6)}]`;
        }
    });

    marker.on("contextmenu", () => eliminarPunto());
    deleteBtn.addEventListener("click", eliminarPunto);

    function eliminarPunto() {
        const i = marcadores.indexOf(marker);
        if (i !== -1) {
            map.removeLayer(marker);
            marcadores.splice(i, 1);
            puntosRuta.splice(i, 1);
            li.remove();
            reindexar();
        }
    }
}

function reindexar() {
    document.querySelectorAll("#lista-puntos li").forEach((li, index) => {
        li.querySelector("span").innerText = index + 1;
        marcadores[index].setTooltipContent(`${index + 1}`);
    });
}

// ---------------- Eventos del mapa ----------------
map.on("click", (e) => {
    if (localStorage.getItem("admin") === "true") {
        const { lat, lng } = e.latlng;
        agregarPunto(lat, lng);
    } else {
        const { lat, lng } = e.latlng;
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

    marcadorDestino.setZIndexOffset(1200);

    // Popup con menú de opciones
    marcadorDestino.bindPopup(`
        <div class="list-group rounded-4 shadow">
          <button class="list-group-item list-group-item-action" onclick="verDetalles()"> 
            <i class="fa-solid fa-circle-info me-2"></i> Ver detalles 
          </button>
          <button class="list-group-item list-group-item-action" onclick="establecerRuta()"> 
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

function establecerRuta() {
    alert("Se estableció la ruta al destino");
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

function verMiUbicacion(btn) {
    const locateBtn = btn;
    locateBtn.classList.add("gradiente");
    map.locate({ setView: true, maxZoom: 17, watch: true });

    // Solo enganchamos UNA vez el evento
    if (!map._locationHandler) {
        map._locationHandler = true;

        map.on("locationfound", (e) => {
            const { latlng } = e;

            if (!popupUbicacion) {
                popupUbicacion = L.popup({
                    closeButton: false,
                    autoClose: true,
                    closeOnClick: true,
                    className: "popup-ubicacion"
                })
                    .setLatLng(latlng)
                    .setContent("¡Aquí estás!")
                    .openOn(map);

                // Cerrar automáticamente después de 2 segundos
                setTimeout(() => {
                    map.closePopup(popupUbicacion);
                    popupUbicacion = null; // opcional, para que pueda crearse de nuevo
                }, 2000);

            } else {
                popupUbicacion.setLatLng(latlng);
            }

            if (!marcadorUbicacion) {
                marcadorUbicacion = L.circle(latlng, {
                    radius: 14,
                    color: "blue",
                    opacity: 1,
                    weight: 1,
                    fillColor: "rgba(0, 0, 200, 1)",
                    fillOpacity: 1,
                }).addTo(map);
            } else {
                marcadorUbicacion.setLatLng(latlng);
            }

            if (!circuloUbicacion) {
                circuloUbicacion = L.circle(latlng, {
                    radius: 110,
                    color: "blue",
                    opacity: 0.4,
                    weight: 1,
                    fillColor: "rgba(0, 179, 255, 1)",
                    fillOpacity: 0.2,
                }).addTo(map);
            } else {
                circuloUbicacion.setLatLng(latlng);
            }

            if (!circuloPulsante) {
                circuloPulsante = L.circle(latlng, {
                    radius: 0,
                    color: "blue",
                    weight: 2,
                    fillColor: "rgba(0, 179, 255, 1)",
                    fillOpacity: 0.5,
                }).addTo(map);

                // Animación solo una vez
                if (!animando) {
                    animando = true;
                    animarCirculo();
                }
            } else {
                circuloPulsante.setLatLng(latlng);
            }

            // // Si hay un destino, iniciar monitoreo
            // if (marcadorDestino) {
            //     iniciarMonitoreoProximidad();
            // }
        });
    }
    locateBtn.classList.remove("gradiente");
}

function animarCirculo() {
    if (!circuloPulsante) return;

    const radioMax = 110;
    let radio = 0;
    let opacity = 0.5;

    function frame() {
        if (!circuloPulsante) return;

        radio += 1;
        opacity = Math.max(0, 0.5 * (1 - radio / radioMax));

        circuloPulsante.setRadius(radio);
        circuloPulsante.setStyle({
            fillOpacity: opacity,
            opacity: opacity
        });

        if (radio >= radioMax) {
            radio = 0;
            opacity = 0.5;
        }

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

async function cargarGenerarRutas() {
    try {
        const res = await fetch("/rutasGenerar.json");
        const data = await res.json();
        data.rutas.forEach((ruta) => crearBotonGenerarRuta(ruta));
    } catch (err) {
        console.error("Error cargando rutas.json:", err);
    }
}

function crearBotonGenerarRuta(ruta) {
    const lista = document.getElementById("generar-rutas");
    const contenedor = document.createElement("div");
    contenedor.className = "d-flex align-items-center gap-1";

    const btn = document.createElement("button");
    btn.className = "btn btn-secondary text-start w-100";

    const icono = document.createElement("i");
    icono.className = "fa-solid fa-bus-simple me-2";
    btn.appendChild(icono);
    btn.appendChild(document.createTextNode(ruta.nombre));

    btn.onclick = (e) => {
        e.preventDefault();
        document.getElementById("nombre-ruta").value = ruta.nombre;
        document.getElementById("color-ruta").value = ruta.color;
        document.getElementById("lista-puntos").innerHTML = "";
        puntosRuta = [];
        marcadores.forEach(m => map.removeLayer(m));
        marcadores = [];

        ruta.puntos.forEach(([lng, lat]) => {
            agregarPunto(lat, lng);
        });
    };

    const btnGen = document.createElement("button");
    btnGen.className = "btn btn-success";
    const iconoGen = document.createElement("i");
    iconoGen.className = "fa-solid fa-route";
    btnGen.appendChild(iconoGen);

    btnGen.onclick = (e) => {
        e.preventDefault();
        crearGenerarRuta(ruta.nombre, ruta.puntos, ruta.color);
    };

    contenedor.appendChild(btn);
    contenedor.appendChild(btnGen);
    lista.appendChild(contenedor);
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
function actualizarSidebar(clave) {
    const sidebar = document.getElementById("sidebar-content");
    if (!sidebar) return;

    if (sidebar.dataset.abierto === clave) {
        sidebar.classList.remove("show");
        sidebar.removeAttribute("data-abierto");
        if (clave === "crear") {
            localStorage.removeItem("admin");
        }
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
        default:
            sidebar.innerHTML = "";
            sidebar.removeAttribute("data-abierto");
            break;
    }

    sidebar.classList.add("show");
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
            <div id="lista-rutas" class="d-flex flex-column gap-2 mt-3"></div>
        </div>
    `;
    rutas.forEach((ruta) => crearBotonRuta(ruta));
}

function cerrarDetallesRuta() {
    const sidebar = document.getElementById("sidebar-content");
    sidebar.classList.remove("show");
    sidebar.removeAttribute("data-abierto");
}

function mostrarDetallesRuta(ruta) {
  const sidebar = document.getElementById("sidebar-content");
  if (!sidebar) return;

  // 🧠 Validar imagen, si no existe usar una genérica
  const imagen = ruta.archivos && ruta.archivos.imagen 
    ? ruta.archivos.imagen 
    : "/images/default.jpg"; // cambia esta ruta si tienes una imagen de respaldo

  // 🧠 Validar horario (por si no tiene)
  const horarioLunes = ruta.horario?.lunes || "No disponible";
  const horarioSabado = ruta.horario?.sabado || ruta.horario?.domingo || "No disponible";

  // 🧠 Validar nombre
  const nombre = ruta.nombre || "Ruta sin nombre";

  // 🧠 Mostrar información
  sidebar.innerHTML = `
    <div class="d-flex flex-column h-100 overflow-auto" style="max-width: 20rem;">
      <div class="d-grid bg-dark" style="width: 20rem; height: 12rem; position: relative;">
        <img src="${imagen}" alt="Logo" class="img-fluid" 
             style="width: 20rem; height: 12rem; object-fit: cover; grid-area: 1 / 1; filter: blur(2px) brightness(0.5);">
        <img src="${imagen}" alt="Logo" class="img-fluid" 
             style="width: 20rem; height: 12rem; object-fit: contain; grid-area: 1 / 1; z-index: 1;">
        <button class="btn btn-dark bg-transparent border-0 position-absolute p-0 end-0" 
                style="z-index: 2; margin-right: .84rem; margin-top: .6rem;" 
                onclick="cerrarDetallesRuta()">
          <i class="fa-solid fa-xmark" style="text-shadow: 0 0 10px black; font-size: 1.6rem;"></i>
        </button>
      </div>
      <div id="detalles-ruta" class="d-flex flex-column gap-2 p-3">
        <h5 class="fw-bold">${nombre}</h5>
        <hr />
        <h6 class="fw-bold mb-1"><i class="fa-solid fa-clock me-2"></i> Horario:</h6>
        <div>
          <p class="mb-1"><strong>Lunes a Viernes:</strong> ${horarioLunes}</p>
          <p class="mb-1"><strong>Sábado y Domingo:</strong> ${horarioSabado}</p>
        </div>
      </div>
    </div>
  `;

  sidebar.classList.add("show");
}


function mostrarFavoritos(sidebar) {
    sidebar.innerHTML = `
        <div class="d-flex flex-column p-3" id="lista-favoritos">
            <div class="d-flex justify-content-start align-items-center gap-2">
                <button class="close-btn btn btn-outline-secondary bg-transparent border-0 fs-3 p-0 d-flex d-md-none" onclick="abrirMenuMovil()">
                    <i class="fa-solid fa-circle-arrow-left"></i>
                </button>
                <h4 class="fw-bold m-0">Rutas Favoritas</h4>
            </div>
            <div id="favoritos" class="d-flex flex-column gap-2 mt-2"></div>
            <button class="btn btn-warning mt-2" onclick="limpiarDestino()">
                <i class="fa-solid fa-flag"></i> Limpiar destino
            </button>
        </div>
    `;
    verFavoritos();
}

async function mostrarCrearRutas(sidebar) {
    const crear = document.getElementById("crear-rutas");
    sidebar.innerHTML = crear.innerHTML;
    await cargarGenerarRutas();
    localStorage.setItem("admin", "true");
}

// ---------------- Funciones adicionales ----------------
function borrarLocalStorage() {
    if (confirm("¿Seguro que quieres borrar todas las rutas en cache?")) {
        localStorage.clear();
        alert("Cache borrada");
    }
}

function limpiarFormulario() {
    document.getElementById("form-ruta").reset();
    document.getElementById("lista-puntos").innerHTML = "";
    puntosRuta = [];
    marcadores.forEach(m => map.removeLayer(m));
    marcadores = [];
}

document.getElementById("form-ruta").addEventListener("submit", async (e) => {
    e.preventDefault();
    guardarRuta();
});

function guardarRuta() {
    const nombre = document.getElementById("nombre-ruta").value;
    const color = document.getElementById("color-ruta").value;

    const ruta = {
        nombre: nombre,
        color: color,
        puntos: puntosRuta
    };

    fetch("http://localhost:3000/guardar-ruta", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(ruta)
    })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
        })
        .catch(err => console.error(err));
}

async function crearGenerarRuta(nombre, puntos, color = "red") {
    try {
        const cache = localStorage.getItem(nombre);
        if (cache) {
            dibujarRuta2(JSON.parse(cache), color);
            return;
        }

        const res = await fetch("http://localhost:3000/directions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ nombre, puntos, color })
        });

        if (!res.ok) throw new Error("Error al generar ruta");

        const data = await res.json();
        const coords = data.features[0].geometry.coordinates;
        const latlngs = coords.map((c) => [c[1], c[0]]);

        localStorage.setItem(nombre, JSON.stringify(latlngs));
        dibujarRuta2(latlngs, color);
    } catch (err) {
        console.error("Error cargando ruta:", err);
    }
}

function dibujarRuta2(latlngs, color = "red") {
    rutasDibujadas.forEach((r) => map.removeLayer(r));
    rutasDibujadas = [];

    const polyline = L.polyline(latlngs, { color, weight: 5 }).addTo(map);
    rutasDibujadas.push(polyline);

    polyline.on('click', function () {
        map.removeLayer(polyline);
        rutasDibujadas = rutasDibujadas.filter(l => l !== polyline);
    });

    map.fitBounds(polyline.getBounds());
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

    // // Filtrar rutas
    // const resultados = rutas.filter(ruta =>
    //     ruta.nombre.toLowerCase().includes(query)
    // );

    // if (resultados.length > 0) {
    //     resultados.forEach(ruta => {
    //         const btn = document.createElement("button");
    //         btn.className = "btn btn-sm btn-outline-secondary rounded-0 border-secondary-subtle border-start-0 border-end-0 border-bottom-0 w-100 py-2 text-start";
    //         btn.style.fontSize = "0.875rem";
    //         btn.textContent = ruta.nombre;

    //         // Cuando el usuario hace clic en una ruta
    //         btn.addEventListener("click", () => {
    //             input.value = ruta.nombre;
    //             lista.classList.add("d-none");
    //             cargarRuta(ruta);
    //         });
    //         lista.appendChild(btn);
    //     });
    // } else {
    //     buscarDireccion(query);
    //     // Mostrar mensaje de no resultados
    //     const noRes = document.createElement("div");
    //     noRes.className = "text-muted text-center py-2 border border-secondary-subtle border-bottom-0 border-start-0 border-end-0 w-100";
    //     noRes.style.fontSize = "0.875rem";
    //     noRes.textContent = "No se encontraron rutas.";
    //     lista.appendChild(noRes);
    //     console.log("No se encontraron rutas.");
    // }
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
                        map.setView([item.lat, item.lon], 16);
                        L.marker([item.lat, item.lon])
                          .addTo(map)
                          .bindPopup(`<b>${item.display_name}</b>`)
                          .openPopup();

                        lista.classList.add("d-none");
                        input.value = item.display_name;
                        guardarEnHistorial(item);
                    });

                    lista.appendChild(btn);
                });

                // mostrar historial si existe
                mostrarHistorial(lista);
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

function mostrarHistorial(lista) {
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
            map.setView([item.lat, item.lon], 16);
            L.marker([item.lat, item.lon])
              .addTo(map)
              .bindPopup(`<b>${item.display_name}</b>`)
              .openPopup();

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

        mostrarHistorial(lista);
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