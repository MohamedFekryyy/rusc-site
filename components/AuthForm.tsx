"use client";

import { useState, type FormEvent } from "react";
import { AUTH_ENDPOINT, signUp, logIn } from "@/lib/auth";

// Sign-up / log-in form. Shared by the FR and EN pages; the labels are passed
// in so it stays bilingual. Until the auth backend is live (AUTH_ENDPOINT
// empty), it renders in a clearly-labelled preview mode and does not send
// credentials anywhere.

type Props = {
  title: string;
  subtitle: string;
  signInTitle: string;
  signUpTitle: string;
  name: string;
  email: string;
  password: string;
  stayLoggedIn: string;
  signIn: string;
  signUp: string;
  switchToSignUp: string;
  switchToSignIn: string;
  haveAccount: string;
  noAccount: string;
  errorGeneric: string;
  preview: string;
};

export default function AuthForm(p: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = !AUTH_ENDPOINT;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (preview) {
      setError(p.preview);
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(nom.trim(), email.trim(), password);
      } else {
        await logIn(email.trim(), password);
      }
      // Success: the app reads the session on load; a simple redirect to the
      // member area is a fine first landing spot until profiles are richer.
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : p.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: "420px", margin: "0 auto", textAlign: "left" }}>
      {preview && (
        <p style={{ fontSize: "13px", color: "var(--accent)", margin: "0 0 6px" }}>{p.preview}</p>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
        <button
          type="button"
          className={`btn ${mode === "signin" ? "member" : "guest"}`}
          onClick={() => setMode("signin")}
          style={{ flex: 1 }}
        >
          {p.signInTitle}
        </button>
        <button
          type="button"
          className={`btn ${mode === "signup" ? "member" : "guest"}`}
          onClick={() => setMode("signup")}
          style={{ flex: 1 }}
        >
          {p.signUpTitle}
        </button>
      </div>

      {mode === "signup" && (
        <input
          type="text"
          name="name"
          placeholder={p.name}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          required
          autoComplete="name"
        />
      )}

      <input
        type="email"
        name="email"
        placeholder={p.email}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />
      <input
        type="password"
        name="password"
        placeholder={p.password}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
      />

      <label style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "14px", color: "var(--muted)", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          style={{ width: "auto", accentColor: "var(--accent)" }}
        />
        {p.stayLoggedIn}
      </label>

      {error && <p style={{ color: "var(--accent)", fontSize: "14px", margin: 0 }}>{error}</p>}

      <button className="btn member" type="submit" disabled={busy} style={{ width: "100%" }}>
        {mode === "signup" ? p.signUp : p.signIn}
      </button>

      <p style={{ fontSize: "13.5px", color: "var(--muted)", margin: 0, textAlign: "center" }}>
        {mode === "signup" ? p.haveAccount : p.noAccount}{" "}
        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", cursor: "pointer", font: "inherit", textDecoration: "underline" }}
        >
          {mode === "signup" ? p.switchToSignIn : p.switchToSignUp}
        </button>
      </p>
    </form>
  );
}
