/**
 * Mors the Wizard as an image: one treatment, two sizes. The 720px portrait
 * serves the sign-in page; the 192px one serves the small avatars beside
 * his name. Width and height attributes follow the artwork's real aspect
 * ratio so nothing shifts while the file loads, and the bust is never
 * cropped into a circle.
 */
import portrait from "./assets/optimized/mors-portrait.webp";
import small from "./assets/optimized/mors-avatar.webp";
import meta from "./assets/optimized/mors-portrait.json";

export const MORS_ALT = "Mors the Wizard";
/** Width divided by height of the artwork. */
export const MORS_ASPECT = meta.width / meta.height;
/** Above this height (CSS px) the full-size portrait file is used. */
const SMALL_MAX = 96;

export interface MorsImageOptions {
  /** True when his name is already next to the picture: empty alt, hidden from readers. */
  decorative?: boolean;
}

/** An <img> of Mors `size` CSS pixels tall. */
export function morsImage(size = 48, opts: MorsImageOptions = {}): HTMLImageElement {
  const img = document.createElement("img");
  img.className = "mors-img";
  img.src = size > SMALL_MAX ? portrait : small;
  img.width = Math.round(size * MORS_ASPECT);
  img.height = size;
  img.decoding = "async";
  img.draggable = false;
  if (opts.decorative) {
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
  } else {
    img.alt = MORS_ALT;
  }
  return img;
}

/** The small avatar in a fixed box, for bubbles and chips. */
export function morsAvatar(size = 44): HTMLElement {
  const wrap = document.createElement("span");
  wrap.className = "mors-avatar";
  wrap.style.width = `${size}px`;
  wrap.style.height = `${size}px`;
  wrap.appendChild(morsImage(size, { decorative: true }));
  return wrap;
}
