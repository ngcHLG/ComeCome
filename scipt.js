(function() { var noop = function() {}; console.log = noop; console.warn = noop; console.error = noop; console.info = noop; })();

document.addEventListener('DOMContentLoaded', function() {
  const yearSpan = document.getElementById('copyright-text');
  if (yearSpan) {
    const currentYear = new Date().getFullYear();
    yearSpan.textContent = `© ${currentYear} COMECOME`;
  }
});

const SUPABASE_URL = 'https://xjjbrnjgpncxwqishseo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_e68llCL_CYuf2M9TyVcdWA_HdMDYpVF';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const NTFY_TOPIC = 'comecome_8f3js9f83jf93jf';

let todasCategorias = [];
let todosProductos = [];
let hayCombosActivos = false;
let categoriaActiva = 'todas';
let carrito = [];
let horarioAbierto = true;
let recargoTransferencia = 0;
let repartosDisponibles = [];

let carritoOffcanvasInstance = null;
let datosOffcanvasInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  const carritoEl = document.getElementById('carritoOffcanvas');
  const datosEl = document.getElementById('datosOffcanvas');
  if (carritoEl) carritoOffcanvasInstance = bootstrap.Offcanvas.getOrCreateInstance(carritoEl);
  if (datosEl) datosOffcanvasInstance = bootstrap.Offcanvas.getOrCreateInstance(datosEl);

  await cargarConfiguracion();
  await cargarCategorias();
  await cargarProductos();
  await verificarCombosActivos();
  await cargarRepartosEnvio();
  renderCategorias();
  await verificarHorario();
  renderProductos();

  document.getElementById('metodo-pago').addEventListener('change', () => {
    actualizarInfoRecargo();
    actualizarCarrito();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.reparto-autocomplete')) {
      document.getElementById('reparto-sugerencias').classList.remove('show');
    }
  });

  setInterval(async () => {
    await verificarHorario();
    if (categoriaActiva === 'combos') {
      cargarCombosPublicos();
    } else {
      renderProductos();
    }
  }, 60000);

  document.getElementById('btn-checkout').addEventListener('click', () => {
    if (carrito.length === 0) return;
    if (carritoOffcanvasInstance) carritoOffcanvasInstance.hide();
    document.getElementById('nombre').value = '';
    document.getElementById('telefono').value = '';
    document.getElementById('direccion').value = '';
    document.getElementById('referencia').value = '';
    document.getElementById('checkout-error').style.display = 'none';
    if (datosOffcanvasInstance) datosOffcanvasInstance.show();
  });

  document.getElementById('confirmar-pedido').addEventListener('click', async () => {
    await confirmarPedido();
  });
});

async function cargarConfiguracion() {
  const { data } = await supabaseClient.from('configuracion').select('recargo_transferencia').single();
  if (data) {
    recargoTransferencia = parseFloat(data.recargo_transferencia) || 0;
    actualizarInfoRecargo();
  }
}

function actualizarInfoRecargo() {
  const metodo = document.getElementById('metodo-pago').value;
  const info = document.getElementById('recargo-info');
  if (metodo === 'transferencia' && recargoTransferencia > 0) {
    info.textContent = `RECARGO: ${recargoTransferencia}%`;
    info.classList.remove('d-none');
  } else {
    info.classList.add('d-none');
  }
}

async function cargarCategorias() {
  const { data } = await supabaseClient.from('categorias').select('*').order('nombre');
  if (data) todasCategorias = data;
}

async function cargarProductos() {
  const { data } = await supabaseClient.from('productos').select('*, categorias(nombre)').eq('activo', true).order('nombre');
  if (data) todosProductos = data;
}

async function verificarCombosActivos() {
  const { data } = await supabaseClient.from('combos').select('id').eq('activo', true).limit(1);
  hayCombosActivos = data && data.length > 0;
}

async function cargarRepartosEnvio() {
  const { data, error } = await supabaseClient.from('repartos').select('*').eq('activo', true).order('nombre');
  if (!error && data) repartosDisponibles = data;
  else repartosDisponibles = [];
}

function mostrarSugerencias() {
  if (repartosDisponibles.length > 0 && !document.getElementById('reparto-id').value) {
    filtrarRepartos();
  }
}

function filtrarRepartos() {
  const input = document.getElementById('reparto-input');
  const sugerencias = document.getElementById('reparto-sugerencias');
  const texto = input.value.toLowerCase().trim();

  let filtrados = repartosDisponibles;
  if (texto) {
    filtrados = repartosDisponibles.filter(r => r.nombre.toLowerCase().includes(texto));
  }

  if (filtrados.length === 0) {
    sugerencias.innerHTML = '<div class="reparto-opcion text-muted">ZONA NO ENCONTRADA</div>';
  } else {
    sugerencias.innerHTML = filtrados.map(r => `
      <div class="reparto-opcion" onclick="seleccionarReparto('${r.id}', '${r.nombre}', ${r.precio})">
        <span class="nombre">${r.nombre}</span>
        <span class="precio">+${parseFloat(r.precio).toFixed(2)}</span>
      </div>
    `).join('');
  }
  sugerencias.classList.add('show');
}

