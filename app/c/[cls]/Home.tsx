"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Hello from "@/components/Hello";
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
  stats: { students: number; absentToday: number; attToday: number; sources: number; columns: number };
  lesson: { title: string; notes: string } | null;
  upcoming: { date: string; title: string }[];
}) {
  const { cls, label, profile, teacher } = useShell();
  const router = useRouter();
  const presentPct = stats.attToday ? Math.round(((stats.attToday - stats.absentToday) / stats.attToday) * 100) : 0;

  return (
    <>
      <section className="hero rise">
        <div className="hero-main">
          <Hello />
          <h1>{greeting()}، أ. {teacher.name}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {fmtDate(today)} · الفصل <span className="mono">{label}</span> <b className="accent">{profile.name}</b>
          </p>
        </div>
        <div className="hero-side">
          <div className="row">
            <Logo p={profile} size={44} />
            <div className="today-lesson grow">
              <div className="label">درس اليوم</div>
              <b>{lesson?.title || "لم يُحدد بعد"}</b>
            </div>
            <Link className="btn sm" href={`/c/${cls}/plan`}>{lesson ? "الخطة" : "حدده"}</Link>
          </div>
          <div className="row wrap" style={{ gap: 8 }}>
            <Link className="btn primary sm" href={`/c/${cls}/curriculum?make=pptx`}><Icon name="slides" size={16} />عرض درس اليوم</Link>
            <Link className="btn sm" href={`/c/${cls}/curriculum?make=test`}><Icon name="test" size={16} />اختبار سريع</Link>
            <Link className="btn sm green" href={`/c/${cls}/classroom`}><Icon name="board" size={16} />وضع الحصة</Link>
          </div>
        </div>
      </section>

      <section className="stats">
        <Link href={`/c/${cls}/students`} className="stat">
          <span className="label">الطلاب</span>
          <span className="v">{stats.students}</span>
          <span className="muted" style={{ fontSize: 12 }}>{stats.columns} عمود درجات</span>
        </Link>
        <Link href={`/c/${cls}/attendance`} className="stat">
          <span className="label">حضور اليوم</span>
          <span className="v">{stats.attToday ? `${presentPct}%` : "—"}</span>
          <div className="bar"><i style={{ width: `${presentPct}%` }} /></div>
          <span className="muted" style={{ fontSize: 12 }}>{stats.attToday ? `${stats.absentToday} غائب` : "لم يُسجل بعد"}</span>
        </Link>
        <Link href={`/c/${cls}/curriculum`} className="stat">
          <span className="label">مصادر المنهج</span>
          <span className="v">{stats.sources}</span>
          <span className="muted" style={{ fontSize: 12 }}>{stats.sources ? "مقسمة إلى مقاطع" : "ارفع الكتاب"}</span>
        </Link>
        <Link href={`/c/${cls}/plan`} className="stat">
          <span className="label">القادم في الخطة</span>
          {upcoming.length ? upcoming.map((u) => (
            <span key={u.date} style={{ fontSize: 13 }}><b>{u.title}</b> <span className="muted">· {fmtDate(u.date)}</span></span>
          )) : <span className="muted" style={{ fontSize: 13, marginTop: 6 }}>لا دروس قادمة</span>}
        </Link>
      </section>

      <div style={{ flex: 1 }} />
      <Chat
        variant="home"
        onChanged={() => router.refresh()}
        suggestions={[
          lesson ? `اشرح لي باختصار درس "${lesson.title}" وأفكار لتقديمه` : "ما الدرس المناسب لهذا الأسبوع؟",
          "أضف عمود المشاركة من 20",
          "من أكثر الطلاب غياباً؟",
          "اقترح نشاطاً جماعياً مدته 10 دقائق",
        ]}
      />
    </>
  );
}
