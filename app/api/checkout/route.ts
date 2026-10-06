import type Stripe from "stripe";
import { resolveMember } from "@/lib/auth-server";
import { amountBounds, offerByKey, validAmount } from "@/lib/cal";
import { loadClasses } from "@/lib/classes";
import { coverCode, releaseCodeHold } from "@/lib/codes";
import { CODE_PAYMENT_ENABLED } from "@/lib/code-payment";
import { formatSlot } from "@/lib/format";
import { placesForCheckout } from "@/lib/places";
import { memberDiscountEnabled, memberDiscountable, memberPrice, MEMBER_DISCOUNT_PERCENT } from "@/lib/pricing";
import type { Lang } from "@/lib/routes";
import { getStripe } from "@/lib/stripe";

// Cart checkout: turns the cart into a Stripe Checkout Session shown
// embedded in the cart page (nothing leaves the site). Every price comes
// from OFFERS, or from rūsc admin for the classes made there; the browser
// only says which offers and how many.

type IncomingItem = { key?: unknown; qty?: unknown; amount?: unknown; booking?: { uid?: unknown; seat?: unknown; start?: unknown } };

const MAX_LINES = 20;

function bad(error: string, status = 400) {
  return Response.json({ error }, { status });
}

// Stripe metadata values are capped at 500 characters: split the order summary.
function chunks(text: string, size = 490) {
  const out: Record<string, string> = {};
  for (let i = 0; i * size < text.length && i < 10; i++) out[`items_${i + 1}`] = text.slice(i * size, (i + 1) * size);
  return out;
}

