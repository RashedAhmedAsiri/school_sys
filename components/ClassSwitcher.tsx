"use client";
import { useState } from "react";
import { Logo, type Profile } from "./ClassContext";
import { api } from "@/lib/client";

const EMOJIS = ["🚀", "💡", "🦅", "🧠", "🔭", "⚡", "👑", "💎", "🎨", "🧪", "🛰️", "🤖", "🌟", "🔥", "🌊", "🦁", "🐺", "🦉", "🏆", "🎯", "🧬", "📐", "💻", "🌙"];

/** The nine classes as planets on three orbits (one orbit per grade), plus per-teacher name/logo editing. */
export default function ClassSwitcher({
  current, profiles, onPick, onClose, onSaved,
}: { current: string; profiles: Profile[]; onPick: (id: string) => void; onClose: () => void; onSaved: (p: Profile) => void }) {
  const [tab, setTab] = useState<"pick" | "edit">("pick");
  const radius: Record<string, number> = { "1": 22, "2": 34, "3": 46 };
  const offset: Record<string, number> = { "1": -90, "2": -30, "3": 30 };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="glass modal" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>الفصول</h2>
          <div className="tabs" style={{ margin: 0, width: 260 }}>
            <button className={tab === "pick" ? "on" : ""} onClick={() => setTab("pick")}>اختيار</button>
            <button className={tab === "edit" ? "on" : ""} onClick={() => setTab("edit")}>تخصيص الاسم والشعار</button>
          </div>
        </div>
        {tab === "pick" ? (
          <div className="orbit">
            {["1", "2", "3"].map((g) => (
              <div key={g} className="ring" style={{ ["--inset" as string]: `${50 - radius[g]}%`, ["--dur" as string]: `${40 + Number(g) * 20}s` }} />
            ))}
            <div className="core">ثانوية<br />الموهوبين</div>
            {profiles.map((p) => {
              const [g, s] = p.classId.split("-");
              const ang = ((offset[g] + (Number(s) - 1) * 120) * Math.PI) / 180;
              const r = radius[g];
              return (
                <button
                  key={p.classId}
                  className={"planet" + (p.classId === current ? " on" : "")}
                  style={{ left: `${50 + r * Math.cos(ang)}%`, top: `${50 + r * Math.sin(ang)}%` }}
                  onClick={() => onPick(p.classId)}
                >
                  <Logo p={p} />
                  <small>{p.classId.replace("-", "/")} · {p.name}</small>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="class-edit">
            {profiles.map((p) => <EditItem key={p.classId} p={p} onSaved={onSaved} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function EditItem({ p, onSaved }: { p: Profile; onSaved: (p: Profile) => void }) {
  const [name, setName] = useState(p.name);
  const [open, setOpen] = useState(false);
  async function save(patch: Partial<Profile>) {
    const r = await api<Profile>("/api/classes", { method: "PATCH", json: { classId: p.classId, ...patch } });
    onSaved({ classId: r.classId, name: r.name, logo: r.logo, color: r.color });
  }
  async function upload(f?: File) {
    if (!f) return;
    const img = new Image();
    img.src = URL.createObjectURL(f);
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 160;
    const ctx = c.getContext("2d")!;
    const s = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 160, 160);
    save({ logo: c.toDataURL("image/webp", 0.85) });
  }
  return (
    <div className="item" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div className="row">
        <button className="btn ghost" style={{ padding: 0 }} onClick={() => setOpen((v) => !v)} title="تغيير الشعار">
          <Logo p={p} />
        </button>
        <div className="grow">
          <div className="muted" style={{ fontSize: 12, fontWeight: 700 }}>{p.classId.replace("-", "/")}</div>
          <input className="input" style={{ padding: "6px 10px" }} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== p.name && save({ name })} />
        </div>
        <input type="color" value={p.color} onChange={(e) => save({ color: e.target.value })} style={{ width: 30, height: 30, border: 0, background: "none" }} title="لون الفصل" />
      </div>
      {open && (
        <div className="stack" style={{ marginTop: 8, gap: 8 }}>
          <div className="emoji-pick">
            {EMOJIS.map((e) => <button key={e} onClick={() => save({ logo: e })}>{e}</button>)}
          </div>
          <label className="btn sm">🖼️ رفع صورة شعار
            <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
          </label>
        </div>
      )}
    </div>
  );
}
