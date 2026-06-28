// categorias.js - CRUD sin iconos, responsivo y sin confirm() molesto

let categoriaEditando = null;
let modalInstancia = null;

document.addEventListener('DOMContentLoaded', () => {
  modalInstancia = new bootstrap.Modal(document.getElementById('categoriaModal'));
  document.getElementById('btn-guardar').addEventListener('click', guardarCategoria);
  cargarCategorias();
});

async function cargarCategorias() {
  const { data, error } = await window.comecomeSupabase
    .from('categorias')
    .select('*')
    .order('nombre', { ascending: true });

  const container = document.getElementById('categorias-container');
  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">No hay categorías aún.</p>';
    return;
  }

  container.innerHTML = data.map(cat => `
    <div class="categoria-item">
      <span class="categoria-nombre">${cat.nombre}</span>
      <div class="categoria-acciones">
        <button class="btn btn-outline-amarillo btn-sm" onclick="abrirModalEditar('${cat.id}')" title="Editar"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-outline-amarillo btn-sm" onclick="eliminarCategoria('${cat.id}')" title="Eliminar"><i class="bi bi-trash"></i></button>
      </div>
    </div>
  `).join('');
}

function abrirModalNuevo() {
  categoriaEditando = null;
  document.getElementById('modal-titulo').innerHTML = '<i class="bi bi-tag"></i> Nueva categoría';
  document.getElementById('cat-id').value = '';
  document.getElementById('cat-nombre').value = '';
  modalInstancia.show();
}

async function abrirModalEditar(id) {
  const { data, error } = await window.comecomeSupabase
    .from('categorias')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) {
    mostrarMensaje('Error al cargar categoría');
    return;
  }
  categoriaEditando = data;
  document.getElementById('modal-titulo').innerHTML = '<i class="bi bi-pencil"></i> Editar categoría';
  document.getElementById('cat-id').value = data.id;
  document.getElementById('cat-nombre').value = data.nombre;
  modalInstancia.show();
}

async function guardarCategoria() {
  const id = document.getElementById('cat-id').value;
  const nombre = document.getElementById('cat-nombre').value.trim();

  if (!nombre) {
    mostrarMensaje('El nombre es obligatorio');
    return;
  }

  if (id) {
    const { error } = await window.comecomeSupabase
      .from('categorias')
      .update({ nombre })
      .eq('id', id);
    if (error) {
      mostrarMensaje('Error al actualizar: ' + error.message);
      return;
    }
  } else {
    const { error } = await window.comecomeSupabase
      .from('categorias')
      .insert([{ nombre }]);
    if (error) {
      mostrarMensaje('Error al crear: ' + error.message);
      return;
    }
  }

  modalInstancia.hide();
  cargarCategorias();
}

async function eliminarCategoria(id) {
  const { error } = await window.comecomeSupabase
    .from('categorias')
    .delete()
    .eq('id', id);
  if (error) {
    mostrarMensaje('Error al eliminar: ' + error.message);
    return;
  }
  cargarCategorias();
}

// Pequeño mensaje visual en lugar de alert()
function mostrarMensaje(texto) {
  // Podrías usar un toast, pero por ahora mostramos un div temporal encima de la lista
  const contenedor = document.getElementById('categorias-container');
  const aviso = document.createElement('div');
  aviso.className = 'alert alert-warning py-2 text-center';
  aviso.textContent = texto;
  contenedor.prepend(aviso);
  setTimeout(() => aviso.remove(), 3000);
}