"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  BOOKING_VIEWS,
  CAL_ORIGIN,
  isBookingView,
  isOfferKey,
  offerByKey,
  offerCalLink,
  offersIn,
  type BookingView,
  type OfferKey,
} from "@/lib/cal";
import { getSession, type AuthUser } from "@/lib/auth";
import { amountBounds, cart, validAmount } from "@/lib/cart";
import { checkCode, formatBalance, redeemCode, type CodeResult } from "@/lib/codes";
import { holdPlaces, type PlaceState } from "@/lib/places";
import { CART, HOME, PAGES, bookingHref, type Lang } from "@/lib/routes";
import OfferCard from "./OfferCard";

const TEXT = {
  fr: {
    tabs:{ schedule: "Cours & stages", catalog: "Adhésion & carnets", gifts: "Bons cadeaux" },
    back: "← Toutes les offres",
    soon: (title: string) => `La réservation en ligne de « ${title} » ouvre bientôt.`,
    soonNext: "En attendant, écrivez-nous : nous réservons pour vous.",
    contact: "Nous contacter",
    addToCart: "Ajouter au panier",
    added: (title: string) => `« ${title} » est dans votre panier.`,
    amountRange: (min: number, max: number) => `Un montant entier entre ${min} et ${max} €.`,
    viewCart: "Voir le panier",
    payDirectly: "Payer directement",
    keepBrowsing: "Continuer",
    slotAdded: "Créneau ajouté au panier : il est confirmé une fois le panier payé.",
    placesAdded: (n: number) => `${n} places ajoutées au panier : elles sont confirmées une fois le panier payé.`,
    heldFor: (many: boolean) => (many ? "Vos places sont gardées 30 minutes." : "Votre place est gardée 30 minutes."),
    onlyLeft: (n: number) => `Il ne restait que ${n} place${n > 1 ? "s" : ""} dans ce cours.`,
    slotPaid: "Votre place est réservée. Merci.",
    bookedTitle: "À l’atelier",
    bookedText: "On vous attend à l’atelier rūsc, 99 Promenade Marie-Paradis à Chamonix. Venez les mains libres : le tablier, la terre et un bon moment sont déjà là.",
    bookedNext: "Envie d’en faire une habitude ? Découvrez nos carnets. Ou offrez ce moment : un bon cadeau.",
    backHome: "Retour à l’accueil",
    codeAsk: "Tu as un carnet, un bon cadeau ou un code de l’atelier ?",
    codePlaceholder: "Entre ton code ici",
    codeUse: "C’est parti",
    codeHint: "Commence par entrer ton code : ta place lui sera déduite à la fin.",
    codeValidating: "On vérifie…",
    codeApplied: (label: string) => `Code « ${label} » reconnu.`,
    codeRemove: "Retirer",
    codeOk: (label: string, left: string) => `${label} · reste ${left}. La réservation sera déduite de votre code.`,
    codeErrors: {
      unknown: "Code inconnu.",
      expired: "Ce code a expiré.",
      not_for_this_class: "Ce code n’est pas valable pour ce cours.",
      insufficient: "Le solde de ce code ne suffit pas pour ce cours.",
      empty: "Ce code est épuisé.",
      too_many: "Trop d’essais : réessayez dans quelques minutes.",
      error: "Vérification impossible pour le moment, réessayez.",
    } as Record<string, string>,
    slotCode: (left: string) => `Réservé avec votre code : il vous reste ${left}.`,
    slotCodePart: (paid: number, rest: number) =>
      `Votre code a réglé ${paid} place${paid > 1 ? "s" : ""} ; ${rest > 1 ? `les ${rest} autres sont` : "l’autre est"} dans votre panier.`,
    slotCodeFailed: "Votre code n’a pas pu être utilisé : la séance est dans votre panier.",
    membersOnlyTitle: "Réservé aux membres",
    membersOnlyBody: "L’atelier libre est réservé aux membres. Adhérez d’abord (50 € / an), connectez-vous, puis revenez réserver.",
    membersOnlyCta: "Devenir membre",
  },
  en: {
    tabs:{ schedule: "Courses & workshops", catalog: "Membership & cards", gifts: "Gift vouchers" },
    back: "← All offers",
    soon: (title: string) => `Online booking for “${title}” opens soon.`,
    soonNext: "In the meantime, write to us and we’ll book it for you.",
    contact: "Contact us",
    addToCart: "Add to cart",
    added: (title: string) => `“${title}” is in your cart.`,
    amountRange: (min: number, max: number) => `A whole amount between €${min} and €${max}.`,
    viewCart: "View cart",
    payDirectly: "Pay directly",
    keepBrowsing: "Keep browsing",
    slotAdded: "Slot added to your cart: it’s confirmed once the cart is paid.",
    placesAdded: (n: number) => `${n} places added to your cart: they’re confirmed once the cart is paid.`,
    heldFor: (many: boolean) => (many ? "We’ll hold your places for 30 minutes." : "We’ll hold your place for 30 minutes."),
    onlyLeft: (n: number) => `Only ${n} place${n > 1 ? "s were" : " was"} left in this class.`,
    slotPaid: "Your place is reserved. Thank you.",
    bookedTitle: "At the studio",
    bookedText: "We’ll see you at rūsc, 99 Promenade Marie-Paradis in Chamonix. Come with your hands free: the apron, the clay and a good time are already there.",
    bookedNext: "Want to make it a habit? Discover our class cards. Or gift this moment: a voucher.",
    backHome: "Back to home",
    codeAsk: "Got a class pass, gift voucher or studio code?",
    codePlaceholder: "Enter your code here",
    codeUse: "Let’s go",
    codeHint: "Start by entering your code: your place will be taken off it at the end.",
    codeValidating: "Checking…",
    codeApplied: (label: string) => `Code “${label}” recognised.`,
    codeRemove: "Remove",
    codeOk: (label: string, left: string) => `${label} · ${left} left. The booking will be taken off your code.`,
    codeErrors: {
      unknown: "Unknown code.",
      expired: "This code has expired.",
      not_for_this_class: "This code isn’t valid for this class.",
      insufficient: "This code’s balance doesn’t cover this class.",
      empty: "This code is used up.",
      too_many: "Too many tries: please try again in a few minutes.",
      error: "Can’t check codes right now, please try again.",
    } as Record<string, string>,
    slotCode: (left: string) => `Booked with your code: ${left} left.`,
    slotCodePart: (paid: number, rest: number) =>
      `Your code paid for ${paid} place${paid > 1 ? "s" : ""}; the other${rest > 1 ? ` ${rest} are` : " is"} in your cart.`,
    slotCodeFailed: "Your code couldn’t be used: the class is in your cart.",
    membersOnlyTitle: "Members only",
    membersOnlyBody: "Open studio is for members only. Join first (€50 / year), sign in, then come back to book.",
    membersOnlyCta: "Become a member",
  },
};

