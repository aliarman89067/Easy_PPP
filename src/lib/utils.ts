import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function removeTrailingSlash(path: string) {
  return path.replace(/\/$/, "");
}

export function createUrl(
  href: string,
  oldParams: Record<string, string | undefined>,
  newParams: Record<string, string | undefined>
) {
  const params = new URLSearchParams();

  Object.entries(oldParams).forEach(([key, value]) => {
    if (typeof key === "string" && typeof value === "string") {
      params.set(key, value);
    }
  });

  Object.entries(newParams).forEach(([key, value]) => {
    if (value == undefined) {
      params.delete(key);
    } else if (typeof key === "string" && typeof value === "string") {
      params.set(key, value);
    }
  });
  return `${href}?${params.toString()}`;
}
