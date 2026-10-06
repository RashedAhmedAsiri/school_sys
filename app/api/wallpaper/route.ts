import { db } from "@/lib/db";
import { requireTeacher } from "@/lib/auth";

// The signed-in teacher's own wallpaper photo. The page asks for it with ?v=<upload time>, so it can be cached for good.
export async function GET() {
  const { teacher, error } = await requireTeacher();
  if (error) return error;
  const img = await db.wallpaperImage.findUnique({ where: { teacherId: teacher.id } });
  const m = img?.data.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) return new Response(null, { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
