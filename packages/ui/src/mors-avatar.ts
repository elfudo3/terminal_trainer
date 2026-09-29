/**
 * Mors the Wizard, drawn in SVG so he is crisp at any size and needs no
 * image files. A tall indigo hat with a gold band and star, gold-rimmed
 * glasses glowing terminal green, a pale beard, a violet ring.
 */
export const MORS_AVATAR_SVG = `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mors the Wizard">
  <defs>
    <linearGradient id="mors-hat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c6cf0"/><stop offset="1" stop-color="#3b3a8f"/></linearGradient>
    <radialGradient id="mors-lens" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#b8ffc4" stop-opacity="0.95"/><stop offset="1" stop-color="#7ee787" stop-opacity="0.35"/></radialGradient>
  </defs>
  <circle cx="48" cy="48" r="46" fill="#131a26" stroke="#9d8cff" stroke-width="2"/>
  <path d="M16 96 C18 74, 33 64, 48 64 C63 64, 78 74, 80 96 Z" fill="#3b3a8f"/>
  <path d="M31 50 C29 68, 39 80, 48 80 C57 80, 67 68, 65 50 Z" fill="#e3e7ee"/>
  <circle cx="48" cy="48" r="15" fill="#f1c9a5"/>
  <path d="M42 56 C45 59, 51 59, 54 56" stroke="#c98a5b" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <circle cx="41" cy="47" r="5.5" fill="url(#mors-lens)" stroke="#f2b84b" stroke-width="2"/>
  <circle cx="55" cy="47" r="5.5" fill="url(#mors-lens)" stroke="#f2b84b" stroke-width="2"/>
  <path d="M46.5 47 H49.5" stroke="#f2b84b" stroke-width="2"/>
  <path d="M26 39 C34 30, 44 14, 50 4 C51 18, 59 30, 70 39 Z" fill="url(#mors-hat)"/>
  <path d="M22 40 H74" stroke="#f2b84b" stroke-width="4" stroke-linecap="round"/>
  <path d="M57 19 l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#f2b84b"/>
</svg>`;

/** A sized avatar element. */
export function morsAvatar(size = 48): HTMLElement {
  const wrap = document.createElement("span");
  wrap.className = "mors-avatar";
  wrap.style.width = `${size}px`;
  wrap.style.height = `${size}px`;
  wrap.innerHTML = MORS_AVATAR_SVG;
  return wrap;
}
