let rangoEditando = null;
let modalInstancia = null;

document.addEventListener('DOMContentLoaded', () => {
  modalInstancia = new bootstrap.Modal(document.getElementById('rangoModal'));
  document.getElementById('btn-guardar').addEventListener('click', guardarRango);
  document.getElementById('rangoModal').addEventListener('hidden.bs.modal', () => {
    document.activeElement?.blur();
  });
  cargarRangos();
});

async function cargarRangos() {
  const { data, error } = await window.comecomeSupabase
    .from('rangos_envio')
    .select('*')
    .order('anillo');

  const container = document.getElementById('rangos-container');
  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">No hay rangos configurados.</p>';
    return;
  }

  container.innerHTML = data.map(r => `
    <div class="rango-item">
      <div class="rango-info">
        <span class="rango-anillo">
          <i class="bi bi-circle-fill" style="color: ${r.anillo === 1 ? '#198754' : r.anillo === 2 ? '#ffc107' : r.anillo === 3 ? '#fd7e14' : '#dc3545'}"></i>
          Anillo ${r.anillo} — ${r.clasificacion}
        </span>
        <span class="rango-detalles">${r.rango_km} — ${parseFloat(r.tarifa).toFixed(2)} CUP</span>
        <span class="rango-detalles text-muted small">${r.destinos}</span>
        <span class="${r.activo ? 'text-success' : 'text-danger'}">${r.activo ? 'Activo' : 'Inactivo'}</span>
      </div>
      <div class="rango-acciones">
        <button class="btn btn-outline-amarillo btn-sm" onclick="abrirModalEditar('${r.id}')"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-outline-amarillo btn-sm" onclick="toggleRango('${r.id}')"><i class="bi ${r.activo ? 'bi-eye-slash' : 'bi-eye'}"></i></button>
        <button class="btn btn-outline-amarillo btn-sm" onclick="eliminarRango('${r.id}')"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `).join('');
}

function abrirModalNuevo() {
  rangoEditando = null;
  document.getElementById('modal-titulo').textContent = 'Nuevo rango';
  document.getElementById('rango-id').value = '';
  document.getElementById('rango-anillo').value = '';
  document.getElementById('rango-clasificacion').value = '';
  document.getElementById('rango-km').value = '';
  document.getElementById('rango-tarifa').value = '';
  document.getElementById('rango-destinos').value = '';
  document.getElementById('rango-activo').checked = true;
  modalInstancia.show();
}

async function abrirModalEditar(id) {
  const { data, error } = await window.comecomeSupabase
    .from('rangos_envio')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return;

  rangoEditando = data;
  document.getElementById('modal-titulo').textContent = 'Editar rango';
  document.getElementById('rango-id').value = data.id;
  document.getElementById('rango-anillo').value = data.anillo;
  document.getElementById('rango-clasificacion').value = data.clasificacion;
  document.getElementById('rango-km').value = data.rango_km;
  document.getElementById('rango-tarifa').value = data.tarifa;
  document.getElementById('rango-destinos').value = data.destinos;
  document.getElementById('rango-activo').checked = data.activo;
  modalInstancia.show();
}

async function guardarRango() {
  const id = document.getElementById('rango-id').value;
  const anillo = parseInt(document.getElementById('rango-anillo').value);
  const clasificacion = document.getElementById('rango-clasificacion').value.trim();
  const rango_km = document.getElementById('rango-km').value.trim();
  const tarifa = parseFloat(document.getElementById('rango-tarifa').value);
  const destinos = document.getElementById('rango-destinos').value.trim();
  const activo = document.getElementById('rango-activo').checked;

  if (!clasificacion || !rango_km || isNaN(tarifa) || !destinos || isNaN(anillo)) {
    mostrarMensaje('Completa todos los campos.');
    return;
  }

  if (id) {
    const { error } = await window.comecomeSupabase
      .from('rangos_envio')
      .update({ anillo, clasificacion, rango_km, tarifa, destinos, activo })
      .eq('id', id);
    if (error) { mostrarMensaje('Error al actualizar'); return; }
  } else {
    const { error } = await window.comecomeSupabase
      .from('rangos_envio')
      .insert([{ anillo, clasificacion, rango_km, tarifa, destinos, activo }]);
    if (error) { mostrarMensaje('Error al crear'); return; }
  }

  modalInstancia.hide();
  cargarRangos();
}

async function toggleRango(id) {
  const { data: rango } = await window.comecomeSupabase
    .from('rangos_envio')
    .select('activo')
    .eq('id', id)
    .single();
  if (!rango) return;

  await window.comecomeSupabase
    .from('rangos_envio')
    .update({ activo: !rango.activo })
    .eq('id', id);
  cargarRangos();
}

async function eliminarRango(id) {
  const { error } = await window.comecomeSupabase
    .from('rangos_envio')
    .delete()
    .eq('id', id);
  if (error) { mostrarMensaje('Error al eliminar'); return; }
  cargarRangos();
}

function mostrarMensaje(texto) {
  const contenedor = document.querySelector('main');
  const aviso = document.createElement('div');
  aviso.className = 'alert alert-warning py-2 text-center';
  aviso.textContent = texto;
  contenedor.prepend(aviso);
  setTimeout(() => aviso.remove(), 3000);
  }
