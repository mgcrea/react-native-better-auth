import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    alias: {
      "react-native": new URL("./test/mocks/react-native.ts", import.meta.url).pathname,
      "better-auth/client": new URL("./test/mocks/better-auth-client.ts", import.meta.url).pathname,
    },
  },
});
