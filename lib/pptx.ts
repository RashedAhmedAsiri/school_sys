import PptxGenJS from "pptxgenjs";

export type Deck = {
  title: string;
  subtitle: string;
  objectives: string[];
  slides: { title: string; bullets: string[]; notes: string; kind: "content" | "example" | "activity" | "quiz" | "summary" }[];
};

const GREEN = "16A34A";
const PURPLE = "7C5CFF";
const INK = "1E1B4B";
const SOFT = "EAF7EE";

/** Builds an Arabic, right-to-left lesson deck in the school colours. */
export async function buildDeck(deck: Deck, meta: { school: string; teacher: string; classLabel: string; className: string; date: string }) {
  const p = new PptxGenJS();
  p.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  p.rtlMode = true;
  p.title = deck.title;
  p.company = meta.school;
  const font = "Tajawal";
  const ar = { rtlMode: true, lang: "ar-SA", fontFace: font, align: "right" as const };

  p.defineSlideMaster({
    title: "BODY",
    background: { color: "FFFFFF" },
    objects: [
      { rect: { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: GREEN } } },
      { rect: { x: 0, y: 0.12, w: 13.33, h: 0.05, fill: { color: PURPLE } } },
      {
        text: {
          text: `${meta.school} · ${meta.classLabel} ${meta.className}`,
          options: { x: 0.5, y: 7.0, w: 12.3, h: 0.35, fontSize: 11, color: "8B8BA7", ...ar },
        },
      },
    ],
    slideNumber: { x: 0.4, y: 7.0, w: 0.6, h: 0.35, fontSize: 11, color: PURPLE, fontFace: font },
  });

  const body = () => {
    const s = p.addSlide({ masterName: "BODY" });
    s.addShape("ellipse", { x: -1.2, y: 5.6, w: 3.2, h: 3.2, fill: { color: SOFT } });
    s.addShape("ellipse", { x: 11.6, y: -1.3, w: 2.6, h: 2.6, fill: { color: "F1ECFF" } });
    return s;
  };

  // Cover
  const cover = p.addSlide();
  cover.background = { color: "FFFFFF" };
  cover.addShape("ellipse", { x: 7.8, y: -2.2, w: 7.5, h: 7.5, fill: { color: SOFT } });
  cover.addShape("ellipse", { x: -2.5, y: 3.6, w: 6.5, h: 6.5, fill: { color: "F1ECFF" } });
  cover.addShape("roundRect", { x: 9.6, y: 0.7, w: 3.1, h: 0.5, fill: { color: PURPLE }, rectRadius: 0.25 });
  cover.addText(`درس ${meta.date}`, { x: 9.6, y: 0.7, w: 3.1, h: 0.5, fontSize: 14, color: "FFFFFF", bold: true, ...ar, align: "center" });
  cover.addText(deck.title, { x: 0.8, y: 2.2, w: 11.8, h: 1.6, fontSize: 48, bold: true, color: INK, ...ar });
  cover.addText(deck.subtitle, { x: 0.8, y: 3.8, w: 11.8, h: 0.8, fontSize: 22, color: PURPLE, ...ar });
  cover.addShape("rect", { x: 9.2, y: 4.75, w: 3.4, h: 0.07, fill: { color: GREEN } });
  cover.addText(`أ. ${meta.teacher} — ${meta.school}`, { x: 0.8, y: 5.0, w: 11.8, h: 0.5, fontSize: 16, color: "6B6B8A", ...ar });

  // Objectives
  if (deck.objectives.length) {
    const s = body();
    s.addText("أهداف الدرس", { x: 0.6, y: 0.5, w: 12.1, h: 0.9, fontSize: 34, bold: true, color: INK, ...ar });
    deck.objectives.slice(0, 5).forEach((o, i) => {
      const y = 1.7 + i * 1.0;
      s.addShape("roundRect", { x: 0.8, y, w: 11.7, h: 0.8, fill: { color: i % 2 ? "F6F3FF" : SOFT }, rectRadius: 0.15 });
      s.addShape("ellipse", { x: 11.75, y: y + 0.12, w: 0.56, h: 0.56, fill: { color: i % 2 ? PURPLE : GREEN } });
      s.addText(String(i + 1), { x: 11.75, y: y + 0.12, w: 0.56, h: 0.56, fontSize: 16, bold: true, color: "FFFFFF", align: "center", fontFace: font });
      s.addText(o, { x: 1.0, y, w: 10.6, h: 0.8, fontSize: 20, color: INK, ...ar });
    });
  }

  const badge: Record<string, [string, string]> = {
    content: ["شرح", GREEN],
    example: ["مثال", "15803D"],
    activity: ["نشاط", PURPLE],
    quiz: ["سؤال سريع", "A855F7"],
    summary: ["الخلاصة", INK],
  };

  for (const sl of deck.slides) {
    const s = body();
    const [label, color] = badge[sl.kind] || badge.content;
    s.addShape("roundRect", { x: 11.0, y: 0.45, w: 1.8, h: 0.42, fill: { color }, rectRadius: 0.2 });
    s.addText(label, { x: 11.0, y: 0.45, w: 1.8, h: 0.42, fontSize: 13, bold: true, color: "FFFFFF", fontFace: font, align: "center", rtlMode: true });
    s.addText(sl.title, { x: 0.6, y: 0.95, w: 12.1, h: 0.9, fontSize: 32, bold: true, color: INK, ...ar });
    s.addShape("rect", { x: 10.7, y: 1.85, w: 2.0, h: 0.06, fill: { color: GREEN } });
    const bullets = sl.bullets.slice(0, 6);
    s.addText(
      bullets.map((b) => ({ text: b, options: { bullet: { code: "25C6" }, paraSpaceAfter: 10, breakLine: true } })),
      { x: 0.8, y: 2.1, w: 11.9, h: 4.6, fontSize: bullets.length > 4 ? 20 : 24, color: "2E2A5A", valign: "top", ...ar }
    );
    if (sl.notes) s.addNotes(sl.notes);
  }

  // Closing
  const end = p.addSlide();
  end.background = { color: "FFFFFF" };
  end.addShape("ellipse", { x: 4.2, y: 0.9, w: 5, h: 5, fill: { color: SOFT } });
  end.addText("شكراً لكم", { x: 0.5, y: 2.5, w: 12.3, h: 1.4, fontSize: 54, bold: true, color: PURPLE, ...ar, align: "center" });
  end.addText("هل لديكم أسئلة؟", { x: 0.5, y: 3.9, w: 12.3, h: 0.8, fontSize: 24, color: GREEN, ...ar, align: "center" });

  return (await p.write({ outputType: "nodebuffer" })) as Buffer;
}
