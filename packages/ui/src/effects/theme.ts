/** The app follows the OS colour scheme; effects need to know which one is active. */

export function isLightTheme(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: light)").matches;
}

/** Calls `onChange` whenever the scheme flips; returns an unsubscribe function. */
export function watchTheme(onChange: (light: boolean) => void): () => void {
  if (typeof matchMedia !== "function") return () => {};
  const query = matchMedia("(prefers-color-scheme: light)");
  const listener = (event: MediaQueryListEvent) => onChange(event.matches);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

/** True on devices without a fine pointer (phones, tablets): no hover, no cursor to follow. */
export function isTouchDevice(): boolean {
  return typeof matchMedia === "function" && matchMedia("(hover: none)").matches;
}

export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
