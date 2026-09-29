import { beforeEach, describe, expect, it } from "vitest";
import { tracks } from "@terminal-trainer/core";
import { createWebApp, type WebApp } from "../src/app";

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

let app: WebApp;
let storage: ReturnType<typeof memoryStorage>;

const q = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector);
const text = (selector: string) => q(selector)?.textContent ?? "";

function signIn(name: string) {
  const input = q<HTMLInputElement>('input[name="name"]')!;
  input.value = name;
  q<HTMLFormElement>(".profile-form")!.dispatchEvent(new Event("submit", { cancelable: true }));
}

function run(line: string) {
  const input = q<HTMLInputElement>("#terminal-input")!;
  input.value = line;
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
}

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  storage = memoryStorage();
  app = createWebApp(document.getElementById("root")!, { storage, version: "1.0.0", typing: 0 });
});

describe("web app flow", () => {
  it("starts on the sign-in page", () => {
    expect(q(".auth-page")).not.toBeNull();
    expect(q(".view-home")).toBeNull();
  });

  it("after sign-in, Mors welcomes you by name on the home page with every track listed", () => {
    signIn("Fudo");
    expect(q(".auth-page")).toBeNull();
    expect(text(".view-home .mors-text")).toContain("Fudo");
    expect(document.querySelectorAll(".track-card").length).toBe(tracks.length);
    expect(text(".profile-chip")).toContain("Fudo");
    expect(text(".overall-progress")).toContain(`0 of ${tracks.flatMap((t) => t.challenges).length}`);
  });

  it("opening a track shows the story panel and keeps the terminal free of instructions", () => {
    signIn("Fudo");
    q<HTMLButtonElement>('[data-track="navigation"]')!.click();
    expect(q<HTMLElement>(".view-practice")!.hidden).toBe(false);
    expect(q<HTMLElement>(".view-home")!.hidden).toBe(true);
    const first = tracks[0]!.challenges[0]!;
    expect(text(".panel .track-name")).toBe("Navigation");
    expect(text(".challenge-title")).toBe(first.title);
    expect(text(".challenge-story")).toBe(first.story);
    expect(text(".challenge-task")).toBe(first.task);
    expect(text(".panel .mors-text")).toBe(tracks[0]!.story);
    const terminal = text(".terminal-output");
    expect(terminal).not.toContain(first.task);
    expect(terminal).toMatch(/Welcome to sandbox/);
  });

  it("solving a challenge makes Mors comment, then Next moves on", () => {
    signIn("Fudo");
    q<HTMLButtonElement>('[data-track="navigation"]')!.click();
    const [first, second] = tracks[0]!.challenges;
    run("pwd");
    expect(text(".challenge-status")).toMatch(/solved/i);
    expect(text(".panel .mors-text")).toContain(first!.lore);
    expect(text(".terminal-output")).not.toContain(first!.lore);
    const next = q<HTMLButtonElement>('[data-action="next"]')!;
    expect(next.disabled).toBe(false);
    next.click();
    expect(text(".challenge-title")).toBe(second!.title);
    expect(text(".panel .track-count")).toBe("1 / " + tracks[0]!.challenges.length);
  });

  it("hint speaks through Mors, answer reveals the solution, skip moves on", () => {
    signIn("Fudo");
    q<HTMLButtonElement>('[data-track="git"]')!.click();
    const git = tracks.find((t) => t.id === "git")!;
    q<HTMLButtonElement>('[data-action="hint"]')!.click();
    expect(text(".panel .mors-text")).toContain(git.challenges[0]!.hint);
    q<HTMLButtonElement>('[data-action="answer"]')!.click();
    expect(q<HTMLElement>(".challenge-answer")!.hidden).toBe(false);
    expect(text(".challenge-answer")).toContain(git.challenges[0]!.solution[0]!);
    q<HTMLButtonElement>('[data-action="skip"]')!.click();
    expect(text(".challenge-title")).toBe(git.challenges[1]!.title);
    expect(q<HTMLElement>(".challenge-answer")!.hidden).toBe(true);
  });

  it("the challenge list jumps within the track and All tracks returns home", () => {
    signIn("Fudo");
    q<HTMLButtonElement>('[data-track="files"]')!.click();
    const rows = document.querySelectorAll<HTMLButtonElement>(".challenge-list .challenge-row");
    expect(rows.length).toBe(tracks[1]!.challenges.length);
    rows[3]!.click();
    expect(text(".challenge-title")).toBe(tracks[1]!.challenges[3]!.title);
    q<HTMLButtonElement>('[data-action="all-tracks"]')!.click();
    expect(q<HTMLElement>(".view-home")!.hidden).toBe(false);
    expect(app.session?.trainer.track).toBeNull();
  });

  it("keeps progress per profile and resumes after sign out and in", () => {
    signIn("Fudo");
    q<HTMLButtonElement>('[data-track="navigation"]')!.click();
    run("pwd");
    q<HTMLButtonElement>(".sign-out")!.click();
    expect(q(".auth-page")).not.toBeNull();
    signIn("Ann");
    expect(text(".overall-progress")).toContain("0 of");
    q<HTMLButtonElement>(".sign-out")!.click();
    const fudo = [...document.querySelectorAll<HTMLButtonElement>(".profile-button")].find((b) => b.textContent?.includes("Fudo"))!;
    fudo.click();
    expect(text(".overall-progress")).toContain("1 of");
    expect(text(".view-home .mors-text")).toContain("Fudo");
    // Resumes inside the open track.
    expect(q<HTMLElement>(".view-practice")!.hidden).toBe(false);
    expect(text(".challenge-title")).toBe(tracks[0]!.challenges[1]!.title);
  });
});
