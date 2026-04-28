"use client";

import React from "react";
import ShortsStudio from "@/components/ShortsStudio";

// ShortsStudio is a .jsx file — TypeScript infers workspaceId as the literal
// type `null` (the default value) instead of `string | null`. Cast it so we
// can pass a real string without a build error.
const Studio = ShortsStudio as React.ComponentType<{ workspaceId: string | null }>;

export default function DashboardClient({ workspaceId }: { workspaceId: string | null }) {
  return <Studio workspaceId={workspaceId} />;
}
