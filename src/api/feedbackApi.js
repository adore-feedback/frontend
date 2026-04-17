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
    // Preserve status and error code so callers can inspect them
    const err = new Error(payload.message || 'Request failed.');
    err.status = response.status;
    err.code = payload.code;
    throw err;
  }

  return payload;
};

/**
 * Get all forms for the current user.
 * @param {Object} filters - Optional filters
 * @param {string} filters.search - Filter by form name/title (server-side, case-insensitive)
 * @param {string} filters.status - Filter by status: 'draft' | 'live' | 'closed'
 */
export const getForms = (filters = {}) => {
  const params = new URLSearchParams();

  // Server-side search by form name
  if (filters.search && filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  // Status filter (handled client-side if not supported by server, but passed anyway)
  if (filters.status) {
    params.set('status', filters.status);
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/forms${query}`);
};

/**
 * Get a single form by ID (admin, includes all fields).
 */
export const getForm = (formId) =>
  request(`/forms/${encodeURIComponent(formId)}`);

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

/**
 * Update an existing form's content (questions, title, description, etc.).
 * Does NOT update settings (status, visibility, availability, etc.).
 * Use updateFormSettings for those.
 * Uses PATCH /api/forms/:formId
 */
export const updateForm = (formId, form) =>
  request(`/forms/${encodeURIComponent(formId)}`, {
    method: 'PATCH',
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
 * NOTE: Responses are preserved on the server — only the form definition is removed.
 */
export const deleteForm = (formId) =>
  request(`/forms/${encodeURIComponent(formId)}`, {
    method: 'DELETE',
  });

/**
 * Update form settings separately from content.
 * Handles: status, visibility, slug, availability, allowedRespondents,
 *          personalizations, duplicateCheckFields.
 */
export const updateFormSettings = (formId, settings) => {
  console.log('CALLING SETTINGS API:', formId, settings);
  return request(`/forms/${encodeURIComponent(formId)}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
};