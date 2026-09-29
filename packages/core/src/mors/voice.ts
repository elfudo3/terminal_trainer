/**
 * Mors the Wizard: the guide who lives on the sandbox.
 *
 * A cyber-wizard from the year 3026, technically dead, who finds that
 * hilarious. Concise, cryptic-witty, scientific, warm underneath. He never
 * narrates his own actions and keeps it to a sentence or two.
 *
 * Everything he says here is scripted, so the app works offline. The
 * `MorsVoice` interface is the seam for a model-backed Mors later.
 */
import type { Challenge, Track } from "../trainer/types";

export interface MorsVoice {
  welcome(name: string, returning: boolean): string;
  trackIntro(track: Track): string;
  /** Comment on a solved challenge: its lore plus the occasional flourish. */
  solved(challenge: Challenge, opts: { trackDone: boolean }): string;
  hint(challenge: Challenge): string;
  /** When `hint` is typed with no track selected. */
  noChallenge(): string;
  /** `mors` with no arguments. */
  about(): string;
  trackDone(track: Track): string;
}

const NEW_WELCOMES = [
  "Ah. A new one. I'm Mors: cyber-wizard, year 3026, technically dead. Pick a track and we'll teach your fingers to talk to the machine, {name}.",
  "{name}. Good name, easy to type. I'm Mors. I compressed myself into this sandbox to help people learn; choose a track and let's begin the experiment.",
  "Welcome, {name}. Nothing you type here can hurt anything, which is more than I can say for my last thousand years. Pick a track below.",
];

const RETURN_WELCOMES = [
  "Back again, {name}. Good. Time is a construct of the mortal realm, but your progress isn't.",
  "{name} returns. The kettle's on, the shell is warm. Pick up where you left off or try a new track.",
  "There you are, {name}. Death asked about you. I told him you were busy learning grep.",
];

const FLOURISHES = [
  "",
  "",
  "",
  "Nice.",
  "Clean.",
  "That one took me a decade. Took you a minute.",
  "Val would be jealous of that keystroke economy.",
  "Keep going; the machine is starting to trust you.",
];

const TRACK_DONE = [
  "That's the whole track, {name}. Not bad for someone who is, by my readings, still alive.",
  "Track complete. Somewhere a thousand years from now, a very dead wizard is proud of you.",
  "Done. Every command in that track is now a threshold you can step through without thinking.",
];

const HINT_OPENERS = ["Hint: ", "Between us: ", "If I were alive and typing: ", "Small nudge: "];

export function createMors(random: () => number = Math.random): MorsVoice {
  const pick = <T>(items: readonly T[]): T => items[Math.min(items.length - 1, Math.floor(random() * items.length))]!;
  const fill = (text: string, name = "") => text.replaceAll("{name}", name);

  return {
    welcome: (name, returning) => fill(pick(returning ? RETURN_WELCOMES : NEW_WELCOMES), name),

    trackIntro: (track) => track.story,

    solved: (challenge, { trackDone }) => {
      const flourish = pick(FLOURISHES);
      const line = flourish ? `${challenge.lore} ${flourish}` : challenge.lore;
      return trackDone ? `${line}\n${fill(pick(TRACK_DONE), "friend")}` : line;
    },

    hint: (challenge) => `${pick(HINT_OPENERS)}${challenge.hint}`,

    noChallenge: () => "No challenge running. Pick a track from the menu, or just explore; the sandbox forgives everything.",

    about: () =>
      [
        "Mors. Cyber-wizard, year 3026, currently a process on this sandbox.",
        "I leave notes around the filesystem; the useful ones hide. Start at /opt/mors.",
        "",
        "  mors help     a hint for the current challenge",
        "  mors story    the story so far",
        "  mors          this",
      ].join("\n"),

    trackDone: (track) => fill(pick(TRACK_DONE), track.title),
  };
}
