/**
 * The practice content: eight independent tracks, each a small story told
 * with Mors the Wizard. Every challenge starts from the fresh sample
 * filesystem (see core/sample-fs.ts and mors/files.ts) plus its own
 * `setup`, passes when `check` returns true after a command, and ends with
 * Mors's `lore`: a line of real Unix history or science in his voice.
 *
 * To add a challenge: append an object with a new, permanent id. The test
 * suite verifies that every `solution` really solves its challenge.
 */
import { MORS_HOME } from "../mors/files";
import type { Shell } from "../core/shell";
import type { Track } from "./types";

const HOME = "/home/user";

/** Did the user run this command (as the first word, or anywhere in a pipeline)? */
const used = (argv: string[], name: string) => argv.includes(name);

/** Did the user pass a short flag letter, e.g. hasFlag(argv, "l") for `ls -la`? */
const hasFlag = (argv: string[], letter: string) => argv.some((a) => /^-[a-zA-Z]+$/.test(a) && a.includes(letter));

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

const navigation: Track = {
  id: "navigation",
  title: "Navigation",
  tagline: "Find your way around the machine",
  story:
    "Every machine is a building. Mors has just handed you the keys to this one and wandered off to look for his bicycle. Learn to walk its corridors before you touch anything.",
  commands: ["pwd", "ls", "cd", "tree"],
  challenges: [
    {
      id: "nav-pwd",
      title: "Where am I?",
      story: "You wake up at a prompt. No windows, no icons, just a blinking cursor and a note from Mors: 'First rule of any building: know which room you're in.'",
      task: "Print the full path of the directory you are currently in.",
      hint: "The command name is short for 'print working directory'.",
      solution: ["pwd"],
      lore: "pwd has answered 'where am I' since the first Unix in 1971. Older than the internet, younger than me by roughly a thousand years.",
      check: ({ shell, result }) => result.stdout === shell.cwd + "\n",
    },
    {
      id: "nav-ls",
      title: "Look around",
      story: "Home, apparently. Mors says he left the place tidy, which for a dead wizard could mean anything.",
      task: "List the files and folders in your home directory.",
      hint: "Two letters, short for 'list'.",
      solution: ["ls"],
      lore: "ls is probably the most-typed command in history. Ken Thompson wrote it in 1971 and it is still faster than opening a folder with a mouse.",
      check: ({ argv, result }) => used(argv, "ls") && result.stdout.includes("documents"),
    },
    {
      id: "nav-cd",
      title: "Step inside",
      story: "There's a documents folder. Mors mentions a note in there, 'somewhere near the top'. Doors don't open themselves.",
      task: "Move into the documents folder.",
      hint: "cd stands for 'change directory'. It takes the folder name as its argument.",
      solution: ["cd documents"],
      lore: "cd doesn't run a program at all; the shell itself changes directory. That's why it can move you: a separate process couldn't change its parent's mind.",
      check: ({ shell }) => shell.cwd === `${HOME}/documents`,
    },
    {
      id: "nav-cd-up",
      title: "Step back out",
      story: "Nothing here but text files and a draft. Time to go back up to the landing, the way every directory allows.",
      task: "You are inside documents. Go up one level to your home directory using the special name for the parent directory.",
      hint: "Every directory contains an entry called .. that means 'the directory above me'.",
      solution: ["cd .."],
      lore: "Every directory has two entries it never asked for: . and .., itself and its parent. Pure bookkeeping, and the whole tree hangs off it.",
      setup: (shell) => shell.changeDir("documents"),
      check: ({ shell, argv }) => shell.cwd === HOME && used(argv, ".."),
    },
    {
      id: "nav-ls-hidden",
      title: "What ls won't show you",
      story: "Mors: 'The useful things hide. Not from you, from clutter.' Files whose names start with a dot are skipped by a plain ls.",
      task: "List your home directory so that hidden files are shown too.",
      hint: "ls has an option that shows 'all' entries.",
      solution: ["ls -a"],
      lore: "Hidden files were never a security feature; ls just skips names starting with a dot. Rob Pike says the whole convention started as a shortcut to hide . and .. that went slightly wrong.",
      check: ({ argv, result }) => used(argv, "ls") && hasFlag(argv, "a") && result.stdout.includes(".bashrc"),
    },
    {
      id: "nav-ls-long",
      title: "The long listing",
      story: "Names are not enough. Mors wants sizes, dates, and those ten cryptic characters at the start of each line that he calls 'the locks'.",
      task: "Show a detailed (long) listing of the documents folder, with permissions, sizes and dates.",
      hint: "ls -l gives the 'long' format. You can add a path after the option.",
      solution: ["ls -l documents"],
      lore: "Those ten characters at the start, like drwxr-xr-x, are the whole permission system in one glance. We'll come back to them; they're the lock on every door.",
      check: ({ argv, result }) => used(argv, "ls") && hasFlag(argv, "l") && result.stdout.includes("essay.txt") && result.stdout.includes("rw-"),
    },
    {
      id: "nav-cd-abs",
      title: "Absolute paths",
      story: "The system keeps its diaries in /var/log. It's far from home, and relative directions would take four steps. There is a shorter way to name any place.",
      task: "Go to the system log directory /var/log using its absolute path.",
      hint: "An absolute path starts with / and works from anywhere.",
      solution: ["cd /var/log"],
      lore: "An absolute path starts at / and means the same thing from anywhere. Unix has had exactly one root since 1970, which is one fewer than most family trees.",
      check: ({ shell, argv }) => shell.cwd === "/var/log" && argv.some((a) => a.startsWith("/")),
    },
    {
      id: "nav-cd-home",
      title: "Straight home",
      story: "Deep in /var/log, with the lights flickering. Mors: 'Every building has a way home that takes one word.'",
      task: "You are in /var/log. Jump straight back to your home directory with the shortest possible command.",
      hint: "cd with no argument goes home. So does cd ~.",
      solution: ["cd"],
      lore: "The ~ meaning 'home' comes from the Lear Siegler ADM-3A terminal of 1976, where the Home key had a tilde printed on it. Vi's h j k l arrows came off the same keyboard.",
      setup: (shell) => shell.changeDir("/var/log"),
      check: ({ shell, line }) => shell.cwd === HOME && /^cd( ~)?$/.test(line.trim()),
    },
    {
      id: "nav-cd-dash",
      title: "Bounce back",
      story: "Mors calls it Threshold Walking: step somewhere, then step back through the same door. The shell has a shortcut for exactly that.",
      task: "Go to /tmp, then return to the directory you came from using cd's 'previous directory' shortcut.",
      hint: "cd - takes you to wherever you were before the last cd.",
      solution: ["cd /tmp", "cd -"],
      lore: "cd - reads a variable called OLDPWD that the shell quietly keeps. Even the shell remembers where it came from.",
      check: ({ shell, line }) => line.trim() === "cd -" && shell.oldCwd === "/tmp",
    },
    {
      id: "nav-mors-home",
      title: "The wizard's chamber",
      story: "The note in documents said it: Mors lives in /opt/mors now. 'Rent is nothing; I'm dead.' Go and see the place.",
      task: "Go to Mors's chamber at /opt/mors.",
      hint: "It's an absolute path, so it starts with /.",
      solution: ["cd /opt/mors"],
      lore: "/opt is where optional software goes: things that aren't part of the system proper. A dead wizard qualifies.",
      check: ({ shell }) => shell.cwd === MORS_HOME,
    },
    {
      id: "nav-tree",
      title: "The big picture",
      story: "Mors's projects folder is a maze of subfolders. Rather than cd into each one, see the whole shape at once.",
      task: "Show the whole structure of the projects folder as a tree.",
      hint: "There is a command literally called tree.",
      solution: ["tree projects"],
      lore: "Directories are trees in the mathematical sense: one root, no cycles, every node reachable exactly one way. tree just draws what the kernel already knows.",
      check: ({ argv, result }) => used(argv, "tree") && result.stdout.includes("website") && result.stdout.includes("hello.py"),
    },
  ],
};

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

