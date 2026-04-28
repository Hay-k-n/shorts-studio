import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WORKSPACE_COOKIE } from "@/lib/workspace";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspaceId = cookies().get(WORKSPACE_COOKIE)?.value;
  if (!workspaceId) redirect("/login");

  return <DashboardClient workspaceId={workspaceId} />;
}
