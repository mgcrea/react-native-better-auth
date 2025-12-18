export const kFocusManager = Symbol.for("betterAuth.focusManager");

export type FocusListener = (focused: boolean) => void;

export interface FocusManager {
  subscribe: (listener: FocusListener) => () => void;
  setFocused: (focused: boolean) => void;
}

export interface ClientStore {
  atoms: {
    session?: {
      get: () => { data: unknown; error: unknown; isPending: boolean };
      set: (value: { data: unknown; error: unknown; isPending: boolean }) => void;
    };
  };
  notify: (signal: string) => void;
}

export interface BetterAuthClientPlugin {
  id: string;
  getActions?: (client: unknown, store: ClientStore) => Record<string, (...args: unknown[]) => unknown>;
  fetchPlugins?: Array<{
    id: string;
    name: string;
    hooks?: {
      onSuccess?: (context: unknown) => Promise<void>;
    };
    init?: (url: string, options: Record<string, unknown>) => { url: string; options: Record<string, unknown> };
  }>;
}