const files: Track = {
  id: "files",
  title: "Files",
  tagline: "Create, copy, move and delete",
  story:
    "Mors keeps his spellbook in loose text files, which is exactly as chaotic as it sounds. He needs a hand creating, copying, moving and, carefully, deleting things.",
  commands: ["touch", "mkdir", "cp", "mv", "rm", "rmdir", "echo >"],
  challenges: [
    {
      id: "files-touch",
      title: "An empty page",
      story: "Every spellbook starts with a blank page. Mors wants one called hello.txt, and he wants it now, before the idea escapes.",
      task: "Create an empty file called hello.txt in your home directory.",
      hint: "touch creates a file if it does not exist yet.",
      solution: ["touch hello.txt"],
      lore: "touch exists to update timestamps; creating empty files is a side effect that everyone uses as its main job. Science is full of that.",
      check: ({ shell }) => shell.fs.isFile(`${HOME}/hello.txt`),
    },
    {
      id: "files-mkdir",
      title: "A new folder",
      story: "Loose pages blow away. Mors wants a workspace folder to keep them in.",
      task: "Create a directory named workspace in your home directory.",
      hint: "mkdir is short for 'make directory'.",
      solution: ["mkdir workspace"],
      lore: "mkdir asks the kernel through one of the oldest system calls there is. The shell only makes the request politely.",
      check: ({ shell }) => shell.fs.isDir(`${HOME}/workspace`),
    },
    {
      id: "files-mkdir-p",
      title: "Nested folders in one go",
      story: "The new API project needs projects/api/src, and the api folder doesn't exist yet. Mors refuses to type mkdir three times.",
      task: "Create the folders projects/api/src (api does not exist yet) with a single command.",
      hint: "mkdir has an option that creates missing 'parent' directories.",
      solution: ["mkdir -p projects/api/src"],
      lore: "The -p flag means parents. Without it mkdir refuses to guess; Unix tools would rather fail loudly than assume. A philosophy I recommend for wizards too.",
      check: ({ shell, argv }) => shell.fs.isDir(`${HOME}/projects/api/src`) && hasFlag(argv, "p"),
    },
    {
      id: "files-cp",
      title: "Copy a file",
      story: "Mors lost everything once to a bad edit. Before touching notes.txt, make a copy.",
      task: "Make a copy of notes.txt called notes-backup.txt.",
      hint: "cp SOURCE DESTINATION",
      solution: ["cp notes.txt notes-backup.txt"],
      lore: "cp copies bytes, not meaning. After the copy, the machine has no idea the two files are related; only you do.",
      check: ({ shell }) => shell.fs.isFile(`${HOME}/notes-backup.txt`) && shell.fs.readFile(`${HOME}/notes-backup.txt`) === shell.fs.readFile(`${HOME}/notes.txt`),
    },
    {
      id: "files-cp-dir",
      title: "Copy a folder",
      story: "One file isn't enough; the whole documents folder should have a twin. Folders need a little more persuasion than files.",
      task: "Copy the entire documents folder to a new folder called docs-copy.",
      hint: "Copying a directory needs the 'recursive' option: cp -r",
      solution: ["cp -r documents docs-copy"],
      lore: "Recursion is doing to every child what you did to the parent. cp -r walks the tree; so does find; so does most of computer science.",
      check: ({ shell }) => shell.fs.isFile(`${HOME}/docs-copy/essay.txt`) && shell.fs.isDir(`${HOME}/documents`),
    },
    {
      id: "files-mv-rename",
      title: "Rename",
      story: "todo.txt is a bad name for a list Mors intends to actually do. He'd like it called tasks.txt. There is no rename command, which surprises everyone once.",
      task: "Rename todo.txt to tasks.txt.",
      hint: "Moving a file to a new name does the job.",
      solution: ["mv todo.txt tasks.txt"],
      lore: "mv within one filesystem doesn't move any data; it rewrites a directory entry. Renaming a gigabyte takes the same time as renaming a byte.",
      check: ({ shell }) => !shell.fs.exists(`${HOME}/todo.txt`) && shell.fs.readFile(`${HOME}/tasks.txt`).includes("pay rent"),
    },
    {
      id: "files-mv-into",
      title: "Move into a folder",
      story: "The scores file is loose in data. Mors wants it filed with the documents.",
      task: "Move the file data/scores.txt into the documents folder.",
      hint: "When the destination is a directory, mv puts the file inside it.",
      solution: ["mv data/scores.txt documents"],
      lore: "When the destination is a directory, mv puts the file inside it. One rule, two behaviours: the source of a thousand small surprises.",
      check: ({ shell }) => shell.fs.isFile(`${HOME}/documents/scores.txt`) && !shell.fs.exists(`${HOME}/data/scores.txt`),
    },
    {
      id: "files-rm",
      title: "Delete a file",
      story: "An invoice for a bicycle Mors bought in 3026. It will never be paid. Remove it.",
      task: "Delete the file downloads/invoice.pdf.",
      hint: "rm removes files. There is no undo, so look before you type.",
      solution: ["rm downloads/invoice.pdf"],
      lore: "There is no trash can here. rm unlinks the name; when the last name is gone the bytes are free to be overwritten. Deletion is forgetting, not destruction.",
      check: ({ shell }) => !shell.fs.exists(`${HOME}/downloads/invoice.pdf`) && shell.fs.isDir(`${HOME}/downloads`),
    },
    {
      id: "files-rmdir",
      title: "Delete an empty folder",
      story: "pictures has been empty since the day it was made. Use the tool that only works on empty folders; it can't take anything with it.",
      task: "Remove the empty pictures directory using the command meant for empty directories.",
      hint: "rmdir only works on empty directories, which makes it a safe choice.",
      solution: ["rmdir pictures"],
      lore: "rmdir refuses anything that isn't empty, which makes it the safest delete on the system. Slow down, use the safe tool, live longer. I speak from experience, sort of.",
      check: ({ shell, argv }) => !shell.fs.exists(`${HOME}/pictures`) && used(argv, "rmdir"),
    },
    {
      id: "files-rm-r",
      title: "Delete a folder and everything in it",
      story: "The downloads folder is junk from top to bottom. Mors nods gravely: 'This is the command with the most famous accidents in computing. Use it on purpose.'",
      task: "Delete the downloads folder together with everything inside it.",
      hint: "rm needs -r (recursive) to remove a directory tree.",
      solution: ["rm -r downloads"],
      lore: "rm -r has ended more careers than any other seven characters. You just used it correctly, which is the only kind of practice that counts.",
      check: ({ shell, argv }) => !shell.fs.exists(`${HOME}/downloads`) && used(argv, "rm"),
    },
    {
      id: "files-glob-mv",
      title: "Wildcards",
      story: "Every shell script in projects/scripts should be in backup. Naming them one by one is beneath a wizard's apprentice.",
      task: "Move every .sh file from projects/scripts into the backup folder with one command, using a wildcard.",
      hint: "*.sh matches every name ending in .sh. The shell expands it before mv runs.",
      solution: ["mv projects/scripts/*.sh backup"],
      lore: "The shell expands *.sh before mv ever runs; mv just receives a list of names. Wildcards are the shell's job, not the program's.",
      check: ({ shell, line }) =>
        line.includes("*") &&
        shell.fs.isFile(`${HOME}/backup/backup.sh`) &&
        shell.fs.isFile(`${HOME}/backup/deploy.sh`) &&
        !shell.fs.exists(`${HOME}/projects/scripts/backup.sh`) &&
        shell.fs.isFile(`${HOME}/projects/scripts/hello.py`),
    },
    {
      id: "files-echo-create",
      title: "Write a file",
      story: "No editor in this sandbox, and Mors says you don't need one for a single line. The shell can pour text straight into a file.",
      task: "Create a file called greeting.txt containing the text: hello world",
      hint: "echo prints text; the > operator sends that output into a file instead of the screen.",
      solution: ["echo hello world > greeting.txt"],
      lore: "Redirection was in the very first Unix shell in 1971. 'Send this somewhere else' is older than pipes and just as important.",
      check: ({ shell }) => shell.fs.isFile(`${HOME}/greeting.txt`) && shell.fs.readFile(`${HOME}/greeting.txt`).trim() === "hello world",
    },
    {
      id: "files-mors-spellbook",
      title: "Borrow the spellbook",
      story: "Mors keeps his spellbook in a hidden folder inside his chamber, /opt/mors/.chamber. He says you may take a copy. 'Read it near a kettle at your own risk.'",
      task: "Copy /opt/mors/.chamber/spellbook.txt into your home directory.",
      hint: "cp works on hidden directories just fine if you name them. ~ is your home.",
      solution: ["cp /opt/mors/.chamber/spellbook.txt ~"],
      lore: "You copied out of a hidden directory by naming it directly. Hidden isn't locked; it's just quiet.",
      check: ({ shell }) => shell.fs.isFile(`${HOME}/spellbook.txt`) && shell.fs.readFile(`${HOME}/spellbook.txt`).includes("fireball"),
    },
  ],
};

