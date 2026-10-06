"use client";
import { useRef, useState } from "react";
import Icon from "./Icon";
import { api } from "@/lib/client";
import { WALLPAPERS, wallpaperStyle } from "@/lib/wallpapers";

/** Shrinks a photo to at most 1800px wide and re-encodes it as JPEG so it uploads fast. */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => fail(new Error("تعذر فتح الصورة"));
      i.src = url;
    });
    const scale = Math.min(1, 1800 / img.naturalWidth);
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function WallpaperPicker({
  value, onChange, onClose,
}: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const isImage = value.startsWith("image:");

  async function pick(id: string) {
    setErr("");
    onChange(id);
    await api("/api/me", { method: "PATCH", json: { wallpaper: id } }).catch((e) => setErr(e.message));
  }

  async function upload(f?: File) {
    if (!f) return;
    setErr("");
    setBusy(true);
    try {
      const r = await api<{ wallpaper: string }>("/api/me", { method: "PATCH", json: { wallpaperImage: await shrink(f) } });
      onChange(r.wallpaper);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(720px, 96vw)" }}>
        <div className="row">
          <div className="grow">
            <h2>خلفية الموقع</h2>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>خلفيات مرسومة للمدرسة، أو صورة من جهازك. تظهر في نظامك أنت فقط.</p>
          </div>
          <button className="btn icon-only ghost" onClick={onClose} title="إغلاق"><Icon name="close" size={18} /></button>
        </div>
        <div className="wp-grid">
          {WALLPAPERS.map((w) => (
            <button key={w.id} className={"wp-tile" + (value === w.id ? " on" : "")} onClick={() => pick(w.id)}>
              <span className="wp-prev" style={wallpaperStyle(w.id, { preview: true })} />
              <span className="wp-name">{value === w.id && <Icon name="check" size={15} />}{w.label}</span>
            </button>
          ))}
          <button className={"wp-tile" + (isImage ? " on" : "")} onClick={() => file.current?.click()} disabled={busy}>
            <span className="wp-prev upload" style={isImage ? wallpaperStyle(value, { preview: true }) : undefined}>
              {busy ? <span className="spinner" /> : !isImage && <Icon name="upload" size={24} />}
            </span>
            <span className="wp-name">{isImage && <Icon name="check" size={15} />}{isImage ? "صورتك (اضغط للتغيير)" : "صورة من جهازك"}</span>
          </button>
        </div>
        <div className="err" style={{ marginTop: 10 }}>{err}</div>
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
    </div>
  );
}
