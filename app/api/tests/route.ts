import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { bad, classParam } from "@/lib/api";

export async function GET(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const sp = new URL(req.url).searchParams;
  const id = sp.get("id");
  if (id) {
    const t = await db.test.findFirst({ where: { id, teacherId: teacher.id } });
    return t ? Response.json(t) : bad("غير موجود", 404);
  }
  const classId = classParam(sp.get("cls"));
  if (!classId) return bad("فصل غير صحيح");
  const tests = await db.test.findMany({ where: { teacherId: teacher.id, classId }, orderBy: { createdAt: "desc" } });
  return Response.json(tests.map((t) => ({ id: t.id, title: t.title, createdAt: t.createdAt, count: (t.data as { questions?: unknown[] }).questions?.length ?? 0 })));
}

export async function DELETE(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  await db.test.deleteMany({ where: { id: new URL(req.url).searchParams.get("id") || "", teacherId: teacher.id } });
  return Response.json({ ok: true });
}
