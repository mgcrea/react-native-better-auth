import { describe, expect, it } from "vitest";
import { parseSetCookieHeader, splitSetCookieHeader } from "./parser";

describe("splitSetCookieHeader", () => {
  it("should split single cookie", () => {
    const header = "session=abc123; Path=/";
    const result = splitSetCookieHeader(header);
    expect(result).toEqual(["session=abc123; Path=/"]);
  });

  it("should split multiple cookies separated by comma", () => {
    const header = "cookie1=value1; Path=/, cookie2=value2; Path=/";
    const result = splitSetCookieHeader(header);
    expect(result).toEqual(["cookie1=value1; Path=/", "cookie2=value2; Path=/"]);
  });

  it("should handle commas in Expires dates correctly", () => {
    const header =
      "better-auth.session_token=abc; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/, better-auth.session_data=xyz; Expires=Thu, 22 Oct 2015 07:28:00 GMT; Path=/";
    const result = splitSetCookieHeader(header);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("better-auth.session_token=abc; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Path=/");
    expect(result[1]).toBe("better-auth.session_data=xyz; Expires=Thu, 22 Oct 2015 07:28:00 GMT; Path=/");
  });

  it("should handle empty string", () => {
    const result = splitSetCookieHeader("");
    expect(result).toEqual([]);
  });

  it("should trim whitespace around cookies", () => {
    const header = "  cookie1=value1; Path=/  ,  cookie2=value2; Path=/  ";
    const result = splitSetCookieHeader(header);
    expect(result).toEqual(["cookie1=value1; Path=/", "cookie2=value2; Path=/"]);
  });
});

describe("parseSetCookieHeader", () => {
  it("should parse a simple cookie", () => {
    const header = "session=abc123";
    const result = parseSetCookieHeader(header);
    expect(result.get("session")).toEqual({ value: "abc123" });
  });

  it("should parse cookie with attributes", () => {
    const header = "session=abc123; Path=/; HttpOnly; Secure";
    const result = parseSetCookieHeader(header);
    expect(result.get("session")).toMatchObject({
      value: "abc123",
      path: "/",
      httponly: "",
      secure: "",
    });
  });

  it("should parse cookie with Expires date", () => {
    const header = "session=abc123; Expires=Wed, 21 Oct 2015 07:28:00 GMT";
    const result = parseSetCookieHeader(header);
    expect(result.get("session")).toMatchObject({
      value: "abc123",
      expires: "Wed, 21 Oct 2015 07:28:00 GMT",
    });
  });

  it("should parse cookie with Max-Age", () => {
    const header = "session=abc123; Max-Age=3600";
    const result = parseSetCookieHeader(header);
    expect(result.get("session")).toMatchObject({
      value: "abc123",
      "max-age": "3600",
    });
  });

  it("should parse multiple cookies", () => {
    const header =
      "better-auth.session_token=abc; Path=/, better-auth.session_data=xyz; Path=/";
    const result = parseSetCookieHeader(header);
    expect(result.get("better-auth.session_token")?.value).toBe("abc");
    expect(result.get("better-auth.session_data")?.value).toBe("xyz");
  });

  it("should handle cookie values with equals signs", () => {
    const header = "token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0=";
    const result = parseSetCookieHeader(header);
    expect(result.get("token")?.value).toBe(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0="
    );
  });

  it("should parse SameSite attribute", () => {
    const header = "session=abc123; SameSite=Strict";
    const result = parseSetCookieHeader(header);
    expect(result.get("session")).toMatchObject({
      value: "abc123",
      samesite: "Strict",
    });
  });

  it("should parse Domain attribute", () => {
    const header = "session=abc123; Domain=example.com";
    const result = parseSetCookieHeader(header);
    expect(result.get("session")).toMatchObject({
      value: "abc123",
      domain: "example.com",
    });
  });
});
