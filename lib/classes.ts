import { db } from "./db";

export const CLASS_IDS = ["1-1", "1-2", "1-3", "2-1", "2-2", "2-3", "3-1", "3-2", "3-3"] as const;

export const DEFAULT_PROFILES: Record<string, { name: string; logo: string; color: string }> = {
  "1-1": { name: "الرواد", logo: "shape:octagon", color: "#15803d" },
  "1-2": { name: "المبتكرون", logo: "shape:square", color: "#0c1f15" },
  "1-3": { name: "الصقور", logo: "shape:triangle", color: "#16a34a" },
  "2-1": { name: "العباقرة", logo: "shape:diamond", color: "#33473b" },
  "2-2": { name: "المستكشفون", logo: "shape:hexagon", color: "#4d7c0f" },
  "2-3": { name: "الفرسان", logo: "shape:stairs", color: "#0f5f2e" },
  "3-1": { name: "القادة", logo: "shape:frame", color: "#166534" },
  "3-2": { name: "النخبة", logo: "shape:cross", color: "#1f3a2a" },
  "3-3": { name: "المبدعون", logo: "shape:bars", color: "#65a30d" },
};

export function classLabel(id: string) {
  return id.replace("-", "/");
}

export function isClassId(id: string): boolean {
  return (CLASS_IDS as readonly string[]).includes(id);
}

let seeded = false;
export async function ensureClasses() {
  if (seeded) return;
  const count = await db.class.count();
  if (count < CLASS_IDS.length) {
    for (const id of CLASS_IDS) {
      const [grade, section] = id.split("-").map(Number);
      await db.class.upsert({
        where: { id },
        update: {},
        create: { id, label: classLabel(id), grade, section },
      });
    }
  }
  seeded = true;
}

export async function ensureProfiles(teacherId: string) {
  await ensureClasses();
  const existing = await db.classProfile.findMany({ where: { teacherId } });
  // older accounts stored emoji logos, gradient-era colours or purple; move them to the current class marks
  const OLD_COLORS = ["#5b3fe0", "#7a5cf0", "#4329b8", "#8a6df5", "#3f28b0", "#17153a", "#22c1dc", "#7c5cff", "#0ea5b7", "#a855f7", "#06b6d4", "#8b5cf6", "#14b8c4", "#9333ea", "#38bdf8", "#0e9fc0", "#13a8c8", "#0a6f88", "#0b7a93", "#2b5fd0"];
  const OLD_SHAPES = ["shape:circle", "shape:arch", "shape:ring"];
  const legacy = existing.filter((p) => (!p.logo.startsWith("shape:") && !p.logo.startsWith("data:")) || OLD_SHAPES.includes(p.logo) || OLD_COLORS.includes(p.color));
  for (const p of legacy) {
    const d = DEFAULT_PROFILES[p.classId];
    const logo = (p.logo.startsWith("shape:") && !OLD_SHAPES.includes(p.logo)) || p.logo.startsWith("data:") ? p.logo : d.logo;
    await db.classProfile.update({ where: { id: p.id }, data: { logo, color: d.color } });
    p.logo = logo;
    p.color = d.color;
  }
  const have = new Set(existing.map((p) => p.classId));
  const missing = CLASS_IDS.filter((id) => !have.has(id));
  if (missing.length) {
    await db.classProfile.createMany({
      data: missing.map((classId) => ({ teacherId, classId, ...DEFAULT_PROFILES[classId] })),
      skipDuplicates: true,
    });
    return db.classProfile.findMany({ where: { teacherId } });
  }
  return existing;
}

export function sortProfiles<T extends { classId: string }>(list: T[]) {
  return [...list].sort((a, b) => CLASS_IDS.indexOf(a.classId as never) - CLASS_IDS.indexOf(b.classId as never));
}

export function todayISO(tz = process.env.SCHOOL_TZ || "Asia/Riyadh") {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
