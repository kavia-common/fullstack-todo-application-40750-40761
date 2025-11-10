import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import {
  getTodos,
  createTodo,
  updateTodo,
  patchTodo,
  deleteTodo,
} from './api';

// PUBLIC_INTERFACE
function App() {
  /** Main Todo application component with CRUD UI and theme toggle. */
  const [theme, setTheme] = useState('light');
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const titleValid = useMemo(() => title.trim().length >= 1 && title.trim().length <= 255, [title]);
  const editTitleValid = useMemo(() => editTitle.trim().length >= 1 && editTitle.trim().length <= 255, [editTitle]);

  useEffect(() => {
    // Initial fetch
    const load = async () => {
      setInitialLoad(true);
      setError('');
      try {
        const data = await getTodos();
        setTodos(Array.isArray(data) ? data : (data?.items || []));
      } catch (e) {
        setError(humanizeError(e, 'Failed to load todos'));
      } finally {
        setInitialLoad(false);
      }
    };
    load();
  }, []);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  function humanizeError(e, fallback = 'Something went wrong') {
    if (!e) return fallback;
    if (e.code === 'ETIMEOUT') return `${fallback}: Request timed out.`;
    if (e.status) {
      const serverMsg = typeof e.data === 'string'
        ? e.data
        : (e.data && (e.data.detail || e.data.message));
      return `${fallback}: ${serverMsg || `HTTP ${e.status}`}`;
    }
    return `${fallback}: ${e.message || 'Unknown error'}`;
  }

  async function handleAddTodo(e) {
    e.preventDefault();
    setFormError('');
    setError('');
    if (!titleValid) {
      setFormError('Title must be between 1 and 255 characters.');
      return;
    }
    setLoading(true);
    try {
      const newTodo = await createTodo({ title: title.trim(), description: description.trim() });
      setTodos((prev) => [newTodo, ...prev]);
      setTitle('');
      setDescription('');
    } catch (e) {
      setError(humanizeError(e, 'Failed to create todo'));
    } finally {
      setLoading(false);
    }
  }

  function startEdit(todo) {
    setEditingId(todo.id);
    setEditTitle(todo.title || '');
    setEditDescription(todo.description || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle('');
    setEditDescription('');
  }

  async function saveEdit(id) {
    setError('');
    if (!editTitleValid) {
      setError('Title must be between 1 and 255 characters.');
      return;
    }
    setLoading(true);
    try {
      const updated = await updateTodo(id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        completed: !!todos.find((t) => t.id === id)?.completed,
      });
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
      cancelEdit();
    } catch (e) {
      setError(humanizeError(e, 'Failed to update todo'));
    } finally {
      setLoading(false);
    }
  }

  async function toggleComplete(todo) {
    setError('');
    setLoading(true);
    try {
      const updated = await patchTodo(todo.id, { completed: !todo.completed });
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
    } catch (e) {
      setError(humanizeError(e, 'Failed to toggle complete'));
    } finally {
      setLoading(false);
    }
  }

  async function removeTodo(id) {
    setError('');
    setLoading(true);
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(humanizeError(e, 'Failed to delete todo'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="App">
      <header className="App-header" style={{ minHeight: 'auto', padding: '2rem 1rem' }}>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>

        <h1 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Todo App</h1>
        <p className="App-link" style={{ marginTop: 0, marginBottom: '1rem' }}>
          Manage your tasks with a simple, clean interface
        </p>

        {error ? (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              background: '#FEF2F2',
              color: '#991B1B',
              border: '1px solid #FCA5A5',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              marginBottom: '1rem',
              maxWidth: 720,
              width: '100%',
            }}
          >
            {error}
            <button
              onClick={() => window.location.reload()}
              style={{
                marginLeft: 12,
                background: '#EF4444',
                color: '#fff',
                border: 'none',
                padding: '6px 10px',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        ) : null}

        <form
          onSubmit={handleAddTodo}
          aria-label="Add todo form"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxWidth: 720,
            width: '100%',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            padding: '1rem',
            borderRadius: 10,
          }}
        >
          <label htmlFor="title" style={{ textAlign: 'left', fontWeight: 600 }}>
            Title
          </label>
          <input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={!titleValid}
            aria-describedby="title-help"
            placeholder="What do you need to do?"
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${title && !titleValid ? '#EF4444' : 'var(--border-color)'}`,
              outline: 'none',
            }}
          />
          <small id="title-help" style={{ textAlign: 'left', color: title && !titleValid ? '#EF4444' : '#6B7280' }}>
            1 to 255 characters.
          </small>

          <label htmlFor="description" style={{ textAlign: 'left', fontWeight: 600 }}>
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add a brief description..."
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              outline: 'none',
            }}
          />

          {formError ? (
            <div role="alert" aria-live="assertive" style={{ color: '#EF4444', textAlign: 'left' }}>
              {formError}
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Adding…' : 'Add Todo'}
            </button>
          </div>
        </form>
      </header>

      <main style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
        <section style={{ width: '100%', maxWidth: 720 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '1rem 0' }}>
            <h2 style={{ margin: 0 }}>Your Todos</h2>
            {initialLoad ? <span aria-live="polite">Loading…</span> : null}
          </div>

          {(!todos || todos.length === 0) && !initialLoad ? (
            <div
              style={{
                padding: '1rem',
                border: '1px dashed var(--border-color)',
                borderRadius: 10,
                color: '#6B7280',
                textAlign: 'center',
              }}
            >
              No todos yet. Add your first task above.
            </div>
          ) : null}

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
            {todos.map((todo) => {
              const isEditing = editingId === todo.id;
              return (
                <li
                  key={todo.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 10,
                    background: 'var(--bg-secondary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        aria-label={`Mark "${todo.title}" as ${todo.completed ? 'incomplete' : 'complete'}`}
                        checked={!!todo.completed}
                        onChange={() => toggleComplete(todo)}
                        disabled={loading}
                      />
                      {isEditing ? (
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          aria-invalid={!editTitleValid}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: `1px solid ${editTitle && !editTitleValid ? '#EF4444' : 'var(--border-color)'}`,
                            outline: 'none',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            textDecoration: todo.completed ? 'line-through' : 'none',
                            color: todo.completed ? '#6B7280' : 'inherit',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={todo.title}
                        >
                          {todo.title}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEdit(todo.id)}
                            aria-label="Save"
                            disabled={loading}
                            style={{
                              background: '#06b6d4',
                              color: '#fff',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: 8,
                              cursor: 'pointer',
                              opacity: loading ? 0.7 : 1,
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            aria-label="Cancel"
                            disabled={loading}
                            style={{
                              background: '#64748b',
                              color: '#fff',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: 8,
                              cursor: 'pointer',
                              opacity: loading ? 0.7 : 1,
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(todo)}
                            aria-label={`Edit ${todo.title}`}
                            disabled={loading}
                            style={{
                              background: '#3b82f6',
                              color: '#fff',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: 8,
                              cursor: 'pointer',
                              opacity: loading ? 0.7 : 1,
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => removeTodo(todo.id)}
                            aria-label={`Delete ${todo.title}`}
                            disabled={loading}
                            style={{
                              background: '#EF4444',
                              color: '#fff',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: 8,
                              cursor: 'pointer',
                              opacity: loading ? 0.7 : 1,
                            }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    {isEditing ? (
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        placeholder="Edit description"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: '1px solid var(--border-color)',
                          outline: 'none',
                        }}
                      />
                    ) : (
                      <p
                        style={{
                          margin: 0,
                          color: '#4B5563',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {todo.description || 'No description'}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default App;
