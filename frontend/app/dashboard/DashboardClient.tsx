"use client";

import ShortsStudio from "@/components/ShortsStudio";

export default function DashboardClient({ workspaceId }: { workspaceId: string }) {
  return <ShortsStudio workspaceId={workspaceId} />;
}
