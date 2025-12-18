import { vi } from "vitest";

export type AppStateStatus = "active" | "background" | "inactive" | "unknown" | "extension";

export const AppState = {
  addEventListener: vi.fn(() => ({
    remove: vi.fn(),
  })),
  removeEventListener: vi.fn(),
  currentState: "active" as AppStateStatus,
};

export const Platform = {
  OS: "android" as "ios" | "android" | "web" | "windows" | "macos",
  select: vi.fn((options: Record<string, unknown>) => options.android ?? options.default),
};
