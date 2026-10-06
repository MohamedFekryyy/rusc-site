import Image, { type StaticImageData } from "next/image";
import { Calendar, Clock, EmojiHappy, Gift, Glass, Key, Ticket, Timer1, type Icon } from "iconsax-reactjs";
import { isMadeClass, type Offer, type StaticOfferKey } from "@/lib/cal";
import { bookingHref, PAGES, type Lang } from "@/lib/routes";
import atelier01 from "@/assets/photos/atelier-01.jpg";
import atelier03 from "@/assets/photos/atelier-03.jpg";
import atelier04 from "@/assets/photos/atelier-04.jpg";
import atelier05 from "@/assets/photos/atelier-05.jpg";
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
import us02 from "@/assets/photos/us-02.jpg";
import us04 from "@/assets/photos/us-04.jpg";

// Photo and icon (Iconsax, Linear) of each offer on the booking page. Workshops use the same
// photos as the Cours and Stages pages where they exist.
const MEDIA: Record<StaticOfferKey, { image: StaticImageData; icon: Icon }> = {
  "atelier-ceramique-2h": { image: atelier03, icon: Clock },
  "atelier-modelage-2h": { image: modelage2h, icon: Clock },
  "decor-a-cru-1h": { image: atelier08, icon: Clock },
  "modelage-enfant": { image: atelier07, icon: EmojiHappy },
  "atelier-ceramique-1j": { image: ceramique1j, icon: Calendar },
  "atelier-ceramique-2j": { image: ceramique2j, icon: Calendar },
  porcelaine: { image: porcelaine, icon: Calendar },
  "pot-and-wine": { image: atelier05, icon: Glass },
  adhesion: { image: atelier04, icon: Key },
  "carnet-5-cours": { image: atelier01, icon: Ticket },
  "carnet-10-cours": { image: atelier10, icon: Ticket },
  "atelier-libre-1h": { image: location, icon: Timer1 },
  "atelier-libre-10h": { image: us02, icon: Ticket },
  "atelier-libre-20h": { image: us04, icon: Ticket },
  "bon-cadeau-cours-2h": { image: bonCadeau, icon: Gift },
  "bon-cadeau-carnet-5": { image: membres, icon: Gift },
  "bon-cadeau-carnet-10": { image: us01, icon: Gift },
  "bon-cadeau-stage-1j": { image: ceramique1j, icon: Gift },
  "bon-cadeau-stage-2j": { image: stages, icon: Gift },
  "bon-cadeau-montant": { image: bonCadeau, icon: Gift },
};

// The photos a class made in rūsc admin can show, by the name it picked
// (PHOTOS in deploy/admin/server.mjs, which has small copies of them).
const PHOTOS: Record<string, StaticImageData> = {
  "atelier-01": atelier01, "atelier-03": atelier03, "atelier-04": atelier04, "atelier-05": atelier05,
  "atelier-07": atelier07, "atelier-08": atelier08, "atelier-10": atelier10, "bon-cadeau": bonCadeau,
  "ceramique-1j": ceramique1j, "ceramique-2j": ceramique2j, location, membres, "modelage-2h": modelage2h,
  porcelaine, stages, "us-01": us01, "us-02": us02, "us-04": us04,
};

function media(offer: Offer) {
  // A day-long class reads as a workshop (as the Stages cards), a shorter one as a course.
  if (isMadeClass(offer)) return { image: PHOTOS[offer.image] ?? atelier03, icon: offer.minutes >= 300 ? Calendar : Clock };
  // One of ours, perhaps with another photo chosen in rūsc admin.
  const own = MEDIA[offer.key as StaticOfferKey];
  const chosen = "image" in offer ? PHOTOS[offer.image] : undefined;
  return chosen ? { ...own, image: chosen } : own;
}

const AMOUNT_LABEL = { fr: "Montant en euros", en: "Amount in euros" };

// Members-only notice / CTA for an open-studio card shown to a non-member.
const MEMBER_LOCK = {
  fr: { text: "Réservé aux membres — adhérez d’abord pour réserver l’atelier libre.", cta: "Devenir membre" },
  en: { text: "Members only — join first to book the open studio.", cta: "Become a member" },
} as const;

// One offer on the booking page, styled like the cards of the Cours and
// Stages pages. Workshops open their booker; cards, membership and gift
// vouchers go straight to the cart.
//
// `isMember` gates the members-only offers (atelier-libre-*): for a
// non-member the button is replaced by a "members only" notice linking to the
// membership page. The membership offer itself (adhesion, tone "member") is
// always clickable — it's how a visitor becomes a member.
export default function OfferCard({ offer, lang, isMember }: { offer: Offer; lang: Lang; isMember: boolean }) {
  const { image, icon: Mark } = media(offer);
  const t = offer[lang];
  const membersOnly = offer.tone === "member" && offer.key !== "adhesion" && !isMember;
  return (
    <article className="card">
      <Image className="thumb" src={image} alt="" sizes="(max-width: 640px) 100vw, 360px" />
      <p className="k">
        <Mark size={14} color="currentColor" aria-hidden style={{ verticalAlign: "-2px", marginRight: "7px" }} />
        {t.tag}
      </p>
      <h3>{t.title}</h3>
      <p className="price">{t.unit}</p>
      {membersOnly ? (
        <div style={{ textAlign: "left" }}>
          <p style={{ color: "var(--muted)", fontSize: "14px", margin: "0 0 12px" }}>{MEMBER_LOCK[lang].text}</p>
          <a className="btn member" href={PAGES.membres[lang]} style={{ display: "inline-block", padding: "9px 16px", fontSize: "12px" }}>
            {MEMBER_LOCK[lang].cta}
          </a>
        </div>
      ) : offer.kind === "product" && "amount" in offer ? (
        // A gift voucher of any amount: BookingEmbed reads the field next to the button.
        <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, fontSize: "15px" }}>
            <input
              type="number"
              name="amount"
              inputMode="numeric"
              min={offer.amount.min / 100}
              max={offer.amount.max / 100}
              step={1}
              defaultValue={offer.price / 100}
              aria-label={AMOUNT_LABEL[lang]}
              style={{ width: "100%", margin: 0 }}
            />
            €
          </label>
          <button type="button" className={`btn ${offer.tone}`} data-cart={offer.key} style={{ cursor: "pointer" }}>
            {t.cta}
          </button>
        </div>
      ) : offer.kind === "product" ? (
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
