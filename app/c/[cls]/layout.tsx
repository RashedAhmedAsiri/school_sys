import { notFound, redirect } from "next/navigation";
import { getTeacher } from "@/lib/auth";
import { ensureProfiles, isClassId, sortProfiles } from "@/lib/classes";
import Shell from "@/components/Shell";

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ cls: string }> }) {
  const { cls } = await params;
  if (!isClassId(cls)) notFound();
  const t = await getTeacher();
  if (!t) redirect("/");
  const profiles = sortProfiles(await ensureProfiles(t.id)).map((p) => ({ classId: p.classId, name: p.name, logo: p.logo, color: p.color }));
  return (
    <Shell cls={cls} profiles={profiles} teacher={{ name: t.name, voice: t.voice, wallpaper: t.wallpaper }}>
      {children}
    </Shell>
  );
}