// The booker in the site's colours (--accent in styles/globals.css).
const UI = {
  theme: "light",
  cssVarsPerTheme: { light: { "cal-brand": "#3b4e3e" } },
  hideEventTypeDetails: false,
  layout: "month_view",
};

const tabsBar: CSSProperties = {
  justifyContent: "center", fontSize: "12px", letterSpacing: ".14em",
  textTransform: "uppercase", marginBottom: "30px",
};
const backBar: CSSProperties = { padding: "14px 18px", borderBottom: "1px solid var(--line)" };
const backLink: CSSProperties = {
  fontSize: "11.5px", letterSpacing: ".14em", textTransform: "uppercase",
  color: "var(--accent)", textDecoration: "none",
};
const soonBox: CSSProperties = { padding: "72px 24px", textAlign: "center", color: "var(--muted)" };
const productBox: CSSProperties = { padding: "56px 24px", textAlign: "center" };
const bookedBar: CSSProperties = {
  display: "flex", gap: "14px", alignItems: "center", justifyContent: "center", flexWrap: "wrap",
  padding: "14px 18px", background: "rgba(59,78,62,.08)", borderBottom: "1px solid var(--line)",
  fontSize: "14px", color: "var(--accent)",
};
const toastBox: CSSProperties = {
  position: "fixed", left: "50%", bottom: "24px", transform: "translateX(-50%)", zIndex: 80,
  background: "var(--accent)", color: "var(--bg)", padding: "12px 18px", fontSize: "13px",
  letterSpacing: ".03em", boxShadow: "0 10px 30px rgba(20,20,21,.18)", maxWidth: "calc(100vw - 32px)",
};
const toastLink: CSSProperties = { color: "var(--bg)", marginLeft: "10px", textDecoration: "underline" };
// A <form>: undo the contact form's global form{} rule (styles/home.css).
const codeBar: CSSProperties = {
  display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", maxWidth: "none", margin: 0,
  padding: "12px 18px", borderBottom: "1px solid var(--line)", fontSize: "14px",
};
const codeInputStyle: CSSProperties = {
  font: "inherit", padding: "7px 10px", border: "1px solid var(--line)", background: "#fff",
  minWidth: "0", width: "170px", textTransform: "uppercase", letterSpacing: ".06em",
};
const smallButton: CSSProperties = { padding: "8px 16px", fontSize: "11px", cursor: "pointer" };
const linkButton: CSSProperties = {
  background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--muted)",
  fontSize: "12px", textDecoration: "underline",
};

