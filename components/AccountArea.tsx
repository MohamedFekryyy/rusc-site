"use client";

import { useEffect, useState, type FormEvent } from "react";
import AuthForm from "@/components/AuthForm";
import { AUTH_EVENT, AuthError, addCode, getAccount, logOut, type AccountCode, type AccountData, type AccountVisit } from "@/lib/auth";
import { offerByKey } from "@/lib/cal";
import { loadClasses } from "@/lib/classes";
import { BOOKING, bookingHref, type Lang } from "@/lib/routes";

// The Connexion page: the sign-in form, or once signed in, the member's
// space: membership, coming classes, codes and their balances, past visits
// (including those booked on Acuity before the switch).

const TEXT = {
  fr: {
    hello: "Bonjour",
    signOut: "Se déconnecter",
    membership: "Adhésion",
    memberUntil: "Membre jusqu’au",
    memberPerks: "Atelier libre et tarif membre sur les cours et carnets.",
    daysLeft: (n: number) => (n > 1 ? `${n} jours restants` : `${n} jour restant`),
    renew: "Renouveler",
    ended: "Votre adhésion s’est terminée le",
    notMember: "Pas encore membre.",
    join: "Devenir membre",
    coming: "Mes prochains cours",
    none: "Aucun cours à venir.",
    book: "Réserver un cours",
    bookSession: "Réserver une séance d’1h",
    codes: "Mes carnets et codes",
    noCodes: "Aucun code pour l’instant. Un carnet, un bon cadeau ou un code d’Acuity ? Ajoutez-le ici.",
    until: "jusqu’au",
    expired: "expiré le",
    usedUp: "épuisé",
    paused: "en pause",
    addCode: "Ajouter un code",
    codePlaceholder: "RUSC-XXXX-XXXX",
    add: "Ajouter",
    past: "Mes cours passés",
    loading: "Chargement…",
    errors: {
      code_unknown: "Code inconnu.",
      code_taken: "Ce code est déjà lié à un autre compte : écrivez à l’atelier.",
      network: "Connexion impossible pour le moment.",
      generic: "Une erreur est survenue, veuillez réessayer.",
    } as Record<string, string>,
  },
  en: {
    hello: "Hello",
    signOut: "Log out",
    membership: "Membership",
    memberUntil: "Member until",
    memberPerks: "Open studio, and member prices on courses and cards.",
    daysLeft: (n: number) => (n > 1 ? `${n} days left` : `${n} day left`),
    renew: "Renew",
    ended: "Your membership ended on",
    notMember: "Not a member yet.",
    join: "Become a member",
    coming: "My next classes",
    none: "No classes coming up.",
    book: "Book a class",
    bookSession: "Book a 1h session",
    codes: "My cards and codes",
    noCodes: "No codes yet. A card, a gift voucher or an Acuity code? Add it here.",
    until: "until",
    expired: "expired on",
    usedUp: "used up",
    paused: "paused",
    addCode: "Add a code",
    codePlaceholder: "RUSC-XXXX-XXXX",
    add: "Add",
    past: "My past classes",
    loading: "Loading…",
    errors: {
      code_unknown: "Unknown code.",
      code_taken: "This code is already linked to another account: please write to the studio.",
      network: "Can’t connect right now.",
      generic: "Something went wrong, please try again.",
    } as Record<string, string>,
  },
};

// What a code has left, in words around the big number: "6" + "of 10 classes left".
function balance(c: AccountCode, lang: Lang): { big: string; rest: string } {
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  const n = (v: number) => v.toLocaleString(locale);
  if (c.unit === "euros") {
    const euros = (v: number) => (lang === "fr" ? `${n(v)} €` : `€${n(v)}`);
    return { big: euros(c.remaining), rest: lang === "fr" ? `restants sur ${euros(c.initial)}` : `left of ${euros(c.initial)}` };
  }
  const one = c.remaining < 2;
  if (lang === "en") return { big: n(c.remaining), rest: `of ${n(c.initial)} ${c.unit === "hours" ? "hours" : "classes"} left` };
  return c.unit === "hours"
    ? { big: n(c.remaining), rest: `${one ? "heure restante" : "heures restantes"} sur ${n(c.initial)}` }
    : { big: n(c.remaining), rest: `${one ? "cours restant" : "cours restants"} sur ${n(c.initial)}` };
}

// The balance at a glance: one notch per class or hour for a card of up to 20
// (a half one shows half filled), otherwise, and for euros, a single bar.
function Meter({ remaining, initial, unit }: { remaining: number; initial: number; unit: AccountCode["unit"] | "days" }) {
  const notches = unit !== "euros" && unit !== "days" && Number.isInteger(initial) && initial >= 2 && initial <= 20 ? initial : 0;
  const track = "var(--accent-soft)";
  const fill = "var(--accent)";
  if (notches) {
    return (
      <div aria-hidden className="meter" style={{ display: "flex", gap: "3px" }}>
        {Array.from({ length: notches }, (_, i) => {
          const part = Math.min(1, Math.max(0, remaining - i)) * 100;
          return <span key={i} style={{ flex: 1, height: "4px", borderRadius: "2px", background: `linear-gradient(90deg, ${fill} ${part}%, ${track} ${part}%)` }} />;
        })}
      </div>
    );
  }
  const share = initial > 0 ? Math.min(1, Math.max(0, remaining / initial)) : 0;
  return (
    <div aria-hidden className="meter" style={{ height: "4px", borderRadius: "2px", background: track, overflow: "hidden" }}>
      <span style={{ display: "block", height: "100%", width: `${share * 100}%`, background: fill, borderRadius: "2px" }} />
    </div>
  );
}

