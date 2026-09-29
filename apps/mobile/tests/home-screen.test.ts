import { describe, expect, it, vi } from "vitest";
import { createHomeScreen } from "../src/screens/home";
import { makeFixture } from "./helpers";

describe("home screen", () => {
  it("shows Mors, overall progress and the track menu", async () => {
    const { root, shell, trainer } = makeFixture();
    const onSelectTrack = vi.fn();
    const home = createHomeScreen(root, trainer, { typing: 0, onSelectTrack });
    await home.bubble.say("Welcome, tester.");
    expect(home.element.querySelector(".mors-text")?.textContent).toBe("Welcome, tester.");
    expect(home.element.querySelector(".overall-progress")?.textContent).toBe("0 of 3 challenges done");
    expect(home.element.querySelectorAll(".track-card").length).toBe(2);
    home.element.querySelector<HTMLButtonElement>('[data-track="pipes"]')!.click();
    expect(onSelectTrack).toHaveBeenCalledWith("pipes");
    trainer.selectTrack("basics");
    trainer.afterCommand("touch a", shell.run("touch a"));
    expect(home.element.querySelector(".overall-progress")?.textContent).toBe("1 of 3 challenges done");
  });
});