// ---------------------------------------------------------------------------
// Viewing
// ---------------------------------------------------------------------------

const viewing: Track = {
  id: "viewing",
  title: "Viewing",
  tagline: "Read files without opening them",
  story:
    "Notes are useless if you can't read them. Mors has left messages across the machine, some long, some short, some numbered. Learn to look inside files without ever opening an editor.",
  commands: ["cat", "head", "tail", "wc", "man"],
  challenges: [
    {
      id: "view-mors-note",
      title: "A note from Mors",
      story: "There's a file in documents called from-mors.txt. It's addressed to you.",
      task: "Print the contents of documents/from-mors.txt.",
      hint: "cat prints a file to the screen.",
      solution: ["cat documents/from-mors.txt"],
      lore: "cat means concatenate. Printing one file is the degenerate case, and it's the case everyone uses.",
      check: ({ shell, result }) => result.stdout === shell.fs.readFile(`${HOME}/documents/from-mors.txt`),
    },
    {
      id: "view-cat",
      title: "Read the list",
      story: "Your own notes.txt, four lines of errands. Mors is curious whether 'water the plants' is a euphemism.",
      task: "Print the contents of notes.txt.",
      hint: "Same command, different file.",
      solution: ["cat notes.txt"],
      lore: "cat doesn't page. If a file is long it just flies past; that's why less exists, and why I write short notes.",
      check: ({ shell, result }) => result.stdout === shell.fs.readFile(`${HOME}/notes.txt`),
    },
    {
      id: "view-head",
      title: "Just the beginning",
      story: "logs/app.log is nine lines of a server having a bad morning. Mors only wants the first three: 'How did it start?'",
      task: "Show only the first 3 lines of logs/app.log.",
      hint: "head shows the start of a file; -n sets how many lines.",
      solution: ["head -n 3 logs/app.log"],
      lore: "head defaults to ten lines because ten fit on a 1970s terminal with room for the prompt. Defaults outlive their reasons.",
      check: ({ shell, result }) => result.stdout === shell.fs.readFile(`${HOME}/logs/app.log`).split("\n").slice(0, 3).join("\n") + "\n",
    },
    {
      id: "view-tail",
      title: "Just the end",
      story: "'And how did it end?' The last two lines of the same log.",
      task: "Show only the last 2 lines of logs/app.log.",
      hint: "tail is the opposite of head.",
      solution: ["tail -n 2 logs/app.log"],
      lore: "tail -f, which follows a growing file, is how people have watched servers since the 1980s. Try it on a real log someday and stare at it like a campfire.",
      check: ({ shell, result }) => result.stdout === shell.fs.readFile(`${HOME}/logs/app.log`).trim().split("\n").slice(-2).join("\n") + "\n",
    },
    {
      id: "view-wc",
      title: "How long is it?",
      story: "data/people.csv arrived from a friend. Mors wants to know how many lines it has before reading a single one. 'Measure, then look.'",
      task: "Count how many lines data/people.csv has.",
      hint: "wc counts things; -l limits it to lines.",
      solution: ["wc -l data/people.csv"],
      lore: "wc counts lines by counting newline characters. A file without a final newline has one line fewer than you'd think; a classic off-by-one.",
      check: ({ argv, result }) => used(argv, "wc") && /^\s*7\b/.test(result.stdout),
    },
    {
      id: "view-cat-n",
      title: "Numbered lines",
      story: "Mors wants to quote line four of the essay to Valdraak. He needs the numbers.",
      task: "Print documents/essay.txt with a number in front of every line.",
      hint: "cat has an option for numbering.",
      solution: ["cat -n documents/essay.txt"],
      lore: "Line numbers are a courtesy from cat; the file itself has none. Text files are just bytes and newlines, all the way down.",
      check: ({ argv, result }) => used(argv, "cat") && /^\s+1\t/.test(result.stdout) && result.stdout.includes("Unix philosophy"),
    },
    {
      id: "view-mors-readme",
      title: "The chamber's README",
      story: "Mors's chamber has a README. He's proud of it. 'Everything worth knowing about me fits in five lines, and two of them are jokes.'",
      task: "Print /opt/mors/README.txt.",
      hint: "cat with an absolute path.",
      solution: ["cat /opt/mors/README.txt"],
      lore: "README files are a Unix tradition older than the web: the one file whose name shouts to be read first. Mine says to try ls -a. Take the hint.",
      check: ({ result }) => result.stdout.includes("You found my chamber"),
    },
    {
      id: "view-man",
      title: "Read the manual",
      story: "Mors: 'I could explain ls for an hour. Or you could read the page that's been explaining it since 1971.'",
      task: "Open the manual page for the ls command.",
      hint: "man COMMAND shows the manual for COMMAND.",
      solution: ["man ls"],
      lore: "The Unix manual dates from 1971, when Thompson and Ritchie were told to document the system to justify a new machine. Bureaucracy accidentally invented man.",
      check: ({ argv }) => argv[0] === "man" && argv[1] === "ls",
    },
  ],
};

// ---------------------------------------------------------------------------
// Searching
// ---------------------------------------------------------------------------

