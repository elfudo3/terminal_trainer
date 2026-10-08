import { describe, expect, it } from "vitest";
import { createMorsBubble } from "../src/mors-bubble";
import { MORS_ALT, MORS_ASPECT, morsAvatar, morsImage } from "../src/mors-image";
import { typewrite } from "../src/typewriter";

describe("Mors image", () => {
  it("is a described image with the artwork's aspect ratio reserved", () => {
    const img = morsImage(320);
    expect(img.alt).toBe(MORS_ALT);
    expect(img.height).toBe(320);
    expect(img.width).toBe(Math.round(320 * MORS_ASPECT));
    expect(MORS_ASPECT).toBeGreaterThan(0.5); // the pixel portrait is a little taller than wide
    expect(MORS_ASPECT).toBeLessThan(1);
    expect(img.src).toMatch(/mors-portrait/);
  });

  it("uses the small file for small sizes and can be decorative", () => {
    const img = morsImage(40, { decorative: true });
    expect(img.src).toMatch(/mors-avatar/);
    expect(img.alt).toBe("");
    expect(img.getAttribute("aria-hidden")).toBe("true");
  });

  it("boxes the avatar at the requested size without cropping to a circle", () => {
    const el = morsAvatar(64);
    expect(el.style.width).toBe("64px");
    expect(el.querySelector("img")?.height).toBe(64);
  });

  it("types instantly at speed 0 and progressively otherwise", async () => {
    const el = document.createElement("p");
    typewrite(el, "hello", { speed: 0 });
    expect(el.textContent).toBe("hello");
    const slow = typewrite(el, "hi there", { speed: 1 });
    expect(el.textContent).toBe("");
    await slow.done;
    expect(el.textContent).toBe("hi there");
    const cancelled = typewrite(el, "abc", { speed: 50 });
    cancelled.cancel();
    expect(el.textContent).toBe("abc");
  });
});

describe("Mors bubble", () => {
  it("shows what Mors says next to a decorative avatar and can be cleared", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const bubble = createMorsBubble(document.getElementById("root")!, { speed: 0 });
    await bubble.say("Ah. A new one.");
    expect(bubble.element.querySelector(".mors-text")?.textContent).toBe("Ah. A new one.");
    expect(bubble.element.querySelector(".mors-name")?.textContent).toBe("Mors");
    expect(bubble.element.querySelector(".mors-avatar img")?.getAttribute("alt")).toBe("");
    expect(bubble.element.hidden).toBe(false);
    bubble.clear();
    expect(bubble.element.hidden).toBe(true);
    await bubble.say("Back.", { instant: true });
    expect(bubble.element.querySelector(".mors-text")?.textContent).toBe("Back.");
  });
});
