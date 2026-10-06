import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { bad } from "@/lib/api";

export async function POST(req: Request) {
  const { name, password } = await req.json().catch(() => ({}));
  const n = String(name || "").trim().replace(/\s+/g, " ");
  const t = await db.teacher.findUnique({ where: { name: n } });
  if (!t || !(await bcrypt.compare(String(password || ""), t.passwordHash))) return bad("الاسم أو كلمة المرور غير صحيحة", 401);
  await createSession(t.id);
  return Response.json({ ok: true, next: t.onboarded ? "/c/1-1" : "/welcome" });
}
