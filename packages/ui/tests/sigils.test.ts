import { describe, expect, it } from "vitest";
import { SIGILS } from "@terminal-trainer/core";
import { LOGO_URL, SIGIL_ART, avatar, brandMark, sigilImage } from "../src/sigils";

describe("sigil artwork", () => {
  it("has an image and a label for every sigil id", () => {
    for (const id of SIGILS) {
      expect(SIGIL_ART[id].src, id).toMatch(/\.webp$/);
      expect(SIGIL_ART[id].label.length).toBeGreaterThan(0);
    }
    expect(LOGO_URL).toMatch(/logo.*\.webp$/);
  });

  it("renders accessible images and avatars", () => {
    const img = sigilImage("knight", 36);
    expect(img.alt).toBe("Knight");
    expect(img.width).toBe(36);
    const wrap = avatar("moon", 50);
    expect(wrap.className).toBe("avatar");
    expect(wrap.style.width).toBe("50px");
    expect(wrap.querySelector("img")?.alt).toBe("Moon");
    expect(brandMark(24).alt).toBe("");
  });
});
