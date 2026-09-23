import type { Metadata } from "next";
import SitePage from "@/components/SitePage";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Log in — rūsc client area, Chamonix",
  description:
    "Create your account or log in to your rūsc area. Track your bookings, your course cards and your membership status.",
  alternates: { canonical: "/en/login/", languages: { fr: "/connexion/", en: "/en/login/" } },
  robots: { index: false },
};

export default function Login() {
  return (
    <SitePage lang="en" page="connexion" title="log in" sub="Your rūsc area">
      <AuthForm
        title="log in"
        subtitle="Your rūsc area"
        signInTitle="Log in"
        signUpTitle="Sign up"
        name="Full name"
        email="Email"
        password="Password (8 characters minimum)"
        stayLoggedIn="Keep me logged in"
        signIn="Log in"
        signUp="Create my account"
        switchToSignUp="Create an account"
        switchToSignIn="Log in"
        haveAccount="Already have an account?"
        noAccount="No account yet?"
        errorGeneric="Something went wrong, please try again."
        preview="Sign-in will be available soon — this screen is being prepared."
      />
    </SitePage>
  );
}
