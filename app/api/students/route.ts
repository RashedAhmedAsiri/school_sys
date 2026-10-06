import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { bad, classParam } from "@/lib/api";

// GET ?cls=1-1 → students (shared) + this teacher's columns and grades
export async function GET(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const classId = classParam(new URL(req.url).searchParams.get("cls"));
  if (!classId) return bad("فصل غير صحيح");
  const [students, columns] = await Promise.all([
    db.student.findMany({ where: { classId }, orderBy: [{ name: "asc" }] }),
    db.gradeColumn.findMany({
      where: { teacherId: teacher.id, classId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: { grades: { select: { studentId: true, score: true } } },
    }),
  ]);
  return Response.json({
    students: students.map((s) => ({ id: s.id, name: s.name, createdAt: s.createdAt })),
    columns: columns.map((c) => ({
      id: c.id,
      name: c.name,
      maxScore: c.maxScore,
      grades: Object.fromEntries(c.grades.map((g) => [g.studentId, g.score])),
    })),
  });
}

// POST {cls, names: string[]} — adds for every teacher
export async function POST(req: Request) {
  const { error } = await requireTeacher();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const classId = classParam(body.cls);
  if (!classId) return bad("فصل غير صحيح");
  const names: string[] = (Array.isArray(body.names) ? body.names : [body.name])
    .map((n: unknown) => String(n ?? "").trim())
    .filter(Boolean)
    .slice(0, 200);
  if (!names.length) return bad("اكتب اسم الطالب");
  await db.student.createMany({ data: names.map((name) => ({ classId, name: name.slice(0, 120) })) });
  return Response.json({ ok: true, added: names.length });
}

// PATCH {id, name}
export async function PATCH(req: Request) {
  const { error } = await requireTeacher();
  if (error) return error;
  const { id, name } = await req.json().catch(() => ({}));
  if (!id || !String(name || "").trim()) return bad("بيانات ناقصة");
  await db.student.update({ where: { id: String(id) }, data: { name: String(name).trim().slice(0, 120) } });
  return Response.json({ ok: true });
}

// DELETE ?id= — removes for every teacher
export async function DELETE(req: Request) {
  const { error } = await requireTeacher();
  if (error) return error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return bad("بيانات ناقصة");
  await db.student.delete({ where: { id } }).catch(() => null);
  return Response.json({ ok: true });
}
