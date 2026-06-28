// productos.js - CRUD con tarjetas ComeCome (sin placeholder externo)

let productoEditando = null;
let modalInstancia = null;

document.addEventListener('DOMContentLoaded', () => {
  modalInstancia = new bootstrap.Modal(document.getElementById('productoModal'));
  document.getElementById('btn-guardar').addEventListener('click', guardarProducto);
  document.getElementById('prod-foto').addEventListener('change', previsualizarFoto);
  cargarCategoriasEnSelect();
  cargarProductos();
});

async function cargarCategoriasEnSelect() {
  const { data } = await window.comecomeSupabase
    .from('categorias')
    .select('id, nombre')
    .order('nombre');
  if (!data) return;
  const select = document.getElementById('prod-categoria');
  data.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.nombre;
    select.appendChild(opt);
  });
}

function previsualizarFoto(e) {
  const file = e.target.files[0];
  const preview = document.getElementById('preview-foto');
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.src = ev.target.result;
      preview.classList.remove('d-none');
    };
    reader.readAsDataURL(file);
  } else {
    preview.src = '';
    preview.classList.add('d-none');
  }
}

async function cargarProductos() {
  const { data, error } = await window.comecomeSupabase
    .from('productos')
    .select('*, categorias(nombre)')
    .order('nombre');

  const container = document.getElementById('productos-container');
  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">No hay productos aún.</p>';
    return;
  }

  container.innerHTML = data.map(prod => `
    <div class="producto-item">
      <div class="producto-info">
        ${prod.foto_url
          ? `<img src="${prod.foto_url}" alt="${prod.nombre}" class="producto-foto">`
          : `<div class="producto-foto d-flex align-items-center justify-content-center" style="background-color:#000;border:1px solid var(--amarillo);color:var(--amarillo);"><i class="bi bi-image fs-4"></i></div>`
        }
        <div class="producto-detalles">
          <div class="producto-nombre">${prod.nombre}</div>
          <div class="producto-meta">
            <span>${prod.categorias?.nombre || 'Sin categoría'}</span>
            <span>${parseFloat(prod.precio).toFixed(2)} CUP</span>
            <span>${prod.permite_extras ? 'Extras' : ''}</span>
            <span class="${prod.activo ? 'text-success' : 'text-danger'}">${prod.activo ? 'Visible' : 'Oculto'}</span>
          </div>
        </div>
      </div>
      <div class="producto-acciones">
        <button class="btn btn-outline-amarillo btn-sm" onclick="abrirModalEditar('${prod.id}')" title="Editar"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-outline-amarillo btn-sm" onclick="toggleVisibilidad('${prod.id}')" title="Mostrar/Ocultar"><i class="bi ${prod.activo ? 'bi-eye-slash' : 'bi-eye'}"></i></button>
        <button class="btn btn-outline-amarillo btn-sm" onclick="eliminarProducto('${prod.id}')" title="Eliminar"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `).join('');
}

function abrirModalNuevo() {
  productoEditando = null;
  document.getElementById('modal-titulo').innerHTML = '<i class="bi bi-box"></i> Nuevo producto';
  document.getElementById('prod-id').value = '';
  document.getElementById('prod-nombre').value = '';
  document.getElementById('prod-descripcion').value = '';
  document.getElementById('prod-precio').value = '';
  document.getElementById('prod-categoria').value = '';
  document.getElementById('prod-extras').checked = true;
  document.getElementById('prod-foto').value = '';
  document.getElementById('preview-foto').classList.add('d-none');
  modalInstancia.show();
}

async function abrirModalEditar(id) {
  const { data, error } = await window.comecomeSupabase
    .from('productos')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) {
    mostrarMensaje('Error al cargar producto');
    return;
  }
  productoEditando = data;
  document.getElementById('modal-titulo').innerHTML = '<i class="bi bi-pencil"></i> Editar producto';
  document.getElementById('prod-id').value = data.id;
  document.getElementById('prod-nombre').value = data.nombre;
  document.getElementById('prod-descripcion').value = data.descripcion || '';
  document.getElementById('prod-precio').value = data.precio;
  document.getElementById('prod-categoria').value = data.categoria_id || '';
  document.getElementById('prod-extras').checked = data.permite_extras;
  document.getElementById('prod-foto').value = '';
  const preview = document.getElementById('preview-foto');
  if (data.foto_url) {
    preview.src = data.foto_url;
    preview.classList.remove('d-none');
  } else {
    preview.classList.add('d-none');
  }
  modalInstancia.show();
}

async function guardarProducto() {
  const id = document.getElementById('prod-id').value;
  const nombre = document.getElementById('prod-nombre').value.trim();
  const descripcion = document.getElementById('prod-descripcion').value.trim();
  const precio = parseFloat(document.getElementById('prod-precio').value);
  const categoria_id = document.getElementById('prod-categoria').value || null;
  const permite_extras = document.getElementById('prod-extras').checked;
  const archivoFoto = document.getElementById('prod-foto').files[0];

  if (!nombre || isNaN(precio) || precio < 0) {
    mostrarMensaje('Nombre y precio válido son obligatorios');
    return;
  }

  let foto_url = productoEditando?.foto_url || null;

  if (archivoFoto) {
    const nombreArchivo = `producto_${Date.now()}.${archivoFoto.name.split('.').pop()}`;
    const { data: uploadData, error: uploadError } = await window.comecomeSupabase
      .storage.from('productos')
      .upload(nombreArchivo, archivoFoto, { upsert: true });
    if (uploadError) {
      mostrarMensaje('Error al subir foto: ' + uploadError.message);
      return;
    }
    const { data: urlData } = window.comecomeSupabase
      .storage.from('productos')
      .getPublicUrl(nombreArchivo);
    foto_url = urlData.publicUrl;
  }

  const datosProducto = { nombre, descripcion, precio, categoria_id, permite_extras, foto_url };

  if (id) {
    const { error } = await window.comecomeSupabase
      .from('productos')
      .update(datosProducto)
      .eq('id', id);
    if (error) { mostrarMensaje('Error: ' + error.message); return; }
  } else {
    const { error } = await window.comecomeSupabase
      .from('productos')
      .insert([{ ...datosProducto, activo: true }]);
    if (error) { mostrarMensaje('Error: ' + error.message); return; }
  }

  modalInstancia.hide();
  cargarProductos();
}

async function toggleVisibilidad(id) {
  const { data } = await window.comecomeSupabase
    .from('productos')
    .select('activo')
    .eq('id', id)
    .single();
  if (!data) return;
  await window.comecomeSupabase
    .from('productos')
    .update({ activo: !data.activo })
    .eq('id', id);
  cargarProductos();
}

async function eliminarProducto(id) {
  const { error } = await window.comecomeSupabase
    .from('productos')
    .delete()
    .eq('id', id);
  if (error) { mostrarMensaje('Error al eliminar: ' + error.message); return; }
  cargarProductos();
}

function mostrarMensaje(texto) {
  const contenedor = document.querySelector('main');
  const aviso = document.createElement('div');
  aviso.className = 'alert alert-warning py-2 text-center';
  aviso.textContent = texto;
  contenedor.prepend(aviso);
  setTimeout(() => aviso.remove(), 3000);
}