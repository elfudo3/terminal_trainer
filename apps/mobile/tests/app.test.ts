import { beforeEach, describe, expect, it, vi } from "vitest";
import { tracks } from "@terminal-trainer/core";
import { createApp, type App } from "../src/app";
import type { NativeBridge } from "../src/native";
import { PREFERENCES_KEY } from "../src/preferences";
import { memoryStorage } from "./helpers";

let app: App;
let native: NativeBridge;
let storage: ReturnType<typeof memoryStorage>;

const q = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector);
const text = (selector: string) => q(selector)?.textContent ?? "";
const session = () => app.session!;

function signIn(name: string) {
  const input = q<HTMLInputElement>('input[name="name"]')!;
  input.value = name;
  q<HTMLFormElement>(".profile-form")!.dispatchEvent(new Event("submit", { cancelable: true }));
}
function type(line: string) {
  const input = session().practice.terminal.input;
  input.value = line;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
function run(line: string) {
  type(line);
  session().practice.terminal.sendKey("Enter");
}
const output = () => session().practice.element.querySelector(".terminal-output")!.textContent ?? "";

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  storage = memoryStorage();
  native = { isNative: true, setup: async () => {}, hapticSuccess: vi.fn(), hapticTap: vi.fn(), onBackButton: vi.fn(), onKeyboard: vi.fn() };
  app = createApp(document.getElementById("root")!, { storage, native, version: "9.9.9", typing: 0 });
});

describe("mobile app", () => {
  it("starts on the sign-in page, then lands on Home with Mors's welcome and every track", () => {
    expect(q(".auth-page")).not.toBeNull();
    signIn("Fudo");
    expect(q(".auth-page")).toBeNull();
    expect(session().tabs.current).toBe("home");
    expect(text(".home .mors-text")).toContain("Fudo");
    expect(document.querySelectorAll(".track-card").length).toBe(tracks.length);
    expect(document.querySelectorAll('[role="tab"]').length).toBe(3);
  });

  it("opening a track goes to Practice with the story and Mors's intro; the terminal stays clean", () => {
    signIn("Fudo");
    q<HTMLButtonElement>('[data-track="viewing"]')!.click();
    expect(session().tabs.current).toBe("practice");
    const track = tracks.find((t) => t.id === "viewing")!;
    expect(text(".task-title")).toBe(track.challenges[0]!.title);
    expect(text(".challenge-story")).toBe(track.challenges[0]!.story);
    expect(text(".task-mors .mors-text")).toBe(track.story);
    expect(output()).not.toContain(track.challenges[0]!.task);
  });

  it("solving a challenge buzzes, toasts and makes Mors comment", () => {
    signIn("Fudo");
    q<HTMLButtonElement>('[data-track="navigation"]')!.click();
    run("pwd");
    expect(native.hapticSuccess).toHaveBeenCalledTimes(1);
    expect(q(".toast")?.textContent).toBe("✓ Solved!");
    expect(text(".task-mors .mors-text")).toContain(tracks[0]!.challenges[0]!.lore);
  });

  it("'Try it' in Learn puts the command on the input line", () => {
    signIn("Fudo");
    session().tabs.select("learn");
    session().learn.showCommand("grep");
    session().learn.element.querySelector<HTMLButtonElement>(".try-button")!.click();
    expect(session().tabs.current).toBe("practice");
    expect(session().practice.terminal.input.value).toBe("grep ");
  });

  it("the back button closes settings, leaves Learn detail, returns Home, then exits", () => {
    signIn("Fudo");
    const s = session();
    s.settings.open();
    expect(s.back()).toBe(true);
    expect(s.settings.isOpen()).toBe(false);
    s.tabs.select("learn");
    s.learn.showCommand("ls");
    expect(s.back()).toBe(true);
    expect(s.learn.isDetailOpen()).toBe(false);
    expect(s.back()).toBe(true);
    expect(s.tabs.current).toBe("home");
    expect(s.back()).toBe(false);
    expect(native.onBackButton).toHaveBeenCalled();
  });

  it("marks the keyboard as open while the input has focus and collapses the card", () => {
    signIn("Fudo");
    q<HTMLButtonElement>('[data-track="navigation"]')!.click();
    session().practice.terminal.input.dispatchEvent(new Event("focus"));
    expect(session().element.classList.contains("keyboard-open")).toBe(true);
    expect(session().practice.card.element.classList.contains("collapsed")).toBe(true);
    session().practice.terminal.input.dispatchEvent(new Event("blur"));
    expect(session().element.classList.contains("keyboard-open")).toBe(false);
  });

  it("keeps progress and preferences per profile, and resumes inside the open track", () => {
    signIn("Fudo");
    q<HTMLButtonElement>('[data-track="navigation"]')!.click();
    run("pwd");
    session().settings.open();
    session().settings.element.querySelector<HTMLButtonElement>('[data-size="large"]')!.click();
    expect(JSON.parse(storage.getItem(`${session().profile.id}:${PREFERENCES_KEY}`)!).fontSize).toBe("large");
    session().settings.element.querySelector<HTMLButtonElement>(".sign-out")!.click();
    expect(q(".auth-page")).not.toBeNull();
    signIn("Ann");
    expect(text(".overall-progress")).toContain("0 of");
    session().settings.open();
    session().settings.element.querySelector<HTMLButtonElement>(".sign-out")!.click();
    [...document.querySelectorAll<HTMLButtonElement>(".profile-button")].find((b) => b.textContent?.includes("Fudo"))!.click();
    expect(session().tabs.current).toBe("practice");
    expect(text(".task-title")).toBe(tracks[0]!.challenges[1]!.title);
    expect(session().practice.terminal.element.style.getPropertyValue("--terminal-font-size")).toBe("17px");
  });

  it("reset progress from settings goes back Home with everything cleared", () => {
    signIn("Fudo");
    q<HTMLButtonElement>('[data-track="navigation"]')!.click();
    run("pwd");
    session().settings.open();
    session().settings.element.querySelector<HTMLButtonElement>(".reset-button")!.click();
    session().settings.element.querySelector<HTMLButtonElement>(".reset-confirm")!.click();
    expect(session().tabs.current).toBe("home");
    expect(session().trainer.overall.done).toBe(0);
    expect(session().trainer.track).toBeNull();
  });
});
