let repartoEditando = null;
let modalInstancia = null;

document.addEventListener('DOMContentLoaded', () => {
  modalInstancia = new bootstrap.Modal(document.getElementById('repartoModal'));
  document.getElementById('btn-guardar').addEventListener('click', guardarReparto);
  document.getElementById('repartoModal').addEventListener('hidden.bs.modal', () => {
    document.activeElement?.blur();
  });
  cargarRepartos();
});

async function cargarRepartos() {
  const { data, error } = await window.comecomeSupabase
    .from('repartos')
    .select('*')
    .order('nombre');

  const container = document.getElementById('repartos-container');
  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">No hay repartos configurados.</p>';
    return;
  }

  container.innerHTML = data.map(r => `
    <div class="reparto-item">
      <div class="reparto-info">
        <span class="reparto-nombre">${r.nombre}</span>
        <span class="reparto-detalles">${r.distancia} — +${parseFloat(r.precio).toFixed(2)} CUP</span>
        <span class="${r.activo ? 'text-success' : 'text-danger'}">${r.activo ? 'Activo' : 'Inactivo'}</span>
      </div>
      <div class="reparto-acciones">
        <button class="btn btn-outline-amarillo btn-sm" onclick="abrirModalEditar('${r.id}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-outline-amarillo btn-sm" onclick="toggleReparto('${r.id}')"><i class="bi ${r.activo ? 'bi-eye-slash' : 'bi-eye'}"></i></button>
        <button class="btn btn-outline-amarillo btn-sm" onclick="eliminarReparto('${r.id}')"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `).join('');
}

function abrirModalNuevo() {
  repartoEditando = null;
  document.getElementById('modal-titulo').textContent = 'Nuevo reparto';
  document.getElementById('reparto-id').value = '';
  document.getElementById('reparto-nombre').value = '';
  document.getElementById('reparto-distancia').value = '';
  document.getElementById('reparto-precio').value = '';
  document.getElementById('reparto-activo').checked = true;
  modalInstancia.show();
}

async function abrirModalEditar(id) {
  const { data, error } = await window.comecomeSupabase
    .from('repartos')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return;

  repartoEditando = data;
  document.getElementById('modal-titulo').textContent = 'Editar reparto';
  document.getElementById('reparto-id').value = data.id;
  document.getElementById('reparto-nombre').value = data.nombre;
  document.getElementById('reparto-distancia').value = data.distancia;
  document.getElementById('reparto-precio').value = data.precio;
  document.getElementById('reparto-activo').checked = data.activo;
  modalInstancia.show();
}

async function guardarReparto() {
  const id = document.getElementById('reparto-id').value;
  const nombre = document.getElementById('reparto-nombre').value.trim();
  const distancia = document.getElementById('reparto-distancia').value.trim();
  const precio = parseFloat(document.getElementById('reparto-precio').value);
  const activo = document.getElementById('reparto-activo').checked;

  if (!nombre || !distancia || isNaN(precio) || precio < 0) {
    mostrarMensaje('Completa todos los campos correctamente.');
    return;
  }

  if (id) {
    const { error } = await window.comecomeSupabase
      .from('repartos')
      .update({ nombre, distancia, precio, activo })
      .eq('id', id);
    if (error) { mostrarMensaje('Error al actualizar'); return; }
  } else {
    const { error } = await window.comecomeSupabase
      .from('repartos')
      .insert([{ nombre, distancia, precio, activo }]);
    if (error) { mostrarMensaje('Error al crear'); return; }
  }

  modalInstancia.hide();
  cargarRepartos();
}

async function toggleReparto(id) {
  const { data: reparto } = await window.comecomeSupabase
    .from('repartos')
    .select('activo')
    .eq('id', id)
    .single();
  if (!reparto) return;

  await window.comecomeSupabase
    .from('repartos')
    .update({ activo: !reparto.activo })
    .eq('id', id);
  cargarRepartos();
}

async function eliminarReparto(id) {
  const { error } = await window.comecomeSupabase
    .from('repartos')
    .delete()
    .eq('id', id);
  if (error) { mostrarMensaje('Error al eliminar'); return; }
  cargarRepartos();
}

function mostrarMensaje(texto) {
  const contenedor = document.querySelector('main');
  const aviso = document.createElement('div');
  aviso.className = 'alert alert-warning py-2 text-center';
  aviso.textContent = texto;
  contenedor.prepend(aviso);
  setTimeout(() => aviso.remove(), 3000);
}
