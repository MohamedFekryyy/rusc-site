"use client";

import Script from "next/script";
import { useRef, useState } from "react";
import {
  CAL_USERNAME,
  VIEW_SLUGS,
  calUrl,
  isBookingView,
  serviceByKey,
  type BookingView,
  type ServiceKey,
} from "@/lib/cal";
import type { Lang } from "@/lib/routes";

const TEXT = {
  fr: {
    heading: "Réservation en ligne",
    caption: "ateliers, stages & créneaux libres",
    tabs: { schedule: "Ateliers", catalog: "Adhésion", gifts: "Bons cadeaux" },
    title: "Réservation rūsc",
    loading: "Chargement du planning…",
  },
  en: {
    heading: "Online booking",
    caption: "workshops, courses & open slots",
    tabs: { schedule: "Workshops", catalog: "Membership", gifts: "Gift vouchers" },
    title: "rūsc booking",
    loading: "Loading the schedule…",
  },
};

function isService(value: unknown): value is ServiceKey {
  return typeof value === "string" && serviceByKey(value) !== undefined;
}

// Resolve the Cal.com URL to embed for a given view / workshop / language.
function resolveUrl(lang: Lang, view: BookingView, workshop?: string | null): string {
  if (workshop) {
    const svc = serviceByKey(workshop);
    if (svc) return calUrl(CAL_USERNAME, lang === "fr" ? svc.fr : svc.en);
  }
  if (view !== "schedule") {
    const slug = VIEW_SLUGS[view][lang];
    if (slug) return calUrl(CAL_USERNAME, slug);
  }
  return calUrl(CAL_USERNAME);
}

// The Cal.com booking block. Uses Cal.com's inline embed (global embed.js +
// data-cal-link) so it works from a fully static export with no npm client.
// It opens on ?workshop=<key> or ?view=catalog|gifts (see bookingHref) when
// present, otherwise on the account's main page. Language is determined by the
// -fr/-en event-slug pair: the FR page mounts the -fr type, the EN page -en.
export default function BookingEmbed({ lang }: { lang: Lang }) {
  const t = TEXT[lang];
  const shellRef = useRef<HTMLDivElement>(null);

  // Resolve the initial view/URL from the URL query (client-only). Lazy
  // initializers avoid setState-in-effect cascading renders.
  const [view] = useState<BookingView>(() => {
    if (typeof window === "undefined") return "schedule";
    const params = new URLSearchParams(window.location.search);
    const workshop = params.get("workshop");
    const requested = isService(workshop) ? "schedule" : params.get("view");
    return isBookingView(requested) ? requested : "schedule";
  });
  const [url] = useState<string>(() => {
    if (typeof window === "undefined") return calUrl(CAL_USERNAME);
    const params = new URLSearchParams(window.location.search);
    const workshop = params.get("workshop");
    const v = isService(workshop)
      ? "schedule"
      : isBookingView(params.get("view"))
        ? (params.get("view") as BookingView)
        : "schedule";
    return resolveUrl(lang, v, isService(workshop) ? workshop : null);
  });

  return (
    <div className="bk-shell" ref={shellRef}>
      <div className="bk-bar">
        <span>
          <b>{t.heading}</b> &nbsp;·&nbsp; {t.caption}
        </span>
        <nav className="bk-tabs" role="tablist">
          {(["schedule", "catalog", "gifts"] as const).map((v) => (
            <a
              key={v}
              href={resolveUrl(lang, v)}
              role="tab"
              aria-selected={view === v}
            >
              {t.tabs[v]}
            </a>
          ))}
        </nav>
      </div>
      <div id="bk-bookings">
        {/* Cal.com inline embed target: embed.js upgrades the [data-cal-link]
            element into the booker. */}
        <a
          href={url}
          data-cal-link={url}
          data-cal-namespace="rusc"
          className="bk-frame-cal"
        >
          {t.loading}
        </a>
      </div>
      {/* Cal.com embed script: turns the element above into the inline booker. */}
      <Script src="https://cal.com/embed.js" strategy="afterInteractive" />
    </div>
  );
}
