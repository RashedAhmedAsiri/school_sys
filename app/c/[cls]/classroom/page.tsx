"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo, useShell } from "@/components/ClassContext";
import { api, makeRecognizer, md, speak, stopSpeaking, streamChat } from "@/lib/client";
import { VOICES } from "@/lib/voices";

type Turn = { role: "user" | "assistant"; content: string };

/** Teacher mode: full-screen board for the projector. The assistant explains and answers students out loud. */
export default function Classroom() {
  const { cls, label, profile, teacher } = useShell();
  const [voice, setVoice] = useState(teacher.voice);
  const [lesson, setLesson] = useState<string>("");
  const [board, setBoard] = useState("");
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<"idle" | "thinking" | "speaking" | "listening">("idle");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const history = useRef<Turn[]>([]);

  useEffect(() => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    api<{ entries: { date: string; title: string }[] }>(`/api/plan?cls=${cls}&from=${today}&to=${today}`).then((r) => setLesson(r.entries[0]?.title || ""));
    return () => stopSpeaking();
  }, [cls]);

  async function ask(message: string, shown?: string) {
    if (state === "thinking") return;
    stopSpeaking();
    setState("thinking");
    setQuestion(shown ?? "");
    let out = "";
    setBoard("");
    await streamChat({ cls, message, mode: "teacher", history: history.current }, (e) => {
      if (e.t === "text") { out += e.d; setBoard(out); }
      if (e.t === "error") { out += "\n" + e.d; setBoard(out); }
    });
    history.current = [...history.current, { role: "user" as const, content: message }, { role: "assistant" as const, content: out }].slice(-8);
    if (autoSpeak && out.trim()) {
      setState("speaking");
      speak(out, { voice, onEnd: () => setState("idle") });
    } else setState("idle");
  }

  function listen() {
    const r = makeRecognizer();
    if (!r) return alert("المتصفح لا يدعم التعرف على الصوت. جرّب Chrome أو Edge.");
    stopSpeaking();
    setState("listening");
    let t = "";
    r.onresult = (e) => { t = Array.from(e.results).map((x) => x[0].transcript).join(" "); setQuestion(t); };
    r.onend = () => { if (t.trim()) ask(`سؤال من طالب: ${t}`, t); else setState("idle"); };
    r.onerror = () => setState("idle");
    r.start();
  }

  const topic = lesson || "درس اليوم";
  const [typed, setTyped] = useState("");

  return (
    <div className="classroom">
      <div className="row wrap">
        <Logo p={profile} size={52} />
        <div className="grow">
          <div className="muted" style={{ fontWeight: 700 }}>وضع الحصة · الفصل {label} {profile.name}</div>
          <h1 style={{ fontSize: 30 }}>{lesson || "لم يُحدد درس اليوم في الخطة"}</h1>
        </div>
        <select className="select" style={{ width: 190 }} value={voice} onChange={(e) => { setVoice(e.target.value); api("/api/me", { method: "PATCH", json: { voice: e.target.value } }); }}>
          {VOICES.map((v) => <option key={v.id} value={v.id}>🔊 {v.label}</option>)}
        </select>
        <label className="row" style={{ gap: 6, fontSize: 14 }}><input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} /> نطق تلقائي</label>
        <Link href={`/c/${cls}`} className="btn">خروج ✕</Link>
      </div>

      <div className="glass board">
        {question && <div className="chip cyan" style={{ fontSize: 18, padding: "8px 16px", marginBottom: 16 }}>🙋 {question}</div>}
        {board ? <div className="md" dangerouslySetInnerHTML={{ __html: md(board) }} /> : (
          <div className="empty" style={{ fontSize: 22 }}>
            <div className="big">🎓</div>
            اضغط «اشرح الدرس» ليبدأ المساعد، أو اضغط على الميكروفون ليسأل الطالب بصوته.
          </div>
        )}
      </div>

      <div className="row wrap" style={{ justifyContent: "center", gap: 16 }}>
        <button className="btn" onClick={() => ask(`اشرح للطلاب درس "${topic}" خطوة بخطوة كأنك المعلم في الفصل، وابدأ بسؤال يشد انتباههم.`)}>📖 اشرح الدرس</button>
        <button className="btn" onClick={() => ask(`أعطِ مثالاً واقعياً جديداً يوضح "${topic}".`)}>💡 مثال</button>
        <button className="btn" onClick={() => ask(`اطرح على الطلاب سؤالاً واحداً للتحقق من فهمهم لـ "${topic}"، ولا تذكر الإجابة.`)}>❓ اسأل الطلاب</button>
        <button className="btn" onClick={() => ask(`لخّص "${topic}" في ثلاث نقاط سهلة الحفظ.`)}>📌 لخّص</button>
        <button
          className={"orb " + (state === "speaking" ? "speaking" : state === "thinking" ? "thinking" : "")}
          style={{ border: 0, cursor: "pointer", color: "white", fontSize: 34 }}
          onClick={() => (state === "speaking" ? (stopSpeaking(), setState("idle")) : listen())}
          title={state === "speaking" ? "إيقاف الصوت" : "اسأل بصوتك"}
        >
          {state === "listening" ? "👂" : state === "speaking" ? "⏹" : state === "thinking" ? "…" : "🎙️"}
        </button>
        <form className="composer" style={{ minWidth: "min(420px, 90vw)" }} onSubmit={(e) => { e.preventDefault(); if (typed.trim()) { ask(`سؤال من طالب: ${typed}`, typed); setTyped(""); } }}>
          <div className="composer-in">
            <textarea rows={1} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="اكتب سؤال الطالب…" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }} />
            <button className="send">↑</button>
          </div>
        </form>
        {board && <button className="btn ghost" onClick={() => { setState("speaking"); speak(board, { voice, onEnd: () => setState("idle") }); }}>🔁 أعد النطق</button>}
      </div>
    </div>
  );
}
