"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Hello from "@/components/Hello";
import Chat from "@/components/Chat";
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
      <section className="glass hero spot rise">
        <div>
          <div style={{ marginInlineStart: -10, marginBottom: -10, maxWidth: 360 }}><Hello small /></div>
          <h1>
            {greeting()}، أ. {teacher.name}
          </h1>
          <p className="muted" style={{ margin: "8px 0 0", fontSize: 16 }}>
            {fmtDate(today)} · الفصل {label} <span className="grad-text" style={{ fontWeight: 700 }}>{profile.name}</span>
          </p>
        </div>
        <div className="stack">
          <div className="lesson-today">
            <Logo p={profile} size={56} />
            <div className="grow">
              <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>درس اليوم</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-display)" }}>{lesson?.title || "لم يُحدد بعد"}</div>
            </div>
            <Link className="btn sm" href={`/c/${cls}/plan`}>{lesson ? "الخطة" : "حدده"}</Link>
          </div>
          <div className="row wrap">
            <Link className="btn primary sm" href={`/c/${cls}/curriculum?make=pptx`}>🎞️ عرض درس اليوم</Link>
            <Link className="btn sm" href={`/c/${cls}/curriculum?make=test`}>📝 اختبار سريع</Link>
            <Link className="btn sm" href={`/c/${cls}/classroom`}>🎙️ وضع الحصة</Link>
          </div>
        </div>
      </section>

      <section className="stats">
        <Link href={`/c/${cls}/students`} className="glass stat spot">
          <div className="k">الطلاب</div>
          <div className="v">{stats.students}</div>
          <div className="muted" style={{ fontSize: 12 }}>{stats.columns} عمود درجات</div>
        </Link>
        <Link href={`/c/${cls}/attendance`} className="glass stat spot">
          <div className="k">حضور اليوم</div>
          <div className="v">{stats.attToday ? `${presentPct}%` : "—"}</div>
          <div className="bar"><i style={{ width: `${presentPct}%` }} /></div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{stats.attToday ? `${stats.absentToday} غائب` : "لم يُسجل بعد"}</div>
        </Link>
        <Link href={`/c/${cls}/curriculum`} className="glass stat spot">
          <div className="k">مصادر المنهج</div>
          <div className="v">{stats.sources}</div>
          <div className="muted" style={{ fontSize: 12 }}>{stats.sources ? "مقسمة بـ Chunk RAG" : "ارفع الكتاب"}</div>
        </Link>
        <Link href={`/c/${cls}/plan`} className="glass stat spot">
          <div className="k">القادم في الخطة</div>
          {upcoming.length ? upcoming.map((u) => (
            <div key={u.date} style={{ fontSize: 13, marginTop: 6 }}><b>{u.title}</b> <span className="muted">· {fmtDate(u.date)}</span></div>
          )) : <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>لا دروس قادمة</div>}
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
