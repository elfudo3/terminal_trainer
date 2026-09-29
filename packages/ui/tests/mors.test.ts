import { describe, expect, it } from "vitest";
import { createMorsBubble } from "../src/mors-bubble";
import { MORS_AVATAR_SVG, morsAvatar } from "../src/mors-avatar";
import { typewrite } from "../src/typewriter";

describe("Mors avatar and typewriter", () => {
  it("renders an accessible SVG at the requested size", () => {
    const el = morsAvatar(64);
    expect(el.style.width).toBe("64px");
    expect(el.querySelector("svg")?.getAttribute("aria-label")).toBe("Mors the Wizard");
    expect(MORS_AVATAR_SVG).toContain("<svg");
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
  it("shows what Mors says and can be cleared", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const bubble = createMorsBubble(document.getElementById("root")!, { speed: 0 });
    await bubble.say("Ah. A new one.");
    expect(bubble.element.querySelector(".mors-text")?.textContent).toBe("Ah. A new one.");
    expect(bubble.element.querySelector(".mors-name")?.textContent).toBe("Mors");
    expect(bubble.element.hidden).toBe(false);
    bubble.clear();
    expect(bubble.element.hidden).toBe(true);
    await bubble.say("Back.", { instant: true });
    expect(bubble.element.querySelector(".mors-text")?.textContent).toBe("Back.");
  });
});
