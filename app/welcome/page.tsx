import { redirect } from "next/navigation";
import { getTeacher } from "@/lib/auth";
import Welcome from "./Welcome";

export default async function Page() {
  const t = await getTeacher();
  if (!t) redirect("/");
  return <Welcome name={t.name} />;
}
