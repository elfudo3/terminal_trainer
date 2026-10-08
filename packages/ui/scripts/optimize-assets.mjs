/**
 * Turns the source artwork in src/assets into the files the apps ship.
 *
 *   npm run assets -w packages/ui
 *
 * - Sigil icons (1254px PNG) → 256px WebP, for avatars up to 112px at 2x.
 * - Logo → favicon, Apple touch icon and an Open Graph card for the web app.
 * - Mors portrait → a 720px WebP for the sign-in page and a 192px one for
 *   the small avatars beside his name, plus its dimensions (JSON) so the
 *   apps can reserve the right aspect ratio before the image loads.
 *
 * Sources stay untouched; outputs go to src/assets/optimized (committed, so
 * nobody needs this tooling to build the apps).
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "../src/assets");
const out = join(src, "optimized");
const webPublic = join(here, "../../../apps/web/public");
const mobilePublic = join(here, "../../../apps/mobile/public");
const INK = { r: 10, g: 13, b: 20, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

mkdirSync(join(out, "sigils"), { recursive: true });

// ---- Sigils ---------------------------------------------------------------
for (const file of readdirSync(src).filter((f) => f.endsWith("_icon.png"))) {
  const name = file.replace("_icon.png", "");
  await sharp(join(src, file)).resize(256, 256, { fit: "contain", background: TRANSPARENT }).webp({ quality: 88 }).toFile(join(out, "sigils", `${name}.webp`));
  console.log(`sigil ${name}`);
}

// ---- Logo -----------------------------------------------------------------
const logo = join(src, "terminal_trainer_logo_v2.png");
await sharp(logo).resize(256, 256).webp({ quality: 90 }).toFile(join(out, "logo.webp"));
for (const dir of [webPublic, mobilePublic]) {
  mkdirSync(dir, { recursive: true });
  await sharp(logo).resize(512, 512).png().toFile(join(dir, "icon-512.png"));
  await sharp(logo).resize(192, 192).png().toFile(join(dir, "icon-192.png"));
  await sharp(logo).resize(64, 64).png().toFile(join(dir, "favicon.png"));
  // Apple wants an opaque icon; the logo sits on the app's ink background.
  await sharp({ create: { width: 180, height: 180, channels: 4, background: INK } })
    .composite([{ input: await sharp(logo).resize(150, 150).png().toBuffer(), gravity: "centre" }])
    .png()
    .toFile(join(dir, "apple-touch-icon.png"));
}
// Open Graph card: the logo centred on ink, 1200×630.
await sharp({ create: { width: 1200, height: 630, channels: 4, background: INK } })
  .composite([{ input: await sharp(logo).resize(480, 480).png().toBuffer(), gravity: "centre" }])
  .png()
  .toFile(join(webPublic, "og-image.png"));
console.log("logo + icons");

// ---- Mors portrait --------------------------------------------------------
// The pixel-art portrait is the intended source. Until it is added to
// src/assets, a still rendered from the Blender model stands in.
const pixel = join(src, "mors_pixel_vers.png");
const portraitSource = existsSync(pixel) ? pixel : join(src, "mors_render_v1.png");
if (portraitSource !== pixel) console.warn("mors_pixel_vers.png not found in src/assets; using mors_render_v1.png (rendered from the model) instead.");
const trimmed = await sharp(portraitSource).trim({ threshold: 8 }).toBuffer();
const portrait = await sharp(trimmed).resize({ width: 720, withoutEnlargement: true }).webp({ quality: 86 }).toBuffer({ resolveWithObject: true });
writeFileSync(join(out, "mors-portrait.webp"), portrait.data);
await sharp(trimmed).resize({ width: 192 }).webp({ quality: 86 }).toFile(join(out, "mors-avatar.webp"));
writeFileSync(join(out, "mors-portrait.json"), JSON.stringify({ width: portrait.info.width, height: portrait.info.height }) + "\n");
console.log(`mors portrait ${portrait.info.width}×${portrait.info.height}`);
