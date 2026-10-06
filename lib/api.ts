import { isClassId } from "./classes";

export function bad(msg: string, status = 400) {
  return Response.json({ error: msg }, { status });
}

export function classParam(v: unknown): string | null {
  const s = String(v ?? "");
  return isClassId(s) ? s : null;
}
