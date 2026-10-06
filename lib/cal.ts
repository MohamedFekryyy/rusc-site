// Cal.com config: the source of truth behind every booking since the
// Acuity -> Cal.com migration.
//
// Bookings never leave the site: Cal.com is only ever shown inside the
// booking pages (components/BookingEmbed.tsx). Nothing on the site links to
// cal.com.

// The Cal server behind the embed: the studio's self-hosted Cal.diy on Fly
// (deploy/cal/). Switch to https://booking.studio-rusc.com once that domain
// is attached. NEXT_PUBLIC_CAL_ORIGIN overrides it.
export const CAL_ORIGIN = process.env.NEXT_PUBLIC_CAL_ORIGIN ?? "https://rusc-cal.fly.dev";

// The studio's account on it, host of every class (deploy/cal/seed-classes.mjs
// creates the event types). NEXT_PUBLIC_CAL_USERNAME overrides it.
export const CAL_USERNAME = process.env.NEXT_PUBLIC_CAL_USERNAME ?? "raquel";

// Cal link for the embed: "<username>/<event-slug>".
export function calLink(eventSlug: string) {
  return `${CAL_USERNAME}/${eventSlug}`;
}

// The booking page's tabs: what each one lists.
export const BOOKING_VIEWS = ["schedule", "catalog", "gifts"] as const;

export type BookingView = (typeof BOOKING_VIEWS)[number];

export function isBookingView(value: unknown): value is BookingView {
  return BOOKING_VIEWS.includes(value as BookingView);
}

type OfferText = {
  tag: string;
  title: string;
  // Price line, as on the content pages.
  unit: string;
  cta: string;
};

type OfferSource = {
  key: string;
  view: BookingView;
  // Button colour: member = deep green, guest = light green.
  tone: "guest" | "member";
  // session: a dated booking, picked in the Cal booker, then paid in the cart.
  // product: added straight to the cart (cards, membership, gift vouchers).
  kind: "session" | "product";
  // Price in euro cents, TTC. The cart and Stripe checkout charge this; the
  // server recomputes it (never trusts the browser).
  price: number;
  // A gift voucher of any amount: the buyer picks it, in whole euros, between
  // these bounds (euro cents); price is the amount first shown.
  amount?: { min: number; max: number };
  fr: OfferText;
  en: OfferText;
};

