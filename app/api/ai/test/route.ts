import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { bad, classParam } from "@/lib/api";
import { aiConfigured, generateJSON, NOT_CONFIGURED, teacherContext } from "@/lib/ai";
import { formatContext, retrieve } from "@/lib/rag";
import { classLabel } from "@/lib/classes";

export const maxDuration = 180;

export type TestData = {
  title: string;
  instructions: string;
  questions: { type: "mcq" | "tf" | "short" | "essay"; question: string; options: string[]; answer: string; points: number }[];
};

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "instructions", "questions"],
  properties: {
    title: { type: "string" },
    instructions: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "question", "options", "answer", "points"],
        properties: {
          type: { type: "string", enum: ["mcq", "tf", "short", "essay"] },
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "string" },
          points: { type: "number" },
        },
      },
    },
  },
};

export async function POST(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  if (!aiConfigured()) return bad(NOT_CONFIGURED, 503);
  const b = await req.json().catch(() => ({}));
  const classId = classParam(b.cls);
  if (!classId) return bad("فصل غير صحيح");
  const ctx = await teacherContext(teacher.id, classId);
  const topic = String(b.topic || ctx.today?.title || "").trim();
  if (!topic) return bad("اكتب موضوع الاختبار");
  const counts = {
    mcq: Math.min(Number(b.mcq ?? 5), 30),
    tf: Math.min(Number(b.tf ?? 3), 30),
    short: Math.min(Number(b.short ?? 2), 20),
    essay: Math.min(Number(b.essay ?? 0), 10),
  };
  const total = Number(b.total) > 0 ? Number(b.total) : 20;
  const chunks = await retrieve(teacher.id, classId, topic, 10);
  const data = await generateJSON<TestData>({
    system:
      "أنت معلم خبير في بناء الاختبارات لطلاب الثانوية الموهوبين. أسئلتك واضحة، متدرجة الصعوبة، وتقيس الفهم لا الحفظ فقط. لأسئلة الاختيار من متعدد ضع 4 خيارات والإجابة نص الخيار الصحيح. لأسئلة صح وخطأ الخيارات [\"صح\",\"خطأ\"]. للأسئلة المقالية والقصيرة الخيارات فارغة والإجابة نموذج إجابة مختصر.",
    prompt:
      `أنشئ اختباراً عن "${topic}" للفصل ${classLabel(classId)}. المستوى: ${String(b.difficulty || "متوسط")}.\n` +
      `عدد الأسئلة: اختيار من متعدد ${counts.mcq}، صح وخطأ ${counts.tf}، إجابة قصيرة ${counts.short}، مقالي ${counts.essay}.\n` +
      `مجموع الدرجات يجب أن يساوي ${total} بالضبط.\n` +
      (chunks.length ? `اعتمد على مقاطع الكتاب التالية:\n${formatContext(chunks)}` : ""),
    schema,
    effort: "medium",
  });
  const test = await db.test.create({ data: { teacherId: teacher.id, classId, title: data.title || topic, data } });
  return Response.json({ id: test.id, ...data });
}
