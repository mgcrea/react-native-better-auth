/**
 * Cookie attributes parsed from Set-Cookie header
 */
export interface CookieAttributes {
  value: string;
  expires?: Date | undefined;
  "max-age"?: number | undefined;
  domain?: string | undefined;
  path?: string | undefined;
  secure?: boolean | undefined;
  httpOnly?: boolean | undefined;
  sameSite?: ("Strict" | "Lax" | "None") | undefined;
}

/**
 * Split a Set-Cookie header into individual cookies.
 * Handles the edge case where Expires dates contain commas (e.g., "Wed, 21 Oct 2015").
 */
export function splitSetCookieHeader(setCookie: string): string[] {
  const parts: string[] = [];
  let buffer = "";
  let i = 0;
  while (i < setCookie.length) {
    const char = setCookie[i];
    if (char === ",") {
      const recent = buffer.toLowerCase();
      const hasExpires = recent.includes("expires=");
      const hasGmt = /gmt/i.test(recent);
      if (hasExpires && !hasGmt) {
        buffer += char;
        i += 1;
        continue;
      }
      if (buffer.trim().length > 0) {
        parts.push(buffer.trim());
        buffer = "";
      }
      i += 1;
      if (setCookie[i] === " ") i += 1;
      continue;
    }
    buffer += char;
    i += 1;
  }
  if (buffer.trim().length > 0) {
    parts.push(buffer.trim());
  }
  return parts;
}

/**
 * Parse a Set-Cookie header string into a Map of cookie names to attributes.
 */
export function parseSetCookieHeader(header: string): Map<string, CookieAttributes> {
  const cookieMap = new Map<string, CookieAttributes>();
  const cookies = splitSetCookieHeader(header);
  cookies.forEach((cookie) => {
    const parts = cookie.split(";").map((p) => p.trim());
    const [nameValue, ...attributes] = parts;
    const [name, ...valueParts] = nameValue!.split("=");
    const value = valueParts.join("=");
    const cookieObj: CookieAttributes = { value };
    attributes.forEach((attr) => {
      const [attrName, ...attrValueParts] = attr.split("=");
      const attrValue = attrValueParts.join("=");
      cookieObj[attrName!.toLowerCase() as "value"] = attrValue;
    });
    cookieMap.set(name!, cookieObj);
  });
  return cookieMap;
}
