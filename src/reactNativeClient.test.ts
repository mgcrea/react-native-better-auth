import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reactNativeClient } from "./reactNativeClient";
import { setDebugEnabled } from "./utils";

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
    setDebugEnabled(false);
  });

  afterEach(() => {
    setDebugEnabled(false);
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
      expect(plugin.fetchPlugins![0].id).toBe("react-native");
      expect(plugin.fetchPlugins![0].name).toBe("ReactNative");
    });
  });

  describe("getActions", () => {
    it("should expose getCookie action", () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const actions = plugin.getActions!((() => {}) as never, {} as never, {} as never);
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
        }),
      );

      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const actions = plugin.getActions!((() => {}) as never, {} as never, {} as never);
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
        }),
      );

      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const fetchPlugin = plugin.fetchPlugins![0];
      const result = fetchPlugin.init!("http://api.example.com/auth/session", {}) as {
        options?: { headers?: Record<string, string>; credentials?: string };
      };

      expect(result.options?.headers).toHaveProperty("cookie");
      expect(result.options?.headers?.cookie).toContain("better-auth.session_token=token123");
    });

    it("should add Origin header with scheme", () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const fetchPlugin = plugin.fetchPlugins![0];
      const result = fetchPlugin.init!("http://api.example.com/auth/session", {}) as {
        options?: { headers?: Record<string, string> };
      };

      expect(result.options?.headers).toHaveProperty("Origin", "myapp://");
    });

    it("should set credentials to omit", () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const fetchPlugin = plugin.fetchPlugins![0];
      const result = fetchPlugin.init!("http://api.example.com/auth/session", {}) as {
        options?: { credentials?: string };
      };

      expect(result.options?.credentials).toBe("omit");
    });

    it("should clear cookies on sign-out", () => {
      const storage = createMockStorage();
      storage.setItem(
        "better-auth_cookie",
        JSON.stringify({
          "better-auth.session_token": { value: "token123", expires: null },
        }),
      );
      storage.setItem("better-auth_session_data", JSON.stringify({ user: { id: "123" } }));

      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      // Initialize the store first
      plugin.getActions!(
        (() => {}) as never,
        {
          atoms: {
            session: {
              get: () => ({ data: { user: { id: "123" } }, error: null, isPending: false }),
              set: vi.fn(),
            },
          },
          notify: vi.fn(),
        } as never,
        {} as never,
      );

      const fetchPlugin = plugin.fetchPlugins![0];
      fetchPlugin.init!("http://api.example.com/auth/sign-out", {});

      expect(storage.getItem("better-auth_cookie")).toBe("{}");
      expect(storage.getItem("better-auth_session_data")).toBe("{}");
    });
  });

  describe("onSuccess hook", () => {
    it("should store cookies from Set-Cookie header", () => {
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
      plugin.getActions!((() => {}) as never, mockStore as never, {} as never);

      const fetchPlugin = plugin.fetchPlugins![0];

      const mockContext = {
        response: {
          status: 200,
          headers: {
            get: (name: string) =>
              name === "set-cookie" ? "better-auth.session_token=newtoken; Path=/; HttpOnly" : null,
          },
        },
        request: {
          url: new URL("http://api.example.com/auth/session"),
        },
        data: null,
      };

      fetchPlugin.hooks!.onSuccess!(mockContext as never);

      const storedCookie = storage.getItem("better-auth_cookie");
      expect(storedCookie).toBeDefined();
      const parsed = JSON.parse(storedCookie!);
      expect(parsed["better-auth.session_token"].value).toBe("newtoken");
    });

    it("should notify session signal when cookie values change", () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const mockStore = {
        atoms: { session: null },
        notify: vi.fn(),
      };
      plugin.getActions!((() => {}) as never, mockStore as never, {} as never);

      const fetchPlugin = plugin.fetchPlugins![0];

      const mockContext = {
        response: {
          status: 200,
          headers: {
            get: (name: string) =>
              name === "set-cookie" ? "better-auth.session_token=newtoken; Path=/" : null,
          },
        },
        request: {
          url: new URL("http://api.example.com/auth/session"),
        },
        data: null,
      };

      fetchPlugin.hooks!.onSuccess!(mockContext as never);

      expect(mockStore.notify).toHaveBeenCalledWith("$sessionSignal");
    });

    it("should not notify when only expiry changes", () => {
      const storage = createMockStorage();
      storage.setItem(
        "better-auth_cookie",
        JSON.stringify({
          "better-auth.session_token": {
            value: "sametoken",
            expires: "2025-01-01T00:00:00.000Z",
          },
        }),
      );

      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const mockStore = {
        atoms: { session: null },
        notify: vi.fn(),
      };
      plugin.getActions!((() => {}) as never, mockStore as never, {} as never);

      const fetchPlugin = plugin.fetchPlugins![0];

      const mockContext = {
        response: {
          status: 200,
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

      fetchPlugin.hooks!.onSuccess!(mockContext as never);

      expect(mockStore.notify).not.toHaveBeenCalled();
    });

    it("should cache session data for get-session endpoint", () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const mockStore = {
        atoms: { session: null },
        notify: vi.fn(),
      };
      plugin.getActions!((() => {}) as never, mockStore as never, {} as never);

      const fetchPlugin = plugin.fetchPlugins![0];

      const sessionData = { user: { id: "123", email: "test@test.com" } };
      const mockContext = {
        response: {
          status: 200,
          headers: {
            get: () => null,
          },
        },
        request: {
          url: new URL("http://api.example.com/auth/get-session"),
        },
        data: sessionData,
      };

      fetchPlugin.hooks!.onSuccess!(mockContext as never);

      const cachedSession = storage.getItem("better-auth_session_data");
      expect(cachedSession).toBe(JSON.stringify(sessionData));
    });

    it("should not cache session data when disableCache is true", () => {
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
      plugin.getActions!((() => {}) as never, mockStore as never, {} as never);

      const fetchPlugin = plugin.fetchPlugins![0];

      const sessionData = { user: { id: "123" } };
      const mockContext = {
        response: {
          status: 200,
          headers: {
            get: () => null,
          },
        },
        request: {
          url: new URL("http://api.example.com/auth/get-session"),
        },
        data: sessionData,
      };

      fetchPlugin.hooks!.onSuccess!(mockContext as never);

      const cachedSession = storage.getItem("better-auth_session_data");
      expect(cachedSession).toBeNull();
    });

    it("should ignore non-better-auth cookies", () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const mockStore = {
        atoms: { session: null },
        notify: vi.fn(),
      };
      plugin.getActions!((() => {}) as never, mockStore as never, {} as never);

      const fetchPlugin = plugin.fetchPlugins![0];

      const mockContext = {
        response: {
          status: 200,
          headers: {
            get: (name: string) => (name === "set-cookie" ? "__cf_bm=cloudflare123; Path=/" : null),
          },
        },
        request: {
          url: new URL("http://api.example.com/auth/session"),
        },
        data: null,
      };

      fetchPlugin.hooks!.onSuccess!(mockContext as never);

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
        }),
      );

      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
        storagePrefix: "myapp",
      });

      const actions = plugin.getActions!((() => {}) as never, {} as never, {} as never);
      const cookie = actions.getCookie();
      expect(cookie).toContain("better-auth.session_token=token123");
    });
  });

  describe("custom cookie prefix", () => {
    it("should filter cookies by custom prefix", () => {
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
      plugin.getActions!((() => {}) as never, mockStore as never, {} as never);

      const fetchPlugin = plugin.fetchPlugins![0];

      const mockContext = {
        response: {
          status: 200,
          headers: {
            get: (name: string) => (name === "set-cookie" ? "my-app.session_token=token123; Path=/" : null),
          },
        },
        request: {
          url: new URL("http://api.example.com/auth/session"),
        },
        data: null,
      };

      fetchPlugin.hooks!.onSuccess!(mockContext as never);

      const storedCookie = storage.getItem("better-auth_cookie");
      expect(storedCookie).toBeDefined();
      const parsed = JSON.parse(storedCookie!);
      expect(parsed["my-app.session_token"].value).toBe("token123");
    });
  });

  describe("debug option", () => {
    it("should enable debug logging when debug is true", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const storage = createMockStorage();

      reactNativeClient({
        scheme: "myapp",
        storage,
        debug: true,
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should not log when debug is false", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const storage = createMockStorage();

      reactNativeClient({
        scheme: "myapp",
        storage,
        debug: false,
      });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("onError hook", () => {
    it("should have onError hook defined", () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const fetchPlugin = plugin.fetchPlugins![0];
      expect(fetchPlugin.hooks?.onError).toBeDefined();
      expect(typeof fetchPlugin.hooks?.onError).toBe("function");
    });

    it("should handle 401 errors without throwing", () => {
      const storage = createMockStorage();
      const plugin = reactNativeClient({
        scheme: "myapp",
        storage,
      });

      const fetchPlugin = plugin.fetchPlugins![0];

      const mockContext = {
        request: {
          url: new URL("http://api.example.com/auth/session"),
        },
        response: {
          status: 401,
        },
        error: new Error("Unauthorized"),
      };

      // Should not throw
      expect(() => fetchPlugin.hooks!.onError!(mockContext as never)).not.toThrow();
    });
  });
});
