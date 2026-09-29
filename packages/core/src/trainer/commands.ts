/**
 * The few commands that exist only in the trainer: hint, skip and mors.
 * Instructions live in the app's panel, so these stay terse and never
 * repeat the task text.
 */
import type { Command } from "../core/types";
import type { MorsVoice } from "../mors/voice";
import type { Trainer } from "./trainer";

const CATEGORY = "Practice";

export function trainerCommands(trainer: Trainer, mors: MorsVoice): Command[] {
  const hintText = () => (trainer.current ? mors.hint(trainer.current) : mors.noChallenge());

  const hint: Command = {
    name: "hint",
    category: CATEGORY,
    summary: "get a hint for the current challenge",
    usage: "hint",
    details: "Mors gives you a nudge for the current challenge without giving the answer away.",
    run: () => ({ stdout: hintText() + "\n" }),
  };

  const skip: Command = {
    name: "skip",
    category: CATEGORY,
    summary: "skip the current challenge",
    usage: "skip",
    details: "Moves to the next challenge of the track without completing this one. Come back later from the track's list.",
    run: () => {
      if (!trainer.track) return { stderr: "skip: no track is open. Pick one from the menu.\n", code: 1 };
      if (!trainer.skip()) return { stdout: "This is the last challenge of the track.\n" };
      return { stdout: `Skipped. Next up: ${trainer.current!.title}\n` };
    },
  };

  const morsCmd: Command = {
    name: "mors",
    category: CATEGORY,
    summary: "talk to Mors the Wizard (mors help, mors story)",
    usage: "mors [help|story]",
    details: [
      "Mors lives on this sandbox and guides you through the tracks.",
      "",
      "  mors          who he is and where his notes are",
      "  mors help     a hint for the current challenge",
      "  mors story    the story of the current track and challenge",
    ].join("\n"),
    run: ({ args }) => {
      const sub = args[0];
      if (sub === undefined) return { stdout: mors.about() + "\n" };
      if (sub === "help") return { stdout: hintText() + "\n" };
      if (sub === "story") {
        const track = trainer.track;
        if (!track) return { stdout: "No track is open yet. Every track has its own story; pick one from the menu.\n" };
        return { stdout: `${mors.trackIntro(track)}\n\n${trainer.current?.story ?? ""}\n` };
      }
      return { stderr: `mors: I don't know '${sub}'. Try: mors help\n`, code: 1 };
    },
  };

  return [hint, skip, morsCmd];
}
