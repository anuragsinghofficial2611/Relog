const AUTH_KEY = "relog-auth";
const DEFAULT_URL = import.meta.env.VITE_API_URL || "";

export function defaultBaseUrl() {
  return DEFAULT_URL;
}

export function loadAuth() {
  try {
    return (
      JSON.parse(localStorage.getItem(AUTH_KEY)) || {
        accessToken: "",
        refreshToken: "",
        user: null,
      }
    );
  } catch {
    return { accessToken: "", refreshToken: "", user: null };
  }
}

export function saveAuth(p) {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      accessToken: p.access_token,
      refreshToken: p.refresh_token,
      user: p.user ?? p,
    }),
  );
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

function formatError(d) {
  if (!d) return "Request failed";
  if (typeof d === "string") return d;
  if (Array.isArray(d))
    return d.map((e) => e.msg || JSON.stringify(e)).join("; ");
  return String(d);
}

export async function api(
  path,
  { method = "GET", body, auth = true } = {},
  { baseUrl = DEFAULT_URL, token = "" } = {},
) {
  const authState = loadAuth();
  const access = token || authState.accessToken;
  const h = {};
  if (auth && access) h.Authorization = `Bearer ${access}`;
  if (body !== undefined) h["Content-Type"] = "application/json";

  const url = `${(baseUrl || "").replace(/\/+$/, "")}${path}`;
  let r = await fetch(url, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (
    r.status === 401 &&
    authState.refreshToken &&
    !path.includes("/auth/refresh") &&
    auth
  ) {
    const ok = await refreshTokens(baseUrl);
    if (ok) {
      h.Authorization = `Bearer ${loadAuth().accessToken}`;
      r = await fetch(url, {
        method,
        headers: h,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    }
  }

  if (!r.ok) {
    let d = r.statusText;
    try {
      d = formatError((await r.json()).detail);
    } catch {}
    throw Error(d);
  }
  return r.status === 204 ? null : r.json();
}

export async function refreshTokens(baseUrl = DEFAULT_URL) {
  const { refreshToken } = loadAuth();
  if (!refreshToken) return false;
  try {
    const p = await api(
      "/api/v1/auth/refresh",
      { method: "POST", body: { refresh_token: refreshToken }, auth: false },
      { baseUrl },
    );
    saveAuth({ ...p, user: loadAuth().user });
    return true;
  } catch {
    clearAuth();
    return false;
  }
}

export async function logoutApi(baseUrl = DEFAULT_URL) {
  const { refreshToken } = loadAuth();
  if (refreshToken) {
    try {
      await api(
        "/api/v1/auth/logout",
        { method: "POST", body: { refresh_token: refreshToken }, auth: false },
        { baseUrl },
      );
    } catch {}
  }
  clearAuth();
}

export function createClient(baseUrl, token) {
  return (path, opts = {}) => api(path, opts, { baseUrl, token });
}

export function subscribeEvents(baseUrl, token, onEvent) {
  const ctrl = new AbortController();
  (async () => {
    try {
      const r = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/v1/logs/events`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
        signal: ctrl.signal,
      });
      if (!r.ok) return;
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const block of parts) {
          const data = block
            .split("\n")
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trim())
            .join("");
          if (data) {
            try {
              onEvent(JSON.parse(data));
            } catch {}
          }
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") onEvent({ error: e.message });
    }
  })();
  return () => ctrl.abort();
}
