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
      const error = new Error(data.message || `Request failed with status ${res.status}`);
      error.status = res.status;
      error.code = data.code;
      error.data = data.data;
      error.uncompletedPredecessors = data.uncompletedPredecessors || [];
      throw error;
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
    }),

  getProjectTasks: (id, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/projects/${id}/tasks${query ? `?${query}` : ''}`);
  }
};

export const taskAPI = {
  getTasks: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/tasks${query ? `?${query}` : ''}`);
  },

  getTask: (id) => apiRequest(`/tasks/${id}`),

  createTask: (data) =>
    apiRequest('/tasks', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateTask: (id, data) =>
    apiRequest(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteTask: (id) =>
    apiRequest(`/tasks/${id}`, {
      method: 'DELETE'
    }),

  updateTaskStatus: (id, status) =>
    apiRequest(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),

  assignTask: (id, assigned_to, confirmed_override = false) =>
    apiRequest(`/tasks/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assigned_to, confirmed_override })
    }),

  getTaskDependencies: (id) => apiRequest(`/tasks/${id}/dependencies`),

  addDependency: (id, depends_on_task_id) =>
    apiRequest(`/tasks/${id}/dependencies`, {
      method: 'POST',
      body: JSON.stringify({ depends_on_task_id })
    }),

  removeDependency: (id, dependsOnTaskId) =>
    apiRequest(`/tasks/${id}/dependencies/${dependsOnTaskId}`, {
      method: 'DELETE'
    })
};

export const workloadAPI = {
  getProjectWorkload: (projectId = 'all') =>
    apiRequest(`/workload/${projectId}`),

  getSuggestions: (projectId = 'all', taskId = null) => {
    const query = taskId ? `?taskId=${taskId}` : '';
    return apiRequest(`/workload/${projectId}/suggestions${query}`);
  }
};

export const userAPI = {
  getUsers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/users${query ? `?${query}` : ''}`);
  }
};
