import { useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, CheckCheck, Circle, CircleCheck, CircleHelp, Clock3, Columns3, LayoutGrid, ListTodo, LoaderCircle, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { statuses, type Status, type Task } from './storage';
import { useTasks } from './useTasks';
const labels: Record<Status, string> = { Pending: 'Pendientes', 'In Progress': 'En progreso', Completed: 'Completadas' };
const icons = { Pending: Circle, 'In Progress': LoaderCircle, Completed: CircleCheck };
export default function App() {
  const { tasks, error, loading, ready, saving, notice, refresh, save, changeStatus, remove } = useTasks();
  const disabled = loading || saving || !ready;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<Status | null>(null);
  function clearDrag() { setDraggedId(null); setDropTarget(null); }
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const formDialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Status>('Pending');
  const [formError, setFormError] = useState('');
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  const visible = tasks.filter(t => (filter === 'all' || t.status === filter) && `${t.title} ${t.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));
  function openForm(task: Task | null = null, nextStatus: Status = 'Pending') {
    setEditing(task); setTitle(task?.title ?? ''); setDescription(task?.description ?? ''); setStatus(task?.status ?? nextStatus); setFormError(''); formDialog.current?.showModal();
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setFormError('Escribe un título para tu tarea.'); return; }
    if (await save(editing?.id, { title: title.trim(), description: description.trim(), status })) formDialog.current?.close();
    else setFormError('No se pudo confirmar el guardado. Cierra este formulario y actualiza las tareas antes de reintentar.');
  }

  function card(task: Task) {
    const Icon = icons[task.status];
    return <article
      className={`task-card ${task.status === 'Completed' ? 'done' : ''} ${draggedId === task.id ? 'dragging' : ''}`}
      key={task.id}
      draggable={view === 'board' && !disabled}
      title={view === 'board' ? 'Arrastra a otra columna para cambiar el estado' : undefined}
      onDragStart={event => {
        if (disabled || (event.target as HTMLElement).closest('button, select, input, textarea')) {
          event.preventDefault(); return;
        }
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', task.id);
        setDraggedId(task.id);
      }}
      onDragEnd={clearDrag}
    >
      <div className="card-top"><span className={`badge ${task.status.replaceAll(' ', '-')}`}><Icon size={12}/>{labels[task.status]}</span><div className="card-actions"><button className="icon-button" disabled={disabled} aria-label={`Editar ${task.title}`} onClick={() => openForm(task)}><Pencil size={15}/></button><button className="icon-button danger" disabled={disabled} aria-label={`Eliminar ${task.title}`} onClick={() => { setDeleting(task); deleteDialog.current?.showModal(); }}><Trash2 size={15}/></button></div></div>
      <h3>{task.title}</h3><p className="description">{task.description || 'Sin descripción'}</p>
      <div className="card-bottom"><span className="created"><Clock3 size={13}/>{new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(new Date(task.createdAt))}</span><select aria-label={`Estado de ${task.title}`} value={task.status} onChange={e => void changeStatus(task.id, e.target.value as Status)} disabled={disabled}>{statuses.map(s => <option key={s} value={s}>{labels[s]}</option>)}</select></div>
    </article>;
  }
  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="./"><span className="brand-symbol"><CheckCheck size={23}/></span>taskflow<span className="brand-dot">.</span></a><div className="workspace-label">ESPACIO PERSONAL</div><button className="nav-item active" onClick={() => { setFilter('all'); setQuery(''); }}><LayoutGrid size={18}/>Mis tareas<span>{tasks.length}</span></button><div className="sidebar-bottom"><div className="small-note"><span className="note-icon">✦</span><strong>Un paso a la vez.</strong><p>Las grandes ideas empiezan con pequeñas tareas.</p></div><button className="help-button" onClick={() => helpDialog.current?.showModal()}><CircleHelp size={17}/>Acerca de TaskFlow<ArrowUpRight size={15}/></button><div className="profile"><div className="avatar">T</div><div><strong>Mi espacio</strong><small>Personal · Local</small></div><span className="online-dot"/></div></div></aside>
    <div className="main-shell"><header className="topbar"><div>Mi espacio <span>/</span><strong>Mis tareas</strong></div><span className="local-label"><span className="online-dot"/>{loading ? 'Cargando tareas…' : saving ? 'Guardando…' : error ? 'Revisa la conexión' : 'Conectado al servidor'}</span></header>
      <main><div className="page-heading"><div className="eyebrow">MENOS RUIDO, MÁS FOCO</div><div className="heading-row"><div><h1>Un espacio para avanzar<span>.</span></h1><p>Organiza tus pendientes y dale forma a lo que sigue.</p></div><button className="primary" onClick={() => openForm()} disabled={disabled}><Plus size={18}/>Nueva tarea</button></div></div>
      {error && <div className="error-banner" role="alert">{error} <button className="secondary" disabled={loading || saving} onClick={() => void refresh()}>Actualizar tareas</button></div>}
      <section className="stats" aria-label="Resumen de tareas"><div className="stat"><span className="stat-icon total"><ListTodo size={20}/></span><div><span>Total de tareas</span><strong>{tasks.length}<small>en tu espacio</small></strong></div></div><div className="stat"><span className="stat-icon working"><LoaderCircle size={20}/></span><div><span>En progreso</span><strong>{tasks.filter(t => t.status === 'In Progress').length}<small>paso a paso</small></strong></div></div><div className="stat"><span className="stat-icon finished"><CircleCheck size={20}/></span><div><span>Completadas</span><strong>{completed}<small>objetivos logrados</small></strong></div></div><div className="progress-stat"><div><span>Tu progreso</span><strong>{progress}%</strong></div><div className="progress-track" role="progressbar" aria-label="Tareas completadas" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progress}%` }}/></div><small>{tasks.length ? `${completed} de ${tasks.length} tareas completadas` : 'Todo empieza con una tarea'}</small></div></section>
      <section className="task-section" aria-label="Mis tareas"><div className="section-heading"><h2>Mis tareas <span>{tasks.length}</span></h2><div className="view-switch"><button aria-label="Vista de tablero" aria-pressed={view === 'board'} className={view === 'board' ? 'selected' : ''} onClick={() => setView('board')}><Columns3 size={16}/>Tablero</button><button aria-label="Vista de lista" aria-pressed={view === 'list'} className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')}><ListTodo size={16}/>Lista</button></div></div>
      <div className="toolbar"><div className="filters" aria-label="Filtrar por estado">{(['all', ...statuses] as const).map(s => <button key={s} className={filter === s ? 'selected' : ''} aria-pressed={filter === s} onClick={() => setFilter(s)}>{s === 'all' ? 'Todas' : labels[s]}</button>)}</div><label className="search"><Search size={17}/><input aria-label="Buscar tareas" placeholder="Buscar tareas…" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label="Limpiar búsqueda" onClick={() => setQuery('')}><X size={14}/></button>}</label></div>
      {loading ? <div className="no-results" role="status">Cargando tus tareas…</div> : !ready && tasks.length === 0 ? <div className="no-results">No se pudieron cargar tus tareas. Usa «Actualizar tareas» para reintentar.</div> : tasks.length > 0 && visible.length === 0 ? <div className="no-results"><Search size={28}/><h3>No encontramos tareas</h3><p>Prueba otra búsqueda o cambia el filtro.</p><button className="secondary" onClick={() => {setQuery(''); setFilter('all');}}>Limpiar filtros</button></div> : view === 'board' ? <div className="board">{statuses.filter(s => filter === 'all' || filter === s).map(s => { const Icon = icons[s]; const group = visible.filter(t => t.status === s); return <section
          className={`column ${s.replaceAll(' ', '-')} ${dropTarget === s ? 'drop-target' : ''}`}
          key={s}
          onDragOver={event => {
            if (disabled || !draggedId || tasks.find(task => task.id === draggedId)?.status === s) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setDropTarget(s);
          }}
          onDragLeave={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(current => current === s ? null : current);
          }}
          onDrop={event => {
            event.preventDefault();
            const task = tasks.find(task => task.id === draggedId);
            clearDrag();
            if (!disabled && task && task.status !== s) void changeStatus(task.id, s);
          }}
        ><div className="column-heading"><Icon size={16}/><h3>{labels[s]}</h3><span>{group.length}</span><button className="icon-button" aria-label={`Crear tarea en ${labels[s]}`} onClick={() => openForm(null, s)} disabled={disabled}><Plus size={17}/></button></div><div className="column-body">{group.map(card)}{!group.length && <div className="column-empty"><Icon size={26}/><strong>{s === 'Pending' ? 'Espacio para tus ideas' : s === 'In Progress' ? 'Aquí empieza el movimiento' : 'Cada avance cuenta'}</strong><p>{s === 'Pending' ? 'Añade una tarea y da el primer paso.' : s === 'In Progress' ? 'Cambia el estado de una tarea cuando empieces a trabajar.' : 'Tus tareas terminadas tendrán su lugar aquí.'}</p></div>}<button className="add-task" onClick={() => openForm(null, s)} disabled={disabled}><Plus size={15}/>Añadir tarea</button></div></section>; })}</div> : <div className="list-view">{visible.map(card)}{!tasks.length && <div className="no-results"><ListTodo size={28}/><h3>Tu próximo paso empieza aquí</h3><p>Crea tu primera tarea para comenzar.</p><button className="primary" onClick={() => openForm()} disabled={disabled}><Plus size={16}/>Nueva tarea</button></div>}</div>}
      </section><footer><span><Check size={14}/>Tu ritmo. Tus objetivos. Tu espacio.</span><span>TaskFlow · MVP</span></footer><div className="sr-only" role="status">{notice}</div></main>
    </div>
    <dialog ref={formDialog} onCancel={e => { if (saving) e.preventDefault(); }} aria-labelledby="form-title"><form onSubmit={submit}><div className="modal-heading"><div><span className="eyebrow">UN PASO MÁS</span><h2 id="form-title">{editing ? 'Editar tarea' : 'Nueva tarea'}</h2></div><button className="icon-button" type="button" aria-label="Cerrar" disabled={saving} onClick={() => formDialog.current?.close()}><X size={20}/></button></div><p className="modal-intro">Dale un nombre a lo que quieres lograr.</p><label className="field">Título <input disabled={saving} autoFocus required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="¿Qué tienes en mente?"/></label><label className="field">Descripción <span className="optional">Opcional</span><textarea disabled={saving} rows={4} maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} placeholder="Añade detalles que te ayuden a empezar…"/></label><label className="field">Estado<select disabled={saving} value={status} onChange={e => setStatus(e.target.value as Status)}>{statuses.map(s => <option value={s} key={s}>{labels[s]}</option>)}</select></label>{formError && <p role="alert" className="form-error">{formError}</p>}<div className="modal-footer"><button type="button" className="secondary" disabled={saving} onClick={() => formDialog.current?.close()}>Cancelar</button><button type="submit" className="primary" disabled={disabled}>{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear tarea'}<Check size={16}/></button></div></form></dialog>
    <dialog ref={deleteDialog} onCancel={e => { if (saving) e.preventDefault(); }} aria-labelledby="delete-title"><h2 id="delete-title">¿Eliminar esta tarea?</h2><p role="status">{error}</p><p className="delete-text">«{deleting?.title}» se eliminará de tu espacio. Esta acción no se puede deshacer.</p><div className="modal-footer"><button className="secondary" autoFocus disabled={saving} onClick={() => deleteDialog.current?.close()}>Cancelar</button><button className="delete-button" disabled={disabled} onClick={async () => { if (deleting && await remove(deleting.id)) deleteDialog.current?.close(); }}>Eliminar tarea</button></div></dialog>
    <dialog ref={helpDialog} aria-labelledby="help-title"><div className="modal-heading"><h2 id="help-title">Tu espacio en TaskFlow</h2><button className="icon-button" aria-label="Cerrar" onClick={() => helpDialog.current?.close()}><X size={20}/></button></div><p className="delete-text">Crea tareas, añade detalles y cambia su estado conforme avances. Puedes editarlas, buscarlas y organizarte con el tablero o la lista.</p><p className="delete-text">Tus tareas se guardan en el servidor. Necesitas conexión con la API para consultarlas y modificarlas. Las tareas de la versión anterior guardadas en este navegador no se importan automáticamente.</p></dialog>
  </div>;
}
