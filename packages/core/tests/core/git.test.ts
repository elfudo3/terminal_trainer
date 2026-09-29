import { describe, expect, it } from "vitest";
import { VirtualFS } from "../../src/core/filesystem";
import { Shell } from "../../src/core/shell";

function makeShell() {
  const fs = new VirtualFS();
  fs.mkdir("/home/user/spellbook", { parents: true });
  fs.writeFile("/home/user/spellbook/fireball.txt", "fire\nheat\n");
  fs.writeFile("/home/user/spellbook/frost.txt", "cold\n");
  fs.mkdir("/home/user/spellbook/notes");
  fs.writeFile("/home/user/spellbook/notes/todo.txt", "learn git\n");
  const shell = new Shell({ fs, cwd: "/home/user/spellbook" });
  return shell;
}
const out = (shell: Shell, line: string) => shell.run(line).stdout;

describe("git init and status", () => {
  it("refuses to work outside a repository", () => {
    const result = makeShell().run("git status");
    expect(result.stderr).toBe("fatal: not a git repository (or any of the parent directories): .git\n");
    expect(result.code).toBe(128);
  });

  it("initialises a repository and shows untracked files", () => {
    const shell = makeShell();
    expect(out(shell, "git init")).toBe("Initialized empty Git repository in /home/user/spellbook/.git/\n");
    expect(shell.fs.isDir("/home/user/spellbook/.git")).toBe(true);
    expect(out(shell, "git init")).toMatch(/^Reinitialized existing/);
    const status = out(shell, "git status");
    expect(status).toContain("On branch main");
    expect(status).toContain("No commits yet");
    expect(status).toContain("Untracked files:");
    expect(status).toContain("\tfireball.txt\n");
    expect(status).toContain("\tnotes/\n");
    expect(status).toContain("nothing added to commit but untracked files present");
  });

  it("works from a sub-directory of the repository", () => {
    const shell = makeShell();
    shell.run("git init");
    shell.run("cd notes");
    expect(out(shell, "git status")).toContain("On branch main");
  });
});

describe("git add and commit", () => {
  it("stages single files, directories and everything with .", () => {
    const shell = makeShell();
    shell.run("git init");
    shell.run("git add fireball.txt");
    let status = out(shell, "git status");
    expect(status).toContain("Changes to be committed:");
    expect(status).toContain("\tnew file:   fireball.txt\n");
    expect(status).toContain("\tfrost.txt\n");
    shell.run("git add .");
    status = out(shell, "git status");
    expect(status).toContain("\tnew file:   notes/todo.txt\n");
    expect(status).not.toContain("Untracked files");
  });

  it("reports pathspecs that match nothing", () => {
    const shell = makeShell();
    shell.run("git init");
    expect(shell.run("git add nope.txt")).toMatchObject({ stderr: "fatal: pathspec 'nope.txt' did not match any files\n", code: 128 });
    expect(shell.run("git add").stderr).toMatch(/Nothing specified, nothing added/);
  });

  it("commits staged changes with a summary and refuses empty commits", () => {
    const shell = makeShell();
    shell.run("git init");
    expect(shell.run("git commit -m 'x'").stderr).toMatch(/nothing added to commit but untracked files present/);
    shell.run("git add .");
    const commit = out(shell, "git commit -m 'Add spells'");
    expect(commit).toMatch(/^\[main \(root-commit\) [0-9a-f]{7}\] Add spells\n 3 files changed, 4 insertions\(\+\)\n$/);
    expect(out(shell, "git status")).toBe("On branch main\nnothing to commit, working tree clean\n");
    expect(shell.run("git commit").stderr).toMatch(/git commit -m/);
  });

  it("stages modifications and deletions, and commit -a stages tracked changes", () => {
    const shell = makeShell();
    shell.run("git init; git add .; git commit -m 'first'");
    shell.run("echo ember >> fireball.txt");
    shell.run("rm frost.txt");
    let status = out(shell, "git status");
    expect(status).toContain("Changes not staged for commit:");
    expect(status).toContain("\tmodified:   fireball.txt\n");
    expect(status).toContain("\tdeleted:    frost.txt\n");
    expect(status).toContain('no changes added to commit (use "git add" and/or "git commit -a")');
    expect(out(shell, "git commit -am 'changes'")).toMatch(/^\[main [0-9a-f]{7}\] changes\n 2 files changed, 1 insertion\(\+\), 1 deletion\(-\)\n$/);
    expect(out(shell, "git status")).toContain("working tree clean");
  });
});

