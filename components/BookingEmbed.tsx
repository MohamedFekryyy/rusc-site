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
import { CART, PAGES, bookingHref, type Lang } from "@/lib/routes";
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
    keepBrowsing: "Continuer",
    slotAdded: "Créneau ajouté au panier : il est confirmé une fois le panier payé.",
    slotPaid: "Votre réservation est confirmée.",
    codeAsk: "Carnet, bon cadeau ou code de l’atelier ?",
    codePlaceholder: "Votre code",
    codeUse: "Utiliser",
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
    slotCodeFailed: "Votre code n’a pas pu être utilisé : la séance est dans votre panier.",
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
    keepBrowsing: "Keep browsing",
    slotAdded: "Slot added to your cart: it’s confirmed once the cart is paid.",
    slotPaid: "Your booking is confirmed.",
    codeAsk: "Got a class card, gift voucher or studio code?",
    codePlaceholder: "Your code",
    codeUse: "Use",
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
    slotCodeFailed: "Your code couldn’t be used: the class is in your cart.",
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
type CalBookingV1 = { booking?: CalBooking & { seatReferenceUid?: string | null } };
type Booked = { kind: "cart" | "paid" | "code" | "codeFailed"; left?: string };

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
  useEffect(() => {
    let alive = true;
    getSession()
      .then((user) => {
        if (alive && user) setMember(user);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  const [codeBusy, setCodeBusy] = useState(false);
  // The code as the Cal callbacks see it, and the booking the first success
  // event already handled (Cal then sends a second one for the same booking).
  const codeRef = useRef<string | null>(null);
  const handledRef = useRef<string | null>(null);
  // Title of the offer just added to the cart (confirmation toast).
  const [toast, setToast] = useState<string | null>(null);
  const offer = offerKey ? offerByKey(offerKey) : undefined;

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
    if (!offer || offer.kind !== "session" || !host) return;
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
    // booking, with this person's seat: the place is taken off the code in use,
    // or goes to the cart (paid there) with its seat. If the code can't be
    // used, it goes to the cart too.
    cal.ns[ns]("on", {
      action: "bookingSuccessful",
      callback: (event: CustomEvent<{ data?: CalBookingV1 }>) => {
        const booking = event.detail?.data?.booking;
        if (activeNs.current !== ns || !booking?.uid || !booking.startTime) return;
        handledRef.current = booking.uid;
        const seat = booking.seatReferenceUid ?? undefined;
        const toCart = () => cart.addBooking(offer.key, { uid: booking.uid!, seat, start: booking.startTime!, end: booking.endTime });
        const usedCode = codeRef.current;
        if (!usedCode || !seat) {
          toCart();
          setBooked({ kind: "cart" });
          return;
        }
        redeemCode(usedCode, seat).then((result) => {
          if (activeNs.current !== ns) return;
          if (result.ok) {
            setBooked({ kind: "code", left: formatBalance(result, lang) });
            setCode(result);
          } else {
            toCart();
            setBooked({ kind: "codeFailed" });
          }
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
        setBooked({ kind: data.paymentRequired ? "paid" : "cart" });
      },
    });
    cal.ns[ns]("inline", {
      elementOrSelector: el,
      calLink: offerCalLink(offer),
      config: { layout: "month_view", theme: "light", ...(member ? { name: member.name, email: member.email } : {}) },
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
                    {t.codeUse}
                  </button>
                  {codeError && <span role="alert" style={{ color: "var(--ochre)" }}>{codeError}</span>}
                </>
              )}
            </form>
          )}
          {booked && (
            <div style={bookedBar} role="status">
              <span>
                {booked.kind === "cart"
                  ? t.slotAdded
                  : booked.kind === "code"
                    ? t.slotCode(booked.left ?? "")
                    : booked.kind === "codeFailed"
                      ? t.slotCodeFailed
                      : t.slotPaid}
              </span>
              {(booked.kind === "cart" || booked.kind === "codeFailed") && (
                <a className="btn member" href={CART[lang]} style={{ padding: "9px 18px", fontSize: "11px" }}>
                  {t.viewCart}
                </a>
              )}
            </div>
          )}
          {offer.kind === "product" ? (
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
            // Cal.com mounts the booker here (see the effect above).
            <div key={offer.key} id="bk-bookings" ref={hostRef} />
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
