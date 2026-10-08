import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import { reactBits } from "@terminal-trainer/ui/vite-plugins";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

export default defineConfig({
  // The vendored React Bits components are JSX files without a React import.
  esbuild: { jsx: "automatic" },
  // Relative base: works inside the native app bundle and under a sub-path on the web.
  base: "./",
  build: { target: "es2022" },
  plugins: [reactBits()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  test: {
    name: "mobile",
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
});
