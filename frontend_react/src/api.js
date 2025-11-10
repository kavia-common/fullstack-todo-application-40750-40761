const BASE_URL = 'http://localhost:3001';
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Perform a fetch with a timeout and structured error handling.
 * @param {string} url - Full URL to fetch
 * @param {RequestInit} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<any>} - Parsed JSON response
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    const contentType = res.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch (_) {
        // ignore parse error, keep data as null
      }
    } else {
      // Attempt to parse text for better diagnostics
      try {
        data = await res.text();
      } catch (_) {
        // ignore
      }
    }

    if (!res.ok) {
      const err = new Error('Request failed');
      err.status = res.status;
      err.statusText = res.statusText;
      err.data = data;
      err.url = url;
      throw err;
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      const err = new Error('Request timed out');
      err.code = 'ETIMEOUT';
      err.url = url;
      throw err;
    }
    // Re-throw with structured properties where possible
    if (!error.status) {
      error.status = 0;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// PUBLIC_INTERFACE
export async function getTodos() {
  /** Fetch all todos from backend. Returns an array of todos. */
  return fetchWithTimeout(`${BASE_URL}/api/todos`, {
    method: 'GET',
  });
}

// PUBLIC_INTERFACE
export async function createTodo({ title, description = '' }) {
  /** Create a new todo. Requires title; description optional. Returns created todo. */
  return fetchWithTimeout(`${BASE_URL}/api/todos`, {
    method: 'POST',
    body: JSON.stringify({ title, description }),
  });
}

// PUBLIC_INTERFACE
export async function updateTodo(id, { title, description = '', completed = false }) {
  /** Replace/update a todo by id. Returns updated todo. */
  return fetchWithTimeout(`${BASE_URL}/api/todos/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ title, description, completed }),
  });
}

// PUBLIC_INTERFACE
export async function patchTodo(id, partial) {
  /** Partially update a todo by id. e.g., { completed: true } */
  return fetchWithTimeout(`${BASE_URL}/api/todos/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(partial || {}),
  });
}

// PUBLIC_INTERFACE
export async function deleteTodo(id) {
  /** Delete a todo by id. Returns success meta or deleted entity per backend. */
  return fetchWithTimeout(`${BASE_URL}/api/todos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
