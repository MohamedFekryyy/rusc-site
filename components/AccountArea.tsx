"use client";

import { useEffect, useState, type FormEvent } from "react";
import AuthForm from "@/components/AuthForm";
import { AUTH_EVENT, AuthError, addCode, getAccount, logOut, type AccountData, type AccountVisit } from "@/lib/auth";
import { offerByKey, type OfferKey } from "@/lib/cal";
import { formatBalance } from "@/lib/codes";
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
    ended: "Votre adhésion s’est terminée le",
    notMember: "Pas encore membre.",
    join: "Devenir membre",
    coming: "Mes prochains cours",
    none: "Aucun cours à venir.",
    book: "Réserver un cours",
    codes: "Mes codes",
    noCodes: "Aucun code pour l’instant. Un carnet, un bon cadeau ou un code d’Acuity ? Ajoutez-le ici.",
    left: "reste",
    of: "sur",
    until: "jusqu’au",
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
    ended: "Your membership ended on",
    notMember: "Not a member yet.",
    join: "Become a member",
    coming: "My next classes",
    none: "No classes coming up.",
    book: "Book a class",
    codes: "My codes",
    noCodes: "No codes yet. A card, a gift voucher or an Acuity code? Add it here.",
    left: "left",
    of: "of",
    until: "until",
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

const section = { margin: "22px 0 0" } as const;
const heading = { fontSize: "15px", fontWeight: 600, margin: "0 0 8px", letterSpacing: ".02em" } as const;
const list = { listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "8px" } as const;
const muted = { color: "var(--muted)", fontSize: "14px", margin: 0 } as const;

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
    const refresh = () =>
      getAccount()
        .catch(() => null)
        .then((data) => {
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

  if (loading) return <p style={{ ...muted, textAlign: "center" }}>{t.loading}</p>;
  if (resetToken) return <AuthForm lang={lang} resetToken={resetToken} />;
  if (!account) return <AuthForm lang={lang} />;

  const when = (iso: string) =>
    new Intl.DateTimeFormat(locale, { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${iso}T12:00:00Z`));
  const className = (v: AccountVisit) => (v.offer && offerByKey(v.offer)?.[lang].title) || v.title;
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  const m = account.membership;

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

      <section style={section}>
        <h3 style={heading}>{t.membership}</h3>
        {m && m.until >= today ? (
          <p style={{ margin: 0 }}>
            {t.memberUntil} {date(m.until)}. <span style={muted}>{t.memberPerks}</span>
          </p>
        ) : (
          <p style={{ margin: 0 }}>
            {m ? `${t.ended} ${date(m.until)}. ` : `${t.notMember} `}
            <a href={bookingHref(lang, "catalog", "adhesion" as OfferKey)}>{t.join}</a>
          </p>
        )}
      </section>

      <section style={section}>
        <h3 style={heading}>{t.coming}</h3>
        {account.coming.length ? (
          <ul style={list}>
            {account.coming.map((v) => (
              <li key={v.start + v.title}>
                <b>{when(v.start)}</b> · {className(v)}
              </li>
            ))}
          </ul>
        ) : (
          <p style={muted}>{t.none}</p>
        )}
        <p style={{ margin: "10px 0 0" }}>
          <a className="btn member" href={BOOKING[lang]}>
            {t.book}
          </a>
        </p>
      </section>

      <section style={section}>
        <h3 style={heading}>{t.codes}</h3>
        {account.codes.length ? (
          <ul style={list}>
            {account.codes.map((c) => (
              <li key={c.code}>
                <b style={{ fontFamily: "ui-monospace, Menlo, monospace", letterSpacing: ".04em" }}>{c.code}</b> · {c.label}
                <br />
                <span style={muted}>
                  {t.left} {formatBalance({ ok: true, remaining: c.remaining, unit: c.unit }, lang)} {t.of} {formatBalance({ ok: true, remaining: c.initial, unit: c.unit }, lang)}
                  {c.expiresOn ? ` · ${t.until} ${date(c.expiresOn)}` : ""}
                  {c.active ? "" : ` · ${t.paused}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={muted}>{t.noCodes}</p>
        )}
        <form onSubmit={onAddCode} style={{ display: "flex", gap: "8px", margin: "10px 0 0", maxWidth: "none" }}>
          <input
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t.codePlaceholder}
            aria-label={t.addCode}
            required
            autoCapitalize="characters"
            style={{ flex: 1, margin: 0 }}
          />
          <button className="btn guest" type="submit" disabled={busy}>
            {t.add}
          </button>
        </form>
        {codeError && (
          <p role="alert" style={{ color: "var(--accent)", fontSize: "14px", margin: "6px 0 0" }}>
            {codeError}
          </p>
        )}
      </section>

      {account.past.length > 0 && (
        <section style={section}>
          <details>
            <summary style={{ ...heading, cursor: "pointer" }}>
              {t.past} ({account.past.length})
            </summary>
            <ul style={{ ...list, marginTop: "8px" }}>
              {account.past.map((v) => (
                <li key={v.start + v.title} style={muted}>
                  {when(v.start)} · {className(v)}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}
