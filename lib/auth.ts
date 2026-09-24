// Member accounts, client side: sign up, sign in, the member's space.
//
// rūsc admin serves them (deploy/admin/server.mjs, /api/auth/*), next to the
// codes. NEXT_PUBLIC_AUTH_ENDPOINT can point elsewhere; by default it's
// <CODES_ORIGIN>/api/auth:
//   POST <endpoint>/signup   { name, email, password, remember }  -> { token, user }
//   POST <endpoint>/login    { email, password, remember }        -> { token, user }
//   POST <endpoint>/reset    { token, password, remember }        -> { token, user }  (link from the studio)
//   POST <endpoint>/logout   (Authorization: Bearer <token>)       -> 204
//   GET  <endpoint>/session  (Authorization: Bearer <token>)       -> { user }
//   GET  <endpoint>/account  (Authorization: Bearer <token>)       -> AccountData
//   POST <endpoint>/codes    { code } (Bearer)                     -> AccountData
// Errors answer { error: "<code>" } (email_taken, wrong_login, …): the page
// words them in its language.
//
// The token stays in localStorage ("rester connecté·e": a year) or in
// sessionStorage (this visit only; the server keeps it a day).

import { CODES_ORIGIN, type CodeUnit } from "@/lib/codes";

export const AUTH_ENDPOINT: string = process.env.NEXT_PUBLIC_AUTH_ENDPOINT ?? `${CODES_ORIGIN}/api/auth`;

export const TOKEN_KEY = "rusc-auth-token";
// Fired on window when someone signs in or out on this page.
export const AUTH_EVENT = "rusc-auth";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  member: boolean;
};

export type AuthResult = { token: string; user: AuthUser };

export type AccountCode = {
  code: string;
  label: string;
  unit: CodeUnit;
  remaining: number;
  initial: number;
  expiresOn: string | null;
  active: boolean;
};
// A booking: offer is a key of lib/cal.ts, or null for an old Acuity class (title).
export type AccountVisit = { start: string; offer: string | null; title: string };
export type AccountData = {
  user: AuthUser;
  membership: { since: string | null; until: string } | null;
  codes: AccountCode[];
  coming: AccountVisit[];
  past: AccountVisit[];
};

export class AuthError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

function saveToken(token: string, remember: boolean) {
  try {
    clearToken();
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
    // Storage unavailable (private mode): the sign-in lasts until the page closes.
  }
}

function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function announce() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

async function request(path: string, body?: unknown, token?: string | null) {
  let res: Response;
  try {
    res = await fetch(`${AUTH_ENDPOINT}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AuthError("network");
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new AuthError(data?.error ?? `http_${res.status}`);
  return data;
}

async function signIn(path: string, body: Record<string, unknown>, remember: boolean): Promise<AuthResult> {
  const result = (await request(path, { ...body, remember })) as AuthResult;
  saveToken(result.token, remember);
  announce();
  return result;
}

export const signUp = (name: string, email: string, password: string, remember = true) =>
  signIn("/signup", { name, email, password }, remember);

export const logIn = (email: string, password: string, remember = true) => signIn("/login", { email, password }, remember);

// With the link the studio sends (?reset=<token>): a new password, then signed in.
export const resetPassword = (token: string, password: string, remember = true) =>
  signIn("/reset", { token, password }, remember);

export async function logOut(): Promise<void> {
  const token = getToken();
  if (token) await request("/logout", {}, token).catch(() => undefined);
  clearToken();
  announce();
}

// null when signed out; a token the server no longer knows is forgotten.
async function withToken<T>(path: string): Promise<T | null> {
  const token = getToken();
  if (!token) return null;
  try {
    return (await request(path, undefined, token)) as T;
  } catch (error) {
    if (error instanceof AuthError && error.code === "signed_out") clearToken();
    if (error instanceof AuthError && error.code === "network") throw error;
    return null;
  }
}

export async function getSession(): Promise<AuthUser | null> {
  return (await withToken<{ user: AuthUser }>("/session"))?.user ?? null;
}

export const getAccount = () => withToken<AccountData>("/account");

// Adds a code (carnet, voucher, Acuity code…) to the member's space.
export async function addCode(code: string): Promise<AccountData> {
  const token = getToken();
  if (!token) throw new AuthError("signed_out");
  return (await request("/codes", { code }, token)) as AccountData;
}