function seleccionarReparto(id, nombre, precio) {
  document.getElementById('reparto-id').value = id;
  document.getElementById('reparto-precio').value = precio;
  document.getElementById('reparto-input').value = '';
  document.getElementById('reparto-sugerencias').classList.remove('show');
  document.getElementById('reparto-seleccionado-texto').textContent = `${nombre} +${parseFloat(precio).toFixed(2)}`;
  document.getElementById('reparto-seleccionado').classList.remove('d-none');
  document.getElementById('reparto-input').classList.add('d-none');
  actualizarCarrito();
}

function limpiarReparto() {
  document.getElementById('reparto-id').value = '';
  document.getElementById('reparto-precio').value = '';
  document.getElementById('reparto-input').value = '';
  document.getElementById('reparto-seleccionado').classList.add('d-none');
  document.getElementById('reparto-input').classList.remove('d-none');
  document.getElementById('reparto-sugerencias').classList.remove('show');
  actualizarCarrito();
}

function renderCategorias() {
  const container = document.getElementById('categorias-container');
  let html = `<button class="btn-categoria active" onclick="filtrarPorCategoria('todas', this)">TODAS</button>`;
  if (hayCombosActivos) html += `<button class="btn-categoria" onclick="filtrarPorCategoria('combos', this)">COMBOS</button>`;
  const categoriasConProductos = todasCategorias.filter(cat => todosProductos.some(prod => prod.categoria_id === cat.id));
  categoriasConProductos.forEach(cat => { html += `<button class="btn-categoria" onclick="filtrarPorCategoria('${cat.id}', this)">${cat.nombre.toUpperCase()}</button>`; });
  container.innerHTML = html;
}

function filtrarPorCategoria(catId, el) {
  categoriaActiva = catId;
  document.querySelectorAll('.btn-categoria').forEach(btn => btn.classList.remove('active'));
  el.classList.add('active');
  if (catId === 'combos') cargarCombosPublicos(); else renderProductos();
}

function renderProductos() {
  const container = document.getElementById('productos-container');
  let prods = categoriaActiva === 'todas' ? todosProductos : todosProductos.filter(p => p.categoria_id === categoriaActiva);
  if (prods.length === 0) { container.innerHTML = '<p class="text-muted">VACÍO.</p>'; return; }
  container.innerHTML = prods.map(p => `
    <div class="col"><div class="card card-producto h-100"><div class="producto-media position-relative">${p.foto_url ? `<img src="${p.foto_url}" class="card-img-top" alt="${p.nombre}">` : `<div class="producto-sin-foto"><i class="bi bi-controller"></i></div>`}<button class="btn-add-flotante" onclick="agregarAlCarrito('${p.id}')" ${horarioAbierto ? '' : 'disabled'} aria-label="Añadir"><i class="bi bi-plus-lg"></i></button></div><div class="card-body"><h5 class="card-title">${p.nombre}</h5><p class="card-text">${p.descripcion || ''}</p><span class="precio-pill">${parseFloat(p.precio).toFixed(2)} CUP</span></div></div></div>`).join('');
}

async function cargarCombosPublicos() {
  const container = document.getElementById('productos-container');
  container.innerHTML = '<div class="col"><div class="skeleton skeleton-card"></div></div><div class="col"><div class="skeleton skeleton-card"></div></div>';
  const { data: combos, error } = await supabaseClient.from('combos').select('*').eq('activo', true).order('nombre');
  if (error || !combos || combos.length === 0) { container.innerHTML = '<p class="text-muted">NO HAY COMBOS.</p>'; return; }
  let html = '';
  for (const combo of combos) {
    const { data: items } = await supabaseClient.from('combo_items').select('*, productos(nombre, precio)').eq('combo_id', combo.id);
    const totalOriginal = (items || []).reduce((s, i) => s + (parseFloat(i.productos.precio) * i.cantidad), 0);
    let precioFinal = totalOriginal;
    if (combo.tipo_descuento === 'porcentaje') precioFinal = totalOriginal * (1 - combo.valor_descuento / 100);
    else if (combo.tipo_descuento === 'fijo') precioFinal = parseFloat(combo.valor_descuento);
    const listaProductos = (items || []).map(i => `${i.cantidad}x ${i.productos.nombre}`).join(', ');
    html += `<div class="col"><div class="card card-producto h-100"><div class="producto-media position-relative"><div class="producto-sin-foto"><i class="bi bi-star-fill"></i></div><span class="badge-oferta">${combo.tipo_descuento === 'porcentaje' ? '-' + combo.valor_descuento + '%' : 'OFERTA'}</span><button class="btn-add-flotante" onclick="agregarComboAlCarrito('${combo.id}')" ${horarioAbierto ? '' : 'disabled'}><i class="bi bi-plus-lg"></i></button></div><div class="card-body"><h5 class="card-title">${combo.nombre}</h5><p class="card-text">${listaProductos}</p><div class="d-flex align-items-center gap-2"><s class="text-muted small">${totalOriginal.toFixed(2)}</s><span class="precio-pill">${precioFinal.toFixed(2)} CUP</span></div></div></div></div>`;
  }
  container.innerHTML = html;
}

