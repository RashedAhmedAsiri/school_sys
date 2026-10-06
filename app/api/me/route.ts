import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";

export async function PATCH(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const data: { onboarded?: boolean; voice?: string } = {};
  if (typeof body.onboarded === "boolean") data.onboarded = body.onboarded;
  if (typeof body.voice === "string" && /^[a-z]{2}-[A-Z]{2}-\w+Neural$/.test(body.voice)) data.voice = body.voice;
  await db.teacher.update({ where: { id: teacher.id }, data });
  return Response.json({ ok: true });
}
