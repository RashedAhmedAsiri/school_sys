// Browser-side helpers shared by the client components.

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { "Content-Type": "application/json", ...(init?.headers || {}) } : init?.headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "حدث خطأ");
  return data as T;
}

export type ChatEvent = { t: "text" | "tool" | "changed" | "error" | "done"; d?: string; name?: string };

export async function streamChat(body: object, onEvent: (e: ChatEvent) => void) {
  const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok || !res.body) {
    const d = await res.json().catch(() => ({}));
    onEvent({ t: "error", d: (d as { error?: string }).error || "تعذر الاتصال" });
    return;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) {
        try { onEvent(JSON.parse(line)); } catch { /* ignore partial */ }
      }
    }
  }
}

// ---------- Speech: Edge TTS from the server, browser voice as a fallback ----------
let current: HTMLAudioElement | null = null;
export function stopSpeaking() {
  if (current) { current.pause(); current = null; }
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

export async function speak(text: string, opts: { voice?: string; onStart?: () => void; onEnd?: () => void } = {}) {
  stopSpeaking();
  try {
    const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voice: opts.voice }) });
    if (!res.ok) throw new Error("tts");
    const url = URL.createObjectURL(await res.blob());
    const a = new Audio(url);
    current = a;
    a.onplay = () => opts.onStart?.();
    a.onended = () => { URL.revokeObjectURL(url); current = null; opts.onEnd?.(); };
    a.onerror = () => opts.onEnd?.();
    await a.play();
  } catch {
    if (typeof speechSynthesis === "undefined") { opts.onEnd?.(); return; }
    const u = new SpeechSynthesisUtterance(text.replace(/[#*_`>|]/g, " "));
    u.lang = /[؀-ۿ]/.test(text) ? "ar-SA" : "en-US";
    const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith(u.lang.slice(0, 2)));
    if (v) u.voice = v;
    u.onstart = () => opts.onStart?.();
    u.onend = () => opts.onEnd?.();
    u.onerror = () => opts.onEnd?.();
    speechSynthesis.speak(u);
  }
}

// ---------- Speech recognition (students can ask out loud) ----------
type Rec = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: () => void };
export function makeRecognizer(lang = "ar-SA"): Rec | null {
  const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const C = W.SpeechRecognition || W.webkitSpeechRecognition;
  if (!C) return null;
  const r = new C();
  r.lang = lang;
  r.interimResults = true;
  r.continuous = false;
  return r;
}

// ---------- Text extraction from uploaded books (runs in the browser) ----------
export async function extractFileText(file: File): Promise<{ text: string; kind: string }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const { getDocumentProxy, extractText } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { text } = await extractText(pdf, { mergePages: false });
    const pages = Array.isArray(text) ? text : [text];
    return { text: pages.map((t, i) => `صفحة ${i + 1}\n${t}`).join("\n\n"), kind: "pdf" };
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth/mammoth.browser");
    const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { text: r.value, kind: "docx" };
  }
  if (name.endsWith(".pptx")) {
    // pull visible text out of slide XML
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
    const out: string[] = [];
    for (const [i, f] of slides.entries()) {
      const xml = await zip.files[f].async("string");
      const words = Array.from(xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)).map((m) => m[1]);
      out.push(`شريحة ${i + 1}\n${words.join(" ")}`);
    }
    return { text: out.join("\n\n"), kind: "pptx" };
  }
  return { text: await file.text(), kind: name.split(".").pop() || "txt" };
}

export function fmtDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("ar-SA-u-ca-gregory", { weekday: "long", day: "numeric", month: "long" });
}

export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Minimal, safe Markdown → HTML for assistant replies. */
export function md(src: string) {
  const esc = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = esc.split("\n");
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  let table: string[][] | null = null;
  const inline = (s: string) =>
    s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/(^|[^*])\*([^*]+)\*/g, "$1<i>$2</i>");
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const closeTable = () => {
    if (table) {
      const rows = table.filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c.trim())));
      out.push("<table>" + rows.map((r, i) => "<tr>" + r.map((c) => (i === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`)).join("") + "</tr>").join("") + "</table>");
      table = null;
    }
  };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (/^\s*\|.*\|\s*$/.test(l)) { closeList(); (table ||= []).push(l.trim().slice(1, -1).split("|")); continue; }
    closeTable();
    let m;
    if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol"; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    closeList();
    if ((m = l.match(/^#{1,6}\s+(.*)/))) { out.push(`<h4>${inline(m[1])}</h4>`); continue; }
    if (l.trim()) out.push(`<p>${inline(l)}</p>`);
  }
  closeList(); closeTable();
  return out.join("");
}
