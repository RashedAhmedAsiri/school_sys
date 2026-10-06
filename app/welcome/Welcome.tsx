"use client";
import { useState } from "react";
import Uploader from "@/components/Uploader";
import { api } from "@/lib/client";

export default function Welcome({ name }: { name: string }) {
  const [uploaded, setUploaded] = useState(false);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    await api("/api/me", { method: "PATCH", json: { onboarded: true } });
    location.href = "/c/1-1";
  }
  return (
    <main className="intro">
      <div className="glass card rise spot" style={{ width: "min(640px, 94vw)", padding: 32 }}>
        <span className="chip cyan">الخطوة 2 من 2</span>
        <h1 style={{ fontSize: 30, marginTop: 14 }}>
          أهلاً أ. {name} <span className="grad-text">👋</span>
        </h1>
        <p className="muted" style={{ lineHeight: 1.8 }}>
          ارفع ملف الكتاب الذي تدرّسه ليقرأه المساعد الذكي. يُقسَّم الكتاب إلى مقاطع صغيرة، فيرسل المساعد مع كل سؤال المقاطع المتعلقة به فقط.
          يمكنك إضافة مصادر أخرى لاحقاً من قسم المنهج.
        </p>
        <div style={{ margin: "20px 0" }}>
          <Uploader cls={null} onDone={() => setUploaded(true)} />
        </div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <button className="btn ghost" onClick={go} disabled={busy}>تخطي الآن</button>
          <button className="btn primary" onClick={go} disabled={busy || !uploaded}>
            {busy ? <span className="spinner" /> : "متابعة إلى المنصة ←"}
          </button>
        </div>
      </div>
    </main>
  );
}
