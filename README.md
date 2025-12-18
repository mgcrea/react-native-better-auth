# @mgcrea/react-native-better-auth

A React Native client plugin for [Better Auth](https://github.com/better-auth/better-auth), adapted from the official Expo client to work with bare React Native apps.

## Installation

```bash
pnpm add @mgcrea/react-native-better-auth
```

## Usage

```typescript
import { createAuthClient } from "better-auth/react";
import { reactNativeClient } from "@mgcrea/react-native-better-auth";

// Create your storage adapter (see examples below)
const storage = {
  getItem: (key: string): string | null => { /* ... */ },
  setItem: (key: string, value: string): void => { /* ... */ },
};

export const authClient = createAuthClient({
  baseURL: "https://api.example.com",
  plugins: [
    reactNativeClient({
      scheme: "myapp",        // Your app's URL scheme
      storage,                // Storage adapter
      storagePrefix: "myapp", // Optional: prefix for storage keys
    }),
  ],
});
```

## Storage Adapters

### MMKV (Recommended)

```typescript
import { MMKV } from "react-native-mmkv";

const storage = new MMKV();

export const mmkvStorage = {
  getItem: (key: string): string | null => storage.getString(key) ?? null,
  setItem: (key: string, value: string): void => storage.set(key, value),
};
```

### AsyncStorage

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";

// Note: AsyncStorage is async, but the plugin expects sync methods.
// Consider using MMKV for better compatibility.
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scheme` | `string` | **Required** | App URL scheme for deep linking |
| `storage` | `StorageAdapter` | **Required** | Storage adapter with `getItem`/`setItem` |
| `storagePrefix` | `string` | `"better-auth"` | Prefix for storage keys |
| `cookiePrefix` | `string \| string[]` | `"better-auth"` | Cookie name prefix(es) to capture |
| `disableCache` | `boolean` | `false` | Disable local session caching |

## How It Works

1. **Stores session cookies locally** with expiry tracking
2. **Intercepts fetch requests** to attach stored cookies
3. **Captures `Set-Cookie` headers** from server responses
4. **Refreshes sessions on app focus** via the focus manager
5. **Clears cookies on sign-out**

## Differences from Expo Client

| Feature | Expo Client | React Native Client |
|---------|-------------|---------------------|
| Storage | `expo-secure-store` | Any sync storage (MMKV recommended) |
| Scheme detection | `expo-constants` | Manual (required option) |
| Browser OAuth | `expo-web-browser` | Removed (use native SDKs) |
| Network detection | `expo-network` | Removed |

## License

MIT
