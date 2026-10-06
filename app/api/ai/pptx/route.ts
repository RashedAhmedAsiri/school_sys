import { requireTeacher } from "@/lib/auth";
import { bad, classParam } from "@/lib/api";
import { aiConfigured, generateJSON, teacherContext } from "@/lib/ai";
import { formatContext, retrieve } from "@/lib/rag";
import { buildDeck, type Deck } from "@/lib/pptx";
import { classLabel, todayISO } from "@/lib/classes";

export const maxDuration = 180;

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "subtitle", "objectives", "slides"],
  properties: {
    title: { type: "string" },
    subtitle: { type: "string" },
    objectives: { type: "array", items: { type: "string" } },
    slides: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "bullets", "notes", "kind"],
        properties: {
          title: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
          notes: { type: "string" },
          kind: { type: "string", enum: ["content", "example", "activity", "quiz", "summary"] },
        },
      },
    },
  },
};

export async function POST(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  if (!aiConfigured()) return bad("لم يتم إعداد مفتاح Claude API بعد (ANTHROPIC_API_KEY).", 503);
  const b = await req.json().catch(() => ({}));
  const classId = classParam(b.cls);
  if (!classId) return bad("فصل غير صحيح");
  const ctx = await teacherContext(teacher.id, classId);
  const topic = String(b.topic || ctx.today?.title || "").trim();
  if (!topic) return bad("اكتب عنوان الدرس، أو أضف درس اليوم في الخطة");
  const n = Math.min(Math.max(Number(b.slides) || 8, 4), 16);
  const chunks = await retrieve(teacher.id, classId, topic, 10);

  const deck = await generateJSON<Deck>({
    system:
      "أنت مصمم دروس خبير لطلاب المرحلة الثانوية الموهوبين. تكتب عروضاً تقديمية بالعربية الفصحى، نقاطها قصيرة (أقل من 18 كلمة للنقطة) وواضحة، مع ملاحظات للمعلم تشرح ما يقوله في كل شريحة." +
      (teacher.aiNotes ? `\nتعليمات المعلم:\n${teacher.aiNotes}` : ""),
    prompt:
      `أنشئ عرضاً لدرس اليوم بعنوان: "${topic}" للفصل ${classLabel(classId)}.\n` +
      `عدد الشرائح (بدون الغلاف والأهداف والختام): ${n}. نوّع بين شرح ومثال ونشاط وسؤال سريع، واختم بشريحة خلاصة.\n` +
      (b.extra ? `طلب إضافي من المعلم: ${String(b.extra).slice(0, 1000)}\n` : "") +
      (chunks.length
        ? `اعتمد على هذه المقاطع من كتاب المنهج:\n${formatContext(chunks)}`
        : "لا يوجد كتاب مرفوع؛ اعتمد على المنهج المعتاد لهذا الموضوع."),
    schema,
    effort: "medium",
  });

  const buf = await buildDeck(deck, {
    school: "ثانوية الموهوبين التقنية",
    teacher: teacher.name,
    classLabel: classLabel(classId),
    className: ctx.profile?.name || "",
    date: todayISO(),
  });
  const filename = encodeURIComponent(`${deck.title || topic}.pptx`);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
