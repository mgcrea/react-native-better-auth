import { parseSetCookieHeader } from "./parser";
import type { StoredCookie } from "./storage";

/**
 * Check if session cookies have actually changed by comparing their values.
 * Ignores expiry timestamps that naturally change on each request.
 */
export function hasSessionCookieChanged(prevCookie: string | null, newCookie: string): boolean {
  if (!prevCookie) return true;

  try {
    const prev = JSON.parse(prevCookie) as Record<string, StoredCookie>;
    const next = JSON.parse(newCookie) as Record<string, StoredCookie>;

    const sessionKeys = new Set<string>();
    Object.keys(prev).forEach((key) => {
      if (key.includes("session_token") || key.includes("session_data")) {
        sessionKeys.add(key);
      }
    });
    Object.keys(next).forEach((key) => {
      if (key.includes("session_token") || key.includes("session_data")) {
        sessionKeys.add(key);
      }
    });

    for (const key of sessionKeys) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const prevValue = prev[key]?.value;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const nextValue = next[key]?.value;
      if (prevValue !== nextValue) {
        return true;
      }
    }

    return false;
  } catch {
    return true;
  }
}

/**
 * Check if the Set-Cookie header contains better-auth cookies.
 * Used to prevent infinite refetch loops from third-party cookies.
 */
export function hasBetterAuthCookies(setCookieHeader: string, cookiePrefix: string | string[]): boolean {
  const cookies = parseSetCookieHeader(setCookieHeader);
  const cookieSuffixes = ["session_token", "session_data"];
  const prefixes = Array.isArray(cookiePrefix) ? cookiePrefix : [cookiePrefix];

  for (const name of cookies.keys()) {
    const nameWithoutSecure = name.startsWith("__Secure-") ? name.slice(9) : name;

    for (const prefix of prefixes) {
      if (prefix) {
        if (nameWithoutSecure.startsWith(prefix)) {
          return true;
        }
      } else {
        for (const suffix of cookieSuffixes) {
          if (nameWithoutSecure.endsWith(suffix)) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * Normalize cookie name by replacing colons with underscores.
 * Some storage implementations don't support colons in keys.
 */
export function normalizeCookieName(name: string): string {
  return name.replace(/:/g, "_");
}
