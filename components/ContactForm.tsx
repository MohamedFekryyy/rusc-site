"use client";

import type { FormEvent } from "react";
import { mailtoHref, type MailLabels } from "@/lib/contact";
import { FORM_ENDPOINT } from "@/lib/site";

type Props = {
  placeholders: { firstName: string; lastName: string; email: string; phone: string; message: string };
  subjects: { placeholder: string; options: string[] };
  send: string;
  // Shown once FORM_ENDPOINT accepted the message.
  sent: string;
  mail: MailLabels;
};

export default function ContactForm({ placeholders, subjects, send, sent, mail }: Props) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const openMail = () => {
      window.location.href = mailtoHref(new FormData(form), mail);
    };
    if (!FORM_ENDPOINT) {
      openMail();
      return;
    }
    fetch(FORM_ENDPOINT, { method: "POST", body: new FormData(form) })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        form.reset();
        alert(sent);
      })
      .catch(openMail);
  }

  return (
    <form id="contact-form" action="#" method="POST" onSubmit={onSubmit}>
      <input type="text" name="prenom" placeholder={placeholders.firstName} required />
      <input type="text" name="nom" placeholder={placeholders.lastName} required />
      <input type="email" name="email" placeholder={placeholders.email} required />
      <input type="tel" name="tel" placeholder={placeholders.phone} />
      <select name="objet" required>
        <option value="">{subjects.placeholder}</option>
        {subjects.options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <textarea name="message" rows={5} placeholder={placeholders.message} required />
      <button className="btn" type="submit">
        {send}
      </button>
    </form>
  );
}
