import { db } from "@/lib/db";
import { getTeacher } from "@/lib/auth";
import { todayISO } from "@/lib/classes";
import Home from "./Home";

export default async function Page({ params }: { params: Promise<{ cls: string }> }) {
  const { cls } = await params;
  const t = (await getTeacher())!;
  const today = todayISO();
  const [students, absent, attToday, lesson, sources, columns, upcoming] = await Promise.all([
    db.student.count({ where: { classId: cls } }),
    db.attendance.findMany({
      where: { teacherId: t.id, classId: cls, date: today, status: "absent" },
      select: { student: { select: { name: true } } },
    }),
    db.attendance.count({ where: { teacherId: t.id, classId: cls, date: today } }),
    db.planEntry.findUnique({ where: { teacherId_classId_date: { teacherId: t.id, classId: cls, date: today } } }),
    db.source.count({ where: { teacherId: t.id, OR: [{ classId: cls }, { classId: null }] } }),
    db.gradeColumn.count({ where: { teacherId: t.id, classId: cls } }),
    db.planEntry.findMany({ where: { teacherId: t.id, classId: cls, date: { gt: today } }, orderBy: { date: "asc" }, take: 2 }),
  ]);
  return (
    <Home
      today={today}
      stats={{ students, absent: absent.map((a) => a.student.name), attToday, sources, columns }}
      lesson={lesson ? { title: lesson.title, notes: lesson.notes } : null}
      upcoming={upcoming.map((u) => ({ date: u.date, title: u.title }))}
    />
  );
}
