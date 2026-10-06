import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaMessageParam,
  BetaToolUnion,
  BetaContentBlockParam,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { db } from "./db";
import { classLabel, todayISO } from "./classes";
import { formatContext, retrieve } from "./rag";
import { normalizeArabic } from "./rag";

export const MODEL = process.env.AI_MODEL || "claude-opus-5-5";

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let _client: Anthropic | null = null;
export function client() {
  if (!_client) _client = new Anthropic();
  return _client;
}

/** Common request options: adaptive thinking (always on for this model) and server-side refusal fallback. */
export function baseParams(effort: "low" | "medium" | "high") {
  return {
    model: MODEL,
    output_config: { effort },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default" as const,
  };
}

export async function teacherContext(teacherId: string, classId: string) {
  const [teacher, profile, today, studentCount, sources] = await Promise.all([
    db.teacher.findUnique({ where: { id: teacherId } }),
    db.classProfile.findUnique({ where: { teacherId_classId: { teacherId, classId } } }),
    db.planEntry.findUnique({ where: { teacherId_classId_date: { teacherId, classId, date: todayISO() } } }),
    db.student.count({ where: { classId } }),
    db.source.findMany({ where: { teacherId, OR: [{ classId }, { classId: null }] }, select: { title: true } }),
  ]);
  return { teacher, profile, today, studentCount, sources };
}

export function systemPrompt(ctx: Awaited<ReturnType<typeof teacherContext>>, classId: string, mode: "assistant" | "teacher") {
  const lines = [
    `أنت "المساعد الذكي" في منصة ثانوية الموهوبين التقنية.`,
    `المعلم: ${ctx.teacher?.name}. الفصل الحالي: ${classLabel(classId)} (${ctx.profile?.name ?? ""}). عدد الطلاب: ${ctx.studentCount}.`,
    `تاريخ اليوم: ${todayISO()}. درس اليوم في الخطة: ${ctx.today?.title || "غير محدد"}.`,
    ctx.sources.length
      ? `مصادر المنهج المرفوعة: ${ctx.sources.map((s) => s.title).join("، ")}. استخدم أداة search_book عند الحاجة لمعلومات من الكتاب، واعتمد على المقاطع المرفقة.`
      : `لم يرفع المعلم كتاباً بعد؛ أجب من معرفتك العامة واذكر ذلك عند الحاجة.`,
  ];
  if (ctx.teacher?.aiNotes?.trim()) {
    lines.push(`ملاحظات المعلم وتعليماته لك (التزم بها):\n${ctx.teacher.aiNotes.trim()}`);
  }
  if (mode === "teacher") {
    lines.push(
      `أنت الآن في "وضع الحصة": تتحدث مباشرة إلى الطلاب داخل الفصل، وكلامك سيُقرأ بصوت عالٍ.`,
      `اشرح بالعربية الفصحى المبسطة، بجمل قصيرة وواضحة، مع أمثلة من حياة الطالب. لا تستخدم جداول أو رموز Markdown أو قوائم طويلة أو رموزاً تعبيرية. اجعل الإجابة أقل من 180 كلمة ما لم يُطلب شرح كامل.`
    );
  } else {
    lines.push(
      `تساعد المعلم في: التحضير، الدرجات، الغياب، الخطة، شرح الدروس وصنع الأسئلة.`,
      `عندك أدوات لتعديل جدول الطلاب والدرجات والغياب والخطة؛ نفّذ ما يطلبه المعلم مباشرة ثم أخبره بما تم باختصار.`,
      `أجب بالعربية، بإيجاز ووضوح. استخدم Markdown بسيطاً عند الحاجة. لا تستخدم الرموز التعبيرية (الإيموجي) إطلاقاً.`
    );
  }
  return lines.join("\n");
}

// ---------- Tools the assistant can use on the teacher's data ----------

