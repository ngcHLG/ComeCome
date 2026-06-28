let modalInstancia = null;
let horarioEditando = null;

document.addEventListener('DOMContentLoaded', () => {
  modalInstancia = new bootstrap.Modal(document.getElementById('horarioModal'));
  document.getElementById('btn-guardar').addEventListener('click', guardarHorario);
  document.getElementById('horario-abierto').addEventListener('change', toggleCamposHora);
  cargarHorarios();
});

function toggleCamposHora() {
  const abierto = document.getElementById('horario-abierto').checked;
  document.getElementById('horario-apertura').disabled = abierto;   // Si forzamos abierto, no necesitamos horas
  document.getElementById('horario-cierre').disabled = abierto;
}

function estaAbiertoAhora(horario) {
  // Si el toggle manual está activado, siempre abierto
  if (horario.abierto) return true;
  // Si no tiene horas definidas, cerrado
  if (!horario.hora_apertura || !horario.hora_cierre) return false;
  
  const ahora = new Date();
  const diaSemana = ahora.getDay();
  if (horario.dia_semana !== diaSemana) return false; // solo evaluamos el día actual

  const horaActual = ahora.getHours() + ahora.getMinutes() / 60;
  const [hA, mA] = horario.hora_apertura.split(':').map(Number);
  const [hC, mC] = horario.hora_cierre.split(':').map(Number);
  const apertura = hA + mA / 60;
  const cierre = hC + mC / 60;

  return horaActual >= apertura && horaActual < cierre;
}

async function cargarHorarios() {
  const { data, error } = await window.comecomeSupabase
    .from('horarios')
    .select('*')
    .order('dia_semana');

  const container = document.getElementById('horarios-container');
  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">No hay horarios configurados.</p>';
    return;
  }

  container.innerHTML = data.map(h => {
    const abiertoAhora = estaAbiertoAhora(h);
    return `
    <div class="horario-item">
      <div class="horario-info">
        <span class="horario-dia">${h.nombre_dia}</span>
        <span class="horario-horas">
          ${h.abierto ? 'Abierto forzado' : (h.hora_apertura ? `${h.hora_apertura?.slice(0,5)} - ${h.hora_cierre?.slice(0,5)}` : 'Cerrado')}
        </span>
        <span class="horario-automatico ${abiertoAhora ? 'text-success' : 'text-danger'}">
          <i class="bi ${abiertoAhora ? 'bi-unlock-fill' : 'bi-lock-fill'}"></i> 
          ${abiertoAhora ? 'Abierto ahora' : 'Cerrado ahora'}
        </span>
      </div>
      <div class="horario-acciones">
        <button class="btn btn-outline-amarillo btn-sm" onclick="abrirModal('${h.id}')" title="Editar"><i class="bi bi-pencil"></i></button>
      </div>
    </div>`;
  }).join('');
}

async function abrirModal(id) {
  const { data, error } = await window.comecomeSupabase
    .from('horarios')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return;

  horarioEditando = data;
  document.getElementById('horario-id').value = data.id;
  document.getElementById('horario-dia').value = data.nombre_dia;
  document.getElementById('horario-abierto').checked = data.abierto;
  document.getElementById('horario-apertura').value = data.hora_apertura?.slice(0,5) || '12:00';
  document.getElementById('horario-cierre').value = data.hora_cierre?.slice(0,5) || '23:00';
  toggleCamposHora();
  modalInstancia.show();
}

async function guardarHorario() {
  const id = document.getElementById('horario-id').value;
  const abierto = document.getElementById('horario-abierto').checked;
  const hora_apertura = abierto ? null : document.getElementById('horario-apertura').value;
  const hora_cierre = abierto ? null : document.getElementById('horario-cierre').value;

  const { error } = await window.comecomeSupabase
    .from('horarios')
    .update({ abierto, hora_apertura, hora_cierre })
    .eq('id', id);

  if (error) {
    mostrarMensaje('Error: ' + error.message);
    return;
  }

  modalInstancia.hide();
  cargarHorarios();
}

function mostrarMensaje(texto) {
  const contenedor = document.querySelector('main');
  const aviso = document.createElement('div');
  aviso.className = 'alert alert-warning py-2 text-center';
  aviso.textContent = texto;
  contenedor.prepend(aviso);
  setTimeout(() => aviso.remove(), 3000);
}