/**
 * A small in-memory Git: enough to learn init/add/commit/log/diff/branch.
 *
 * Model: a repository has an index (the staging area: path → content), a
 * map of commits (each a full snapshot of tracked files), branches that
 * point at commits, and a current branch. Paths are relative to the
 * repository root. Nothing here touches the DOM or real disk.
 */
import { resolvePath, type VirtualFS } from "./filesystem";

export interface GitCommit {
  id: string;
  parent: string | null;
  message: string;
  author: string;
  date: number;
  /** Snapshot of every tracked file: path → content. */
  tree: Map<string, string>;
}

export type ChangeKind = "new file" | "modified" | "deleted";

export interface Change {
  path: string;
  kind: ChangeKind;
}

export interface GitStatus {
  branch: string;
  hasCommits: boolean;
  /** Index vs HEAD. */
  staged: Change[];
  /** Working tree vs index, tracked files only. */
  unstaged: Change[];
  untracked: string[];
}

export interface CommitStats {
  files: number;
  insertions: number;
  deletions: number;
}

export class GitError extends Error {}

/** Deterministic 40-hex id from text (FNV-1a in five rounds). Not cryptographic; just looks like a SHA. */
function pseudoSha(input: string): string {
  let out = "";
  for (let round = 0; round < 5; round++) {
    let h = (0x811c9dc5 ^ (round * 0x9e3779b9)) >>> 0;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out += h.toString(16).padStart(8, "0");
  }
  return out;
}

function splitLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

export type DiffLine = { kind: " " | "-" | "+"; text: string };

/** Line diff by longest common subsequence; files are small so O(n·m) is fine. */
export function lineDiff(a: string[], b: string[]): DiffLine[] {
  const n = a.length;
  const m = b.length;
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i]![j] = a[i] === b[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: " ", text: a[i]! });
      i++;
      j++;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) out.push({ kind: "-", text: a[i++]! });
    else out.push({ kind: "+", text: b[j++]! });
  }
  while (i < n) out.push({ kind: "-", text: a[i++]! });
  while (j < m) out.push({ kind: "+", text: b[j++]! });
  return out;
}

/** Changes needed to turn `from` into `to`. With `trackedOnly`, paths new in `to` are ignored. */
export function diffTrees(from: Map<string, string>, to: Map<string, string>, trackedOnly = false): Change[] {
  const changes: Change[] = [];
  for (const [path, content] of to) {
    if (!from.has(path)) {
      if (!trackedOnly) changes.push({ path, kind: "new file" });
    } else if (from.get(path) !== content) changes.push({ path, kind: "modified" });
  }
  for (const path of from.keys()) if (!to.has(path)) changes.push({ path, kind: "deleted" });
  return changes.sort((x, y) => (x.path < y.path ? -1 : 1));
}

/** Unified diff text for one file (`from`/`to` are null for new/deleted files). */
export function formatFileDiff(path: string, from: string | null, to: string | null): string {
  const a = from === null ? [] : splitLines(from);
  const b = to === null ? [] : splitLines(to);
  const lines = lineDiff(a, b);
  let text = `diff --git a/${path} b/${path}\n`;
  text += `--- ${from === null ? "/dev/null" : "a/" + path}\n`;
  text += `+++ ${to === null ? "/dev/null" : "b/" + path}\n`;
  text += `@@ -${a.length === 0 ? 0 : 1},${a.length} +${b.length === 0 ? 0 : 1},${b.length} @@\n`;
  for (const line of lines) text += `${line.kind}${line.text}\n`;
  return text;
}

export class GitRepo {
  readonly index = new Map<string, string>();
  readonly commits = new Map<string, GitCommit>();
  readonly branches = new Map<string, string>();
  branch = "main";
  private seq = 0;

  constructor(
    readonly root: string,
    readonly author = "user <user@sandbox>",
    private readonly now: () => number = Date.now,
  ) {}

  get head(): GitCommit | null {
    const id = this.branches.get(this.branch);
    return id ? (this.commits.get(id) ?? null) : null;
  }

  headTree(): Map<string, string> {
    return new Map(this.head?.tree ?? []);
  }

  /** Repo-relative path for an absolute one, or null when outside the repo. */
  relative(absPath: string): string | null {
    if (absPath === this.root) return "";
    const prefix = this.root === "/" ? "/" : this.root + "/";
    return absPath.startsWith(prefix) ? absPath.slice(prefix.length) : null;
  }

  absolute(rel: string): string {
    return this.root === "/" ? "/" + rel : `${this.root}/${rel}`;
  }

  /** Every file under the root (except .git) as relative path → content. */
  workingTree(fs: VirtualFS): Map<string, string> {
    const files = new Map<string, string>();
    const walk = (abs: string, rel: string) => {
      for (const name of fs.readdir(abs)) {
        if (rel === "" && name === ".git") continue;
        const childAbs = abs === "/" ? "/" + name : `${abs}/${name}`;
        const childRel = rel === "" ? name : `${rel}/${name}`;
        if (fs.isDir(childAbs)) walk(childAbs, childRel);
        else files.set(childRel, fs.readFile(childAbs));
      }
    };
    walk(this.root, "");
    return files;
  }

  status(fs: VirtualFS): GitStatus {
    const working = this.workingTree(fs);
    return {
      branch: this.branch,
      hasCommits: this.commits.size > 0,
      staged: diffTrees(this.headTree(), this.index),
      unstaged: diffTrees(this.index, working, true),
      untracked: [...working.keys()].filter((p) => !this.index.has(p)).sort(),
    };
  }

