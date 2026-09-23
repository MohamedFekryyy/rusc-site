import type { Metadata } from "next";
import CartView from "@/components/CartView";
import SitePage from "@/components/SitePage";

export const metadata: Metadata = {
  title: "Panier — rūsc",
  robots: { index: false },
  alternates: { canonical: "/panier/", languages: { fr: "/panier/", en: "/en/cart/" } },
};

export default function Panier() {
  return (
    <SitePage lang="fr" page="cart" title="panier" sub="Votre sélection">
      <CartView lang="fr" />
    </SitePage>
  );
}
