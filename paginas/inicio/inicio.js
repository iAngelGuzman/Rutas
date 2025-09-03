// ---------------- Inicialización del mapa ----------------
const map = L.map("map").setView([19.529825, -96.923362], 16);
map.zoomControl.setPosition('topright');
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
    const btn = document.createElement("button");
    btn.className = "btn btn-secondary text-start";

    const icono = document.createElement("i");
    icono.className = "fa-solid fa-bus-simple me-2";
    btn.appendChild(icono);

    btn.appendChild(document.createTextNode(ruta.nombre));
    btn.onclick = () => crearRuta(ruta.archivo, ruta.color);

    lista.appendChild(btn);
}

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
function verMiUbicacion() {
    map.locate({ setView: true, maxZoom: 17, watch: true });

    map.once("locationfound", (e) => {
        if (marcadorUbicacion) map.removeLayer(marcadorUbicacion);
        if (circuloUbicacion) map.removeLayer(circuloUbicacion);

        marcadorUbicacion = L.circle(e.latlng, {
            radius: 10,
            color: "rgba(0, 63, 210, 1)",
            opacity: 1.0,
            weight: 2,
            fillColor: "rgba(0, 76, 255, 1)",
            fillOpacity: 1.0,
        }).addTo(map);

        circuloUbicacion = L.circle(e.latlng, {
            radius: 150,
            color: "blue",
            opacity: 0.4,
            weight: 2,
            fillColor: "rgba(0, 179, 255, 1)",
            fillOpacity: 0.2,
        }).addTo(map);

        map.setView(e.latlng, 17, { animate: true });
    });

    map.once("locationerror", () => alert("No se pudo obtener tu ubicación 😥"));
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

function dibujarRuta(latlngs, color = "red") {
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

async function crearRuta(nombreRuta, color = "red") {
    try {
        // Verificar en cache local
        const cache = localStorage.getItem(nombreRuta);
        if (cache) {
            dibujarRuta(JSON.parse(cache), color);
            return;
        }

        // Cargar desde archivo local (carpeta rutas)
        const res = await fetch(`rutas/${nombreRuta}`);
        if (!res.ok) throw new Error("Ruta no encontrada");

        const data = await res.json();
        const coords = data.features[0].geometry.coordinates;

        // Convertir [lng, lat] → [lat, lng]
        const latlngs = coords.map((c) => [c[1], c[0]]);

        // Guardar en cache local
        localStorage.setItem(nombreRuta, JSON.stringify(latlngs));

        // Dibujar en el mapa
        dibujarRuta(latlngs, color);
    } catch (err) {
        console.error("Error cargando ruta:", err);
    }
}


// ---------------- Bienvenida ----------------
window.onload = function () {
    const mostrarBienvenida = localStorage.getItem("mostrarBienvenida", "false") === "true";
    if (mostrarBienvenida) {
        document.getElementById("bienvenida").style.display = "flex";
    }
};

function cerrarBienvenida() {
    document.getElementById("bienvenida").style.display = "none";
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar.style.display === "none" || sidebar.style.display === "") {
        sidebar.style.display = "block";
    } else {
        sidebar.style.display = "none";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const usuario = localStorage.getItem("usuario");
    if (usuario) {
        document.getElementById("bienvenida").textContent =
            "Bienvenido, " + usuario + "!";
    } else {
        // Si no hay usuario guardado, regresar al login
        window.location.href = "/paginas/login/login.html";
    }
});

function logout() {
    if (confirm("¿Seguro que quieres cerrar sesión?")) {
        localStorage.removeItem("usuario");
        localStorage.removeItem("password");
        window.location.href = "/paginas/login/login.html";
    }
}