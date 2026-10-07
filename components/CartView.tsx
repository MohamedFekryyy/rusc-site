"use client";

import { loadStripe, type StripeEmbeddedCheckout } from "@stripe/stripe-js";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Add, ArrowLeft, Minus } from "iconsax-reactjs";
import { offerByKey } from "@/lib/cal";
import { applyCode, cart, cartTotal, clearAppliedCode, linePrice, useAppliedCode, useCart } from "@/lib/cart";
import { loadClasses } from "@/lib/classes";
import { checkCode, formatBalance, orderCodes, redeemCode, type CodeResult, type OrderCodes } from "@/lib/codes";
import { CODE_PAYMENT_ENABLED } from "@/lib/code-payment";
import { formatPrice, formatSlot, formatTime } from "@/lib/format";
import { getToken } from "@/lib/auth";
import { addPlace, placesState, releasePlaces, removePlace, type PlaceState } from "@/lib/places";
import { BOOKING, PAGES, type Lang } from "@/lib/routes";

const TEXT = {
  fr: {
    empty: "Votre panier est vide.",
    browse: "Voir les cours, carnets et bons cadeaux",
    more: "Continuer mes achats",
    remove: "Retirer",
    anyClass: "Pour n’importe quel cours ou stage · valable 1 an",
    less: "Un de moins",
    plus: "Un de plus",
    total: "Total",
    pay: "Payer",
    ttc: "Prix TTC. Les créneaux réservés sont confirmés après le paiement.",
    unavailable: "Le paiement en ligne ouvre bientôt. En attendant, écrivez-nous : nous finalisons votre commande avec vous.",
    contact: "Nous contacter",
    back: "Retour au panier",
    thanks: "Merci, votre paiement est confirmé.",
    thanksNext: "Vous recevez un reçu par e-mail. Pour les bons cadeaux et les carnets, l’atelier vous écrit avec votre code.",
    home: "Retour au site",
    codesTitle: "Vos codes",
    codesNext: "Gardez-les : sur la page Réserver, ils règlent vos cours (ou offrez-les).",
    codesWait: "Vos codes arrivent…",
    validUntil: (date: string) => `valable jusqu’au ${date}`,
    codeApplied: "Code appliqué :",
    codeRemove: "Retirer",
    codePlaceholder: "Vous avez un code ? Ex. RUSC-XXXX-XXXX",
    codeApply: "Utiliser ce code",
    codeHint: "Un carnet ou une carte d’atelier libre règle vos créneaux ; un bon cadeau d’un montant, une partie du panier (le reste par carte).",
    codeChecking: "On vérifie…",
    codeBalance: (left: string) => `${left} disponibles, déduits au paiement`,
    codePaid: (paid: string, left: string) => `Votre code a réglé ${paid} : c’est confirmé. Il vous reste ${left}.`,
    codeErrors: {
      unknown: "Code inconnu.",
      expired: "Ce code a expiré.",
      not_for_this_class: "Ce code n’est valable pour aucun cours de votre panier.",
      insufficient: "Le solde de ce code ne suffit pas pour ces créneaux.",
      empty: "Ce code est épuisé.",
      classesOnly: "Ce code règle des cours : il s’utilise sur un créneau réservé, pas sur les carnets ni les bons.",
      too_many: "Trop d’essais : réessayez dans quelques minutes.",
      error: "Vérification impossible pour le moment, réessayez.",
    } as Record<string, string>,
    codeDropped: "Ce code ne pouvait pas régler le panier : il a été retiré. Saisissez-le à nouveau ci-dessous.",
    codeCoversFull: "Votre bon couvre tout le panier, mais le paiement en ligne a besoin d’un reste à payer. Écrivez-nous : l’atelier valide la commande avec vous.",
    payFailed: "Le paiement n’a pas pu s’ouvrir. Réessayez dans un instant ; si cela continue, écrivez-nous.",
    lessPlace: "Une place de moins",
    morePlace: "Une place de plus",
    heldUntil: (time: string, many: boolean) =>
      many ? `Places gardées jusqu’à ${time} : payez pour les confirmer.` : `Place gardée jusqu’à ${time} : payez pour la confirmer.`,
    full: "Il n’y a plus de place libre dans ce cours.",
    released: (title: string) => `« ${title} » n’a pas été payé à temps : la place a été libérée. Vous pouvez la réserver à nouveau.`,
    placesGone: "Une place de votre panier vient d’être libérée : vérifiez le panier, puis payez.",
    membersOnly: "L’atelier libre est réservé aux membres. Adhérez d’abord (50 € / an), puis revenez réserver.",
    membersOnlySeat: "Ce créneau est réservé aux membres : retirez-le du panier pour continuer.",
  },
  en: {
    empty: "Your cart is empty.",
    browse: "See courses, cards and gift vouchers",
    more: "Keep shopping",
    remove: "Remove",
    anyClass: "For any course or workshop · valid 1 year",
    less: "One less",
    plus: "One more",
    total: "Total",
    pay: "Pay",
    ttc: "Prices include VAT. Booked slots are confirmed once paid.",
    unavailable: "Online payment opens soon. In the meantime, write to us and we’ll complete your order with you.",
    contact: "Contact us",
    back: "Back to cart",
    thanks: "Thank you, your payment is confirmed.",
    thanksNext: "A receipt is on its way by email. For gift vouchers and cards, the studio will email you your code.",
    home: "Back to the site",
    codesTitle: "Your codes",
    codesNext: "Keep them: on the booking page they pay for your classes (or give them as a gift).",
    codesWait: "Your codes are on their way…",
    validUntil: (date: string) => `valid until ${date}`,
    codeApplied: "Code applied:",
    codeRemove: "Remove",
    codePlaceholder: "Have a code? e.g. RUSC-XXXX-XXXX",
    codeApply: "Use this code",
    codeHint: "A class pass or open-studio card pays for your slots; a gift voucher of an amount pays part of the cart (the rest by card).",
    codeChecking: "Checking…",
    codeBalance: (left: string) => `${left} available, taken off at payment`,
    codePaid: (paid: string, left: string) => `Your code paid for ${paid}, so it’s confirmed. ${left} left.`,
    codeErrors: {
      unknown: "Unknown code.",
      expired: "This code has expired.",
      not_for_this_class: "This code isn’t valid for any class in your cart.",
      insufficient: "This code’s balance doesn’t cover these slots.",
      empty: "This code is used up.",
      classesOnly: "This code pays for classes: use it on a booked slot, not on cards or vouchers.",
      too_many: "Too many tries: please try again in a few minutes.",
      error: "Can’t check codes right now, please try again.",
    } as Record<string, string>,
    codeDropped: "This code couldn’t pay for the cart, so it was removed. Enter it again below.",
    codeCoversFull: "Your voucher covers the whole cart, but online payment needs something left to pay. Write to us and the studio will confirm the order with you.",
    payFailed: "Payment couldn’t open. Please try again in a moment; if it keeps happening, write to us.",
    lessPlace: "One place less",
    morePlace: "One more place",
    heldUntil: (time: string, many: boolean) =>
      many ? `Places held until ${time}: pay to confirm them.` : `Place held until ${time}: pay to confirm it.`,
    full: "There are no free places left in this class.",
    released: (title: string) => `“${title}” wasn’t paid in time, so the place was freed. You can book it again.`,
    placesGone: "A place in your cart was just freed: check your cart, then pay.",
    membersOnly: "Open studio is for members only. Join first (€50 / year), then come back to book.",
    membersOnlySeat: "This slot is members-only: remove it from your cart to continue.",
  },
};

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const panel: CSSProperties = { maxWidth: "760px", margin: "0 auto" };
const note: CSSProperties = { textAlign: "center", color: "var(--muted)", fontSize: "14px", margin: "18px 0 0" };
const stepper: CSSProperties = {
  width: "28px", height: "28px", border: "1px solid var(--line)", background: "transparent",
  borderRadius: "50%", cursor: "pointer", color: "var(--ink)", padding: 0,
  display: "inline-grid", placeItems: "center",
};
const stepperOff: CSSProperties = { ...stepper, opacity: 0.35, cursor: "default" };
const textButton: CSSProperties = {
  background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--muted)",
  fontSize: "12px", letterSpacing: ".08em", textTransform: "uppercase", textDecoration: "underline",
};

