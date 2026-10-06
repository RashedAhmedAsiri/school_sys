"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useShell } from "@/components/ClassContext";
import { api, streamChat } from "@/lib/client";
import Icon from "@/components/Icon";
import PageHead from "@/components/PageHead";
import { StudentsArt } from "@/components/Art";

type Col = { id: string; name: string; maxScore: number; grades: Record<string, number | null> };
type Data = { students: { id: string; name: string }[]; columns: Col[] };

export default function Students() {
  const { cls, label, profile, toast } = useShell();
  const [data, setData] = useState<Data | null>(null);
  const [newNames, setNewNames] = useState("");
  const [colOpen, setColOpen] = useState(false);
  const [colName, setColName] = useState("");
  const [colMax, setColMax] = useState("20");
  const [cmd, setCmd] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiReply, setAiReply] = useState("");
  const [q, setQ] = useState("");
  const grid = useRef<HTMLTableElement>(null);

  const load = useCallback(() => api<Data>(`/api/students?cls=${cls}`).then(setData), [cls]);
  useEffect(() => { load(); }, [load]);

  async function addStudents() {
    const names = newNames.split(/\n|،|,/).map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    await api("/api/students", { method: "POST", json: { cls, names } });
    setNewNames("");
    toast(`تمت إضافة ${names.length} طالب لكل معلمي الفصل ${label}`);
    load();
  }
  async function delStudent(id: string, name: string) {
    if (!confirm(`حذف ${name}؟ سيُحذف من الفصل لكل المعلمين.`)) return;
    await api(`/api/students?id=${id}`, { method: "DELETE" });
    load();
  }
  async function rename(id: string, old: string) {
    const name = prompt("الاسم الجديد", old);
    if (!name || name === old) return;
    await api("/api/students", { method: "PATCH", json: { id, name } });
    load();
  }
  async function addColumn(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/columns", { method: "POST", json: { cls, name: colName, maxScore: Number(colMax) } });
    setColOpen(false);
    setColName("");
    toast(`أُضيف عمود "${colName}" من ${colMax}`);
    load();
  }
  async function colMenu(c: Col) {
    const a = prompt(`عمود "${c.name}" من ${c.maxScore}\nاكتب اسماً جديداً، أو "حذف" لحذف العمود:`, c.name);
    if (!a) return;
    if (a.trim() === "حذف") {
      if (!confirm(`حذف عمود ${c.name} وكل درجاته؟`)) return;
      await api(`/api/columns?id=${c.id}`, { method: "DELETE" });
    } else {
      const max = prompt("الدرجة العظمى", String(c.maxScore));
      await api("/api/columns", { method: "PATCH", json: { id: c.id, name: a, maxScore: Number(max) } });
    }
    load();
  }
  async function setGrade(col: Col, studentId: string, raw: string) {
    const v = raw.trim() === "" ? null : Number(raw);
    if (v !== null && (isNaN(v) || v < 0 || v > col.maxScore)) { toast(`الدرجة بين 0 و ${col.maxScore}`); return; }
    if ((col.grades[studentId] ?? null) === v) return;
    setData((d) => d && { ...d, columns: d.columns.map((c) => (c.id === col.id ? { ...c, grades: { ...c.grades, [studentId]: v } } : c)) });
    await api("/api/grades", { method: "PUT", json: { columnId: col.id, studentId, score: v } }).catch((e) => toast(e.message));
  }
  function nav(e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) {
    const move: Record<string, [number, number]> = { Enter: [1, 0], ArrowDown: [1, 0], ArrowUp: [-1, 0], ArrowLeft: [0, 1], ArrowRight: [0, -1] };
    const m = move[e.key];
    if (!m) return;
    e.preventDefault();
    (e.target as HTMLInputElement).blur();
    const next = grid.current?.querySelector<HTMLInputElement>(`[data-r="${r + m[0]}"][data-c="${c + m[1]}"]`);
    next?.focus();
    next?.select();
  }
  async function runAI(e: React.FormEvent) {
    e.preventDefault();
    if (!cmd.trim()) return;
    setAiBusy(true);
    setAiReply("");
    await streamChat({ cls, message: `[من صفحة جدول الطلاب] ${cmd}` }, (ev) => {
      if (ev.t === "text") setAiReply((r) => r + ev.d);
      if (ev.t === "changed") load();
      if (ev.t === "error") setAiReply((r) => r + "\n" + ev.d);
    });
    setAiBusy(false);
    setCmd("");
    load();
  }
  function exportCSV() {
    if (!data) return;
    const head = ["#", "الطالب", ...data.columns.map((c) => `${c.name} (${c.maxScore})`), "المجموع", "من"];
    const rows = data.students.map((s, i) => {
      const scores = data.columns.map((c) => c.grades[s.id] ?? "");
      const sum = data.columns.reduce((a, c) => a + (c.grades[s.id] ?? 0), 0);
      return [i + 1, s.name, ...scores, sum, totalMax];
    });
    const csv = "﻿" + [head, ...rows].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `درجات ${label} ${profile.name}.csv`;
    a.click();
  }

  const totalMax = data?.columns.reduce((a, c) => a + c.maxScore, 0) ?? 0;
  const students = data?.students.filter((s) => s.name.includes(q.trim())) ?? [];
  const avg = (c: Col) => {
    const v = Object.values(c.grades).filter((x): x is number => typeof x === "number");
    return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "—";
  };

  return (
    <>
      <PageHead idx="04" title="الطلاب" sub="قائمة الطلاب مشتركة مع كل معلمي الفصل · أعمدة الدرجات خاصة بك">
        <div className="ai-bar" style={{ padding: "0 10px", width: 190 }}>
          <Icon name="search" size={16} />
          <input placeholder="بحث عن طالب" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn" onClick={exportCSV}><Icon name="download" size={16} />تصدير Excel</button>
        <button className="btn" onClick={() => print()}><Icon name="print" size={16} />طباعة</button>
        <button className="btn primary" onClick={() => setColOpen(true)}><Icon name="plus" size={16} />عمود درجات</button>
      </PageHead>

      <form className="ai-bar no-print" onSubmit={runAI}>
        <span className="lead">أمر ذكي</span>
        <input value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder='اطلب من الذكاء الاصطناعي: "أعط الجميع 18 في المشاركة" أو "أضف عمود واجبات من 10"' />
        <button className="btn primary sm" disabled={aiBusy}>{aiBusy ? <span className="spinner" /> : "نفّذ"}</button>
      </form>
      {aiReply && <div className="ai-reply">{aiReply}</div>}

      {colOpen && (
        <div className="overlay" onClick={() => setColOpen(false)}>
          <form className="modal" style={{ width: 420 }} onClick={(e) => e.stopPropagation()} onSubmit={addColumn}>
            <h2 style={{ marginBottom: 16 }}>عمود درجات جديد</h2>
            <div className="stack">
              <label className="field">اسم العمود<input className="input" autoFocus required value={colName} onChange={(e) => setColName(e.target.value)} placeholder="مثال: المشاركة" /></label>
              <label className="field">الدرجة العظمى<input className="input" type="number" min="0.5" step="0.5" required value={colMax} onChange={(e) => setColMax(e.target.value)} /></label>
              <div className="muted" style={{ fontSize: 13 }}>يُطبق على كل طلاب الفصل {label} في جدولك فقط، ويُحدّث المجموع تلقائياً.</div>
              <button className="btn primary">إضافة</button>
            </div>
          </form>
        </div>
      )}

      <div className="sheet-wrap">
        {!data ? (
          <div className="empty"><span className="spinner" /></div>
        ) : (
          <table className="sheet" ref={grid}>
            <thead>
              <tr>
                <th className="num">#</th>
                <th className="name">الطالب</th>
                {data.columns.map((c) => (
                  <th key={c.id} title="اضغط للتعديل">
                    <div className="col-head" onClick={() => colMenu(c)}>
                      {c.name}
                      <small>من {c.maxScore} · متوسط {avg(c)}</small>
                    </div>
                  </th>
                ))}
                <th className="total">المجموع<span className="pct">من {totalMax || "—"}</span></th>
                <th className="no-print" style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, r) => {
                const sum = data.columns.reduce((a, c) => a + (c.grades[s.id] ?? 0), 0);
                return (
                  <tr key={s.id}>
                    <td className="num">{r + 1}</td>
                    <td className="name" onDoubleClick={() => rename(s.id, s.name)} title="انقر مرتين لتعديل الاسم">{s.name}</td>
                    {data.columns.map((c, ci) => (
                      <td key={c.id}>
                        <input
                          className="cell"
                          data-r={r}
                          data-c={ci}
                          inputMode="decimal"
                          defaultValue={c.grades[s.id] ?? ""}
                          key={`${c.id}-${s.id}-${c.grades[s.id] ?? ""}`}
                          onBlur={(e) => setGrade(c, s.id, e.target.value)}
                          onKeyDown={(e) => nav(e, r, ci)}
                          onFocus={(e) => e.target.select()}
                        />
                      </td>
                    ))}
                    <td className="total">
                      {sum}
                      {totalMax > 0 && <span className="pct">{Math.round((sum / totalMax) * 100)}%</span>}
                    </td>
                    <td className="no-print">
                      <button className="btn sm ghost danger" onClick={() => delStudent(s.id, s.name)} title="حذف"><Icon name="trash" size={15} /></button>
                    </td>
                  </tr>
                );
              })}
              <tr className="no-print">
                <td className="num"><Icon name="plus" size={14} className="muted" /></td>
                <td className="name" colSpan={1}>
                  <input
                    className="cell name-in"
                    placeholder="اكتب اسم طالب واضغط Enter (أو الصق قائمة)"
                    value={newNames}
                    onChange={(e) => setNewNames(e.target.value)}
                    onPaste={(e) => {
                      const t = e.clipboardData.getData("text");
                      if (t.includes("\n")) { e.preventDefault(); setNewNames(t); }
                    }}
                    onKeyDown={(e) => e.key === "Enter" && addStudents()}
                  />
                </td>
                <td colSpan={data.columns.length + 2}>
                  {newNames.includes("\n") && <button className="btn sm primary" onClick={addStudents}>إضافة {newNames.split("\n").filter((x) => x.trim()).length} طلاب</button>}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
      {data && data.students.length === 0 && <div className="empty"><StudentsArt />لا يوجد طلاب بعد. اكتب الأسماء في السطر الأخير من الجدول، أو الصق قائمة كاملة.</div>}
    </>
  );
}
