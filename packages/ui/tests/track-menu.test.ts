import { describe, expect, it, vi } from "vitest";
import { createTrackMenu } from "../src/track-menu";
import { makeTrainer } from "./helpers";

describe("track menu", () => {
  it("renders a card per track with icon, commands and progress", () => {
    document.body.innerHTML = '<div id="root"></div>';
    const { trainer } = makeTrainer();
    const menu = createTrackMenu(document.getElementById("root")!, trainer, { onSelect: vi.fn() });
    const cards = menu.element.querySelectorAll<HTMLElement>(".track-card");
    expect(cards.length).toBe(2);
    expect(cards[0]!.querySelector(".track-title")?.textContent).toBe("Navigation");
    expect(cards[0]!.querySelector(".track-icon svg")).not.toBeNull();
    expect([...cards[0]!.querySelectorAll("code")].map((c) => c.textContent)).toEqual(["pwd", "ls"]);
    expect(cards[0]!.querySelector(".track-count")?.textContent).toBe("0 / 2");
  });

  it("marks the open and finished tracks and re-renders on progress", () => {
    document.body.innerHTML = '<div id="root"></div>';
    const { shell, trainer } = makeTrainer();
    const onSelect = vi.fn();
    const menu = createTrackMenu(document.getElementById("root")!, trainer, { onSelect });
    menu.element.querySelector<HTMLButtonElement>('[data-track="git"]')!.click();
    expect(onSelect).toHaveBeenCalledWith("git");
    trainer.selectTrack("git");
    trainer.afterCommand("touch g1", shell.run("touch g1"));
    const git = menu.element.querySelector<HTMLElement>('[data-track="git"]')!;
    expect(git.classList.contains("open")).toBe(true);
    expect(git.classList.contains("finished")).toBe(true);
    expect(git.querySelector(".track-count")?.textContent).toBe("Completed");
    expect(git.querySelector<HTMLElement>(".progress-bar")?.style.width).toBe("100%");
  });
  it("preserves focused cards on progress updates and releases glow roots on disposal", () => {
    document.body.innerHTML = '<div id="root"></div>';
    const { trainer } = makeTrainer();
    const menu = createTrackMenu(document.getElementById("root")!, trainer, { onSelect: vi.fn() });
    const card = menu.element.querySelector<HTMLButtonElement>(".track-card")!;
    card.focus();
    trainer.selectTrack("navigation");
    expect(document.activeElement).toBe(card);
    expect(menu.element.querySelectorAll(".border-glow-card").length).toBe(2);
    expect(card.closest('[role="listitem"]')).not.toBeNull();
    expect(card.getAttribute("role")).toBeNull(); // retain native button semantics
    menu.dispose();
    trainer.leaveTrack();
    expect(document.querySelector(".border-glow-card")).toBeNull();
    expect(menu.element.querySelector(".border-glow-card")).toBeNull(); // no rebuild after disposal
  });

});
