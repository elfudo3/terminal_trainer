/**
 * The practice panel beside the terminal: the open track, the current
 * challenge's story and task, the action buttons, Mors's bubble and the
 * list of challenges in the track. Instructions live here, never in the
 * terminal.
 */
import type { MorsVoice, Trainer } from "@terminal-trainer/core";
import { createMorsBubble, type MorsBubble } from "@terminal-trainer/ui";

export interface PanelOptions {
  trainer: Trainer;
  mors: MorsVoice;
  /** Milliseconds per typed character for Mors; 0 is instant. */
  typing?: number;
  onAllTracks: () => void;
}

export interface Panel {
  element: HTMLElement;
  bubble: MorsBubble;
  render(): void;
}

export function createPanel(root: HTMLElement, opts: PanelOptions): Panel {
  const { trainer, mors } = opts;
  const element = document.createElement("aside");
  element.className = "panel";
  element.setAttribute("aria-label", "Practice");
  element.innerHTML = `
    <div class="panel-track">
      <div class="panel-track-head">
        <div>
          <p class="eyebrow">Track</p>
          <h2 class="track-name"></h2>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" data-action="all-tracks">‹ All tracks</button>
      </div>
      <div class="panel-track-progress">
        <span class="progress" aria-hidden="true"><span class="progress-bar"></span></span>
        <span class="track-count"></span>
      </div>
    </div>
    <section class="challenge card" aria-live="polite">
      <p class="eyebrow challenge-meta"></p>
      <h3 class="challenge-title"></h3>
      <p class="challenge-story"></p>
      <p class="challenge-task"></p>
      <div class="challenge-reveal challenge-answer" hidden><span>One way to do it:</span><code></code></div>
      <p class="challenge-status" role="status"></p>
      <div class="challenge-actions">
        <button type="button" class="btn btn-sm" data-action="hint">Hint</button>
        <button type="button" class="btn btn-sm" data-action="answer">Answer</button>
        <button type="button" class="btn btn-sm" data-action="reset" title="Put the files back the way this challenge started">Reset files</button>
        <button type="button" class="btn btn-sm" data-action="skip">Skip</button>
        <button type="button" class="btn btn-primary btn-sm" data-action="next">Next →</button>
      </div>
    </section>
    <div class="panel-mors"></div>
    <details class="challenge-list">
      <summary>All challenges in this track</summary>
      <ol class="challenge-rows"></ol>
    </details>`;
  root.appendChild(element);

  const q = <T extends HTMLElement>(selector: string) => element.querySelector<T>(selector)!;
  const bubble = createMorsBubble(q(".panel-mors"), { speed: opts.typing ?? 16 });
  const answer = q<HTMLElement>(".challenge-answer");
  const status = q(".challenge-status");
  const next = q<HTMLButtonElement>('[data-action="next"]');
  const rows = q<HTMLOListElement>(".challenge-rows");

  const actions: Record<string, () => void> = {
    "all-tracks": () => opts.onAllTracks(),
    hint: () => {
      if (trainer.current) void bubble.say(mors.hint(trainer.current));
    },
    answer: () => {
      answer.hidden = !answer.hidden;
    },
    reset: () => {
      trainer.reset();
      void bubble.say("Files reset. Same challenge, clean slate.", { instant: true });
    },
    skip: () => {
      if (!trainer.skip()) void bubble.say("That was the last challenge of the track.", { instant: true });
    },
    next: () => {
      if (trainer.next()) return;
      if (trainer.finished) opts.onAllTracks();
    },
  };
  for (const button of element.querySelectorAll<HTMLButtonElement>("[data-action]")) {
    button.addEventListener("click", () => actions[button.dataset.action!]?.());
  }

  let lastChallengeId = "";
  const render = () => {
    const track = trainer.track;
    const challenge = trainer.current;
    if (!track || !challenge) return;
    const { done, total, index } = trainer.progress;
    q(".track-name").textContent = track.title;
    q<HTMLElement>(".progress-bar").style.width = `${Math.round((done / total) * 100)}%`;
    q(".track-count").textContent = `${done} / ${total}`;
    q(".challenge-meta").textContent = `Challenge ${index + 1} of ${total}`;
    q(".challenge-title").textContent = challenge.title;
    q(".challenge-story").textContent = challenge.story;
    q(".challenge-task").textContent = challenge.task;
    answer.querySelector("code")!.textContent = challenge.solution.join("\n");
    if (challenge.id !== lastChallengeId) {
      answer.hidden = true;
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
      button.setAttribute("aria-current", i === index ? "true" : "false");
      button.innerHTML = `<span class="challenge-row-num">${i + 1}</span><span class="challenge-row-title"></span><span class="challenge-row-check" aria-hidden="true">✓</span>`;
      button.querySelector(".challenge-row-title")!.textContent = c.title;
      button.addEventListener("click", () => trainer.goTo(i));
      item.appendChild(button);
      rows.appendChild(item);
    });
  };

  trainer.subscribe(render);
  render();
  return { element, bubble, render };
}
