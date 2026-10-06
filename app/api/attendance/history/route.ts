import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { bad, classParam } from "@/lib/api";

// Every recorded day for this teacher and class since attendance started.
export async function GET(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const classId = classParam(new URL(req.url).searchParams.get("cls"));
  if (!classId) return bad("فصل غير صحيح");
  const [students, rows] = await Promise.all([
    db.student.findMany({ where: { classId }, orderBy: { name: "asc" } }),
    db.attendance.findMany({ where: { teacherId: teacher.id, classId }, orderBy: { date: "asc" } }),
  ]);
  const dates = Array.from(new Set(rows.map((r) => r.date))).sort();
  const cells: Record<string, Record<string, string>> = {};
  for (const r of rows) (cells[r.studentId] ||= {})[r.date] = r.status;
  return Response.json({
    dates,
    students: students.map((s) => {
      const c = cells[s.id] || {};
      const v = Object.values(c);
      return {
        id: s.id,
        name: s.name,
        cells: c,
        absent: v.filter((x) => x === "absent").length,
        late: v.filter((x) => x === "late").length,
        present: v.filter((x) => x === "present").length,
      };
    }),
  });
}
