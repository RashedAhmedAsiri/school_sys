"use client";
import { createContext, useContext } from "react";

export type Profile = { classId: string; name: string; logo: string; color: string };
export type ShellCtx = {
  cls: string;
  label: string;
  profile: Profile;
  profiles: Profile[];
  teacher: { name: string; voice: string };
  toast: (m: string) => void;
};
export const Ctx = createContext<ShellCtx | null>(null);
export function useShell() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useShell outside shell");
  return c;
}

export function Logo({ p, size }: { p: Pick<Profile, "logo" | "color">; size?: number }) {
  const s = size ? { width: size, height: size, fontSize: size * 0.52 } : undefined;
  return (
    <div className="logo" style={{ ...s, boxShadow: `0 6px 16px -8px ${p.color}` }}>
      {p.logo.startsWith("data:") ? <img src={p.logo} alt="" /> : p.logo}
    </div>
  );
}
