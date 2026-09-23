// Client-side auth plumbing.
//
// The sign-up / log-in backend has not been wired yet (owned by Fekry,
// together with Cal.diy + Stripe). Until it is, the endpoint below is empty
// and the AuthForm falls back to a clearly-marked "preview" state so the UI
// can be reviewed without sending credentials anywhere.
//
// When the auth service is ready, set NEXT_PUBLIC_AUTH_ENDPOINT to its base
// URL, e.g. https://api.studio-rusc.com/auth, and this client will POST to:
//   POST <endpoint>/signup   { name, email, password }        -> { token, user }
//   POST <endpoint>/login    { email, password }                -> { token, user }
//   POST <endpoint>/logout   (Authorization: Bearer <token>)    -> 204
//   GET  <endpoint>/session  (Authorization: Bearer <token>)    -> { user }
//
// The token is stored in localStorage ("rusc-auth-token") so the visitor
// stays logged in across sessions ("rester connecté").

export const AUTH_ENDPOINT: string = process.env.NEXT_PUBLIC_AUTH_ENDPOINT ?? "";

export const TOKEN_KEY = "rusc-auth-token";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  member: boolean;
};

export type AuthResult = { token: string; user: AuthUser };

function saveToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage unavailable (private mode) — session simply won't persist.
  }
}

function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function request(path: string, body?: unknown, token?: string) {
  const res = await fetch(`${AUTH_ENDPOINT}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? `Erreur ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function signUp(name: string, email: string, password: string): Promise<AuthResult> {
  const result = (await request("/signup", { name, email, password })) as AuthResult;
  saveToken(result.token);
  return result;
}

export async function logIn(email: string, password: string): Promise<AuthResult> {
  const result = (await request("/login", { email, password })) as AuthResult;
  saveToken(result.token);
  return result;
}

export async function logOut(): Promise<void> {
  const token = getToken();
  if (token) await request("/logout", undefined, token).catch(() => undefined);
  clearToken();
}

export async function getSession(token?: string): Promise<AuthUser | null> {
  const t = token ?? getToken();
  if (!t) return null;
  try {
    const user = (await request("/session", undefined, t)) as AuthUser;
    return user;
  } catch {
    clearToken();
    return null;
  }
}
