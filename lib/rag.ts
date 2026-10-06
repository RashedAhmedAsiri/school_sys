import { db } from "./db";

// Chunk RAG: books are split into small overlapping chunks once at upload time.
// At question time only the best few chunks are sent to the model, which keeps
// each request small (a few thousand tokens instead of a whole book).

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const STOP = new Set(
  (
    "في من على الى إلى عن مع هذا هذه ذلك تلك التي الذي الذين هو هي هم هن انت انا نحن كان كانت يكون تكون ان أن إن او أو ثم قد لا لم لن ما ماذا كيف متى اين لماذا كل بعض غير بين عند حتى اذا إذا وهو وهي وفي ومن وعلى " +
    "the a an of to in on for and or is are was were be this that with as by at from it its"
  ).split(/\s+/)
);

export function normalizeArabic(s: string) {
  return s
    .replace(DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .toLowerCase();
}

function stem(w: string) {
  // very light Arabic prefix/suffix stripping so "الخلية" ~ "خليه" ~ "والخلايا" overlap more often
  let t = w;
  for (const p of ["وال", "بال", "كال", "فال", "لل", "ال"]) {
    if (t.startsWith(p) && t.length - p.length >= 3) {
      t = t.slice(p.length);
      break;
    }
  }
  for (const s of ["ات", "ون", "ين", "ها", "هم", "ه"]) {
    if (t.endsWith(s) && t.length - s.length >= 3) {
      t = t.slice(0, -s.length);
      break;
    }
  }
  return t;
}

export function tokenize(s: string): string[] {
  return normalizeArabic(s)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2 && !STOP.has(w))
    .map(stem);
}

export function chunkText(raw: string, size = 900, overlap = 150) {
  const text = raw.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const paras = text.split(/\n\s*\n|\n(?=\S)/).map((p) => p.trim()).filter(Boolean);
  const chunks: { text: string; heading: string }[] = [];
  let buf = "";
  let heading = "";
  let bufHeading = "";
  const headingLike = (p: string) =>
    p.length < 80 && /^(الفصل|الوحدة|الدرس|الباب|المبحث|chapter|unit|lesson|صفحة|\d+[\.\-)])/i.test(p);
  const flush = () => {
    if (buf.trim()) chunks.push({ text: buf.trim(), heading: bufHeading });
    buf = buf.length > overlap ? buf.slice(-overlap) : "";
    bufHeading = heading;
  };
  for (const p of paras) {
    if (headingLike(p)) heading = p;
    if (!buf) bufHeading = heading;
    if ((buf + "\n" + p).length > size && buf.length > 0) flush();
    if (p.length > size) {
      for (let i = 0; i < p.length; i += size - overlap) {
        buf += (buf ? "\n" : "") + p.slice(i, i + size);
        if (buf.length >= size) flush();
      }
    } else {
      buf += (buf ? "\n" : "") + p;
    }
  }
  if (buf.trim() && (chunks.length === 0 || !chunks[chunks.length - 1].text.endsWith(buf.trim()))) {
    chunks.push({ text: buf.trim(), heading: bufHeading });
  }
  return chunks;
}

export async function addSource(opts: {
  teacherId: string;
  classId: string | null;
  title: string;
  kind: string;
  text: string;
}) {
  const parts = chunkText(opts.text);
  const source = await db.source.create({
    data: {
      teacherId: opts.teacherId,
      classId: opts.classId,
      title: opts.title.slice(0, 200),
      kind: opts.kind,
      charCount: opts.text.length,
    },
  });
  const rows = parts.map((c, idx) => {
    const terms = tokenize(c.heading + " " + c.text);
    return { sourceId: source.id, idx, heading: c.heading.slice(0, 200), text: c.text, terms: terms.join(" "), length: terms.length };
  });
  for (let i = 0; i < rows.length; i += 500) {
    await db.chunk.createMany({ data: rows.slice(i, i + 500) });
  }
  return { source, chunks: rows.length };
}

export type Retrieved = { text: string; heading: string; source: string; idx: number; score: number };

/** BM25 over this teacher's chunks for a class (class-specific sources + "all classes" sources). */
export async function retrieve(teacherId: string, classId: string, query: string, k = 6): Promise<Retrieved[]> {
  const q = Array.from(new Set(tokenize(query)));
  if (!q.length) return [];
  const sources = await db.source.findMany({
    where: { teacherId, OR: [{ classId }, { classId: null }] },
    select: { id: true, title: true },
  });
  if (!sources.length) return [];
  const titles = new Map(sources.map((s) => [s.id, s.title]));
  const chunks = await db.chunk.findMany({
    where: { sourceId: { in: sources.map((s) => s.id) } },
    select: { sourceId: true, idx: true, heading: true, terms: true, length: true, id: true },
  });
  const N = chunks.length;
  const avg = chunks.reduce((a, c) => a + c.length, 0) / Math.max(N, 1);
  const df = new Map<string, number>();
  const tfs = chunks.map((c) => {
    const tf = new Map<string, number>();
    for (const t of c.terms.split(" ")) if (q.includes(t)) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    return tf;
  });
  const k1 = 1.4, b = 0.75;
  const scored = chunks
    .map((c, i) => {
      let s = 0;
      for (const [t, f] of tfs[i]) {
        const idf = Math.log(1 + (N - (df.get(t) || 0) + 0.5) / ((df.get(t) || 0) + 0.5));
        s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * c.length) / avg)));
      }
      return { c, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, k);
  if (!scored.length) return [];
  const full = await db.chunk.findMany({ where: { id: { in: scored.map((x) => x.c.id) } } });
  const byId = new Map(full.map((f) => [f.id, f]));
  return scored.map((x) => ({
    text: byId.get(x.c.id)!.text,
    heading: x.c.heading,
    source: titles.get(x.c.sourceId) || "",
    idx: x.c.idx,
    score: x.s,
  }));
}

export function formatContext(chunks: Retrieved[]) {
  if (!chunks.length) return "";
  return chunks
    .map((c, i) => `[مقطع ${i + 1} — ${c.source}${c.heading ? " / " + c.heading : ""}]\n${c.text}`)
    .join("\n\n");
}