const searching: Track = {
  id: "searching",
  title: "Searching",
  tagline: "Find files and text anywhere",
  story:
    "Somewhere on this machine Mors has hidden a riddle. He won't tell you where. He will tell you that find and grep are faster than wandering, and that Death's name appears in his notes more than he'd like.",
  commands: ["grep", "find"],
  challenges: [
    {
      id: "search-grep",
      title: "Find the errors",
      story: "The server log is full of noise. Mors only cares about the lines that went wrong.",
      task: "Print every line of logs/app.log that contains the word ERROR.",
      hint: "grep PATTERN FILE prints matching lines.",
      solution: ["grep ERROR logs/app.log"],
      lore: "grep is named after the ed editor command g/re/p: globally search a regular expression and print. Ken Thompson wrote it in an evening in 1973.",
      check: ({ shell, result }) =>
        result.stdout === shell.fs.readFile(`${HOME}/logs/app.log`).split("\n").filter((l) => l.includes("ERROR")).join("\n") + "\n",
    },
    {
      id: "search-grep-i",
      title: "Ignore case",
      story: "Somewhere in notes.txt is a reminder to call someone. Was it 'Call' or 'call'? Mors shrugs: 'Ask the machine to stop caring.'",
      task: "Find the line in notes.txt that mentions 'call', whether it is written Call or call.",
      hint: "grep -i ignores upper/lower case.",
      solution: ["grep -i call notes.txt"],
      lore: "Case matters to computers because 'A' and 'a' are different numbers, 65 and 97. -i tells grep to forgive the difference.",
      check: ({ argv, result }) => used(argv, "grep") && hasFlag(argv, "i") && result.stdout === "Call the dentist on Tuesday\n",
    },
    {
      id: "search-grep-c",
      title: "Count matches",
      story: "Warnings aren't errors, but Mors wants a number for the report. Just the number.",
      task: "How many lines in logs/app.log contain WARN? Print just the number.",
      hint: "grep -c counts matching lines instead of printing them (grep ... | wc -l works too).",
      solution: ["grep -c WARN logs/app.log"],
      lore: "Counting matches instead of printing them is the same search with a different ending. Ask for less output when what you want is a number.",
      check: ({ argv, result }) => used(argv, "grep") && result.stdout.trim() === "2",
    },
    {
      id: "search-grep-n",
      title: "Which line?",
      story: "The payment retry is in the log somewhere. Mors wants to point a colleague to the exact line.",
      task: "Find the line in logs/app.log containing 'Retrying' and show its line number next to it.",
      hint: "grep -n prefixes each match with its line number.",
      solution: ["grep -n Retrying logs/app.log"],
      lore: "Line numbers turn a match into an address. Editors have jumped to file:line for fifty years because of output like this.",
      check: ({ result }) => result.stdout.startsWith("5:"),
    },
    {
      id: "search-grep-r",
      title: "Search a whole folder",
      story: "Someone left TODOs in the projects folder. Mors doesn't know which files. 'Then search all of them.'",
      task: "Search every file under the projects folder for the word TODO.",
      hint: "grep -r searches directories recursively.",
      solution: ["grep -r TODO projects"],
      lore: "Recursive search walks every file under a directory. Before grep -r people chained find and grep; now it's one flag and the same idea.",
      check: ({ argv, result }) => used(argv, "grep") && result.stdout.includes("app.js") && result.stdout.includes("backup.sh"),
    },
    {
      id: "search-find-name",
      title: "Find by name",
      story: "Shell scripts are scattered everywhere under home. Mors wants a list, by name, wherever they are.",
      task: "Find every file ending in .sh anywhere under your home directory.",
      hint: "find PATH -name 'PATTERN'. Quote the pattern so the shell does not expand it first.",
      solution: ["find . -name '*.sh'"],
      lore: "find is a tiny language: paths first, then tests. -name is the simplest test; there are dozens, and they combine.",
      check: ({ argv, result }) => used(argv, "find") && ["setup.sh", "backup.sh", "deploy.sh"].every((f) => result.stdout.includes(f)),
    },
    {
      id: "search-find-type",
      title: "Find only folders",
      story: "How many sub-projects are there, really? Files are noise; Mors wants the directories.",
      task: "List every directory (not files) inside the projects folder using find.",
      hint: "find has a -type test: d for directories, f for files.",
      solution: ["find projects -type d"],
      lore: "-type d keeps only directories. find sees the tree the way the kernel does: files, directories, links, each with a type letter.",
      check: ({ argv, result }) =>
        used(argv, "find") && result.stdout.includes("projects/website") && result.stdout.includes("projects/scripts") && !result.stdout.includes("hello.py"),
    },
    {
      id: "search-mors-riddle",
      title: "The riddle",
      story: "Mors: 'I hid a riddle somewhere under /opt/mors. It's called riddle.txt. I won't say which folder. I will say that folders can hide.'",
      task: "Find the full path of riddle.txt somewhere under /opt/mors.",
      hint: "find /opt/mors -name riddle.txt. Hidden directories don't stop find.",
      solution: ["find /opt/mors -name riddle.txt"],
      lore: "You found my riddle by name alone. Names are the oldest index in computing; find just walks them. Now read it, if you dare.",
      check: ({ argv, result }) => used(argv, "find") && result.stdout.trim() === `${MORS_HOME}/.chamber/riddle.txt`,
    },
    {
      id: "search-mors-valdraak",
      title: "Who is Valdraak?",
      story: "The name Valdraak keeps coming up. Mors goes quiet when asked. His notes might not.",
      task: "Search all of Mors's files under /opt/mors for the name Valdraak.",
      hint: "A recursive grep over a directory.",
      solution: ["grep -r Valdraak /opt/mors"],
      lore: "grep -r found Death's name in my notes. He'll be pleased; he does love a mention. He's like an annoying best friend who happens to rule the slain.",
      check: ({ argv, result }) => used(argv, "grep") && result.stdout.includes("valdraak.txt"),
    },
    {
      id: "search-mors-flicker",
      title: "Threshold flickers",
      story: "The riddle pointed at the logs. In /var/log/mors.log, something keeps flickering. Mors wants to know how often.",
      task: "Count how many lines in /var/log/mors.log mention 'flicker'.",
      hint: "grep -c counts matching lines.",
      solution: ["grep -c flicker /var/log/mors.log"],
      lore: "Two flickers. Logs are the memory a machine keeps on your behalf; reading them is most of debugging, and a fair part of detective work.",
      check: ({ argv, result }) => used(argv, "grep") && result.stdout.trim() === "2",
    },
    {
      id: "search-find-etc",
      title: "Search the system",
      story: "Somewhere under /etc the machine keeps its own name in a file called hostname. Mors: 'Ask, don't wander.'",
      task: "Find the file named hostname somewhere under /etc.",
      hint: "find /etc -name hostname",
      solution: ["find /etc -name hostname"],
      lore: "/etc originally meant 'et cetera': the folder for everything that didn't fit elsewhere. It became the home of all configuration. Etcetera won.",
      check: ({ argv, result }) => used(argv, "find") && result.stdout.trim() === "/etc/hostname",
    },
  ],
};

// ---------------------------------------------------------------------------
// Pipes
// ---------------------------------------------------------------------------

