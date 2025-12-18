import { type CookieAttributes, parseSetCookieHeader } from "./parser";
import { normalizeCookieName } from "./utils";

/**
 * Stored cookie format with value and expiry timestamp
 */
export interface StoredCookie {
  value: string;
  expires: string | null;
}

/**
 * Storage interface for cookie persistence
 */
export interface StorageAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

/**
 * Convert a Set-Cookie header to a storable JSON string.
 * Merges with existing cookies if provided.
 */
export function getSetCookie(header: string, prevCookie?: string | undefined): string {
  const parsed = parseSetCookieHeader(header);
  let toSetCookie: Record<string, StoredCookie> = {};
  parsed.forEach((cookie: CookieAttributes, key: string) => {
    const expiresAt = cookie["expires"];
    const maxAge = cookie["max-age"];
    const expires = maxAge
      ? new Date(Date.now() + Number(maxAge) * 1000)
      : expiresAt
        ? new Date(String(expiresAt))
        : null;
    toSetCookie[key] = {
      value: cookie["value"],
      expires: expires ? expires.toISOString() : null,
    };
  });
  if (prevCookie) {
    try {
      const prevCookieParsed = JSON.parse(prevCookie);
      toSetCookie = {
        ...prevCookieParsed,
        ...toSetCookie,
      };
    } catch {
      // Ignore parse errors
    }
  }
  return JSON.stringify(toSetCookie);
}

/**
 * Convert stored cookies to a Cookie header string.
 * Filters out expired cookies automatically.
 */
export function getCookie(cookie: string): string {
  let parsed = {} as Record<string, StoredCookie>;
  try {
    parsed = JSON.parse(cookie) as Record<string, StoredCookie>;
  } catch {
    // Ignore parse errors
  }
  const validCookies = Object.entries(parsed)
    .filter(([, value]) => !value.expires || new Date(value.expires) >= new Date())
    .map(([key, value]) => `${key}=${value.value}`);
  return validCookies.join("; ");
}

/**
 * Create a storage adapter that normalizes cookie names.
 * Replaces colons with underscores for storage compatibility.
 */
export function storageAdapter(storage: StorageAdapter): StorageAdapter {
  return {
    getItem: (name: string) => {
      return storage.getItem(normalizeCookieName(name));
    },
    setItem: (name: string, value: string) => {
      return storage.setItem(normalizeCookieName(name), value);
    },
  };
}
