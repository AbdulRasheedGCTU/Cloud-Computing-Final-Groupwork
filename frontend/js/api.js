/* ============================================================
   CampusHub — API layer
   ------------------------------------------------------------
   Every screen talks to the backend through this file. There is
   no mock/demo data anywhere: each function calls the live REST
   API and attaches the stored JWT to authenticated requests.
   ============================================================ */

const CONFIG = {
  // Where the Express backend lives.
  //  - Local development: keep "http://localhost:5000".
  //  - AWS deployment: the ALB serves the frontend and the API from the same
  //    origin, so set this to "" (same origin) after deploying.
  BASE_URL: "http://localhost:5000"
};

const TOKEN_KEY = "lf_token";
const USER_KEY = "lf_user";

const Auth = {
  getToken() { return localStorage.getItem(TOKEN_KEY); },
  getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  },
  setSession(user, token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isLoggedIn() { return !!this.getToken(); }
};

/* Generic JSON/multipart request with automatic JWT attachment. */
async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = Auth.getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // When the body is FormData, the browser sets the multipart boundary —
  // never force a Content-Type on it.
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let res;
  try {
    res = await fetch(`${CONFIG.BASE_URL}${path}`, { ...options, headers });
  } catch (_) {
    throw new Error("Could not reach the server. Is the backend running?");
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && body.message) message = body.message;
    } catch (_) {
      // Non-JSON error body — keep the generic message.
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

/* One function per endpoint from the API contract. */
const Api = {
  // POST /api/auth/register  { full_name, email, password }
  register(fullName, email, password) {
    return request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ full_name: fullName, email, password })
    });
  },

  // POST /api/auth/login  { email, password }  →  { token, user }
  login(email, password) {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },

  // GET /api/items — all listings (feed filters to ACTIVE client-side).
  getItems() {
    return request("/api/items");
  },

  // GET /api/items/:id — full detail for one listing.
  getItem(id) {
    return request(`/api/items/${encodeURIComponent(id)}`);
  },

  // POST /api/items — multipart FormData (title, description, category,
  // location, contact_phone, image). Requires login.
  createItem(formData) {
    return request("/api/items", { method: "POST", body: formData });
  },

  // PUT /api/items/:id — accepts a FormData (full edit) or a plain object
  // (e.g. { status: "RESOLVED" }). Owner only.
  updateItem(id, body) {
    const payload = body instanceof FormData ? body : JSON.stringify(body);
    return request(`/api/items/${encodeURIComponent(id)}`, { method: "PUT", body: payload });
  },

  // DELETE /api/items/:id — owner only.
  deleteItem(id) {
    return request(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  // Uploaded images live on the backend, so a relative image_url like
  // "/uploads/abc.jpg" needs the backend origin prefixed to display.
  resolveImageUrl(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `${CONFIG.BASE_URL}${url}`;
  }
};
