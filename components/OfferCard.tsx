import Image, { type StaticImageData } from "next/image";
import { CalendarDays, Clock3, Gift, Hourglass, KeyRound, Smile, Ticket, type LucideIcon } from "lucide-react";
import type { Offer, OfferKey } from "@/lib/cal";
import { bookingHref, type Lang } from "@/lib/routes";
import atelier01 from "@/assets/photos/atelier-01.jpg";
import atelier02 from "@/assets/photos/atelier-02.jpg";
import atelier03 from "@/assets/photos/atelier-03.jpg";
import atelier04 from "@/assets/photos/atelier-04.jpg";
import atelier07 from "@/assets/photos/atelier-07.jpg";
import atelier08 from "@/assets/photos/atelier-08.jpg";
import atelier10 from "@/assets/photos/atelier-10.jpg";
import bonCadeau from "@/assets/photos/bon-cadeau-o.jpg";
import ceramique1j from "@/assets/photos/ceramique-1j-o.jpg";
import ceramique2j from "@/assets/photos/ceramique-2j-o.jpg";
import location from "@/assets/photos/location-o.jpg";
import membres from "@/assets/photos/membres.jpg";
import modelage2h from "@/assets/photos/modelage-2h-o.jpg";
import porcelaine from "@/assets/photos/porcelaine-o.jpg";
import stages from "@/assets/photos/stages-o.jpg";
import us01 from "@/assets/photos/us-01.jpg";
import us04 from "@/assets/photos/us-04.jpg";

// Photo and icon of each offer on the booking page. Workshops use the same
// photos as the Cours and Stages pages where they exist.
const MEDIA: Record<OfferKey, { image: StaticImageData; icon: LucideIcon }> = {
  "atelier-ceramique-2h": { image: atelier03, icon: Clock3 },
  "atelier-modelage-2h": { image: modelage2h, icon: Clock3 },
  "decor-a-cru-1h": { image: atelier08, icon: Clock3 },
  "modelage-enfant": { image: atelier07, icon: Smile },
  "atelier-ceramique-1j": { image: ceramique1j, icon: CalendarDays },
  "atelier-ceramique-2j": { image: ceramique2j, icon: CalendarDays },
  porcelaine: { image: porcelaine, icon: CalendarDays },
  adhesion: { image: atelier04, icon: KeyRound },
  "carnet-5-cours": { image: atelier01, icon: Ticket },
  "carnet-10-cours": { image: atelier10, icon: Ticket },
  "atelier-libre-1h": { image: location, icon: Hourglass },
  "atelier-libre-10h": { image: atelier02, icon: Ticket },
  "atelier-libre-20h": { image: us04, icon: Ticket },
  "bon-cadeau-cours-2h": { image: bonCadeau, icon: Gift },
  "bon-cadeau-carnet-5": { image: membres, icon: Gift },
  "bon-cadeau-carnet-10": { image: us01, icon: Gift },
  "bon-cadeau-stage-1j": { image: ceramique1j, icon: Gift },
  "bon-cadeau-stage-2j": { image: stages, icon: Gift },
};

// One offer on the booking page, styled like the cards of the Cours and
// Stages pages. Workshops open their booker; cards, membership and gift
// vouchers go straight to the cart.
export default function OfferCard({ offer, lang }: { offer: Offer; lang: Lang }) {
  const { image, icon: Icon } = MEDIA[offer.key];
  const t = offer[lang];
  return (
    <article className="card">
      <Image className="thumb" src={image} alt="" sizes="(max-width: 640px) 100vw, 360px" />
      <p className="k">
        <Icon size={14} strokeWidth={1.5} aria-hidden style={{ verticalAlign: "-2px", marginRight: "7px" }} />
        {t.tag}
      </p>
      <h3>{t.title}</h3>
      <p className="price">{t.unit}</p>
      {offer.kind === "product" ? (
        // Added straight to the cart (BookingEmbed handles [data-cart]).
        <button type="button" className={`btn ${offer.tone}`} data-cart={offer.key} style={{ cursor: "pointer" }}>
          {t.cta}
        </button>
      ) : (
        <a
          className={`btn ${offer.tone}`}
          href={bookingHref(lang, offer.view, offer.key)}
          data-booking={offer.view}
          data-workshop={offer.key}
        >
          {t.cta}
        </a>
      )}
    </article>
  );
}
