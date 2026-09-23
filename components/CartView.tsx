"use client";

import { loadStripe, type StripeEmbeddedCheckout } from "@stripe/stripe-js";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { offerByKey } from "@/lib/cal";
import { cart, cartTotal, useCart } from "@/lib/cart";
import { formatPrice, formatSlot } from "@/lib/format";
import { BOOKING, PAGES, type Lang } from "@/lib/routes";

const TEXT = {
  fr: {
    empty: "Votre panier est vide.",
    browse: "Voir les cours, carnets et bons cadeaux",
    more: "Continuer mes achats",
    remove: "Retirer",
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
  },
  en: {
    empty: "Your cart is empty.",
    browse: "See courses, cards and gift vouchers",
    more: "Keep shopping",
    remove: "Remove",
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
            const res = await fetch("/api/checkout", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ lang, items: cart.items() }),
            });
            if (!res.ok) throw new Error(`checkout ${res.status}`);
            return (await res.json()).clientSecret as string;
          },
          onComplete: () => {
            cart.clear();
            setStage("done");
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
        <p style={{ color: "var(--muted)", marginBottom: "28px" }}>{t.thanksNext}</p>
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
                {offer[lang].title}
                <small>
                  {item.booking ? formatSlot(item.booking.start, lang) : offer[lang].unit}
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
                <span className="val">{formatPrice(offer.price * item.qty, lang)}</span>
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