async function verificarHorario() {
  const ahora = new Date(); const diaSemana = ahora.getDay(); const horaActual = ahora.getHours() + ahora.getMinutes() / 60;
  const { data } = await supabaseClient.from('horarios').select('abierto, hora_apertura, hora_cierre').eq('dia_semana', diaSemana).single();
  let textoHorario = 'CERRADO HOY.';
  if (data) {
    if (data.abierto) { horarioAbierto = true; textoHorario = ''; }
    else if (data.hora_apertura && data.hora_cierre && data.hora_apertura !== data.hora_cierre) {
      const [hA, mA] = data.hora_apertura.split(':').map(Number); const [hC, mC] = data.hora_cierre.split(':').map(Number);
      const apertura = hA + mA / 60; const cierre = hC + mC / 60;
      horarioAbierto = horaActual >= apertura && horaActual < cierre;
      if (!horarioAbierto) textoHorario = `DISPONIBLE DE ${data.hora_apertura.slice(0,5)} A ${data.hora_cierre.slice(0,5)}.`;
    } else { horarioAbierto = false; textoHorario = 'CERRADO HOY.'; }
  } else { horarioAbierto = false; textoHorario = 'CERRADO HOY.'; }
  document.getElementById('horario-aviso').classList.toggle('d-none', horarioAbierto);
  document.getElementById('horario-texto').textContent = textoHorario;
}

function agregarAlCarrito(idProducto) {
  const producto = todosProductos.find(p => p.id === idProducto); if (!producto) return;
  const grupo = carrito.find(item => item.id === idProducto && !item.esCombo);
  if (grupo) grupo.cantidad++;
  else carrito.push({ id: producto.id, nombre: producto.nombre, precio: parseFloat(producto.precio), foto: producto.foto_url, permiteExtras: producto.permite_extras, cantidad: 1, extras: '', esCombo: false });
  actualizarCarrito();
}

async function agregarComboAlCarrito(comboId) {
  const { data: combo } = await supabaseClient.from('combos').select('*').eq('id', comboId).single(); if (!combo) return;
  const { data: items } = await supabaseClient.from('combo_items').select('*, productos(nombre, precio)').eq('combo_id', comboId);
  const totalOriginal = (items || []).reduce((s, i) => s + (parseFloat(i.productos.precio) * i.cantidad), 0);
  let precioFinal = totalOriginal;
  if (combo.tipo_descuento === 'porcentaje') precioFinal = totalOriginal * (1 - combo.valor_descuento / 100);
  else if (combo.tipo_descuento === 'fijo') precioFinal = parseFloat(combo.valor_descuento);
  const comboItem = { id: combo.id, nombre: combo.nombre, precio: precioFinal, permiteExtras: false, cantidad: 1, extras: '', esCombo: true };
  const grupo = carrito.find(item => item.id === combo.id && item.esCombo);
  if (grupo) grupo.cantidad++; else carrito.push(comboItem);
  actualizarCarrito();
}

function cambiarCantidad(index, delta) {
  if (index < 0 || index >= carrito.length) return;
  carrito[index].cantidad += delta;
  if (carrito[index].cantidad <= 0) carrito.splice(index, 1);
  actualizarCarrito();
}

