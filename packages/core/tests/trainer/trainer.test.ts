import { describe, expect, it } from "vitest";
import { createSampleFS } from "../../src/core/sample-fs";
import { Shell } from "../../src/core/shell";
import { STORAGE_KEY, Trainer } from "../../src/trainer/trainer";
import type { Challenge, Track } from "../../src/trainer/types";

/** A tiny in-memory stand-in for localStorage. */
function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

const ch = (id: string, file: string, extra: Partial<Challenge> = {}): Challenge => ({
  id,
  title: `Make ${file}`,
  story: `Mors needs ${file}.`,
  task: `touch ${file}`,
  hint: "touch",
  solution: [`touch ${file}`],
  lore: `${file} exists now.`,
  check: ({ shell }) => shell.fs.exists(`/home/user/${file}`),
  ...extra,
});

const tracks: Track[] = [
  { id: "alpha", title: "Alpha", tagline: "a", story: "Alpha begins.", commands: ["touch"], challenges: [ch("a1", "a1"), ch("a2", "a2")] },
  {
    id: "beta",
    title: "Beta",
    tagline: "b",
    story: "Beta begins.",
    commands: ["echo"],
    challenges: [
      ch("b1", "b1", { setup: (shell) => shell.fs.writeFile("/home/user/extra.txt", "x") }),
      { ...ch("b2", "b2"), check: ({ result }) => result.stdout === "hi\n", solution: ["echo hi"] },
    ],
  },
];

function make(storage = memoryStorage()) {
  const shell = new Shell({ fs: createSampleFS() });
  const trainer = new Trainer({ shell, tracks, storage, freshFS: createSampleFS });
  const run = (line: string) => trainer.afterCommand(line, shell.run(line));
  return { shell, trainer, storage, run };
}

describe("Trainer: tracks", () => {
  it("starts with no track selected and the sandbox in free play", () => {
    const { trainer, run } = make();
    expect(trainer.track).toBeNull();
    expect(trainer.current).toBeNull();
    expect(trainer.progress).toEqual({ done: 0, total: 0, index: 0 });
    expect(run("touch a1")).toBe("no");
    expect(trainer.overall).toEqual({ done: 0, total: 4 });
  });

  it("selects a track independently of the others and loads its first unfinished challenge", () => {
    const { trainer, run } = make();
    expect(trainer.selectTrack("beta")).toBe(true);
    expect(trainer.track?.id).toBe("beta");
    expect(trainer.current?.id).toBe("b1");
    expect(trainer.progress).toEqual({ done: 0, total: 2, index: 0 });
    expect(run("touch b1")).toBe("solved");
    expect(trainer.next()).toBe(true);
    expect(trainer.current?.id).toBe("b2");
    // Alpha is untouched and can be started at any time.
    expect(trainer.trackProgress("alpha")).toEqual({ done: 0, total: 2 });
    expect(trainer.selectTrack("alpha")).toBe(true);
    expect(trainer.current?.id).toBe("a1");
    expect(trainer.selectTrack("nope")).toBe(false);
  });

  it("resumes a track at its first unfinished challenge, or the start when all are done", () => {
    const { trainer, run } = make();
    trainer.selectTrack("alpha");
    run("touch a1");
    trainer.selectTrack("beta");
    trainer.selectTrack("alpha");
    expect(trainer.current?.id).toBe("a2");
    run("touch a2");
    expect(trainer.finished).toBe(true);
    trainer.selectTrack("beta");
    trainer.selectTrack("alpha");
    expect(trainer.current?.id).toBe("a1");
    expect(trainer.trackProgress("alpha")).toEqual({ done: 2, total: 2 });
  });

  it("only reports solved once, and next() waits for it while skip() does not", () => {
    const { trainer, run } = make();
    trainer.selectTrack("alpha");
    expect(run("ls")).toBe("no");
    expect(trainer.next()).toBe(false);
    expect(run("touch a1")).toBe("solved");
    expect(run("touch a1")).toBe("already");
    expect(trainer.next()).toBe(true);
    expect(trainer.skip()).toBe(false); // last challenge in the track
    expect(trainer.current?.id).toBe("a2");
  });

  it("resets the sandbox and runs the challenge's setup whenever a challenge starts", () => {
    const { shell, trainer } = make();
    shell.run("touch stray; cd documents");
    trainer.selectTrack("beta");
    expect(shell.fs.exists("/home/user/stray")).toBe(false);
    expect(shell.cwd).toBe("/home/user");
    expect(shell.fs.exists("/home/user/extra.txt")).toBe(true);
    trainer.skip();
    expect(shell.fs.exists("/home/user/extra.txt")).toBe(false);
  });

  it("reset() restores the current challenge's files without losing progress", () => {
    const { shell, trainer, run } = make();
    trainer.selectTrack("alpha");
    run("touch a1");
    shell.run("rm notes.txt");
    trainer.reset();
    expect(shell.fs.exists("/home/user/notes.txt")).toBe(true);
    expect(shell.fs.exists("/home/user/a1")).toBe(false);
    expect(trainer.progress.done).toBe(1);
    expect(trainer.solved).toBe(false);
  });

  it("leaveTrack() returns to free play and keeps progress", () => {
    const { trainer, run } = make();
    trainer.selectTrack("alpha");
    run("touch a1");
    trainer.leaveTrack();
    expect(trainer.track).toBeNull();
    expect(trainer.trackProgress("alpha").done).toBe(1);
    expect(trainer.overall.done).toBe(1);
  });

  it("persists progress and the open track, and resumes from storage", () => {
    const storage = memoryStorage();
    const first = make(storage);
    first.trainer.selectTrack("beta");
    first.run("touch b1");
    first.trainer.next();
    const second = make(storage);
    expect(second.trainer.track?.id).toBe("beta");
    expect(second.trainer.current?.id).toBe("b2");
    expect(second.trainer.overall.done).toBe(1);
    second.trainer.resetProgress();
    expect(second.trainer.track).toBeNull();
    expect(second.trainer.overall.done).toBe(0);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual({ completed: [], track: null, index: 0 });
  });

  it("resumes at the first unfinished challenge when the saved one was solved without pressing next", () => {
    const storage = memoryStorage();
    const first = make(storage);
    first.trainer.selectTrack("alpha");
    first.run("touch a1");
    const second = make(storage);
    expect(second.trainer.current?.id).toBe("a2");
    // But an unsolved saved position is kept exactly.
    second.trainer.selectTrack("beta");
    second.trainer.goTo(1);
    expect(make(storage).trainer.current?.id).toBe("b2");
  });

  it("survives corrupt storage and unknown saved tracks", () => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    expect(() => make(storage)).not.toThrow();
    storage.setItem(STORAGE_KEY, JSON.stringify({ completed: ["a1"], track: "gone", index: 7 }));
    const { trainer } = make(storage);
    expect(trainer.track).toBeNull();
    expect(trainer.overall.done).toBe(1);
  });

  it("notifies listeners on every state change", () => {
    const { trainer, run } = make();
    let calls = 0;
    const stop = trainer.subscribe(() => calls++);
    trainer.selectTrack("alpha");
    run("touch a1");
    trainer.next();
    stop();
    trainer.skip();
    expect(calls).toBe(3);
  });
});
