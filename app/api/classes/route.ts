import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { ensureProfiles, sortProfiles } from "@/lib/classes";
import { bad, classParam } from "@/lib/api";

export async function GET() {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  return Response.json(sortProfiles(await ensureProfiles(teacher.id)));
}

export async function PATCH(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const classId = classParam(body.classId);
  if (!classId) return bad("فصل غير صحيح");
  const data: { name?: string; logo?: string; color?: string } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 40);
  if (typeof body.logo === "string" && body.logo.length < 300_000) data.logo = body.logo;
  if (typeof body.color === "string" && /^#[0-9a-f]{6}$/i.test(body.color)) data.color = body.color;
  const p = await db.classProfile.update({ where: { teacherId_classId: { teacherId: teacher.id, classId } }, data });
  return Response.json(p);
}
