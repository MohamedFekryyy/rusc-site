import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  sub: ReactNode;
  // h1 when the section is the whole page (booking page).
  as?: "h1" | "h2";
};

export default function SectionHead({ title, sub, as: Title = "h2" }: Props) {
  return (
    <div className="head">
      <Title>{title}</Title>
      <p className="sub">{sub}</p>
      <span className="rule"></span>
    </div>
  );
}
