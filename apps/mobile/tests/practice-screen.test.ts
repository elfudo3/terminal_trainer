import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFERENCES } from "../src/preferences";
import { createPracticeScreen } from "../src/screens/practice";
import { makeFixture } from "./helpers";

function make() {
  const fixture = makeFixture();
  const onSolved = vi.fn();
  const onPrefsChange = vi.fn();
  const onAllTracks = vi.fn();
  const screen = createPracticeScreen(fixture.root, { ...fixture, prefs: { ...DEFAULT_PREFERENCES }, typing: 0, onSolved, onPrefsChange, onAllTracks });
  const type = (text: string) => {
    screen.terminal.input.value = text;
    screen.terminal.input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const output = () => screen.element.querySelector(".terminal-output")!.textContent ?? "";
  return { ...fixture, screen, onSolved, onPrefsChange, onAllTracks, type, output };
}

describe("practice screen", () => {
  it("starts in free play with a nudge to pick a track and a plain terminal", () => {
    const { screen, output, onAllTracks } = make();
    expect(screen.element.querySelector<HTMLElement>(".no-track")!.hidden).toBe(false);
    expect(screen.card.element.hidden).toBe(true);
    expect(output()).toMatch(/Welcome to sandbox/);
    screen.element.querySelector<HTMLButtonElement>(".no-track button")!.click();
    expect(onAllTracks).toHaveBeenCalled();
  });

  it("runs commands, prints output, and checks the open challenge without echoing its text", () => {
    const { screen, trainer, onSolved, type, output } = make();
    trainer.selectTrack("basics");
    expect(screen.element.querySelector<HTMLElement>(".no-track")!.hidden).toBe(true);
    expect(output()).not.toContain("Create a file named a.");
    type("pwd");
    screen.terminal.sendKey("Enter");
    expect(output()).toContain("/home/user");
    expect(onSolved).not.toHaveBeenCalled();
    type("touch a");
    screen.terminal.sendKey("Enter");
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(trainer.solved).toBe(true);
    expect(screen.card.element.querySelector(".mors-text")?.textContent).toContain("a exists now");
    expect(output()).not.toContain("exists now");
  });

  it("clears the screen when asked and prints errors", () => {
    const { screen, type, output } = make();
    type("nope");
    screen.terminal.sendKey("Enter");
    expect(screen.element.querySelector(".line-stderr")?.textContent).toContain("command not found");
    type("clear");
    screen.terminal.sendKey("Enter");
    expect(output()).toBe("");
  });

  it("updates suggestions while typing and applies a tapped chip", () => {
    const { screen, type } = make();
    const chips = () => [...screen.element.querySelectorAll<HTMLButtonElement>(".suggestions .chip")].map((c) => c.textContent);
    expect(chips()).toContain("ls");
    type("cat no");
    expect(chips()).toEqual(["notes.txt"]);
    screen.element.querySelector<HTMLButtonElement>(".suggestions .chip")!.click();
    expect(screen.terminal.input.value).toBe("cat notes.txt ");
    screen.terminal.sendKey("Enter");
    expect(chips()).toContain("ls");
  });

  it("has a key bar wired to the terminal and a collapsible task card", () => {
    const { screen, trainer, onPrefsChange } = make();
    trainer.selectTrack("basics");
    [...screen.element.querySelectorAll<HTMLButtonElement>(".keybar-key")].find((b) => b.textContent === "~")!.click();
    expect(screen.terminal.input.value).toBe("~");
    screen.element.querySelector<HTMLButtonElement>(".task-card-header")!.click();
    expect(onPrefsChange).toHaveBeenCalledWith(expect.objectContaining({ taskCardCollapsed: true }));
  });

  it("collapses the task card while the keyboard is open, without touching the saved preference", () => {
    const { screen, trainer, onPrefsChange } = make();
    trainer.selectTrack("basics");
    const card = screen.card.element;
    screen.setKeyboardOpen(true);
    expect(card.classList.contains("collapsed")).toBe(true);
    expect(onPrefsChange).not.toHaveBeenCalled();
    screen.element.querySelector<HTMLButtonElement>(".task-card-header")!.click();
    expect(card.classList.contains("collapsed")).toBe(false);
    expect(onPrefsChange).not.toHaveBeenCalled();
    screen.setKeyboardOpen(false);
    expect(card.classList.contains("collapsed")).toBe(false);
  });

  it("applies the font size preference to the terminal", () => {
    const { screen } = make();
    screen.setFontSize("large");
    expect(screen.terminal.element.style.getPropertyValue("--terminal-font-size")).toBe("17px");
  });
});
