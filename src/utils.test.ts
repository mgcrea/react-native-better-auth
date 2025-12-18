import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isDebugEnabled, log, setDebugEnabled } from "./utils";

describe("utils", () => {
  beforeEach(() => {
    // Reset debug state before each test
    setDebugEnabled(false);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("setDebugEnabled", () => {
    it("should enable debug mode", () => {
      setDebugEnabled(true);
      expect(isDebugEnabled()).toBe(true);
    });

    it("should disable debug mode", () => {
      setDebugEnabled(true);
      setDebugEnabled(false);
      expect(isDebugEnabled()).toBe(false);
    });
  });

  describe("isDebugEnabled", () => {
    it("should return false by default", () => {
      expect(isDebugEnabled()).toBe(false);
    });
  });

  describe("log", () => {
    it("should not log when debug is disabled", () => {
      setDebugEnabled(false);
      log("test message");
      expect(console.log).not.toHaveBeenCalled();
    });

    it("should log when debug is enabled", () => {
      setDebugEnabled(true);
      log("test message");
      expect(console.log).toHaveBeenCalledWith("[react-native-better-auth]", "test message");
    });

    it("should log with data when provided", () => {
      setDebugEnabled(true);
      log("test message", { key: "value" });
      expect(console.log).toHaveBeenCalledWith("[react-native-better-auth]", "test message", {
        key: "value",
      });
    });

    it("should not log data when debug is disabled", () => {
      setDebugEnabled(false);
      log("test message", { key: "value" });
      expect(console.log).not.toHaveBeenCalled();
    });
  });
});
