import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

export function ageInDays(dateOfBirth: string | null): number {
  if (!dateOfBirth) return 36500; // default to adult if unknown
  const ms = Date.now() - new Date(dateOfBirth).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
