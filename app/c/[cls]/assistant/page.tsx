"use client";
import { useRouter } from "next/navigation";
import Chat from "@/components/Chat";
import { useShell } from "@/components/ClassContext";

export default function Assistant() {
  const { label, profile } = useShell();
  const router = useRouter();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>المساعد الذكي <span className="grad-text">✦</span></h1>
          <p>يعرف كتابك وطلاب {label} {profile.name} وخطتك وملاحظاتك. يمكنه أيضاً تعديل الجدول والغياب والخطة.</p>
        </div>
      </div>
      <Chat
        variant="full"
        onChanged={() => router.refresh()}
        suggestions={[
          "لخّص لي الدرس القادم في 5 نقاط",
          "اكتب 5 أسئلة تفكير ناقد عن درس اليوم",
          "سجّل الجميع حاضرين اليوم",
          "من الطلاب الذين درجاتهم أقل من النصف؟",
          "اقترح طريقة ممتعة لشرح درس اليوم",
          "اكتب رسالة لولي أمر طالب كثير الغياب",
        ]}
      />
    </>
  );
}
