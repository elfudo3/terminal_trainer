import { describe, expect, it, vi } from "vitest";
import { backdropThemeProps, createBackdrop, forwardPointer } from "../src/effects/backdrop";
import { applyBorderGlow, glowThemeProps } from "../src/effects/border-glow";
import { isLightTheme, isTouchDevice, supportsWebGL } from "../src/effects/theme";

describe("backdrop", () => {
  it("falls back to the static layer without WebGL (jsdom) and marks it decorative", () => {
    document.body.innerHTML = '<section><div id="host"></div></section>';
    const host = document.getElementById("host")!;
    const backdrop = createBackdrop(host);
    expect(supportsWebGL()).toBe(false);
    expect(backdrop.mode).toBe("static");
    expect(host.classList.contains("is-static")).toBe(true);
    expect(host.getAttribute("aria-hidden")).toBe("true");
    expect(host.querySelector("canvas")).toBeNull();
    backdrop.dispose();
  });

  it("stays static under reduced motion even when WebGL is claimed", () => {
    document.body.innerHTML = '<section><div id="host"></div></section>';
    const backdrop = createBackdrop(document.getElementById("host")!, { reducedMotion: true, webgl: true });
    expect(backdrop.mode).toBe("static");
    expect(document.querySelector("canvas")).toBeNull();
  });

  it("forwards page mouse moves to the effect as non-bubbling copies", () => {
    document.body.innerHTML = '<section id="page"><div id="fx"></div><button id="btn">x</button></section>';
    const page = document.getElementById("page")!;
    const fx = document.getElementById("fx")!;
    const seen: MouseEvent[] = [];
    fx.addEventListener("mousemove", (e) => seen.push(e));
    const stop = forwardPointer(page, () => fx);
    document.getElementById("btn")!.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 40, clientY: 50 }));
    expect(seen.length).toBe(1);
    expect([seen[0]!.clientX, seen[0]!.clientY, seen[0]!.bubbles]).toEqual([40, 50, false]);
    // A move that started inside the effect is not duplicated.
    fx.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 1, clientY: 1 }));
    expect(seen.length).toBe(2);
    stop();
    document.getElementById("btn")!.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    expect(seen.length).toBe(2);
  });

  it("tunes tint and brightness per theme", () => {
    expect(backdropThemeProps(false).lightMode).toBe(false);
    expect(backdropThemeProps(true)).toMatchObject({ lightMode: true });
    // Both themes keep the field well below full brightness so the content stays readable.
    expect(backdropThemeProps(true).brightness).toBeLessThan(0.5);
    expect(backdropThemeProps(false).brightness).toBeLessThan(0.5);
  });
});

describe("border glow", () => {
  it("wraps an existing card, keeps its content and listeners, and restores it on dispose", () => {
    document.body.innerHTML = '<main><section class="card" id="c"><button id="b">go</button></section></main>';
    const card = document.getElementById("c")!;
    const onClick = vi.fn();
    card.querySelector("button")!.addEventListener("click", onClick);
    const glow = applyBorderGlow(card, { hostClass: "test-host" });
    expect(glow.host.classList.contains("test-host")).toBe(true);
    expect(glow.host.parentElement?.tagName).toBe("MAIN");
    expect(glow.host.querySelector(".border-glow-card .border-glow-inner .glow-slot > #c")).toBe(card);
    expect(card.classList.contains("in-glow")).toBe(true);
    document.getElementById("b")!.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    glow.dispose();
    expect(card.parentElement?.tagName).toBe("MAIN");
    expect(card.classList.contains("in-glow")).toBe(false);
    expect(document.querySelector(".border-glow-card")).toBeNull();
  });

  it("mirrors the card's hidden attribute onto the wrapper", async () => {
    document.body.innerHTML = '<div><section class="card" id="c" hidden></section></div>';
    const card = document.getElementById("c")!;
    const glow = applyBorderGlow(card);
    expect(glow.host.hidden).toBe(true);
    card.hidden = false;
    await Promise.resolve(); // MutationObserver callbacks are microtasks
    expect(glow.host.hidden).toBe(false);
    glow.dispose();
  });

  it("passes hex surfaces so the component can pick light or dark styling", () => {
    expect(glowThemeProps(true).backgroundColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(glowThemeProps(false).backgroundColor).toBe("#131a26");
  });
});

describe("environment checks", () => {
  it("default to the safe answer where matchMedia is missing", () => {
    expect(isLightTheme()).toBe(false);
    expect(isTouchDevice()).toBe(false);
  });
});
