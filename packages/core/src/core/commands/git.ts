/** The `git` command: a faithful-looking front end over the in-memory GitRepo. */
import { GitError, type GitCommit } from "../git";
import type { Command, CommandResult } from "../types";
import { parseArgs } from "./args";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function gitDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${DAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, " ")} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} ${d.getUTCFullYear()} +0000`;
}

const USAGE = "usage: git <command> [<args>]\n\nCommands: init status add commit log diff branch checkout switch restore\n";

function formatCommit(commit: GitCommit): string {
  return `commit ${commit.id}\nAuthor: ${commit.author}\nDate:   ${gitDate(commit.date)}\n\n    ${commit.message}\n\n`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const git: Command = {
  name: "git",
  category: "Version control",
  summary: "track changes to files: init, add, commit, log, branch...",
  usage: "git <command> [args]",
  details: [
    "A small, real-feeling Git for practice. Supported commands:",
    "",
    "  git init                 start tracking the current directory",
    "  git status               what is changed, staged, or untracked",
    "  git add <path|.>         stage changes for the next commit",
    "  git commit -m \"msg\"      record the staged changes (-a stages tracked files first)",
    "  git log [--oneline]      show history",
    "  git diff [--staged]      show line changes",
    "  git branch [name]        list or create branches",
    "  git switch <name>        move to a branch (-c creates it); git checkout works too",
    "  git restore <path>       throw away changes to a file (--staged: unstage)",
  ].join("\n"),
  run: ({ args, shell }) => {
    const [sub, ...rest] = args;
    if (sub === undefined) return { stderr: USAGE, code: 1 };

    if (sub === "init") {
      const root = rest[0] ? shell.resolve(rest[0]) : shell.cwd;
      if (!shell.fs.isDir(root)) return { stderr: `fatal: cannot mkdir ${rest[0]}: No such file or directory\n`, code: 128 };
      const { existed } = shell.initRepo(root);
      return { stdout: `${existed ? "Reinitialized existing" : "Initialized empty"} Git repository in ${root}/.git/\n` };
    }

    const repo = shell.findRepo(shell.cwd);
    if (!repo) return { stderr: "fatal: not a git repository (or any of the parent directories): .git\n", code: 128 };
    const fs = shell.fs;

    try {
      switch (sub) {
        case "status": {
          const s = repo.status(fs);
          let text = `On branch ${s.branch}\n`;
          if (!s.hasCommits) text += "\nNo commits yet\n";
          if (s.staged.length > 0) {
            text += "\nChanges to be committed:\n  (use \"git restore --staged <file>...\" to unstage)\n";
            for (const c of s.staged) text += `\t${(c.kind + ":").padEnd(12)}${c.path}\n`;
          }
          if (s.unstaged.length > 0) {
            text += "\nChanges not staged for commit:\n  (use \"git add <file>...\" to update what will be committed)\n  (use \"git restore <file>...\" to discard changes in working directory)\n";
            for (const c of s.unstaged) text += `\t${(c.kind + ":").padEnd(12)}${c.path}\n`;
          }
          if (s.untracked.length > 0) {
            // Like git, collapse whole untracked directories to "dir/".
            const shown = new Set<string>();
            for (const path of s.untracked) {
              const top = path.includes("/") ? path.slice(0, path.indexOf("/") + 1) : path;
              const anyTracked = [...repo.index.keys()].some((p) => p.startsWith(top));
              shown.add(path.includes("/") && !anyTracked ? top : path);
            }
            text += "\nUntracked files:\n  (use \"git add <file>...\" to include in what will be committed)\n";
            for (const path of [...shown].sort()) text += `\t${path}\n`;
          }
          if (s.staged.length === 0 && s.unstaged.length === 0 && s.untracked.length === 0) {
            text += s.hasCommits ? "nothing to commit, working tree clean\n" : '\nnothing to commit (create/copy files and use "git add" to track)\n';
          } else if (s.staged.length === 0) {
            text += s.unstaged.length > 0
              ? '\nno changes added to commit (use "git add" and/or "git commit -a")\n'
              : '\nnothing added to commit but untracked files present (use "git add" to track)\n';
          }
          return { stdout: text };
        }

        case "add": {
          const opts = parseArgs(rest, { flags: "A" });
          if (opts.flags.has("A")) repo.add(fs, [repo.root], shell.cwd);
          else if (opts.positional.length === 0) {
            return { stderr: "Nothing specified, nothing added.\nhint: Maybe you wanted to say 'git add .'?\n", code: 1 };
          } else repo.add(fs, opts.positional, shell.cwd);
          return {};
        }

        case "commit": {
          const opts = parseArgs(rest, { flags: "a", values: "m" });
          const message = opts.values.get("m")?.trim();
          if (opts.flags.has("a")) repo.addTracked(fs);
          if (!message) return { stderr: 'error: no commit message given. Use: git commit -m "describe your change"\n', code: 1 };
          const result = repo.commit(message);
          if (!result) {
            const s = repo.status(fs);
            const reason = s.unstaged.length > 0
              ? 'no changes added to commit (use "git add" and/or "git commit -a")'
              : s.untracked.length > 0
                ? 'nothing added to commit but untracked files present (use "git add" to track)'
                : "nothing to commit, working tree clean";
            return { stderr: reason + "\n", code: 1 };
          }
          const { commit, stats } = result;
          let summary = ` ${plural(stats.files, "file")} changed`;
          if (stats.insertions > 0) summary += `, ${plural(stats.insertions, "insertion")}(+)`;
          if (stats.deletions > 0) summary += `, ${plural(stats.deletions, "deletion")}(-)`;
          const root = commit.parent === null ? " (root-commit)" : "";
          return { stdout: `[${repo.branch}${root} ${commit.id.slice(0, 7)}] ${message}\n${summary}\n` };
        }

        case "log": {
          // Long options first; parseArgs only knows single-letter ones.
          const oneline = rest.includes("--oneline");
          const opts = parseArgs(rest.filter((a) => !a.startsWith("--")), { values: "n" });
          let commits = repo.log();
          if (commits.length === 0) return { stderr: `fatal: your current branch '${repo.branch}' does not have any commits yet\n`, code: 128 };
          const limit = Number(opts.values.get("n"));
          if (Number.isInteger(limit) && limit > 0) commits = commits.slice(0, limit);
          return { stdout: commits.map((c) => (oneline ? `${c.id.slice(0, 7)} ${c.message}\n` : formatCommit(c))).join("") };
        }

        case "diff": {
          const staged = rest.includes("--staged") || rest.includes("--cached");
          return { stdout: repo.diff(fs, staged) };
        }

        case "branch": {
          const name = rest.find((a) => !a.startsWith("-"));
          if (name === undefined) {
            const names = [...repo.branches.keys()].sort();
            return { stdout: names.map((n) => `${n === repo.branch ? "* " : "  "}${n}\n`).join("") };
          }
          repo.createBranch(name);
          return {};
        }

        case "checkout":
        case "switch": {
          const create = rest.includes("-b") || rest.includes("-c");
          const name = rest.find((a) => !a.startsWith("-"));
          if (name === undefined) return { stderr: `error: missing branch name\n`, code: 1 };
          if (create) repo.createBranch(name);
          const notFound = sub === "switch" ? `fatal: invalid reference: ${name}` : `error: pathspec '${name}' did not match any file(s) known to git`;
          repo.switchTo(fs, name, notFound);
          return { stdout: `Switched to ${create ? "a new " : ""}branch '${name}'\n` };
        }

        case "restore": {
          const staged = rest.includes("--staged");
          const paths = rest.filter((a) => !a.startsWith("-"));
          if (paths.length === 0) return { stderr: "fatal: you must specify path(s) to restore\n", code: 128 };
          repo.restore(fs, paths, shell.cwd, staged);
          return {};
        }

        default:
          return { stderr: `git: '${sub}' is not a git command. See 'git --help'.\n`, code: 1 };
      }
    } catch (err) {
      if (err instanceof GitError) return { stderr: err.message + "\n", code: 128 } satisfies CommandResult;
      throw err;
    }
  },
};

export const gitCommands = [git];
