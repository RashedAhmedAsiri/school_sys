"use client";
import { useShell } from "./ClassContext";

/** Ruled section header: "التحضير 1/1" with the page's actions beside it. */
export default function PageHead({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  const { label } = useShell();
  return (
    <div className="page-head">
      <div>
        <h1>{title} <span className="cls mono">{label}</span></h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="row wrap no-print" style={{ gap: 8 }}>{children}</div>}
    </div>
  );
}
