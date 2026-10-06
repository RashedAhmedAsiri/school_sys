import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { bad } from "@/lib/api";

// PUT {columnId, studentId, score|null}
export async function PUT(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const { columnId, studentId, score } = await req.json().catch(() => ({}));
  const col = await db.gradeColumn.findFirst({ where: { id: String(columnId), teacherId: teacher.id } });
  if (!col) return bad("عمود غير موجود", 404);
  const v = score === null || score === "" || score === undefined ? null : Number(score);
  if (v !== null && (isNaN(v) || v < 0 || v > col.maxScore)) return bad(`الدرجة يجب أن تكون بين 0 و ${col.maxScore}`);
  await db.grade.upsert({
    where: { columnId_studentId: { columnId: col.id, studentId: String(studentId) } },
    update: { score: v },
    create: { columnId: col.id, studentId: String(studentId), score: v },
  });
  return Response.json({ ok: true });
}
