import type { CSSProperties, ReactNode } from "react";

export const muted: CSSProperties = { color: "var(--muted)", marginBottom: "16px" };

export const rateRow: CSSProperties = {
  padding: "7px 0",
  borderBottom: "1px solid var(--line)",
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
};

export function PriceRow({ label, note, value, valueNote }: {
  label: ReactNode;
  note?: ReactNode;
  value: ReactNode;
  valueNote?: ReactNode;
}) {
  return (
    <div className="row">
      <span className="lbl">{label}{note && <small>{note}</small>}</span>
      <span className="val">{value}{valueNote && <small>{valueNote}</small>}</span>
    </div>
  );
}

export function LinkCard({ tag, title, unit, children }: {
  tag: ReactNode;
  title: ReactNode;
  unit: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="pcard">
      <p className="tag">{tag}</p>
      <h3>{title}</h3>
      <p className="unit">{unit}</p>
      <div className="foot">{children}</div>
    </article>
  );
}

export function Bio({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: "20px" }}>
      <h3 style={{ fontSize: "22px", marginBottom: "8px" }}>{name}</h3>
      <p style={{ color: "var(--muted)", fontSize: "16px" }}>{children}</p>
    </div>
  );
}
