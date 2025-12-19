import type { ClientFetchOption } from "@better-auth/core";
import type { BetterAuthClientPlugin, ClientStore } from "better-auth/client";
import { Platform } from "react-native";
import {
  getCookie,
  getSetCookie,
  hasBetterAuthCookies,
  hasSessionCookieChanged,
  storageAdapter,
  type StorageAdapter,
} from "./cookies";
import { setupFocusManager } from "./focusManager";
import { log, setDebugEnabled } from "./utils";

// Setup focus manager on non-web platforms
if (Platform.OS !== "web") {
  setupFocusManager();
}

export type ReactNativeClientOptions = {
  /**
   * URL scheme for deep linking (e.g., "skitrust")
   */
  scheme: string;
  /**
   * Storage adapter with getItem and setItem methods
   */
  storage: StorageAdapter;
  /**
   * Prefix for local storage keys (e.g., "my-app_cookie", "my-app_session_data")
   * @default "better-auth"
   */
  storagePrefix?: string | undefined;
  /**
   * Prefix(es) for server cookie names to filter (e.g., "better-auth.session_token")
   * @default "better-auth"
   */
  cookiePrefix?: string | string[] | undefined;
  /**
   * Disable local session caching
   * @default false
   */
  disableCache?: boolean | undefined;
  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean | undefined;
};

/**
 * React Native client plugin for better-auth.
 * Handles session persistence using local storage and cookie management.
 */
export const reactNativeClient = (opts: ReactNativeClientOptions): BetterAuthClientPlugin => {
  // Enable debug logging if requested
  if (opts.debug) {
    setDebugEnabled(true);
  }

  let store: ClientStore | null = null;
  const storagePrefix = opts.storagePrefix ?? "better-auth";
  const cookieName = `${storagePrefix}_cookie`;
  const localCacheName = `${storagePrefix}_session_data`;
  const storage = storageAdapter(opts.storage);
  const isWeb = Platform.OS === "web";
  const cookiePrefix = opts.cookiePrefix ?? "better-auth";
  const scheme = opts.scheme;

  log("Plugin initialized", { storagePrefix, cookieName, cookiePrefix, scheme, isWeb });

  function getOrigin() {
    return `${scheme}://`;
  }

  return {
    id: "react-native",
    getActions(_, $store) {
      store = $store;
      log("getActions called, store registered");
      return {
        /**
         * Get the stored cookie for use in fetch requests.
         */
        getCookie: () => {
          const cookie = storage.getItem(cookieName);
          return getCookie(cookie ?? "{}");
        },
      };
    },
    fetchPlugins: [
      {
        id: "react-native",
        name: "ReactNative",
        hooks: {
          onError(context) {
            if (isWeb) return;
            const url = context.request.url.toString();
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            const status = context.response?.status;
            log("onError", {
              url,
              status,
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              error: context.error?.message,
            });

            if (status === 401) {
              const storedCookie = storage.getItem(cookieName);
              log("401 Unauthorized - Cookie state", {
                hasStoredCookie: !!storedCookie,
                storedCookiePreview: storedCookie ? storedCookie.substring(0, 100) + "..." : null,
              });
            }
          },
          onSuccess(context) {
            if (isWeb) return;

            const url = context.request.url.toString();
            const status = context.response.status;
            log("onSuccess", { url, status });

            const setCookie = context.response.headers.get("set-cookie");
            if (setCookie) {
              log("Received Set-Cookie header (raw)", {
                setCookie,
                length: setCookie.length,
              });

              if (hasBetterAuthCookies(setCookie, cookiePrefix)) {
                const prevCookie = storage.getItem(cookieName);
                const toSetCookie = getSetCookie(setCookie, prevCookie ?? undefined);
                log("Processing cookies", {
                  hasPrevCookie: !!prevCookie,
                  cookieChanged: hasSessionCookieChanged(prevCookie, toSetCookie),
                });

                if (hasSessionCookieChanged(prevCookie, toSetCookie)) {
                  storage.setItem(cookieName, toSetCookie);
                  store?.notify("$sessionSignal");
                  log("Session cookie changed, notified sessionSignal");
                } else {
                  storage.setItem(cookieName, toSetCookie);
                  log("Cookie expiry updated (no value change)");
                }
              } else {
                log("Set-Cookie header does not contain better-auth cookies");
              }
            }

            if (url.includes("/get-session") && !opts.disableCache) {
              const data = context.data as { session?: unknown } | undefined;
              storage.setItem(localCacheName, JSON.stringify(data));
              log("Cached session data", { hasSession: !!data?.session });
            }
          },
        },
        init(url, options) {
          log("init (before request)", { url });

          if (isWeb) {
            return {
              url,
              options: options as ClientFetchOption,
            };
          }

          options = options ?? {};
          const storedCookie = storage.getItem(cookieName);
          const cookie = getCookie(storedCookie ?? "{}");

          log("Attaching cookie to request", {
            hasStoredCookie: !!storedCookie,
            storedCookieRaw: storedCookie ? storedCookie.substring(0, 200) : null,
            cookieLength: cookie.length,
            cookiePreview: cookie.substring(0, 100) + (cookie.length > 100 ? "..." : ""),
          });

          options.credentials = "omit";

          // Convert headers to a plain object, handling Headers, string[][], and Record types
          let existingHeaders: Record<string, string> = {};
          if (options.headers) {
            if (options.headers instanceof Headers) {
              options.headers.forEach((value: string, key: string) => {
                existingHeaders[key] = value;
              });
            } else if (Array.isArray(options.headers)) {
              for (const entry of options.headers as string[][]) {
                existingHeaders[entry[0]] = entry[1];
              }
            } else {
              existingHeaders = { ...(options.headers as Record<string, string>) };
            }
          }

          options.headers = {
            ...existingHeaders,
            cookie,
            Origin: getOrigin(),
          };

          if (url.includes("/sign-out")) {
            log("Sign-out detected, clearing cookies");
            storage.setItem(cookieName, "{}");
            const session = store?.atoms.session;
            if (session) {
              session.set({
                ...session.get(),
                data: null,
                error: null,
                isPending: false,
              });
            }
            storage.setItem(localCacheName, "{}");
          }

          return {
            url,
            options: options as ClientFetchOption,
          };
        },
      },
    ],
  };
};
