// Centralized API handler
const API_BASE = '/api';

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('taskpilot_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        // Clear token if expired or invalid
        localStorage.removeItem('taskpilot_token');
        localStorage.removeItem('taskpilot_user');
      }
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const authAPI = {
  login: (credentials) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

  register: (userData) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),

  getMe: () => apiRequest('/auth/me')
};

export const projectAPI = {
  getProjects: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/projects${query ? `?${query}` : ''}`);
  },

  getProject: (id) => apiRequest(`/projects/${id}`),

  createProject: (data) =>
    apiRequest('/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateProject: (id, data) =>
    apiRequest(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteProject: (id) =>
    apiRequest(`/projects/${id}`, {
      method: 'DELETE'
    }),

  getProjectMembers: (id) => apiRequest(`/projects/${id}/members`),

  addProjectMember: (id, memberData) =>
    apiRequest(`/projects/${id}/members`, {
      method: 'POST',
      body: JSON.stringify(memberData)
    }),

  removeProjectMember: (id, userId) =>
    apiRequest(`/projects/${id}/members/${userId}`, {
      method: 'DELETE'
    })
};

export const userAPI = {
  getUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/users${query ? `?${query}` : ''}`);
  }
};
