import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges Tailwind class lists. Framework-free, safe in server components. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
