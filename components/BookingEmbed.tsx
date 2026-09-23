"use client";

import { useEffect, useRef, useState } from "react";
import {
  BOOKING_VIEWS,
  CAL_ORIGIN,
  bookingCalLink,
  calLink,
  isBookingView,
  isServiceKey,
  type BookingView,
} from "@/lib/cal";
import { bookingHref, type Lang } from "@/lib/routes";

const TEXT = {
  fr: {
    heading: "Réservation en ligne",
    caption: "ateliers, stages & créneaux libres",
    tabs: { schedule: "Ateliers", catalog: "Adhésion", gifts: "Bons cadeaux" },
  },
  en: {
    heading: "Online booking",
    caption: "workshops, courses & open slots",
    tabs: { schedule: "Workshops", catalog: "Membership", gifts: "Gift vouchers" },
  },
};

// The booker in the site's colours (--accent in styles/globals.css).
const UI = {
  theme: "light",
  cssVarsPerTheme: { light: { "cal-brand": "#3b4e3e" } },
  hideEventTypeDetails: false,
  layout: "month_view",
};

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

// A Cal.com namespace holds a single embed, so each switch gets a new one.
let namespaces = 0;

// The Cal.com booker, embedded in the booking page: visitors never leave the
// site. It opens on ?workshop=<key> or ?view=catalog|gifts (see bookingHref),
// and every [data-booking] link on the page switches it in place.
export default function BookingEmbed({ lang }: { lang: Lang }) {
  const t = TEXT[lang];
  const shellRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<BookingView>("schedule");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const cal = getCal();

    function mount(link: string, fallback?: string) {
      const ns = `rusc${++namespaces}`;
      const el = document.createElement("div");
      host!.replaceChildren(el);
      cal("init", ns, { origin: CAL_ORIGIN });
      cal.ns[ns]("ui", UI);
      if (fallback) {
        // Event type not created in Cal.com yet: show the account page, not a 404.
        cal.ns[ns]("on", { action: "linkFailed", callback: () => mount(fallback) });
      }
      cal.ns[ns]("inline", {
        elementOrSelector: el,
        calLink: link,
        config: { layout: "month_view", theme: "light" },
      });
    }

    function show(next: BookingView, workshop?: string | null) {
      setView(next);
      const link = bookingCalLink(lang, next, workshop);
      mount(link, link === calLink() ? undefined : calLink());
    }

    const params = new URLSearchParams(window.location.search);
    const workshop = params.get("workshop");
    const requested = isServiceKey(workshop) ? "schedule" : params.get("view");
    show(isBookingView(requested) ? requested : "schedule", workshop);

    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-booking]") : null;
      const next = link?.dataset.booking;
      if (!link || !isBookingView(next)) return;
      event.preventDefault();
      show(next, link.dataset.workshop);
      // Keep the address shareable: it names what the embed shows.
      history.replaceState(null, "", link.href);
      // Links outside the tabs: bring the booking block into view.
      if (!shellRef.current?.contains(link)) shellRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      host.replaceChildren();
    };
  }, [lang]);

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
      {/* Cal.com mounts the booker here (see mount above). */}
      <div id="bk-bookings" ref={hostRef} />
    </div>
  );
}
