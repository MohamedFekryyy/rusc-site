"use client";

import { loadStripe, type StripeEmbeddedCheckout } from "@stripe/stripe-js";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { offerByKey } from "@/lib/cal";
import { cart, cartTotal, linePrice, useCart } from "@/lib/cart";
import { formatBalance, orderCodes, type OrderCodes } from "@/lib/codes";
import { formatPrice, formatSlot } from "@/lib/format";
import { BOOKING, PAGES, type Lang } from "@/lib/routes";

const TEXT = {
  fr: {
    empty: "Votre panier est vide.",
    browse: "Voir les cours, carnets et bons cadeaux",
    more: "Continuer mes achats",
    remove: "Retirer",
    anyClass: "Pour n’importe quel cours ou stage · valable 6 mois",
    less: "Un de moins",
    plus: "Un de plus",
    total: "Total",
    pay: "Payer",
    ttc: "Prix TTC. Les créneaux réservés sont confirmés après le paiement.",
    unavailable: "Le paiement en ligne ouvre bientôt. En attendant, écrivez-nous : nous finalisons votre commande avec vous.",
    contact: "Nous contacter",
    back: "← Retour au panier",
    thanks: "Merci, votre paiement est confirmé.",
    thanksNext: "Vous recevez un reçu par e-mail. Pour les bons cadeaux et les carnets, l’atelier vous écrit avec votre code.",
    home: "Retour au site",
    codesTitle: "Vos codes",
    codesNext: "Gardez-les : sur la page Réserver, ils règlent vos cours (ou offrez-les).",
    codesWait: "Vos codes arrivent…",
    validUntil: (date: string) => `valable jusqu’au ${date}`,
  },
  en: {
    empty: "Your cart is empty.",
    browse: "See courses, cards and gift vouchers",
    more: "Keep shopping",
    remove: "Remove",
    anyClass: "For any course or intensive · valid 6 months",
    less: "One less",
    plus: "One more",
    total: "Total",
    pay: "Pay",
    ttc: "Prices include VAT. Booked slots are confirmed once paid.",
    unavailable: "Online payment opens soon. In the meantime, write to us and we’ll complete your order with you.",
    contact: "Contact us",
    back: "← Back to cart",
    thanks: "Thank you, your payment is confirmed.",
    thanksNext: "A receipt is on its way by email. For gift vouchers and cards, the studio will email you your code.",
    home: "Back to the site",
    codesTitle: "Your codes",
    codesNext: "Keep them: on the booking page they pay for your classes (or give them as a gift).",
    codesWait: "Your codes are on their way…",
    validUntil: (date: string) => `valid until ${date}`,
  },
};

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const panel: CSSProperties = { maxWidth: "760px", margin: "0 auto" };
const note: CSSProperties = { textAlign: "center", color: "var(--muted)", fontSize: "14px", margin: "18px 0 0" };
const stepper: CSSProperties = {
  width: "28px", height: "28px", border: "1px solid var(--line)", background: "transparent",
  borderRadius: "50%", cursor: "pointer", color: "var(--ink)", fontSize: "15px", lineHeight: 1,
};
const textButton: CSSProperties = {
  background: "none", border: 0, padding: 0, cursor: "pointer", color: "var(--muted)",
  fontSize: "12px", letterSpacing: ".08em", textTransform: "uppercase", textDecoration: "underline",
};

type Stage = "cart" | "checkout" | "done" | "unavailable";

