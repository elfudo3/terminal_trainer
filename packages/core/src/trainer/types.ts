/** Shapes of the practice content: tracks of challenges, each with a story and a Mors comment. */
import type { RunResult, Shell } from "../core/shell";

export interface CheckContext {
  shell: Shell;
  /** The line the user typed. */
  line: string;
  /** Simple whitespace split of `line`, handy for "did they use ls -l" checks. */
  argv: string[];
  /** What the command printed and its exit code. */
  result: RunResult;
}

export interface Challenge {
  /** Stable id used to store progress; never renumber. */
  id: string;
  title: string;
  /** One or two sentences of narrative that set the scene. */
  story: string;
  /** What to do, shown to the user. */
  task: string;
  hint: string;
  /** Reference answer, one line per command. Shown by "Answer" and used in tests. */
  solution: string[];
  /** Mors's comment when the challenge is solved: a bit of history or science, in his voice. */
  lore: string;
  /** Extra preparation on top of the fresh sample filesystem. */
  setup?: (shell: Shell) => void;
  /** True once the task is done. Runs after every command. */
  check: (ctx: CheckContext) => boolean;
}

export interface Track {
  /** Stable id used to store progress. */
  id: string;
  title: string;
  /** A few words shown on the track card. */
  tagline: string;
  /** The track's framing story, told by Mors when the track starts. */
  story: string;
  /** Commands the track teaches, for the card. */
  commands: string[];
  challenges: Challenge[];
}
