import { describe, expect, it, vi } from "vitest";
import { createTaskCard } from "../src/components/task-card";
import { makeFixture } from "./helpers";

function make() {
  const fixture = makeFixture();
  const onAllTracks = vi.fn();
  const onToggle = vi.fn();
  const card = createTaskCard(fixture.root, { ...fixture, typing: 0, onAllTracks, onToggle });
  const text = (selector: string) => card.element.querySelector(selector)?.textContent ?? "";
  const click = (action: string) => card.element.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.click();
  return { ...fixture, card, onAllTracks, onToggle, text, click };
}

describe("task card", () => {
  it("is hidden in free play and shows the story and task once a track is open", () => {
    const { card, trainer, text } = make();
    expect(card.element.hidden).toBe(true);
    trainer.selectTrack("basics");
    expect(card.element.hidden).toBe(false);
    expect(text(".task-meta")).toBe("Basics · 1 of 2 · 0 done");
    expect(text(".task-title")).toBe("Make a");
    expect(text(".challenge-story")).toBe("Mors needs a.");
    expect(text(".challenge-task")).toBe("Create a file named a.");
  });

  it("hint speaks through Mors and answer toggles the solution", () => {
    const { trainer, text, click, card } = make();
    trainer.selectTrack("basics");
    click("hint");
    expect(text(".mors-text")).toContain("touch a");
    click("answer");
    expect(card.element.querySelector<HTMLElement>(".challenge-answer")!.hidden).toBe(false);
    expect(text(".challenge-answer")).toContain("touch a");
    click("answer");
    expect(card.element.querySelector<HTMLElement>(".challenge-answer")!.hidden).toBe(true);
  });

  it("enables Next only once solved, then advances; the last one hands back to the tracks", () => {
    const { shell, trainer, text, click, card, onAllTracks } = make();
    trainer.selectTrack("basics");
    const next = card.element.querySelector<HTMLButtonElement>('[data-action="next"]')!;
    expect(next.disabled).toBe(true);
    trainer.afterCommand("touch a", shell.run("touch a"));
    expect(card.element.classList.contains("solved")).toBe(true);
    expect(text(".task-status")).toMatch(/solved/i);
    expect(next.disabled).toBe(false);
    click("next");
    expect(text(".task-title")).toBe("Make b");
    trainer.afterCommand("touch b", shell.run("touch b"));
    expect(next.textContent).toBe("Back to tracks");
    click("next");
    expect(onAllTracks).toHaveBeenCalled();
  });

  it("skips, lists the track's challenges and jumps, and goes back to all tracks", () => {
    const { trainer, text, click, card, onAllTracks } = make();
    trainer.selectTrack("basics");
    click("skip");
    expect(text(".task-title")).toBe("Make b");
    click("list");
    const rows = card.element.querySelectorAll<HTMLButtonElement>(".challenge-row");
    expect(rows.length).toBe(2);
    expect(card.element.querySelector<HTMLElement>(".challenge-rows")!.hidden).toBe(false);
    rows[0]!.click();
    expect(text(".task-title")).toBe("Make a");
    click("all-tracks");
    expect(onAllTracks).toHaveBeenCalled();
  });

  it("collapses and expands from the header, reporting the change", () => {
    const { card, trainer, onToggle } = make();
    trainer.selectTrack("basics");
    const header = card.element.querySelector<HTMLButtonElement>(".task-card-header")!;
    header.click();
    expect(card.element.classList.contains("collapsed")).toBe(true);
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(onToggle).toHaveBeenCalledWith(true);
    card.setCollapsed(false);
    expect(header.getAttribute("aria-expanded")).toBe("true");
  });
});
