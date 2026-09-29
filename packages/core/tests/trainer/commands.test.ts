import { describe, expect, it } from "vitest";
import { createSampleFS } from "../../src/core/sample-fs";
import { Shell } from "../../src/core/shell";
import { createMors } from "../../src/mors/voice";
import { trainerCommands } from "../../src/trainer/commands";
import { tracks } from "../../src/trainer/tracks";
import { Trainer } from "../../src/trainer/trainer";

function make() {
  const shell = new Shell({ fs: createSampleFS() });
  const trainer = new Trainer({ shell, tracks, freshFS: createSampleFS });
  for (const cmd of trainerCommands(trainer, createMors(() => 0))) shell.register(cmd);
  return { shell, trainer };
}

describe("practice commands", () => {
  it("only registers hint, skip and mors", () => {
    const { shell } = make();
    const names = shell.listCommands().filter((c) => c.category === "Practice").map((c) => c.name);
    expect(names).toEqual(["hint", "skip", "mors"]);
    for (const gone of ["task", "tasks", "answer", "next", "progress", "reset"]) expect(shell.getCommand(gone)).toBeUndefined();
  });

  it("hint and mors help give the current challenge's hint, or a nudge to pick a track", () => {
    const { shell, trainer } = make();
    expect(shell.run("hint").stdout).toMatch(/track/i);
    trainer.selectTrack("navigation");
    expect(shell.run("hint").stdout).toContain(trainer.current!.hint);
    expect(shell.run("mors help").stdout).toContain(trainer.current!.hint);
  });

  it("skip moves on within the track without printing the instructions", () => {
    const { shell, trainer } = make();
    trainer.selectTrack("navigation");
    const second = trainer.track!.challenges[1]!;
    const result = shell.run("skip");
    expect(trainer.current?.id).toBe(second.id);
    expect(result.stdout).toContain(second.title);
    expect(result.stdout).not.toContain(second.task);
    trainer.goTo(trainer.track!.challenges.length - 1);
    expect(shell.run("skip").stdout).toMatch(/last/i);
    trainer.leaveTrack();
    expect(shell.run("skip").stderr).toMatch(/track/i);
  });

  it("mors introduces himself and tells the story", () => {
    const { shell, trainer } = make();
    expect(shell.run("mors").stdout).toMatch(/Mors/);
    expect(shell.run("mors story").stdout).toMatch(/track/i);
    trainer.selectTrack("git");
    const story = shell.run("mors story").stdout;
    expect(story).toContain(trainer.track!.story);
    expect(story).toContain(trainer.current!.story);
    expect(shell.run("mors dance").stderr).toMatch(/mors help/);
  });
});