function actualizarCarrito() {
  const lista = document.getElementById('carrito-lista');
  const totalSpan = document.getElementById('total-pedido');
  const countBadge = document.getElementById('cart-count');
  const btnCheckout = document.getElementById('btn-checkout');

  lista.innerHTML = carrito.map((item, index) => `
    <div class="list-group-item carrito-item"><div class="w-100"><div class="d-flex justify-content-between align-items-start"><strong>${item.nombre} ${item.esCombo ? '<small>(C)</small>' : ''}</strong><span class="text-white">${(item.precio * item.cantidad).toFixed(2)}</span></div><div class="d-flex justify-content-between align-items-center mt-3"><div class="stepper"><button type="button" onclick="cambiarCantidad(${index}, -1)">-</button><span class="text-white mx-2">${item.cantidad}</span><button type="button" onclick="cambiarCantidad(${index}, 1)">+</button></div><button class="btn btn-sm text-danger" onclick="eliminarDelCarrito(${index})"><i class="bi bi-trash-fill"></i></button></div>${!item.esCombo && item.permiteExtras ? `<input type="text" class="form-control form-control-sm mt-3 input-arcade" placeholder="EXTRAS..." value="${item.extras}" oninput="actualizarExtras(${index}, this.value)">` : ''}</div></div>`).join('') || `<div class="text-center py-4"><i class="bi bi-controller fs-1 text-muted"></i><p class="mt-2 mb-0 text-muted">INSERT COIN</p></div>`;

  const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  document.getElementById('subtotal-carrito').textContent = subtotal.toFixed(2);

  const metodoPago = document.getElementById('metodo-pago').value;
  let recargo = 0;
  if (metodoPago === 'transferencia' && recargoTransferencia > 0) {
    recargo = subtotal * (recargoTransferencia / 100);
    document.getElementById('recargo-aplicado').textContent = recargo.toFixed(2);
    document.getElementById('recargo-desglose').classList.remove('d-none');
  } else {
    document.getElementById('recargo-desglose').classList.add('d-none');
  }

  const precioEnvio = parseFloat(document.getElementById('reparto-precio').value) || 0;
  let envio = 0;
  if (precioEnvio > 0) {
    envio = precioEnvio;
    document.getElementById('envio-aplicado').textContent = envio.toFixed(2);
    document.getElementById('envio-desglose').classList.remove('d-none');
  } else {
    document.getElementById('envio-desglose').classList.add('d-none');
  }

  const total = subtotal + recargo + envio;
  totalSpan.textContent = total.toFixed(2) + ' CUP';

  const nuevoConteo = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  countBadge.textContent = nuevoConteo;

  btnCheckout.disabled = carrito.length === 0 || !document.getElementById('reparto-id').value;
}

function actualizarExtras(index, valor) { if (index >= 0 && index < carrito.length) carrito[index].extras = valor; }
function eliminarDelCarrito(index) { carrito.splice(index, 1); actualizarCarrito(); }

async function confirmarPedido() {
  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const direccion = document.getElementById('direccion').value.trim();
  const referencia = document.getElementById('referencia').value.trim();
  const errorDiv = document.getElementById('checkout-error');
  const errorText = document.getElementById('error-text');

  if (!nombre || !telefono || !direccion) {
    errorText.textContent = 'FALTAN DATOS.';
    errorDiv.style.display = 'block';
    return;
  }
  errorDiv.style.display = 'none';

  const metodoPago = document.getElementById('metodo-pago').value;
  const zonaTexto = document.getElementById('reparto-seleccionado-texto')?.textContent || 'DOMICILIO';
  const totalPedido = parseFloat(document.getElementById('total-pedido').textContent);

  const { error: errorPedido } = await supabaseClient.from('pedidos').insert([{
    nombre, telefono, direccion, referencia: referencia || null, metodo_pago: metodoPago,
    zona: zonaTexto, total: totalPedido,
    items: carrito.map(item => ({ nombre: item.nombre, precio: item.precio, cantidad: item.cantidad, extras: item.extras || null, esCombo: item.esCombo || false })),
    estado: 'pendiente'
  }]);

  if (errorPedido) {
    errorText.textContent = 'GAME OVER. ERROR DE RED.';
    errorDiv.style.display = 'block';
    return;
  }

  const productosTexto = carrito.map(item => { const extra = item.extras ? ` (${item.extras})` : ''; return `${item.cantidad}x ${item.nombre}${extra} — ${(item.precio * item.cantidad).toFixed(2)} CUP`; }).join('\n');
  const mensajeNtfy = `👾 NUEVO PEDIDO — COMECOME\n👤 ${nombre}\n📞 ${telefono}\n📍 ${direccion}${referencia ? '\n📌 Ref: ' + referencia : ''}\n🛵 Entrega: ${zonaTexto}\n💳 Pago: ${metodoPago}\n────────────────\n${productosTexto}\n────────────────\n💰 TOTAL: ${totalPedido.toFixed(2)} CUP`;
  fetch(`https://ntfy.sh/${NTFY_TOPIC}`, { method: 'POST', body: mensajeNtfy }).catch(() => {});

  if (datosOffcanvasInstance) datosOffcanvasInstance.hide();
  setTimeout(() => { const toast = new bootstrap.Toast(document.getElementById('toastPedido')); toast.show(); }, 300);
  carrito = [];
  actualizarCarrito();
}
