/**
 * The current challenge on the phone: story, task, Mors's bubble and the
 * actions. Tapping the header collapses it to one line so the terminal
 * gets more room while the keyboard is open. Buttons act on the trainer
 * directly; nothing is printed into the terminal.
 */
import type { MorsVoice, Trainer } from "@terminal-trainer/core";
import { createMorsBubble, type MorsBubble } from "@terminal-trainer/ui";

export interface TaskCardOptions {
  trainer: Trainer;
  mors: MorsVoice;
  typing?: number;
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
  onAllTracks: () => void;
}

export interface TaskCard {
  element: HTMLElement;
  bubble: MorsBubble;
  render(): void;
  setCollapsed(collapsed: boolean): void;
}

const CHEVRON =
  '<svg class="chevron" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

export function createTaskCard(root: HTMLElement, opts: TaskCardOptions): TaskCard {
  const { trainer, mors } = opts;
  const element = document.createElement("section");
  element.className = "task-card card";
  element.setAttribute("aria-label", "Current challenge");
  element.innerHTML = `
    <button type="button" class="task-card-header" aria-expanded="true" aria-controls="task-card-body">
      <span class="task-card-heading">
        <span class="task-meta"></span>
        <span class="task-title"></span>
      </span>
      ${CHEVRON}
    </button>
    <div class="task-card-body" id="task-card-body">
      <p class="challenge-story"></p>
      <p class="challenge-task"></p>
      <div class="challenge-reveal challenge-answer" hidden><span>One way to do it:</span><code></code></div>
      <p class="task-status" role="status"></p>
      <div class="task-mors"></div>
      <div class="task-secondary">
        <button type="button" class="btn btn-ghost btn-sm" data-action="reset">Reset files</button>
        <button type="button" class="btn btn-ghost btn-sm" data-action="list">Challenges</button>
        <button type="button" class="btn btn-ghost btn-sm" data-action="all-tracks">All tracks</button>
      </div>
      <ol class="challenge-rows" hidden></ol>
    </div>
    <div class="task-actions">
      <button type="button" class="btn btn-sm" data-action="hint">Hint</button>
      <button type="button" class="btn btn-sm" data-action="answer">Answer</button>
      <button type="button" class="btn btn-sm" data-action="skip">Skip</button>
      <button type="button" class="btn btn-primary btn-sm" data-action="next">Next →</button>
    </div>`;
  root.appendChild(element);

  const q = <T extends HTMLElement>(selector: string) => element.querySelector<T>(selector)!;
  const header = q<HTMLButtonElement>(".task-card-header");
  const answer = q<HTMLElement>(".challenge-answer");
  const status = q(".task-status");
  const next = q<HTMLButtonElement>('[data-action="next"]');
  const rows = q<HTMLOListElement>(".challenge-rows");
  const bubble = createMorsBubble(q(".task-mors"), { speed: opts.typing ?? 16, avatarSize: 36 });

  const actions: Record<string, () => void> = {
    hint: () => {
      if (trainer.current) void bubble.say(mors.hint(trainer.current));
    },
    answer: () => (answer.hidden = !answer.hidden),
    skip: () => {
      if (!trainer.skip()) void bubble.say("That was the last challenge of the track.", { instant: true });
    },
    next: () => {
      if (trainer.next()) return;
      if (trainer.finished) opts.onAllTracks();
    },
    reset: () => {
      trainer.reset();
      void bubble.say("Files reset. Same challenge, clean slate.", { instant: true });
    },
    list: () => (rows.hidden = !rows.hidden),
    "all-tracks": () => opts.onAllTracks(),
  };
  for (const button of element.querySelectorAll<HTMLButtonElement>("[data-action]")) {
    button.addEventListener("pointerdown", (event) => event.preventDefault()); // keep the keyboard open
    button.addEventListener("click", () => actions[button.dataset.action!]?.());
  }

  const setCollapsed = (collapsed: boolean) => {
    element.classList.toggle("collapsed", collapsed);
    header.setAttribute("aria-expanded", String(!collapsed));
  };
  header.addEventListener("pointerdown", (event) => event.preventDefault());
  header.addEventListener("click", () => {
    const collapsed = !element.classList.contains("collapsed");
    setCollapsed(collapsed);
    opts.onToggle?.(collapsed);
  });

  let lastChallengeId = "";
  const render = () => {
    const track = trainer.track;
    const challenge = trainer.current;
    element.hidden = !track || !challenge;
    if (!track || !challenge) return;
    const { done, total, index } = trainer.progress;
    q(".task-meta").textContent = `${track.title} · ${index + 1} of ${total} · ${done} done`;
    q(".task-title").textContent = challenge.title;
    q(".challenge-story").textContent = challenge.story;
    q(".challenge-task").textContent = challenge.task;
    answer.querySelector("code")!.textContent = challenge.solution.join("\n");
    if (challenge.id !== lastChallengeId) {
      answer.hidden = true;
      rows.hidden = true;
      lastChallengeId = challenge.id;
    }
    element.classList.toggle("solved", trainer.solved);
    const last = index === total - 1;
    if (trainer.solved) status.textContent = trainer.finished ? "✓ Solved. Track complete!" : "✓ Solved";
    else status.textContent = trainer.isCompleted(challenge) ? "Completed earlier" : "";
    next.disabled = !trainer.solved || (last && !trainer.finished);
    next.textContent = last && trainer.finished ? "Back to tracks" : "Next →";

    rows.replaceChildren();
    track.challenges.forEach((c, i) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = ["challenge-row", trainer.isCompleted(c) ? "done" : "", i === index ? "current" : ""].join(" ").trim();
      button.innerHTML = `<span class="challenge-row-num">${i + 1}</span><span class="challenge-row-title"></span><span class="challenge-row-check" aria-hidden="true">✓</span>`;
      button.querySelector(".challenge-row-title")!.textContent = c.title;
      button.addEventListener("click", () => trainer.goTo(i));
      item.appendChild(button);
      rows.appendChild(item);
    });
  };

  setCollapsed(opts.collapsed ?? false);
  trainer.subscribe(render);
  render();
  return { element, bubble, render, setCollapsed };
}