// Everything bookable, in the order the booking page lists it. Names and
// prices are the ones on the Cours, Stages and Espace membre pages (the
// children's course, which shows no price there, was €50 on Acuity).
//
// Each session is ONE Cal event type, slug = its key (deploy/cal/seed-classes.mjs
// creates them), so French and English visitors fill the same places. Its
// French title and description have an English translation, which Cal's
// booker shows to visitors whose browser is in English. Classes the studio
// creates in rūsc admin join these at run time, and its edits of the sessions
// below replace their names, price line, price and photo (ClassOffer, below).
// The values here are what the site shows until those load.
export const OFFERS = [
  // Cours & stages
  {
    key: "atelier-ceramique-2h", view: "schedule", tone: "guest", kind: "session", price: 5000,
    fr: { tag: "Cours de 2 h", title: "tournage 2h", unit: "50 € · membre 45 €", cta: "Réserver" },
    en: { tag: "2-hour course", title: "wheel throwing 2h", unit: "€50 · member €45", cta: "Book" },
  },
  {
    key: "atelier-modelage-2h", view: "schedule", tone: "guest", kind: "session", price: 5000,
    fr: { tag: "Cours de 2 h", title: "modelage 2h", unit: "50 € · membre 45 €", cta: "Réserver" },
    en: { tag: "2-hour course", title: "hand-building 2h", unit: "€50 · member €45", cta: "Book" },
  },
  {
    key: "decor-a-cru-1h", view: "schedule", tone: "guest", kind: "session", price: 2000,
    fr: { tag: "Cours d’1 h", title: "décor à cru 1h", unit: "20 € · membre 18 €", cta: "Réserver" },
    en: { tag: "1-hour course", title: "raw-glaze decoration 1h", unit: "€20 · member €18", cta: "Book" },
  },
  {
    key: "modelage-enfant", view: "schedule", tone: "guest", kind: "session", price: 5000,
    fr: { tag: "7–12 ans · le mercredi", title: "cours enfant 2h", unit: "Places limitées · réservation conseillée", cta: "Réserver" },
    en: { tag: "Ages 7–12 · Wednesdays", title: "children’s course 2h", unit: "Limited places · booking recommended", cta: "Book" },
  },
  {
    key: "atelier-ceramique-1j", view: "schedule", tone: "guest", kind: "session", price: 18000,
    fr: { tag: "Stage · 10h – 17h", title: "céramique 1j", unit: "180 €", cta: "Réserver" },
    en: { tag: "Workshop · 10am – 5pm", title: "ceramics 1 day", unit: "€180", cta: "Book" },
  },
  {
    key: "atelier-ceramique-2j", view: "schedule", tone: "guest", kind: "session", price: 28000,
    fr: { tag: "Stage · 2 jours", title: "céramique 2j", unit: "280 €", cta: "Réserver" },
    en: { tag: "Workshop · 2 days", title: "ceramics 2 days", unit: "€280", cta: "Book" },
  },
  {
    key: "porcelaine", view: "schedule", tone: "guest", kind: "session", price: 23000,
    fr: { tag: "Stage · 10h – 17h", title: "porcelaine 1j", unit: "230 €", cta: "Réserver" },
    en: { tag: "Workshop · 10am – 5pm", title: "porcelain 1 day", unit: "€230", cta: "Book" },
  },
  {
    key: "pot-and-wine", view: "schedule", tone: "guest", kind: "session", price: 7500,
    fr: { tag: "Soirée · 18h – 20h30", title: "pot & wine", unit: "75 € · apéro et modelage", cta: "Réserver" },
    en: { tag: "Evening · 6pm – 8.30pm", title: "pot & wine", unit: "€75 · drinks and hand-building", cta: "Book" },
  },

  // Adhésion & carnets
  {
    key: "adhesion", view: "catalog", tone: "member", kind: "product", price: 5000,
    fr: { tag: "Membres", title: "adhésion annuelle", unit: "50 € / an · atelier libre en autonomie · -10 % sur les cours", cta: "Adhérer" },
    en: { tag: "Members", title: "annual membership", unit: "€50 / year · open studio in autonomy · 10% off courses", cta: "Join" },
  },
  {
    key: "carnet-5-cours", view: "catalog", tone: "guest", kind: "product", price: 21000,
    fr: { tag: "Carnet · cours de 2 h", title: "carnet 5 cours", unit: "210 € · membre 189 €", cta: "Acheter" },
    en: { tag: "Class pass · 2-hour courses", title: "5-course pass", unit: "€210 · member €189", cta: "Buy" },
  },
  {
    key: "carnet-10-cours", view: "catalog", tone: "guest", kind: "product", price: 35000,
    fr: { tag: "Carnet · cours de 2 h", title: "carnet 10 cours", unit: "350 € · membre 315 €", cta: "Acheter" },
    en: { tag: "Class pass · 2-hour courses", title: "10-course pass", unit: "€350 · member €315", cta: "Buy" },
  },
  {
    key: "atelier-libre-1h", view: "catalog", tone: "member", kind: "session", price: 2250,
    fr: { tag: "Atelier libre · membres", title: "atelier libre 1h", unit: "22,50 € / heure", cta: "Réserver" },
    en: { tag: "Open studio · members", title: "open studio 1h", unit: "€22.50 / hour", cta: "Book" },
  },
  {
    key: "atelier-libre-10h", view: "catalog", tone: "member", kind: "product", price: 15000,
    fr: { tag: "Atelier libre · membres", title: "carnet atelier libre 10h", unit: "150 € · 15 € / heure · valable 1 an", cta: "Acheter" },
    en: { tag: "Open studio · members", title: "open studio 10h pass", unit: "€150 · €15 / hour · valid 1 year", cta: "Buy" },
  },
  {
    key: "atelier-libre-20h", view: "catalog", tone: "member", kind: "product", price: 24000,
    fr: { tag: "Atelier libre · membres", title: "carnet atelier libre 20h", unit: "240 € · 12 € / heure · valable 1 an", cta: "Acheter" },
    en: { tag: "Open studio · members", title: "open studio 20h pass", unit: "€240 · €12 / hour · valid 1 year", cta: "Buy" },
  },

  // Bons cadeaux
  {
    key: "bon-cadeau-cours-2h", view: "gifts", tone: "guest", kind: "product", price: 5000,
    fr: { tag: "Bon cadeau", title: "un cours de 2h", unit: "50 €", cta: "Offrir" },
    en: { tag: "Gift voucher", title: "one 2-hour course", unit: "€50", cta: "Give" },
  },
  {
    key: "bon-cadeau-carnet-5", view: "gifts", tone: "guest", kind: "product", price: 21000,
    fr: { tag: "Bon cadeau", title: "carnet 5 cours", unit: "210 €", cta: "Offrir" },
    en: { tag: "Gift voucher", title: "5-course pass", unit: "€210", cta: "Give" },
  },
  {
    key: "bon-cadeau-carnet-10", view: "gifts", tone: "guest", kind: "product", price: 35000,
    fr: { tag: "Bon cadeau", title: "carnet 10 cours", unit: "350 €", cta: "Offrir" },
    en: { tag: "Gift voucher", title: "10-course pass", unit: "€350", cta: "Give" },
  },
  {
    key: "bon-cadeau-stage-1j", view: "gifts", tone: "guest", kind: "product", price: 18000,
    fr: { tag: "Bon cadeau", title: "un stage d’1 jour", unit: "180 €", cta: "Offrir" },
    en: { tag: "Gift voucher", title: "a 1-day workshop", unit: "€180", cta: "Give" },
  },
  {
    key: "bon-cadeau-stage-2j", view: "gifts", tone: "guest", kind: "product", price: 28000,
    fr: { tag: "Bon cadeau", title: "un stage de 2 jours", unit: "280 €", cta: "Offrir" },
    en: { tag: "Gift voucher", title: "a 2-day workshop", unit: "€280", cta: "Give" },
  },
  {
    // Owner's request (2026-09-24): a gift card of any amount, for any class.
    key: "bon-cadeau-montant", view: "gifts", tone: "guest", kind: "product", price: 5000, amount: { min: 1000, max: 100000 },
    fr: { tag: "Bon cadeau", title: "le montant de votre choix", unit: "valable 1 an", cta: "Offrir" },
    en: { tag: "Gift voucher", title: "the amount you choose", unit: "valid 1 year", cta: "Give" },
  },
] as const satisfies readonly OfferSource[];

