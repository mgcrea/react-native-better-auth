// Main plugin export
export { reactNativeClient, type ReactNativeClientOptions } from "./reactNativeClient";

// Focus manager export
export { setupFocusManager } from "./focusManager";

// Cookie utilities for advanced users
export {
  // Parser
  type CookieAttributes,
  parseSetCookieHeader,
  splitSetCookieHeader,
  // Storage
  getCookie,
  getSetCookie,
  storageAdapter,
  type StorageAdapter,
  type StoredCookie,
  // Utils
  hasBetterAuthCookies,
  hasSessionCookieChanged,
  normalizeCookieName,
} from "./cookies";
