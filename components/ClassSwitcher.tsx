"use client";
import { useState } from "react";
import { Logo, type Profile } from "./ClassContext";
import Icon, { Shape, SHAPES } from "./Icon";
import { api } from "@/lib/client";

const COLORS = ["#16a34a", "#22b45a", "#0f6b34", "#13803f", "#5b3fe0", "#7a5cf0", "#8a6df5", "#4329b8", "#0d5c2e", "#17153a"];

/** The nine classes as a 3x3 matrix (rows = grade, columns = section), plus per-teacher name, mark and colour. */
export default function ClassSwitcher({
  current, profiles, onPick, onClose, onSaved,
}: { current: string; profiles: Profile[]; onPick: (id: string) => void; onClose: () => void; onSaved: (p: Profile) => void }) {
  const [tab, setTab] = useState<"pick" | "edit">("pick");
  const byId = new Map(profiles.map((p) => [p.classId, p]));

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>الفصول</h2>
          <div className="row" style={{ gap: 8 }}>
            <div className="seg-tabs">
              <button className={tab === "pick" ? "on" : ""} onClick={() => setTab("pick")}>اختيار</button>
              <button className={tab === "edit" ? "on" : ""} onClick={() => setTab("edit")}>تخصيص</button>
            </div>
            <button className="btn icon-only ghost" onClick={onClose} title="إغلاق"><Icon name="close" size={18} /></button>
          </div>
        </div>
        {tab === "pick" ? (
          <div className="matrix">
            <div className="hd" />
            {[1, 2, 3].map((s) => <div key={s} className="hd">الشعبة {s}</div>)}
            {[1, 2, 3].map((g) => (
              <Row key={g} g={g}>
                {[1, 2, 3].map((s) => {
                  const p = byId.get(`${g}-${s}`)!;
                  return (
                    <button key={s} className={"cell-c" + (p.classId === current ? " on" : "")} onClick={() => onPick(p.classId)}>
                      <Logo p={p} size={48} />
                      <b>{p.name}</b>
                      <small>{g}/{s}</small>
                    </button>
                  );
                })}
              </Row>
            ))}
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

function Row({ g, children }: { g: number; children: React.ReactNode }) {
  return (
    <>
      <div className="rh"><span>الصف</span><b>{g}</b></div>
      {children}
    </>
  );
}

function EditItem({ p, onSaved }: { p: Profile; onSaved: (p: Profile) => void }) {
  const [name, setName] = useState(p.name);
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
    <div className="item">
      <div className="row">
        <Logo p={p} />
        <div className="grow">
          <div className="label mono">{p.classId.replace("-", "/")}</div>
          <input className="input" style={{ padding: "5px 9px" }} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== p.name && save({ name })} />
        </div>
      </div>
      <div className="picker">
        {SHAPES.map((s) => (
          <button key={s} className={p.logo === `shape:${s}` ? "on" : ""} onClick={() => save({ logo: `shape:${s}` })} title={s}><Shape shape={s} size={16} /></button>
        ))}
        <label className="btn sm" style={{ padding: "5px 8px" }} title="رفع صورة شعار">
          <Icon name="image" size={16} />
          <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
        </label>
      </div>
      <div className="picker">
        {COLORS.map((c) => (
          <button key={c} className={"swatch" + (p.color === c ? " on" : "")} style={{ background: c }} onClick={() => save({ color: c })} title={c} />
        ))}
      </div>
    </div>
  );
}
