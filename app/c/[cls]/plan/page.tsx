"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShell } from "@/components/ClassContext";
import { api, fmtDate, streamChat } from "@/lib/client";

type Entry = { date: string; title: string; notes: string; done: boolean };
const DOW = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function Plan() {
  const { cls, label, toast } = useShell();
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [notes, setNotes] = useState<string | null>(null);
  const [saved, setSaved] = useState(true);
  const [edit, setEdit] = useState<Entry | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiOut, setAiOut] = useState("");
  const today = iso(new Date());

  const days = useMemo(() => {
    const start = new Date(month);
    start.setDate(1 - start.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [month]);

  const load = useCallback(async () => {
    const r = await api<{ entries: Entry[]; notes: string }>(`/api/plan?cls=${cls}&from=${iso(days[0])}&to=${iso(days[41])}`);
    setEntries(Object.fromEntries(r.entries.map((e) => [e.date, e])));
    setNotes((n) => (n === null ? r.notes : n));
  }, [cls, days]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (notes === null || saved) return;
    const t = setTimeout(async () => { await api("/api/notes", { method: "PUT", json: { notes } }); setSaved(true); }, 800);
    return () => clearTimeout(t);
  }, [notes, saved]);

  async function saveEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    await api("/api/plan", { method: "PUT", json: { cls, ...edit } });
    setEdit(null);
    load();
  }

  async function runAI(e: React.FormEvent) {
    e.preventDefault();
    setAiBusy(true);
    setAiOut("");
    await streamChat(
      { cls, message: `[من صفحة الخطة] ${aiText}\nاستخدم أداة set_plan لكل يوم دراسي (الأحد إلى الخميس) واعتمد على فهرس الكتاب إن وُجد. اليوم ${today}.` },
      (ev) => { if (ev.t === "text") setAiOut((o) => o + ev.d); if (ev.t === "changed") load(); }
    );
    setAiBusy(false);
    load();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>الخطة <span className="grad-text">{label}</span></h1>
          <p>ملاحظاتك للمساعد الذكي، وتوزيع الدروس على الأيام</p>
        </div>
        <button className="btn primary" onClick={() => setAiOpen(true)}>✨ خطط لي بالذكاء الاصطناعي</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "minmax(0,2.2fr) minmax(260px,1fr)", alignItems: "start" }}>
        <div className="glass card">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
            <button className="btn sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>→ السابق</button>
            <h3>{month.toLocaleDateString("ar-SA-u-ca-gregory", { month: "long", year: "numeric" })}</h3>
            <button className="btn sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>التالي ←</button>
          </div>
          <div className="cal">
            {DOW.map((d) => <div key={d} className="dow">{d}</div>)}
            {days.map((d) => {
              const k = iso(d);
              const e = entries[k];
              const cls2 = ["day", d.getMonth() !== month.getMonth() && "out", k === today && "today", (d.getDay() === 5 || d.getDay() === 6) && "weekend"].filter(Boolean).join(" ");
              return (
                <div key={k} className={cls2} onClick={() => setEdit(e || { date: k, title: "", notes: "", done: false })}>
                  <span className="n">{d.getDate()}</span>
                  {e && <span className={"ttl" + (e.done ? " done" : "")}>{e.title}</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass card stack spot">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3>📝 ملاحظات للمساعد</h3>
            <span className="muted" style={{ fontSize: 12 }}>{saved ? "محفوظ ✓" : "جاري الحفظ…"}</span>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>
            كل ما تكتبه هنا يقرأه المساعد الذكي مع كل طلب: أسلوبك في الشرح، مستوى طلابك، ما تريد التركيز عليه.
          </p>
          <textarea
            className="textarea"
            style={{ minHeight: 320 }}
            value={notes ?? ""}
            onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
            placeholder={"مثال:\n- أدرّس مادة الفيزياء للصف الأول\n- طلابي يحبون الأمثلة العملية\n- اجعل الأسئلة بمستوى تحدٍّ عالٍ\n- اختبار الفصل الأول بعد درس الحركة"}
          />
        </div>
      </div>

      {edit && (
        <div className="overlay" onClick={() => setEdit(null)}>
          <form className="glass modal" style={{ width: 460 }} onClick={(e) => e.stopPropagation()} onSubmit={saveEntry}>
            <h2>{fmtDate(edit.date)}</h2>
            <p className="muted">الفصل {label}</p>
            <div className="stack">
              <label className="field">اسم الدرس<input className="input" autoFocus value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="مثال: قوانين نيوتن للحركة" /></label>
              <label className="field">ملاحظات<textarea className="textarea" value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></label>
              <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={edit.done} onChange={(e) => setEdit({ ...edit, done: e.target.checked })} /> تم تدريس الدرس</label>
              <div className="row">
                <button className="btn primary grow">حفظ</button>
                {entries[edit.date] && <button type="button" className="btn danger" onClick={async () => { await api("/api/plan", { method: "PUT", json: { cls, date: edit.date, title: "" } }); setEdit(null); load(); toast("حُذف الدرس"); }}>حذف</button>}
              </div>
            </div>
          </form>
        </div>
      )}

      {aiOpen && (
        <div className="overlay" onClick={() => !aiBusy && setAiOpen(false)}>
          <form className="glass modal" style={{ width: 560 }} onClick={(e) => e.stopPropagation()} onSubmit={runAI}>
            <h2>✨ تخطيط ذكي</h2>
            <p className="muted">اكتب ما تريد، وسيضع المساعد الدروس على التقويم مباشرة.</p>
            <textarea className="textarea" value={aiText} onChange={(e) => setAiText(e.target.value)} placeholder="مثال: وزّع دروس الوحدة الأولى من الكتاب على أيام الدراسة في الأسبوعين القادمين، درس واحد في اليوم" />
            {aiOut && <div className="glass card" style={{ marginTop: 12, padding: 12, whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto", fontSize: 14 }}>{aiOut}</div>}
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn primary grow" disabled={aiBusy || !aiText.trim()}>{aiBusy ? <span className="spinner" /> : "خطط"}</button>
              <button type="button" className="btn" onClick={() => setAiOpen(false)} disabled={aiBusy}>إغلاق</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
