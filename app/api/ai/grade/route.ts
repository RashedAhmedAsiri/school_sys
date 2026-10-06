import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { bad } from "@/lib/api";
import { aiConfigured, generateJSON } from "@/lib/ai";

export const maxDuration = 180;

// POST {columnId, testId?, rubric?, answers: [{studentId, answer}]}
// The AI marks each answer and writes the score into the chosen grade column.
export async function POST(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  if (!aiConfigured()) return bad("لم يتم إعداد مفتاح Claude API بعد (ANTHROPIC_API_KEY).", 503);
  const b = await req.json().catch(() => ({}));
  const col = await db.gradeColumn.findFirst({ where: { id: String(b.columnId), teacherId: teacher.id } });
  if (!col) return bad("اختر عمود الدرجات");
  const answers = (Array.isArray(b.answers) ? b.answers : [])
    .map((a: { studentId: string; answer: string }) => ({ studentId: String(a.studentId), answer: String(a.answer || "").slice(0, 6000) }))
    .filter((a: { answer: string }) => a.answer.trim());
  if (!answers.length) return bad("أدخل إجابة طالب واحد على الأقل");
  const students = await db.student.findMany({ where: { id: { in: answers.map((a: { studentId: string }) => a.studentId) }, classId: col.classId } });
  const names = new Map(students.map((s) => [s.id, s.name]));
  const test = b.testId ? await db.test.findFirst({ where: { id: String(b.testId), teacherId: teacher.id } }) : null;

  const result = await generateJSON<{ results: { studentId: string; score: number; feedback: string }[] }>({
    system:
      "أنت مصحح عادل ودقيق. صحح إجابة كل طالب مقابل نموذج الإجابة، وامنح درجة جزئية عند الفهم الجزئي، واكتب ملاحظة قصيرة مشجعة توضح الخطأ إن وجد.",
    prompt:
      `الدرجة العظمى: ${col.maxScore} (عمود "${col.name}").\n` +
      (test ? `الاختبار ونموذج الإجابة:\n${JSON.stringify(test.data)}\n` : "") +
      (b.rubric ? `معايير التصحيح من المعلم:\n${String(b.rubric).slice(0, 4000)}\n` : "") +
      `إجابات الطلاب:\n` +
      answers
        .filter((a: { studentId: string }) => names.has(a.studentId))
        .map((a: { studentId: string; answer: string }) => `<طالب id="${a.studentId}" name="${names.get(a.studentId)}">\n${a.answer}\n</طالب>`)
        .join("\n"),
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["results"],
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["studentId", "score", "feedback"],
            properties: { studentId: { type: "string" }, score: { type: "number" }, feedback: { type: "string" } },
          },
        },
      },
    },
    effort: "medium",
  });

  const out = [];
  for (const r of result.results) {
    if (!names.has(r.studentId)) continue;
    const score = Math.max(0, Math.min(col.maxScore, Math.round(r.score * 4) / 4));
    await db.grade.upsert({
      where: { columnId_studentId: { columnId: col.id, studentId: r.studentId } },
      update: { score },
      create: { columnId: col.id, studentId: r.studentId, score },
    });
    out.push({ studentId: r.studentId, name: names.get(r.studentId), score, feedback: r.feedback });
  }
  return Response.json({ column: col.name, maxScore: col.maxScore, results: out });
}
