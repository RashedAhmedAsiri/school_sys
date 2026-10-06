import { randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";

const COOKIE = "mawhoob_session";

let key: Uint8Array | null = null;
/** The cookie signing key: SESSION_SECRET if set, otherwise a random one made once and kept in the database. */
async function secret() {
  if (key) return key;
  let s = process.env.SESSION_SECRET;
  if (!s) {
    await db.setting.createMany({ data: [{ key: "session_secret", value: randomBytes(32).toString("hex") }], skipDuplicates: true });
    s = (await db.setting.findUniqueOrThrow({ where: { key: "session_secret" } })).value;
  }
  key = new TextEncoder().encode(s);
  return key;
}

export async function createSession(teacherId: string) {
  const token = await new SignJWT({ sub: teacherId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(await secret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getTeacherId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getTeacher() {
  const id = await getTeacherId();
  if (!id) return null;
  return db.teacher.findUnique({ where: { id } });
}

/** For API routes: returns the teacher or a 401 Response. */
export async function requireTeacher() {
  const t = await getTeacher();
  if (!t) return { teacher: null, error: Response.json({ error: "غير مسجل الدخول" }, { status: 401 }) } as const;
  return { teacher: t, error: null } as const;
}
