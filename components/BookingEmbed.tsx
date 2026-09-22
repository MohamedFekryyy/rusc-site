"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import {
  APPOINTMENT_TYPES,
  BOOKING_VIEWS,
  bookingUrl,
  isBookingView,
  type AppointmentSlug,
  type BookingView,
} from "@/lib/acuity";
import { bookingHref, type Lang } from "@/lib/routes";

const TEXT = {
  fr: {
    heading: "Réservation en ligne",
    caption: "ateliers, stages & créneaux libres",
    tabs: { schedule: "Ateliers", catalog: "Carnets & adhésion", gifts: "Bons cadeaux" },
    title: "Réservation rūsc",
  },
  en: {
    heading: "Online booking",
    caption: "workshops, courses & open slots",
    tabs: { schedule: "Workshops", catalog: "Cards & membership", gifts: "Gift vouchers" },
    title: "rūsc booking",
  },
};

function isWorkshop(value: unknown): value is AppointmentSlug {
  return typeof value === "string" && Object.hasOwn(APPOINTMENT_TYPES, value);
}

// The Acuity iframe of the booking page, with its view tabs. It opens on
// what the URL asks for (?view= / ?workshop=, see bookingHref) and every
// [data-booking] link on the page switches it in place.
export default function BookingEmbed({ lang }: { lang: Lang }) {
  const t = TEXT[lang];
  const shellRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const srcRef = useRef<string | null>(null);
  const [view, setView] = useState<BookingView>("schedule");
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    function show(next: BookingView, workshop?: string | null) {
      setView(next);
      const url = bookingUrl(next, isWorkshop(workshop) ? APPOINTMENT_TYPES[workshop] : undefined);
      if (url === srcRef.current) return;
      srcRef.current = url;
      // embed.js pinned the height of the previous page; let it measure the new one.
      frameRef.current?.style.removeProperty("height");
      setSrc(url);
    }

    // Mount the iframe first, then embed.js (rendered below once src is set):
    // the script only takes over iframes that already point at Acuity.
    const params = new URLSearchParams(window.location.search);
    const workshop = params.get("workshop");
    const requested = isWorkshop(workshop) ? "schedule" : params.get("view");
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
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="bk-shell" ref={shellRef}>
      <div className="bk-bar">
        <span><b>{t.heading}</b> &nbsp;·&nbsp; {t.caption}</span>
        <nav className="bk-tabs" role="tablist">
          {BOOKING_VIEWS.map((v) => (
            <a key={v} href={bookingHref(lang, v)} role="tab" data-booking={v} aria-selected={view === v}>
              {t.tabs[v]}
            </a>
          ))}
        </nav>
      </div>
      <div id="bk-bookings">
        {src && (
          <iframe
            ref={frameRef}
            className="bk-frame"
            src={src}
            title={t.title}
            frameBorder="0"
            allow="payment"
            // Keeps the sticky nav and the tabs visible when embed.js scrolls to the frame.
            data-offset-top="120"
          />
        )}
      </div>
      {/* Acuity's script: auto-height and scroll handling for the iframe. */}
      {src && <Script src="https://embed.acuityscheduling.com/js/embed.js" />}
    </div>
  );
}
