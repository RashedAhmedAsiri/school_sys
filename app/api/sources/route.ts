import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { addSource } from "@/lib/rag";
import { bad, classParam } from "@/lib/api";

export async function GET(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const classId = classParam(new URL(req.url).searchParams.get("cls"));
  const sources = await db.source.findMany({
    where: { teacherId: teacher.id, ...(classId ? { OR: [{ classId }, { classId: null }] } : {}) },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });
  return Response.json(
    sources.map((s) => ({ id: s.id, title: s.title, kind: s.kind, classId: s.classId, charCount: s.charCount, chunks: s._count.chunks, createdAt: s.createdAt }))
  );
}

// POST {title, kind, text, cls|null}. The browser extracts text from PDF/Word files,
// so only plain text is uploaded (small requests, works on serverless hosts).
export async function POST(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  const text = String(b.text || "");
  if (text.trim().length < 20) return bad("لم أستطع قراءة نص من هذا الملف. جرّب ملف PDF نصي أو Word أو TXT.");
  const r = await addSource({
    teacherId: teacher.id,
    classId: classParam(b.cls),
    title: String(b.title || "مصدر"),
    kind: String(b.kind || "txt"),
    text,
  });
  return Response.json({ id: r.source.id, chunks: r.chunks });
}

export async function DELETE(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const id = new URL(req.url).searchParams.get("id") || "";
  await db.source.deleteMany({ where: { id, teacherId: teacher.id } });
  return Response.json({ ok: true });
}
