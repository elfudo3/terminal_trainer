/** One stroke icon per track id, as inline SVG (24×24, currentColor). */
const wrap = (paths: string) =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const TRACK_ICONS: Record<string, string> = {
  navigation: wrap('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
  files: wrap('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  viewing: wrap('<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  searching: wrap('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/>'),
  pipes: wrap('<rect x="3" y="5" width="6" height="6" rx="1.5"/><rect x="15" y="13" width="6" height="6" rx="1.5"/><path d="M9 8h3a3 3 0 0 1 3 3v2"/>'),
  permissions: wrap('<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
  environment: wrap('<path d="M4 7h10M18 7h2M4 12h2M10 12h10M4 17h8M16 17h4"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="14" cy="17" r="2"/>'),
  git: wrap('<circle cx="6" cy="5" r="2.5"/><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="9" r="2.5"/><path d="M6 7.5v9M18 11.5a6 6 0 0 1-6 6h-3"/>'),
};

export const DEFAULT_TRACK_ICON = wrap('<rect x="4" y="5" width="16" height="14" rx="2"/><path d="m8 10 2.5 2L8 14M13 14h3"/>');

export function trackIcon(id: string): string {
  return TRACK_ICONS[id] ?? DEFAULT_TRACK_ICON;
}
