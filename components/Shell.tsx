"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Ctx, Logo, type Profile } from "./ClassContext";
import ClassSwitcher from "./ClassSwitcher";
import Spotlight from "./Spotlight";
import { api } from "@/lib/client";

const SECTIONS = [
  { href: "plan", label: "الخطة", ic: "🗓️" },
  { href: "attendance", label: "التحضير", ic: "✅" },
  { href: "curriculum", label: "المنهج", ic: "📚" },
  { href: "students", label: "الطلاب", ic: "📊" },
  { href: "assistant", label: "المساعد الذكي", ic: "✨" },
];

export default function Shell({
  cls, profiles: initial, teacher, children,
}: { cls: string; profiles: Profile[]; teacher: { name: string; voice: string }; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [profiles, setProfiles] = useState(initial);
  const [switcher, setSwitcher] = useState(false);
  const [palette, setPalette] = useState(false);
  const [msg, setMsg] = useState("");
  const profile = profiles.find((p) => p.classId === cls)!;
  const section = path.split("/")[3] || "";

  const toast = useCallback((m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2600);
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((v) => !v); }
      if (e.key === "Escape") { setPalette(false); setSwitcher(false); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const ctx = useMemo(
    () => ({ cls, label: cls.replace("-", "/"), profile, profiles, teacher, toast }),
    [cls, profile, profiles, teacher, toast]
  );

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    location.href = "/";
  }

  return (
    <Ctx.Provider value={ctx}>
      <Spotlight />
      <div className="shell">
        <main className="main">{children}</main>
        <aside className="side glass">
          <button className="class-btn" onClick={() => setSwitcher(true)} title="تغيير الفصل">
            <Logo p={profile} />
            <div className="grow">
              <div className="lbl">الفصل {ctx.label} · تغيير الفصل</div>
              <div className="nm">{profile.name}</div>
            </div>
            <span style={{ fontSize: 18, opacity: 0.6 }}>⇅</span>
          </button>
          <nav className="nav">
            <Link href={`/c/${cls}`} className={section === "" ? "on" : ""}>
              <span className="ic">🏠</span>الرئيسية
            </Link>
            {SECTIONS.map((s) => (
              <Link key={s.href} href={`/c/${cls}/${s.href}`} className={section === s.href ? "on" : ""}>
                <span className="ic">{s.ic}</span>
                {s.label}
              </Link>
            ))}
          </nav>
          <div className="side-foot">
            <Link href={`/c/${cls}/classroom`} className="btn primary">🎙️ وضع الحصة</Link>
            <button className="btn sm ghost" onClick={() => setPalette(true)}>بحث سريع <span className="kbd">Ctrl K</span></button>
            <div className="me">
              <div className="avatar">{teacher.name.trim()[0]}</div>
              <div className="grow" style={{ fontSize: 14, fontWeight: 600 }}>أ. {teacher.name}</div>
              <button className="btn icon ghost" title="تسجيل الخروج" onClick={logout}>⎋</button>
            </div>
          </div>
        </aside>
      </div>
      {switcher && (
        <ClassSwitcher
          current={cls}
          profiles={profiles}
          onClose={() => setSwitcher(false)}
          onPick={(id) => { setSwitcher(false); router.push(`/c/${id}${section ? "/" + section : ""}`); }}
          onSaved={(p) => setProfiles((all) => all.map((x) => (x.classId === p.classId ? p : x)))}
        />
      )}
      {palette && <Palette cls={cls} profiles={profiles} section={section} onClose={() => setPalette(false)} />}
      {msg && <div className="toast">{msg}</div>}
    </Ctx.Provider>
  );
}

function Palette({ cls, profiles, section, onClose }: { cls: string; profiles: Profile[]; section: string; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const opts = [
    { label: "الرئيسية", ic: "🏠", go: `/c/${cls}` },
    ...SECTIONS.map((s) => ({ label: s.label, ic: s.ic, go: `/c/${cls}/${s.href}` })),
    { label: "وضع الحصة", ic: "🎙️", go: `/c/${cls}/classroom` },
    ...profiles.map((p) => ({ label: `الفصل ${p.classId.replace("-", "/")} — ${p.name}`, ic: p.logo.startsWith("data:") ? "🏫" : p.logo, go: `/c/${p.classId}${section ? "/" + section : ""}` })),
  ].filter((o) => o.label.includes(q.trim()));
  const go = (o?: { go: string }) => { if (o) { router.push(o.go); onClose(); } };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="glass palette" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus value={q} placeholder="اذهب إلى قسم أو فصل…"
          onChange={(e) => { setQ(e.target.value); setI(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setI((v) => Math.min(v + 1, opts.length - 1));
            if (e.key === "ArrowUp") setI((v) => Math.max(v - 1, 0));
            if (e.key === "Enter") go(opts[i]);
          }}
        />
        {opts.map((o, k) => (
          <div key={o.go + o.label} className={"opt" + (k === i ? " on" : "")} onMouseEnter={() => setI(k)} onClick={() => go(o)}>
            <span>{o.ic}</span>{o.label}
          </div>
        ))}
      </div>
    </div>
  );
}
