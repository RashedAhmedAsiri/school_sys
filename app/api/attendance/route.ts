import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { bad, classParam } from "@/lib/api";
import { todayISO } from "@/lib/classes";

const STATUSES = ["present", "absent", "late", "excused"];

export async function GET(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const sp = new URL(req.url).searchParams;
  const classId = classParam(sp.get("cls"));
  const date = sp.get("date") || todayISO();
  if (!classId) return bad("فصل غير صحيح");
  const [students, rows] = await Promise.all([
    db.student.findMany({ where: { classId }, orderBy: { name: "asc" } }),
    db.attendance.findMany({ where: { teacherId: teacher.id, classId, date } }),
  ]);
  const map = Object.fromEntries(rows.map((r) => [r.studentId, r.status]));
  return Response.json({ date, today: todayISO(), students: students.map((s) => ({ id: s.id, name: s.name, status: map[s.id] || null })) });
}

// PUT {cls, date, studentId?, status, all?: boolean}
export async function PUT(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const classId = classParam(body.cls);
  const date = String(body.date || todayISO());
  if (!classId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !STATUSES.includes(body.status)) return bad("بيانات غير صحيحة");
  const ids: string[] = body.all
    ? (await db.student.findMany({ where: { classId }, select: { id: true } })).map((s) => s.id)
    : [String(body.studentId)];
  for (const studentId of ids) {
    await db.attendance.upsert({
      where: { teacherId_studentId_date: { teacherId: teacher.id, studentId, date } },
      update: { status: body.status },
      create: { teacherId: teacher.id, studentId, classId, date, status: body.status },
    });
  }
  return Response.json({ ok: true });
}
