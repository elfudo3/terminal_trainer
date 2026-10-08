/**
 * Puts an existing card inside the React Bits BorderGlow treatment without
 * rewriting it: the card element is moved into a slot rendered by an
 * isolated React root, keeps its content, listeners and semantics, and gets
 * the `in-glow` class so its own surface styling steps aside (the glow card
 * now draws the background, border and shadow).
 */
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import BorderGlow, { type BorderGlowProps } from "../vendor/react-bits/BorderGlow.jsx";
import "../vendor/react-bits/BorderGlow.css";
import { isLightTheme, watchTheme } from "./theme";

export interface GlowOptions {
  /** Class for the wrapper that takes the card's place in the layout. */
  hostClass?: string;
  borderRadius?: number;
  light?: boolean;
}

export interface Glow {
  /** The wrapper now standing where the card was. */
  host: HTMLElement;
  card: HTMLElement;
  dispose(): void;
}

/** One shared look: violet glow, restrained intensity, no intro sweep. */
export const GLOW_PRESET: BorderGlowProps = {
  edgeSensitivity: 30,
  glowRadius: 32,
  glowIntensity: 0.75,
  coneSpread: 25,
  animated: false,
  colors: ["#9d8cff", "#7c6cf0", "#c4b8ff"],
  fillOpacity: 0.3,
};

export function glowThemeProps(light: boolean): Pick<BorderGlowProps, "backgroundColor" | "glowColor"> {
  // backgroundColor must be hex: the component decides light/dark styling from it.
  return light ? { backgroundColor: "#ffffff", glowColor: "249 70 60" } : { backgroundColor: "#131a26", glowColor: "249 100 80" };
}

export function applyBorderGlow(card: HTMLElement, opts: GlowOptions = {}): Glow {
  const host = document.createElement("div");
  host.className = ["glow-host", opts.hostClass ?? ""].join(" ").trim();
  card.replaceWith(host);
  let light = opts.light ?? isLightTheme();
  const root: Root = createRoot(host);
  const render = () => {
    flushSync(() => {
      root.render(createElement(BorderGlow, { ...GLOW_PRESET, ...glowThemeProps(light), borderRadius: opts.borderRadius ?? 18 }, createElement("div", { className: "glow-slot" })));
    });
  };
  render();
  host.querySelector(".glow-slot")!.appendChild(card);
  card.classList.add("in-glow");

  // The card's own `hidden` keeps working: the wrapper follows it.
  const syncHidden = () => (host.hidden = card.hidden);
  const observer = new MutationObserver(syncHidden);
  observer.observe(card, { attributes: true, attributeFilter: ["hidden"] });
  syncHidden();
  const unwatch = watchTheme((next) => {
    light = next;
    render();
  });

  return {
    host,
    card,
    dispose: () => {
      observer.disconnect();
      unwatch();
      card.classList.remove("in-glow");
      host.replaceWith(card);
      root.unmount();
    },
  };
}
