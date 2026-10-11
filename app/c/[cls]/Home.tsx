"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Chat from "@/components/Chat";
import Icon from "@/components/Icon";
import { Logo, useShell } from "@/components/ClassContext";
import { fmtDate } from "@/lib/client";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "صباح الخير" : h < 17 ? "طاب يومك" : "مساء الخير";
}

export default function Home({
  today, stats, lesson, upcoming,
}: {
  today: string;
  stats: { students: number; absent: string[]; attToday: number; sources: number; columns: number };
  lesson: { title: string; notes: string } | null;
  upcoming: { date: string; title: string }[];
}) {
  const { cls, label, profile, teacher } = useShell();
  const router = useRouter();
  const present = stats.attToday - stats.absent.length;

  return (
    <>
      <section className="today panel rise">
        <div className="today-top">
          <span>{greeting()}، أ. {teacher.name}</span>
          <span>{fmtDate(today)}</span>
        </div>
        <div className="today-body">
          <Logo p={profile} size={52} />
          <div className="grow">
            <div className="label">درس اليوم · الفصل <span className="mono">{label}</span> {profile.name}</div>
            {lesson ? (
              <h1 className="lesson-title">{lesson.title}</h1>
            ) : (
              <h1 className="lesson-title muted">لم تحدد درس اليوم بعد</h1>
            )}
            {lesson?.notes && <p className="lesson-notes">{lesson.notes}</p>}
          </div>
        </div>
        <div className="row wrap today-actions">
          <Link className="btn primary" href={`/c/${cls}/curriculum?make=pptx`}><Icon name="slides" size={16} />عرض درس اليوم</Link>
          <Link className="btn" href={`/c/${cls}/curriculum?make=test`}><Icon name="test" size={16} />اختبار سريع</Link>
          <Link className="btn" href={`/c/${cls}/classroom`}><Icon name="board" size={16} />وضع الحصة</Link>
          <Link className="btn ghost" href={`/c/${cls}/plan`}><Icon name="plan" size={16} />{lesson ? "الخطة" : "حدد الدرس"}</Link>
        </div>
      </section>

      <section className="facts">
        <Link className="fact" href={`/c/${cls}/attendance`}>
          <span className="k">الحضور اليوم</span>
          <span className="v">
            {stats.attToday ? (
              <>حضر <b className="mono">{present}</b> من <span className="mono">{stats.attToday}</span>
                {stats.absent.length ? <> · غائب: {stats.absent.join("، ")}</> : " · لا غياب"}</>
            ) : <span className="muted">لم تسجل الحضور بعد</span>}
          </span>
        </Link>
        <Link className="fact" href={`/c/${cls}/students`}>
          <span className="k">الطلاب</span>
          <span className="v">
            <b className="mono">{stats.students}</b> طالب
            <span className="muted"> · {stats.columns ? <><span className="mono">{stats.columns}</span> {stats.columns === 1 ? "عمود درجات" : "أعمدة درجات"}</> : "لا أعمدة درجات بعد"}</span>
          </span>
        </Link>
        <Link className="fact" href={`/c/${cls}/curriculum`}>
          <span className="k">الكتاب</span>
          <span className="v">{stats.sources ? <><b className="mono">{stats.sources}</b> {stats.sources === 1 ? "مصدر مرفوع" : "مصادر مرفوعة"}</> : <span className="muted">لم ترفع كتاباً بعد. ارفعه ليجيب المساعد منه</span>}</span>
        </Link>
        <Link className="fact" href={`/c/${cls}/plan`}>
          <span className="k">بعد اليوم</span>
          <span className="v">
            {upcoming.length ? upcoming.map((u, i) => (
              <span key={u.date}>{i > 0 && " · "}{u.title} <span className="muted">({fmtDate(u.date)})</span></span>
            )) : <span className="muted">لا دروس قادمة في الخطة</span>}
          </span>
        </Link>
      </section>

      <div style={{ flex: 1 }} />
      <Chat
        variant="home"
        onChanged={() => router.refresh()}
        suggestions={[
          "ايش درس اليوم؟",
          lesson ? `أفكار لتقديم درس "${lesson.title}"` : "ما الدرس المناسب لهذا الأسبوع؟",
          "من أكثر الطلاب غياباً؟",
        ]}
      />
    </>
  );
}