// Dev only (stripped from production builds): /connexion/?sample=1 or
// /en/login/?sample=1 shows a made-up member's space, to check the layout
// without an account.
const SAMPLE: AccountData | null =
  process.env.NODE_ENV === "production"
    ? null
    : {
        user: { id: "0", name: "Lena", email: "sample@example.invalid", member: true },
        membership: { since: "2026-10-06", until: "2027-10-06" },
        codes: [
          { code: "RUSC-JTVR-QPVF", label: "10-class card, 2h", unit: "sessions", remaining: 6, initial: 10, expiresOn: "2027-10-06", active: true },
          { code: "RUSC-H8KD-2MPA", label: "Open studio, 10 hours", unit: "hours", remaining: 7.5, initial: 10, expiresOn: "2027-04-06", active: true },
          { code: "RUSC-GIFT-8Q2C", label: "Gift voucher · €120", unit: "euros", remaining: 70, initial: 120, expiresOn: "2027-04-02", active: true },
          { code: "ABCD1234", label: "Carnet 5 x 2H", unit: "sessions", remaining: 0, initial: 5, expiresOn: "2026-08-01", active: true },
        ],
        coming: [
          { start: "2026-10-08T15:00:00Z", offer: "atelier-ceramique-2h", title: "tournage 2h" },
          { start: "2026-10-13T07:00:00Z", offer: "atelier-libre-1h", title: "atelier libre 1h" },
        ],
        past: [{ start: "2026-09-29T16:30:00Z", offer: "atelier-ceramique-2h", title: "tournage 2h" }],
      };

// Blocks, not <section>: the site's stylesheet pads every section for the home page.
const block = { borderTop: "1px solid var(--line)", margin: "20px 0 0", padding: "18px 0 0" } as const;
const heading = { fontSize: "18px", margin: "0 0 12px" } as const;
const list = { listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "10px" } as const;
const muted = { color: "var(--muted)", fontSize: "14px", margin: 0 } as const;
const small = { color: "var(--muted)", fontSize: "12.5px" } as const;
const big = { fontFamily: "var(--display)", fontSize: "20px", lineHeight: 1, color: "var(--ink)" } as const;
// The two booking buttons, a size down from the site's.
const compactButton = { textAlign: "center", padding: "11px 20px", fontSize: "11px" } as const;

