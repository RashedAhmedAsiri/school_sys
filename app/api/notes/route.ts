import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";

export async function PUT(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const { notes } = await req.json().catch(() => ({}));
  await db.teacher.update({ where: { id: teacher.id }, data: { aiNotes: String(notes || "").slice(0, 20000) } });
  return Response.json({ ok: true });
}