  /** Stages the given paths (files, directories, or "."), including deletions of tracked files. */
  add(fs: VirtualFS, specs: string[], cwd: string): void {
    const working = this.workingTree(fs);
    for (const spec of specs) {
      const abs = resolvePath(spec, cwd);
      const rel = this.relative(abs);
      if (rel === null) throw new GitError(`fatal: '${spec}' is outside repository at '${this.root}'`);
      const isDir = rel === "" || fs.isDir(abs);
      if (isDir) {
        const prefix = rel === "" ? "" : rel + "/";
        let matched = false;
        for (const [path, content] of working) {
          if (path.startsWith(prefix)) {
            this.index.set(path, content);
            matched = true;
          }
        }
        for (const path of [...this.index.keys()]) {
          if (path.startsWith(prefix) && !working.has(path)) {
            this.index.delete(path);
            matched = true;
          }
        }
        if (!matched && rel !== "") throw new GitError(`fatal: pathspec '${spec}' did not match any files`);
      } else if (working.has(rel)) this.index.set(rel, working.get(rel)!);
      else if (this.index.has(rel)) this.index.delete(rel); // staging a deletion
      else throw new GitError(`fatal: pathspec '${spec}' did not match any files`);
    }
  }

  /** Stages every change to already-tracked files (what `git commit -a` does). */
  addTracked(fs: VirtualFS): void {
    const working = this.workingTree(fs);
    for (const path of [...this.index.keys()]) {
      if (working.has(path)) this.index.set(path, working.get(path)!);
      else this.index.delete(path);
    }
  }

  /** Records the index as a new commit on the current branch; null when nothing is staged. */
  commit(message: string): { commit: GitCommit; stats: CommitStats } | null {
    const parentTree = this.headTree();
    const changes = diffTrees(parentTree, this.index);
    if (changes.length === 0) return null;
    const stats: CommitStats = { files: changes.length, insertions: 0, deletions: 0 };
    for (const change of changes) {
      const before = splitLines(parentTree.get(change.path) ?? "");
      const after = splitLines(this.index.get(change.path) ?? "");
      for (const line of lineDiff(before, after)) {
        if (line.kind === "+") stats.insertions++;
        else if (line.kind === "-") stats.deletions++;
      }
    }
    const parent = this.head?.id ?? null;
    const date = this.now();
    const id = pseudoSha(`${parent ?? "root"}|${message}|${date}|${this.seq++}|${[...this.index].join(";")}`);
    const commit: GitCommit = { id, parent, message, author: this.author, date, tree: new Map(this.index) };
    this.commits.set(id, commit);
    this.branches.set(this.branch, id);
    return { commit, stats };
  }

  /** Commits reachable from HEAD, newest first. */
  log(): GitCommit[] {
    const out: GitCommit[] = [];
    let current = this.head;
    while (current) {
      out.push(current);
      current = current.parent ? (this.commits.get(current.parent) ?? null) : null;
    }
    return out;
  }

  createBranch(name: string): void {
    if (this.branches.has(name)) throw new GitError(`fatal: a branch named '${name}' already exists`);
    const head = this.head;
    if (!head) throw new GitError(`fatal: not a valid object name: '${this.branch}'`);
    this.branches.set(name, head.id);
  }

  /** Switches branch, rewriting tracked files in the working tree to match. */
  switchTo(fs: VirtualFS, name: string, notFoundMessage: string): void {
    const target = this.branches.get(name);
    if (target === undefined) throw new GitError(notFoundMessage);
    const status = this.status(fs);
    const dirty = [...status.staged, ...status.unstaged].map((c) => c.path).sort();
    if (dirty.length > 0) {
      throw new GitError(
        "error: Your local changes to the following files would be overwritten by checkout:\n" +
          dirty.map((p) => `\t${p}`).join("\n") +
          "\nPlease commit your changes or stash them before you switch branches.\nAborting",
      );
    }
    const from = this.headTree();
    const to = new Map(this.commits.get(target)!.tree);
    for (const path of from.keys()) if (!to.has(path)) fs.remove(this.absolute(path));
    for (const [path, content] of to) {
      const abs = this.absolute(path);
      fs.mkdir(abs.slice(0, abs.lastIndexOf("/")) || "/", { parents: true });
      fs.writeFile(abs, content);
    }
    this.index.clear();
    for (const [path, content] of to) this.index.set(path, content);
    this.branch = name;
  }

  /** `git restore`: working file ← index. With `staged`, index ← HEAD. */
  restore(fs: VirtualFS, specs: string[], cwd: string, staged: boolean): void {
    const head = this.headTree();
    for (const spec of specs) {
      const rel = this.relative(resolvePath(spec, cwd));
      const source = staged ? head : this.index;
      if (rel === null || (!source.has(rel) && !(staged && this.index.has(rel)))) {
        throw new GitError(`error: pathspec '${spec}' did not match any file(s) known to git`);
      }
      if (staged) {
        if (head.has(rel)) this.index.set(rel, head.get(rel)!);
        else this.index.delete(rel);
      } else {
        fs.writeFile(this.absolute(rel), this.index.get(rel)!);
      }
    }
  }

  /** Unified diff of unstaged changes, or of staged changes vs HEAD. */
  diff(fs: VirtualFS, staged: boolean): string {
    const from = staged ? this.headTree() : this.index;
    const to = staged ? this.index : this.workingTree(fs);
    let text = "";
    for (const change of diffTrees(from, to, !staged)) {
      text += formatFileDiff(change.path, from.get(change.path) ?? null, to.get(change.path) ?? null);
    }
    return text;
  }
}
