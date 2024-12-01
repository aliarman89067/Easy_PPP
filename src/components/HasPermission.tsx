import NoPermissionCard from "@/app/dashboard/_components/NoPermissionCard";
import { auth } from "@clerk/nextjs/server";
import { AwaitedReactNode } from "react";

export default async function HasPermission({
  permission,
  renderFallback = false,
  fallbackText,
  children,
}: {
  permission: (userId: string | null) => Promise<boolean>;
  renderFallback?: boolean;
  fallbackText?: string;
  children: AwaitedReactNode;
}) {
  const { userId } = await auth();
  const HasPermission = await permission(userId);
  if (HasPermission) return children;
  if (renderFallback)
    return <NoPermissionCard>{fallbackText}</NoPermissionCard>;
  return null;
}
