/**
 * Cookie attributes parsed from Set-Cookie header.
 * Note: All attributes are stored as strings as parsed from the header.
 * Consumers should convert expires/max-age to proper types when needed.
 */
export type CookieAttributes = {
  value: string;
  expires?: string;
  "max-age"?: string;
  domain?: string;
  path?: string;
  secure?: string;
  httponly?: string;
  samesite?: string;
};

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
    if (!nameValue) return;
    const [name, ...valueParts] = nameValue.split("=");
    if (!name) return;
    const value = valueParts.join("=");
    const cookieObj: CookieAttributes = { value };
    attributes.forEach((attr) => {
      const [attrName, ...attrValueParts] = attr.split("=");
      if (!attrName) return;
      const attrValue = attrValueParts.join("=");
      cookieObj[attrName.toLowerCase() as "value"] = attrValue;
    });
    cookieMap.set(name, cookieObj);
  });
  return cookieMap;
}
