import type { ReactNode } from "react";

export default function SectionHead({ title, sub }: { title: ReactNode; sub: ReactNode }) {
  return (
    <div className="head">
      <h2>{title}</h2>
      <p className="sub">{sub}</p>
      <span className="rule"></span>
    </div>
  );
}