const pipes: Track = {
  id: "pipes",
  title: "Pipes",
  tagline: "Chain small tools into big ones",
  story:
    "Mors calls pipes 'the only real magic': small tools joined together, doing what no single tool can. Here the terminal stops being a place you type and becomes a place you build.",
  commands: ["|", "sort", "uniq", "cut", "awk", "tr", "sed", ">", ">>", "<", "xargs"],
  challenges: [
    {
      id: "pipe-sort-n",
      title: "Sort numbers",
      story: "data/scores.txt is a jumble of numbers. Sort them, but be warned: computers sort text unless told otherwise, and text thinks 10 comes before 9.",
      task: "Print data/scores.txt sorted from smallest to largest number.",
      hint: "Plain sort orders text (10 before 9). Use -n for numeric order.",
      solution: ["sort -n data/scores.txt"],
      lore: "Text sorting puts 10 before 9 because '1' comes before '9'. -n asks sort to read numbers as numbers; computers only do what you say.",
      check: ({ result }) => result.stdout === "8\n17\n25\n42\n63\n99\n99\n",
    },
    {
      id: "pipe-uniq",
      title: "Unique words",
      story: "data/words.txt repeats itself. Mors wants each word once, in order, and he wants you to use two tools for it, not one.",
      task: "Print each distinct word in data/words.txt exactly once, in alphabetical order.",
      hint: "uniq only removes neighbouring duplicates, so sort first and pipe the result into uniq.",
      solution: ["sort data/words.txt | uniq"],
      lore: "uniq only compares neighbours, so it needs sorted input. That's not a flaw; it lets uniq run on endless streams without remembering anything.",
      check: ({ result }) => result.stdout === "apple\nbanana\ncherry\ndate\n",
    },
    {
      id: "pipe-uniq-c",
      title: "Count occurrences",
      story: "Same file, new question: how many times does each word appear? Mors calls this 'the oldest histogram in computing'.",
      task: "Show how many times each word appears in data/words.txt.",
      hint: "sort | uniq -c",
      solution: ["sort data/words.txt | uniq -c"],
      lore: "sort | uniq -c is the oldest histogram in computing. In 1986 Doug McIlroy used a six-line pipeline like it to count words, answering a ten-page program by Knuth.",
      check: ({ result }) => /3 apple/.test(result.stdout) && /2 banana/.test(result.stdout) && /1 cherry/.test(result.stdout),
    },
    {
      id: "pipe-ls-wc",
      title: "Count entries",
      story: "How many things are in your home directory? Don't count by eye. Let one tool list and another count.",
      task: "Use a pipe to count how many entries ls shows in your home directory.",
      hint: "The output of ls can be piped into wc -l.",
      solution: ["ls | wc -l"],
      lore: "The pipe was Doug McIlroy's idea, added to Unix in 1973. Thompson implemented it in a night and rewrote every tool to fit it the next morning.",
      check: ({ shell, line, argv, result }) => {
        const visible = shell.fs.readdir(HOME).filter((n) => !n.startsWith(".")).length;
        return line.includes("|") && used(argv, "wc") && result.stdout.trim() === String(visible);
      },
    },
    {
      id: "pipe-top-scores",
      title: "Top three",
      story: "Only the three highest scores matter to Mors. Sorting shows all of them; another tool keeps the end.",
      task: "Print the three highest numbers in data/scores.txt.",
      hint: "Sort numerically, then keep only the last three lines.",
      solution: ["sort -n data/scores.txt | tail -n 3"],
      lore: "sort then tail: each tool ignorant of the other, the result exact. That's the Unix philosophy in one line.",
      check: ({ result }) => result.stdout === "63\n99\n99\n" || result.stdout === "99\n99\n63\n",
    },
    {
      id: "pipe-grep-wc",
      title: "Count requests",
      story: "The web server's access log. Mors wants to know how many GET requests came in, as a single number.",
      task: "Count how many GET requests appear in logs/access.log.",
      hint: "grep for GET, then count the lines (or use grep -c).",
      solution: ["grep GET logs/access.log | wc -l"],
      lore: "Counting matches by piping into wc is what grep -c does internally. Knowing both means you're never stuck without either.",
      check: ({ argv, result }) => used(argv, "grep") && result.stdout.trim() === "4",
    },
    {
      id: "pipe-cut",
      title: "One column",
      story: "people.csv has names, ages and cities. Mors only wants the names, for a spell that needs them.",
      task: "Print only the name column (the first field) of data/people.csv.",
      hint: "cut -d , -f 1 splits on commas and keeps field 1.",
      solution: ["cut -d , -f 1 data/people.csv"],
      lore: "cut splits on a delimiter and picks fields by number. Comma-separated files are older than the relational database; cut has read them since the 1970s.",
      check: ({ result }) => result.stdout.includes("Alice\nBob\nCarla\nDmitri\nEve\nFarid\n") && !result.stdout.includes("London"),
    },
    {
      id: "pipe-awk",
      title: "Third column",
      story: "Now the cities. Mors suggests awk, 'a whole programming language that fits in a one-liner'.",
      task: "Print only the city (third field) of every person in data/people.csv, using awk.",
      hint: "awk -F, '{print $3}' FILE",
      solution: ["awk -F, '{print $3}' data/people.csv"],
      lore: "awk is named after Aho, Weinberger and Kernighan, 1977. It's a full programming language hiding inside a one-liner; you just used about one percent of it.",
      check: ({ argv, result }) => used(argv, "awk") && result.stdout.includes("London\nParis\nMadrid\nBerlin\nLondon\nCairo\n"),
    },
    {
      id: "pipe-tr",
      title: "SHOUT",
      story: "Mors wants notes.txt read aloud to Valdraak, who is hard of hearing. In capitals.",
      task: "Print notes.txt in UPPERCASE.",
      hint: "tr a-z A-Z translates lowercase to uppercase. Feed the file in with cat and a pipe, or with <.",
      solution: ["cat notes.txt | tr a-z A-Z"],
      lore: "tr translates characters one to one. Uppercasing text was a cipher problem before it was a shell problem; Caesar would have liked tr.",
      check: ({ shell, result }) => result.stdout === shell.fs.readFile(`${HOME}/notes.txt`).toUpperCase(),
    },
    {
      id: "pipe-sed",
      title: "Find and replace",
      story: "Mors has gone off bread and onto cake. Show notes.txt with the swap made, but leave the file itself alone for now.",
      task: "Print notes.txt with every 'bread' replaced by 'cake'. Do not change the file itself.",
      hint: "sed 's/old/new/g' FILE  (the g means every occurrence, not just the first per line)",
      solution: ["sed 's/bread/cake/g' notes.txt"],
      lore: "sed is a stream editor from 1974; it never loads the whole file. s/old/new/ is its most typed line and the ancestor of every 'find and replace' since.",
      check: ({ shell, result }) =>
        result.stdout === shell.fs.readFile(`${HOME}/notes.txt`).replaceAll("bread", "cake") && shell.fs.readFile(`${HOME}/notes.txt`).includes("bread"),
    },
    {
      id: "pipe-sed-i",
      title: "Edit in place",
      story: "The hidden .bashrc sets the editor to nano. Mors, a vim man for a thousand years, would like that changed for real this time.",
      task: "In the hidden file .bashrc, change the editor from nano to vim by editing the file in place.",
      hint: "sed -i edits the file instead of printing.",
      solution: ["sed -i 's/nano/vim/' .bashrc"],
      lore: "-i edits in place. Underneath, sed writes a new file and swaps it in; nothing is ever truly edited in place, only replaced quickly.",
      check: ({ shell }) => shell.fs.readFile(`${HOME}/.bashrc`).includes("EDITOR=vim"),
    },
    {
      id: "pipe-redirect",
      title: "Save output to a file",
      story: "Mors wants a record of what home looked like today, sizes and all, kept in a file.",
      task: "Save the long listing of your home directory (ls -l) into a file called listing.txt.",
      hint: "The > operator redirects output into a file, creating or overwriting it.",
      solution: ["ls -l > listing.txt"],
      lore: "> creates or truncates the file before ls even starts. That's why the listing can contain its own output file; the shell opened it first.",
      check: ({ shell }) => shell.fs.isFile(`${HOME}/listing.txt`) && shell.fs.readFile(`${HOME}/listing.txt`).includes("documents"),
    },
    {
      id: "pipe-append",
      title: "Append, don't overwrite",
      story: "One more errand for the list: coffee. A single > would wipe the list; Mors has made that mistake in three centuries.",
      task: "Add the line 'buy coffee' to the end of notes.txt without losing what is already there.",
      hint: ">> appends; a single > would wipe the file first.",
      solution: ["echo buy coffee >> notes.txt"],
      lore: ">> opens the file for appending. Logs, notes, histories: almost everything that grows uses it.",
      check: ({ shell }) => {
        const text = shell.fs.readFile(`${HOME}/notes.txt`);
        return text.startsWith("Shopping: milk") && text.endsWith("buy coffee\n");
      },
    },
    {
      id: "pipe-stdin",
      title: "Input redirection",
      story: "sort can read a file you name, or whatever is typed at it. Mors wants you to feed it the file the second way.",
      task: "Sort data/words.txt by giving sort the file through input redirection (<) rather than as an argument.",
      hint: "sort < FILE",
      solution: ["sort < data/words.txt"],
      lore: "< feeds a file to a program that expected a keyboard. To sort, a file and a typist look identical; that's the whole trick of standard input.",
      check: ({ line, result }) => line.includes("<") && result.stdout === "apple\napple\napple\nbanana\nbanana\ncherry\ndate\n",
    },
    {
      id: "pipe-xargs",
      title: "find + xargs",
      story: "The logs folder is full of .log files that Mors wants gone. find can list them; rm needs them as arguments. Something has to sit in between.",
      task: "Delete every .log file under the logs folder using find and xargs together.",
      hint: "find logs -name '*.log' | xargs rm",
      solution: ["find logs -name '*.log' | xargs rm"],
      lore: "xargs turns a list of names into arguments, because programs take arguments and pipes carry text. It's the adapter between the two worlds.",
      check: ({ shell, argv }) => used(argv, "xargs") && !shell.fs.exists(`${HOME}/logs/app.log`) && !shell.fs.exists(`${HOME}/logs/access.log`),
    },
    {
      id: "pipe-chain",
      title: "Only if it worked",
      story: "Make a release folder and put a notes file in it, but only if the folder was actually created. Mors distrusts commands that assume.",
      task: "In one line: create a folder called release and, only if that succeeds, create the empty file release/notes.txt inside it.",
      hint: "cmd1 && cmd2 runs cmd2 only when cmd1 succeeds.",
      solution: ["mkdir release && touch release/notes.txt"],
      lore: "&& runs the second command only if the first succeeded, judged by its exit code. The shell has believed in zero as success since 1971.",
      check: ({ shell, line }) => line.includes("&&") && shell.fs.isFile(`${HOME}/release/notes.txt`),
    },
    {
      id: "pipe-mors-notes",
      title: "Count the wizard's notes",
      story: "Mors can't remember how many notes he's written in /opt/mors/notes. 'I lost count around the same time I lost my age.'",
      task: "Count how many files are in /opt/mors/notes using ls and a pipe.",
      hint: "ls the folder, pipe into wc -l.",
      solution: ["ls /opt/mors/notes | wc -l"],
      lore: "Four notes. ls to list, wc to count, a pipe in between: three tools that never met, cooperating perfectly.",
      check: ({ line, argv, result }) => line.includes("|") && used(argv, "wc") && result.stdout.trim() === "4",
    },
  ],
};

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

