import type { Metadata } from "next";
import CartView from "@/components/CartView";
import SitePage from "@/components/SitePage";

export const metadata: Metadata = {
  title: "Cart — rūsc",
  robots: { index: false },
  alternates: { canonical: "/en/cart/", languages: { fr: "/panier/", en: "/en/cart/" } },
};

export default function Cart() {
  return (
    <SitePage lang="en" page="cart" title="cart" sub="Your selection">
      <CartView lang="en" />
    </SitePage>
  );
}