type Stage = "cart" | "checkout" | "done" | "unavailable";

// A class that a code is asked about: one in the cart if there is one (a code
// for other classes then says so), else any (the code's kind is what matters).
function probeOffer() {
  return cart.items().find((i) => i.booking)?.key ?? "atelier-ceramique-2h";
}

// A carnet or open-studio card typed in the cart pays for the classes in it,
// place by place, as on the booking page: the booker's own place first, then
// friends' and later hours (rūsc admin takes each off the code and confirms
// it). It stops when the code runs out; what's left stays in the cart.
async function payPlacesWithCode(code: string, offers: string[] | undefined) {
  const seats = cart.items().map((i) => i.booking?.seat).filter((s): s is string => !!s);
  const states = seats.length ? await placesState(seats) : [];
  if (!states) return { matched: false, used: 0, last: null, reason: "error" };
  let matched = false;
  let used = 0;
  let last: CodeResult | null = null;
  let reason: string | undefined;
  for (const state of states) {
    if (!state.ok || !state.unpaid || !state.seat || (offers && !offers.includes(state.offer ?? ""))) continue;
    matched = true;
    const extras = state.extras ?? [];
    for (const seat of [...(state.unpaid > extras.length ? [state.seat] : []), ...extras]) {
      const result = await redeemCode(code, seat);
      if (!result.ok) {
        reason = result.reason;
        return { matched, used, last, reason };
      }
      used += result.used ?? 0;
      last = result;
    }
  }
  return { matched, used, last, reason };
}