// The cart sends its bearer token in the body (the Authorization header is
// not available to the embedded checkout's fetchClientSecret). Prefer the
// header when present, then fall back to body.token.
function readToken(request: Request, body: { token?: unknown }): string | null {
  const header = request.headers.get("authorization") ?? "";
  const fromHeader = header.replace(/^Bearer\s+/i, "").trim();
  if (fromHeader) return fromHeader.slice(0, 200);
  const fromBody = body.token;
  return typeof fromBody === "string" && fromBody ? fromBody.slice(0, 200) : null;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) return bad("checkout_unavailable", 503);

  let body: { lang?: unknown; items?: unknown; token?: unknown; code?: unknown };
  try {
    body = await request.json();
  } catch {
    return bad("bad_request");
  }
  const lang: Lang = body.lang === "en" ? "en" : "fr";
  const incoming = Array.isArray(body.items) ? (body.items as IncomingItem[]).slice(0, MAX_LINES) : [];
  if (!incoming.length) return bad("empty_cart");

  // Membership is resolved server-side against rusc-admin's /session endpoint,
  // using the bearer token the cart sends (stored as TOKEN_KEY client-side).
  // The browser's own "member" flag is never trusted.
  const token = readToken(request, body);
  const isMember = memberDiscountEnabled() && (await resolveMember(token));

  // Classes: the places to pay for, from rūsc admin (never from the browser):
  // the class, and how many of the person's places are still unpaid. Their
  // hold lasts while the Stripe session is open.
  const seatOf = (item: IncomingItem) => (typeof item.booking?.seat === "string" && item.booking.seat ? item.booking.seat.slice(0, 100) : null);
  const seats = incoming.map(seatOf).filter((s): s is string => !!s);
  // The classes made in rūsc admin, with their prices as they are now.
  const [held, classes] = await Promise.all([placesForCheckout(seats), loadClasses()]);
  if (!held) return bad("checkout_unavailable", 503);
  const places = new Map(held.map((p) => [p.seat, p]));
  // A place freed before payment (ran out, removed in another tab): the cart
  // refreshes and says so.
  if (seats.some((s) => !places.get(s)?.ok)) return bad("places_gone", 409);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const summary: string[] = [];
  for (const item of incoming) {
    const seat = seatOf(item);
    const place = seat ? places.get(seat) : undefined;
    // Already paid (in another tab): nothing to charge.
    if (place && !place.unpaid) continue;
    const key = place?.offer ?? item?.key;
    const offer = typeof key === "string" ? offerByKey(key) : undefined;
    // Unknown, or a class made in rūsc admin while it can't be reached.
    if (!offer) return classes ? bad("unknown_item") : bad("checkout_unavailable", 503);

    // Members-only offers (open studio slots/passes, except the membership
    // itself which anyone can buy): a non-member cannot put them in a cart.
    // The browser's flag is never trusted — membership is resolved server-side.
    if (offer.tone === "member" && offer.key !== "adhesion" && !isMember) {
      return bad("members_only");
    }

    // Whether this line is discounted: members get -10% on sessions and
    // carnets (never on the membership itself, nor on gift vouchers).
    const discounted = isMember && memberDiscountable(offer.key);

    let name: string = offer[lang].title;
    let unitAmount: number = offer.price;
    let qty = 1;
    // A gift voucher of any amount: the buyer's choice, within the offer's bounds.
    if (amountBounds(offer.key)) {
      const cents = validAmount(offer.key, item.amount);
      if (cents === null) return bad("bad_amount");
      unitAmount = cents;
      name = `${offer[lang].tag} · ${(cents / 100).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB")} €`;
    }
    let bookingUid = "";
    if (offer.kind === "session") {
      const uid = item.booking?.uid;
      const start = place?.start ?? item.booking?.start;
      if (typeof uid !== "string" || typeof start !== "string" || Number.isNaN(Date.parse(start))) {
        return bad("session_without_booking");
      }
      name += ` — ${formatSlot(start, lang)}`;
      // The person's seat in the class if known (what rūsc admin marks paid,
      // with the extra places of its group), else the Cal booking.
      bookingUid = (seat ?? uid).slice(0, 64);
      qty = place?.unpaid ?? 1;
    } else {
      qty = Math.max(1, Math.min(20, Math.floor(Number(item.qty)) || 1));
    }

    if (discounted) unitAmount = memberPrice(unitAmount);

    lineItems.push({
      quantity: qty,
      price_data: {
        currency: "eur",
        unit_amount: unitAmount,
        product_data: { name: discounted ? `${name} (−${MEMBER_DISCOUNT_PERCENT} %)` : name },
      },
    });
    // <key>[:<amount in cents>]x<qty>[@<seat>]: rūsc admin reads it from the metadata.
    summary.push(`${offer.key}${amountBounds(offer.key) ? `:${unitAmount}` : ""}x${qty}${bookingUid ? `@${bookingUid}` : ""}`);
  }
  if (!lineItems.length) return bad("empty_cart");

  // A code the customer entered on the cart page (W3): a euro-valued code that
  // covers part of the total. Server-side only — the browser supplies the code
  // string, but the coverage and the price are recomputed here and by rusc-admin.
  // When no code is present (or the feature is off), this path is untouched.
  const totalCents = lineItems.reduce((sum, li) => sum + (li.price_data?.unit_amount ?? 0) * (li.quantity ?? 0), 0);
  const rawCode = typeof body.code === "string" ? body.code.trim() : "";
  let coupon: Stripe.Coupon | null = null;
  let holdId = 0;
  let codeCovered: { code: string; cents: number } | null = null;
  const metadata: Record<string, string> = { lang, ...chunks(summary.join(" ")) };

  if (CODE_PAYMENT_ENABLED && rawCode) {
    const cover = await coverCode(rawCode, totalCents);
    if (!cover.ok) {
      // Map rusc-admin's reason to a clear checkout error.
      const error = cover.reason === "not_euros" ? "code_not_euros" : cover.reason === "unknown" ? "code_unknown" : cover.reason ?? "code_unavailable";
      return bad(error);
    }
    const coveredCents = cover.coveredCents ?? 0;
    holdId = cover.holdId ?? 0;
    // A code cannot cover the whole cart: Stripe payment mode needs a positive
    // amount, and the remainder is paid by card.
    if (coveredCents >= totalCents) {
      await releaseCodeHold(holdId);
      return bad("code_covers_full");
    }
    if (coveredCents > 0) {
      try {
        coupon = await stripe.coupons.create({
          amount_off: coveredCents,
          currency: "eur",
          duration: "once",
          name: "Code rūsc",
        });
      } catch {
        await releaseCodeHold(holdId);
        return bad("checkout_unavailable", 503);
      }
    }
    codeCovered = { code: cover.code ?? rawCode, cents: coveredCents };
    metadata.code_key = cover.code ?? rawCode;
    metadata.code_covered_cents = String(coveredCents);
    metadata.hold_id = String(holdId);
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
      redirect_on_completion: "never",
      mode: "payment",
      locale: lang,
      line_items: lineItems,
      discounts: coupon ? [{ coupon: coupon.id }] : undefined,
      metadata,
      // Places are held for 40 minutes from here (rūsc admin): the session
      // closes before (Stripe's shortest is 30 minutes), so nobody pays for a
      // place that was freed.
      ...(seats.length ? { expires_at: Math.floor(Date.now() / 1000) + 31 * 60 } : {}),
    });
  } catch (error) {
    // If the session can't be created, give back the reserved code balance.
    if (holdId > 0) await releaseCodeHold(holdId).catch(() => {});
    throw error;
  }

  return Response.json({ clientSecret: session.client_secret, id: session.id, codeCovered });
}

// Status of a finished checkout, for the confirmation shown in the cart page.
export async function GET(request: Request) {
  const stripe = getStripe();
  if (!stripe) return bad("checkout_unavailable", 503);
  const id = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!id.startsWith("cs_")) return bad("bad_session_id");
  const session = await stripe.checkout.sessions.retrieve(id);
  return Response.json({ status: session.status, paymentStatus: session.payment_status });
}
