// ---------------- Inicialización ----------------
(async function init() {
    configurarBienvenida();
    configurarTooltip();
    configurarItemsMenu();
    configurarAdmin();
    await cargarRutas();
})();

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

// Control combinado: Zoom
const zoomLocateControl = L.Control.extend({
    options: { position: "bottomright" },
    onAdd: function () {
        const container = L.DomUtil.create("div", "leaflet-bar");
        container.classList.add("rounded-3", "overflow-hidden");

        // Botón de Zoom In
        const zoomIn = L.DomUtil.create("a", "leaflet-control-zoom-in", container);
        zoomIn.classList.add("d-flex", "justify-content-center", "align-items-center");
        zoomIn.innerHTML = '<i class="fa-solid fa-plus fs-6"></i>';
        zoomIn.href = "#";
        zoomIn.title = "Acercar";
        L.DomEvent.on(zoomIn, "click", L.DomEvent.stop)
                  .on(zoomIn, "click", () => map.zoomIn());

        // Botón de Zoom Out
        const zoomOut = L.DomUtil.create("a", "leaflet-control-zoom-out", container);
        zoomOut.classList.add("d-flex", "justify-content-center", "align-items-center");
        zoomOut.innerHTML = '<i class="fa-solid fa-minus fs-6"></i>';
        zoomOut.href = "#";
        zoomOut.title = "Alejar";
        L.DomEvent.on(zoomOut, "click", L.DomEvent.stop)
                  .on(zoomOut, "click", () => map.zoomOut());

        return container;
    }
});

// Control de Mi Ubicación
const ubicacion = L.Control.extend({
    options: { position: "bottomright" },
    onAdd: function () {
        const container = L.DomUtil.create("div", "leaflet-bar");
        container.classList.add("rounded-3", "overflow-hidden");

        // Botón de Mi ubicación
        const locateBtn = L.DomUtil.create("a", "leaflet-control-locate", container);
        locateBtn.classList.add("d-flex", "justify-content-center", "align-items-center");
        locateBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs fs-6"></i>';
        locateBtn.href = "#";
        locateBtn.title = "Ver mi ubicación";
        L.DomEvent.on(locateBtn, "click", L.DomEvent.stop)
                  .on(locateBtn, "click", () => verMiUbicacion(locateBtn));

        return container;
    }
});

// Control modo claro / oscuro
const modo = L.Control.extend({
    options: { position: "bottomright" },
    onAdd: function () {
        const container = L.DomUtil.create("div", "leaflet-bar");
        container.classList.add("rounded-3", "overflow-hidden");

        const modoBtn = L.DomUtil.create("a", "leaflet-control-modo", container);
        modoBtn.classList.add("d-flex", "justify-content-center", "align-items-center");

        modoBtn.innerHTML = '<i class="fa-solid fa-sun fs-6"></i>';
        modoBtn.href = "#";
        modoBtn.title = "Cambiar modo claro/oscuro";

        L.DomEvent.on(modoBtn, "click", L.DomEvent.stop).on(modoBtn, "click", () => {
        document.body.classList.toggle("dark-mode");

        if (document.body.classList.contains("dark-mode")) {
            // Modo oscuro
            map.removeLayer(lightTiles);
            map.addLayer(darkTiles);

            modoBtn.classList.remove("btn-light");
            modoBtn.classList.add("btn-dark");
            modoBtn.innerHTML = '<i class="fa-solid fa-moon fs-6"></i>';
        } else {
            // Modo claro
            map.removeLayer(darkTiles);
            map.addLayer(lightTiles);

            modoBtn.classList.remove("btn-dark");
            modoBtn.classList.add("btn-light");
            modoBtn.innerHTML = '<i class="fa-solid fa-sun fs-6"></i>';
        }
        });

        return container;
    }
});


