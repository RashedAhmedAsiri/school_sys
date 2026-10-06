"use client";
import { useState } from "react";
import Uploader from "@/components/Uploader";
import { api } from "@/lib/client";
import { DEFAULT_WALLPAPER, wallpaperStyle } from "@/lib/wallpapers";

export default function Welcome({ name }: { name: string }) {
  const [uploaded, setUploaded] = useState(false);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    await api("/api/me", { method: "PATCH", json: { onboarded: true } });
    location.href = "/c/1-1";
  }
  return (
    <main className="intro" style={wallpaperStyle(DEFAULT_WALLPAPER)}>
      <div className="panel rise" style={{ width: "min(620px, 94vw)", padding: 32 }}>
        <div className="label mono">الخطوة 2 من 2</div>
        <h1 style={{ fontSize: 26, margin: "8px 0 6px", lineHeight: 1.6 }}>أهلاً أ. {name}</h1>
        <p className="muted" style={{ lineHeight: 1.9, margin: 0 }}>
          ارفع ملف الكتاب الذي تدرّسه ليعتمد عليه المساعد الذكي. يُقسَّم الكتاب إلى مقاطع صغيرة، ومع كل سؤال تُرسل المقاطع المتعلقة به فقط.
          يمكنك إضافة مصادر أخرى لاحقاً من قسم المنهج.
        </p>
        <div style={{ margin: "22px 0" }}>
          <Uploader cls={null} onDone={() => setUploaded(true)} />
        </div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <button className="btn ghost" onClick={go} disabled={busy}>تخطي الآن</button>
          <button className="btn primary" onClick={go} disabled={busy || !uploaded}>
            {busy ? <span className="spinner" /> : "متابعة إلى المنصة"}
          </button>
        </div>
      </div>
    </main>
  );
}
