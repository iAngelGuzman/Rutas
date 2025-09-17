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

const busIcon = L.divIcon({
    html: `
      <div class="d-flex justify-content-center align-items-center rounded-circle border border-2 border-white bg-primary" style="width:26px; height:26px;">
        <i class="fa-solid fa-bus-simple text-white"></i>
      </div>
    `,
    className: '', // evita que Leaflet meta estilos extra
    iconSize: [28, 28],
    iconAnchor: [14, 14] // centro exacto
});

// ---------------- Funciones ----------------
function limpiarMarcadores() {
    marcadores.forEach((m) => map.removeLayer(m));
    marcadores = [];
    puntosRuta = [];
    rutasDibujadas.forEach((r) => map.removeLayer(r));
    marcadorUbicacion = null;
    circuloUbicacion = null;
    document.getElementById("lista-puntos").innerHTML = "";
}

function crearBotonRuta(ruta) {
  const lista = document.getElementById("lista-rutas");

  // Contenedor
  const contenedor = document.createElement("div");
  contenedor.className = "d-flex align-items-center justify-content-between";

  // Botón de la ruta
  const btn = document.createElement("button");
  btn.className = "btn btn-secondary text-start flex-grow-1 me-2";

  const icono = document.createElement("i");
  icono.className = "fa-solid fa-bus-simple me-2";
  btn.appendChild(icono);

  btn.appendChild(document.createTextNode(ruta.nombre));
  btn.onclick = () => crearRuta(ruta);

  // Botón de favoritos con ícono estilo "guardar"
  const favBtn = document.createElement("button");
  favBtn.className = "btn btn-outline-dark"; // bordeado tipo "guardar"
  favBtn.innerHTML = '<i class="fa-solid fa-bookmark"></i>';

  favBtn.onclick = () => {
    guardarFavorito(ruta); // 👉 Aquí llamas tu lógica para guardarlo
  };

  // Agregar al contenedor
  contenedor.appendChild(btn);
  contenedor.appendChild(favBtn);

  // Agregar a la lista
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

    lista.innerHTML = ""; // limpiar lista antes de mostrar

    if (favoritos.length === 0) {
        lista.innerHTML = '<p class="text-muted">No tienes rutas favoritas guardadas.</p>';
    } else {
        favoritos.forEach(ruta => {
            // Botón que muestra el nombre y carga la ruta
            const btn = document.createElement("button");
            btn.className = "btn btn-outline-primary w-100 text-start";
            btn.innerHTML = `<i class="fa-solid fa-bus-simple me-2"></i> ${ruta.nombre}`;

            // 👉 aquí cargamos la ruta
            btn.onclick = () => {
                crearRuta(ruta, ruta.color);
            };

            lista.appendChild(btn);
        });
    }
}


// ---------------- Guardar ruta personalizada ----------------

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruta)
    })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
        })
        .catch(err => console.error(err));
}

// 🔹 Función auxiliar para intercambiar posiciones
function swap(arr, i, j) {
    [arr[i], arr[j]] = [arr[j], arr[i]];
}