// Agregar controles al mapa
map.removeControl(map.zoomControl);
map.addControl(new zoomLocateControl());
map.addControl(new ubicacion());
map.addControl(new modo());


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
    limpiarDestino();
    crearRuta(ruta);
    rutaSeleccionada = ruta;
    configurarSeleccionDestino();
    mostrarMensajeTemporal(`✅ Ruta "${ruta.nombre}" cargada. Haz clic en una parada para seleccionar destino.`);
}

// ---------------- Funciones de rutas ----------------
function crearBotonRuta(ruta) {
    const lista = document.getElementById("lista-rutas");
    const contenedor = document.createElement("div");
    contenedor.className = "d-flex align-items-center justify-content-between mb-2";

    // Botón principal de la ruta - CON COLOR MORADO PARA MUJER SEGURA
    const btn = document.createElement("button");
    
    // Verificar si es la ruta Mujer Segura
    if (ruta["mujer segura"] === "true") {
        btn.className = "btn text-white text-start flex-grow-1 me-2";
        btn.style.backgroundColor = "#683475"; // Morado
        btn.style.borderColor = "#683475";
        btn.style.fontWeight = "bold";
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

    btn.onclick = () => {
        cargarRuta(ruta);
    };

    // Boton alerta
    // Botón de horario
    const alerta = document.createElement("div");
    alerta.className = "btn btn-outline-secondary me-2";
    alerta.innerHTML = '<i class="fa-solid fa-clock"></i>';

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
    contenedor.appendChild(alerta);
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

function dibujarRuta(lineas, paradas = []) {
    marcadores.forEach((m) => {
        if (m !== marcadorDestino) {
            map.removeLayer(m);
        }
    });
    marcadores = marcadores.filter(m => m === marcadorDestino);
    puntosRuta = [];

    // Remover solo las rutas, no el marcador de destino
    rutasDibujadas.forEach((r) => {
        if (r !== marcadorDestino) {
            map.removeLayer(r);
        }
    });
    rutasDibujadas = rutasDibujadas.filter(r => r === marcadorDestino);

    document.getElementById("lista-puntos").innerHTML = "";

    // Líneas
    lineas.forEach(l => {
        const polyline = L.polyline(l.coords, {
            color: l.color,
            weight: 5,
            dashArray: l.estilo === "dashed" ? "8, 6" : null
        }).addTo(map);
        rutasDibujadas.push(polyline);

        polyline.on("click", function () {
            map.removeLayer(polyline);
            rutasDibujadas = rutasDibujadas.filter(r => r !== polyline);
        });
    });

    // Limpiar paradas anteriores
    paradasActuales = [];

    // Paradas - CON LA MODIFICACIÓN PARA PERMITIR SELECCIÓN DE DESTINO
    paradas.forEach(p => {
        const stop = L.marker(p, {
            icon: paradaIcon,  // Usar el icono de parada con bus azul
            zIndexOffset: 500
        }).addTo(map);

        // Guardar información de la parada
        const paradaInfo = {
            lat: p[0],
            lng: p[1],
            marker: stop
        };
        paradasActuales.push(paradaInfo);

        rutasDibujadas.push(stop);

        // Tooltip para la parada
        stop.bindTooltip('Parada - Haz clic para seleccionar destino', {
            direction: 'top',
            permanent: false
        });

        // Evento para seleccionar destino al hacer clic en la parada
        stop.on("click", function (e) {
            L.DomEvent.stopPropagation(e);

            if (marcadorDestino) {
                map.removeLayer(marcadorDestino);
            }

            marcadorDestino = L.marker(p, {
                icon: destinoIcon,
                zIndexOffset: 1000
            }).addTo(map);

            marcadorDestino.bindPopup(
                `<div class="text-center">
                    <h6 class="fw-bold mb-1"> Destino seleccionado</h6>
                    <p class="mb-1">Lat: ${p[0].toFixed(6)}</p>
                    <p class="mb-1">Lng: ${p[1].toFixed(6)}</p>
                    ${rutaSeleccionada ? `<p class="mb-0">Ruta: ${rutaSeleccionada.nombre}</p>` : ''}
                    <button class="btn btn-sm btn-danger mt-2 w-100" onclick="limpiarDestino()">
                        <i class="fa-solid fa-xmark"></i> Limpiar destino
                    </button>
                </div>`
            ).openPopup();

            console.log("Destino seleccionado en parada:", { lat: p[0], lng: p[1], ruta: rutaSeleccionada?.nombre });
        });

        // Eliminar parada (solo si no hay destino seleccionado)
        stop.on("contextmenu", function (e) {
            L.DomEvent.stopPropagation(e);
            if (!marcadorDestino || (marcadorDestino.getLatLng().lat !== p[0] && marcadorDestino.getLatLng().lng !== p[1])) {
                map.removeLayer(stop);
                rutasDibujadas = rutasDibujadas.filter(r => r !== stop);
                paradasActuales = paradasActuales.filter(parada => parada.lat !== p[0] && parada.lng !== p[1]);
            }
        });
    });

    // Configurar evento para clic en paradas en el mapa
    reactivarClicEnParadas();

    // Ajustar vista (pero no si hay destino marcado)
    if (rutasDibujadas.length > 0 && !marcadorDestino) {
        const group = new L.featureGroup(rutasDibujadas);
        map.fitBounds(group.getBounds());
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

        dibujarRuta(lineas, paradas);
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

            locateBtn.classList.remove("gradiente");

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

// ---------------- Funciones de UI ----------------
function cerrarBienvenida() {
    const checkbox = document.getElementById("no-mostrar-checkbox");
    const modalEl = document.getElementById("bienvenidaModal");

    modalEl.addEventListener("hidden.bs.modal", () => {
        if (checkbox.checked) {
            localStorage.setItem("mostrarBienvenida", "false");
        }
    });
}

function alternarMenuIzquierdo() {
    const sidebar = document.getElementById("sidebar-izquierdo");
    sidebar.classList.toggle("d-none");
}

function alternarMenuDerecho() {
    const sidebar = document.getElementById("sidebar-derecho");
    sidebar.classList.toggle("d-none");
}

function configurarBienvenida() {
    if (localStorage.getItem("mostrarBienvenida") === null) {
        localStorage.setItem("mostrarBienvenida", "true");
    }

    if (localStorage.getItem("mostrarBienvenida") === "true") {
        const modalBienvenida = new bootstrap.Modal(document.getElementById("bienvenidaModal"));
        modalBienvenida.show();

        document.getElementById("btn-comenzar").addEventListener("click", () => {
            if (document.getElementById("no-mostrar").checked) {
                localStorage.setItem("mostrarBienvenida", "false");
            }
            modalBienvenida.hide();
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

function mostrarRutas() {
    const sidebar = document.getElementById("sidebar-content");
    if (!sidebar) return;

    if (sidebar.dataset.abierto === "rutas") {
        sidebar.innerHTML = "";
        sidebar.removeAttribute("data-abierto");
        return;
    }

    sidebar.innerHTML = `
        <div class="d-flex flex-column p-3 h-100 bg-light overflow-auto">
            <h4 class="fw-bold">Rutas</h4>
            <div id="lista-rutas" class="d-flex flex-column gap-2 mt-3"></div>
            
            <a class="btn btn-primary mt-2" href="/paginas/foro/foro.html">
                <i class="fa-solid fa-comments me-1"></i> Foro / Comunidad
            </a>
            
            <a class="btn btn-warning mt-2 w-100 d-flex align-items-center justify-content-center" href="#" onclick="verFavoritos()" data-bs-toggle="collapse" data-bs-target="#lista-favoritos" aria-expanded="false" aria-controls="lista-favoritos">
                <i class="fa-solid fa-bookmark me-2"></i> Favoritos
            </a>
            
            <div class="collapse mt-3" id="lista-favoritos">
                <h5 class="fw-bold">Rutas Favoritas</h5>
                <div id="favoritos" class="d-flex flex-column gap-2 mt-2"></div>
            </div>
            
            <button class="btn btn-success mt-3" onclick="alternarMenuDerecho()">
                <i class="fa-solid fa-route me-1"></i> Crear ruta personalizada
            </button>
            
            <button class="btn btn-warning mt-2" onclick="limpiarDestino()">
                <i class="fa-solid fa-flag"></i> Limpiar destino
            </button>
        </div>
    `;
    sidebar.dataset.abierto = "rutas";
    rutas.forEach((ruta) => crearBotonRuta(ruta));
}

function mostrarFavoritos() {
    const sidebar = document.getElementById("sidebar-content");
    if (!sidebar) return;

    if (sidebar.dataset.abierto === "favoritos") {
        sidebar.innerHTML = "";
        sidebar.removeAttribute("data-abierto");
        return;
    }

    sidebar.innerHTML = `
        <div class="mt-3 d-flex flex-column p-3" id="lista-favoritos">
            <h5 class="fw-bold">Rutas Favoritas</h5>
            <div id="favoritos" class="d-flex flex-column gap-2 mt-2"></div>
            <button class="btn btn-warning mt-2" onclick="limpiarDestino()">
                <i class="fa-solid fa-flag"></i> Limpiar destino
            </button>
        </div>
    `;
    sidebar.dataset.abierto = "favoritos";
    verFavoritos();
}

async function mostrarCrearRutas() {
    const sidebar = document.getElementById("sidebar-content");
    const crear = document.getElementById("crear-rutas");
    if (!sidebar) return;

    if (sidebar.dataset.abierto === "crear") {
        sidebar.innerHTML = "";
        sidebar.removeAttribute("data-abierto");
        localStorage.removeItem("admin");
        return;
    }

    sidebar.innerHTML = crear.innerHTML;
    sidebar.dataset.abierto = "crear";

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

    lista.innerHTML = "";

    // Limpia resultados previos
    lista.querySelectorAll(".resultado").forEach(el => el.remove());

    if (query === "") {
        lista.classList.add("d-none");
        return;
    }

    if (query !== "") {
        lista.classList.remove("d-none");
    }

    // Filtrar rutas
    const resultados = rutas.filter(ruta =>
        ruta.nombre.toLowerCase().includes(query)
    );

    if (resultados.length > 0) {
        resultados.forEach(ruta => {
            const btn = document.createElement("button");
            btn.className = "btn btn-sm btn-outline-secondary rounded-0 border-0 w-100 py-2 text-start";
            btn.style.fontSize = "0.875rem";
            btn.textContent = ruta.nombre;

            // Cuando el usuario hace clic en una ruta
            btn.addEventListener("click", () => {
                input.value = ruta.nombre;
                lista.innerHTML = "";
                lista.classList.add("d-none");

                cargarRuta(ruta);
            });
            lista.appendChild(btn);
        });
    } else {
        const noRes = document.createElement("div");
        noRes.className = "text-muted text-center py-2";
        noRes.style.fontSize = "0.875rem";
        noRes.textContent = "No se encontraron rutas.";
        lista.appendChild(noRes);
        console.log("No se encontraron rutas.");
    }
}

function seleccionarRuta(nombre) {
    document.getElementById('buscar-ruta').value = nombre;
    document.getElementById('dropdown-rutas').style.display = 'none';
}

document.addEventListener("DOMContentLoaded", () => {
  const busqueda = document.getElementById("busqueda");
  const resultados = document.getElementById("resultados-busqueda");

  if (busqueda) {
    L.DomEvent.disableClickPropagation(busqueda);
    L.DomEvent.disableScrollPropagation(busqueda);
  }

  if (resultados) {
    L.DomEvent.disableClickPropagation(resultados);
    L.DomEvent.disableScrollPropagation(resultados);
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
    // items[0].classList.add('active'); // Activar el primer ítem por defecto
}