document.addEventListener("DOMContentLoaded", () => {
  const listaCompleta = document.getElementById("lista-completa-rutas");

  // Cargar rutas guardadas en localStorage
  const rutas = JSON.parse(localStorage.getItem("rutas")) || [];

  if (rutas.length === 0) {
    listaCompleta.innerHTML = `<li class="list-group-item text-muted">No hay rutas guardadas</li>`;
    return;
  }

  rutas.forEach((ruta, index) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";

    // Nombre + color
    li.innerHTML = `
      <span>
        <span class="badge rounded-circle me-2" style="background:${ruta.color}; width:15px; height:15px;"> </span>
        ${ruta.nombre}
      </span>
      <button class="btn btn-sm btn-danger" onclick="eliminarRuta(${index})">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;

    listaCompleta.appendChild(li);
  });
});

// Elminar ruta
function eliminarRuta(index) {
  let rutas = JSON.parse(localStorage.getItem("rutas")) || [];
  rutas.splice(index, 1);
  localStorage.setItem("rutas", JSON.stringify(rutas));
  location.reload(); // recargar la página para actualizar lista
}