// 🔹 Función para agregar un punto al mapa y a la lista
function agregarPunto(lat, lng) {
    // Agregar punto al array
    puntosRuta.push([lng, lat]);
    const index = puntosRuta.length;

    // Crear marcador draggable en el mapa
    const marker = L.marker([lat, lng], { draggable: true })
        .addTo(map)
        .bindTooltip(`${index}`, {
            permanent: true,
            direction: "top",
            className: "fw-bold text-white bg-danger border-0 shadow rounded px-2 opacity-100",
            offset: [-14.5, 14],
        });

    marcadores.push(marker);

    // Crear elemento de la lista
    const li = document.createElement("li");
    li.className = "d-flex align-items-center mb-1";
    li.innerHTML = `
        <span class="me-2 fw-bold">${index}</span>
        <input type="text" class="form-control form-control-sm me-2" 
               value="[${lat.toFixed(6)}, ${lng.toFixed(6)}]" readonly>
        <button type="button" class="btn btn-sm btn-outline-danger btn-delete">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;

    document.getElementById("lista-puntos").appendChild(li);

    const input = li.querySelector("input");
    const deleteBtn = li.querySelector(".btn-delete");

    // 🔹 Drag marker: actualizar posición y valor en la lista
    marker.on("dragend", (event) => {
        const newPos = event.target.getLatLng();
        const i = marcadores.indexOf(marker);
        if (i !== -1) {
            puntosRuta[i] = [newPos.lng, newPos.lat];
            input.value = `[${newPos.lat.toFixed(6)}, ${newPos.lng.toFixed(6)}]`;
        }
    });

    // 🔹 Click derecho elimina el marcador
    marker.on("contextmenu", () => eliminarPunto());

    // 🔹 Botón eliminar
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

// 🔹 Reindexar lista y tooltips
function reindexar() {
    document.querySelectorAll("#lista-puntos li").forEach((li, index) => {
        li.querySelector("span").innerText = index + 1;
        marcadores[index].setTooltipContent(`${index + 1}`);
    });
}


// 🔹 Evento click en el mapa
map.on("click", (e) => {
    if (localStorage.getItem("admin") !== "true") {
        return;
    }
    const { lat, lng } = e.latlng;
    agregarPunto(lat, lng);
});

// 🔹 Cargar datos de una ruta guardada
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

        // Limpiar antes de cargar
        document.getElementById("nombre-ruta").value = ruta.nombre;
        document.getElementById("color-ruta").value = ruta.color;
        document.getElementById("lista-puntos").innerHTML = "";
        puntosRuta = [];
        marcadores.forEach(m => map.removeLayer(m));
        marcadores = [];

        // Cargar puntos en mapa y lista
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

// ---------------- Ubicación ----------------
let circuloPulsante = null;
let popupUbicacion = null;

function verMiUbicacion() {
    map.locate({ setView: true, maxZoom: 17, watch: true });

    map.on("locationfound", (e) => {
        // Eliminar anteriores
        if (marcadorUbicacion) map.removeLayer(marcadorUbicacion);
        if (circuloPulsante) map.removeLayer(circuloPulsante);
        if (popupUbicacion) map.removeLayer(popupUbicacion);

        // Marcador exacto
        marcadorUbicacion = L.marker(e.latlng).addTo(map);

        // Popup independiente
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

        // Círculo pulsante
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
            circuloPulsante.setStyle({ fillOpacity: opacity, opacity: opacity });

            if (radio >= radioMax) {
                radio = 0;
                opacity = 0.5;
            }

            // Mantener popup en la misma posición del marcador
            popupUbicacion.setLatLng(marcadorUbicacion.getLatLng());

            requestAnimationFrame(animarCirculo);
        }

        animarCirculo();
    });
}



// ---------------- Rutas ----------------
async function crearGenerarRuta(nombre, puntos, color = "red") {
    try {
        const cache = localStorage.getItem(nombre);
        if (cache) {
            dibujarRuta(JSON.parse(cache), color);
            return;
        }

        const res = await fetch("http://localhost:3000/directions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, puntos, color })
        });

        if (!res.ok) throw new Error("Error al generar ruta");

        const data = await res.json();
        const coords = data.features[0].geometry.coordinates;
        const latlngs = coords.map((c) => [c[1], c[0]]);

        localStorage.setItem(nombre, JSON.stringify(latlngs));
        dibujarRuta(latlngs, color);
    } catch (err) {
        console.error("Error cargando ruta:", err);
    }
}


// ---------------- Inicialización ----------------
(async function init() {
    await cargarRutas();
    await cargarGenerarRutas();
    configurarBienvenida();
    configurarTooltip();
})();

// ---------------- Drag & Drop lista de puntos ----------------
const lista = document.getElementById("lista-puntos");

Sortable.create(lista, {
    animation: 150,
    onEnd: function (evt) {
        // Extraer los elementos movidos
        const movedMarker = marcadores.splice(evt.oldIndex, 1)[0];
        const movedPoint = puntosRuta.splice(evt.oldIndex, 1)[0];

        // Insertar en la nueva posición
        marcadores.splice(evt.newIndex, 0, movedMarker);
        puntosRuta.splice(evt.newIndex, 0, movedPoint);

        // Actualizar numeración
        reindexar();
    }
});

async function cargarRutas() {
    try {
        // Leer índice
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
};

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

// 🚍 Cargar una ruta (puede ser solo "ruta" o "ida/vuelta")
async function crearRuta(ruta) {
    try {
        const archivos = ruta.archivos;
        let lineas = [];
        let paradas = [];

        // --- Caso simple: solo "ruta"
        if (archivos.ruta) {
            const coords = await cargarGeoJSON(archivos.ruta);
            lineas.push({ coords, color: ruta.color, estilo: "solid" });

            if (archivos.paradas) {
                paradas = await cargarParadas(archivos.paradas);
            }
        }

        // --- Caso con ida/vuelta
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

        // Dibujar en el mapa
        dibujarRuta(lineas, paradas);

    } catch (err) {
        console.error("Error cargando ruta:", err);
    }
}

// 📍 Dibujar rutas y paradas
function dibujarRuta(lineas, paradas = []) {
    // Limpiar lo anterior
    limpiarMarcadores();

    // Líneas
    lineas.forEach(l => {
        const polyline = L.polyline(l.coords, {
            color: l.color,
            weight: 5,
            dashArray: l.estilo === "dashed" ? "8, 6" : null
        }).addTo(map);

        rutasDibujadas.push(polyline);

        // Quitar si se hace click
        polyline.on("click", function () {
            map.removeLayer(polyline);
            rutasDibujadas = rutasDibujadas.filter(r => r !== polyline);
        });
    });

    // Paradas con ícono de autobús
    paradas.forEach(p => {
        const stop = L.marker(p, { icon: busIcon }).addTo(map);

        rutasDibujadas.push(stop);

        stop.on("click", function () {
            map.removeLayer(stop);
            rutasDibujadas = rutasDibujadas.filter(r => r !== stop);
        });
    });

    // Ajustar vista
    if (rutasDibujadas.length > 0) {
        const group = new L.featureGroup(rutasDibujadas);
        map.fitBounds(group.getBounds());
    }
}

// 🔄 Helper: cargar archivo GeoJSON de línea
async function cargarGeoJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudo cargar: " + url);
    const data = await res.json();

    // GeoJSON → [lat, lng]
    return data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
}

// 🔄 Helper: cargar archivo GeoJSON de paradas
async function cargarParadas(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudo cargar: " + url);
    const data = await res.json();

    // GeoJSON → [[lat, lng], ...]
    return data.features.map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]]);
}

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
  // Inicializar solo la primera vez
  if (localStorage.getItem("mostrarBienvenida") === null) {
    localStorage.setItem("mostrarBienvenida", "true");
  }

  // Mostrar modal si está en "true"
  if (localStorage.getItem("mostrarBienvenida") === "true") {
    const modalBienvenida = new bootstrap.Modal(document.getElementById("bienvenidaModal"));
    modalBienvenida.show();

    // Botón "Comenzar"
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
    sidebar.innerHTML = `
        <div class="d-flex flex-column p-3 h-100 bg-light border border-start overflow-auto">
          <h4 class="fw-bold">Rutas</h4>
          <div id="lista-rutas" class="d-flex flex-column gap-2 mt-3"></div>

          <a class="btn btn-primary mt-2" href="/paginas/foro/foro.html">
            <i class="fa-solid fa-comments me-1"></i>
            Foro / Comunidad
          </a>
          
          <a class="btn btn-warning mt-2 w-100 d-flex align-items-center justify-content-center" 
            href="#" 
            onclick="verFavoritos()" 
            data-bs-toggle="collapse" 
            data-bs-target="#lista-favoritos" 
            aria-expanded="false" 
            aria-controls="lista-favoritos">
            <i class="fa-solid fa-bookmark me-2"></i>
            Favoritos
          </a>

          <div class="collapse mt-3" id="lista-favoritos">
            <h5 class="fw-bold">Rutas Favoritas</h5>
            <div id="favoritos" class="d-flex flex-column gap-2 mt-2"></div>
          </div>

          <button class="btn btn-success mt-3" onclick="alternarMenuDerecho()">
            <i class="fa-solid fa-route me-1"></i>
            Crear ruta personalizada
          </button>
        </div>
    `;
    cargarRutas();
}

function mostrarFavoritos() {
    const sidebar = document.getElementById("sidebar-content");
    if (!sidebar) return;
    sidebar.innerHTML = `
        <div class="mt-3 d-flex flex-column p-3" id="lista-favoritos">
            <h5 class="fw-bold">Rutas Favoritas</h5>
            <div id="favoritos" class="d-flex flex-column gap-2 mt-2"></div>
        </div>
    `;
    verFavoritos();
}