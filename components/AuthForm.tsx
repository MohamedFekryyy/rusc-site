"use client";

import { useState, type FormEvent } from "react";
import { AuthError, logIn, resetPassword, signUp } from "@/lib/auth";
import type { Lang } from "@/lib/routes";

// Sign-in / sign-up form of the Connexion page, in French or English. With
// ?reset=<token> (a link the studio sends from rūsc admin) it asks for a new
// password instead. On success, lib/auth.ts announces the sign-in and
// AccountArea shows the member's space.

const TEXT = {
  fr: {
    signInTitle: "Connexion",
    signUpTitle: "Inscription",
    name: "Nom complet",
    email: "Email",
    password: "Mot de passe (8 caractères minimum)",
    newPassword: "Nouveau mot de passe (8 caractères minimum)",
    stayLoggedIn: "Rester connecté·e",
    signIn: "Se connecter",
    signUp: "Créer mon compte",
    reset: "Enregistrer le mot de passe",
    resetIntro: "Choisissez un nouveau mot de passe pour votre compte rūsc.",
    switchToSignUp: "Créer un compte",
    switchToSignIn: "Se connecter",
    haveAccount: "Déjà un compte ?",
    noAccount: "Pas encore de compte ?",
    forgot: "Mot de passe oublié ? Écrivez à info@studio-rusc.com : l’atelier vous envoie un lien pour en choisir un nouveau.",
    already: "Déjà client·e de l’atelier ? Inscrivez-vous avec l’e-mail de vos réservations : vos cours, carnets et adhésion s’y retrouvent.",
    errors: {
      email_taken: "Un compte existe déjà avec cet e-mail : connectez-vous.",
      wrong_login: "E-mail ou mot de passe incorrect.",
      password_short: "Le mot de passe doit faire au moins 8 caractères.",
      email_invalid: "Cet e-mail n’a pas l’air valide.",
      name_required: "Indiquez votre nom.",
      too_many: "Trop d’essais : réessayez dans quelques minutes.",
      reset_expired: "Ce lien a expiré ou a déjà servi : demandez-en un nouveau à l’atelier.",
      network: "Connexion impossible pour le moment : vérifiez votre réseau et réessayez.",
      generic: "Une erreur est survenue, veuillez réessayer.",
    } as Record<string, string>,
  },
  en: {
    signInTitle: "Log in",
    signUpTitle: "Sign up",
    name: "Full name",
    email: "Email",
    password: "Password (8 characters minimum)",
    newPassword: "New password (8 characters minimum)",
    stayLoggedIn: "Stay logged in",
    signIn: "Log in",
    signUp: "Create my account",
    reset: "Save the password",
    resetIntro: "Choose a new password for your rūsc account.",
    switchToSignUp: "Create an account",
    switchToSignIn: "Log in",
    haveAccount: "Already have an account?",
    noAccount: "No account yet?",
    forgot: "Forgot your password? Write to info@studio-rusc.com: the studio will send you a link to choose a new one.",
    already: "Already a client of the studio? Sign up with the e-mail you booked with: your classes, cards and membership show up there.",
    errors: {
      email_taken: "An account already exists with this e-mail: log in instead.",
      wrong_login: "Wrong e-mail or password.",
      password_short: "The password needs at least 8 characters.",
      email_invalid: "This e-mail doesn’t look valid.",
      name_required: "Please give your name.",
      too_many: "Too many tries: please try again in a few minutes.",
      reset_expired: "This link has expired or was already used: ask the studio for a new one.",
      network: "Can’t connect right now: check your network and try again.",
      generic: "Something went wrong, please try again.",
    } as Record<string, string>,
  },
};

export default function AuthForm({ lang, resetToken }: { lang: Lang; resetToken?: string | null }) {
  const t = TEXT[lang];
  const [mode, setMode] = useState<"signin" | "signup" | "reset">(resetToken ? "reset" : "signin");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "reset" && resetToken) await resetPassword(resetToken, password, remember);
      else if (mode === "signup") await signUp(nom.trim(), email.trim(), password, remember);
      else await logIn(email.trim(), password, remember);
      if (mode === "reset") window.history.replaceState(null, "", window.location.pathname);
    } catch (e) {
      const code = e instanceof AuthError ? e.code : "generic";
      setError(t.errors[code] ?? t.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: "420px", margin: "0 auto", textAlign: "left" }}>
      {mode === "reset" ? (
        <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0 }}>{t.resetIntro}</p>
      ) : (
        <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
          <button type="button" className={`btn ${mode === "signin" ? "member" : "guest"}`} onClick={() => setMode("signin")} style={{ flex: 1 }}>
            {t.signInTitle}
          </button>
          <button type="button" className={`btn ${mode === "signup" ? "member" : "guest"}`} onClick={() => setMode("signup")} style={{ flex: 1 }}>
            {t.signUpTitle}
          </button>
        </div>
      )}

      {mode === "signup" && (
        <input type="text" name="name" placeholder={t.name} value={nom} onChange={(e) => setNom(e.target.value)} required autoComplete="name" />
      )}

      {mode !== "reset" && (
        <input type="email" name="email" placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      )}
      <input
        type="password"
        name="password"
        placeholder={mode === "reset" ? t.newPassword : t.password}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
      />

      <label style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "14px", color: "var(--muted)", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          style={{ width: "auto", accentColor: "var(--accent)" }}
        />
        {t.stayLoggedIn}
      </label>

      {error && (
        <p role="alert" style={{ color: "var(--accent)", fontSize: "14px", margin: 0 }}>
          {error}
        </p>
      )}

      <button className="btn member" type="submit" disabled={busy} style={{ width: "100%" }}>
        {mode === "reset" ? t.reset : mode === "signup" ? t.signUp : t.signIn}
      </button>

      {mode !== "reset" && (
        <p style={{ fontSize: "13.5px", color: "var(--muted)", margin: 0, textAlign: "center" }}>
          {mode === "signup" ? t.haveAccount : t.noAccount}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", font: "inherit", textDecoration: "underline" }}
          >
            {mode === "signup" ? t.switchToSignIn : t.switchToSignUp}
          </button>
        </p>
      )}
      {mode !== "reset" && (
        <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0, textAlign: "center" }}>{mode === "signup" ? t.already : t.forgot}</p>
      )}
    </form>
  );
}
