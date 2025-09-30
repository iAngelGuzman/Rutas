import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 🔑 Configura con tu URL y API Key de Supabase
const SUPABASE_URL = "https://kwticdibydhutiaxxyuw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3dGljZGlieWRodXRpYXh4eXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTcyNTQsImV4cCI6MjA3MjQ5MzI1NH0.psT5kSJHRFA3T_8jCY81DHHGgT4T2_W4XiY_yLDQ-tw";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const formTema = document.getElementById("form-tema");
const listaTemas = document.getElementById("lista-temas");

const modal = new bootstrap.Modal(document.getElementById("modalTema"));
const modalTitulo = document.getElementById("modalTitulo");
const modalContenido = document.getElementById("modalContenido");
const listaRespuestas = document.getElementById("lista-respuestas");
const formRespuesta = document.getElementById("form-respuesta");

let temaActual = null;

//  Cargar temas
async function cargarTemas() {
  const { data, error } = await supabase.from("temas").select("id, titulo, autor, contenido, created_at").order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    // 💡 ALERTA DE ERROR
    Swal.fire({
        icon: 'error',
        title: 'Error al cargar temas',
        text: error.message
    });
    return;
  }
  listaTemas.innerHTML = "";
  data.forEach(t => {
    const div = document.createElement("div");
    div.className = "tema card p-3 shadow-sm";
    div.innerHTML = `
      <h5>${t.titulo}</h5>
      <small class="text-muted">por ${t.autor || "Anónimo"} · ${new Date(t.created_at).toLocaleString()}</small>
    `;
    div.onclick = () => abrirTema(t);
    listaTemas.appendChild(div);
  });
}

// Crear tema
formTema.addEventListener("submit", async e => {
  e.preventDefault();
  const nuevoTema = {
    titulo: document.getElementById("titulo").value,
    contenido: document.getElementById("contenido").value,
    autor: document.getElementById("autor").value || "Anónimo"
  };
  const { error } = await supabase.from("temas").insert([nuevoTema]);
  if (error) {
    console.error(error);
    // 💡 ALERTA DE ERROR
    Swal.fire({
        icon: 'error',
        title: 'No se pudo crear el tema',
        text: error.message
    });
  } else {
    // ✅ ALERTA DE ÉXITO
    Swal.fire({
        icon: 'success',
        title: '¡Tema creado!',
        showConfirmButton: false,
        timer: 1500
    });
    formTema.reset();
    cargarTemas();
  }
});

// Abrir tema y respuestas
async function abrirTema(tema) {
  temaActual = tema;
  modalTitulo.textContent = tema.titulo;
  modalContenido.textContent = tema.contenido;

  const { data: respuestas, error } = await supabase.from("respuestas").select("autor, contenido, created_at").eq("tema_id", tema.id).order("created_at");
  if (error) {
    console.error(error);
    // 💡 ALERTA DE ERROR
    Swal.fire({
        icon: 'error',
        title: 'Error al cargar respuestas',
        text: error.message
    });
  }

  listaRespuestas.innerHTML = respuestas.length
    ? respuestas.map(r => `
        <div class="border rounded p-2 mb-2">
          <strong>${r.autor || "Anónimo"}</strong> <small class="text-muted">· ${new Date(r.created_at).toLocaleString()}</small>
          <p class="mb-0">${r.contenido}</p>
        </div>
      `).join("")
    : "<p class='text-muted'>Aún no hay respuestas. ¡Sé el primero en comentar!</p>";

  modal.show();
}

// Responder tema
formRespuesta.addEventListener("submit", async e => {
  e.preventDefault();
  if (!temaActual) return;
  const nuevaRespuesta = {
    tema_id: temaActual.id,
    autor: document.getElementById("respuesta-autor").value || "Anónimo",
    contenido: document.getElementById("respuesta-contenido").value
  };

  if (!nuevaRespuesta.contenido.trim()) {
      Swal.fire('Atención', 'La respuesta no puede estar vacía.', 'warning');
      return;
  }

  const { error } = await supabase.from("respuestas").insert([nuevaRespuesta]);
  if (error) {
    console.error(error);
    // 💡 ALERTA DE ERROR
    Swal.fire({
        icon: 'error',
        title: 'No se pudo enviar la respuesta',
        text: error.message
    });
  } else {
    // ✅ ALERTA DE ÉXITO
     Swal.fire({
        icon: 'success',
        title: '¡Respuesta enviada!',
        showConfirmButton: false,
        timer: 1000
    });
    document.getElementById("respuesta-contenido").value = ''; // Solo limpiar el contenido
    abrirTema(temaActual); // recargar respuestas
  }
});

// Inicial
cargarTemas();