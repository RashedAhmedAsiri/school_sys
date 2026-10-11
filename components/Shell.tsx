"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Ctx, Logo, type Profile } from "./ClassContext";
import ClassSwitcher from "./ClassSwitcher";
import Icon from "./Icon";
import WallpaperPicker from "./WallpaperPicker";
import { api } from "@/lib/client";
import { wallpaperStyle } from "@/lib/wallpapers";

export const SECTIONS = [
  { href: "plan", label: "الخطة", ic: "plan" },
  { href: "attendance", label: "التحضير", ic: "attendance" },
  { href: "curriculum", label: "المنهج", ic: "book" },
  { href: "students", label: "الطلاب", ic: "table" },
  { href: "assistant", label: "المساعد الذكي", short: "المساعد", ic: "assistant" },
];

export default function Shell({
  cls, profiles: initial, teacher, children,
}: { cls: string; profiles: Profile[]; teacher: { name: string; voice: string; wallpaper: string }; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [profiles, setProfiles] = useState(initial);
  const [switcher, setSwitcher] = useState(false);
  const [palette, setPalette] = useState(false);
  const [wallpaper, setWallpaper] = useState(teacher.wallpaper);
  const [wallPicker, setWallPicker] = useState(false);
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
      if (e.key === "Escape") { setPalette(false); setSwitcher(false); setWallPicker(false); }
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
      <div className="shell">
        <main className="main" style={wallpaperStyle(wallpaper)}>{children}</main>
        <aside className="side">
          <div className="side-top">
            <Link href={`/c/${cls}`} className="brand">
              <div className="mark">م</div>
              <div><b>ثانوية الموهوبين التقنية</b><small>المنصة الذكية</small></div>
            </Link>
            <div className="m-actions">
              <Link href={`/c/${cls}/classroom`} className="btn sm primary"><Icon name="board" size={16} />وضع الحصة</Link>
              <button className="btn icon-only ghost" title="خلفية الموقع" onClick={() => setWallPicker(true)}><Icon name="image" size={18} /></button>
              <button className="btn icon-only ghost" title="تسجيل الخروج" onClick={logout}><Icon name="logout" size={18} /></button>
            </div>
          </div>
          <button className="class-btn" onClick={() => setSwitcher(true)} title="تغيير الفصل">
            <Logo p={profile} />
            <div className="grow">
              <div className="lbl">الفصل <span className="mono">{ctx.label}</span></div>
              <div className="nm">{profile.name}</div>
            </div>
            <span className="sw"><Icon name="swap" size={18} /></span>
          </button>
          <nav className="nav">
            <Link href={`/c/${cls}`} className={section === "" ? "on" : ""}>
              <Icon name="home" size={18} />الرئيسية
            </Link>
            {SECTIONS.map((s) => (
              <Link key={s.href} href={`/c/${cls}/${s.href}`} className={section === s.href ? "on" : ""}>
                <Icon name={s.ic} size={18} />
                {"short" in s ? <><span className="lbl-full">{s.label}</span><span className="lbl-short">{s.short}</span></> : s.label}
              </Link>
            ))}
          </nav>
          <div className="side-foot">
            <Link href={`/c/${cls}/classroom`} className="btn primary"><Icon name="board" size={17} />وضع الحصة</Link>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn sm ghost grow" onClick={() => setWallPicker(true)}><Icon name="image" size={16} />الخلفية</button>
              <button className="btn sm ghost grow" onClick={() => setPalette(true)} title="Ctrl K"><Icon name="search" size={16} />بحث</button>
            </div>
            <div className="me">
              <div className="avatar">{teacher.name.trim()[0]}</div>
              <div className="grow" style={{ fontSize: 13, fontWeight: 600 }}>أ. {teacher.name}</div>
              <button className="btn icon-only ghost" title="تسجيل الخروج" onClick={logout}><Icon name="logout" size={18} /></button>
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
      {wallPicker && <WallpaperPicker value={wallpaper} onChange={setWallpaper} onClose={() => setWallPicker(false)} />}
      {palette && <Palette cls={cls} profiles={profiles} section={section} onClose={() => setPalette(false)} />}
      {msg && <div className="toast">{msg}</div>}
    </Ctx.Provider>
  );
}

function Palette({ cls, profiles, section, onClose }: { cls: string; profiles: Profile[]; section: string; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const opts: { label: string; go: string; icon?: string; p?: Profile }[] = [
    { label: "الرئيسية", icon: "home", go: `/c/${cls}` },
    ...SECTIONS.map((s) => ({ label: s.label, icon: s.ic, go: `/c/${cls}/${s.href}` })),
    { label: "وضع الحصة", icon: "board", go: `/c/${cls}/classroom` },
    ...profiles.map((p) => ({ label: `الفصل ${p.classId.replace("-", "/")} — ${p.name}`, p, go: `/c/${p.classId}${section ? "/" + section : ""}` })),
  ].filter((o) => o.label.includes(q.trim()));
  const go = (o?: { go: string }) => { if (o) { router.push(o.go); onClose(); } };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus value={q} placeholder="اذهب إلى قسم أو فصل"
          onChange={(e) => { setQ(e.target.value); setI(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setI((v) => Math.min(v + 1, opts.length - 1));
            if (e.key === "ArrowUp") setI((v) => Math.max(v - 1, 0));
            if (e.key === "Enter") go(opts[i]);
          }}
        />
        <div className="opts">
          {opts.map((o, k) => (
            <div key={o.go + o.label} className={"opt" + (k === i ? " on" : "")} onMouseEnter={() => setI(k)} onClick={() => go(o)}>
              {o.p ? <Logo p={o.p} size={24} /> : <Icon name={o.icon!} size={18} />}
              {o.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
