import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { ensureProfiles } from "@/lib/classes";
import { bad } from "@/lib/api";

export async function POST(req: Request) {
  const { name, sitePassword, password } = await req.json().catch(() => ({}));
  const n = String(name || "").trim().replace(/\s+/g, " ");
  if (n.length < 2) return bad("اكتب اسمك");
  if (String(sitePassword || "") !== (process.env.SITE_PASSWORD || "123323")) return bad("كلمة مرور الموقع غير صحيحة", 403);
  if (String(password || "").length < 4) return bad("كلمة المرور الشخصية يجب أن تكون 4 أحرف على الأقل");
  if (await db.teacher.findUnique({ where: { name: n } })) return bad("يوجد حساب بهذا الاسم، سجّل الدخول بدلاً من ذلك", 409);
  const t = await db.teacher.create({ data: { name: n, passwordHash: await bcrypt.hash(String(password), 10) } });
  await ensureProfiles(t.id);
  await createSession(t.id);
  return Response.json({ ok: true, next: "/welcome" });
}
