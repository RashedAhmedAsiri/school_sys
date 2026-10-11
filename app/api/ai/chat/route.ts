import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { bad, classParam } from "@/lib/api";
import { formatContext, retrieve } from "@/lib/rag";
import {
  aiConfigured, baseConfig, BLOCKED, CLASSROOM_TOOLS, gemini, NOT_CONFIGURED, onAnyModel, runTool, systemPrompt, teacherContext, TEACHER_TOOLS,
  type Content, type Part,
} from "@/lib/ai";

export const maxDuration = 120;

// Streams newline-delimited JSON events: {t:"text",d}, {t:"tool",name}, {t:"changed"}, {t:"error",d}, {t:"done"}
export async function POST(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const classId = classParam(body.cls);
  const message = String(body.message || "").trim().slice(0, 8000);
  const mode: "assistant" | "teacher" = body.mode === "teacher" ? "teacher" : "assistant";
  if (!classId || !message) return bad("رسالة فارغة");

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: object) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        if (!aiConfigured()) {
          send({ t: "text", d: NOT_CONFIGURED });
          send({ t: "done" });
          controller.close();
          return;
        }
        const ctx = await teacherContext(teacher.id, classId);
        const history = mode === "assistant"
          ? (await db.chatMessage.findMany({
              where: { teacherId: teacher.id, classId },
              orderBy: { createdAt: "desc" },
              take: 12,
            })).reverse()
          : [];
        const prior = Array.isArray(body.history) ? body.history.slice(-8) : [];

        // Chunk RAG: attach only the most relevant pieces of the book to this question.
        const chunks = await retrieve(teacher.id, classId, message + " " + (ctx.today?.title || ""), 6);
        const userParts: Part[] = [];
        if (chunks.length) userParts.push({ text: `<مقاطع_من_المنهج>\n${formatContext(chunks)}\n</مقاطع_من_المنهج>` });
        userParts.push({ text: message });

        const turns: { role: "user" | "model"; text: string }[] = [
          ...history.map((m) => ({ role: m.role === "assistant" ? ("model" as const) : ("user" as const), text: m.content })),
          ...prior
            .filter((m: { role?: string; content?: string }) => (m.role === "user" || m.role === "assistant") && m.content)
            .map((m: { role: string; content: string }) => ({
              role: m.role === "assistant" ? ("model" as const) : ("user" as const),
              text: String(m.content).slice(0, 4000),
            })),
        ];
        // Gemini wants turns that alternate and start with the user, so merge repeats and drop a leading answer.
        const contents: Content[] = [];
        for (const t of [...turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] as Part[] })), { role: "user" as const, parts: userParts }]) {
          const last = contents[contents.length - 1];
          if (last && last.role === t.role) last.parts!.push(...t.parts);
          else contents.push(t);
        }
        while (contents.length && contents[0].role !== "user") contents.shift();

        const tools = mode === "teacher" ? CLASSROOM_TOOLS : TEACHER_TOOLS;
        let full = "";
        let used: string | undefined;
        for (let step = 0; step < 6; step++) {
          const { model, value: s } = await onAnyModel((m) => {
            // Thought signatures only make sense to the model that wrote them; drop them when another model takes over.
            if (used && m !== used) for (const c of contents) for (const p of c.parts ?? []) delete p.thoughtSignature;
            return gemini().models.generateContentStream({
              model: m,
              contents,
              config: { ...baseConfig(m, "low"), systemInstruction: systemPrompt(ctx, classId, mode), tools: [{ functionDeclarations: tools }] },
            });
          }, used);
          used = model;
          // Keep every part exactly as sent: function calls carry thought signatures the next round needs.
          const parts: Part[] = [];
          let finish = "";
          let blocked = false;
          let said = "";
          for await (const chunk of s) {
            if (chunk.promptFeedback?.blockReason) blocked = true;
            const c = chunk.candidates?.[0];
            if (c?.finishReason) finish = c.finishReason;
            for (const p of c?.content?.parts ?? []) {
              parts.push(p);
              if (p.text && !p.thought) {
                said += p.text;
                full += p.text;
                send({ t: "text", d: p.text });
              }
            }
          }
          if ((blocked || BLOCKED.has(finish)) && !said) {
            send({ t: "text", d: "عذراً، لا أستطيع المساعدة في هذا الطلب." });
            break;
          }
          const calls = parts.filter((p) => p.functionCall?.name);
          if (!calls.length) break;
          contents.push({ role: "model", parts });
          const results: Part[] = [];
          for (const { functionCall: call } of calls) {
            const name = call!.name!;
            send({ t: "tool", name });
            try {
              const r = await runTool(name, call!.args || {}, teacher.id, classId);
              if (r.changed) send({ t: "changed" });
              results.push({ functionResponse: { id: call!.id, name, response: { output: r.result } } });
            } catch (e) {
              results.push({ functionResponse: { id: call!.id, name, response: { error: (e as Error).message } } });
            }
          }
          contents.push({ role: "user", parts: results });
          if (full && !full.endsWith("\n")) {
            full += "\n";
            send({ t: "text", d: "\n" });
          }
        }
        if (mode === "assistant" && full.trim()) {
          await db.chatMessage.createMany({
            data: [
              { teacherId: teacher.id, classId, role: "user", content: message },
              { teacherId: teacher.id, classId, role: "assistant", content: full.trim() },
            ],
          });
        }
        send({ t: "done" });
      } catch (e) {
        console.error(e);
        send({ t: "error", d: "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي: " + (e as Error).message });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function GET(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const classId = classParam(new URL(req.url).searchParams.get("cls"));
  if (!classId) return bad("فصل غير صحيح");
  const msgs = await db.chatMessage.findMany({ where: { teacherId: teacher.id, classId }, orderBy: { createdAt: "desc" }, take: 40 });
  return Response.json(msgs.reverse().map((m) => ({ id: m.id, role: m.role, content: m.content })));
}

export async function DELETE(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const classId = classParam(new URL(req.url).searchParams.get("cls"));
  if (!classId) return bad("فصل غير صحيح");
  await db.chatMessage.deleteMany({ where: { teacherId: teacher.id, classId } });
  return Response.json({ ok: true });
}
