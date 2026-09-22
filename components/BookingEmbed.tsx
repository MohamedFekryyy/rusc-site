"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { BOOKING_VIEWS, bookingUrl, isBookingView, type BookingView } from "@/lib/acuity";

type Props = {
  heading: string;
  caption: string;
  tabs: Record<BookingView, string>;
  // Accessible name of the iframe.
  title: string;
};

export default function BookingEmbed({ heading, caption, tabs, title }: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const srcRef = useRef<string | null>(null);
  const [view, setView] = useState<BookingView>("schedule");
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    function load(url: string) {
      if (url === srcRef.current) return;
      srcRef.current = url;
      // embed.js pinned the height of the previous page; let it measure the new one.
      frameRef.current?.style.removeProperty("height");
      setSrc(url);
    }

    // Mount the iframe first, then embed.js (rendered below once src is set):
    // the script only takes over iframes that already point at Acuity.
    load(bookingUrl("schedule"));

    // Every [data-booking] link on the page switches the embed instead of leaving the site.
    function onClick(event: MouseEvent) {
      const link =
        event.target instanceof Element ? event.target.closest<HTMLElement>("[data-booking]") : null;
      const next = link?.dataset.booking;
      if (!link || !isBookingView(next)) return;
      event.preventDefault();
      setView(next);
      load(bookingUrl(next, link.dataset.appointmentType));
      // The new page is often shorter: bring the top of the booking block into view.
      shellRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="bk-shell" ref={shellRef}>
      <div className="bk-bar">
        <span><b>{heading}</b> &nbsp;·&nbsp; {caption}</span>
        <nav className="bk-tabs" role="tablist">
          {BOOKING_VIEWS.map((v) => (
            <a key={v} href="#reservation" role="tab" data-booking={v} aria-selected={view === v}>
              {tabs[v]}
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
            title={title}
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
