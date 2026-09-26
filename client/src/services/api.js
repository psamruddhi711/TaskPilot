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
  },

  getProjectDecisions: (id) => apiRequest(`/projects/${id}/decisions`)
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

  updateTaskStatus: (id, status, decisionData = {}) =>
    apiRequest(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...decisionData })
    }),

  assignTask: (id, assigned_to, confirmed_override = false, decisionData = {}) =>
    apiRequest(`/tasks/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assigned_to, confirmed_override, ...decisionData })
    }),

  getTaskDependencies: (id) => apiRequest(`/tasks/${id}/dependencies`),

  addDependency: (id, depends_on_task_id, decisionData = {}) =>
    apiRequest(`/tasks/${id}/dependencies`, {
      method: 'POST',
      body: JSON.stringify({ depends_on_task_id, ...decisionData })
    }),

  removeDependency: (id, dependsOnTaskId, decisionData = {}) =>
    apiRequest(`/tasks/${id}/dependencies/${dependsOnTaskId}`, {
      method: 'DELETE',
      body: JSON.stringify(decisionData)
    }),

  createTaskBlocker: (id, reason, decisionData = {}) =>
    apiRequest(`/tasks/${id}/blockers`, {
      method: 'POST',
      body: JSON.stringify({ reason, ...decisionData })
    }),

  getTaskImpact: (id) => apiRequest(`/tasks/${id}/impact`),

  createTaskDecision: (id, data) =>
    apiRequest(`/tasks/${id}/decisions`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getTaskDecisions: (id) => apiRequest(`/tasks/${id}/decisions`)
};

export const blockerAPI = {
  getBlockers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/blockers${query ? `?${query}` : ''}`);
  },

  resolveBlocker: (id, data) =>
    apiRequest(`/blockers/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
};

export const decisionAPI = {
  getDecision: (id) => apiRequest(`/decisions/${id}`),

  updateHandoffStatus: (id, handoff_status) =>
    apiRequest(`/decisions/${id}/handoff`, {
      method: 'PATCH',
      body: JSON.stringify({ handoff_status })
    }),

  getMyHandoffs: () => apiRequest('/users/me/handoffs')
};

export const notificationAPI = {
  getNotifications: () => apiRequest('/notifications'),

  markAsRead: (id) =>
    apiRequest(`/notifications/${id}/read`, {
      method: 'PATCH'
    }),

  markAllAsRead: () =>
    apiRequest('/notifications/read-all', {
      method: 'PATCH'
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
