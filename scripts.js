// Inicialización del mapa
const map = L.map("map").setView([19.5426, -96.9103], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

let rutasDibujadas = [];
let puntosRuta = [];
let marcadores = [];
let marcadorUbicacion = null;
let circuloUbicacion = null;

// ---------------- Funciones utilitarias ----------------
function limpiarMarcadores() {
  marcadores.forEach((m) => map.removeLayer(m));
  marcadores = [];
  puntosRuta = [];
  document.getElementById("lista-puntos").innerHTML = "";
}

function dibujarPolyline(latlngs, color = "red") {
  rutasDibujadas.forEach((r) => map.removeLayer(r));
  rutasDibujadas = [];

  const polyline = L.polyline(latlngs, { color, weight: 5 }).addTo(map);
  rutasDibujadas.push(polyline);
  map.fitBounds(polyline.getBounds());
}

function crearBotonRuta(ruta) {
  const lista = document.getElementById("lista-rutas");
  const btn = document.createElement("button");
  btn.className = "btn btn-secondary";

  const icono = document.createElement("i");
  icono.className = "fa-solid fa-bus-simple me-2";
  btn.appendChild(icono);

  btn.appendChild(document.createTextNode(ruta.nombre));
  btn.onclick = () => dibujarRuta(ruta.nombre, ruta.color);

  lista.appendChild(btn);
}

// ---------------- Eventos ----------------
// Click en mapa para agregar puntos
map.on("click", (e) => {
  const { lat, lng } = e.latlng;
  puntosRuta.push([lng, lat]);

  const marker = L.marker([lat, lng]).addTo(map);
  marcadores.push(marker);

  const li = document.createElement("li");
  li.textContent = `Punto ${puntosRuta.length}: [${lat.toFixed(
    6
  )}, ${lng.toFixed(6)}]`;
  document.getElementById("lista-puntos").appendChild(li);
});

// Guardar ruta
document.getElementById("form-ruta").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nombre = document.getElementById("nombre-ruta").value;
  const color = document.getElementById("color-ruta").value;

  if (puntosRuta.length < 2) return alert("Debe agregar al menos 2 puntos");

  try {
    await fetch("http://localhost:3000/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, puntos: puntosRuta, color }),
    });

    alert("Ruta guardada correctamente");
    crearBotonRuta({ nombre, color });
    limpiarMarcadores();
  } catch (err) {
    console.error("Error al guardar ruta:", err);
  }
});

// Ver ubicación del usuario
function verMiUbicacion() {
  map.locate({ setView: true, maxZoom: 30, watch: true });

  map.once("locationfound", (e) => {
    if (marcadorUbicacion) map.removeLayer(marcadorUbicacion);
    if (circuloUbicacion) map.removeLayer(circuloUbicacion);

    // marcadorUbicacion = L.marker(e.latlng).addTo(map)
    //   .bindPopup("¡Estás aquí!").openPopup();

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

    // Zoom manual extra si quieres forzar acercamiento
    map.setView(e.latlng, 30, { animate: true });
  });

  map.once("locationerror", () => alert("No se pudo obtener tu ubicación 😥"));
}


// ---------------- Rutas ----------------
async function dibujarRuta(nombreRuta, color = "red") {
  try {
    // Buscar en cache
    const cache = localStorage.getItem(nombreRuta);
    if (cache) {
      dibujarPolyline(JSON.parse(cache), color);
      return;
    }

    // Buscar en backend
    const res = await fetch(`http://localhost:3000/rutas/${nombreRuta}`);
    if (!res.ok) throw new Error("Ruta no encontrada");

    const data = await res.json();
    const coords = data.features[0].geometry.coordinates;
    const latlngs = coords.map((c) => [c[1], c[0]]);

    localStorage.setItem(nombreRuta, JSON.stringify(latlngs));
    dibujarPolyline(latlngs, color);
  } catch (err) {
    console.error("Error cargando ruta:", err);
  }
}

// ---------------- Inicialización ----------------
// Cargar lista de rutas desde rutas.json
(async function cargarRutas() {
  try {
    const res = await fetch("rutas.json");
    const data = await res.json();
    data.rutas.forEach((ruta) => crearBotonRuta(ruta));
  } catch (err) {
    console.error("Error cargando rutas.json:", err);
  }
})();
