/**
 * The animated "faulty terminal" background of the sign-in page: the React
 * Bits FaultyTerminal component in an isolated React root. The host element
 * is a positioned layer that never takes pointer events, so the page's own
 * mouse moves are forwarded to the effect instead.
 *
 * Static fallback (the host's CSS gradient) when WebGL is unavailable, the
 * user prefers reduced motion, or the renderer throws.
 */
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import FaultyTerminal, { type FaultyTerminalProps } from "../vendor/react-bits/FaultyTerminal.jsx";
import "../vendor/react-bits/FaultyTerminal.css";
import { isLightTheme, isTouchDevice, supportsWebGL, watchTheme } from "./theme";

export interface BackdropOptions {
  /** Skip the WebGL effect entirely (defaults to the OS reduced-motion setting). */
  reducedMotion?: boolean;
  /** No cursor to react to (defaults to a hover-capable-pointer media query). */
  touch?: boolean;
  /** Element whose mouse moves drive the effect; defaults to the host's parent. */
  pointerSource?: HTMLElement;
  /** Override the WebGL check (tests). */
  webgl?: boolean;
  light?: boolean;
}

export interface Backdrop {
  element: HTMLElement;
  mode: "webgl" | "static";
  dispose(): void;
}

/** Kept at module level so React sees the same array every render (it is an effect dependency). */
const GRID_MUL: readonly [number, number] = [2, 1];

/** Restrained settings: slow, dim, no barrel distortion or intro fade, violet tint. */
export const BACKDROP_PRESET: FaultyTerminalProps = {
  scale: 1.3,
  gridMul: GRID_MUL,
  digitSize: 1.2,
  timeScale: 0.25,
  scanlineIntensity: 0.35,
  glitchAmount: 0.6,
  flickerAmount: 0.5,
  noiseAmp: 0.9,
  chromaticAberration: 0,
  dither: 0,
  curvature: 0,
  mouseStrength: 0.22,
  pageLoadAnimation: false,
  className: "",
};

export function backdropThemeProps(light: boolean): Pick<FaultyTerminalProps, "tint" | "brightness" | "lightMode"> {
  return light ? { tint: "#6a5ae0", brightness: 0.3, lightMode: true } : { tint: "#9d8cff", brightness: 0.42, lightMode: false };
}

/**
 * Re-dispatches mouse moves from `source` to the effect's own container (a
 * non-bubbling copy, so it cannot echo back). Moves that started inside the
 * container reach it directly and are skipped.
 */
export function forwardPointer(source: HTMLElement, target: () => Element | null): () => void {
  const onMove = (event: MouseEvent) => {
    const container = target();
    if (!container || container.contains(event.target as Node)) return;
    container.dispatchEvent(new MouseEvent("mousemove", { clientX: event.clientX, clientY: event.clientY, bubbles: false }));
  };
  source.addEventListener("mousemove", onMove, { passive: true });
  return () => source.removeEventListener("mousemove", onMove);
}

export function createBackdrop(host: HTMLElement, opts: BackdropOptions = {}): Backdrop {
  host.classList.add("fx-backdrop");
  host.setAttribute("aria-hidden", "true");
  const reduced = opts.reducedMotion ?? (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const webgl = opts.webgl ?? supportsWebGL();
  const backdrop: Backdrop = { element: host, mode: "static", dispose: () => {} };
  if (reduced || !webgl) {
    host.classList.add("is-static");
    return backdrop;
  }

  const mount = document.createElement("div");
  mount.className = "fx-backdrop-canvas";
  host.appendChild(mount);
  let root: Root | null = null;
  let light = opts.light ?? isLightTheme();
  const touch = opts.touch ?? isTouchDevice();
  const dpr = Math.min(typeof devicePixelRatio === "number" ? devicePixelRatio : 1, 1.5);

  const fallback = () => {
    backdrop.mode = "static";
    host.classList.add("is-static");
    stopForwarding();
    unwatch();
    root?.unmount();
    root = null;
    mount.remove();
  };
  const render = () => {
    root?.render(createElement(FaultyTerminal, { ...BACKDROP_PRESET, ...backdropThemeProps(light), mouseReact: !touch, dpr }));
  };
  const stopForwarding = touch ? () => {} : forwardPointer(opts.pointerSource ?? host.parentElement ?? host, () => mount.firstElementChild);
  const unwatch = watchTheme((next) => {
    light = next;
    render();
  });

  try {
    root = createRoot(mount, { onUncaughtError: fallback });
    flushSync(render);
    backdrop.mode = mount.querySelector("canvas") ? "webgl" : "static";
    if (backdrop.mode === "static") fallback();
  } catch {
    fallback();
  }

  backdrop.dispose = () => {
    stopForwarding();
    unwatch();
    root?.unmount();
    root = null;
    mount.remove();
  };
  return backdrop;
}
