# Terminal Trainer — design notes

This is the thinking behind how the app looks, sounds and moves. It exists so future changes stay coherent: if a new screen doesn't fit these notes, either the screen or the notes need to change.

## What we are making

A place to get good at the command line, with a character for company. Two things must be true at once:

1. **The terminal is real.** It looks and behaves like a terminal, because muscle memory only transfers if the practice looks like the real thing. Nothing decorative goes inside it.
2. **Everything around the terminal is warm.** Learning a terminal is intimidating. The story, Mors, the cards and the progress exist to lower the stakes.

## Research: what we borrowed

We looked at the tools people love and the learning apps people finish.

| Source | What we took |
| --- | --- |
| Modern terminals (Warp, Ghostty, iTerm) | A dark ink background, a real monospace face, one accent for the prompt, generous line height. Nothing else competes with the text. |
| Linear, Vercel, Raycast | Restrained dark UI: one surface tone, 1px borders, soft shadows, small type with real hierarchy. Colour is spent, not sprayed. |
| Duolingo, Exercism | Short units with visible progress, one task on screen at a time, a reason to come back. Independent tracks so nobody is stuck behind a topic they don't need. |
| Classic phosphor CRTs | The prompt green (`#7ee787`) and the glow on Mors's glasses. A nod, not a costume: no scanlines, no flicker. |
| Wizard fiction, done dry | Mors is Pratchett rather than Tolkien: weird, kind, funny about death, allergic to monologues. |

## Visual identity

**Four colours carry the whole app.** Ink for the ground, gold for action, violet for Mors and magic, phosphor green for the terminal. Success and danger are used only for state.

| Token | Dark | Meaning |
| --- | --- | --- |
| `--bg` | `#0a0d14` | ink: the ground everything sits on |
| `--surface` / `--surface-2` | `#131a26` / `#1a2231` | cards and bubbles, one step up from the ground |
| `--accent` | `#f2b84b` | gold: primary buttons, the open track, Mors's name |
| `--arcane` | `#9d8cff` | violet: Mors, magic, hover states, track icons |
| `--prompt` | `#7ee787` | the prompt and success text inside the terminal |
| `--success` / `--danger` | `#3fd68a` / `#ff6b6b` | state only |

A light theme exists for people who use it, with the same roles at higher contrast. The terminal stays dark in both.

**Type.** UI text is the system font so the app feels native on every platform. The terminal, code and commands use JetBrains Mono, bundled so it works offline. Sizes: 30/18/16/14.5/13/12; body 1.5 line height.

**Shape.** Radii 8/12/18. One shadow. Cards have a 1px border so they hold up in light mode too.

**Motion.** Small and purposeful: Mors's bubble slides up 6px, progress bars ease, buttons press 1px. Mors types his lines at ~16ms a character with a pause at sentence ends, because a character who speaks instantly reads as a label. All of it stops under `prefers-reduced-motion`.

**Backgrounds.** The sign-in and home pages use `.arcane-bg`: two faint radial glows (violet top-left, gold bottom-right) over a 40px grid at 2.5% white. It reads as "circuitry meets spellbook" without competing with content.

## Mors

**Who he is.** A cyber-wizard from the year 3026 who compressed his consciousness and sent it back a thousand years to help people learn. His body died; he finds that hilarious. Scientist at heart, warm underneath the weirdness. He cycles everywhere. Death (Valdraak) keeps visiting; Mors offers him tea.

**How he talks.** One or two sentences. Casual, cryptic-witty, never theatrical. He never narrates his own actions. Lore surfaces maybe one line in ten. When someone actually needs help, the help is real and correct, just delivered in his voice.

**Where he shows up.**

- The welcome on sign-in and on the home page (typed).
- A comment after every solved challenge: a line of real Unix history or science (`lore` on each challenge).
- `hint` / `mors help` in the terminal.
- His files: `/opt/mors` with a hidden `.chamber`, notes about Valdraak and threshold walking, a riddle, a log in `/var/log/mors.log`, a note in the user's documents. Several challenges send the user to find them.

