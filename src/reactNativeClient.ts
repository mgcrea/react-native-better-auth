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
};

/**
 * React Native client plugin for better-auth.
 * Handles session persistence using local storage and cookie management.
 */
export const reactNativeClient = (opts: ReactNativeClientOptions) => {
  let store: ClientStore | null = null;
  const storagePrefix = opts?.storagePrefix || "better-auth";
  const cookieName = `${storagePrefix}_cookie`;
  const localCacheName = `${storagePrefix}_session_data`;
  const storage = storageAdapter(opts?.storage);
  const isWeb = Platform.OS === "web";
  const cookiePrefix = opts?.cookiePrefix || "better-auth";
  const scheme = opts.scheme;

  function getOrigin() {
    return `${scheme}://`;
  }

  return {
    id: "react-native",
    getActions(_, $store) {
      store = $store;
      return {
        /**
         * Get the stored cookie for use in fetch requests.
         */
        getCookie: () => {
          const cookie = storage.getItem(cookieName);
          return getCookie(cookie || "{}");
        },
      };
    },
    fetchPlugins: [
      {
        id: "react-native",
        name: "ReactNative",
        hooks: {
          async onSuccess(context) {
            if (isWeb) return;
            const setCookie = context.response.headers.get("set-cookie");
            if (setCookie) {
              if (hasBetterAuthCookies(setCookie, cookiePrefix)) {
                const prevCookie = storage.getItem(cookieName);
                const toSetCookie = getSetCookie(setCookie || "", prevCookie ?? undefined);
                if (hasSessionCookieChanged(prevCookie, toSetCookie)) {
                  storage.setItem(cookieName, toSetCookie);
                  store?.notify("$sessionSignal");
                } else {
                  storage.setItem(cookieName, toSetCookie);
                }
              }
            }

            if (context.request.url.toString().includes("/get-session") && !opts?.disableCache) {
              const data = context.data;
              storage.setItem(localCacheName, JSON.stringify(data));
            }
          },
        },
        init(url, options) {
          if (isWeb) {
            return {
              url,
              options: options as ClientFetchOption,
            };
          }
          options = options || {};
          const storedCookie = storage.getItem(cookieName);
          const cookie = getCookie(storedCookie || "{}");
          options.credentials = "omit";
          options.headers = {
            ...options.headers,
            cookie,
            Origin: getOrigin(),
          };

          if (url.includes("/sign-out")) {
            storage.setItem(cookieName, "{}");
            store?.atoms.session?.set({
              ...store.atoms.session.get(),
              data: null,
              error: null,
              isPending: false,
            });
            storage.setItem(localCacheName, "{}");
          }
          return {
            url,
            options: options as ClientFetchOption,
          };
        },
      },
    ],
  } satisfies BetterAuthClientPlugin;
};
