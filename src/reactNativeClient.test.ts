import { beforeEach, describe, expect, it, vi } from "vitest";
import { reactNativeClient } from "./reactNativeClient";

function createMockStorage() {
  const storage = new Map<string, string>();
  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    _storage: storage,
  };
}

describe("reactNativeClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("plugin configuration", () => {
    it("should create a plugin with correct id", () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      expect(plugin.id).toBe("react-native");
    });

    it("should have fetchPlugins array", () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      expect(plugin.fetchPlugins).toBeDefined();
      expect(plugin.fetchPlugins).toHaveLength(1);
      expect(plugin.fetchPlugins[0].id).toBe("react-native");
      expect(plugin.fetchPlugins[0].name).toBe("ReactNative");
    });
  });

  describe("getActions", () => {
    it("should expose getCookie action", () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const actions = plugin.getActions({}, {} as never);
      expect(typeof actions.getCookie).toBe("function");
    });

    it("should return stored cookies via getCookie", () => {
      const storage = createMockStorage();
      storage.setItem(
        "better-auth_cookie",
        JSON.stringify({
          "better-auth.session_token": {
            value: "token123",
            expires: new Date(Date.now() + 86400000).toISOString(),
          },
        })
      );

      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const actions = plugin.getActions({}, {} as never);
      const cookie = actions.getCookie();
      expect(cookie).toContain("better-auth.session_token=token123");
    });
  });

  describe("init hook", () => {
    it("should attach cookies to request headers", () => {
      const storage = createMockStorage();
      storage.setItem(
        "better-auth_cookie",
        JSON.stringify({
          "better-auth.session_token": {
            value: "token123",
            expires: new Date(Date.now() + 86400000).toISOString(),
          },
        })
      );

      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const fetchPlugin = plugin.fetchPlugins[0];
      const result = fetchPlugin.init("http://api.example.com/auth/session", {});

      expect(result.options?.headers).toHaveProperty("cookie");
      expect(result.options?.headers?.cookie).toContain("better-auth.session_token=token123");
    });

    it("should add Origin header with scheme", () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const fetchPlugin = plugin.fetchPlugins[0];
      const result = fetchPlugin.init("http://api.example.com/auth/session", {});

      expect(result.options?.headers).toHaveProperty("Origin", "myapp://");
    });

    it("should set credentials to omit", () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const fetchPlugin = plugin.fetchPlugins[0];
      const result = fetchPlugin.init("http://api.example.com/auth/session", {});

      expect(result.options?.credentials).toBe("omit");
    });

    it("should clear cookies on sign-out", () => {
      const storage = createMockStorage();
      storage.setItem(
        "better-auth_cookie",
        JSON.stringify({
          "better-auth.session_token": { value: "token123", expires: null },
        })
      );
      storage.setItem("better-auth_session_data", JSON.stringify({ user: { id: "123" } }));

      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      // Initialize the store first
      plugin.getActions({}, {
        atoms: {
          session: {
            get: () => ({ data: { user: { id: "123" } }, error: null, isPending: false }),
            set: vi.fn(),
          },
        },
        notify: vi.fn(),
      } as never);

      const fetchPlugin = plugin.fetchPlugins[0];
      fetchPlugin.init("http://api.example.com/auth/sign-out", {});

      expect(storage.getItem("better-auth_cookie")).toBe("{}");
      expect(storage.getItem("better-auth_session_data")).toBe("{}");
    });
  });

  describe("onSuccess hook", () => {
    it("should store cookies from Set-Cookie header", async () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      // Initialize store
      const mockStore = {
        atoms: { session: null },
        notify: vi.fn(),
      };
      plugin.getActions({}, mockStore as never);

      const fetchPlugin = plugin.fetchPlugins[0];

      const mockContext = {
        response: {
          headers: {
            get: (name: string) =>
              name === "set-cookie"
                ? "better-auth.session_token=newtoken; Path=/; HttpOnly"
                : null,
          },
        },
        request: {
          url: new URL("http://api.example.com/auth/session"),
        },
        data: null,
      };

      await fetchPlugin.hooks.onSuccess(mockContext as never);

      const storedCookie = storage.getItem("better-auth_cookie");
      expect(storedCookie).toBeDefined();
      const parsed = JSON.parse(storedCookie!);
      expect(parsed["better-auth.session_token"].value).toBe("newtoken");
    });

    it("should notify session signal when cookie values change", async () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const mockStore = {
        atoms: { session: null },
        notify: vi.fn(),
      };
      plugin.getActions({}, mockStore as never);

      const fetchPlugin = plugin.fetchPlugins[0];

      const mockContext = {
        response: {
          headers: {
            get: (name: string) =>
              name === "set-cookie"
                ? "better-auth.session_token=newtoken; Path=/"
                : null,
          },
        },
        request: {
          url: new URL("http://api.example.com/auth/session"),
        },
        data: null,
      };

      await fetchPlugin.hooks.onSuccess(mockContext as never);

      expect(mockStore.notify).toHaveBeenCalledWith("$sessionSignal");
    });

    it("should not notify when only expiry changes", async () => {
      const storage = createMockStorage();
      storage.setItem(
        "better-auth_cookie",
        JSON.stringify({
          "better-auth.session_token": {
            value: "sametoken",
            expires: "2025-01-01T00:00:00.000Z",
          },
        })
      );

      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const mockStore = {
        atoms: { session: null },
        notify: vi.fn(),
      };
      plugin.getActions({}, mockStore as never);

      const fetchPlugin = plugin.fetchPlugins[0];

      const mockContext = {
        response: {
          headers: {
            get: (name: string) =>
              name === "set-cookie"
                ? "better-auth.session_token=sametoken; Expires=Wed, 01 Jan 2026 00:00:00 GMT; Path=/"
                : null,
          },
        },
        request: {
          url: new URL("http://api.example.com/auth/session"),
        },
        data: null,
      };

      await fetchPlugin.hooks.onSuccess(mockContext as never);

      expect(mockStore.notify).not.toHaveBeenCalled();
    });

    it("should cache session data for get-session endpoint", async () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const mockStore = {
        atoms: { session: null },
        notify: vi.fn(),
      };
      plugin.getActions({}, mockStore as never);

      const fetchPlugin = plugin.fetchPlugins[0];

      const sessionData = { user: { id: "123", email: "test@test.com" } };
      const mockContext = {
        response: {
          headers: {
            get: () => null,
          },
        },
        request: {
          url: new URL("http://api.example.com/auth/get-session"),
        },
        data: sessionData,
      };

      await fetchPlugin.hooks.onSuccess(mockContext as never);

      const cachedSession = storage.getItem("better-auth_session_data");
      expect(cachedSession).toBe(JSON.stringify(sessionData));
    });

    it("should not cache session data when disableCache is true", async () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
        disableCache: true,
      });

      const mockStore = {
        atoms: { session: null },
        notify: vi.fn(),
      };
      plugin.getActions({}, mockStore as never);

      const fetchPlugin = plugin.fetchPlugins[0];

      const sessionData = { user: { id: "123" } };
      const mockContext = {
        response: {
          headers: {
            get: () => null,
          },
        },
        request: {
          url: new URL("http://api.example.com/auth/get-session"),
        },
        data: sessionData,
      };

      await fetchPlugin.hooks.onSuccess(mockContext as never);

      const cachedSession = storage.getItem("better-auth_session_data");
      expect(cachedSession).toBeNull();
    });

    it("should ignore non-better-auth cookies", async () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const mockStore = {
        atoms: { session: null },
        notify: vi.fn(),
      };
      plugin.getActions({}, mockStore as never);

      const fetchPlugin = plugin.fetchPlugins[0];

      const mockContext = {
        response: {
          headers: {
            get: (name: string) =>
              name === "set-cookie" ? "__cf_bm=cloudflare123; Path=/" : null,
          },
        },
        request: {
          url: new URL("http://api.example.com/auth/session"),
        },
        data: null,
      };

      await fetchPlugin.hooks.onSuccess(mockContext as never);

      // Should not store or notify for non-better-auth cookies
      expect(storage.getItem("better-auth_cookie")).toBeNull();
      expect(mockStore.notify).not.toHaveBeenCalled();
    });
  });

  describe("custom storage prefix", () => {
    it("should use custom storage prefix for cookie storage", () => {
      const storage = createMockStorage();
      storage.setItem(
        "myapp_cookie",
        JSON.stringify({
          "better-auth.session_token": { value: "token123", expires: null },
        })
      );

      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
        storagePrefix: "myapp",
      });

      const actions = plugin.getActions({}, {} as never);
      const cookie = actions.getCookie();
      expect(cookie).toContain("better-auth.session_token=token123");
    });
  });

  describe("custom cookie prefix", () => {
    it("should filter cookies by custom prefix", async () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
        cookiePrefix: "my-app",
      });

      const mockStore = {
        atoms: { session: null },
        notify: vi.fn(),
      };
      plugin.getActions({}, mockStore as never);

      const fetchPlugin = plugin.fetchPlugins[0];

      const mockContext = {
        response: {
          headers: {
            get: (name: string) =>
              name === "set-cookie" ? "my-app.session_token=token123; Path=/" : null,
          },
        },
        request: {
          url: new URL("http://api.example.com/auth/session"),
        },
        data: null,
      };

      await fetchPlugin.hooks.onSuccess(mockContext as never);

      const storedCookie = storage.getItem("better-auth_cookie");
      expect(storedCookie).toBeDefined();
      const parsed = JSON.parse(storedCookie!);
      expect(parsed["my-app.session_token"].value).toBe("token123");
    });
  });
});
