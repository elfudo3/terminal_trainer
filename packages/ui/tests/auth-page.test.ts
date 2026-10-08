import { describe, expect, it, vi } from "vitest";
import { ProfileStore, SIGILS } from "@terminal-trainer/core";
import { createAuthPage, timeAgo } from "../src/auth-page";
import { memoryStorage } from "./helpers";

function make(store = new ProfileStore(memoryStorage())) {
  document.body.innerHTML = '<div id="root"></div>';
  const onSignIn = vi.fn();
  const page = createAuthPage(document.getElementById("root")!, store, { onSignIn });
  const name = page.element.querySelector<HTMLInputElement>('input[name="name"]')!;
  const form = page.element.querySelector<HTMLFormElement>("form")!;
  const submit = () => form.dispatchEvent(new Event("submit", { cancelable: true }));
  return { store, page, onSignIn, name, submit };
}

describe("auth page", () => {
  it("shows only the create form when there are no profiles", () => {
    const { page } = make();
    expect(page.element.querySelector<HTMLElement>(".auth-existing")!.hidden).toBe(true);
    expect(page.element.querySelectorAll(".sigil-option").length).toBe(SIGILS.length);
    expect(page.element.querySelector('.sigil-option[data-sigil="knight"] img')?.getAttribute("alt")).toBe("Knight");
    expect(page.element.querySelector<HTMLImageElement>(".auth-portrait img")?.alt).toBe("Mors the Wizard");
    expect(page.element.querySelector("canvas")).toBeNull(); // static backdrop in jsdom
    expect(page.element.querySelector(".border-glow-card .auth-card")).not.toBeNull();
    expect(page.element.textContent).toMatch(/Progress saved on this device/);
    expect(page.element.querySelector(".auth-heading-new")?.textContent).toBe("Create your profile");
  });

  it("creates a profile with the chosen sigil and signs in", () => {
    const { page, name, submit, onSignIn, store } = make();
    page.element.querySelector<HTMLButtonElement>(`[data-sigil="${SIGILS[3]}"]`)!.click();
    name.value = "Fudo";
    submit();
    expect(onSignIn).toHaveBeenCalledWith(expect.objectContaining({ name: "Fudo", sigil: SIGILS[3] }));
    expect(store.current?.name).toBe("Fudo");
  });

  it("keeps keyboard focus and selection together in the avatar radio group", () => {
    const { page, name, submit, onSignIn } = make();
    const selected = () => page.element.querySelector<HTMLButtonElement>('[role="radio"][aria-checked="true"]')!;
    selected().focus();
    selected().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    expect(selected().dataset.sigil).toBe(SIGILS[1]);
    expect(document.activeElement).toBe(selected());
    expect(page.element.querySelectorAll('.sigil-option[tabindex="0"]').length).toBe(1);
    selected().dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    selected().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(selected().dataset.sigil).toBe(SIGILS.at(-1));
    name.value = "Keyboard learner";
    submit();
    expect(onSignIn).toHaveBeenCalledWith(expect.objectContaining({ sigil: SIGILS.at(-1) }));
    page.dispose();
  });

  it("shows validation errors inline", () => {
    const { page, name, submit, onSignIn } = make();
    name.value = "   ";
    submit();
    expect(page.element.querySelector(".form-error")?.textContent).toMatch(/name/i);
    expect(onSignIn).not.toHaveBeenCalled();
  });

  it("lists existing profiles, signs in on tap, and removes after a confirming second tap", () => {
    const store = new ProfileStore(memoryStorage());
    store.create("Ann", SIGILS[0]!);
    store.create("Bob", SIGILS[1]!);
    const { page, onSignIn } = make(store);
    expect(page.element.querySelector<HTMLElement>(".auth-existing")!.hidden).toBe(false);
    const buttons = page.element.querySelectorAll<HTMLButtonElement>(".profile-button");
    expect(buttons.length).toBe(2);
    expect(buttons[0]!.querySelector(".avatar img")).not.toBeNull();
    expect(buttons[0]!.querySelector(".profile-meta")?.textContent).toMatch(/just now/);
    buttons[1]!.click();
    expect(onSignIn).toHaveBeenCalledWith(expect.objectContaining({ name: store.list()[0]!.name }));
    const remove = page.element.querySelector<HTMLButtonElement>(".profile-remove")!;
    remove.click();
    expect(remove.textContent).toBe("Remove?");
    expect(store.list().length).toBe(2);
    remove.click();
    expect(store.list().length).toBe(1);
    expect(page.element.querySelectorAll(".profile-button").length).toBe(1);
  });

  it("removes itself and the effect roots on dispose", () => {
    const { page } = make();
    page.dispose();
    expect(document.querySelector(".auth-page")).toBeNull();
    expect(document.querySelector(".border-glow-card")).toBeNull();
  });

  it("formats relative times", () => {
    const now = 1_000_000_000;
    expect(timeAgo(now - 5_000, now)).toBe("just now");
    expect(timeAgo(now - 5 * 60_000, now)).toBe("5 min ago");
    expect(timeAgo(now - 3_600_000, now)).toBe("1 hour ago");
    expect(timeAgo(now - 2 * 86_400_000, now)).toBe("2 days ago");
  });
});
