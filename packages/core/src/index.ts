/**
 * Public API of the core package. Apps import from "@terminal-trainer/core"
 * and never reach into internal paths.
 */
export { Shell, type RunResult, type ShellOptions } from "./core/shell";
export { VirtualFS, FsError, resolvePath, type FsNode } from "./core/filesystem";
export { createSampleFS } from "./core/sample-fs";
export { complete, type Completion } from "./core/completion";
export { defaultCommands } from "./core/commands";
export { GitRepo, type GitCommit, type GitStatus } from "./core/git";
export type { Command, CommandContext, CommandResult } from "./core/types";
export { Trainer, STORAGE_KEY, type CheckOutcome, type Progress, type ProgressStorage } from "./trainer/trainer";
export type { Challenge, CheckContext, Track } from "./trainer/types";
export { tracks } from "./trainer/tracks";
export { trainerCommands } from "./trainer/commands";
export { createMors, type MorsVoice } from "./mors/voice";
export { MORS_FILES, MORS_HOME } from "./mors/files";
export { ProfileStore, SIGILS, PROFILES_KEY, namespacedStorage, type Profile } from "./profiles/profiles";
