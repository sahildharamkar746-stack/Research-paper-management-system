/**
 * RPMS C++ API client. Start rpms_server on port 8080 and serve the site from localhost:5500 or localhost:5173.
 * Set window.RPMS_API_BASE_URL before this file loads to override the API address.
 */
(function () {
  const baseUrl = (window.RPMS_API_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
  async function request(path, options = {}) {
    let response;
    try {
      const token = localStorage.getItem('rpms_api_token');
      response = await fetch(baseUrl + path, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
          ...(options.headers || {})
        }
      });
    } catch (_) {
      throw new Error('Cannot reach the RPMS C++ server. Start rpms_server on port 8080 and serve this site from localhost:5500 or localhost:5173.');
    }
    const raw = await response.text();
    let body = {};
    if (raw) { try { body = JSON.parse(raw); } catch (_) { body = { error: raw }; } }
    if (!response.ok) throw new Error(body.error || 'Request failed (' + response.status + ').');
    return body;
  }
  window.rpmsApi = Object.freeze({
    baseUrl,
    health: () => request('/health'),
    login: (email, password) => request('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (details) => request('/api/register', { method: 'POST', body: JSON.stringify(details) }),
    logout: () => request('/api/logout', { method: 'POST' }),
    listPapers: () => request('/api/papers'),
    listCategories: () => request('/api/categories'),
    listUsers: () => request('/api/admin/users'),
    updateUserStatus: (id, status) => request('/api/admin/users/' + encodeURIComponent(id) + '/status', { method: 'PATCH', body: JSON.stringify({ status }) }),
    addCategory: (name) => request('/api/categories', { method: 'POST', body: JSON.stringify({ name }) }),
    renameCategory: (oldName, newName) => request('/api/categories', { method: 'PATCH', body: JSON.stringify({ oldName, newName }) }),
    deleteCategory: (name) => request('/api/categories', { method: 'DELETE', body: JSON.stringify({ name }) }),
    deletePaper: (id) => request('/api/papers/' + encodeURIComponent(id), { method: 'DELETE' }),
    updatePaperStatus: (id, status) => request('/api/papers/' + encodeURIComponent(id) + '/status', { method: 'PATCH', body: JSON.stringify({ status }) }),
    listReviews: () => request('/api/reviews'),
    resetRepository: () => request('/api/admin/reset', { method: 'POST' }),
    submitPaper: (paper) => request('/api/papers', { method: 'POST', body: JSON.stringify(paper) })
  });
})();
