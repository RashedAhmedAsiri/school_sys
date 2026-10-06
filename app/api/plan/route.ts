import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { bad, classParam } from "@/lib/api";

// GET ?cls&from&to
export async function GET(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const sp = new URL(req.url).searchParams;
  const classId = classParam(sp.get("cls"));
  if (!classId) return bad("فصل غير صحيح");
  const entries = await db.planEntry.findMany({
    where: { teacherId: teacher.id, classId, date: { gte: sp.get("from") || "0000", lte: sp.get("to") || "9999" } },
    orderBy: { date: "asc" },
  });
  return Response.json({ entries, notes: teacher.aiNotes });
}

// PUT {cls, date, title, notes?, done?} — empty title deletes the entry
export async function PUT(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  const classId = classParam(b.cls);
  const date = String(b.date || "");
  if (!classId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad("بيانات غير صحيحة");
  const key = { teacherId_classId_date: { teacherId: teacher.id, classId, date } };
  if (!String(b.title || "").trim()) {
    await db.planEntry.delete({ where: key }).catch(() => null);
    return Response.json({ ok: true });
  }
  const data = { title: String(b.title).trim().slice(0, 200), notes: String(b.notes || "").slice(0, 2000), done: Boolean(b.done) };
  const e = await db.planEntry.upsert({ where: key, update: data, create: { teacherId: teacher.id, classId, date, ...data } });
  return Response.json(e);
}
