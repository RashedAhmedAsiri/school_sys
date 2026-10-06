"use client";
import { useRouter } from "next/navigation";
import Chat from "@/components/Chat";
import PageHead from "@/components/PageHead";
import { ChatArt } from "@/components/Art";
import { useShell } from "@/components/ClassContext";

export default function Assistant() {
  const { profile } = useShell();
  const router = useRouter();
  return (
    <>
      <PageHead idx="05" title="المساعد الذكي" sub={`يعرف كتابك وطلاب ${profile.name} وخطتك وملاحظاتك، ويستطيع تعديل الجدول والغياب والخطة.`}>
        <ChatArt size={84} />
      </PageHead>
      <Chat
        variant="full"
        onChanged={() => router.refresh()}
        suggestions={[
          "ايش درس اليوم؟",
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
