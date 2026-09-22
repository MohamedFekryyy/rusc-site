import { EMAIL } from "./site";

// Line labels for the prefilled email body, e.g. "Prénom : " / "First name: ".
export type MailLabels = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

// mailto: fallback used while no FORM_ENDPOINT is configured.
export function mailtoHref(data: FormData, labels: MailLabels) {
  const subject = "[rūsc] " + (data.get("objet") || "Contact");
  const body =
    labels.firstName + data.get("prenom") + "\n" +
    labels.lastName + data.get("nom") + "\n" +
    labels.email + data.get("email") + "\n" +
    labels.phone + (data.get("tel") || "") + "\n\n" +
    data.get("message");
  return (
    "mailto:" + EMAIL +
    "?subject=" + encodeURIComponent(subject) +
    "&body=" + encodeURIComponent(body)
  );
}
