const STORAGE_KEY = 'todos_v1';
const LATENCY_MS = 150; // small artificial delay for UX

/**
 * Internal: read all todos from localStorage.
 * Ensures an array is always returned, with minimal seed data on first run.
 */
function readTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const seeded = seedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return parsed;
  } catch (_e) {
    // If any parse/storage error occurs, reset to seed data to keep app functional.
    const seeded = seedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

/**
 * Internal: write todos array to localStorage.
 */
function writeTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

/**
 * Internal: basic id generator using timestamp and random suffix.
 */
function generateId() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

/**
 * Internal: create ISO timestamp string.
 */
function nowIso() {
  return new Date().toISOString();
}

/**
 * Internal: provide minimal seed data on first load.
 */
function seedData() {
  const createdAt = nowIso();
  return [
    {
      id: generateId(),
      title: 'Welcome to your Todo App',
      description: 'Use the form above to add, edit, toggle, and delete tasks.',
      completed: false,
      created_at: createdAt,
      updated_at: createdAt,
    },
    {
      id: generateId(),
      title: 'Try toggling this task',
      description: 'Click the checkbox to mark as complete/incomplete.',
      completed: true,
      created_at: createdAt,
      updated_at: createdAt,
    },
  ];
}

/**
 * Internal: simulate small network latency by delaying resolution.
 */
function withLatency(result) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(result), LATENCY_MS);
  });
}

/**
 * Internal: sanitize input fields.
 */
function sanitizeText(v) {
  if (typeof v !== 'string') return '';
  const trimmed = v.trim();
  // Enforce a max length similar to backend constraint to keep UX consistent.
  return trimmed.slice(0, 255);
}

// PUBLIC_INTERFACE
export async function getTodos() {
  /** Return all todos from localStorage. */
  const todos = readTodos();
  // Return a shallow copy to avoid external mutation.
  return withLatency([...todos]);
}

// PUBLIC_INTERFACE
export async function createTodo({ title, description = '' }) {
  /** Create a new todo in localStorage and return it. */
  const todos = readTodos();

  const newTodo = {
    id: generateId(),
    title: sanitizeText(title),
    description: sanitizeText(description),
    completed: false,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  // Basic validation as UI expects: title required 1..255
  if (!newTodo.title || newTodo.title.length < 1) {
    // Do not throw network errors; keep behavior graceful.
    // Return a rejected promise with a structured error similar to previous humanize expectations.
    const err = new Error('Validation error: Title is required');
    err.status = 422;
    err.data = { detail: 'Title must be between 1 and 255 characters.' };
    throw err;
  }

  const next = [newTodo, ...todos];
  writeTodos(next);
  return withLatency({ ...newTodo });
}

// PUBLIC_INTERFACE
export async function updateTodo(id, { title, description = '', completed = false }) {
  /** Replace/update a todo by id and return updated entity. */
  const todos = readTodos();
  const idx = todos.findIndex((t) => t.id === id);
  if (idx === -1) {
    const err = new Error('Not found');
    err.status = 404;
    err.data = { detail: 'Todo not found' };
    throw err;
  }

  const safeTitle = sanitizeText(title);
  const safeDescription = sanitizeText(description);

  if (!safeTitle || safeTitle.length < 1) {
    const err = new Error('Validation error: Title is required');
    err.status = 422;
    err.data = { detail: 'Title must be between 1 and 255 characters.' };
    throw err;
  }

  const updated = {
    ...todos[idx],
    title: safeTitle,
    description: safeDescription,
    completed: !!completed,
    updated_at: nowIso(),
  };

  const next = [...todos];
  next[idx] = updated;
  writeTodos(next);
  return withLatency({ ...updated });
}

// PUBLIC_INTERFACE
export async function patchTodo(id, partial) {
  /** Partially update a todo by id and return updated entity (e.g., { completed: true }). */
  const todos = readTodos();
  const idx = todos.findIndex((t) => t.id === id);
  if (idx === -1) {
    const err = new Error('Not found');
    err.status = 404;
    err.data = { detail: 'Todo not found' };
    throw err;
  }

  const current = todos[idx];
  const nextFields = { ...partial };

  if (typeof nextFields.title !== 'undefined') {
    nextFields.title = sanitizeText(nextFields.title);
    if (!nextFields.title || nextFields.title.length < 1) {
      const err = new Error('Validation error: Title is required');
      err.status = 422;
      err.data = { detail: 'Title must be between 1 and 255 characters.' };
      throw err;
    }
  }
  if (typeof nextFields.description !== 'undefined') {
    nextFields.description = sanitizeText(nextFields.description);
  }
  if (typeof nextFields.completed !== 'undefined') {
    nextFields.completed = !!nextFields.completed;
  }

  const updated = {
    ...current,
    ...nextFields,
    updated_at: nowIso(),
  };

  const next = [...todos];
  next[idx] = updated;
  writeTodos(next);
  return withLatency({ ...updated });
}

// PUBLIC_INTERFACE
export async function deleteTodo(id) {
  /** Delete a todo by id; return meta object for compatibility. */
  const todos = readTodos();
  const exists = todos.some((t) => t.id === id);
  if (!exists) {
    // Deleting a non-existent item should still resolve gracefully for UX.
    return withLatency({ success: true, deleted: 0 });
  }
  const next = todos.filter((t) => t.id !== id);
  writeTodos(next);
  return withLatency({ success: true, deleted: 1 });
}
