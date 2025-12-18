import { describe, expect, it } from "vitest";
import { hasBetterAuthCookies, hasSessionCookieChanged, normalizeCookieName } from "./utils";

describe("hasSessionCookieChanged", () => {
  it("should return true when previous cookie is null", () => {
    const newCookie = JSON.stringify({
      "better-auth.session_token": { value: "abc", expires: null },
    });
    expect(hasSessionCookieChanged(null, newCookie)).toBe(true);
  });

  it("should return false when session values are the same", () => {
    const prevCookie = JSON.stringify({
      "better-auth.session_token": { value: "abc", expires: "2025-01-01T00:00:00.000Z" },
    });
    const newCookie = JSON.stringify({
      "better-auth.session_token": { value: "abc", expires: "2025-01-02T00:00:00.000Z" },
    });
    expect(hasSessionCookieChanged(prevCookie, newCookie)).toBe(false);
  });

  it("should return true when session token value changes", () => {
    const prevCookie = JSON.stringify({
      "better-auth.session_token": { value: "old", expires: null },
    });
    const newCookie = JSON.stringify({
      "better-auth.session_token": { value: "new", expires: null },
    });
    expect(hasSessionCookieChanged(prevCookie, newCookie)).toBe(true);
  });

  it("should return true when session data value changes", () => {
    const prevCookie = JSON.stringify({
      "better-auth.session_data": { value: "old", expires: null },
    });
    const newCookie = JSON.stringify({
      "better-auth.session_data": { value: "new", expires: null },
    });
    expect(hasSessionCookieChanged(prevCookie, newCookie)).toBe(true);
  });

  it("should return true when a new session key appears", () => {
    const prevCookie = JSON.stringify({
      "better-auth.session_token": { value: "token", expires: null },
    });
    const newCookie = JSON.stringify({
      "better-auth.session_token": { value: "token", expires: null },
      "better-auth.session_data": { value: "data", expires: null },
    });
    expect(hasSessionCookieChanged(prevCookie, newCookie)).toBe(true);
  });

  it("should return true when a session key is removed", () => {
    const prevCookie = JSON.stringify({
      "better-auth.session_token": { value: "token", expires: null },
      "better-auth.session_data": { value: "data", expires: null },
    });
    const newCookie = JSON.stringify({
      "better-auth.session_token": { value: "token", expires: null },
    });
    expect(hasSessionCookieChanged(prevCookie, newCookie)).toBe(true);
  });

  it("should ignore non-session cookies", () => {
    const prevCookie = JSON.stringify({
      "better-auth.session_token": { value: "token", expires: null },
      "better-auth.other_cookie": { value: "old", expires: null },
    });
    const newCookie = JSON.stringify({
      "better-auth.session_token": { value: "token", expires: null },
      "better-auth.other_cookie": { value: "new", expires: null },
    });
    expect(hasSessionCookieChanged(prevCookie, newCookie)).toBe(false);
  });

  it("should return true for invalid JSON", () => {
    expect(hasSessionCookieChanged("invalid", "{}")).toBe(true);
    expect(hasSessionCookieChanged("{}", "invalid")).toBe(true);
  });
});

