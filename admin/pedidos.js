let pedidosData = [];
let seleccionados = new Set();

async function cargarPedidos() {
  const { data, error } = await window.comecomeSupabase
    .from('pedidos')
    .select('*')
    .order('created_at', { ascending: false });

  const container = document.getElementById('pedidos-container');
  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">No hay pedidos aún.</p>';
    pedidosData = [];
    seleccionados.clear();
    actualizarBotonEliminar();
    actualizarBotonSeleccionarTodos();
    return;
  }

  pedidosData = data;
  const idsActuales = new Set(data.map(p => p.id));
  seleccionados = new Set([...seleccionados].filter(id => idsActuales.has(id)));
  renderPedidos();
  actualizarBotonEliminar();
  actualizarBotonSeleccionarTodos();
}

function renderPedidos() {
  const container = document.getElementById('pedidos-container');

  container.innerHTML = pedidosData.map(p => {
    const items = Array.isArray(p.items) ? p.items : [];
    const fecha = new Date(p.created_at).toLocaleString('es-CU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    const estaSeleccionado = seleccionados.has(p.id);

    return `
    <div class="pedido-item" id="pedido-${p.id}">
      <button class="btn-seleccion ${estaSeleccionado ? 'activo' : ''}" onclick="togglePedido('${p.id}', this)" title="Seleccionar pedido">
        <i class="bi ${estaSeleccionado ? 'bi-check-square-fill' : 'bi-square'}"></i>
      </button>
      <div class="pedido-contenido">
        <div class="pedido-header">
          <span class="pedido-cliente"><i class="bi bi-person-fill"></i> ${p.nombre}</span>
          <span class="pedido-hora"><i class="bi bi-clock"></i> ${fecha}</span>
        </div>
        <div class="pedido-detalles">
          <span><i class="bi bi-telephone"></i> ${p.telefono}</span>
          <span><i class="bi bi-geo-alt"></i> ${p.direccion}</span>
          ${p.referencia ? `<span><i class="bi bi-signpost"></i> ${p.referencia}</span>` : ''}
          <span><i class="bi bi-truck"></i> ${p.zona}</span>
          <span><i class="bi bi-cash"></i> ${p.metodo_pago}</span>
        </div>
        <div class="pedido-items">
          ${items.map(i => `
            <div class="pedido-item-producto">
              <span>${i.cantidad}x ${i.nombre} ${i.extras ? `(${i.extras})` : ''}</span>
              <span>${(i.precio * i.cantidad).toFixed(2)} CUP</span>
            </div>
          `).join('')}
        </div>
        <div class="pedido-footer">
          <span class="pedido-total">${parseFloat(p.total).toFixed(2)} CUP</span>
          <div class="d-flex align-items-center gap-2">
            <span class="estado-badge estado-${p.estado}"><i class="bi bi-circle-fill me-1"></i>${p.estado}</span>
            <button class="btn btn-outline-amarillo btn-sm" onclick="cambiarEstado('${p.id}', '${p.estado}')" title="Siguiente estado"><i class="bi bi-arrow-right-circle"></i></button>
          </div>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

function togglePedido(id, boton) {
  if (seleccionados.has(id)) {
    seleccionados.delete(id);
    boton.classList.remove('activo');
    boton.innerHTML = '<i class="bi bi-square"></i>';
  } else {
    seleccionados.add(id);
    boton.classList.add('activo');
    boton.innerHTML = '<i class="bi bi-check-square-fill"></i>';
  }
  actualizarBotonEliminar();
  actualizarBotonSeleccionarTodos();
}

function toggleSeleccionarTodos() {
  if (seleccionados.size === pedidosData.length && pedidosData.length > 0) {
    seleccionados.clear();
    document.querySelectorAll('.btn-seleccion').forEach(btn => {
      btn.classList.remove('activo');
      btn.innerHTML = '<i class="bi bi-square"></i>';
    });
  } else {
    pedidosData.forEach(p => seleccionados.add(p.id));
    document.querySelectorAll('.btn-seleccion').forEach(btn => {
      btn.classList.add('activo');
      btn.innerHTML = '<i class="bi bi-check-square-fill"></i>';
    });
  }
  actualizarBotonEliminar();
  actualizarBotonSeleccionarTodos();
}

function actualizarBotonEliminar() {
  const btn = document.getElementById('btn-eliminar-seleccionados');
  const span = document.getElementById('cantidad-seleccionados');
  if (seleccionados.size > 0) {
    btn.classList.remove('d-none');
    span.textContent = seleccionados.size;
  } else {
    btn.classList.add('d-none');
  }
}

function actualizarBotonSeleccionarTodos() {
  const btn = document.getElementById('btn-seleccionar-todos');
  const icono = btn.querySelector('i');
  const texto = btn.querySelector('span');
  if (pedidosData.length > 0 && seleccionados.size === pedidosData.length) {
    btn.classList.add('activo');
    icono.className = 'bi bi-check-square-fill';
    texto.textContent = 'Deseleccionar todos';
  } else {
    btn.classList.remove('activo');
    icono.className = 'bi bi-check-square';
    texto.textContent = 'Seleccionar todos';
  }
}

async function eliminarSeleccionados() {
  if (seleccionados.size === 0) return;

  // Mostrar modal de confirmación personalizado
  const modalEl = document.getElementById('confirmarEliminarModal');
  const mensaje = document.getElementById('confirmar-mensaje');
  mensaje.textContent = `¿Eliminar ${seleccionados.size} pedido(s)?`;
  const modal = new bootstrap.Modal(modalEl);
  modal.show();

  // Configurar botón de confirmación dentro del modal
  document.getElementById('btn-confirmar-eliminar').onclick = async () => {
    modal.hide();
    const ids = [...seleccionados];
    const { error } = await window.comecomeSupabase
      .from('pedidos')
      .delete()
      .in('id', ids);

    if (error) {
      mostrarMensaje('Error al eliminar: ' + error.message);
      return;
    }

    seleccionados.clear();
    cargarPedidos();
  };
}

async function cambiarEstado(id, estadoActual) {
  const siguiente = {
    'pendiente': 'confirmado',
    'confirmado': 'preparado',
    'preparado': 'entregado'
  };
  const nuevoEstado = siguiente[estadoActual];
  if (!nuevoEstado) return;

  const { error } = await window.comecomeSupabase
    .from('pedidos')
    .update({ estado: nuevoEstado })
    .eq('id', id);

  if (error) {
    mostrarMensaje('Error: ' + error.message);
    return;
  }
  cargarPedidos();
}

function mostrarMensaje(texto) {
  const contenedor = document.querySelector('main');
  const aviso = document.createElement('div');
  aviso.className = 'alert alert-warning py-2 text-center';
  aviso.textContent = texto;
  contenedor.prepend(aviso);
  setTimeout(() => aviso.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', cargarPedidos);
setInterval(cargarPedidos, 30000);