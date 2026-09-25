import type { Metadata } from "next";
import SitePage from "@/components/SitePage";
import AccountArea from "@/components/AccountArea";

export const metadata: Metadata = {
  title: "Log in — rūsc client area, Chamonix",
  description:
    "Create your account or log in to your rūsc area. Track your bookings, your course passes and your membership status.",
  alternates: { canonical: "/en/login/", languages: { fr: "/connexion/", en: "/en/login/" } },
  robots: { index: false },
};

export default function Login() {
  return (
    <SitePage lang="en" page="connexion" title="log in" sub="Your rūsc area">
      <AccountArea lang="en" />
    </SitePage>
  );
}
