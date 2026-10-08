import type { Plugin } from "vite";

/**
 * The vendored React Bits files begin with a "use client" directive (a
 * Next.js marker). Rollup drops it with a warning on every build; this
 * removes it from the bundle without touching the files.
 */
export function reactBits(): Plugin {
  const directive = /^\s*(["'])use client\1;?/;
  return {
    name: "terminal-trainer:react-bits",
    enforce: "post", // after esbuild has transformed the JSX
    transform(code, id) {
      if (!id.includes("/vendor/react-bits/") || !directive.test(code)) return null;
      return { code: code.replace(directive, ""), map: null };
    },
  };
}
