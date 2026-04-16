const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const DEFAULT_USER_ID = 'demo-admin';

const getUserId = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_USER_ID;
  }
  return window.localStorage.getItem('adoreUserId') || DEFAULT_USER_ID;
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getUserId(),
      ...options.headers,
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed.');
  }

  return payload;
};

export const getForms = () => request('/forms');

export const getFormResults = (formId, filters = {}) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString() ? `?${params.toString()}` : '';

  return request(`/forms/${encodeURIComponent(formId)}/results${query}`);
};

export const createForm = (form) =>
  request('/forms', {
    method: 'POST',
    body: JSON.stringify(form),
  });

export const getPublicForm = (formId, access = {}) => {
  const params = new URLSearchParams();

  Object.entries(access).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString() ? `?${params.toString()}` : '';

  return request(`/forms/public/${encodeURIComponent(formId)}${query}`);
};

export const submitPublicFormResponse = (formId, payload) =>
  request(`/forms/public/${encodeURIComponent(formId)}/responses`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

/**
 * Deletes a specific form by ID.
 * Method: DELETE
 */
export const deleteForm = (formId) =>
  request(`/forms/${encodeURIComponent(formId)}`, {
    method: 'DELETE',
  });