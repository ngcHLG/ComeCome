let comboEditando = null;
let modalInstancia = null;
let productosDisponibles = [];

document.addEventListener('DOMContentLoaded', async () => {
  modalInstancia = new bootstrap.Modal(document.getElementById('comboModal'));
  document.getElementById('btn-guardar').addEventListener('click', guardarCombo);
  await cargarProductosDisponibles();
  cargarCombos();
});

async function cargarProductosDisponibles() {
  const { data } = await window.comecomeSupabase
    .from('productos')
    .select('id, nombre, precio')
    .eq('activo', true)
    .order('nombre');
  if (data) productosDisponibles = data;
}

function renderProductosCheckboxes(seleccionados = {}) {
  const cont = document.getElementById('productos-check-container');
  cont.innerHTML = productosDisponibles.map(prod => {
    const checked = seleccionados[prod.id] ? 'checked' : '';
    const cantidad = seleccionados[prod.id] || 1;
    return `
      <div class="producto-check">
        <div class="d-flex align-items-center">
          <input class="form-check-input me-2" type="checkbox" id="prod-${prod.id}" ${checked}>
          <label for="prod-${prod.id}">${prod.nombre} (${parseFloat(prod.precio).toFixed(2)} CUP)</label>
        </div>
        <input type="number" class="form-control form-control-sm producto-cantidad" value="${cantidad}" min="1" onchange="validarCantidad(this)">
      </div>
    `;
  }).join('');
}

function validarCantidad(input) {
  if (input.value < 1) input.value = 1;
}

async function cargarCombos() {
  const { data: combos, error } = await window.comecomeSupabase
    .from('combos')
    .select('*')
    .order('nombre');
  if (error || !combos) {
    document.getElementById('combos-container').innerHTML = '<p class="text-muted text-center">No hay combos creados.</p>';
    return;
  }

  const container = document.getElementById('combos-container');
  container.innerHTML = '';

  for (const combo of combos) {
    const { data: items } = await window.comecomeSupabase
      .from('combo_items')
      .select('*, productos(nombre, precio)')
      .eq('combo_id', combo.id);
    
    const productos = items || [];
    const totalOriginal = productos.reduce((sum, it) => sum + (parseFloat(it.productos.precio) * it.cantidad), 0);
    let precioFinal = totalOriginal;
    if (combo.tipo_descuento === 'porcentaje') {
      precioFinal = totalOriginal * (1 - combo.valor_descuento / 100);
    } else if (combo.tipo_descuento === 'fijo') {
      precioFinal = parseFloat(combo.valor_descuento);
    }

    container.innerHTML += `
      <div class="combo-item">
        <div class="combo-header">
          <span class="combo-nombre">${combo.nombre}</span>
          <span class="combo-descuento">
            ${combo.tipo_descuento === 'porcentaje' ? `-${combo.valor_descuento}%` : `Precio fijo: ${combo.valor_descuento} CUP`}
          </span>
          <span class="text-${combo.activo ? 'success' : 'danger'} small">${combo.activo ? 'Visible' : 'Oculto'}</span>
        </div>
        <div class="combo-productos">
          ${productos.map(it => `<div>${it.cantidad}x ${it.productos.nombre}</div>`).join('')}
        </div>
        <div class="combo-footer">
          <div class="combo-precios">
            <span class="precio-original">${totalOriginal.toFixed(2)} CUP</span>
            <span class="precio-final">${precioFinal.toFixed(2)} CUP</span>
          </div>
          <div class="combo-acciones">
            <button class="btn btn-outline-amarillo btn-sm" onclick="abrirModalEditar('${combo.id}')"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-amarillo btn-sm" onclick="toggleVisibilidadCombo('${combo.id}')"><i class="bi ${combo.activo ? 'bi-eye-slash' : 'bi-eye'}"></i></button>
            <button class="btn btn-outline-amarillo btn-sm" onclick="eliminarCombo('${combo.id}')"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      </div>
    `;
  }
}

function abrirModalNuevo() {
  comboEditando = null;
  document.getElementById('modal-titulo').textContent = 'Nuevo combo';
  document.getElementById('combo-id').value = '';
  document.getElementById('combo-nombre').value = '';
  document.getElementById('combo-tipo').value = 'porcentaje';
  document.getElementById('combo-valor').value = '';
  document.getElementById('combo-activo').checked = true;
  toggleTipoDescuento();
  renderProductosCheckboxes({});
  modalInstancia.show();
}

