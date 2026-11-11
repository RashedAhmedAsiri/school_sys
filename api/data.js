// Shared storage for Ihya Al-Qiraa: sessions, books and results live as JSON files in Vercel Blob.
// GET    /api/data                 -> { sessions, books, results }
// PUT    /api/data?col=..&id=..    -> save one document (body = JSON)
// DELETE /api/data?col=..&id=..    -> remove one document
// Sessions and books (and deleting results) need the admin code in the x-admin-code header.
import { put, list, del } from "@vercel/blob";

const ROOT = "ihya/";
const COLS = ["sessions", "books", "results"];
const ADMIN_CODE = process.env.ADMIN_CODE || "2030";
const ID = /^[A-Za-z0-9_-]{1,64}$/;

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function readAll() {
  const out = { sessions: [], books: [], results: [] };
  let cursor;
  const blobs = [];
  do { const r = await list({ prefix: ROOT, cursor, limit: 1000 }); blobs.push(...r.blobs); cursor = r.hasMore ? r.cursor : undefined; } while (cursor);
  await Promise.all(blobs.map(async b => {
    const m = b.pathname.slice(ROOT.length).match(/^(\w+)\/([A-Za-z0-9_-]+)\.json$/);
    if (!m || !COLS.includes(m[1])) return;
    try {
      const res = await fetch(b.url + "?v=" + new Date(b.uploadedAt).getTime(), { cache: "no-store" });
      if (res.ok) out[m[1]].push({ ...(await res.json()), id: m[2] });
    } catch {}
  }));
  return out;
}

function validResult(d) {
  return d && typeof d.bookId === "string" && typeof d.name === "string" && d.name.length <= 60 &&
    Number.isFinite(d.score) && d.score >= 0 && d.score <= 50 && Number.isFinite(d.ms) && d.ms >= 0 && d.ms <= 3600000;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: "storage_not_connected" });
  try {
    if (req.method === "GET") return res.status(200).json(await readAll());
    const { col, id } = req.query;
    if (!COLS.includes(col) || !ID.test(String(id))) return res.status(400).json({ error: "bad_path" });
    const isAdmin = req.headers["x-admin-code"] === ADMIN_CODE;
    const path = `${ROOT}${col}/${id}.json`;
    if (req.method === "PUT") {
      const body = await readBody(req); delete body.id;
      if (col !== "results" && !isAdmin) return res.status(403).json({ error: "admin_only" });
      if (col === "results" && !validResult(body)) return res.status(400).json({ error: "bad_result" });
      const text = JSON.stringify(body);
      if (text.length > 900000) return res.status(413).json({ error: "too_large" });
      await put(path, text, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60 });
      return res.status(200).json({ ok: true });
    }
    if (req.method === "DELETE") {
      if (!isAdmin) return res.status(403).json({ error: "admin_only" });
      const r = await list({ prefix: path, limit: 1 });
      if (r.blobs[0]) await del(r.blobs[0].url);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "method" });
  } catch (e) {
    return res.status(500).json({ error: "server", message: String(e && e.message || e) });
  }
}
