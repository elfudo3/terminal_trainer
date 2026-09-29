import { describe, expect, it } from "vitest";
import { createSampleFS } from "../../src/core/sample-fs";
import { Shell } from "../../src/core/shell";
import { Trainer } from "../../src/trainer/trainer";
import { tracks } from "../../src/trainer/tracks";

describe("track catalogue", () => {
  it("has the eight tracks, with unique ids and complete text", () => {
    expect(tracks.map((t) => t.id)).toEqual(["navigation", "files", "viewing", "searching", "pipes", "permissions", "environment", "git"]);
    const ids = tracks.flatMap((t) => t.challenges.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const track of tracks) {
      expect(track.story.length).toBeGreaterThan(20);
      expect(track.commands.length).toBeGreaterThan(0);
      expect(track.challenges.length).toBeGreaterThanOrEqual(5);
      for (const c of track.challenges) {
        for (const field of ["title", "story", "task", "hint", "lore"] as const) expect(c[field].length, `${c.id}.${field}`).toBeGreaterThan(0);
        expect(c.solution.length, c.id).toBeGreaterThan(0);
        expect(c.lore.split(/[.!?]\s/).length, `${c.id} lore too long`).toBeLessThanOrEqual(4);
      }
    }
  });

  it("every challenge is solved by its own reference solution and not by a no-op", () => {
    for (const track of tracks) {
      for (const [index, challenge] of track.challenges.entries()) {
        const shell = new Shell({ fs: createSampleFS() });
        const trainer = new Trainer({ shell, tracks, freshFS: createSampleFS });
        trainer.selectTrack(track.id, index);
        expect(trainer.afterCommand("true", shell.run("true")), `${challenge.id} solved by 'true'`).toBe("no");
        let outcome = "no";
        for (const line of challenge.solution) outcome = trainer.afterCommand(line, shell.run(line));
        expect(outcome, `${challenge.id} not solved by ${challenge.solution.join(" ; ")}`).toBe("solved");
      }
    }
  });
});
