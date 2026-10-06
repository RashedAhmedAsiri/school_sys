import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { bad, classParam } from "@/lib/api";
import { formatContext, retrieve } from "@/lib/rag";
import {
  aiConfigured, baseParams, client, CLASSROOM_TOOLS, runTool, systemPrompt, teacherContext, TEACHER_TOOLS,
  type BetaMessageParam, type BetaContentBlockParam,
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
          send({ t: "text", d: "لم يتم إعداد مفتاح Claude API بعد. أضف ANTHROPIC_API_KEY في إعدادات الخادم ثم أعد المحاولة." });
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
        const userContent: BetaContentBlockParam[] = [];
        if (chunks.length) userContent.push({ type: "text", text: `<مقاطع_من_المنهج>\n${formatContext(chunks)}\n</مقاطع_من_المنهج>` });
        userContent.push({ type: "text", text: message });

        const messages: BetaMessageParam[] = [
          ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          ...prior
            .filter((m: { role?: string; content?: string }) => (m.role === "user" || m.role === "assistant") && m.content)
            .map((m: { role: "user" | "assistant"; content: string }) => ({ role: m.role, content: String(m.content).slice(0, 4000) })),
          { role: "user", content: userContent },
        ];
        // The API needs alternating roles starting with user.
        while (messages.length && messages[0].role !== "user") messages.shift();

        const tools = mode === "teacher" ? CLASSROOM_TOOLS : TEACHER_TOOLS;
        let full = "";
        for (let step = 0; step < 6; step++) {
          const s = client().beta.messages.stream({
            ...baseParams(mode === "teacher" ? "low" : "low"),
            max_tokens: 16000,
            system: systemPrompt(ctx, classId, mode),
            tools,
            messages,
          });
          s.on("text", (d) => {
            full += d;
            send({ t: "text", d });
          });
          const msg = await s.finalMessage();
          if (msg.stop_reason === "refusal") {
            send({ t: "text", d: "\n\nعذراً، لا أستطيع المساعدة في هذا الطلب." });
            break;
          }
          if (msg.stop_reason !== "tool_use") break;
          messages.push({ role: "assistant", content: msg.content as BetaContentBlockParam[] });
          const results: BetaContentBlockParam[] = [];
          for (const block of msg.content) {
            if (block.type !== "tool_use") continue;
            send({ t: "tool", name: block.name });
            try {
              const r = await runTool(block.name, (block.input || {}) as Record<string, unknown>, teacher.id, classId);
              if (r.changed) send({ t: "changed" });
              results.push({ type: "tool_result", tool_use_id: block.id, content: r.result });
            } catch (e) {
              results.push({ type: "tool_result", tool_use_id: block.id, content: "خطأ: " + (e as Error).message, is_error: true });
            }
          }
          messages.push({ role: "user", content: results });
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