**Art.** One picture of Mors, used everywhere (`packages/ui/src/mors-image.ts`): the portrait on the sign-in page and the small avatar beside his name in every bubble come from the same artwork, so he looks like one person throughout. The image keeps its real aspect ratio (width and height are reserved before it loads) and is never cropped into a circle, which would cost him the hat. The intended source is the pixel-art portrait `mors_pixel_vers.png`; until it is in `src/assets`, a still rendered from the Blender model (`mors_render_v1.png`) stands in. The model itself (`mors_v1.glb`) stays in the repo as source but is no longer shipped or fetched.

**Effects.** Two [React Bits](https://reactbits.dev) components, vendored unchanged under `packages/ui/src/vendor/react-bits` and mounted in isolated React roots from vanilla code (`packages/ui/src/effects`):

- **FaultyTerminal** is the sign-in page's background: a slow field of violet glyphs with scanlines and the odd glitch, dimmed and kept behind a scrim. It lives in a positioned layer that adds no height and takes no pointer events; the page forwards its mouse moves so the glyphs still react. Without WebGL, or with reduced motion on, the static gradient-and-grid background shows instead, and on touch devices the mouse reaction is off.
- **BorderGlow** dresses the card-level panels: the profile card on sign-in and the challenge card beside the terminal. One shared violet preset, no intro sweep; the glow follows the pointer near an edge, and keyboard focus inside a card lights its border without hovering. Buttons, inputs and track tiles keep their own, simpler states.

## Assets and the optimisation pipeline

Source artwork lives in `packages/ui/src/assets` and is never edited: seven sigil icons (1254px PNG, holographic violet shapes on transparent backgrounds), the logo (a cream retro computer wearing a wizard's hat), the Mors portrait, and the 45 MB Mors GLB (kept as source only). `npm run assets -w packages/ui` produces what the apps actually ship, committed under `assets/optimized` so nobody needs the tooling to build:

| Source | Shipped as | Why |
| --- | --- | --- |
| `*_icon.png` (≈1 MB each) | 256px WebP, 11–18 KB each | avatars never exceed 112px at 2× |
| `terminal_trainer_logo_v2.png` | 256px WebP brand mark; 64/192/512 PNG icons, an opaque 180px Apple touch icon and a 1200×630 Open Graph card in each app's `public/` | favicon, home-screen icon and link previews |
| `mors_pixel_vers.png` (or `mors_render_v1.png` until it exists) | `mors-portrait.webp` (720px, ≈47 KB) for the sign-in page, `mors-avatar.webp` (192px) for the bubbles, and `mors-portrait.json` with the dimensions | one lightweight picture of Mors for every screen, with the aspect ratio known before it loads |

Profiles store a sigil id (`star`, `moon`, `lightning`, `blackhole`, `flower`, `jellyfish`, `knight`); profiles saved before the artwork existed map their old glyph to the nearest icon.

## Screens and flow

1. **Sign in.** Mors, the title, a one-line tagline, then a card: existing profiles (sigil avatar, name, last seen) or a name field and a sigil picker. Profiles are local; there is no password to forget.
2. **Home.** Mors welcomes you by name (typed). Below, the eight track cards with icon, tagline, the commands taught and progress. Any track can be opened in any order.
3. **Practice.** The terminal on the left (or filling the phone), the story and task in a card beside/above it. Hint, Answer, Skip, Next. Mors's bubble reacts when a challenge is solved. The terminal shows only what a terminal would, plus a one-line message of the day.
4. **Learn** (mobile) / `man` (desktop): the command reference, generated from the same data the shell runs.

## Accessibility

44px targets, 16px inputs (no zoom on iOS), visible focus rings in gold, `aria-live` on Mors's text and the terminal log, roles on tabs and lists, reduced-motion respected, contrast at or above 4.5:1 for body text in both themes.
