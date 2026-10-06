"use client";
import { useCallback, useEffect, useState } from "react";
import { useShell } from "@/components/ClassContext";
import { addDays, api, fmtDate } from "@/lib/client";

type Status = "present" | "absent" | "late" | "excused";
type Day = { date: string; today: string; students: { id: string; name: string; status: Status | null }[] };
type Hist = { dates: string[]; students: { id: string; name: string; cells: Record<string, Status>; absent: number; late: number; present: number }[] };

const LABEL: Record<Status, string> = { present: "حاضر", absent: "غائب", late: "متأخر", excused: "بعذر" };

export default function Attendance() {
  const { cls, label, toast } = useShell();
  const [date, setDate] = useState("");
  const [day, setDay] = useState<Day | null>(null);
  const [tab, setTab] = useState<"today" | "history">("today");
  const [hist, setHist] = useState<Hist | null>(null);

  const load = useCallback(async (d?: string) => {
    const r = await api<Day>(`/api/attendance?cls=${cls}${d ? `&date=${d}` : ""}`);
    setDay(r);
    setDate(r.date);
  }, [cls]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === "history") api<Hist>(`/api/attendance/history?cls=${cls}`).then(setHist); }, [tab, cls, day]);

  async function mark(studentId: string, status: Status) {
    setDay((d) => d && { ...d, students: d.students.map((s) => (s.id === studentId ? { ...s, status } : s)) });
    await api("/api/attendance", { method: "PUT", json: { cls, date, studentId, status } });
  }
  async function markAll() {
    await api("/api/attendance", { method: "PUT", json: { cls, date, all: true, status: "present" } });
    toast("تم تسجيل الجميع حاضرين");
    load(date);
  }

  const counts = day?.students.reduce((a, s) => ({ ...a, [s.status || "none"]: (a[s.status || "none"] || 0) + 1 }), {} as Record<string, number>) || {};

  return (
    <>
      <div className="page-head">
        <div>
          <h1>التحضير <span className="grad-text">{label}</span></h1>
          <p>{date && fmtDate(date)} {day && date === day.today && <span className="chip cyan">اليوم</span>}</p>
        </div>
        <div className="tabs" style={{ width: 300, margin: 0 }}>
          <button className={tab === "today" ? "on" : ""} onClick={() => setTab("today")}>تحضير اليوم</button>
          <button className={tab === "history" ? "on" : ""} onClick={() => setTab("history")}>سجل الغياب</button>
        </div>
      </div>

      {tab === "today" ? (
        <>
          <div className="glass card row wrap" style={{ padding: 14 }}>
            <button className="btn sm" onClick={() => load(addDays(date, -1))}>→ اليوم السابق</button>
            <input type="date" className="input" style={{ width: 170 }} value={date} onChange={(e) => load(e.target.value)} />
            <button className="btn sm" onClick={() => load(addDays(date, 1))}>اليوم التالي ←</button>
            {day && date !== day.today && <button className="btn sm ghost" onClick={() => load()}>العودة لليوم</button>}
            <div className="grow" />
            <span className="chip ok">حاضر {counts.present || 0}</span>
            <span className="chip bad">غائب {counts.absent || 0}</span>
            <span className="chip warn">متأخر {counts.late || 0}</span>
            <span className="chip">لم يُسجل {counts.none || 0}</span>
            <button className="btn primary sm" onClick={markAll}>✓ الكل حاضر</button>
          </div>
          {!day ? <div className="empty"><span className="spinner" /></div> : day.students.length === 0 ? (
            <div className="empty"><div className="big">🧑‍🎓</div>أضف الطلاب أولاً من قسم الطلاب.</div>
          ) : (
            <div className="att-list">
              {day.students.map((s, i) => (
                <div key={s.id} className={"att-item " + (s.status || "")}>
                  <div><span className="muted" style={{ fontSize: 12 }}>{i + 1}.</span> <b>{s.name}</b></div>
                  <div className="seg">
                    {(["present", "absent", "late", "excused"] as Status[]).map((st) => (
                      <button key={st} className={(s.status === st ? "on " : "") + st} onClick={() => mark(s.id, st)}>{LABEL[st]}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="glass card">
          {!hist ? <span className="spinner" /> : hist.dates.length === 0 ? (
            <div className="empty"><div className="big">🗓️</div>لم يُسجل أي حضور بعد.</div>
          ) : (
            <>
              <div className="row wrap" style={{ marginBottom: 12 }}>
                <span className="muted">منذ {fmtDate(hist.dates[0])} · {hist.dates.length} يوم مسجل</span>
                <div className="grow" />
                {(["present", "absent", "late", "excused"] as Status[]).map((s) => <span key={s} className="row" style={{ gap: 4, fontSize: 13 }}><i className={"dot " + s} />{LABEL[s]}</span>)}
              </div>
              <div className="sheet-wrap" style={{ maxHeight: "65vh" }}>
                <table className="sheet hist">
                  <thead>
                    <tr>
                      <th className="name">الطالب</th>
                      <th>غياب</th>
                      <th>تأخر</th>
                      {hist.dates.map((d) => <th key={d} className="c" title={fmtDate(d)} style={{ fontSize: 11, padding: "0 4px" }}>{d.slice(5).replace("-", "/")}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[...hist.students].sort((a, b) => b.absent - a.absent).map((s) => (
                      <tr key={s.id}>
                        <td className="name">{s.name} {s.absent >= 3 && <span className="chip bad" title="غياب متكرر">⚠ {s.absent}</span>}</td>
                        <td style={{ color: s.absent ? "var(--bad)" : undefined, fontWeight: 700 }}>{s.absent}</td>
                        <td>{s.late}</td>
                        {hist.dates.map((d) => <td key={d} className="c" title={`${fmtDate(d)}: ${s.cells[d] ? LABEL[s.cells[d]] : "—"}`}><i className={"dot " + (s.cells[d] || "none")} /></td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