const permissions: Track = {
  id: "permissions",
  title: "Permissions",
  tagline: "Who may read, write and run",
  story:
    "A spell that anyone can rewrite is a liability. Mors wants you to learn who may read, write and run a file, and then to lock the chamber accordingly.",
  commands: ["chmod", "ls -l"],
  challenges: [
    {
      id: "perm-chmod-x",
      title: "Make it executable",
      story: "deploy.sh is a script, but the machine treats it as plain text until told otherwise.",
      task: "Give projects/scripts/deploy.sh execute permission.",
      hint: "chmod +x FILE adds the execute bit.",
      solution: ["chmod +x projects/scripts/deploy.sh"],
      lore: "The execute bit is the difference between a text file and a program. Same bytes; one permission.",
      check: ({ shell }) => (shell.fs.stat(`${HOME}/projects/scripts/deploy.sh`)!.mode & 0o111) !== 0,
    },
    {
      id: "perm-chmod-num",
      title: "Numeric modes",
      story: "Mors thinks in octal, which he claims is a wizard thing and not a Unix thing. Set setup.sh so the owner can do everything and everyone else can read and run.",
      task: "Set the permissions of downloads/setup.sh to rwxr-xr-x using the numeric form.",
      hint: "r=4, w=2, x=1. Add them up per group: owner, group, others.",
      solution: ["chmod 755 downloads/setup.sh"],
      lore: "rwx is binary: 4, 2, 1. 755 is 111 101 101. You just wrote three octal digits, the oldest number system in Unix.",
      check: ({ shell, argv }) => shell.fs.stat(`${HOME}/downloads/setup.sh`)!.mode === 0o755 && used(argv, "755"),
    },
    {
      id: "perm-chmod-sym",
      title: "Lock it down",
      story: "notes.txt is currently writable by everyone on the machine, which on a shared system is an invitation. Take write away from group and others; keep your own.",
      task: "notes.txt is currently rw-rw-rw-. Remove write permission from group and others, leaving the owner's permissions alone.",
      hint: "chmod go-w FILE  (g = group, o = others, - = remove, w = write)",
      solution: ["chmod go-w notes.txt"],
      lore: "u, g, o: user, group, others. Multics had this idea in the 1960s; Unix borrowed it and never gave it back.",
      setup: (shell) => shell.fs.chmod(`${HOME}/notes.txt`, 0o666),
      check: ({ shell }) => {
        const mode = shell.fs.stat(`${HOME}/notes.txt`)!.mode;
        return (mode & 0o022) === 0 && (mode & 0o600) === 0o600;
      },
    },
    {
      id: "perm-ls-l",
      title: "Check your work",
      story: "Mors: 'A permission change you didn't check is a permission change you don't have. Wizards measure twice.'",
      task: "Show the permissions of the files in projects/scripts with a long listing.",
      hint: "ls -l shows a permission string like -rwxr-xr-x for each entry.",
      solution: ["ls -l projects/scripts"],
      lore: "The first character is the type, then three groups of rwx. Read it left to right: owner, group, everyone else. It's the same lock on every file in the world.",
      check: ({ argv, result }) => used(argv, "ls") && hasFlag(argv, "l") && result.stdout.includes("deploy.sh"),
    },
    {
      id: "perm-mors-spell",
      title: "Arm the spell",
      story: "In the hidden chamber sits threshold-walk.sh, Mors's teleport. It won't run: 'Needs execute permission, like all good spells.'",
      task: "Make /opt/mors/.chamber/threshold-walk.sh executable.",
      hint: "chmod +x with the full path.",
      solution: ["chmod +x /opt/mors/.chamber/threshold-walk.sh"],
      lore: "You armed my spell. In a real shell you could run it now with ./threshold-walk.sh. Here it just glows a little, which is enough.",
      check: ({ shell }) => (shell.fs.stat(`${MORS_HOME}/.chamber/threshold-walk.sh`)!.mode & 0o111) !== 0,
    },
  ],
};

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const environment: Track = {
  id: "environment",
  title: "Environment",
  tagline: "Variables, identity and exit codes",
  story:
    "The shell remembers things: who you are, where home is, what just happened and whether it worked. Mors wants you to speak its language of variables and exit codes, the language every script is written in.",
  commands: ["echo $VAR", "export", "whoami", "history", "$?"],
  challenges: [
    {
      id: "env-echo-home",
      title: "Variables",
      story: "Every program on the machine knows where your home is without asking. Mors wants you to see where that knowledge lives.",
      task: "Print the value of the HOME environment variable.",
      hint: "Put a $ in front of a variable's name to use its value: echo $HOME",
      solution: ["echo $HOME"],
      lore: "Environment variables are inherited by every program the shell starts. HOME is why every tool knows where your files live without asking.",
      check: ({ line, result }) => line.includes("$HOME") && result.stdout === `${HOME}\n`,
    },
    {
      id: "env-export",
      title: "Set a variable",
      story: "Tools ask the EDITOR variable which editor to open. Mors has opinions about the answer.",
      task: "Create an environment variable named EDITOR with the value vim, then print it.",
      hint: "export NAME=value, then echo $NAME",
      solution: ["export EDITOR=vim", "echo $EDITOR"],
      lore: "export marks a variable to be passed to child processes. Without it, the variable stays a private thought of the shell.",
      check: ({ shell, result }) => shell.env.get("EDITOR") === "vim" && result.stdout === "vim\n",
    },
    {
      id: "env-whoami",
      title: "Who am I?",
      story: "On a shared machine you might be anyone. Mors, who is technically no one, finds the question delightful.",
      task: "Print the name of the user you are logged in as.",
      hint: "The command is literally the question.",
      solution: ["whoami"],
      lore: "whoami exists because you can be someone else on Unix; su and sudo change who you are mid-session. Identity here is a number with a name attached.",
      check: ({ argv, result }) => used(argv, "whoami") && result.stdout === "user\n",
    },
    {
      id: "env-history",
      title: "What did I type?",
      story: "Mors wants to see your trail. 'Not to judge. To learn how you think. Also slightly to judge.'",
      task: "Show the list of commands you have run so far.",
      hint: "history",
      solution: ["history"],
      lore: "Command history came from the C shell in 1978, so people could repeat their mistakes efficiently. The up arrow is the same idea with better ergonomics.",
      check: ({ argv }) => argv[0] === "history",
    },
    {
      id: "env-exit-code",
      title: "Exit codes",
      story: "Every command leaves a verdict behind: a number. Make something fail on purpose, then ask the shell how it went.",
      task: "Run a command that fails (for example cat on a file that does not exist), then print the exit code of that command.",
      hint: "$? holds the exit code of the last command. Print it with echo.",
      solution: ["cat nothing.txt", "echo $?"],
      lore: "Every program leaves a number when it exits: 0 for success, anything else for a specific failure. $? is the shell's memory of the last verdict.",
      check: ({ line, result }) => line.includes("$?") && result.stdout.trim() === "1",
    },
    {
      id: "env-mors-var",
      title: "Name the wizard",
      story: "Mors would like the shell to know who lives here. Put his name in a variable called WIZARD and read it back.",
      task: "Set a variable WIZARD to Mors and print it.",
      hint: "WIZARD=Mors then echo $WIZARD (export also works).",
      solution: ["WIZARD=Mors", "echo $WIZARD"],
      lore: "You named me in a variable. Now every child process of this shell knows who lives here. That's more than most landlords manage.",
      check: ({ shell, result }) => shell.env.get("WIZARD") === "Mors" && result.stdout === "Mors\n",
    },
    {
      id: "env-passwd",
      title: "Put it all together",
      story: "The system's user list lives in /etc/passwd, one user per line, fields split by colons. Mors wants just the names, in order.",
      task: "Print only the usernames (first field) from /etc/passwd, sorted alphabetically.",
      hint: "cut -d : -f 1 /etc/passwd | sort",
      solution: ["cut -d : -f 1 /etc/passwd | sort"],
      lore: "/etc/passwd stopped holding passwords in the 1980s; they moved to /etc/shadow. The name stayed, like most names in Unix.",
      check: ({ result }) => result.stdout === "daemon\nroot\nuser\nwww-data\n",
    },
  ],
};

