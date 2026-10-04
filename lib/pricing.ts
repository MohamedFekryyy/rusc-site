import type { OfferKey } from "@/lib/cal";

// Member discount, single source of truth.
//
// The rule (still gated behind Raquel confirming it): when the signed-in user
// is a member, session and carnet prices are -10%. It applies server-side in
// app/api/checkout/route.ts, which resolves membership against rusc-admin's
// /api/auth/session endpoint (never trusts the browser).
//
// Toggle: set MEMBER_DISCOUNT_PERCENT=0 (or any value ≤ 0) on the checkout
// side (Vercel env) to switch the discount off without a deploy touching code.
// The default below is 10.
export const MEMBER_DISCOUNT_PERCENT = Math.max(0, Number(process.env.MEMBER_DISCOUNT_PERCENT ?? 10) || 0);

export function memberDiscountEnabled(): boolean {
  return MEMBER_DISCOUNT_PERCENT > 0;
}

// Which offers the discount applies to: everything a member buys EXCEPT
// open studio (atelier-libre-*, members-only), the membership itself
// (adhesion) and gift vouchers (bon-cadeau-*). A member gets 10% off their
// classes, carnets and stages — not off open studio, renewing membership, or
// a voucher bought for someone else.
export function memberDiscountable(key: OfferKey): boolean {
  if (key === "adhesion") return false;
  if (key.startsWith("atelier-libre-")) return false;
  return !key.startsWith("bon-cadeau-");
}

// The discounted unit price (euro cents), rounded to the nearest cent.
export function memberPrice(cents: number): number {
  return Math.round((cents * (100 - MEMBER_DISCOUNT_PERCENT)) / 100);
}
