"use client";
import { useEffect, useState } from "react";
import Hello from "@/components/Hello";
import { SchoolArt } from "@/components/Art";
import { api } from "@/lib/client";

export default function Intro() {
  const [stage, setStage] = useState<"hello" | "out" | "auth">("hello");
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [site, setSite] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // hello is drawn for 2 seconds, then the sign-in card appears
    const a = setTimeout(() => setStage("out"), 2000);
    const b = setTimeout(() => setStage("auth"), 2500);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (mode === "signup" && pw !== pw2) return setErr("كلمتا المرور غير متطابقتين");
    setBusy(true);
    try {
      const r = await api<{ next: string }>(`/api/auth/${mode}`, {
        method: "POST",
        json: mode === "signup" ? { name, sitePassword: site, password: pw } : { name, password: pw },
      });
      location.href = r.next;
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  if (stage !== "auth")
    return (
      <main className="intro" onClick={() => setStage("auth")}>
        <div className={stage === "out" ? "intro-out" : ""}>
          <Hello />
        </div>
      </main>
    );

  return (
    <main className="intro">
      <div className="auth rise">
        <aside className="auth-side">
          <div className="mark">م</div>
          <div>
            <h1>ثانوية الموهوبين التقنية</h1>
            <p>منصة المعلم: الخطة، التحضير، المنهج، الطلاب، ومساعد ذكي يعرف كتابك وفصولك التسعة.</p>
          </div>
          <SchoolArt />
        </aside>
        <form className="auth-form" onSubmit={submit}>
          <div className="tabs">
            <button type="button" className={mode === "signup" ? "on" : ""} onClick={() => { setMode("signup"); setErr(""); }}>حساب جديد</button>
            <button type="button" className={mode === "login" ? "on" : ""} onClick={() => { setMode("login"); setErr(""); }}>تسجيل الدخول</button>
          </div>
          <div className="stack">
            <label className="field">الاسم
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أحمد العسيري" autoFocus required />
            </label>
            {mode === "signup" && (
              <label className="field">كلمة مرور الموقع
                <input className="input" value={site} onChange={(e) => setSite(e.target.value)} type="password" inputMode="numeric" placeholder="تحصل عليها من إدارة المدرسة" required />
              </label>
            )}
            <label className="field">{mode === "signup" ? "كلمة مرورك الشخصية" : "كلمة المرور"}
              <input className="input" value={pw} onChange={(e) => setPw(e.target.value)} type="password" required minLength={4} />
            </label>
            {mode === "signup" && (
              <label className="field">تأكيد كلمة المرور
                <input className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} type="password" required />
              </label>
            )}
            <div className="err">{err}</div>
            <button className="btn primary" disabled={busy} style={{ padding: 12 }}>
              {busy ? <span className="spinner" /> : mode === "signup" ? "إنشاء الحساب" : "دخول"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