type CalBooking = { uid?: string; startTime?: string; endTime?: string; paymentRequired?: boolean };
// Cal's older bookingSuccessful event carries the whole booking, including
// the attendee's own seat reference in a class (several people per slot).
// ruscPlaces: how many places the booker asked for (its "number of places",
// deploy/cal/patches/seats-count.patch). Cal books the booker's own.
type CalBookingV1 = { booking?: CalBooking & { seatReferenceUid?: string | null; ruscPlaces?: number } };
// What became of the places just booked: in the cart (unpaid of them), paid
// in Cal, or taken off a code (all, some, or none of them). total < asked
// when the class had fewer places free.
type Booked = {
  kind: "cart" | "paid" | "code" | "codePart" | "codeFailed";
  left?: string;
  unpaid?: number;
  paidByCode?: number;
  total?: number;
  asked?: number;
};

// The places just booked: the extra places asked for and the hold on unpaid
// ones (rūsc admin, lib/places.ts), then the code in use pays for as many of
// them as it covers. What's left unpaid goes to the cart.
async function settlePlaces(seat: string, asked: number, code: string | null) {
  let state: PlaceState | null = asked > 1 || !code ? await holdPlaces(seat, asked) : null;
  let paidByCode = 0;
  let codeResult: CodeResult | null = null;
  if (code) {
    const seats = [seat, ...(state?.ok ? (state.extras ?? []) : [])];
    for (const s of seats) {
      const result = await redeemCode(code, s);
      if (!result.ok) break;
      paidByCode += 1;
      codeResult = result;
    }
    state = paidByCode < seats.length ? await holdPlaces(seat, asked) : null;
  }
  // rūsc admin out of reach: the booker's own place still goes to the cart.
  const unpaid = state ? (state.ok ? (state.unpaid ?? 0) : 1) : 0;
  const total = (state?.ok ? state.places : undefined) ?? paidByCode + unpaid;
  return { unpaid, total, paidByCode, codeResult };
}

type CalQueue = ((...args: unknown[]) => void) & {
  q: unknown[];
  ns: Record<string, CalQueue>;
  loaded?: boolean;
};

declare global {
  interface Window {
    Cal?: CalQueue;
  }
}

function queue(): CalQueue {
  const fn = ((...args: unknown[]) => {
    fn.q.push(args);
  }) as CalQueue;
  fn.q = [];
  fn.ns = {};
  return fn;
}

