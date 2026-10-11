"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useShell } from "@/components/ClassContext";
import Uploader from "@/components/Uploader";
import { api } from "@/lib/client";
import Icon from "@/components/Icon";
import PageHead from "@/components/PageHead";
import { BooksArt, TestArt } from "@/components/Art";

type Source = { id: string; title: string; kind: string; classId: string | null; charCount: number; chunks: number; createdAt: string };
type Q = { type: "mcq" | "tf" | "short" | "essay"; question: string; options: string[]; answer: string; points: number };
type Test = { id: string; title: string; data: { title: string; instructions: string; questions: Q[] } };

export default function Page() {
  return <Suspense><Curriculum /></Suspense>;
}

function Curriculum() {
  const { cls, label, toast } = useShell();
  const sp = useSearchParams();
  const [sources, setSources] = useState<Source[] | null>(null);
  const [tests, setTests] = useState<{ id: string; title: string; count: number; createdAt: string }[]>([]);
  const [upload, setUpload] = useState(false);
  const [scope, setScope] = useState<"class" | "all">("class");
  const [dialog, setDialog] = useState<"pptx" | "test" | null>((sp.get("make") as "pptx" | "test") || null);
  const [view, setView] = useState<Test | null>(null);

  const load = useCallback(() => {
    api<Source[]>(`/api/sources?cls=${cls}`).then(setSources);
    api<typeof tests>(`/api/tests?cls=${cls}`).then(setTests);
  }, [cls]);
  useEffect(() => { load(); }, [load]);

  async function del(s: Source) {
    if (!confirm(`حذف "${s.title}"؟`)) return;
    await api(`/api/sources?id=${s.id}`, { method: "DELETE" });
    load();
  }
  async function openTest(id: string) {
    setView(await api<Test>(`/api/tests?id=${id}`));
  }

  return (
    <>
      <PageHead title="المنهج" sub="الكتب مقسمة إلى مقاطع صغيرة، فيقرأ المساعد ما يخص السؤال فقط">
        <button className="btn primary" onClick={() => setUpload((v) => !v)}><Icon name="plus" size={16} />إضافة مصدر</button>
      </PageHead>

      {upload && (
        <div className="panel card stack rise">
          <div className="row wrap">
            <span className="muted">المصدر لـ:</span>
            <div className="seg-tabs">
              <button className={scope === "class" ? "on" : ""} onClick={() => setScope("class")}>الفصل {label} فقط</button>
              <button className={scope === "all" ? "on" : ""} onClick={() => setScope("all")}>كل فصولي</button>
            </div>
          </div>
          <Uploader cls={scope === "class" ? cls : null} onDone={load} compact />
        </div>
      )}

      <div className="actions-bar no-print">
        <button className="btn primary" onClick={() => setDialog("pptx")}><Icon name="slides" size={17} />عرض PowerPoint لدرس اليوم</button>
        <button className="btn" onClick={() => setDialog("test")}><Icon name="test" size={17} />اختبار بنموذج إجابة</button>
        <Link href={`/c/${cls}/classroom`} className="btn"><Icon name="board" size={17} />وضع الحصة</Link>
        <Link href={`/c/${cls}/assistant`} className="btn ghost"><Icon name="assistant" size={17} />اسأل الكتاب</Link>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", alignItems: "start" }}>
        <div className="panel card">
          <div className="panel-head"><h3>المصادر {sources && sources.length > 0 && <span className="muted mono">({sources.length})</span>}</h3></div>
          {!sources ? <span className="spinner" /> : sources.length === 0 ? (
            <div className="empty"><BooksArt />لا توجد مصادر بعد. ارفع كتابك ليبدأ المساعد بالاعتماد عليه.</div>
          ) : sources.map((s) => (
            <div key={s.id} className="src">
              <div className="ficon"><Icon name="book" size={18} /></div>
              <div className="grow">
                <div style={{ fontWeight: 700 }}>{s.title}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {s.chunks} مقطع · {(s.charCount / 1000).toFixed(0)} ألف حرف · {s.classId ? `الفصل ${s.classId.replace("-", "/")}` : "كل الفصول"}
                </div>
              </div>
              <button className="btn sm ghost danger" onClick={() => del(s)} title="حذف"><Icon name="trash" size={15} /></button>
            </div>
          ))}
        </div>
        <div className="panel card">
          <div className="panel-head"><h3>الاختبارات {tests.length > 0 && <span className="muted mono">({tests.length})</span>}</h3></div>
          {tests.length === 0 ? <div className="empty"><TestArt />لم تنشئ اختبارات لهذا الفصل بعد.</div> : tests.map((t) => (
            <div key={t.id} className="src" style={{ cursor: "pointer" }} onClick={() => openTest(t.id)}>
              <div className="ficon"><Icon name="test" size={18} /></div>
              <div className="grow">
                <div style={{ fontWeight: 700 }}>{t.title}</div>
                <div className="muted" style={{ fontSize: 13 }}>{t.count} سؤال · {new Date(t.createdAt).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn")}</div>
              </div>
              <span className="tag plain">فتح</span>
            </div>
          ))}
        </div>
      </div>

      {dialog === "pptx" && <PptxDialog onClose={() => setDialog(null)} />}
      {dialog === "test" && <TestDialog onClose={() => setDialog(null)} onMade={(t) => { setDialog(null); load(); setView(t); toast("تم إنشاء الاختبار"); }} />}
      {view && <TestView test={view} onClose={() => setView(null)} onDeleted={() => { setView(null); load(); }} />}
    </>
  );
}

function PptxDialog({ onClose }: { onClose: () => void }) {
  const { cls, toast } = useShell();
  const [topic, setTopic] = useState("");
  const [slides, setSlides] = useState(8);
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function make(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/ai/pptx", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cls, topic, slides, extra }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "فشل الإنشاء");
      const blob = await res.blob();
      const name = decodeURIComponent(res.headers.get("Content-Disposition")?.split("''")[1] || "درس.pptx");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      toast("تم تنزيل العرض");
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }
  return (
    <div className="overlay" onClick={() => !busy && onClose()}>
      <form className="modal" style={{ width: 500 }} onClick={(e) => e.stopPropagation()} onSubmit={make}>
        <h2>عرض درس اليوم</h2>
        <p className="muted">اتركه فارغاً لاستخدام درس اليوم من الخطة.</p>
        <div className="stack">
          <label className="field">عنوان الدرس<input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="من الخطة تلقائياً" /></label>
          <label className="field">عدد الشرائح: {slides}<input type="range" min={4} max={16} value={slides} onChange={(e) => setSlides(Number(e.target.value))} /></label>
          <label className="field">طلبات إضافية<input className="input" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="مثال: أضف تجربة عملية بسيطة" /></label>
          <div className="err">{err}</div>
          <button className="btn primary" disabled={busy}>{busy ? <><span className="spinner" /> يصمم المساعد العرض</> : "إنشاء وتنزيل"}</button>
        </div>
      </form>
    </div>
  );
}

function TestDialog({ onClose, onMade }: { onClose: () => void; onMade: (t: Test) => void }) {
  const { cls } = useShell();
  const [f, setF] = useState({ topic: "", mcq: 5, tf: 3, short: 2, essay: 0, total: 20, difficulty: "متوسط" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function make(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await api<Test["data"] & { id: string }>("/api/ai/test", { method: "POST", json: { cls, ...f } });
      onMade({ id: r.id, title: r.title, data: r });
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }
  const num = (k: keyof typeof f, label: string) => (
    <label className="field">{label}<input className="input" type="number" min={0} max={30} value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} /></label>
  );
  return (
    <div className="overlay" onClick={() => !busy && onClose()}>
      <form className="modal" style={{ width: 540 }} onClick={(e) => e.stopPropagation()} onSubmit={make}>
        <h2>اختبار جديد</h2>
        <div className="stack" style={{ marginTop: 12 }}>
          <label className="field">الموضوع<input className="input" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} placeholder="من درس اليوم تلقائياً" /></label>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
            {num("mcq", "اختيار متعدد")}{num("tf", "صح وخطأ")}{num("short", "قصيرة")}{num("essay", "مقالي")}
          </div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {num("total", "مجموع الدرجات")}
            <label className="field">المستوى
              <select className="select" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}>
                <option>سهل</option><option>متوسط</option><option>صعب</option><option>تحدٍّ للموهوبين</option>
              </select>
            </label>
          </div>
          <div className="err">{err}</div>
          <button className="btn primary" disabled={busy}>{busy ? <><span className="spinner" /> يكتب المساعد الأسئلة</> : "إنشاء الاختبار"}</button>
        </div>
      </form>
    </div>
  );
}

