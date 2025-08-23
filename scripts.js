var map = L.map('map').setView([19.5426, -96.9103], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let rutasDibujadas = [];

// --------- Ubicación del usuario ----------
let marcadorUbicacion = null;
let circuloUbicacion = null;

let puntosRuta = [];
let marcadores = [];

// Click en mapa para agregar puntos
map.on('click', function(e) {
    const { lat, lng } = e.latlng;
    puntosRuta.push([lng, lat]); // Guardar como [lon, lat] para ORS
    const marker = L.marker([lat, lng]).addTo(map);
    marcadores.push(marker);

    const lista = document.getElementById("lista-puntos");
    const li = document.createElement("li");
    li.textContent = `Punto ${puntosRuta.length}: [${lat.toFixed(6)}, ${lng.toFixed(6)}]`;
    lista.appendChild(li);
});

// Guardar ruta al enviar formulario
document.getElementById("form-ruta").addEventListener("submit", function(e) {
    e.preventDefault();
    const nombre = document.getElementById("nombre-ruta").value;
    const color = document.getElementById("color-ruta").value;

    if (puntosRuta.length < 2) {
        alert("Debe agregar al menos 2 puntos");
        return;
    }

    fetch("http://localhost:3000/directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, puntos: puntosRuta, color })
    })
    .then(res => res.json())
    .then(data => {
        alert("Ruta guardada correctamente");

        // Agregar botón de la nueva ruta dinámicamente
        const lista = document.getElementById("lista-rutas");
        const btn = document.createElement("button");
        btn.className = "btn btn-secondary";

        const icono = document.createElement("i");
        icono.className = "fa-solid fa-bus-simple me-2";
        btn.appendChild(icono);

        btn.appendChild(document.createTextNode(nombre));
        btn.onclick = () => dibujarRuta({ nombre, puntos: puntosRuta, color });

        lista.appendChild(btn);

        // Limpiar puntos y marcadores
        puntosRuta = [];
        marcadores.forEach(m => map.removeLayer(m));
        marcadores = [];
        document.getElementById("lista-puntos").innerHTML = "";
    })
    .catch(err => console.error("Error al guardar ruta:", err));
});


function verMiUbicacion() {
    map.locate({ setView: true, maxZoom: 16 });

    map.once("locationfound", function (e) {
        if (marcadorUbicacion) map.removeLayer(marcadorUbicacion);
        if (circuloUbicacion) map.removeLayer(circuloUbicacion);

        marcadorUbicacion = L.marker(e.latlng).addTo(map)
            .bindPopup("¡Estás aquí!").openPopup();

        circuloUbicacion = L.circle(e.latlng, {
            radius: 150,
            color: "blue",
            opacity: 0.4,
            weight: 2,
            fillColor: "rgba(0, 179, 255, 1)",
            fillOpacity: 0.2
        }).addTo(map);
    });

    map.once("locationerror", function () {
        alert("No se pudo obtener tu ubicación 😥");
    });
}

// --------- Funciones de dibujado ----------
function dibujarPolyline(latlngs, color) {
    // Eliminar rutas anteriores
    rutasDibujadas.forEach(r => map.removeLayer(r));
    rutasDibujadas = [];

    // Dibujar nueva ruta
    const polyline = L.polyline(latlngs, { color: color, weight: 5 }).addTo(map);
    rutasDibujadas.push(polyline);

    // Ajustar vista al bounds de la ruta
    map.fitBounds(polyline.getBounds());
}

// Botón para cargar y dibujar la ruta guardada
// 🔹 Función que recibe el nombre de la ruta y la dibuja
async function dibujarRuta(nombreRuta) {
  try {
    // Cargar el JSON desde el backend
    const res = await fetch(`http://localhost:3000/rutas/${nombreRuta}.json`);
    const data = await res.json();

    // Obtener coordenadas del GeoJSON
    const coords = data.features[0].geometry.coordinates;
    const latlngs = coords.map(c => [c[1], c[0]]); // convertir a [lat, lng]

    // Dibujar polyline en el mapa
    const polyline = L.polyline(latlngs, { color: "red", weight: 4 }).addTo(map);

    // Ajustar vista
    map.fitBounds(polyline.getBounds());

  } catch (err) {
    console.error("Error cargando ruta:", err);
  }
}



// --------- Funciones de rutas ----------
function dibujarRuta2(ruta) {
    const key = ruta.nombre;
    const cache = localStorage.getItem(key);
    // console.log("Rutas disponibles:", ruta);
    // if (cache) {
    //     dibujarPolyline(JSON.parse(cache), ruta.color);
    //     return;
    // }

    // Si ya está generada en la carpeta rutas/, cargarla
    fetch(`http://localhost:3000/rutas`)
        .then(res => res.json())
        .then(data => {
            const rutaGuardada = data.rutas.find(r => r.nombre === ruta.nombre);
            if (rutaGuardada && rutaGuardada.puntos.length) {
                const latlngs = rutaGuardada.puntos.map(c => [c[1], c[0]]);
                localStorage.setItem(key, JSON.stringify(latlngs));
                dibujarPolyline(latlngs, ruta.color);
            } else {
                // Si no está generada, llamar al endpoint /directions para crearla
                fetch("http://localhost:3000/directions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nombre: ruta.nombre, puntos: ruta.puntos })
                })
                    .then(res => res.json())
                    .then(data => {
                        const coords = data.features[0].geometry.coordinates;
                        const latlngs = coords.map(c => [c[1], c[0]]);
                        localStorage.setItem(key, JSON.stringify(latlngs));
                        dibujarPolyline(latlngs, ruta.color);
                    });
            }
        });
}




// --------- Cargar rutas desde rutas.json ----------
fetch("rutas.json")
    .then(res => res.json())
    .then(data => {
        const lista = document.getElementById("lista-rutas");

        data.rutas.forEach(ruta => {
            const btn = document.createElement("button");
            btn.className = "btn btn-secondary";

            const icono = document.createElement("i");
            icono.className = "fa-solid fa-bus-simple me-2";

            btn.appendChild(icono);

            // Crear un nodo de texto separado para no borrar el icono
            const texto = document.createTextNode(ruta.nombre);
            btn.appendChild(texto);

            btn.onclick = () => dibujarRuta(ruta);
            lista.appendChild(btn);
        });
    })
    .catch(err => console.error("Error cargando rutas.json:", err));
