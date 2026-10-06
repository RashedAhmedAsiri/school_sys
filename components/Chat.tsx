"use client";
import { useEffect, useRef, useState } from "react";
import { useShell } from "./ClassContext";
import Icon from "./Icon";
import { api, makeRecognizer, md, speak, stopSpeaking, streamChat } from "@/lib/client";

type Msg = { role: "user" | "assistant"; content: string; tools?: string[] };

const TOOL_LABEL: Record<string, string> = {
  search_book: "بحث في الكتاب",
  list_students: "قراءة جدول الطلاب",
  add_students: "إضافة طلاب",
  delete_student: "حذف طالب",
  add_grade_column: "إضافة عمود",
  set_grades: "رصد درجات",
  mark_attendance: "تسجيل الحضور",
  set_plan: "تعديل الخطة",
  save_note: "حفظ ملاحظة",
};

export default function Chat({
  variant = "full", suggestions = [], onChanged,
}: { variant?: "home" | "full"; suggestions?: string[]; onChanged?: () => void }) {
  const { cls, teacher } = useShell();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState<number | null>(null);
  const [narrow, setNarrow] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (variant === "full") api<Msg[]>(`/api/ai/chat?cls=${cls}`).then(setMsgs).catch(() => {});
  }, [cls, variant]);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 600px)");
    const on = () => setNarrow(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs]);

  async function send(t = text) {
    const message = t.trim();
    if (!message || busy) return;
    setText("");
    setBusy(true);
    setMsgs((m) => [...m, { role: "user", content: message }, { role: "assistant", content: "", tools: [] }]);
    const patchLast = (f: (m: Msg) => Msg) => setMsgs((all) => all.map((m, i) => (i === all.length - 1 ? f(m) : m)));
    await streamChat({ cls, message }, (e) => {
      if (e.t === "text") patchLast((m) => ({ ...m, content: m.content + e.d }));
      if (e.t === "tool") patchLast((m) => ({ ...m, tools: [...(m.tools || []), e.name!] }));
      if (e.t === "changed") onChanged?.();
      if (e.t === "error") patchLast((m) => ({ ...m, content: m.content + "\n" + e.d }));
    });
    setBusy(false);
  }

  function mic() {
    if (listening) return;
    const r = makeRecognizer();
    if (!r) return alert("المتصفح لا يدعم التعرف على الصوت. جرّب Chrome أو Edge.");
    setListening(true);
    let finalText = "";
    r.onresult = (e) => {
      finalText = Array.from(e.results).map((x) => x[0].transcript).join(" ");
      setText(finalText);
    };
    r.onend = () => { setListening(false); if (finalText.trim()) send(finalText); };
    r.onerror = () => setListening(false);
    r.start();
  }

  function talk(i: number, content: string) {
    if (speaking === i) { stopSpeaking(); setSpeaking(null); return; }
    setSpeaking(i);
    speak(content, { voice: teacher.voice, onEnd: () => setSpeaking(null) });
  }

  async function clear() {
    if (!confirm("مسح المحادثة لهذا الفصل؟")) return;
    await api(`/api/ai/chat?cls=${cls}`, { method: "DELETE" });
    setMsgs([]);
  }

  const showSuggest = msgs.length === 0 && suggestions.length > 0;

  return (
    <div className="chat-wrap">
      {msgs.length > 0 && (
        <div className={variant === "home" ? "chat-log" : ""}>
          <div className="msgs">
            {msgs.map((m, i) => (
              <div key={i} className={"msg " + m.role}>
                {m.tools && m.tools.length > 0 && (
                  <div className="tools">{m.tools.map((t, k) => <span key={k} className="tag green"><Icon name="check" size={13} />{TOOL_LABEL[t] || t}</span>)}</div>
                )}
                {m.role === "assistant" ? (
                  m.content ? <div className="md" dangerouslySetInnerHTML={{ __html: md(m.content) }} /> : <div className="typing"><span /><span /><span /></div>
                ) : (
                  m.content
                )}
                {m.role === "assistant" && m.content && !(busy && i === msgs.length - 1) && (
                  <div className="msg-actions">
                    <button className="btn sm ghost" onClick={() => talk(i, m.content)}><Icon name={speaking === i ? "stop" : "speaker"} size={15} />{speaking === i ? "إيقاف" : "استمع"}</button>
                    <button className="btn sm ghost" onClick={() => navigator.clipboard.writeText(m.content)}><Icon name="copy" size={15} />نسخ</button>
                  </div>
                )}
              </div>
            ))}
            <div ref={end} />
          </div>
        </div>
      )}
      {showSuggest && (
        <div className="suggest">
          {suggestions.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}
        </div>
      )}
      <div className={variant === "home" ? "home-chat" : ""} style={variant === "full" ? { position: "sticky", bottom: 12, background: "var(--white)" } : undefined}>
        <div className="composer">
            <textarea
              ref={ta}
              rows={1}
              value={text}
              placeholder={narrow ? "اسأل المساعد الذكي…" : "اسأل المساعد الذكي… أو اطلب: أضف عمود المشاركة من 20"}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 180) + "px";
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            {variant === "full" && msgs.length > 0 && <button className="tool-btn" title="مسح المحادثة" onClick={clear}><Icon name="clear" size={19} /></button>}
            <button className={"tool-btn" + (listening ? " live" : "")} onClick={mic} title="تحدث"><Icon name="mic" size={19} /></button>
            <button className="send" disabled={busy || !text.trim()} onClick={() => send()} title="إرسال">{busy ? <span className="spinner" /> : <Icon name="send" size={19} />}</button>
        </div>
      </div>
    </div>
  );
}
