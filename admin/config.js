document.addEventListener('DOMContentLoaded', async () => {
  await cargarConfig();
  document.getElementById('btn-guardar').addEventListener('click', guardarConfig);
});

async function cargarConfig() {
  const { data, error } = await window.comecomeSupabase
    .from('configuracion')
    .select('recargo_transferencia')
    .single();
  if (error || !data) {
    mostrarMensaje('Error al cargar configuración');
    return;
  }
  document.getElementById('recargo-transferencia').value = data.recargo_transferencia;
}

async function guardarConfig() {
  const recargo = parseFloat(document.getElementById('recargo-transferencia').value);
  if (isNaN(recargo) || recargo < 0) {
    mostrarMensaje('Ingresa un valor válido.');
    return;
  }

  const { error } = await window.comecomeSupabase
    .from('configuracion')
    .update({ recargo_transferencia: recargo })
    .eq('id', 1);

  if (error) {
    mostrarMensaje('Error al guardar: ' + error.message);
    return;
  }
  mostrarMensaje('Configuración actualizada.');
}

function mostrarMensaje(texto) {
  const contenedor = document.querySelector('main');
  const aviso = document.createElement('div');
  aviso.className = 'alert alert-warning py-2 text-center';
  aviso.textContent = texto;
  contenedor.prepend(aviso);
  setTimeout(() => aviso.remove(), 3000);
}