describe("git log and diff", () => {
  it("lists commits newest first, in full and one-line form", () => {
    const shell = makeShell();
    shell.run("git init; git add .; git commit -m 'first'; echo x >> frost.txt; git add frost.txt; git commit -m 'second'");
    const log = out(shell, "git log");
    expect(log).toMatch(/^commit [0-9a-f]{40}\nAuthor: user <user@sandbox>\nDate:   \w{3} \w{3} [ \d]\d \d\d:\d\d:\d\d \d{4} \+0000\n\n    second\n\ncommit/);
    const lines = out(shell, "git log --oneline").split("\n").filter(Boolean);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^[0-9a-f]{7} second$/);
    expect(lines[1]).toMatch(/^[0-9a-f]{7} first$/);
    expect(shell.run("git log -n 1 --oneline").stdout.split("\n").filter(Boolean)).toHaveLength(1);
  });

  it("shows unstaged changes as a diff, and staged ones with --staged", () => {
    const shell = makeShell();
    shell.run("git init; git add .; git commit -m 'first'");
    expect(out(shell, "git diff")).toBe("");
    shell.run("echo ice >> frost.txt");
    const diff = out(shell, "git diff");
    expect(diff).toContain("diff --git a/frost.txt b/frost.txt");
    expect(diff).toContain("--- a/frost.txt\n+++ b/frost.txt\n");
    expect(diff).toContain("@@ -1,1 +1,2 @@\n cold\n+ice\n");
    shell.run("git add frost.txt");
    expect(out(shell, "git diff")).toBe("");
    expect(out(shell, "git diff --staged")).toContain("+ice");
  });

  it("shows new files against /dev/null", () => {
    const shell = makeShell();
    shell.run("git init; git add fireball.txt");
    expect(out(shell, "git diff --staged")).toContain("--- /dev/null\n+++ b/fireball.txt\n@@ -0,0 +1,2 @@\n+fire\n+heat\n");
  });
});

describe("git branches", () => {
  it("creates, lists and switches branches, updating the working tree", () => {
    const shell = makeShell();
    shell.run("git init; git add .; git commit -m 'first'");
    expect(out(shell, "git branch")).toBe("* main\n");
    expect(out(shell, "git branch experiment")).toBe("");
    expect(out(shell, "git branch")).toBe("  experiment\n* main\n");
    expect(out(shell, "git switch experiment")).toBe("Switched to branch 'experiment'\n");
    shell.run("echo lightning > storm.txt; git add storm.txt; git commit -m 'storm'");
    expect(shell.fs.exists("/home/user/spellbook/storm.txt")).toBe(true);
    expect(out(shell, "git checkout main")).toBe("Switched to branch 'main'\n");
    expect(shell.fs.exists("/home/user/spellbook/storm.txt")).toBe(false);
    expect(out(shell, "git checkout -b hotfix")).toBe("Switched to a new branch 'hotfix'\n");
    expect(out(shell, "git switch -c another")).toBe("Switched to a new branch 'another'\n");
    expect(out(shell, "git status")).toContain("On branch another");
  });

  it("refuses to switch with uncommitted changes or to unknown branches", () => {
    const shell = makeShell();
    shell.run("git init; git add .; git commit -m 'first'; git branch b");
    shell.run("echo change >> frost.txt");
    const result = shell.run("git switch b");
    expect(result.stderr).toContain("Your local changes to the following files would be overwritten");
    expect(result.stderr).toContain("\tfrost.txt\n");
    expect(shell.run("git switch nope").stderr).toBe("fatal: invalid reference: nope\n");
    expect(shell.run("git checkout nope").stderr).toBe("error: pathspec 'nope' did not match any file(s) known to git\n");
    expect(shell.run("git branch b").stderr).toBe("fatal: a branch named 'b' already exists\n");
  });

  it("cannot branch before the first commit", () => {
    const shell = makeShell();
    shell.run("git init");
    expect(shell.run("git branch x").stderr).toBe("fatal: not a valid object name: 'main'\n");
  });
});

describe("git restore", () => {
  it("discards working changes, and --staged unstages", () => {
    const shell = makeShell();
    shell.run("git init; git add .; git commit -m 'first'");
    shell.run("echo oops >> frost.txt");
    shell.run("git restore frost.txt");
    expect(shell.fs.readFile("/home/user/spellbook/frost.txt")).toBe("cold\n");
    shell.run("echo staged >> frost.txt; git add frost.txt");
    shell.run("git restore --staged frost.txt");
    expect(out(shell, "git status")).toContain("Changes not staged for commit:");
    expect(shell.run("git restore nope").stderr).toBe("error: pathspec 'nope' did not match any file(s) known to git\n");
  });
});

describe("git misc", () => {
  it("rejects unknown sub-commands and needs one", () => {
    const shell = makeShell();
    shell.run("git init");
    expect(shell.run("git frobnicate").stderr).toBe("git: 'frobnicate' is not a git command. See 'git --help'.\n");
    expect(shell.run("git").stderr).toMatch(/usage: git/);
  });

  it("forgets repositories when the filesystem is reset", () => {
    const shell = makeShell();
    shell.run("git init");
    shell.resetFilesystem(new VirtualFS());
    expect(shell.findRepo("/home/user/spellbook")).toBeUndefined();
  });
});
