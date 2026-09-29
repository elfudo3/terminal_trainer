import { describe, expect, it } from "vitest";
import { createMors } from "../../src/mors/voice";
import { MORS_FILES } from "../../src/mors/files";
import { createSampleFS } from "../../src/core/sample-fs";
import type { Challenge, Track } from "../../src/trainer/types";

const challenge: Challenge = {
  id: "x",
  title: "Test",
  story: "A story.",
  task: "Do it.",
  hint: "Try pwd.",
  solution: ["pwd"],
  lore: "pwd has answered 'where am I' since 1971.",
  check: () => true,
};
const track: Track = { id: "t", title: "Navigation", tagline: "Find your way", story: "The chamber awaits.", commands: ["pwd"], challenges: [challenge] };

describe("Mors's voice", () => {
  const mors = createMors(() => 0); // deterministic picks

  it("welcomes new and returning users by name", () => {
    expect(mors.welcome("Fudo", false)).toContain("Fudo");
    expect(mors.welcome("Fudo", true)).toContain("Fudo");
    expect(mors.welcome("Fudo", false)).not.toBe(mors.welcome("Fudo", true));
  });

  it("comments on a solved challenge using its lore", () => {
    const text = mors.solved(challenge, { trackDone: false });
    expect(text).toContain(challenge.lore);
    expect(mors.solved(challenge, { trackDone: true })).toMatch(/track|done|finished|complete/i);
  });

  it("gives hints in his own words without hiding the hint", () => {
    expect(mors.hint(challenge)).toContain("Try pwd.");
  });

  it("introduces tracks and himself", () => {
    expect(mors.trackIntro(track)).toContain("The chamber awaits.");
    expect(mors.about()).toMatch(/mors help/);
    expect(mors.noChallenge()).toMatch(/track/i);
  });

  it("varies flourishes with the random source but stays short", () => {
    const other = createMors(() => 0.99);
    const a = mors.solved(challenge, { trackDone: false });
    const b = other.solved(challenge, { trackDone: false });
    expect(a).not.toBe(b);
    expect(a.split("\n").length).toBeLessThanOrEqual(2);
  });
});

describe("Mors's files in the sandbox", () => {
  it("are placed in the sample filesystem", () => {
    const fs = createSampleFS();
    for (const path of Object.keys(MORS_FILES)) expect(fs.isFile(path), path).toBe(true);
    expect(fs.isDir("/opt/mors/.chamber")).toBe(true);
    expect(fs.readFile("/opt/mors/README.txt")).toMatch(/Mors/);
    expect(fs.readFile("/opt/mors/notes/valdraak.txt")).toMatch(/Valdraak/);
  });
});
