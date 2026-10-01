/**
 * Profile avatar artwork. The source PNGs live in ./assets; the app ships
 * the 256px WebP versions produced by `npm run assets -w packages/ui`.
 */
import type { Sigil } from "@terminal-trainer/core";
import blackhole from "./assets/optimized/sigils/blackhole.webp";
import flower from "./assets/optimized/sigils/flower.webp";
import jellyfish from "./assets/optimized/sigils/jellyfish.webp";
import knight from "./assets/optimized/sigils/knight.webp";
import lightning from "./assets/optimized/sigils/lightning.webp";
import moon from "./assets/optimized/sigils/moon.webp";
import star from "./assets/optimized/sigils/star.webp";
import logo from "./assets/optimized/logo.webp";

export const SIGIL_ART: Record<Sigil, { src: string; label: string }> = {
  star: { src: star, label: "Star" },
  moon: { src: moon, label: "Moon" },
  lightning: { src: lightning, label: "Lightning" },
  blackhole: { src: blackhole, label: "Black hole" },
  flower: { src: flower, label: "Flower" },
  jellyfish: { src: jellyfish, label: "Jellyfish" },
  knight: { src: knight, label: "Knight" },
};

/** The app logo (a retro computer in a wizard's hat), 256px. */
export const LOGO_URL: string = logo;

export function sigilImage(sigil: Sigil, size = 40): HTMLImageElement {
  const art = SIGIL_ART[sigil];
  const img = document.createElement("img");
  img.className = "sigil-img";
  img.src = art.src;
  img.alt = art.label;
  img.width = size;
  img.height = size;
  img.decoding = "async";
  img.draggable = false;
  return img;
}

/** A round avatar showing the profile's sigil. */
export function avatar(sigil: Sigil, size = 40): HTMLElement {
  const wrap = document.createElement("span");
  wrap.className = "avatar";
  wrap.style.width = `${size}px`;
  wrap.style.height = `${size}px`;
  wrap.appendChild(sigilImage(sigil, Math.round(size * 0.72)));
  return wrap;
}

/** The logo as an image element, for app bars. */
export function brandMark(size = 28): HTMLImageElement {
  const img = document.createElement("img");
  img.className = "brand-mark";
  img.src = LOGO_URL;
  img.alt = "";
  img.width = size;
  img.height = size;
  img.decoding = "async";
  return img;
}
