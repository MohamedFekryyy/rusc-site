import type { ReactNode } from "react";
import Header, { type NavPage } from "@/components/Header";
import Footer from "@/components/Footer";
import SectionHead from "@/components/SectionHead";
import type { Lang } from "@/lib/routes";
import "@/styles/home.css";

// Standard shell for every sub-page: header, a page title, the content, footer.
export default function SitePage({
  lang,
  page,
  title,
  sub,
  children,
}: {
  lang: Lang;
  page: NavPage;
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <Header lang={lang} page={page} />
      <section className="wrap" style={{ paddingTop: "48px" }}>
        <SectionHead title={title} sub={sub} as="h1" />
        {children}
      </section>
      <Footer lang={lang} />
    </>
  );
}
