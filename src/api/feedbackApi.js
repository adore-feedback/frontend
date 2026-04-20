const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(
  /\/$/,
  "",
);
const DEFAULT_USER_ID = "demo-admin";

const getUserId = () => {
  if (typeof window === "undefined") return DEFAULT_USER_ID;
  return window.localStorage.getItem("adoreUserId") || DEFAULT_USER_ID;
};

const FORM_TOKEN_KEY = (formId) => `simtrak_form_token_${formId}`;

export const storeFormAccessToken = (formId, token) => {
  try {
    if (token) sessionStorage.setItem(FORM_TOKEN_KEY(formId), token);
  } catch {}
};

export const getFormAccessToken = (formId) => {
  try {
    return sessionStorage.getItem(FORM_TOKEN_KEY(formId)) || "";
  } catch {
    return "";
  }
};

export const clearFormAccessToken = (formId) => {
  try {
    sessionStorage.removeItem(FORM_TOKEN_KEY(formId));
  } catch {}
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "x-user-id": getUserId(),
      ...options.headers,
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(payload.message || "Request failed.");
    err.status = response.status;
    err.code = payload.code;
    throw err;
  }

  return payload;
};

export const getForms = (filters = {}) => {
  const params = new URLSearchParams();

  if (filters.search && filters.search.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.status) {
    params.set("status", filters.status);
  }

  // Always include deleted forms so they persist after refresh.
  // The caller decides whether to display them via the active tab filter.
  params.set("includeDeleted", "true");

  const query = params.toString() ? `?${params.toString()}` : "";
  return request(`/forms${query}`).then((data) => ({
    ...data,
    forms: data.forms || [],
  }));
};

export const getForm = (formId) =>
  request(`/forms/${encodeURIComponent(formId)}`);

export const getFormResults = (formId, filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString() ? `?${params.toString()}` : "";
  return request(`/forms/${encodeURIComponent(formId)}/results${query}`);
};

export const createForm = (form) =>
  request("/forms", { method: "POST", body: JSON.stringify(form) });

export const updateForm = (formId, form) =>
  request(`/forms/${encodeURIComponent(formId)}`, {
    method: "PATCH",
    body: JSON.stringify(form),
  });

export const getPublicForm = async (formId, access = {}) => {
  const params = new URLSearchParams();
  Object.entries(access).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString() ? `?${params.toString()}` : "";

  const data = await request(
    `/forms/public/${encodeURIComponent(formId)}${query}`,
  );

  if (data.accessToken) {
    storeFormAccessToken(formId, data.accessToken);
  }

  return data;
};

export const submitPublicFormResponse = (formId, payload) => {
  const token = getFormAccessToken(formId);

  return request(`/forms/public/${encodeURIComponent(formId)}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Form-Access-Token": token } : {}),
    },
    body: JSON.stringify(payload),
  }).then((data) => {
    clearFormAccessToken(formId);
    return data;
  });
};

export const deleteForm = (formId) =>
  request(`/forms/${encodeURIComponent(formId)}`, { method: "DELETE" });

export const updateFormSettings = (formId, settings) => {
  return request(`/forms/${encodeURIComponent(formId)}/settings`, {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
};

export const searchResultsByFormTitle = (q) =>
  request(`/forms/results/search?q=${encodeURIComponent(q)}`);

export const permanentDeleteForm = (formId) =>
  request(`/forms/${encodeURIComponent(formId)}/permanent`, {
    method: "DELETE",
  });
