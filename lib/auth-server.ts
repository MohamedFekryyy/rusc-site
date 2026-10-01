import { AUTH_ENDPOINT } from "@/lib/auth";

// Server-side member resolution for the checkout. This is the only place the
// site decides membership for pricing: it takes the Browser token (stored under
// TOKEN_KEY in lib/auth.ts), asks rusc-admin's authenticated /session endpoint,
// and trusts only rusc-admin's answer. A browser-supplied "member" flag is
// never read or trusted.

export type ResolvedMember = { member: boolean };

// The cart/checkout sends the token; if absent or invalid, the visitor is a
// guest (no discount) — checkout still proceeds.
export async function resolveMember(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(`${AUTH_ENDPOINT}/session`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      // A slow admin doesn't block the checkout path; fall back to guest.
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { user?: { member?: unknown } };
    return data.user?.member === true;
  } catch {
    // Network/auth failure → treat as non-member; never charge the wrong price.
    return false;
  }
}
