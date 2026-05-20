const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

export type AuthUser = {
  id: string;
  username: string;
  createdAt: string;
};

type AuthResult = {
  user: AuthUser;
  token: string;
};

async function parseError(res: Response) {
  try {
    const data = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) {
      return data.message.join("，");
    }
    return data.message || "请求失败";
  } catch {
    return "请求失败";
  }
}

async function postAuth(path: "login" | "register", payload: { username: string; password: string }) {
  const res = await fetch(`${API_BASE}/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  return (await res.json()) as AuthResult;
}

export function login(payload: { username: string; password: string }) {
  return postAuth("login", payload);
}

export function register(payload: { username: string; password: string }) {
  return postAuth("register", payload);
}

export function getToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("lexibook_token");
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem("lexibook_user");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuth() {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem("lexibook_token");
  localStorage.removeItem("lexibook_user");
}

export async function getCurrentUser() {
  const token = getToken();
  if (!token) {
    return null;
  }

  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  const user = (await res.json()) as AuthUser;

  if (typeof window !== "undefined") {
    localStorage.setItem("lexibook_user", JSON.stringify(user));
  }

  return user;
}