// Cal.com's loader contract: calls queue up on window.Cal (one queue per
// namespace) until the Cal.com server's embed.js arrives; embed.js then runs
// the queues and every later call directly.
function getCal(): CalQueue {
  if (window.Cal) return window.Cal;
  const root = queue();
  const cal = ((...args: unknown[]) => {
    if (args[0] === "init" && typeof args[1] === "string") {
      const name = args[1];
      cal.ns[name] ??= queue();
      cal.ns[name].q.push(args);
      cal.q.push(["initNamespace", name]);
      return;
    }
    cal.q.push(args);
  }) as CalQueue;
  cal.q = root.q;
  cal.ns = root.ns;
  cal.loaded = true;
  window.Cal = cal;
  const script = document.createElement("script");
  script.src = `${CAL_ORIGIN}/embed/embed.js`;
  document.head.appendChild(script);
  return cal;
}

// A Cal.com namespace holds a single embed, so each offer gets a new one.
let namespaces = 0;

// The booking block: the offers of the selected tab, then the Cal.com booker
// of the chosen offer, embedded (visitors never leave the site).
// It opens on ?workshop=<offer key> or ?view=catalog|gifts (see bookingHref),
// and every [data-booking] link on the page switches it in place.
export default function BookingEmbed({ lang }: { lang: Lang }) {
  const t = TEXT[lang];
  const shellRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const activeNs = useRef<string | null>(null);
  const [view, setView] = useState<BookingView>("schedule");
  const [offerKey, setOfferKey] = useState<OfferKey | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  // A slot was booked in the Cal booker: added to the cart, paid in Cal, or
  // taken off a code.
  const [booked, setBooked] = useState<Booked | null>(null);
  // A carnet / voucher / studio code, checked for the chosen class.
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState<CodeResult | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  // A signed-in member (Connexion page): their name and e-mail are filled in
  // Cal's booker, so the booking shows in their space.
  const [member, setMember] = useState<AuthUser | null>(null);
  // Whether the session is known to be settled (member or not) yet: while
  // empty, the booker for a members-only offer must not mount.
  const [sessionKnown, setSessionKnown] = useState(false);
  useEffect(() => {
    let alive = true;
    getSession()
      .then((user) => {
        if (alive) { if (user) setMember(user); setSessionKnown(true); }
      })
      .catch(() => { if (alive) setSessionKnown(true); });
    return () => {
      alive = false;
    };
  }, []);
  // Title of the offer just added to the cart (confirmation toast).
  const [toast, setToast] = useState<string | null>(null);
  const offer = offerKey ? offerByKey(offerKey) : undefined;
  // Members-only offers (open studio) require an active membership to book.
  const memberGated = offer ? offer.tone === "member" && offer.key !== "adhesion" : false;
  const needsMember = memberGated && sessionKnown && !member?.member;
  const [codeBusy, setCodeBusy] = useState(false);
  // The code as the Cal callbacks see it, and the booking the first success
  // event already handled (Cal then sends a second one for the same booking).
  const codeRef = useRef<string | null>(null);
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    function open(next: BookingView, key?: string | null) {
      const target = isOfferKey(key) ? key : null;
      setView(target ? offerByKey(target)!.view : next);
      setOfferKey(target);
      setUnavailable(false);
      setBooked(null);
      setCode(null);
      setCodeError(null);
      codeRef.current = null;
    }

    const params = new URLSearchParams(window.location.search);
    const requested = params.get("view");
    open(isBookingView(requested) ? requested : "schedule", params.get("workshop"));

    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      // "Add to cart" buttons (cards, membership, gift vouchers).
      const adder = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-cart]") : null;
      const key = adder?.dataset.cart;
      if (adder && isOfferKey(key)) {
        event.preventDefault();
        const bounds = amountBounds(key);
        if (bounds) {
          // A gift voucher of any amount: the field beside the button, in whole euros.
          const field = adder.closest("article")?.querySelector<HTMLInputElement>("input[name=amount]");
          const euros = Math.round(Number(field?.value));
          const cents = validAmount(key, euros * 100);
          if (cents === null) {
            field?.setCustomValidity(t.amountRange(bounds.min / 100, bounds.max / 100));
            field?.reportValidity();
            return;
          }
          field?.setCustomValidity("");
          cart.addAmount(key, cents);
          setToast(`${offerByKey(key)![lang].tag} · ${euros} €`);
          return;
        }
        cart.add(key);
        setToast(offerByKey(key)![lang].title);
        return;
      }
      const link =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-booking]") : null;
      const next = link?.dataset.booking;
      if (!link || !isBookingView(next)) return;
      event.preventDefault();
      open(next, link.dataset.workshop);
      // Keep the address shareable: it names what the block shows.
      history.replaceState(null, "", link.href);
      shellRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [lang, t]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Mount the Cal.com booker of the chosen offer.
  useEffect(() => {
    const host = hostRef.current;
    // Members-only sessions (open studio) don't mount for a non-member: the
    // members-only notice is shown instead (needsMember above).
    if (!offer || offer.kind !== "session" || !host || (memberGated && needsMember)) return;
    const cal = getCal();
    const ns = `rusc${++namespaces}`;
    activeNs.current = ns;
    const el = document.createElement("div");
    host.appendChild(el);
    cal("init", ns, { origin: CAL_ORIGIN });
    cal.ns[ns]("ui", UI);
    // Event type not created in Cal.com yet: say so, in the page's language.
    cal.ns[ns]("on", {
      action: "linkFailed",
      callback: () => {
        if (activeNs.current === ns) setUnavailable(true);
      },
    });
    // A place was booked. This event comes first and carries the whole
    // booking, with this person's seat and the number of places they asked
    // for: rūsc admin adds the others and holds the unpaid ones, the code in
    // use pays for what it covers, and the rest goes to the cart (paid there).
    cal.ns[ns]("on", {
      action: "bookingSuccessful",
      callback: (event: CustomEvent<{ data?: CalBookingV1 }>) => {
        const booking = event.detail?.data?.booking;
        if (activeNs.current !== ns || !booking?.uid || !booking.startTime) return;
        handledRef.current = booking.uid;
        const seat = booking.seatReferenceUid ?? undefined;
        const asked = Math.max(1, Math.min(20, Math.floor(Number(booking.ruscPlaces)) || 1));
        const slot = { uid: booking.uid, seat, start: booking.startTime, end: booking.endTime };
        // Bring the result into view: the cart message ("added, pay to confirm")
        // must be what the visitor sees first, not Cal's own confirmation.
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
        if (!seat) {
          cart.addBooking(offer.key, slot);
          setBooked({ kind: "cart", unpaid: 1, total: 1, asked: 1 });
          return;
        }
        const usedCode = codeRef.current;
        settlePlaces(seat, asked, usedCode).then(({ unpaid, total, paidByCode, codeResult }) => {
          if (activeNs.current !== ns) return;
          if (unpaid) cart.addBooking(offer.key, slot, unpaid);
          if (codeResult) setCode(codeResult);
          const kind = !usedCode ? "cart" : !unpaid ? "code" : paidByCode ? "codePart" : "codeFailed";
          setBooked({ kind, unpaid, total, asked, paidByCode, left: codeResult ? formatBalance(codeResult, lang) : undefined });
        });
      },
    });
    // The same booking again, without the seat: only used if the first event
    // didn't come (older Cal versions).
    cal.ns[ns]("on", {
      action: "bookingSuccessfulV2",
      callback: (event: CustomEvent<{ data?: CalBooking }>) => {
        const data = event.detail?.data;
        if (activeNs.current !== ns || !data?.uid || !data.startTime) return;
        if (handledRef.current === data.uid) {
          handledRef.current = null;
          return;
        }
        if (!data.paymentRequired) {
          cart.addBooking(offer.key, { uid: data.uid, start: data.startTime, end: data.endTime });
        }
        // Bring the result into view: the cart message ("added, pay to confirm")
        // must be what the visitor sees first, not Cal's own confirmation.
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
        setBooked(data.paymentRequired ? { kind: "paid" } : { kind: "cart", unpaid: 1 });
      },
    });
    cal.ns[ns]("inline", {
      elementOrSelector: el,
      calLink: offerCalLink(offer, lang),
      // Force the booker to the page's language (calLink's event types are
      // already translated); otherwise Cal follows the visitor's browser.
      config: { layout: "month_view", theme: "light", lang, ...(member ? { name: member.name, email: member.email } : {}) },
    });
    return () => {
      activeNs.current = null;
      // Only remove what this effect added: React may reuse the host's node.
      el.remove();
    };
  }, [offer, lang, unavailable, member]);

  return (
    <div ref={shellRef} style={{ scrollMarginTop: "70px" }}>
      <nav className="bk-tabs" role="tablist" style={tabsBar}>
        {BOOKING_VIEWS.map((v) => (
          <a key={v} href={bookingHref(lang, v)} role="tab" data-booking={v} aria-selected={view === v}>
            {t.tabs[v]}
          </a>
        ))}
      </nav>

      {offer ? (
        <div className="bk-shell">
          <div style={backBar}>
            <a href={bookingHref(lang, offer.view)} data-booking={offer.view} style={backLink}>
              {t.back}
            </a>
          </div>
          {offer.kind === "session" && !unavailable && !booked && (
            <form
              style={codeBar}
              onSubmit={async (event) => {
                event.preventDefault();
                const value = codeInput.trim();
                if (!value || codeBusy) return;
                setCodeBusy(true);
                setCodeError(null);
                const result = await checkCode(value, offer.key);
                setCodeBusy(false);
                if (result.ok) {
                  setCode(result);
                  codeRef.current = value;
                } else {
                  setCode(null);
                  codeRef.current = null;
                  setCodeError(t.codeErrors[result.reason ?? "error"] ?? t.codeErrors.error);
                }
              }}
            >
              {code?.ok ? (
                <>
                  <span style={{ color: "var(--accent)" }}>✓ {t.codeOk(code.label ?? "", formatBalance(code, lang))}</span>
                  <button
                    type="button"
                    style={linkButton}
                    onClick={() => {
                      setCode(null);
                      codeRef.current = null;
                    }}
                  >
                    {t.codeRemove}
                  </button>
                </>
              ) : (
                <>
                  <label htmlFor="rusc-code" style={{ color: "var(--muted)" }}>{t.codeAsk}</label>
                  <input
                    id="rusc-code"
                    value={codeInput}
                    onChange={(event) => setCodeInput(event.target.value)}
                    placeholder={t.codePlaceholder}
                    autoComplete="off"
                    spellCheck={false}
                    style={codeInputStyle}
                  />
                  <button type="submit" className="btn guest" style={smallButton} disabled={codeBusy}>
                    {codeBusy ? t.codeValidating : t.codeUse}
                  </button>
                  {codeError && <span role="alert" style={{ color: "var(--ochre)" }}>{codeError}</span>}
                  {!code && !codeError && (
                    <span style={{ color: "var(--muted)", fontSize: "12.5px", flexBasis: "100%" }}>{t.codeHint}</span>
                  )}
                </>
              )}
            </form>
          )}
          {booked && (
            <div key="booked" style={{ textAlign: "center", padding: "40px 20px" }}>
              <p className="k" style={{ fontSize: "11px", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--ochre)", marginBottom: "12px" }}>
                {t.bookedTitle}
              </p>
              <h3 style={{ fontSize: "24px", marginBottom: "10px", color: "var(--accent)" }}>
                {booked.kind === "cart"
                  ? (booked.unpaid ?? 1) > 1
                    ? t.placesAdded(booked.unpaid ?? 1)
                    : t.slotAdded
                  : booked.kind === "code"
                    ? t.slotCode(booked.left ?? "")
                    : booked.kind === "codePart"
                      ? t.slotCodePart(booked.paidByCode ?? 1, booked.unpaid ?? 1)
                      : booked.kind === "codeFailed"
                        ? t.slotCodeFailed
                        : t.slotPaid}
              </h3>
              {/* Fewer places free than asked; and how long unpaid ones are kept. */}
              {(booked.total ?? 1) < (booked.asked ?? 1) && (
                <p style={{ color: "var(--ochre)", maxWidth: "460px", margin: "0 auto 8px" }}>{t.onlyLeft(booked.total ?? 1)}</p>
              )}
              {!!booked.unpaid && (
                <p style={{ color: "var(--muted)", maxWidth: "460px", margin: "0 auto 14px" }}>{t.heldFor(booked.unpaid > 1)}</p>
              )}
              {!booked.unpaid && booked.kind !== "cart" && booked.kind !== "codeFailed" && (
                <p style={{ color: "var(--muted)", maxWidth: "460px", margin: "0 auto 14px" }}>{t.bookedText}</p>
              )}
              <p style={{ color: "var(--muted)", maxWidth: "460px", margin: "0 auto 22px", fontSize: "14.5px" }}>{t.bookedNext}</p>
              {booked.unpaid ? (
                <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                  <a className="btn member" href={CART[lang]} style={{ padding: "9px 18px", fontSize: "11px" }}>
                    {t.viewCart}
                  </a>
                  <a className="btn guest" href={`${CART[lang]}?pay=1`} style={{ padding: "9px 18px", fontSize: "11px" }}>
                    {t.payDirectly}
                  </a>
                </div>
              ) : (
                <a className="btn guest" href={HOME[lang]} style={{ padding: "9px 18px", fontSize: "11px" }}>
                  {t.backHome}
                </a>
              )}
            </div>
          )}
          {needsMember ? (
            <div key="members-only" style={{ textAlign: "center", padding: "48px 20px" }}>
              <p className="k" style={{ fontSize: "11px", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--ochre)", marginBottom: "14px" }}>
                {t.membersOnlyTitle}
              </p>
              <p style={{ color: "var(--muted)", maxWidth: "460px", margin: "0 auto 20px" }}>{t.membersOnlyBody}</p>
              <a className="btn member" href={PAGES.membres[lang]} style={{ display: "inline-block", padding: "10px 20px" }}>
                {t.membersOnlyCta}
              </a>
            </div>
          ) : offer.kind === "product" ? (
            <div key="product" style={productBox}>
              <p className="k" style={{ fontSize: "11px", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--ochre)", marginBottom: "10px" }}>
                {offer[lang].tag}
              </p>
              <h3 style={{ fontSize: "26px", marginBottom: "8px" }}>{offer[lang].title}</h3>
              <p style={{ color: "var(--muted)", marginBottom: "26px" }}>{offer[lang].unit}</p>
              <button type="button" className={`btn ${offer.tone}`} data-cart={offer.key} style={{ cursor: "pointer" }}>
                {t.addToCart}
              </button>
            </div>
          ) : unavailable ? (
            <div key="soon" style={soonBox}>
              <p style={{ marginBottom: "6px" }}>{t.soon(offer[lang].title)}</p>
              <p style={{ marginBottom: "24px" }}>{t.soonNext}</p>
              <a className="btn guest" href={PAGES.contact[lang]}>
                {t.contact}
              </a>
            </div>
          ) : (
            // Cal.com mounts the booker here (see the effect above). Once booked
            // it stays on its filled form: hidden, so it can't be sent twice.
            <div key={offer.key} id="bk-bookings" ref={hostRef} style={booked ? { display: "none" } : undefined} />
          )}
        </div>
      ) : (
        <div className="grid">
          {offersIn(view).map((o) => (
            <OfferCard key={o.key} offer={o} lang={lang} />
          ))}
        </div>
      )}

      {toast && (
        <div role="status" style={toastBox}>
          {t.added(toast)}
          <a href={CART[lang]} style={toastLink}>{t.viewCart}</a>
        </div>
      )}
    </div>
  );
}
