import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCookie, getSetCookie, storageAdapter } from "./storage";

describe("getSetCookie", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should parse cookie and store with expiry", () => {
    const header = "session=abc123; Expires=Wed, 01 Jan 2025 12:00:00 GMT";
    const result = getSetCookie(header);
    const parsed = JSON.parse(result);
    expect(parsed.session).toEqual({
      value: "abc123",
      expires: "2025-01-01T12:00:00.000Z",
    });
  });

  it("should calculate expiry from Max-Age", () => {
    const header = "session=abc123; Max-Age=3600";
    const result = getSetCookie(header);
    const parsed = JSON.parse(result);
    expect(parsed.session).toEqual({
      value: "abc123",
      expires: "2025-01-01T01:00:00.000Z", // 1 hour later
    });
  });

  it("should store cookie without expiry when not provided", () => {
    const header = "session=abc123";
    const result = getSetCookie(header);
    const parsed = JSON.parse(result);
    expect(parsed.session).toEqual({
      value: "abc123",
      expires: null,
    });
  });

  it("should merge with previous cookies", () => {
    const prevCookie = JSON.stringify({
      existingCookie: { value: "existing", expires: null },
    });
    const header = "newCookie=newValue";
    const result = getSetCookie(header, prevCookie);
    const parsed = JSON.parse(result);
    expect(parsed.existingCookie).toEqual({ value: "existing", expires: null });
    expect(parsed.newCookie).toEqual({ value: "newValue", expires: null });
  });

  it("should overwrite existing cookie with same name", () => {
    const prevCookie = JSON.stringify({
      session: { value: "old", expires: null },
    });
    const header = "session=new";
    const result = getSetCookie(header, prevCookie);
    const parsed = JSON.parse(result);
    expect(parsed.session.value).toBe("new");
  });

  it("should handle invalid previous cookie JSON", () => {
    const prevCookie = "invalid json";
    const header = "session=abc123";
    const result = getSetCookie(header, prevCookie);
    const parsed = JSON.parse(result);
    expect(parsed.session).toEqual({ value: "abc123", expires: null });
  });

  it("should parse multiple cookies from header", () => {
    const header =
      "better-auth.session_token=token123; Path=/, better-auth.session_data=data456; Path=/";
    const result = getSetCookie(header);
    const parsed = JSON.parse(result);
    expect(parsed["better-auth.session_token"].value).toBe("token123");
    expect(parsed["better-auth.session_data"].value).toBe("data456");
  });
});

describe("getCookie", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return cookie string for valid cookies", () => {
    const stored = JSON.stringify({
      session: { value: "abc123", expires: "2025-01-02T00:00:00.000Z" },
    });
    const result = getCookie(stored);
    expect(result).toBe("; session=abc123");
  });

  it("should filter out expired cookies", () => {
    const stored = JSON.stringify({
      expired: { value: "old", expires: "2025-01-01T00:00:00.000Z" }, // expired
      valid: { value: "new", expires: "2025-01-02T00:00:00.000Z" }, // valid
    });
    const result = getCookie(stored);
    expect(result).not.toContain("expired=old");
    expect(result).toContain("valid=new");
  });

  it("should include cookies without expiry", () => {
    const stored = JSON.stringify({
      session: { value: "abc123", expires: null },
    });
    const result = getCookie(stored);
    expect(result).toBe("; session=abc123");
  });

  it("should handle empty cookie storage", () => {
    const result = getCookie("{}");
    expect(result).toBe("");
  });

  it("should handle invalid JSON", () => {
    const result = getCookie("invalid json");
    expect(result).toBe("");
  });

  it("should concatenate multiple cookies", () => {
    const stored = JSON.stringify({
      cookie1: { value: "value1", expires: null },
      cookie2: { value: "value2", expires: null },
    });
    const result = getCookie(stored);
    expect(result).toContain("cookie1=value1");
    expect(result).toContain("cookie2=value2");
  });
});

describe("storageAdapter", () => {
  it("should normalize colons to underscores in key names", () => {
    const storage = new Map<string, string>();
    const adapter = storageAdapter({
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    });

    adapter.setItem("better-auth:session_token", "value123");

    expect(storage.has("better-auth_session_token")).toBe(true);
    expect(storage.has("better-auth:session_token")).toBe(false);
  });

  it("should retrieve with normalized key name", () => {
    const storage = new Map<string, string>();
    storage.set("better-auth_session_token", "value123");

    const adapter = storageAdapter({
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    });

    const result = adapter.getItem("better-auth:session_token");
    expect(result).toBe("value123");
  });

  it("should handle keys without colons", () => {
    const storage = new Map<string, string>();
    const adapter = storageAdapter({
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    });

    adapter.setItem("normal_key", "value");
    expect(storage.get("normal_key")).toBe("value");
  });
});
