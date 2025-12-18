import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppState } from "react-native";
import { kFocusManager } from "better-auth/client";
import { setupFocusManager } from "./focusManager";

describe("focusManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the global focus manager before each test
    const global = globalThis as Record<symbol, unknown>;
    delete global[kFocusManager];
  });

  afterEach(() => {
    const global = globalThis as Record<symbol, unknown>;
    delete global[kFocusManager];
  });

  describe("setupFocusManager", () => {
    it("should create a focus manager and register it globally", () => {
      const manager = setupFocusManager();
      expect(manager).toBeDefined();
      expect(typeof manager.subscribe).toBe("function");
      expect(typeof manager.setFocused).toBe("function");
    });

    it("should return the same manager on subsequent calls (singleton)", () => {
      const manager1 = setupFocusManager();
      const manager2 = setupFocusManager();
      expect(manager1).toBe(manager2);
    });

    it("should store the manager in globalThis", () => {
      setupFocusManager();
      const global = globalThis as Record<symbol, unknown>;
      expect(global[kFocusManager]).toBeDefined();
    });
  });

  describe("FocusManager", () => {
    it("should allow subscribing to focus events", () => {
      const manager = setupFocusManager();
      const listener = vi.fn();

      const unsubscribe = manager.subscribe(listener);

      expect(typeof unsubscribe).toBe("function");
    });

    it("should call listener when setFocused is called", () => {
      const manager = setupFocusManager();
      const listener = vi.fn();

      manager.subscribe(listener);
      manager.setFocused(true);

      expect(listener).toHaveBeenCalledWith(true);
    });

    it("should call listener with false when unfocused", () => {
      const manager = setupFocusManager();
      const listener = vi.fn();

      manager.subscribe(listener);
      manager.setFocused(false);

      expect(listener).toHaveBeenCalledWith(false);
    });

    it("should support multiple listeners", () => {
      const manager = setupFocusManager();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      manager.subscribe(listener1);
      manager.subscribe(listener2);
      manager.setFocused(true);

      expect(listener1).toHaveBeenCalledWith(true);
      expect(listener2).toHaveBeenCalledWith(true);
    });

    it("should remove listener on unsubscribe", () => {
      const manager = setupFocusManager();
      const listener = vi.fn();

      const unsubscribe = manager.subscribe(listener);
      unsubscribe();
      manager.setFocused(true);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("AppState integration", () => {
    it("should setup AppState listener when setup() is called", () => {
      // Access the manager's setup method through the instance
      const manager = setupFocusManager() as {
        subscribe: (listener: (focused: boolean) => void) => () => void;
        setFocused: (focused: boolean) => void;
        setup: () => () => void;
      };

      // Call setup if it exists
      if (typeof manager.setup === "function") {
        manager.setup();
        expect(AppState.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
      }
    });
  });
});
