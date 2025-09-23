// ---------------- Inicialización del mapa ----------------
let map = L.map("map").setView([19.529825, -96.923362], 16);
map.zoomControl.setPosition('bottomright');

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// ---------------- Variables globales ----------------
let rutasDibujadas = [];
let puntosRuta = [];
let marcadores = [];
let marcadorUbicacion = null;
let circuloUbicacion = null;
let marcadorDestino = null;
let rutaSeleccionada = null;
let paradasActuales = []; // Nueva variable para almacenar las paradas actuales

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

// Icono de parada modificado - MANTENIENDO EL BUS AZUL ORIGINAL
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
    paradasActuales = []; // Limpiar paradas actuales
    document.getElementById("lista-puntos").innerHTML = "";
}

function limpiarDestino() {
    if (marcadorDestino) {
        map.removeLayer(marcadorDestino);
        marcadorDestino = null;
    }
    map.off('click.destino');
    // Reactivar clic en paradas para seleccionar destino
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
    // Desactivar clic general en el mapa para destino
    map.off('click.destino');

    // Mostrar mensaje indicando que se debe hacer clic en una parada
    mostrarMensajeTemporal('✅ Haz clic en una parada de la ruta para seleccionar tu destino');
}

// Nueva función para manejar clic en paradas
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
            <h6 class="fw-bold mb-1">🏁 Destino seleccionado</h6>
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

// Función para reactivar el clic en paradas
function reactivarClicEnParadas() {
    // Remover eventos anteriores
    map.off('click.paradaDestino');

    // Agregar evento para clic en paradas
    map.on('click.paradaDestino', function (e) {
        manejarClicEnParada(e);
    });
}

// ---------------- Funciones de rutas ----------------
function crearBotonRuta(ruta) {
    const lista = document.getElementById("lista-rutas");
    const contenedor = document.createElement("div");
    contenedor.className = "d-flex align-items-center justify-content-between";

    const btn = document.createElement("button");
    btn.className = "btn btn-secondary text-start flex-grow-1 me-2";

    const icono = document.createElement("i");
    icono.className = "fa-solid fa-bus-simple me-2";
    btn.appendChild(icono);
    btn.appendChild(document.createTextNode(ruta.nombre));

    btn.onclick = () => {
        limpiarDestino();
        crearRuta(ruta);
        rutaSeleccionada = ruta;
        configurarSeleccionDestino();
        mostrarMensajeTemporal(`✅ Ruta "${ruta.nombre}" cargada. Haz clic en una parada para seleccionar destino.`);
    };

    const favBtn = document.createElement("button");
    favBtn.className = "btn btn-outline-dark";
    favBtn.innerHTML = '<i class="fa-solid fa-bookmark"></i>';
    favBtn.onclick = () => {
        guardarFavorito(ruta);
    };

    contenedor.appendChild(btn);
    contenedor.appendChild(favBtn);
    lista.appendChild(contenedor);
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

// ---------------- Dibujar rutas (VERSIÓN CORREGIDA) ----------------
function dibujarRuta(lineas, paradas = []) {
    // Limpiar solo elementos de ruta, preservar destino
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
            // Prevenir la propagación del evento
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
                    <h6 class="fw-bold mb-1">🏁 Destino seleccionado</h6>
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
    }
});

// ---------------- Ubicación del usuario ----------------
let circuloPulsante = null;
let popupUbicacion = null;

function verMiUbicacion() {
    map.locate({ setView: true, maxZoom: 17, watch: true });

    map.on("locationfound", (e) => {
        if (marcadorUbicacion) map.removeLayer(marcadorUbicacion);
        if (circuloPulsante) map.removeLayer(circuloPulsante);
        if (popupUbicacion) map.removeLayer(popupUbicacion);

        marcadorUbicacion = L.marker(e.latlng).addTo(map);

        popupUbicacion = L.popup({
            closeButton: false,
            autoClose: false,
            closeOnClick: false,
            className: "popup-ubicacion"
        })
            .setLatLng(e.latlng)
            .setContent("¡Aquí estás!")
            .openOn(map);

        const radioMax = 110;
        circuloUbicacion = L.circle(e.latlng, {
            radius: 110,
            color: "blue",
            opacity: 0.4,
            weight: 1,
            fillColor: "rgba(0, 179, 255, 1)",
            fillOpacity: 0.2,
        }).addTo(map);

        circuloPulsante = L.circle(e.latlng, {
            radius: 0,
            color: "blue",
            weight: 2,
            fillColor: "rgba(0, 179, 255, 1)",
            fillOpacity: 0.5,
        }).addTo(map);

        let radio = 0;
        let opacity = 0.5;

        function animarCirculo() {
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

            popupUbicacion.setLatLng(marcadorUbicacion.getLatLng());
            requestAnimationFrame(animarCirculo);
        }

        animarCirculo();
    });
}

// ---------------- Inicialización ----------------
(async function init() {
    await cargarRutas();
    await cargarGenerarRutas();
    configurarBienvenida();
    configurarTooltip();
})();

// ---------------- Funciones de carga ----------------
async function cargarRutas() {
    try {
        const res = await fetch("/rutas.json");
        const data = await res.json();
        data.rutas.forEach((ruta) => crearBotonRuta(ruta));
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

function logout() {
    if (confirm("¿Seguro que quieres cerrar sesión?")) {
        localStorage.removeItem("usuarioActivo");
        window.location.href = "/paginas/login/login.html";
    }
}

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
    cargarRutas();
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

// Filtrado de rutas
const rutas = [
    "Ruta 1 - Centro",
    "Ruta 2 - Norte",
    "Ruta 3 - Sur",
    "Ruta 4 - Oriente",
    "Ruta 5 - Poniente"
];

function filtrarRutas() {
    const input = document.getElementById("buscar-ruta");
    const query = input.value.toLowerCase();
    const lista = document.getElementById("resultados-busqueda");
    const noRes = document.getElementById("sin-resultados");
    const container = document.getElementById("resultados-container");

    // Limpia resultados previos
    lista.querySelectorAll(".resultado").forEach(el => el.remove());

    if (query !== "") {
        container.classList.remove("d-none");
    }

    if (query === "") {
        noRes.classList.add("d-none");
        return;
    }

    // Filtrar rutas
    const resultados = rutas.filter(ruta =>
        ruta.toLowerCase().includes(query)
    );

    if (resultados.length > 0) {
        noRes.classList.add("d-none");

        resultados.forEach(ruta => {
            const li = document.createElement("li");
            li.className = "list-group-item resultado";
            li.textContent = ruta;

            // Cuando el usuario hace clic en una ruta
            li.addEventListener("click", () => {
                input.value = ruta;
                lista.querySelectorAll(".resultado").forEach(el => el.remove());
            });

            lista.appendChild(li);
        });
    } else {
        noRes.classList.remove("d-none");
    }
}

function seleccionarRuta(nombre) {
    document.getElementById('buscar-ruta').value = nombre;
    document.getElementById('dropdown-rutas').style.display = 'none';
}