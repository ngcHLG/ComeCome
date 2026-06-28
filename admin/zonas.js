// zonas.js - CRUD de zonas y mapa de envío

let zonaEditando = null;
let modalInstancia = null;

document.addEventListener('DOMContentLoaded', () => {
  modalInstancia = new bootstrap.Modal(document.getElementById('zonaModal'));
  document.getElementById('btn-guardar').addEventListener('click', guardarZona);

  // Quitar foco al cerrar el modal para evitar el warning aria-hidden
  document.getElementById('zonaModal').addEventListener('hidden.bs.modal', () => {
    document.activeElement?.blur();
  });

  cargarZonas();
  cargarMapa();
});

async function cargarZonas() {
  const { data, error } = await window.comecomeSupabase
    .from('zonas')
    .select('*')
    .order('nombre');

  const container = document.getElementById('zonas-container');
  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">No hay zonas configuradas.</p>';
    return;
  }

  container.innerHTML = data.map(z => `
    <div class="zona-item">
      <div class="zona-info">
        <span class="zona-nombre">${z.nombre}</span>
        <span class="zona-precio">+${parseFloat(z.precio_envio).toFixed(2)} CUP</span>
        <span class="zona-estado ${z.activo ? 'text-success' : 'text-danger'}">${z.activo ? 'Activo' : 'Inactivo'}</span>
      </div>
      <div class="zona-acciones">
        <button class="btn btn-outline-amarillo btn-sm" onclick="abrirModalEditar('${z.id}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-outline-amarillo btn-sm" onclick="toggleZona('${z.id}')"><i class="bi ${z.activo ? 'bi-eye-slash' : 'bi-eye'}"></i></button>
        <button class="btn btn-outline-amarillo btn-sm" onclick="eliminarZona('${z.id}')"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `).join('');
}

function abrirModalNuevo() {
  zonaEditando = null;
  document.getElementById('modal-titulo').textContent = 'Nueva zona';
  document.getElementById('zona-id').value = '';
  document.getElementById('zona-nombre').value = '';
  document.getElementById('zona-precio').value = '';
  document.getElementById('zona-activo').checked = true;
  modalInstancia.show();
}

async function abrirModalEditar(id) {
  const { data, error } = await window.comecomeSupabase
    .from('zonas')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return;

  zonaEditando = data;
  document.getElementById('modal-titulo').textContent = 'Editar zona';
  document.getElementById('zona-id').value = data.id;
  document.getElementById('zona-nombre').value = data.nombre;
  document.getElementById('zona-precio').value = data.precio_envio;
  document.getElementById('zona-activo').checked = data.activo;
  modalInstancia.show();
}

async function guardarZona() {
  const id = document.getElementById('zona-id').value;
  const nombre = document.getElementById('zona-nombre').value.trim();
  const precio = parseFloat(document.getElementById('zona-precio').value);
  const activo = document.getElementById('zona-activo').checked;

  if (!nombre || isNaN(precio) || precio < 0) {
    mostrarMensaje('Completa todos los campos.');
    return;
  }

  if (id) {
    const { error } = await window.comecomeSupabase
      .from('zonas')
      .update({ nombre, precio_envio: precio, activo })
      .eq('id', id);
    if (error) { mostrarMensaje('Error al actualizar'); return; }
  } else {
    const { error } = await window.comecomeSupabase
      .from('zonas')
      .insert([{ nombre, precio_envio: precio, activo }]);
    if (error) { mostrarMensaje('Error al crear'); return; }
  }

  modalInstancia.hide();
  cargarZonas();
}

async function toggleZona(id) {
  const { data: zona } = await window.comecomeSupabase
    .from('zonas')
    .select('activo')
    .eq('id', id)
    .single();
  if (!zona) return;

  await window.comecomeSupabase
    .from('zonas')
    .update({ activo: !zona.activo })
    .eq('id', id);
  cargarZonas();
}

async function eliminarZona(id) {
  const { error } = await window.comecomeSupabase
    .from('zonas')
    .delete()
    .eq('id', id);
  if (error) { mostrarMensaje('Error al eliminar'); return; }
  cargarZonas();
}

// --- Manejo del mapa (mejorado) ---
async function cargarMapa() {
  const { data } = window.comecomeSupabase
    .storage
    .from('mapa')
    .getPublicUrl('mapa_zonas');
  if (data && data.publicUrl) {
    const img = document.getElementById('mapa-img');
    // Agregamos un parámetro de tiempo para evitar caché del navegador
    img.src = data.publicUrl + '?t=' + new Date().getTime();
    img.classList.remove('d-none');
  }
}

async function subirMapa() {
  const archivo = document.getElementById('mapa-file').files[0];
  if (!archivo) {
    mostrarMensaje('Selecciona una imagen.');
    return;
  }

  // Validar que sea imagen
  if (!archivo.type.startsWith('image/')) {
    mostrarMensaje('El archivo debe ser una imagen.');
    return;
  }

  // Subir indicando el tipo de contenido y con el nombre fijo 'mapa_zonas'
  const { error } = await window.comecomeSupabase
    .storage
    .from('mapa')
    .upload('mapa_zonas', archivo, {
      upsert: true,
      contentType: archivo.type
    });

  if (error) {
    mostrarMensaje('Error al subir: ' + error.message);
    return;
  }

  cargarMapa();
  mostrarMensaje('Mapa actualizado correctamente.');

  // Limpiar el input
  document.getElementById('mapa-file').value = '';
}

function mostrarMensaje(texto) {
  const contenedor = document.querySelector('main');
  const aviso = document.createElement('div');
  aviso.className = 'alert alert-warning py-2 text-center';
  aviso.textContent = texto;
  contenedor.prepend(aviso);
  setTimeout(() => aviso.remove(), 3000);
}