export default function AccountArea({ lang }: { lang: Lang }) {
  const t = TEXT[lang];
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  // A password link from the studio: /connexion/?reset=<token>.
  const [resetToken, setResetToken] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("reset"),
  );
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The member's space, now and after each sign-in or sign-out on this page.
  // Signed out (no token), getAccount() answers null at once.
  useEffect(() => {
    let alive = true;
    if (SAMPLE && new URLSearchParams(window.location.search).has("sample")) {
      Promise.resolve().then(() => {
        setAccount(SAMPLE);
        setLoading(false);
      });
      return;
    }
    // With the classes made in rūsc admin, so theirs show in the page's language.
    const refresh = () =>
      Promise.all([getAccount().catch(() => null), loadClasses()])
        .then(([data]) => {
          if (!alive) return;
          setAccount(data);
          setLoading(false);
        });
    refresh();
    const onAuth = () => {
      setResetToken(null);
      refresh();
    };
    window.addEventListener(AUTH_EVENT, onAuth);
    return () => {
      alive = false;
      window.removeEventListener(AUTH_EVENT, onAuth);
    };
  }, []);

  async function onAddCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCodeError(null);
    setBusy(true);
    try {
      setAccount(await addCode(code.trim()));
      setCode("");
    } catch (e) {
      const key = e instanceof AuthError ? e.code : "generic";
      setCodeError(t.errors[key] ?? t.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  // As tall as the sign-in form that usually follows, so the page doesn't jump.
  if (loading) return <p style={{ ...muted, textAlign: "center", minHeight: "450px" }}>{t.loading}</p>;
  if (resetToken) return <AuthForm lang={lang} resetToken={resetToken} />;
  if (!account) return <AuthForm lang={lang} />;

  const when = (iso: string) =>
    new Intl.DateTimeFormat(locale, { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T12:00:00Z`));
  const className = (v: AccountVisit) => (v.offer && offerByKey(v.offer)?.[lang].title) || v.title;
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  const days = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
  const m = account.membership;
  const member = !!m && m.until >= today;
  const daysLeft = member ? days(today, m.until) : 0;
  const yearLong = m ? Math.max(1, days(m.since ?? today, m.until)) : 365;
  // Codes that can still pay first; used up, expired or paused ones after, faded.
  const usable = (c: AccountCode) => c.active && c.remaining > 0 && (!c.expiresOn || c.expiresOn >= today);
  const codes = [...account.codes].sort((a, b) => Number(usable(b)) - Number(usable(a)));

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "left" }}>
      <p style={{ margin: 0, display: "flex", gap: "12px", alignItems: "baseline", flexWrap: "wrap", justifyContent: "space-between" }}>
        <span>
          {t.hello} <b>{account.user.name}</b>
        </span>
        <button
          type="button"
          onClick={() => logOut()}
          style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", font: "inherit", fontSize: "14px", textDecoration: "underline" }}
        >
          {t.signOut}
        </button>
      </p>

      <div style={block}>
        <h3 style={heading}>{t.membership}</h3>
        {member ? (
          <>
            <p style={{ margin: "0 0 8px", display: "flex", gap: "12px", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
              <span>
                {t.memberUntil} {date(m.until)}
              </span>
              <span style={small}>{t.daysLeft(daysLeft)}</span>
            </p>
            <Meter remaining={daysLeft} initial={yearLong} unit="days" />
            <p style={{ ...small, margin: "8px 0 0" }}>
              {t.memberPerks}
              {daysLeft <= 30 && (
                <>
                  {" "}
                  <a href={bookingHref(lang, "catalog", "adhesion")}>{t.renew}</a>
                </>
              )}
            </p>
          </>
        ) : (
          <p style={{ margin: 0 }}>
            {m ? `${t.ended} ${date(m.until)}. ` : `${t.notMember} `}
            <a href={bookingHref(lang, "catalog", "adhesion")}>{t.join}</a>
          </p>
        )}
      </div>

      <div style={block}>
        <h3 style={heading}>{t.codes}</h3>
        {codes.length ? (
          <ul style={{ ...list, gap: "16px" }}>
            {codes.map((c) => {
              const { big: amount, rest } = balance(c, lang);
              const expired = !!c.expiresOn && c.expiresOn < today;
              const state = !c.active ? t.paused : expired ? `${t.expired} ${date(c.expiresOn!)}` : c.remaining <= 0 ? t.usedUp : c.expiresOn ? `${t.until} ${date(c.expiresOn)}` : "";
              return (
                <li key={c.code} style={usable(c) ? undefined : { opacity: 0.5 }}>
                  <div style={{ display: "flex", gap: "4px 12px", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", marginBottom: "8px" }}>
                    <span>{c.label}</span>
                    <span style={{ display: "inline-flex", gap: "6px", alignItems: "baseline" }}>
                      <span style={big}>{amount}</span>
                      <span style={small}>{rest}</span>
                    </span>
                  </div>
                  <Meter remaining={c.remaining} initial={c.initial} unit={c.unit} />
                  <p style={{ ...small, margin: "6px 0 0" }}>
                    <span style={{ fontFamily: "ui-monospace, Menlo, monospace", letterSpacing: ".06em" }}>{c.code}</span>
                    {state && ` · ${state}`}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p style={muted}>{t.noCodes}</p>
        )}
        <form onSubmit={onAddCode} style={{ display: "flex", gap: "8px", margin: "16px 0 0", maxWidth: "none" }}>
          <input
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t.codePlaceholder}
            aria-label={t.addCode}
            required
            autoCapitalize="characters"
            style={{ flex: 1, margin: 0, minWidth: 0, padding: "9px 12px", fontSize: "14px" }}
          />
          <button className="btn guest" type="submit" disabled={busy} style={{ padding: "0 20px", fontSize: "11px" }}>
            {t.add}
          </button>
        </form>
        {codeError && (
          <p role="alert" style={{ color: "var(--accent)", fontSize: "14px", margin: "6px 0 0" }}>
            {codeError}
          </p>
        )}
      </div>

      <div style={block}>
        <h3 style={heading}>{t.coming}</h3>
        {account.coming.length ? (
          <ul style={list}>
            {account.coming.map((v) => (
              <li key={v.start + v.title}>
                <span style={{ display: "block", fontSize: "15px" }}>{when(v.start)}</span>
                <span style={small}>{className(v)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={muted}>{t.none}</p>
        )}
        {/* Book a class; members also book open studio by the hour. */}
        <div style={{ display: "grid", gap: "8px", margin: "16px 0 0" }}>
          <a className="btn member" href={BOOKING[lang]} style={compactButton}>
            {t.book}
          </a>
          {member && (
            <a className="btn guest" href={bookingHref(lang, "catalog", "atelier-libre-1h")} style={compactButton}>
              {t.bookSession}
            </a>
          )}
        </div>
      </div>

      {account.past.length > 0 && (
        <div style={block}>
          <details>
            <summary style={{ ...heading, margin: 0, cursor: "pointer", fontFamily: "var(--display)" }}>
              {t.past} ({account.past.length})
            </summary>
            <ul style={{ ...list, gap: "6px", marginTop: "10px" }}>
              {account.past.map((v) => (
                <li key={v.start + v.title} style={muted}>
                  {when(v.start)} · {className(v)}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
