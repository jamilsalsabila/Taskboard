const inferredBaseUrl =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : 'http://localhost:3001';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || inferredBaseUrl;
let authToken = '';

export const setAuthToken = (token) => {
  authToken = token || '';
};

const request = async (path, options = {}) => {
  const baseHeaders = { 'Content-Type': 'application/json' };
  if (authToken) {
    baseHeaders.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: baseHeaders,
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Request failed');
  }

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json();
  return payload.data;
};

export const api = {
  authGuest: (name) =>
    request('/api/auth/guest', { method: 'POST', body: JSON.stringify({ name }) }),
  listBoards: () => request('/api/boards'),
  createBoard: (body) => request('/api/boards', { method: 'POST', body: JSON.stringify(body) }),
  listTasks: () => request('/api/tasks'),
  createTask: (body) => request('/api/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (taskId, body) => request(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  moveTask: (taskId, status) =>
    request(`/api/tasks/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteTask: (taskId) => request(`/api/tasks/${taskId}`, { method: 'DELETE' }),
  listComments: (taskId) => request(`/api/tasks/${taskId}/comments`),
  addComment: (taskId, body) =>
    request(`/api/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify(body) }),
  analytics: () => request('/api/analytics/assignees'),
  listStickyNotes: (boardId) => request(`/api/sticky-notes?boardId=${encodeURIComponent(boardId)}`),
  createStickyNote: (boardId, body) =>
    request(`/api/sticky-notes?boardId=${encodeURIComponent(boardId)}`, {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  updateStickyNote: (boardId, noteId, body) =>
    request(`/api/sticky-notes/${noteId}?boardId=${encodeURIComponent(boardId)}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),
  deleteStickyNote: (boardId, noteId) =>
    request(`/api/sticky-notes/${noteId}?boardId=${encodeURIComponent(boardId)}`, { method: 'DELETE' })
};