// The cart page: lines, quantities, total, then Stripe's checkout embedded in
// the page (redirect_on_completion "never": the thanks appear in place).
export default function CartView({ lang }: { lang: Lang }) {
  const t = TEXT[lang];
  const items = useCart();
  const appliedCode = useAppliedCode();
  const appliedCodeRef = useRef(appliedCode);
  useEffect(() => {
    appliedCodeRef.current = appliedCode;
  }, [appliedCode]);
  const [codeInput, setCodeInput] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  // The applied gift voucher, as rūsc admin last answered for it (its balance).
  const [codeBalance, setCodeBalance] = useState<(CodeResult & { applied: string }) | null>(null);
  const [stage, setStage] = useState<Stage>("cart");
  const checkoutRef = useRef<HTMLDivElement>(null);
  // "Payer directement" on a booking page lands here with ?pay=1 and skips the
  // cart list, going straight to the checkout. The places are already in the
  // cart (and held), so nothing is lost.
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("pay") === "1") {
      // Once, after hydration: the server can't see ?pay=1, so reading it in
      // useState would mismatch the prerendered cart.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStage(PUBLISHABLE_KEY ? "checkout" : "unavailable");
    }
  }, []);
  // The Stripe order being paid, then the codes it created (if any).
  const orderRef = useRef<string | null>(null);
  const [order, setOrder] = useState<OrderCodes | null>(null);
  const [waiting, setWaiting] = useState(false);
  // How much the applied code covered (returned by checkout), shown on the
  // thanks screen.
  const [covered, setCovered] = useState<{ code: string; cents: number } | null>(null);
  // Classes: their places as rūsc admin holds them (lib/places.ts), by seat.
  const [placeInfo, setPlaceInfo] = useState<Record<string, PlaceState>>({});
  const [busySeat, setBusySeat] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const seatKey = items.map((i) => i.booking?.seat).filter(Boolean).join(",");
  // The classes as rūsc admin has them (names and prices edited there):
  // shown once loaded; the checkout charges them in any case.
  const [, setClassesLoaded] = useState(0);
  useEffect(() => {
    let alive = true;
    loadClasses().then((list) => {
      if (alive && list) setClassesLoaded((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Check the classes against rūsc admin: on load, then every minute. A place
  // that ran out unpaid leaves the cart (and says so); one paid elsewhere too.
  useEffect(() => {
    if (!seatKey || stage !== "cart") return;
    let alive = true;
    const check = () =>
      placesState(seatKey.split(",")).then((states) => {
        if (!alive || !states) return;
        for (const state of states) {
          const item = cart.items().find((i) => i.booking?.seat === state.seat);
          if (!item) continue;
          if (!state.ok || !state.unpaid) {
            cart.remove(item.id);
            if (!state.ok) setNotice(t.released(offerByKey(item.key)?.[lang].title ?? ""));
          } else if (state.unpaid !== item.qty) {
            cart.setQty(item.id, state.unpaid);
          }
        }
        setPlaceInfo(Object.fromEntries(states.filter((s) => s.ok && s.seat).map((s) => [s.seat!, s])));
      });
    check();
    const timer = setInterval(check, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [seatKey, refresh, stage, lang, t]);

  // + and − on a class: a place for a friend, added or removed in rūsc admin.
  async function changePlaces(id: string, seat: string, op: "add" | "remove") {
    setBusySeat(seat);
    const state = await (op === "add" ? addPlace(seat) : removePlace(seat));
    setBusySeat(null);
    if (!state.ok) {
      setRefresh((n) => n + 1);
      return;
    }
    if (state.unpaid) cart.setQty(id, state.unpaid);
    setPlaceInfo((info) => ({ ...info, [seat]: state }));
    setNotice(state.note === "full" ? t.full : null);
  }

  // A code typed in the cart. A carnet or an open-studio card pays for the
  // classes here at once (payPlacesWithCode); a gift voucher of an amount stays
  // applied and pays part of the total at checkout (W3).
  async function submitCode(raw: string) {
    const value = raw.trim();
    if (!value || codeBusy) return;
    setCodeBusy(true);
    setCodeError(null);
    setNotice(null);
    const info = await checkCode(value, probeOffer());
    let error: string | null = null;
    if (!info.unit) {
      error = info.reason ?? "error";
    } else if (info.reason === "expired" || info.reason === "empty") {
      error = info.reason;
    } else if (info.unit === "euros") {
      setCodeBalance({ ...info, applied: value });
      applyCode(value);
      setCodeInput("");
    } else if (!items.some((i) => i.booking?.seat)) {
      error = "classesOnly";
    } else {
      const { matched, used, last, reason } = await payPlacesWithCode(value, info.offers);
      if (!matched) error = "not_for_this_class";
      else if (!used || !last) error = reason ?? "error";
      else {
        setNotice(t.codePaid(formatBalance({ ...last, remaining: used }, lang), formatBalance(last, lang)));
        setCodeInput("");
      }
      // Paid places leave the cart; any left unpaid stay, with their count.
      setRefresh((n) => n + 1);
    }
    setCodeBusy(false);
    if (error) setCodeError(t.codeErrors[error] ?? t.codeErrors.error);
  }

  // The applied voucher, checked again on load: one that can't pay at checkout
  // (unknown, used up, expired, or a carnet kept from before) leaves the cart.
  useEffect(() => {
    if (!appliedCode || codeBalance?.applied === appliedCode) return;
    let alive = true;
    checkCode(appliedCode, probeOffer()).then((info) => {
      if (!alive) return;
      if (info.unit === "euros" && info.reason !== "expired" && info.reason !== "empty") {
        setCodeBalance({ ...info, applied: appliedCode });
      } else if (info.unit || info.reason === "unknown") {
        clearAppliedCode();
        setNotice(t.codeDropped);
      }
    });
    return () => {
      alive = false;
    };
  }, [appliedCode, codeBalance, t]);

  useEffect(() => {
    const host = checkoutRef.current;
    if (stage !== "checkout" || !host || !PUBLISHABLE_KEY) return;
    let cancelled = false;
    let embedded: StripeEmbeddedCheckout | null = null;
    (async () => {
      try {
        const stripe = await loadStripe(PUBLISHABLE_KEY);
        if (!stripe || cancelled) return;
        embedded = await stripe.createEmbeddedCheckoutPage({
          fetchClientSecret: async () => {
            // Trailing slash: without it, trailingSlash redirects first (308).
            const res = await fetch("/api/checkout/", {
              method: "POST",
              headers: { "content-type": "application/json" },
              // The bearer token lets checkout resolve membership server-side
              // (rusc-admin /session) for the member discount; nothing else.
              // The applied code (W3) pays for part of product totals.
              body: JSON.stringify({ lang, items: cart.items(), token: getToken(), code: appliedCodeRef.current }),
            });
            // No checkout: back to the cart, which checks again and says why.
            // (Thrown into Stripe's frame, it only reads "Something went wrong".)
            if (!res.ok) {
              let err = "";
              try { err = ((await res.json()) as { error?: string }).error ?? ""; } catch { err = ""; }
              cancelled = true;
              if (res.status === 409) {
                // A place was freed meanwhile.
                setNotice(t.placesGone);
              } else if (err === "members_only") {
                // A members-only item (open studio) in the cart of a non-member.
                setNotice(items.some((i) => offerByKey(i.key)?.kind === "session") ? t.membersOnlySeat : t.membersOnly);
              } else if (err === "code_covers_full") {
                setNotice(t.codeCoversFull);
              } else if (err.startsWith("code_") || ["inactive", "expired", "empty"].includes(err)) {
                // The applied code can't pay (a carnet kept from before, used up…).
                clearAppliedCode();
                setNotice(t.codeDropped);
              } else {
                setNotice(t.payFailed);
              }
              setStage("cart");
              setRefresh((n) => n + 1);
              // Leaving the checkout destroys Stripe's frame: nothing to hand it
              // (an error thrown here only shows up as uncaught in the console).
              return new Promise<string>(() => {});
            }
            const data = (await res.json()) as { clientSecret: string; id: string; codeCovered: { code: string; cents: number } | null };
            orderRef.current = data.id;
            setCovered(data.codeCovered);
            return data.clientSecret;
          },
          onComplete: () => {
            // Carnets and vouchers bought: rūsc admin creates their codes when
            // Stripe confirms the payment. Ask for them for up to ~30 s.
            const hasCodes = cart.items().some((i) => offerByKey(i.key)?.kind === "product" && i.key !== "adhesion");
            cart.clear();
            clearAppliedCode();
            setStage("done");
            const id = orderRef.current;
            if (!id || !hasCodes) return;
            setWaiting(true);
            let tries = 0;
            const poll = async () => {
              const result = await orderCodes(id);
              if (result?.paid && (result.codes.length || tries > 4)) {
                setOrder(result);
                setWaiting(false);
              } else if (++tries < 15) {
                setTimeout(poll, 2000);
              } else {
                setWaiting(false);
              }
            };
            poll();
          },
        });
        if (cancelled) embedded.destroy();
        else embedded.mount(host);
      } catch {
        if (!cancelled) setStage("unavailable");
      }
    })();
    return () => {
      cancelled = true;
      embedded?.destroy();
    };
  }, [stage, lang, t]);

  if (stage === "done") {
    return (
      <div style={{ ...panel, textAlign: "center" }}>
        <p style={{ fontSize: "19px", marginBottom: "8px" }}>{t.thanks}</p>
        {covered ? (
          <p style={{ color: "var(--muted)", marginBottom: "16px" }}>
            {t.codeApplied} <code style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{covered.code}</code> · {formatPrice(covered.cents, lang)}
          </p>
        ) : null}
        {order?.codes.length ? (
          <div style={{ margin: "22px auto 30px", maxWidth: "520px", textAlign: "left" }}>
            <p className="k" style={{ fontSize: "11px", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--ochre)", marginBottom: "10px" }}>
              {t.codesTitle}
            </p>
            {order.codes.map((c) => (
              <div key={c.code} style={{ border: "1px solid var(--line)", background: "rgba(255,255,255,.6)", padding: "12px 16px", marginBottom: "10px" }}>
                <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: "20px", letterSpacing: ".06em" }}>{c.code}</div>
                <div style={{ color: "var(--muted)", fontSize: "14px" }}>
                  {c.label} · {formatBalance({ ok: true, unit: c.unit, remaining: c.remaining }, lang)}
                  {c.expiresOn ? ` · ${t.validUntil(new Date(`${c.expiresOn}T12:00:00Z`).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { dateStyle: "long" }))}` : ""}
                </div>
              </div>
            ))}
            <p style={{ color: "var(--muted)", fontSize: "14px" }}>{t.codesNext}</p>
          </div>
        ) : (
          <p style={{ color: "var(--muted)", marginBottom: "28px" }}>{waiting ? t.codesWait : t.thanksNext}</p>
        )}
        <a className="btn" href={lang === "fr" ? "/" : "/en/"}>{t.home}</a>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div style={{ ...panel, textAlign: "center" }}>
        {notice && <p role="status" style={{ color: "var(--accent)", marginBottom: "14px" }}>{notice}</p>}
        <p style={{ color: "var(--muted)", marginBottom: "24px" }}>{t.empty}</p>
        <a className="btn guest" href={BOOKING[lang]}>{t.browse}</a>
      </div>
    );
  }

  if (stage === "checkout") {
    return (
      <div style={panel}>
        <button type="button" style={{ ...textButton, marginBottom: "18px", display: "inline-flex", gap: "8px", alignItems: "center" }} onClick={() => setStage("cart")}>
          <ArrowLeft size={14} color="currentColor" aria-hidden />
          {t.back}
        </button>
        <div ref={checkoutRef} className="bk-shell" style={{ minHeight: "480px", padding: "10px" }} />
      </div>
    );
  }

  const total = cartTotal(items);
  return (
    <div style={panel}>
      {notice && (
        <p role="status" style={{ ...note, margin: "0 0 18px", color: "var(--accent)" }}>
          {notice}
        </p>
      )}
      <div className="rows">
        {items.map((item, index) => {
          const offer = offerByKey(item.key)!;
          // A class booked on the site: its places live in rūsc admin.
          const seat = item.booking?.seat;
          const place = seat ? placeInfo[seat] : undefined;
          const busy = !!seat && busySeat === seat;
          // Open studio booked for several hours: the line is charged per person
          // and hour, and its + / − count people.
          const hours = place?.hours ?? item.booking?.hours ?? 1;
          const people = hours > 1 ? (place?.places ?? Math.ceil(item.qty / hours)) : item.qty;
          return (
            // The Total row draws the line under the last item.
            <div className="row" key={item.id} style={{ alignItems: "center", ...(index === items.length - 1 ? { borderBottom: 0 } : {}) }}>
              <span className="lbl">
                {item.amount ? `${offer[lang].tag} · ${formatPrice(item.amount, lang)}` : offer[lang].title}
                <small>
                  {item.booking
                    ? hours > 1
                      ? `${formatSlot(item.booking.start, lang)} – ${formatTime(place?.end ?? item.booking.end ?? item.booking.start, lang)} · ${hours} h`
                      : formatSlot(item.booking.start, lang)
                    : item.amount ? t.anyClass : offer[lang].unit}
                </small>
                {place?.expiresAt && <small>{t.heldUntil(formatTime(place.expiresAt, lang), item.qty > 1)}</small>}
                <button
                  type="button"
                  style={{ ...textButton, marginTop: "6px" }}
                  onClick={() => {
                    // Frees the places at once, so they don't stay taken unpaid.
                    if (seat) releasePlaces(seat);
                    cart.remove(item.id);
                  }}
                >
                  {t.remove}
                </button>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                {seat ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                    <button
                      type="button"
                      style={busy || people <= 1 ? stepperOff : stepper}
                      aria-label={t.lessPlace}
                      disabled={busy || people <= 1}
                      onClick={() => changePlaces(item.id, seat, "remove")}
                    >
                      <Minus size={14} color="currentColor" aria-hidden />
                    </button>
                    <span style={{ minWidth: "18px", textAlign: "center" }}>{people}</span>
                    <button
                      type="button"
                      style={busy || place?.left === 0 ? stepperOff : stepper}
                      aria-label={t.morePlace}
                      disabled={busy || place?.left === 0}
                      onClick={() => changePlaces(item.id, seat, "add")}
                    >
                      <Add size={14} color="currentColor" aria-hidden />
                    </button>
                  </span>
                ) : !item.booking && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                    <button type="button" style={stepper} aria-label={t.less} onClick={() => cart.setQty(item.id, item.qty - 1)}><Minus size={14} color="currentColor" aria-hidden /></button>
                    <span style={{ minWidth: "18px", textAlign: "center" }}>{item.qty}</span>
                    <button type="button" style={stepper} aria-label={t.plus} onClick={() => cart.setQty(item.id, item.qty + 1)}><Add size={14} color="currentColor" aria-hidden /></button>
                  </span>
                )}
                {/* Fixed width keeps the steppers lined up from row to row. */}
                <span className="val" style={{ minWidth: "4.6em", textAlign: "right" }}>
                  {formatPrice(linePrice(item) * item.qty, lang)}
                </span>
              </span>
            </div>
          );
        })}
        <div className="row" style={{ borderTop: "1px solid var(--ink)", marginTop: "6px" }}>
          <span className="lbl" style={{ fontSize: "16px" }}>{t.total}</span>
          <span className="val">{formatPrice(total, lang)}</span>
        </div>
      </div>

      {CODE_PAYMENT_ENABLED && (
        <div style={{ marginTop: "18px" }}>
          {appliedCode ? (
            <div style={{ textAlign: "center" }}>
              <span style={{ color: "var(--muted)", fontSize: "14px" }}>
                {t.codeApplied} <code style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{appliedCode}</code>
                {codeBalance?.applied === appliedCode && ` · ${t.codeBalance(formatBalance(codeBalance, lang))}`}
              </span>{" "}
              <button type="button" style={textButton} onClick={clearAppliedCode}>{t.codeRemove}</button>
            </div>
          ) : (
            <form
              style={{ display: "flex", gap: "8px", justifyContent: "center", alignItems: "stretch" }}
              onSubmit={(e) => {
                e.preventDefault();
                submitCode(codeInput);
              }}
            >
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder={t.codePlaceholder}
                autoComplete="off"
                spellCheck={false}
                style={{ padding: "8px 12px", border: "1px solid var(--line)", borderBottom: "none", background: "#fff", color: "var(--ink)", font: "inherit", flex: "1 1 auto", minWidth: "0" }}
              />
              <button type="submit" className="btn guest" style={{ whiteSpace: "nowrap" }} disabled={codeBusy}>
                {codeBusy ? t.codeChecking : t.codeApply}
              </button>
            </form>
          )}
          {codeError && <p role="alert" style={{ ...note, margin: "10px 0 0", color: "var(--ochre)" }}>{codeError}</p>}
          <p style={{ ...note, margin: "10px 0 0" }}>{t.codeHint}</p>
        </div>
      )}

      {stage === "unavailable" ? (
        <div style={{ textAlign: "center", marginTop: "26px" }}>
          <p style={{ color: "var(--muted)", marginBottom: "18px" }}>{t.unavailable}</p>
          <a className="btn guest" href={PAGES.contact[lang]}>{t.contact}</a>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "26px" }}>
          <a className="btn guest" href={BOOKING[lang]}>{t.more}</a>
          <button
            type="button"
            className="btn member"
            onClick={() => setStage(PUBLISHABLE_KEY ? "checkout" : "unavailable")}
          >
            {t.pay} · {formatPrice(total, lang)}
          </button>
        </div>
      )}
      <p style={note}>{t.ttc}</p>
    </div>
  );
}
