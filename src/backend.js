const config = {
  url: (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
};

const SESSION_KEY = "quadro-admin-session";
export const backendReady = Boolean(config.url && config.anonKey);

function baseHeaders(token = config.anonKey) {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function parse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.message || data.error || `HTTP ${response.status}`);
  return data;
}

export async function loadProducts() {
  if (!backendReady) return null;
  const response = await fetch(`${config.url}/rest/v1/products?select=*&active=eq.true&order=sort_order.asc`, { headers: baseHeaders() });
  return parse(response);
}

export async function createOrder(payload) {
  if (!backendReady) throw new Error("BACKEND_NOT_CONFIGURED");
  const response = await fetch(`${config.url}/functions/v1/create-order`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify(payload),
  });
  return parse(response);
}

export function getStoredSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}

export async function validateSession() {
  const session = getStoredSession();
  if (!backendReady || !session?.access_token) return null;
  try {
    const userResponse = await fetch(`${config.url}/auth/v1/user`, { headers: baseHeaders(session.access_token) });
    const user = await parse(userResponse);
    const adminResponse = await fetch(`${config.url}/rest/v1/admins?select=user_id&user_id=eq.${encodeURIComponent(user.id)}`, { headers: baseHeaders(session.access_token) });
    const admins = await parse(adminResponse);
    if (!admins.length) throw new Error("NOT_ADMIN");
    return { session, user };
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export async function loginAdmin(email, password) {
  if (!backendReady) throw new Error("BACKEND_NOT_CONFIGURED");
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const session = await parse(response);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  const validated = await validateSession();
  if (!validated) throw new Error("NOT_ADMIN");
  return validated;
}

export async function logoutAdmin() {
  const session = getStoredSession();
  if (backendReady && session?.access_token) {
    await fetch(`${config.url}/auth/v1/logout`, { method: "POST", headers: baseHeaders(session.access_token) }).catch(() => {});
  }
  sessionStorage.removeItem(SESSION_KEY);
}

export async function loadAdminProducts() {
  const session = getStoredSession();
  const response = await fetch(`${config.url}/rest/v1/products?select=*&order=sort_order.asc`, { headers: baseHeaders(session.access_token) });
  return parse(response);
}

export async function publishCatalog(items) {
  const session = getStoredSession();
  const response = await fetch(`${config.url}/rest/v1/rpc/publish_catalog`, {
    method: "POST",
    headers: { ...baseHeaders(session.access_token), Prefer: "return=representation" },
    body: JSON.stringify({ items }),
  });
  return parse(response);
}

export async function loadOrders() {
  const session = getStoredSession();
  const response = await fetch(`${config.url}/rest/v1/orders?select=*,order_items(*)&order=created_at.desc&limit=100`, { headers: baseHeaders(session.access_token) });
  return parse(response);
}

export async function updateOrderStatus(id, status) {
  const session = getStoredSession();
  const response = await fetch(`${config.url}/rest/v1/orders?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...baseHeaders(session.access_token), Prefer: "return=representation" },
    body: JSON.stringify({ status }),
  });
  return parse(response);
}
