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
import { PAGES, bookingHref, type Lang } from "@/lib/routes";

const TEXT = {
  fr: {
    heading: "Réservation en ligne",
    caption: "ateliers, stages & créneaux libres",
    tabs: { schedule: "Cours & stages", catalog: "Adhésion & carnets", gifts: "Bons cadeaux" },
    back: "← Toutes les offres",
    soon: (title: string) => `La réservation en ligne de « ${title} » ouvre bientôt.`,
    soonNext: "En attendant, écrivez-nous : nous réservons pour vous.",
    contact: "Nous contacter",
  },
  en: {
    heading: "Online booking",
    caption: "workshops, courses & open slots",
    tabs: { schedule: "Courses & intensives", catalog: "Membership & cards", gifts: "Gift vouchers" },
    back: "← All offers",
    soon: (title: string) => `Online booking for “${title}” opens soon.`,
    soonNext: "In the meantime, write to us and we’ll book it for you.",
    contact: "Contact us",
  },
};

// The booker in the site's colours (--accent in styles/globals.css).
const UI = {
  theme: "light",
  cssVarsPerTheme: { light: { "cal-brand": "#3b4e3e" } },
  hideEventTypeDetails: false,
  layout: "month_view",
};

const backBar: CSSProperties = { padding: "14px 18px", borderBottom: "1px solid var(--line)" };
const backLink: CSSProperties = {
  fontSize: "11.5px", letterSpacing: ".14em", textTransform: "uppercase",
  color: "var(--accent)", textDecoration: "none",
};
const soonBox: CSSProperties = { padding: "72px 24px", textAlign: "center", color: "var(--muted)" };

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
  const offer = offerKey ? offerByKey(offerKey) : undefined;

  useEffect(() => {
    function open(next: BookingView, key?: string | null) {
      const target = isOfferKey(key) ? key : null;
      setView(target ? offerByKey(target)!.view : next);
      setOfferKey(target);
      setUnavailable(false);
    }

    const params = new URLSearchParams(window.location.search);
    const requested = params.get("view");
    open(isBookingView(requested) ? requested : "schedule", params.get("workshop"));

    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
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
  }, []);

  // Mount the Cal.com booker of the chosen offer.
  useEffect(() => {
    const host = hostRef.current;
    if (!offer || !host) return;
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
    cal.ns[ns]("inline", {
      elementOrSelector: el,
      calLink: offerCalLink(offer, lang),
      config: { layout: "month_view", theme: "light" },
    });
    return () => {
      activeNs.current = null;
      // Only remove what this effect added: React may reuse the host's node.
      el.remove();
    };
  }, [offer, lang, unavailable]);

  return (
    <div className="bk-shell" ref={shellRef}>
      <div className="bk-bar">
        <span>
          <b>{t.heading}</b> &nbsp;·&nbsp; {t.caption}
        </span>
        <nav className="bk-tabs" role="tablist">
          {BOOKING_VIEWS.map((v) => (
            <a key={v} href={bookingHref(lang, v)} role="tab" data-booking={v} aria-selected={view === v}>
              {t.tabs[v]}
            </a>
          ))}
        </nav>
      </div>

      {offer ? (
        <>
          <div style={backBar}>
            <a href={bookingHref(lang, offer.view)} data-booking={offer.view} style={backLink}>
              {t.back}
            </a>
          </div>
          {unavailable ? (
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
        </>
      ) : (
        <div className="price-grid" style={{ padding: "26px 18px" }}>
          {offersIn(view).map((o) => (
            <article className="pcard" key={o.key}>
              <p className="tag">{o[lang].tag}</p>
              <h3>{o[lang].title}</h3>
              <p className="unit">{o[lang].unit}</p>
              <div className="foot">
                <a
                  className={`btn ${o.tone}`}
                  href={bookingHref(lang, o.view, o.key)}
                  data-booking={o.view}
                  data-workshop={o.key}
                >
                  {o[lang].cta}
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
