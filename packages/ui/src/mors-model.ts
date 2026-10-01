/**
 * Mors in 3D for the sign-in page.
 *
 * This file is the small, testable part: WebGL detection, the maths that
 * turns a pointer position into a look direction, and a container that
 * either mounts the three.js scene (loaded on demand, so the rest of the
 * app never pays for it) or shows a fallback element.
 */
import morsModelUrl from "./assets/optimized/mors.glb?url";

export { morsModelUrl };

export interface MorsModelOptions {
  /** URL of the GLB; defaults to the bundled optimised model. */
  src?: string;
  /** Shown when WebGL is unavailable or the model fails to load. */
  fallback: () => HTMLElement;
  /** Skip autonomous motion (idle sway, floating). Defaults to the OS setting. */
  reducedMotion?: boolean;
}

export interface MorsModel {
  element: HTMLElement;
  /** Resolves once the scene renders, or once the fallback is in place. */
  ready: Promise<"webgl" | "fallback">;
  dispose(): void;
}

export interface Look {
  /** Rotation about the vertical axis, radians; positive turns to the viewer's right. */
  yaw: number;
  /** Rotation about the horizontal axis, radians; positive looks down. */
  pitch: number;
}

/** Furthest Mors will turn to follow the cursor, in radians. */
export const MAX_YAW = 0.55;
export const MAX_PITCH = 0.22;

/** Where to look so the model faces a pointer at (x, y) on a viewport of the given size. */
export function pointerToLook(x: number, y: number, width: number, height: number, origin?: { x: number; y: number }): Look {
  const cx = origin?.x ?? width / 2;
  const cy = origin?.y ?? height / 2;
  const nx = Math.max(-1, Math.min(1, (x - cx) / Math.max(1, width / 2)));
  const ny = Math.max(-1, Math.min(1, (y - cy) / Math.max(1, height / 2)));
  return { yaw: nx * MAX_YAW, pitch: ny * MAX_PITCH };
}

/** Gentle autonomous motion for time `t` (seconds): a slow look-around and a float. */
export function idleLook(t: number): Look & { lift: number } {
  return { yaw: Math.sin(t * 0.45) * 0.16, pitch: Math.sin(t * 0.7) * 0.04 + 0.02, lift: Math.sin(t * 1.1) * 0.015 };
}

/** Frame-rate independent easing: how far to move toward a target after `dt` seconds. */
export function easeFactor(dt: number, speed = 6): number {
  return 1 - Math.exp(-Math.max(0, dt) * speed);
}

/** Uniform scale that fits a box of the given size into `target` units on its longest side. */
export function fitScale(size: { x: number; y: number; z: number }, target = 1.9): number {
  const longest = Math.max(size.x, size.y, size.z);
  return longest > 0 ? target / longest : 1;
}

/**
 * Camera distance at which a box of the given (already scaled) size fits a
 * square view with the given vertical field of view, leaving `margin` of
 * breathing room, so the hat tip is never cut off.
 */
export function frameDistance(size: { x: number; y: number }, fovDegrees: number, margin = 0.06): number {
  const halfExtent = (Math.max(size.x, size.y) / 2) * (1 + margin);
  return halfExtent / Math.tan((fovDegrees * Math.PI) / 360);
}

export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function createMorsModel(root: HTMLElement, opts: MorsModelOptions): MorsModel {
  const element = document.createElement("div");
  element.className = "mors-model";
  element.setAttribute("role", "img");
  element.setAttribute("aria-label", "Mors the Wizard");
  root.appendChild(element);

  let disposeScene: (() => void) | undefined;
  let disposed = false;

  const showFallback = (): "fallback" => {
    element.replaceChildren(opts.fallback());
    element.classList.add("is-fallback", "is-ready");
    return "fallback";
  };

  const ready: Promise<"webgl" | "fallback"> = (async () => {
    if (!supportsWebGL()) return showFallback();
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    element.appendChild(canvas);
    try {
      // three.js and the model only load here, on demand.
      const { mountScene } = await import("./mors-scene");
      const scene = await mountScene(canvas, {
        src: opts.src ?? morsModelUrl,
        reducedMotion: opts.reducedMotion ?? prefersReducedMotion(),
      });
      if (disposed) {
        scene.dispose();
        return "fallback";
      }
      disposeScene = scene.dispose;
      element.classList.add("is-ready");
      return "webgl";
    } catch {
      return showFallback();
    }
  })();

  return {
    element,
    ready,
    dispose: () => {
      disposed = true;
      disposeScene?.();
      element.remove();
    },
  };
}
