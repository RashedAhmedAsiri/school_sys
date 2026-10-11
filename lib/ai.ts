import { GoogleGenAI, ThinkingLevel, type Content, type FunctionDeclaration, type GenerateContentConfig, type Part } from "@google/genai";
import { db } from "./db";
import { classLabel, todayISO } from "./classes";
import { formatContext, retrieve } from "./rag";
import { normalizeArabic } from "./rag";

// Models tried in order. The free tier allows only a few requests a minute per model,
// so when one is busy the next one answers. AI_MODEL can set the list (comma separated).
export const MODELS = (process.env.AI_MODEL || "gemini-3.6-flash,gemini-2.5-flash,gemini-2.5-flash-lite,gemini-3.5-flash-lite")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const apiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

export function aiConfigured() {
  return Boolean(apiKey());
}

export const NOT_CONFIGURED = "لم يتم إعداد مفتاح Gemini API بعد. أضف GEMINI_API_KEY في إعدادات الخادم ثم أعد المحاولة.";
const BUSY = "وصل Gemini إلى حد الطلبات المجاني لهذه الدقيقة. انتظر دقيقة ثم أعد المحاولة، أو فعّل الفوترة في Google AI Studio لرفع الحد.";

let _client: GoogleGenAI | null = null;
export function gemini() {
  // Server errors get one more try; a busy model (429) moves on to the next model instead.
  if (!_client) _client = new GoogleGenAI({ apiKey: apiKey(), httpOptions: { retryOptions: { attempts: 2, httpStatusCodes: [500, 502, 504] } } });
  return _client;
}

export type Effort = "low" | "medium" | "high";
const LEVELS = { low: ThinkingLevel.LOW, medium: ThinkingLevel.MEDIUM, high: ThinkingLevel.HIGH };

/** Shared request config. Gemini 3 models take a thinking level; older models choose their own. */
export function baseConfig(model: string, effort: Effort): GenerateContentConfig {
  return /^gemini-3/.test(model) ? { thinkingConfig: { thinkingLevel: LEVELS[effort] } } : {};
}

/** Runs `call` on the first model that isn't busy, starting with `prefer` when given. */
export async function onAnyModel<T>(call: (model: string) => Promise<T>, prefer?: string): Promise<{ model: string; value: T }> {
  const order = prefer ? [prefer, ...MODELS.filter((m) => m !== prefer)] : MODELS;
  for (const model of order) {
    try {
      return { model, value: await call(model) };
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status !== 429 && status !== 503) throw e;
      console.warn(`${model} busy (${status}), trying the next model`);
    }
  }
  throw new Error(BUSY);
}

/** Finish reasons that mean the answer was withheld rather than finished. */
export const BLOCKED = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION", "IMAGE_SAFETY"]);

export type { Content, Part };

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

export const TEACHER_TOOLS: FunctionDeclaration[] = [
  {
    name: "search_book",
    description: "ابحث في كتب ومصادر المنهج المرفوعة لهذا الفصل وأعد أفضل المقاطع.",
    parametersJsonSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "list_students",
    description: "اعرض طلاب الفصل الحالي مع أعمدة الدرجات ودرجاتهم ومجموع غيابهم.",
  },
  {
    name: "add_students",
    description: "أضف طالباً أو أكثر للفصل الحالي (يظهر لكل المعلمين).",
    parametersJsonSchema: { type: "object", properties: { names: { type: "array", items: { type: "string" } } }, required: ["names"] },
  },
  {
    name: "delete_student",
    description: "احذف طالباً من الفصل الحالي (يُحذف لكل المعلمين). استخدمها فقط عندما يطلب المعلم الحذف صراحة.",
    parametersJsonSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
  },
  {
    name: "add_grade_column",
    description: "أضف عمود درجات جديد لهذا الفصل، مثل: المشاركة من 20.",
    parametersJsonSchema: {
      type: "object",
      properties: { name: { type: "string" }, max_score: { type: "number" } },
      required: ["name", "max_score"],
    },
  },
  {
    name: "set_grades",
    description: "ضع درجات في عمود. استخدم all_score لإعطاء نفس الدرجة لكل الطلاب، أو grades لطلاب محددين.",
    parametersJsonSchema: {
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
    parametersJsonSchema: {
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
    parametersJsonSchema: {
      type: "object",
      properties: { date: { type: "string", description: "YYYY-MM-DD" }, title: { type: "string" }, notes: { type: "string" } },
      required: ["date", "title"],
    },
  },
  {
    name: "save_note",
    description: "احفظ ملاحظة دائمة في ملاحظات المعلم للمساعد (قسم الخطة).",
    parametersJsonSchema: { type: "object", properties: { note: { type: "string" } }, required: ["note"] },
  },
];

export const CLASSROOM_TOOLS = TEACHER_TOOLS.filter((t) => t.name === "search_book");

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

/** One structured-output call: returns parsed JSON that matches `schema`. */
export async function generateJSON<T>(opts: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  effort?: Effort;
}): Promise<T> {
  const { value: r } = await onAnyModel((model) => gemini().models.generateContent({
    model,
    contents: opts.prompt,
    config: {
      ...baseConfig(model, opts.effort || "medium"),
      systemInstruction: opts.system,
      responseMimeType: "application/json",
      responseJsonSchema: opts.schema,
    },
  }));
  const finish = r.candidates?.[0]?.finishReason;
  if (r.promptFeedback?.blockReason || (finish && BLOCKED.has(finish))) throw new Error("رفض النموذج هذا الطلب");
  if (finish === "MAX_TOKENS") throw new Error("الطلب أطول من المسموح، قلل عدد العناصر");
  const text = r.text;
  if (!text) throw new Error("لم يرجع النموذج إجابة، حاول مرة أخرى");
  return JSON.parse(text) as T;
}