async function abrirModalEditar(id) {
  const { data: combo, error } = await window.comecomeSupabase
    .from('combos')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !combo) return;

  const { data: items } = await window.comecomeSupabase
    .from('combo_items')
    .select('*')
    .eq('combo_id', id);

  comboEditando = combo;
  document.getElementById('modal-titulo').textContent = 'Editar combo';
  document.getElementById('combo-id').value = combo.id;
  document.getElementById('combo-nombre').value = combo.nombre;
  document.getElementById('combo-tipo').value = combo.tipo_descuento;
  document.getElementById('combo-valor').value = combo.valor_descuento;
  document.getElementById('combo-activo').checked = combo.activo;

  const seleccionadosMap = {};
  (items || []).forEach(it => { seleccionadosMap[it.product_id] = it.cantidad; });
  renderProductosCheckboxes(seleccionadosMap);
  toggleTipoDescuento();
  modalInstancia.show();
}

function toggleTipoDescuento() {
  const tipo = document.getElementById('combo-tipo').value;
  const label = document.getElementById('label-descuento');
  if (tipo === 'porcentaje') {
    label.textContent = 'Descuento (%)';
    document.getElementById('combo-valor').placeholder = 'Ej: 15';
  } else {
    label.textContent = 'Precio fijo (CUP)';
    document.getElementById('combo-valor').placeholder = 'Ej: 25.00';
  }
}

async function guardarCombo() {
  const id = document.getElementById('combo-id').value;
  const nombre = document.getElementById('combo-nombre').value.trim();
  const tipo = document.getElementById('combo-tipo').value;
  const valor = parseFloat(document.getElementById('combo-valor').value);
  const activo = document.getElementById('combo-activo').checked;

  if (!nombre || isNaN(valor) || valor < 0) {
    mostrarMensaje('Completa nombre y valor válido.');
    return;
  }

  const checkboxes = document.querySelectorAll('#productos-check-container input[type="checkbox"]');
  const items = [];
  checkboxes.forEach(cb => {
    if (cb.checked) {
      const prodId = cb.id.replace('prod-', '');
      const cantidadInput = cb.closest('.producto-check').querySelector('.producto-cantidad');
      const cantidad = parseInt(cantidadInput.value) || 1;
      items.push({ product_id: prodId, cantidad });
    }
  });

  if (items.length === 0) {
    mostrarMensaje('Selecciona al menos un producto.');
    return;
  }

  const comboData = {
    nombre,
    tipo_descuento: tipo,
    valor_descuento: valor,
    activo
  };

  if (id) {
    const { error: errCombo } = await window.comecomeSupabase
      .from('combos')
      .update(comboData)
      .eq('id', id);
    if (errCombo) { mostrarMensaje('Error al actualizar combo'); return; }

    await window.comecomeSupabase.from('combo_items').delete().eq('combo_id', id);
    if (items.length > 0) {
      const itemsConCombo = items.map(it => ({ combo_id: id, ...it }));
      const { error: errItems } = await window.comecomeSupabase.from('combo_items').insert(itemsConCombo);
      if (errItems) { mostrarMensaje('Error al guardar productos del combo'); return; }
    }
  } else {
    const { data: nuevo, error: errCombo } = await window.comecomeSupabase
      .from('combos')
      .insert(comboData)
      .select()
      .single();
    if (errCombo || !nuevo) { mostrarMensaje('Error al crear combo'); return; }

    if (items.length > 0) {
      const itemsConCombo = items.map(it => ({ combo_id: nuevo.id, ...it }));
      const { error: errItems } = await window.comecomeSupabase.from('combo_items').insert(itemsConCombo);
      if (errItems) { mostrarMensaje('Error al guardar productos del combo'); return; }
    }
  }

  modalInstancia.hide();
  cargarCombos();
}

async function toggleVisibilidadCombo(id) {
  const { data: combo } = await window.comecomeSupabase
    .from('combos')
    .select('activo')
    .eq('id', id)
    .single();
  if (!combo) return;
  await window.comecomeSupabase
    .from('combos')
    .update({ activo: !combo.activo })
    .eq('id', id);
  cargarCombos();
}

async function eliminarCombo(id) {
  const { error } = await window.comecomeSupabase
    .from('combos')
    .delete()
    .eq('id', id);
  if (error) { mostrarMensaje('Error al eliminar'); return; }
  cargarCombos();
}

function mostrarMensaje(texto) {
  const contenedor = document.querySelector('main');
  const aviso = document.createElement('div');
  aviso.className = 'alert alert-warning py-2 text-center';
  aviso.textContent = texto;
  contenedor.prepend(aviso);
  setTimeout(() => aviso.remove(), 3000);
}