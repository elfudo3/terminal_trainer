/** Shared fixture for mobile screen tests: a shell on the sample filesystem plus a trainer over a tiny track list. */
import { Shell, Trainer, createMors, createSampleFS, trainerCommands, type Challenge, type Track } from "@terminal-trainer/core";

const ch = (id: string, file: string): Challenge => ({
  id,
  title: `Make ${file}`,
  story: `Mors needs ${file}.`,
  task: `Create a file named ${file}.`,
  hint: `touch ${file}`,
  solution: [`touch ${file}`],
  lore: `${file} exists now, which is more than most spells manage.`,
  check: ({ shell }) => shell.fs.exists(`/home/user/${file}`),
});

export const tinyTracks: Track[] = [
  { id: "basics", title: "Basics", tagline: "Files", story: "Basics begin.", commands: ["touch"], challenges: [ch("a", "a"), ch("b", "b")] },
  { id: "pipes", title: "Pipes", tagline: "Pipes", story: "Pipes begin.", commands: ["|"], challenges: [{ ...ch("c", "c"), check: ({ result }) => result.stdout === "hi\n", solution: ["echo hi"], task: "Print hi." }] },
];

export function makeFixture(tracks: Track[] = tinyTracks) {
  document.body.innerHTML = '<div id="root"></div>';
  const root = document.getElementById("root")!;
  const shell = new Shell({ fs: createSampleFS() });
  const trainer = new Trainer({ shell, tracks, freshFS: createSampleFS });
  const mors = createMors(() => 0);
  for (const cmd of trainerCommands(trainer, mors)) shell.register(cmd);
  return { root, shell, trainer, mors };
}

export function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}