function TestView({ test, onClose, onDeleted }: { test: Test; onClose: () => void; onDeleted: () => void }) {
  const { cls, toast } = useShell();
  const [showAns, setShowAns] = useState(false);
  const [grading, setGrading] = useState(false);
  const total = test.data.questions.reduce((a, q) => a + q.points, 0);
  const typeLabel = { mcq: "اختيار من متعدد", tf: "صح أم خطأ", short: "إجابة قصيرة", essay: "مقالي" };

  async function del() {
    if (!confirm("حذف الاختبار؟")) return;
    await api(`/api/tests?id=${test.id}`, { method: "DELETE" });
    toast("حُذف الاختبار");
    onDeleted();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ width: 860 }} onClick={(e) => e.stopPropagation()}>
        <div className="row wrap no-print" style={{ marginBottom: 14 }}>
          <button className="btn sm" onClick={() => setShowAns((v) => !v)}>{showAns ? "إخفاء الإجابات" : "إظهار نموذج الإجابة"}</button>
          <button className="btn sm" onClick={() => print()}><Icon name="print" size={15} />طباعة</button>
          <button className="btn sm primary" onClick={() => setGrading((v) => !v)}><Icon name="check" size={15} />تصحيح بالذكاء الاصطناعي</button>
          <div className="grow" />
          <button className="btn sm danger" onClick={del}>حذف</button>
          <button className="btn sm" onClick={onClose}>إغلاق</button>
        </div>
        {grading ? <Grader testId={test.id} cls={cls} onDone={() => setGrading(false)} /> : (
          <div className="stack" id="print-test">
            <div style={{ textAlign: "center" }}>
              <div className="muted">ثانوية الموهوبين التقنية · الفصل {cls.replace("-", "/")}</div>
              <h2 style={{ margin: "6px 0" }}>{test.data.title}</h2>
              <div className="muted">{test.data.instructions} · الدرجة الكلية: {total}</div>
              <div className="row" style={{ justifyContent: "center", marginTop: 10 }}>اسم الطالب: ____________________</div>
            </div>
            {test.data.questions.map((q, i) => (
              <div key={i} className="q">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <b>س{i + 1}. {q.question}</b>
                  <span className="tag plain">{q.points} درجة · {typeLabel[q.type]}</span>
                </div>
                {q.options.length > 0 && <ol type="a">{q.options.map((o, k) => <li key={k}>{o}</li>)}</ol>}
                {(q.type === "short" || q.type === "essay") && !showAns && <div style={{ borderBottom: "1px dashed var(--line)", height: q.type === "essay" ? 90 : 36 }} />}
                {showAns && <div className="ans">الإجابة: {q.answer}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Grader({ testId, cls, onDone }: { testId: string; cls: string; onDone: () => void }) {
  const { toast } = useShell();
  const [data, setData] = useState<{ students: { id: string; name: string }[]; columns: { id: string; name: string; maxScore: number }[] } | null>(null);
  const [col, setCol] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ name: string; score: number; feedback: string }[] | null>(null);
  const [max, setMax] = useState(0);
  useEffect(() => { api<NonNullable<typeof data>>(`/api/students?cls=${cls}`).then((d) => { setData(d); setCol(d.columns[0]?.id || ""); }); }, [cls]);

  async function grade() {
    setBusy(true);
    try {
      const r = await api<{ results: { name: string; score: number; feedback: string }[]; maxScore: number }>("/api/ai/grade", {
        method: "POST",
        json: { testId, columnId: col, answers: Object.entries(answers).map(([studentId, answer]) => ({ studentId, answer })) },
      });
      setResults(r.results);
      setMax(r.maxScore);
      toast("تم رصد الدرجات في الجدول");
    } catch (e) {
      toast((e as Error).message);
    }
    setBusy(false);
  }

  if (!data) return <span className="spinner" />;
  if (!data.columns.length) return <div className="empty">أضف عمود درجات أولاً من قسم الطلاب (مثلاً: اختبار قصير من 20).</div>;
  if (results)
    return (
      <div className="stack">
        <h3>نتائج التصحيح</h3>
        {results.map((r) => (
          <div key={r.name} className="q">
            <div className="row" style={{ justifyContent: "space-between" }}><b>{r.name}</b><span className="tag green mono">{r.score} / {max}</span></div>
            <div className="muted" style={{ marginTop: 6, fontSize: 14 }}>{r.feedback}</div>
          </div>
        ))}
        <button className="btn" onClick={onDone}>رجوع للاختبار</button>
      </div>
    );
  return (
    <div className="stack">
      <h3>تصحيح ورصد الدرجات</h3>
      <p className="muted" style={{ margin: 0 }}>الصق إجابة كل طالب (أو اكتبها). يصحح المساعد بناءً على نموذج الإجابة ويضع الدرجة في العمود الذي تختاره.</p>
      <label className="field">عمود الدرجات
        <select className="select" value={col} onChange={(e) => setCol(e.target.value)}>
          {data.columns.map((c) => <option key={c.id} value={c.id}>{c.name} (من {c.maxScore})</option>)}
        </select>
      </label>
      <div className="stack" style={{ maxHeight: "46vh", overflow: "auto" }}>
        {data.students.map((s) => (
          <label key={s.id} className="field">{s.name}
            <textarea className="textarea" style={{ minHeight: 60 }} value={answers[s.id] || ""} onChange={(e) => setAnswers({ ...answers, [s.id]: e.target.value })} placeholder="مثال: 1-ب 2-صح 3-…" />
          </label>
        ))}
      </div>
      <button className="btn primary" disabled={busy || !Object.values(answers).some((a) => a.trim())} onClick={grade}>
        {busy ? <><span className="spinner" /> يصحح</> : "صحّح وارصد الدرجات"}
      </button>
    </div>
  );
}