// A class as rūsc admin serves it (GET /api/classes; lib/classes.ts loads the
// list here). Either one made there (Cours → Nouveau cours), on top of OFFERS:
// like the sessions above, one Cal event type, slug = key, always in "Cours &
// stages", for everyone, paid per place. Or one of the sessions above as the
// studio edited it there (builtin): it replaces that offer's names, price line,
// price and photo, and keeps its tab, colour and members-only rule.
// A hidden one (active false) isn't listed, but still names and prices the
// places already in carts.
export type ClassOffer = {
  key: string;
  view: BookingView;
  tone: "guest" | "member";
  kind: "session";
  price: number;
  minutes: number;
  // One of the photos of components/OfferCard.tsx (PHOTOS).
  image: string;
  active: boolean;
  made?: true;
  builtin?: true;
  fr: OfferText;
  en: OfferText;
};

export type StaticOffer = (typeof OFFERS)[number];
export type StaticOfferKey = StaticOffer["key"];
export type Offer = StaticOffer | ClassOffer;
export type OfferKey = string;

// The classes made in rūsc admin, and the sessions above as edited there.
let classOffers: ClassOffer[] = [];
let edited = new Map<string, ClassOffer>();

const isText = (value: unknown): value is OfferText => {
  const t = value as OfferText | null;
  return !!t && [t.tag, t.title, t.unit, t.cta].every((s) => typeof s === "string") && !!t.title;
};

