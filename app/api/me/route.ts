import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";
import { bad } from "@/lib/api";
import { isPattern } from "@/lib/wallpapers";

const IMAGE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE = 2_500_000; // characters of base64, about 1.8 MB

export async function PATCH(req: Request) {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const data: { onboarded?: boolean; voice?: string; wallpaper?: string } = {};
  if (typeof body.onboarded === "boolean") data.onboarded = body.onboarded;
  if (typeof body.voice === "string" && /^[a-z]{2}-[A-Z]{2}-\w+Neural$/.test(body.voice)) data.voice = body.voice;
  if (typeof body.wallpaper === "string") {
    if (!isPattern(body.wallpaper)) return bad("خلفية غير معروفة");
    data.wallpaper = body.wallpaper;
  }
  if (typeof body.wallpaperImage === "string") {
    if (body.wallpaperImage.length > MAX_IMAGE || !IMAGE.test(body.wallpaperImage)) return bad("الصورة كبيرة جداً أو بصيغة غير مدعومة");
    await db.wallpaperImage.upsert({
      where: { teacherId: teacher.id },
      update: { data: body.wallpaperImage },
      create: { teacherId: teacher.id, data: body.wallpaperImage },
    });
    data.wallpaper = `image:${Date.now()}`;
  }
  await db.teacher.update({ where: { id: teacher.id }, data });
  return Response.json({ ok: true, wallpaper: data.wallpaper ?? teacher.wallpaper });
}
