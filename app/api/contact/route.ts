// Contact form: sends the visitor's message to the studio by e-mail.
//
// Preferred path: Brevo (Sendinblue) Transactional Email, the same mail
// infrastructure the studio already uses for booking e-mails. Needs
// BREVO_API_KEY set on Vercel (secret, held by the studio). Without it,
// the route answers 503 and ContactForm falls back to opening the visitor's
// mail app (mailto:), so the form never silently drops a message.
//
// The message goes to CONTACT_TO (default info@studio-rusc.com) and, like
// every transactional send, replies go to the visitor's own address.

import { EMAIL } from "@/lib/site";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
// A valid message is short and complete: name, email, object, message.
const MAX_FIELD = 500;

function bad(error: string, status = 400) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return bad("bad_request");
  }

  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const prenom = str(data.get("prenom")).slice(0, MAX_FIELD).trim();
  const nom = str(data.get("nom")).slice(0, MAX_FIELD).trim();
  const email = str(data.get("email")).slice(0, MAX_FIELD).trim();
  const tel = str(data.get("tel")).slice(0, MAX_FIELD).trim();
  const objet = str(data.get("objet")).slice(0, MAX_FIELD).trim();
  const message = str(data.get("message")).slice(0, 5000).trim();

  if (!prenom || !nom || !email || !message) return bad("missing_fields");
  // Light but real e-mail shape check; the visitor typed it themselves.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("bad_email");

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return bad("mail_unavailable", 503);

  const to = process.env.CONTACT_TO ?? EMAIL;
  const sender = process.env.CONTACT_SENDER ?? EMAIL;
  const subject = `[rūsc] ${objet || "contact"} — ${prenom} ${nom}`;
  const body = [
    `Prénom : ${prenom}`,
    `Nom : ${nom}`,
    `Email : ${email}`,
    tel ? `Téléphone : ${tel}` : "",
    `Objet : ${objet}`,
    "",
    message,
  ]
    .filter((line) => line !== "")
    .join("\n");

  let res: Response;
  try {
    res = await fetch(BREVO_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: sender, name: "rūsc" },
        to: [{ email: to, name: "rūsc" }],
        replyTo: { email, name: `${prenom} ${nom}` },
        subject,
        textContent: body,
      }),
    });
  } catch {
    return bad("mail_unavailable", 503);
  }

  // 201 created; 2xx otherwise. Anything else failed and we tell the client.
  if (res.status < 200 || res.status >= 300) return bad("mail_failed", 502);

  const result = (await res.json().catch(() => null)) as { messageId?: string } | null;
  return Response.json({ ok: true, messageId: result?.messageId ?? null });
}