// A class as rūsc admin (or a cart line) gives it, if well formed.
export function toClassOffer(raw: unknown): ClassOffer | null {
  const c = raw as Partial<ClassOffer> | null;
  if (!c || typeof c.key !== "string" || !/^[a-z0-9-]{1,60}$/.test(c.key)) return null;
  if (!Number.isInteger(c.price) || (c.price as number) <= 0 || !isText(c.fr) || !isText(c.en)) return null;
  // An edited session of OFFERS keeps its tab and colour; a new class takes no key of OFFERS.
  const base = OFFERS.find((o) => o.key === c.key);
  if (c.builtin ? base?.kind !== "session" : base) return null;
  return {
    key: c.key, view: base?.view ?? "schedule", tone: base?.tone ?? "guest", kind: "session",
    ...(base ? { builtin: true as const } : { made: true as const }),
    price: c.price as number,
    minutes: Number(c.minutes) || 120,
    image: typeof c.image === "string" ? c.image : "",
    active: c.active !== false,
    fr: c.fr, en: c.en,
  };
}

// The classes as last loaded (lib/classes.ts). One that hasn't changed keeps
// its object, so a booker already open stays mounted.
export function setClassOffers(list: ClassOffer[]) {
  const same = (a: ClassOffer, b?: ClassOffer) => !!b && JSON.stringify(a) === JSON.stringify(b);
  const made = list.filter((c) => c.made).map((c) => (same(c, classOffers.find((o) => o.key === c.key)) ? classOffers.find((o) => o.key === c.key)! : c));
  // Classes only cart lines know (lib/cart.ts) stay until the list names them.
  classOffers = [...made, ...classOffers.filter((o) => !made.some((c) => c.key === o.key))];
  edited = new Map(list.filter((c) => c.builtin).map((c) => [c.key, same(c, edited.get(c.key)) ? edited.get(c.key)! : c]));
}

// A cart line's class, known before the list loads.
export function rememberClassOffer(offer: ClassOffer) {
  if (offer.made && !classOffers.some((o) => o.key === offer.key)) classOffers = [...classOffers, offer];
}

export function offerByKey(key: string): Offer | undefined {
  return edited.get(key) ?? OFFERS.find((o) => o.key === key) ?? classOffers.find((o) => o.key === key);
}

export function isMadeClass(offer: Offer | undefined): offer is ClassOffer & { made: true } {
  return !!offer && "made" in offer && offer.made === true;
}

// Taken off the site in rūsc admin: not listed, and not opened from a link.
export function isHidden(offer: Offer | undefined) {
  return !!offer && "active" in offer && !offer.active;
}

// Bounds of a gift voucher of any amount, if the offer is one.
export function amountBounds(key: string): { min: number; max: number } | undefined {
  return (offerByKey(key) as { amount?: { min: number; max: number } } | undefined)?.amount;
}

// A chosen amount (euro cents), if valid for this offer: whole euros, within bounds.
export function validAmount(key: string, cents: unknown): number | null {
  const bounds = amountBounds(key);
  const n = Number(cents);
  if (!bounds || !Number.isInteger(n) || n % 100 !== 0 || n < bounds.min || n > bounds.max) return null;
  return n;
}

export function isOfferKey(value: unknown): value is OfferKey {
  return typeof value === "string" && offerByKey(value) !== undefined;
}

// A tab's offers: those above (as edited in rūsc admin), then the classes made there.
export function offersIn(view: BookingView): Offer[] {
  const own: Offer[] = OFFERS.filter((o) => o.view === view).map((o) => edited.get(o.key) ?? o);
  return [...own, ...classOffers.filter((o) => o.view === view)].filter((o) => !isHidden(o));
}

// The Cal event type of an offer, e.g. "raquel/porcelaine" (one for both languages).
export function offerCalLink(key: OfferKey, lang?: "fr" | "en") {
  const link = calLink(key);
  // Force the booker's language to the page's language (not the visitor's
  // browser). Cal reads it from the ?lang= query param on the calLink.
  return lang ? `${link}?lang=${lang}` : link;
}
