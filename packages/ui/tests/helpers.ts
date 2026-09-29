import { Shell, Trainer, createSampleFS, type Challenge, type Track } from "@terminal-trainer/core";

export function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

const ch = (id: string): Challenge => ({
  id,
  title: `Make ${id}`,
  story: "story",
  task: `touch ${id}`,
  hint: "touch",
  solution: [`touch ${id}`],
  lore: `${id} lore.`,
  check: ({ shell }) => shell.fs.exists(`/home/user/${id}`),
});

export const tinyTracks: Track[] = [
  { id: "navigation", title: "Navigation", tagline: "Find your way", story: "Nav story.", commands: ["pwd", "ls"], challenges: [ch("n1"), ch("n2")] },
  { id: "git", title: "Git", tagline: "Versions", story: "Git story.", commands: ["git"], challenges: [ch("g1")] },
];

export function makeTrainer() {
  const shell = new Shell({ fs: createSampleFS() });
  const trainer = new Trainer({ shell, tracks: tinyTracks, freshFS: createSampleFS });
  return { shell, trainer };
}