// The cart page: lines, quantities, total, then Stripe's checkout embedded in
// the page (redirect_on_completion "never": the thanks appear in place).
export default function CartView({ lang }: { lang: Lang }) {
  const t = TEXT[lang];
  const items = useCart();
  const [stage, setStage] = useState<Stage>("cart");
  const checkoutRef = useRef<HTMLDivElement>(null);
  // The Stripe order being paid, then the codes it created (if any).
  const orderRef = useRef<string | null>(null);
  const [order, setOrder] = useState<OrderCodes | null>(null);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    const host = checkoutRef.current;
    if (stage !== "checkout" || !host || !PUBLISHABLE_KEY) return;
    let cancelled = false;
    let embedded: StripeEmbeddedCheckout | null = null;
    (async () => {
      try {
        const stripe = await loadStripe(PUBLISHABLE_KEY);
        if (!stripe || cancelled) return;
        embedded = await stripe.createEmbeddedCheckoutPage({
          fetchClientSecret: async () => {
            // Trailing slash: without it, trailingSlash redirects first (308).
            const res = await fetch("/api/checkout/", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ lang, items: cart.items() }),
            });
            if (!res.ok) throw new Error(`checkout ${res.status}`);
            const data = (await res.json()) as { clientSecret: string; id: string };
            orderRef.current = data.id;
            return data.clientSecret;
          },
          onComplete: () => {
            // Carnets and vouchers bought: rūsc admin creates their codes when
            // Stripe confirms the payment. Ask for them for up to ~30 s.
            const hasCodes = cart.items().some((i) => offerByKey(i.key)?.kind === "product" && i.key !== "adhesion");
            cart.clear();
            setStage("done");
            const id = orderRef.current;
            if (!id || !hasCodes) return;
            setWaiting(true);
            let tries = 0;
            const poll = async () => {
              const result = await orderCodes(id);
              if (result?.paid && (result.codes.length || tries > 4)) {
                setOrder(result);
                setWaiting(false);
              } else if (++tries < 15) {
                setTimeout(poll, 2000);
              } else {
                setWaiting(false);
              }
            };
            poll();
          },
        });
        if (cancelled) embedded.destroy();
        else embedded.mount(host);
      } catch {
        if (!cancelled) setStage("unavailable");
      }
    })();
    return () => {
      cancelled = true;
      embedded?.destroy();
    };
  }, [stage, lang]);

  if (stage === "done") {
    return (
      <div style={{ ...panel, textAlign: "center" }}>
        <p style={{ fontSize: "19px", marginBottom: "8px" }}>{t.thanks}</p>
        {order?.codes.length ? (
          <div style={{ margin: "22px auto 30px", maxWidth: "520px", textAlign: "left" }}>
            <p className="k" style={{ fontSize: "11px", letterSpacing: ".2em", textTransform: "uppercase", color: "var(--ochre)", marginBottom: "10px" }}>
              {t.codesTitle}
            </p>
            {order.codes.map((c) => (
              <div key={c.code} style={{ border: "1px solid var(--line)", background: "rgba(255,255,255,.6)", padding: "12px 16px", marginBottom: "10px" }}>
                <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: "20px", letterSpacing: ".06em" }}>{c.code}</div>
                <div style={{ color: "var(--muted)", fontSize: "14px" }}>
                  {c.label} · {formatBalance({ ok: true, unit: c.unit, remaining: c.remaining }, lang)}
                  {c.expiresOn ? ` · ${t.validUntil(new Date(`${c.expiresOn}T12:00:00Z`).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB", { dateStyle: "long" }))}` : ""}
                </div>
              </div>
            ))}
            <p style={{ color: "var(--muted)", fontSize: "14px" }}>{t.codesNext}</p>
          </div>
        ) : (
          <p style={{ color: "var(--muted)", marginBottom: "28px" }}>{waiting ? t.codesWait : t.thanksNext}</p>
        )}
        <a className="btn" href={lang === "fr" ? "/" : "/en/"}>{t.home}</a>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div style={{ ...panel, textAlign: "center" }}>
        <p style={{ color: "var(--muted)", marginBottom: "24px" }}>{t.empty}</p>
        <a className="btn guest" href={BOOKING[lang]}>{t.browse}</a>
      </div>
    );
  }

  if (stage === "checkout") {
    return (
      <div style={panel}>
        <button type="button" style={{ ...textButton, marginBottom: "18px" }} onClick={() => setStage("cart")}>
          {t.back}
        </button>
        <div ref={checkoutRef} className="bk-shell" style={{ minHeight: "480px", padding: "10px" }} />
      </div>
    );
  }

  const total = cartTotal(items);
  return (
    <div style={panel}>
      <div className="rows">
        {items.map((item) => {
          const offer = offerByKey(item.key)!;
          return (
            <div className="row" key={item.id} style={{ alignItems: "center" }}>
              <span className="lbl">
                {item.amount ? `${offer[lang].tag} · ${formatPrice(item.amount, lang)}` : offer[lang].title}
                <small>
                  {item.booking ? formatSlot(item.booking.start, lang) : item.amount ? t.anyClass : offer[lang].unit}
                </small>
                <button type="button" style={{ ...textButton, marginTop: "6px" }} onClick={() => cart.remove(item.id)}>
                  {t.remove}
                </button>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                {!item.booking && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                    <button type="button" style={stepper} aria-label={t.less} onClick={() => cart.setQty(item.id, item.qty - 1)}>−</button>
                    <span style={{ minWidth: "18px", textAlign: "center" }}>{item.qty}</span>
                    <button type="button" style={stepper} aria-label={t.plus} onClick={() => cart.setQty(item.id, item.qty + 1)}>+</button>
                  </span>
                )}
                {/* Fixed width keeps the steppers lined up from row to row. */}
                <span className="val" style={{ minWidth: "4.6em", textAlign: "right" }}>
                  {formatPrice(linePrice(item) * item.qty, lang)}
                </span>
              </span>
            </div>
          );
        })}
        <div className="row" style={{ borderTop: "1px solid var(--ink)", marginTop: "6px" }}>
          <span className="lbl" style={{ fontSize: "16px" }}>{t.total}</span>
          <span className="val">{formatPrice(total, lang)}</span>
        </div>
      </div>

      {stage === "unavailable" ? (
        <div style={{ textAlign: "center", marginTop: "26px" }}>
          <p style={{ color: "var(--muted)", marginBottom: "18px" }}>{t.unavailable}</p>
          <a className="btn guest" href={PAGES.contact[lang]}>{t.contact}</a>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginTop: "26px" }}>
          <a className="btn guest" href={BOOKING[lang]}>{t.more}</a>
          <button
            type="button"
            className="btn member"
            onClick={() => setStage(PUBLISHABLE_KEY ? "checkout" : "unavailable")}
          >
            {t.pay} · {formatPrice(total, lang)}
          </button>
        </div>
      )}
      <p style={note}>{t.ttc}</p>
    </div>
  );
}
