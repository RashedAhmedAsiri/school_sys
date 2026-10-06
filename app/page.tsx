import { redirect } from "next/navigation";
import { getTeacher } from "@/lib/auth";
import Intro from "./Intro";

export default async function Page() {
  const t = await getTeacher();
  if (t) redirect(t.onboarded ? "/c/1-1" : "/welcome");
  return <Intro />;
}
