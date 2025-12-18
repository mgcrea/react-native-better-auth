<!-- markdownlint-disable MD033 -->
<p align="center">
  <a href="https://github.com/mgcrea/react-native-better-auth">
    <img src="https://better-auth.com/logo.png" alt="logo" height="128"/>
  </a>
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@mgcrea/react-native-better-auth">
    <img src="https://img.shields.io/npm/v/@mgcrea/react-native-better-auth.svg?style=for-the-badge" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/@mgcrea/react-native-better-auth">
    <img src="https://img.shields.io/npm/dt/@mgcrea/react-native-better-auth.svg?style=for-the-badge" alt="npm total downloads" />
  </a>
  <a href="https://www.npmjs.com/package/@mgcrea/react-native-better-auth">
    <img src="https://img.shields.io/npm/dm/@mgcrea/react-native-better-auth.svg?style=for-the-badge" alt="npm monthly downloads" />
  </a>
  <a href="https://www.npmjs.com/package/@mgcrea/react-native-better-auth">
    <img src="https://img.shields.io/npm/l/@mgcrea/react-native-better-auth.svg?style=for-the-badge" alt="npm license" />
  </a>
  <br />
  <a href="https://github.com/mgcrea/react-native-better-auth/actions/workflows/main.yaml">
    <img src="https://img.shields.io/github/actions/workflow/status/mgcrea/react-native-better-auth/main.yaml?style=for-the-badge&branch=main" alt="build status" />
  </a>
</p>
<!-- markdownlint-enable MD033 -->

## Overview

A React Native client plugin for [Better Auth](https://github.com/better-auth/better-auth)

## Features

- **🔐 Session Persistence** - Stores session cookies locally with expiry tracking
- **🔄 Automatic Cookie Management** - Intercepts requests to attach cookies and captures `Set-Cookie` headers
- **📱 Focus Refresh** - Automatically refreshes sessions when app returns to foreground
- **🗄️ Flexible Storage** - Works with any synchronous storage adapter (MMKV, etc.)
- **📝 TypeScript-first** - Full type safety and autocomplete support
- **🔧 No Expo Dependencies** - Works with bare React Native projects
- **✅ Well Tested** - Comprehensive test coverage

> **Note:** This library is designed for bare React Native apps. For Expo projects, use the official [@better-auth/expo](https://www.npmjs.com/package/@better-auth/expo) package.

## Quick Start

### Installation

```bash
npm install @mgcrea/react-native-better-auth
# or
pnpm add @mgcrea/react-native-better-auth
# or
yarn add @mgcrea/react-native-better-auth
```

### Requirements

- React Native 0.76.0+
- better-auth 1.4.7+

### Basic Usage

```typescript
import { createAuthClient } from "better-auth/react";
import { reactNativeClient } from "@mgcrea/react-native-better-auth";
import { MMKV } from "react-native-mmkv";

// Create MMKV storage adapter
const storage = new MMKV();
const mmkvStorage = {
  getItem: (key: string): string | null => storage.getString(key) ?? null,
  setItem: (key: string, value: string): void => storage.set(key, value),
};

// Create auth client
export const authClient = createAuthClient({
  baseURL: "https://api.example.com",
  plugins: [
    reactNativeClient({
      scheme: "myapp", // Your app's URL scheme
      storage: mmkvStorage, // Storage adapter
      storagePrefix: "myapp", // Optional: prefix for storage keys
    }),
  ],
});
```

### Using the Auth Client

```typescript
// Sign up
await authClient.signUp.email({
  email: "user@example.com",
  password: "securepassword",
  name: "John Doe",
});

// Sign in
await authClient.signIn.email({
  email: "user@example.com",
  password: "securepassword",
});

// Get session
const { data: session } = await authClient.getSession();

// Sign out
await authClient.signOut();
```

## How It Works

1. **Stores session cookies locally** in your chosen storage with expiry tracking
2. **Intercepts fetch requests** to attach stored cookies automatically
3. **Captures `Set-Cookie` headers** from server responses
4. **Refreshes sessions on app focus** via React Native's AppState
5. **Clears cookies on sign-out** and resets session state

## Configuration

### Options

| Option          | Type                 | Default         | Description                              |
| --------------- | -------------------- | --------------- | ---------------------------------------- |
| `scheme`        | `string`             | **Required**    | App URL scheme for deep linking          |
| `storage`       | `StorageAdapter`     | **Required**    | Storage adapter with `getItem`/`setItem` |
| `storagePrefix` | `string`             | `"better-auth"` | Prefix for storage keys                  |
| `cookiePrefix`  | `string \| string[]` | `"better-auth"` | Cookie name prefix(es) to capture        |
| `disableCache`  | `boolean`            | `false`         | Disable local session caching            |

### Storage Adapter Interface

```typescript
interface StorageAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}
```

### MMKV Storage (Recommended)

```typescript
import { MMKV } from "react-native-mmkv";

const storage = new MMKV();

export const mmkvStorage = {
  getItem: (key: string): string | null => storage.getString(key) ?? null,
  setItem: (key: string, value: string): void => storage.set(key, value),
};
```

## Differences from Expo Client

| Feature           | Expo Client         | React Native Client                 |
| ----------------- | ------------------- | ----------------------------------- |
| Storage           | `expo-secure-store` | Any sync storage (MMKV recommended) |
| Scheme detection  | `expo-constants`    | Manual (required option)            |
| Browser OAuth     | `expo-web-browser`  | Removed (use native SDKs)           |
| Network detection | `expo-network`      | Removed                             |

## Authors

- [Olivier Louvignes](https://github.com/mgcrea) - [@mgcrea](https://twitter.com/mgcrea)

## Credits

- [Better Auth](https://github.com/better-auth/better-auth) - The authentication framework
- [React Native](https://reactnative.dev/) - Build native apps using React

```text
MIT License

Copyright (c) 2025 Olivier Louvignes <olivier@mgcrea.io>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
