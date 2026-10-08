import { defineConfig } from "vitest/config";

export default defineConfig({
  // The vendored React Bits components are JSX files without a React import.
  esbuild: { jsx: "automatic" },
  test: {
    name: "ui",
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
});
