import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Recursively removes all `undefined` values from an object so it is safe
 * to pass to Firestore's `setDoc` / `updateDoc` (which reject `undefined`).
 * `null` values are preserved — only `undefined` is stripped.
 */
export function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_key, value) =>
    value === undefined ? null : value
  )) as T;
}