export const TEACHER_TOOLS: BetaToolUnion[] = [
  {
    name: "search_book",
    description: "ابحث في كتب ومصادر المنهج المرفوعة لهذا الفصل وأعد أفضل المقاطع.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "list_students",
    description: "اعرض طلاب الفصل الحالي مع أعمدة الدرجات ودرجاتهم ومجموع غيابهم.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "add_students",
    description: "أضف طالباً أو أكثر للفصل الحالي (يظهر لكل المعلمين).",
    input_schema: { type: "object", properties: { names: { type: "array", items: { type: "string" } } }, required: ["names"] },
  },
  {
    name: "delete_student",
    description: "احذف طالباً من الفصل الحالي (يُحذف لكل المعلمين). استخدمها فقط عندما يطلب المعلم الحذف صراحة.",
    input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
  },
  {
    name: "add_grade_column",
    description: "أضف عمود درجات جديد لهذا الفصل، مثل: المشاركة من 20.",
    input_schema: {
      type: "object",
      properties: { name: { type: "string" }, max_score: { type: "number" } },
      required: ["name", "max_score"],
    },
  },
  {
    name: "set_grades",
    description: "ضع درجات في عمود. استخدم all_score لإعطاء نفس الدرجة لكل الطلاب، أو grades لطلاب محددين.",
    input_schema: {
      type: "object",
      properties: {
        column: { type: "string", description: "اسم العمود" },
        all_score: { type: "number" },
        grades: {
          type: "array",
          items: { type: "object", properties: { student: { type: "string" }, score: { type: "number" } }, required: ["student", "score"] },
        },
      },
      required: ["column"],
    },
  },
  {
    name: "mark_attendance",
    description: "سجّل الحضور لتاريخ (افتراضياً اليوم). الطلاب غير المذكورين في absent/late يُسجلون حاضرين.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
        absent: { type: "array", items: { type: "string" } },
        late: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "set_plan",
    description: "حدد اسم الدرس لتاريخ معين في خطة هذا الفصل.",
    input_schema: {
      type: "object",
      properties: { date: { type: "string", description: "YYYY-MM-DD" }, title: { type: "string" }, notes: { type: "string" } },
      required: ["date", "title"],
    },
  },
  {
    name: "save_note",
    description: "احفظ ملاحظة دائمة في ملاحظات المعلم للمساعد (قسم الخطة).",
    input_schema: { type: "object", properties: { note: { type: "string" } }, required: ["note"] },
  },
];

export const CLASSROOM_TOOLS = TEACHER_TOOLS.filter((t) => "name" in t && t.name === "search_book");

function findStudent<T extends { name: string }>(list: T[], name: string): T | undefined {
  const n = normalizeArabic(name).replace(/\s+/g, " ").trim();
  return (
    list.find((s) => normalizeArabic(s.name).trim() === n) ||
    list.find((s) => normalizeArabic(s.name).includes(n)) ||
    list.find((s) => n.includes(normalizeArabic(s.name).split(" ")[0]) && normalizeArabic(s.name).split(" ")[0].length > 2)
  );
}

