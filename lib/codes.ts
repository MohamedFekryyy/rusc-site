import type { Lang } from "@/lib/routes";

// The studio's codes: carnets, gift vouchers and codes issued at the studio
// (for example a carnet paid in cash). rūsc admin on Fly (deploy/admin/)
// keeps their balances; the booking page checks a code, then takes each
// class booked with it off the balance.
export const CODES_ORIGIN = process.env.NEXT_PUBLIC_CODES_ORIGIN ?? "https://rusc-admin.fly.dev";

export type CodeUnit = "sessions" | "hours" | "euros";
export type CodeResult = {
  ok: boolean;
  reason?: string;
  code?: string;
  label?: string;
  unit?: CodeUnit;
  remaining?: number;
  expiresOn?: string | null;
};

async function post(path: string, body: unknown): Promise<CodeResult> {
  try {
    const res = await fetch(`${CODES_ORIGIN}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as CodeResult;
  } catch {
    return { ok: false, reason: "error" };
  }
}

// Can this code pay for a class of this offer (lib/cal.ts key)?
export const checkCode = (code: string, offer: string) => post("/api/check", { code, offer });
// Take the class just booked (Cal's seat reference) off the code.
export const redeemCode = (code: string, seatUid: string) => post("/api/redeem", { code, seatUid });

const UNITS: Record<Lang, Record<CodeUnit, [string, string]>> = {
  fr: { sessions: ["séance", "séances"], hours: ["heure", "heures"], euros: ["€", "€"] },
  en: { sessions: ["session", "sessions"], hours: ["hour", "hours"], euros: ["€", "€"] },
};

// "7 séances", "2,5 heures", "30 €".
export function formatBalance(result: CodeResult, lang: Lang) {
  const n = result.remaining ?? 0;
  const unit = result.unit ?? "sessions";
  const value = n.toLocaleString(lang === "fr" ? "fr-FR" : "en-GB");
  const [one, many] = UNITS[lang][unit];
  return unit === "euros" ? `${value} €` : `${value} ${n === 1 ? one : many}`;
}
