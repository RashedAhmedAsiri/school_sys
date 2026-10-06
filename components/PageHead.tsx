"use client";
import { useShell } from "./ClassContext";

/** Numbered, ruled section header: "02 — التحضير 1/1". */
export default function PageHead({ idx, title, sub, children }: { idx: string; title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  const { label } = useShell();
  return (
    <div className="page-head">
      <div>
        <div className="idx">{idx}</div>
        <h1>{title} <span className="cls mono">{label}</span></h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="row wrap no-print" style={{ gap: 8 }}>{children}</div>}
    </div>
  );
}
