const BASE = '/api';

async function request(url, options = {}) {
  const token = localStorage.getItem('flow_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${url}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('flow_token');
    localStorage.removeItem('flow_user');
    window.location.hash = '#/login';
    throw new Error('Session utgången – logga in igen');
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get:    (url)        => request(url),
  post:   (url, body)  => request(url, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (url, body)  => request(url, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (url, body)  => request(url, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (url)        => request(url, { method: 'DELETE' }),
};
