// Main plugin export
export { reactNativeClient, type ReactNativeClientOptions } from "./reactNativeClient";

// Focus manager export
export { setupFocusManager } from "./focusManager";

// Cookie utilities for advanced users
export {
  // Storage
  getCookie,
  getSetCookie,
  // Utils
  hasBetterAuthCookies,
  hasSessionCookieChanged,
  normalizeCookieName,
  parseSetCookieHeader,
  splitSetCookieHeader,
  storageAdapter,
  // Parser
  type CookieAttributes,
  type StorageAdapter,
  type StoredCookie,
} from "./cookies";

// Debug utilities
export { isDebugEnabled, log, setDebugEnabled } from "./utils";
