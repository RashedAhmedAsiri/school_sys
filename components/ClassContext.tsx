"use client";
import { createContext, useContext } from "react";
import { Shape } from "./Icon";

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

/** A class mark: an uploaded image, or a flat white shape on the class colour. */
export function Logo({ p, size }: { p: Pick<Profile, "logo" | "color">; size?: number }) {
  const s = size ? { width: size, height: size } : undefined;
  if (p.logo.startsWith("data:"))
    return <div className="logo" style={s}><img src={p.logo} alt="" /></div>;
  const shape = p.logo.startsWith("shape:") ? p.logo.slice(6) : "circle";
  return (
    <div className="logo" style={{ ...s, background: p.color }}>
      <Shape shape={shape} size={Math.round((size ?? 40) * 0.5)} />
    </div>
  );
}
