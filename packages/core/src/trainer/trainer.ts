/**
 * The practice engine. Tracks are independent: the user picks one, works
 * through its challenges in a fresh sandbox, and can switch at any time.
 * Progress (completed challenge ids, the open track and position) is
 * saved through a small storage interface. No DOM code here.
 */
import type { VirtualFS } from "../core/filesystem";
import type { RunResult, Shell } from "../core/shell";
import type { Challenge, Track } from "./types";

export type { Challenge, CheckContext, Track } from "./types";

/** The subset of localStorage the trainer needs, so tests can pass a plain object. */
export interface ProgressStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface SavedProgress {
  completed: string[];
  track: string | null;
  index: number;
}

export interface TrainerOptions {
  shell: Shell;
  tracks: Track[];
  /** Builds a pristine filesystem; called whenever a challenge (re)starts. */
  freshFS: () => VirtualFS;
  storage?: ProgressStorage;
}

export const STORAGE_KEY = "terminal-trainer.progress";

export type CheckOutcome = "solved" | "already" | "no";

export interface Progress {
  done: number;
  total: number;
  index: number;
}

export class Trainer {
  readonly tracks: Track[];
  private readonly shell: Shell;
  private readonly freshFS: () => VirtualFS;
  private readonly storage: ProgressStorage | undefined;
  private readonly completed = new Set<string>();
  private readonly listeners = new Set<() => void>();
  private trackId: string | null = null;
  private index = 0;
  /** True once the current challenge has been solved (so `next` is allowed). */
  solved = false;

  constructor(opts: TrainerOptions) {
    this.shell = opts.shell;
    this.tracks = opts.tracks;
    this.freshFS = opts.freshFS;
    this.storage = opts.storage;
    const saved = this.load();
    for (const id of saved.completed) this.completed.add(id);
    const savedTrack = this.tracks.find((t) => t.id === saved.track);
    if (savedTrack) {
      // Resume where the user was, unless that challenge is already solved:
      // then the first unfinished one is the natural place to continue.
      const at = savedTrack.challenges[saved.index];
      this.selectTrack(savedTrack.id, at && !this.completed.has(at.id) ? saved.index : undefined);
    } else this.leaveTrack();
  }

  // ---- State -------------------------------------------------------------

  /** The open track, or null in free play. */
  get track(): Track | null {
    return this.tracks.find((t) => t.id === this.trackId) ?? null;
  }

  get current(): Challenge | null {
    return this.track?.challenges[this.index] ?? null;
  }

  /** Progress within the open track (zeros in free play). */
  get progress(): Progress {
    const track = this.track;
    if (!track) return { done: 0, total: 0, index: 0 };
    return { done: this.countDone(track), total: track.challenges.length, index: this.index };
  }

  trackProgress(trackId: string): { done: number; total: number } {
    const track = this.tracks.find((t) => t.id === trackId);
    return track ? { done: this.countDone(track), total: track.challenges.length } : { done: 0, total: 0 };
  }

  /** Progress across every track. */
  get overall(): { done: number; total: number } {
    return {
      done: this.tracks.reduce((n, t) => n + this.countDone(t), 0),
      total: this.tracks.reduce((n, t) => n + t.challenges.length, 0),
    };
  }

  /** True when every challenge of the open track is completed. */
  get finished(): boolean {
    const track = this.track;
    return track !== null && this.countDone(track) === track.challenges.length;
  }

  isCompleted(challenge: Challenge): boolean {
    return this.completed.has(challenge.id);
  }

  // ---- Moving between tracks and challenges ------------------------------

  /** Opens a track at `index`, or at its first unfinished challenge. False for an unknown track. */
  selectTrack(trackId: string, index?: number): boolean {
    const track = this.tracks.find((t) => t.id === trackId);
    if (!track) return false;
    this.trackId = trackId;
    const firstOpen = track.challenges.findIndex((c) => !this.completed.has(c.id));
    this.goTo(index ?? (firstOpen === -1 ? 0 : firstOpen));
    return true;
  }

  /** Back to the menu: no challenge, plain sandbox. Progress is kept. */
  leaveTrack(): void {
    this.trackId = null;
    this.index = 0;
    this.solved = false;
    this.shell.resetFilesystem(this.freshFS());
    this.save();
    this.notify();
  }

  /** Loads challenge `index` of the open track into a fresh sandbox (clamped to the track). */
  goTo(index: number): void {
    const track = this.track;
    if (!track) return;
    this.index = Math.min(Math.max(0, index), track.challenges.length - 1);
    this.reset();
    this.save();
  }

  /** Advances to the next challenge; false if the current one is unsolved or is the last. */
  next(): boolean {
    if (!this.solved) return false;
    return this.skip();
  }

  /** Moves on without solving; false when already on the last challenge (or in free play). */
  skip(): boolean {
    const track = this.track;
    if (!track || this.index >= track.challenges.length - 1) return false;
    this.goTo(this.index + 1);
    return true;
  }

  /** Puts the sandbox back to the current challenge's starting state. Progress is kept. */
  reset(): void {
    this.shell.resetFilesystem(this.freshFS());
    this.current?.setup?.(this.shell);
    this.solved = false;
    this.notify();
  }

  /** Forgets all progress and returns to the menu. */
  resetProgress(): void {
    this.completed.clear();
    this.leaveTrack();
  }

  // ---- Checking ----------------------------------------------------------

  /** Call after every command the user runs. */
  afterCommand(line: string, result: RunResult): CheckOutcome {
    const challenge = this.current;
    if (!challenge) return "no";
    if (this.solved) return "already";
    const argv = line.trim().split(/\s+/);
    let passed = false;
    try {
      passed = challenge.check({ shell: this.shell, line, argv, result });
    } catch {
      passed = false; // a check should never crash the terminal
    }
    if (!passed) return "no";
    this.solved = true;
    this.completed.add(challenge.id);
    this.save();
    this.notify();
    return "solved";
  }

  // ---- Listeners (the UI re-renders on change) ---------------------------

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  // ---- Helpers and persistence -------------------------------------------

  private countDone(track: Track): number {
    return track.challenges.filter((c) => this.completed.has(c.id)).length;
  }

  private load(): SavedProgress {
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<SavedProgress>) : {};
      return {
        completed: Array.isArray(parsed.completed) ? parsed.completed.filter((x) => typeof x === "string") : [],
        track: typeof parsed.track === "string" ? parsed.track : null,
        index: typeof parsed.index === "number" ? parsed.index : 0,
      };
    } catch {
      return { completed: [], track: null, index: 0 };
    }
  }

  private save(): void {
    try {
      const data: SavedProgress = { completed: [...this.completed], track: this.trackId, index: this.index };
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage can be unavailable (private mode, quota); progress just won't persist.
    }
  }
}
