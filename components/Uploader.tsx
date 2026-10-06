"use client";
import { useRef, useState } from "react";
import { api, extractFileText } from "@/lib/client";

type Item = { name: string; state: "reading" | "chunking" | "done" | "error"; info?: string };

/** Drag & drop books (PDF / Word / PowerPoint / TXT). Text is extracted here, then chunked on the server. */
export default function Uploader({ cls, onDone, compact = false }: { cls: string | null; onDone?: () => void; compact?: boolean }) {
  const [over, setOver] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const input = useRef<HTMLInputElement>(null);

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setItems((p) => [...p, ...list.map((f) => ({ name: f.name, state: "reading" as const }))]);
    for (const f of list) {
      const set = (patch: Partial<Item>) => setItems((p) => p.map((x) => (x.name === f.name ? { ...x, ...patch } : x)));
      try {
        const { text, kind } = await extractFileText(f);
        set({ state: "chunking" });
        const r = await api<{ chunks: number }>("/api/sources", {
          method: "POST",
          json: { title: f.name.replace(/\.[^.]+$/, ""), kind, text, cls },
        });
        set({ state: "done", info: `${r.chunks} مقطع` });
      } catch (e) {
        set({ state: "error", info: (e as Error).message });
      }
    }
    onDone?.();
  }

  return (
    <div className="stack">
      <div
        className={"drop" + (over ? " over" : "")}
        style={compact ? { padding: 20 } : undefined}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
      >
        <div style={{ fontSize: compact ? 28 : 44 }}>📚</div>
        <div style={{ fontWeight: 700, marginTop: 6 }}>اسحب ملف الكتاب هنا أو اضغط للاختيار</div>
        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>PDF · Word · PowerPoint · TXT — يمكنك رفع أكثر من مصدر</div>
        <input ref={input} type="file" multiple hidden accept=".pdf,.docx,.pptx,.txt,.md" onChange={(e) => handle(e.target.files)} />
      </div>
      {items.map((it) => (
        <div key={it.name} className="src">
          <div className="ficon">{it.name.split(".").pop()?.toUpperCase().slice(0, 4)}</div>
          <div className="grow">
            <div style={{ fontWeight: 600 }}>{it.name}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {it.state === "reading" && "جاري قراءة الملف…"}
              {it.state === "chunking" && "جاري تقسيم الكتاب إلى مقاطع (Chunk RAG)…"}
              {it.state === "done" && `جاهز · ${it.info}`}
              {it.state === "error" && <span style={{ color: "var(--bad)" }}>{it.info}</span>}
            </div>
          </div>
          {it.state === "done" ? <span className="chip ok">✓</span> : it.state === "error" ? <span className="chip bad">!</span> : <span className="spinner" />}
        </div>
      ))}
    </div>
  );
}