// ---------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------

const SPELLBOOK = `${HOME}/spellbook`;

/** Mors's spellbook folder, not yet a repository. */
function makeSpellbook(shell: Shell): void {
  shell.fs.mkdir(SPELLBOOK);
  shell.fs.writeFile(`${SPELLBOOK}/fireball.txt`, "fireball: heat, but with ambition\n");
  shell.fs.writeFile(`${SPELLBOOK}/frost.txt`, "frost: entropy, politely reversed\n");
  shell.fs.writeFile(`${SPELLBOOK}/lightning.txt`, "lightning: 300,000,000 metres per second, give or take a lab\n");
  shell.changeDir(SPELLBOOK);
}

/** Spellbook as a repository with everything committed once. */
function committedSpellbook(shell: Shell) {
  makeSpellbook(shell);
  const { repo } = shell.initRepo(SPELLBOOK);
  repo.add(shell.fs, ["."], SPELLBOOK);
  repo.commit("Add spellbook");
  return repo;
}

const FROST_ORIGINAL = "frost: entropy, politely reversed\n";

const gitTrack: Track = {
  id: "git",
  title: "Git",
  tagline: "Keep every version of your work",
  story:
    "Mors lost the spellbook in 3026 to a bad edit and no backups. He'd like history not to repeat itself, literally. Put the spellbook under version control, one commit at a time.",
  commands: ["git init", "git status", "git add", "git commit", "git log", "git diff", "git branch", "git switch", "git restore"],
  challenges: [
    {
      id: "git-init",
      title: "Start tracking",
      story: "The spellbook lives in ~/spellbook: three spells, no history. Mors: 'Every good notebook starts empty. So does every repository.'",
      task: "Go into the spellbook folder and turn it into a Git repository.",
      hint: "cd spellbook, then git init.",
      solution: ["cd spellbook", "git init"],
      lore: "git init creates a hidden .git directory and nothing else. All of history will live in there; it starts empty, like every good notebook.",
      setup: (shell) => {
        makeSpellbook(shell);
        shell.changeDir(HOME);
      },
      check: ({ shell }) => shell.findRepo(SPELLBOOK) !== undefined,
    },
    {
      id: "git-status",
      title: "What does Git see?",
      story: "The repository exists but knows nothing yet. Before doing anything, ask it what it sees. Mors does this before every command; he calls it 'looking'.",
      task: "Ask Git for the status of the spellbook.",
      hint: "git status",
      solution: ["git status"],
      lore: "git status is the most-typed Git command and never changes anything. Look before you commit; that's not caution, that's method.",
      setup: (shell) => {
        makeSpellbook(shell);
        shell.initRepo(SPELLBOOK);
      },
      check: ({ argv, result }) => used(argv, "status") && result.stdout.includes("Untracked files"),
    },
    {
      id: "git-add-one",
      title: "Stage one file",
      story: "Git won't track a file until you ask. Start with fireball.txt; the others can wait.",
      task: "Stage fireball.txt for the next commit.",
      hint: "git add FILE",
      solution: ["git add fireball.txt"],
      lore: "The staging area was Git's odd idea in 2005: choose exactly what goes into a commit instead of committing everything. Odd, then indispensable.",
      setup: (shell) => {
        makeSpellbook(shell);
        shell.initRepo(SPELLBOOK);
      },
      check: ({ shell }) => {
        const repo = shell.findRepo(SPELLBOOK);
        return !!repo && repo.index.has("fireball.txt") && !repo.index.has("frost.txt");
      },
    },
    {
      id: "git-add-all",
      title: "Stage everything",
      story: "Three spells, one command. Mors: 'Convenient and slightly dangerous. Know what's in the folder first.' You do.",
      task: "Stage every file in the spellbook with a single command.",
      hint: "git add . stages everything under the current directory.",
      solution: ["git add ."],
      lore: "git add . stages everything under the current directory. It is the command most likely to commit a password by accident, so look first.",
      setup: (shell) => {
        makeSpellbook(shell);
        shell.initRepo(SPELLBOOK);
      },
      check: ({ shell }) => {
        const repo = shell.findRepo(SPELLBOOK);
        return !!repo && ["fireball.txt", "frost.txt", "lightning.txt"].every((f) => repo.index.has(f));
      },
    },
    {
      id: "git-commit",
      title: "The first commit",
      story: "Everything is staged. Now record it, with a message future-you will understand. Mors suggests 'Add spellbook'; he's not precious about it.",
      task: 'Record the staged files as the first commit, with the message "Add spellbook".',
      hint: 'git commit -m "Add spellbook"',
      solution: ['git commit -m "Add spellbook"'],
      lore: "A commit is a snapshot with a message and a parent. Linus Torvalds wrote the first Git in about ten days in 2005 because he needed exactly this and nothing else would do.",
      setup: (shell) => {
        makeSpellbook(shell);
        const { repo } = shell.initRepo(SPELLBOOK);
        repo.add(shell.fs, ["."], SPELLBOOK);
      },
      check: ({ shell }) => (shell.findRepo(SPELLBOOK)?.commits.size ?? 0) >= 1,
    },
    {
      id: "git-diff",
      title: "See what changed",
      story: "Mors has improved frost: it now includes ice shards. Change the file, then ask Git to show exactly what differs.",
      task: "Add the line 'ice shard' to the end of frost.txt, then show the change with git diff.",
      hint: "echo ice shard >> frost.txt, then git diff",
      solution: ["echo ice shard >> frost.txt", "git diff"],
      lore: "git diff shows what changed line by line. The algorithm behind it, longest common subsequence, is decades older than Git.",
      setup: (shell) => void committedSpellbook(shell),
      check: ({ argv, result }) => used(argv, "diff") && result.stdout.includes("+ice shard"),
    },
    {
      id: "git-commit-change",
      title: "Commit the change",
      story: "The new frost is right. Stage it and commit it, so the spellbook's history gains a second page.",
      task: "Stage frost.txt and commit it with a message of your choice.",
      hint: "git add frost.txt, then git commit -m \"...\"",
      solution: ["git add frost.txt", 'git commit -m "Sharpen frost"'],
      lore: "Two commits now, each pointing at its parent. History in Git is a chain of snapshots, which is why nothing committed is ever truly lost.",
      setup: (shell) => {
        committedSpellbook(shell);
        shell.fs.writeFile(`${SPELLBOOK}/frost.txt`, FROST_ORIGINAL + "ice shard\n");
      },
      check: ({ shell }) => {
        const repo = shell.findRepo(SPELLBOOK);
        if (!repo || repo.commits.size < 2) return false;
        const s = repo.status(shell.fs);
        return s.staged.length === 0 && s.unstaged.length === 0;
      },
    },
    {
      id: "git-log",
      title: "Read the history",
      story: "Two commits so far. Mors wants the story of the spellbook, one line per chapter.",
      task: "Show the commit history, one line per commit.",
      hint: "git log --oneline",
      solution: ["git log --oneline"],
      lore: "Every commit id is a hash of its content and its parent. Change one byte anywhere in history and every id after it changes; that's the tamper-proofing.",
      setup: (shell) => {
        const repo = committedSpellbook(shell);
        shell.fs.writeFile(`${SPELLBOOK}/frost.txt`, FROST_ORIGINAL + "ice shard\n");
        repo.add(shell.fs, ["frost.txt"], SPELLBOOK);
        repo.commit("Sharpen frost");
      },
      check: ({ argv, result }) => used(argv, "log") && argv.includes("--oneline") && result.stdout.trim().split("\n").length >= 2,
    },
    {
      id: "git-branch",
      title: "Try something on a branch",
      story: "Mors wants to experiment with a storm spell without risking the real spellbook. Branches exist for exactly this.",
      task: "Create a branch called experiment and switch to it.",
      hint: "git switch -c experiment does both in one go (git checkout -b works too).",
      solution: ["git switch -c experiment"],
      lore: "A branch is a 41-byte file containing a commit id. That's why branching in Git is instant; there's nothing to copy.",
      setup: (shell) => void committedSpellbook(shell),
      check: ({ shell }) => shell.findRepo(SPELLBOOK)?.branch === "experiment",
    },
    {
      id: "git-switch-back",
      title: "Back to main",
      story: "On the experiment branch, storm.txt exists and is committed. Go back to main and watch it vanish. It isn't gone; it's just elsewhere.",
      task: "You are on the experiment branch. Switch back to main.",
      hint: "git switch main",
      solution: ["git switch main"],
      lore: "Switching branches rewrites your working files to that branch's snapshot. storm.txt is safe on the experiment branch; main simply never had it.",
      setup: (shell) => {
        const repo = committedSpellbook(shell);
        repo.createBranch("experiment");
        repo.switchTo(shell.fs, "experiment", "");
        shell.fs.writeFile(`${SPELLBOOK}/storm.txt`, "storm: lightning, but in bulk\n");
        repo.add(shell.fs, ["storm.txt"], SPELLBOOK);
        repo.commit("Add storm");
      },
      check: ({ shell }) => shell.findRepo(SPELLBOOK)?.branch === "main" && !shell.fs.exists(`${SPELLBOOK}/storm.txt`),
    },
    {
      id: "git-restore",
      title: "Undo a mistake",
      story: "Someone, possibly Valdraak, scribbled nonsense into frost.txt. It isn't committed. Mors: 'Ask Git for the last good version.'",
      task: "Throw away the uncommitted change to frost.txt using git restore.",
      hint: "git restore frost.txt",
      solution: ["git restore frost.txt"],
      lore: "git restore throws away changes you haven't staged. It's the undo button, and like every undo button, it doesn't ask twice.",
      setup: (shell) => {
        committedSpellbook(shell);
        shell.fs.writeFile(`${SPELLBOOK}/frost.txt`, "frost: entropy, politely reversed\nVALDRAAK WAS HERE\n");
      },
      check: ({ shell, argv }) => used(argv, "restore") && shell.fs.readFile(`${SPELLBOOK}/frost.txt`) === FROST_ORIGINAL,
    },
  ],
};

export const tracks: Track[] = [navigation, files, viewing, searching, pipes, permissions, environment, gitTrack];
