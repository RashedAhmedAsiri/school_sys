import { db } from "./db";

export const CLASS_IDS = ["1-1", "1-2", "1-3", "2-1", "2-2", "2-3", "3-1", "3-2", "3-3"] as const;

export const DEFAULT_PROFILES: Record<string, { name: string; logo: string; color: string }> = {
  "1-1": { name: "الرواد", logo: "🚀", color: "#22c1dc" },
  "1-2": { name: "المبتكرون", logo: "💡", color: "#7c5cff" },
  "1-3": { name: "الصقور", logo: "🦅", color: "#0ea5b7" },
  "2-1": { name: "العباقرة", logo: "🧠", color: "#a855f7" },
  "2-2": { name: "المستكشفون", logo: "🔭", color: "#06b6d4" },
  "2-3": { name: "الفرسان", logo: "⚡", color: "#8b5cf6" },
  "3-1": { name: "القادة", logo: "👑", color: "#14b8c4" },
  "3-2": { name: "النخبة", logo: "💎", color: "#9333ea" },
  "3-3": { name: "المبدعون", logo: "🎨", color: "#38bdf8" },
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
