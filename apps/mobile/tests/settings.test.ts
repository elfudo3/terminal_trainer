import { describe, expect, it, vi } from "vitest";
import { SIGILS } from "@terminal-trainer/core";
import { DEFAULT_PREFERENCES } from "../src/preferences";
import { createSettingsSheet } from "../src/screens/settings";

function make() {
  document.body.innerHTML = '<div id="root"></div>';
  const onFontSize = vi.fn();
  const onResetProgress = vi.fn();
  const onSignOut = vi.fn();
  const profile = { id: "p_1", name: "Fudo", sigil: SIGILS[2]!, createdAt: 1, lastSeenAt: 1 };
  const sheet = createSettingsSheet(document.getElementById("root")!, { prefs: { ...DEFAULT_PREFERENCES }, profile, onFontSize, onResetProgress, onSignOut, version: "1.2.3" });
  return { sheet, onFontSize, onResetProgress, onSignOut };
}

describe("settings sheet", () => {
  it("opens and closes, including with Escape and the backdrop", () => {
    const { sheet } = make();
    expect(sheet.isOpen()).toBe(false);
    sheet.open();
    expect(sheet.isOpen()).toBe(true);
    expect(sheet.element.querySelector('[role="dialog"]')?.getAttribute("aria-modal")).toBe("true");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(sheet.isOpen()).toBe(false);
    sheet.open();
    sheet.element.querySelector<HTMLElement>(".sheet-backdrop")!.click();
    expect(sheet.isOpen()).toBe(false);
  });

  it("shows the profile and signs out", () => {
    const { sheet, onSignOut } = make();
    sheet.open();
    expect(sheet.element.querySelector(".settings-profile-name")?.textContent).toBe("Fudo");
    expect(sheet.element.querySelector(".settings-profile .avatar img")?.getAttribute("alt")).toBe("Lightning");
    sheet.element.querySelector<HTMLButtonElement>(".sign-out")!.click();
    expect(onSignOut).toHaveBeenCalled();
    expect(sheet.isOpen()).toBe(false);
  });

  it("changes the font size and shows the version", () => {
    const { sheet, onFontSize } = make();
    sheet.open();
    const large = sheet.element.querySelector<HTMLButtonElement>('[data-size="large"]')!;
    large.click();
    expect(onFontSize).toHaveBeenCalledWith("large");
    expect(large.getAttribute("aria-pressed")).toBe("true");
    expect(sheet.element.querySelector('[data-size="medium"]')?.getAttribute("aria-pressed")).toBe("false");
    expect(sheet.element.textContent).toContain("1.2.3");
  });

  it("asks for confirmation before resetting progress", () => {
    const { sheet, onResetProgress } = make();
    sheet.open();
    sheet.element.querySelector<HTMLButtonElement>(".reset-button")!.click();
    expect(onResetProgress).not.toHaveBeenCalled();
    sheet.element.querySelector<HTMLButtonElement>(".reset-cancel")!.click();
    expect(sheet.element.querySelector<HTMLElement>(".reset-confirm-row")!.hidden).toBe(true);
    sheet.element.querySelector<HTMLButtonElement>(".reset-button")!.click();
    sheet.element.querySelector<HTMLButtonElement>(".reset-confirm")!.click();
    expect(onResetProgress).toHaveBeenCalledTimes(1);
    expect(sheet.isOpen()).toBe(false);
  });
});
