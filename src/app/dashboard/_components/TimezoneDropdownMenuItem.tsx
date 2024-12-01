import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { createUrl } from "@/lib/utils";

export default function TimezoneDropdownMenuItem({
  searchParams,
}: {
  searchParams: Record<string, string>;
}) {
  const userTimezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <DropdownMenuItem>
      <Link
        href={createUrl("/dashboard/analytics", searchParams, {
          timezone: userTimezone,
        })}
      >
        {userTimezone}
      </Link>
    </DropdownMenuItem>
  );
}
