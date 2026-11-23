// ---------- POO ----------
class Tarea {
  constructor(nombre, completada = false, id = Date.now() + Math.random()) {
    this.id = id;
    this.nombre = nombre;
    this.completada = completada;
  }
  // Cambia el estado completa/incompleta
  alternarEstado() { this.completada = !this.completada; }
  // Edita el contenido
  editar(nuevoNombre) { this.nombre = nuevoNombre; }
  // Elimina la tarea del gestor que la contiene
  eliminar(gestor) { gestor.eliminar(this.id); }
}

class GestorDeTareas {
  constructor() { this.tareas = []; }
  agregar(nombre) {
    const tarea = new Tarea(nombre);
    this.tareas.push(tarea);
    return tarea;
  }
  buscar(id) { return this.tareas.find(t => t.id === id); }
  eliminar(id) { this.tareas = this.tareas.filter(t => t.id !== id); }
  existe(nombre) {
    return this.tareas.some(t => t.nombre.toLowerCase() === nombre.toLowerCase());
  }
  // Reconstruye instancias de Tarea desde datos planos
  cargar(datos) {
    this.tareas = datos.map(d => new Tarea(d.nombre, d.completada, d.id));
  }
}

// ---------- Persistencia con Promesas (LocalStorage) ----------
const CLAVE = 'tareas';
const guardar = tareas => new Promise((resolve, reject) => {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(tareas));
    resolve();
  } catch (e) { reject(e); }
});
const leer = () => new Promise(resolve => {
  try { resolve(JSON.parse(localStorage.getItem(CLAVE)) ?? []); }
  catch { resolve([]); }
});

// ---------- DOM ----------
const gestor = new GestorDeTareas();
const form = document.querySelector('#form-tarea');
const input = document.querySelector('#input-tarea');
const lista = document.querySelector('#lista-tareas');
const error = document.querySelector('#error');
const contador = document.querySelector('#contador');
let editandoId = null;

const mostrarError = msg => { error.textContent = msg; error.hidden = !msg; };
const escapar = s => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

const render = () => {
  lista.innerHTML = '';
  if (!gestor.tareas.length) {
    lista.innerHTML = '<li class="vacio">No hay tareas. ¡Agrega la primera!</li>';
  }
  gestor.tareas.forEach(t => {
    const li = document.createElement('li');
    li.dataset.id = t.id;
    li.className = t.completada ? 'completa' : '';
    const contenido = t.id === editandoId
      ? `<input type="text" class="edit-input" value="${escapar(t.nombre)}" maxlength="100">`
      : `<span class="texto">${escapar(t.nombre)}</span>`;
    li.innerHTML = `
      <input type="checkbox" class="chk" ${t.completada ? 'checked' : ''} aria-label="Completar tarea">
      ${contenido}
      <div class="acciones">
        <button class="btn-editar" data-accion="editar">${t.id === editandoId ? 'Guardar' : 'Editar'}</button>
        <button class="btn-eliminar" data-accion="eliminar">Eliminar</button>
      </div>`;
    lista.appendChild(li);
  });
  const pendientes = gestor.tareas.filter(t => !t.completada).length;
  contador.textContent = `${pendientes} pendiente(s) de ${gestor.tareas.length}`;
  const ed = lista.querySelector('.edit-input');
  if (ed) ed.focus();
};

const actualizar = () => {
  render();
  guardar(gestor.tareas).catch(() => mostrarError('No se pudo guardar en LocalStorage.'));
};

const guardarEdicion = (tarea, li) => {
  const nuevo = li.querySelector('.edit-input').value.trim();
  if (!nuevo) return mostrarError('El nombre no puede estar vacío.');
  tarea.editar(nuevo);
  editandoId = null;
  mostrarError('');
  actualizar();
};

// Agregar
form.addEventListener('submit', e => {
  e.preventDefault();
  const nombre = input.value.trim();
  if (!nombre) return mostrarError('Escribe una tarea antes de agregarla.');
  if (gestor.existe(nombre)) return mostrarError('Esa tarea ya existe.');
  gestor.agregar(nombre);
  input.value = '';
  mostrarError('');
  actualizar();
});

// Delegación de eventos: editar / eliminar / completar
lista.addEventListener('click', e => {
  const boton = e.target.closest('button');
  const li = e.target.closest('li[data-id]');
  if (!boton || !li) return;
  const tarea = gestor.buscar(Number(li.dataset.id));
  if (boton.dataset.accion === 'eliminar') {
    tarea.eliminar(gestor);
    if (editandoId === tarea.id) editandoId = null;
    actualizar();
  } else if (editandoId === tarea.id) {
    guardarEdicion(tarea, li);
  } else {
    editandoId = tarea.id;
    render();
  }
});

lista.addEventListener('change', e => {
  if (!e.target.classList.contains('chk')) return;
  gestor.buscar(Number(e.target.closest('li').dataset.id)).alternarEstado();
  actualizar();
});

lista.addEventListener('keydown', e => {
  if (!e.target.classList.contains('edit-input')) return;
  const li = e.target.closest('li');
  if (e.key === 'Enter') guardarEdicion(gestor.buscar(Number(li.dataset.id)), li);
  if (e.key === 'Escape') { editandoId = null; mostrarError(''); render(); }
});

// Carga inicial desde LocalStorage
leer().then(datos => { gestor.cargar(datos); render(); });