describe("hasBetterAuthCookies", () => {
  describe("with string prefix", () => {
    it("should return true for better-auth session_token", () => {
      const header = "better-auth.session_token=abc; Path=/";
      expect(hasBetterAuthCookies(header, "better-auth")).toBe(true);
    });

    it("should return true for better-auth session_data", () => {
      const header = "better-auth.session_data=xyz; Path=/";
      expect(hasBetterAuthCookies(header, "better-auth")).toBe(true);
    });

    it("should return true for __Secure- prefixed cookies", () => {
      const header = "__Secure-better-auth.session_token=abc; Path=/";
      expect(hasBetterAuthCookies(header, "better-auth")).toBe(true);
    });

    it("should return false for non-better-auth cookies", () => {
      const header = "__cf_bm=abc123; Path=/; HttpOnly; Secure";
      expect(hasBetterAuthCookies(header, "better-auth")).toBe(false);
    });

    it("should return true for mixed headers containing better-auth cookies", () => {
      const header =
        "__cf_bm=abc123; Path=/; HttpOnly; Secure, better-auth.session_token=xyz; Path=/";
      expect(hasBetterAuthCookies(header, "better-auth")).toBe(true);
    });

    it("should handle custom prefixes", () => {
      const header = "my-app.session_token=abc; Path=/";
      expect(hasBetterAuthCookies(header, "my-app")).toBe(true);
      expect(hasBetterAuthCookies(header, "better-auth")).toBe(false);
    });

    it("should return true for passkey cookies", () => {
      const header = "better-auth-passkey=xyz; Path=/";
      expect(hasBetterAuthCookies(header, "better-auth")).toBe(true);
    });

    it("should return true for __Secure- passkey cookies", () => {
      const header = "__Secure-better-auth-passkey=xyz; Path=/";
      expect(hasBetterAuthCookies(header, "better-auth")).toBe(true);
    });

    it("should return true for any cookie starting with prefix", () => {
      const header = "better-auth.other_cookie=abc; Path=/";
      expect(hasBetterAuthCookies(header, "better-auth")).toBe(true);
    });
  });

  describe("with empty prefix", () => {
    it("should match cookies ending with session_token", () => {
      const header = "session_token=abc; Path=/";
      expect(hasBetterAuthCookies(header, "")).toBe(true);
    });

    it("should match cookies ending with session_data", () => {
      const header = "session_data=xyz; Path=/";
      expect(hasBetterAuthCookies(header, "")).toBe(true);
    });

    it("should match custom_session_token", () => {
      const header = "my_custom_session_token=abc; Path=/";
      expect(hasBetterAuthCookies(header, "")).toBe(true);
    });

    it("should not match unrelated cookies", () => {
      const header = "__cf_bm=abc123; Path=/";
      expect(hasBetterAuthCookies(header, "")).toBe(false);
    });
  });

  describe("with array of prefixes", () => {
    it("should match any prefix in array", () => {
      const betterAuthHeader = "better-auth.session_token=abc; Path=/";
      expect(hasBetterAuthCookies(betterAuthHeader, ["better-auth", "my-app"])).toBe(true);

      const myAppHeader = "my-app.session_data=xyz; Path=/";
      expect(hasBetterAuthCookies(myAppHeader, ["better-auth", "my-app"])).toBe(true);
    });

    it("should return false when no prefix matches", () => {
      const header = "other-app.session_token=def; Path=/";
      expect(hasBetterAuthCookies(header, ["better-auth", "my-app"])).toBe(false);
    });

    it("should handle passkey cookies with array prefixes", () => {
      const header1 = "better-auth-passkey=xyz; Path=/";
      expect(hasBetterAuthCookies(header1, ["better-auth", "my-app"])).toBe(true);

      const header2 = "my-app-passkey=xyz; Path=/";
      expect(hasBetterAuthCookies(header2, ["better-auth", "my-app"])).toBe(true);
    });

    it("should handle __Secure- prefix with array", () => {
      const header = "__Secure-my-app.session_token=abc; Path=/";
      expect(hasBetterAuthCookies(header, ["better-auth", "my-app"])).toBe(true);
    });

    it("should handle empty string in array (suffix matching)", () => {
      const header = "session_token=abc; Path=/";
      expect(hasBetterAuthCookies(header, [])).toBe(false);
      expect(hasBetterAuthCookies(header, [""])).toBe(true);
    });
  });
});

describe("normalizeCookieName", () => {
  it("should replace colons with underscores", () => {
    expect(normalizeCookieName("better-auth:session_token")).toBe("better-auth_session_token");
  });

  it("should handle multiple colons", () => {
    expect(normalizeCookieName("a:b:c")).toBe("a_b_c");
  });

  it("should not modify names without colons", () => {
    expect(normalizeCookieName("better-auth_session_token")).toBe("better-auth_session_token");
  });

  it("should handle empty string", () => {
    expect(normalizeCookieName("")).toBe("");
  });
});
