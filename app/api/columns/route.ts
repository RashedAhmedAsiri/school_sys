import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { bad, classParam } from "@/lib/api";

export async function POST(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const classId = classParam(body.cls);
  const max = Number(body.maxScore);
  if (!classId || !String(body.name || "").trim() || !(max > 0)) return bad("اسم العمود والدرجة العظمى مطلوبان");
  const position = await db.gradeColumn.count({ where: { teacherId: teacher.id, classId } });
  const c = await db.gradeColumn.create({
    data: { teacherId: teacher.id, classId, name: String(body.name).trim().slice(0, 60), maxScore: max, position },
  });
  return Response.json(c);
}

export async function PATCH(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const data: { name?: string; maxScore?: number } = {};
  if (String(body.name || "").trim()) data.name = String(body.name).trim().slice(0, 60);
  if (Number(body.maxScore) > 0) data.maxScore = Number(body.maxScore);
  await db.gradeColumn.updateMany({ where: { id: String(body.id), teacherId: teacher.id }, data });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const id = new URL(req.url).searchParams.get("id") || "";
  await db.gradeColumn.deleteMany({ where: { id, teacherId: teacher.id } });
  return Response.json({ ok: true });
}