export async function runTool(
  name: string,
  input: Record<string, unknown>,
  teacherId: string,
  classId: string
): Promise<{ result: string; changed: boolean }> {
  const students = () => db.student.findMany({ where: { classId }, orderBy: { name: "asc" } });
  switch (name) {
    case "search_book": {
      const r = await retrieve(teacherId, classId, String(input.query || ""), 5);
      return { result: r.length ? formatContext(r) : "لا توجد مقاطع مطابقة في المصادر المرفوعة.", changed: false };
    }
    case "list_students": {
      const [list, cols, abs] = await Promise.all([
        students(),
        db.gradeColumn.findMany({ where: { teacherId, classId }, include: { grades: true }, orderBy: { position: "asc" } }),
        db.attendance.groupBy({ by: ["studentId"], where: { teacherId, classId, status: "absent" }, _count: true }),
      ]);
      const absMap = new Map(abs.map((a) => [a.studentId, a._count]));
      const header = ["الطالب", ...cols.map((c) => `${c.name} (/${c.maxScore})`), "الغياب"].join(" | ");
      const rows = list.map((s) =>
        [s.name, ...cols.map((c) => c.grades.find((g) => g.studentId === s.id)?.score ?? "-"), absMap.get(s.id) ?? 0].join(" | ")
      );
      return { result: list.length ? [header, ...rows].join("\n") : "لا يوجد طلاب في هذا الفصل بعد.", changed: false };
    }
    case "add_students": {
      const names = (Array.isArray(input.names) ? input.names : []).map(String).map((s) => s.trim()).filter(Boolean);
      if (!names.length) return { result: "لم تُحدد أسماء.", changed: false };
      await db.student.createMany({ data: names.map((n) => ({ classId, name: n.slice(0, 120) })) });
      return { result: `تمت إضافة ${names.length} طالب: ${names.join("، ")}`, changed: true };
    }
    case "delete_student": {
      const s = findStudent(await students(), String(input.name || ""));
      if (!s) return { result: "لم أجد طالباً بهذا الاسم.", changed: false };
      await db.student.delete({ where: { id: s.id } });
      return { result: `تم حذف ${s.name}.`, changed: true };
    }
    case "add_grade_column": {
      const max = Number(input.max_score);
      if (!input.name || !(max > 0)) return { result: "اسم العمود والدرجة العظمى مطلوبان.", changed: false };
      const pos = await db.gradeColumn.count({ where: { teacherId, classId } });
      await db.gradeColumn.create({ data: { teacherId, classId, name: String(input.name).slice(0, 60), maxScore: max, position: pos } });
      return { result: `تمت إضافة عمود "${input.name}" من ${max}.`, changed: true };
    }
    case "set_grades": {
      const cols = await db.gradeColumn.findMany({ where: { teacherId, classId } });
      const colName = normalizeArabic(String(input.column || ""));
      const col = cols.find((c) => normalizeArabic(c.name) === colName) || cols.find((c) => normalizeArabic(c.name).includes(colName));
      if (!col) return { result: `لا يوجد عمود باسم "${input.column}". الأعمدة: ${cols.map((c) => c.name).join("، ") || "لا شيء"}`, changed: false };
      const list = await students();
      const clamp = (v: number) => Math.max(0, Math.min(col.maxScore, v));
      const updates: { id: string; score: number }[] = [];
      const missing: string[] = [];
      if (typeof input.all_score === "number") list.forEach((s) => updates.push({ id: s.id, score: clamp(input.all_score as number) }));
      for (const g of (Array.isArray(input.grades) ? input.grades : []) as { student: string; score: number }[]) {
        const s = findStudent(list, String(g.student));
        if (s) updates.push({ id: s.id, score: clamp(Number(g.score)) });
        else missing.push(String(g.student));
      }
      for (const u of updates) {
        await db.grade.upsert({
          where: { columnId_studentId: { columnId: col.id, studentId: u.id } },
          update: { score: u.score },
          create: { columnId: col.id, studentId: u.id, score: u.score },
        });
      }
      return {
        result: `تم وضع ${updates.length} درجة في "${col.name}".${missing.length ? " لم أجد: " + missing.join("، ") : ""}`,
        changed: updates.length > 0,
      };
    }
    case "mark_attendance": {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(String(input.date || "")) ? String(input.date) : todayISO();
      const list = await students();
      const absent = new Set(((input.absent as string[]) || []).map((n) => findStudent(list, n)?.id).filter(Boolean));
      const late = new Set(((input.late as string[]) || []).map((n) => findStudent(list, n)?.id).filter(Boolean));
      for (const s of list) {
        const status = absent.has(s.id) ? "absent" : late.has(s.id) ? "late" : "present";
        await db.attendance.upsert({
          where: { teacherId_studentId_date: { teacherId, studentId: s.id, date } },
          update: { status },
          create: { teacherId, studentId: s.id, classId, date, status },
        });
      }
      return { result: `تم تسجيل حضور ${date}: غائب ${absent.size}، متأخر ${late.size}، حاضر ${list.length - absent.size - late.size}.`, changed: true };
    }
    case "set_plan": {
      const date = String(input.date || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { result: "التاريخ يجب أن يكون YYYY-MM-DD", changed: false };
      await db.planEntry.upsert({
        where: { teacherId_classId_date: { teacherId, classId, date } },
        update: { title: String(input.title), notes: String(input.notes || "") },
        create: { teacherId, classId, date, title: String(input.title), notes: String(input.notes || "") },
      });
      return { result: `تم وضع درس "${input.title}" بتاريخ ${date}.`, changed: true };
    }
    case "save_note": {
      const t = await db.teacher.findUnique({ where: { id: teacherId } });
      await db.teacher.update({ where: { id: teacherId }, data: { aiNotes: ((t?.aiNotes || "") + "\n- " + String(input.note)).trim() } });
      return { result: "تم حفظ الملاحظة.", changed: true };
    }
  }
  return { result: "أداة غير معروفة", changed: false };
}

export type { BetaMessageParam, BetaContentBlockParam };

/** One structured-output call: returns parsed JSON that matches `schema`. */
export async function generateJSON<T>(opts: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
}): Promise<T> {
  const s = client().beta.messages.stream({
    ...baseParams(opts.effort || "medium"),
    max_tokens: 32000,
    system: opts.system,
    output_config: { effort: opts.effort || "medium", format: { type: "json_schema", schema: opts.schema } },
    messages: [{ role: "user", content: opts.prompt }],
  });
  const msg = await s.finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("رفض النموذج هذا الطلب");
  if (msg.stop_reason === "max_tokens") throw new Error("الطلب أطول من المسموح، قلل عدد العناصر");
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return JSON.parse(text) as T;
}
