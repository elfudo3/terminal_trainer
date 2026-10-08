/**
 * The tracks menu: one card per track with its icon, tagline, the commands
 * it teaches and progress. Tracks are independent, so every card is always
 * available; the open track and finished tracks are marked.
 */
import type { Trainer } from "@terminal-trainer/core";
import { applyBorderGlow, type Glow } from "./effects/border-glow";
import { trackIcon } from "./track-icons";

export interface TrackMenu {
  element: HTMLElement;
  render(): void;
  dispose(): void;
}

export function createTrackMenu(root: HTMLElement, trainer: Trainer, opts: { onSelect: (trackId: string) => void }): TrackMenu {
  const element = document.createElement("div");
  element.className = "track-menu";
  element.setAttribute("role", "list");
  root.appendChild(element);

  const cards = new Map<string, { card: HTMLButtonElement; glow: Glow }>();
  const render = () => {
    for (const track of trainer.tracks) {
      const { done, total } = trainer.trackProgress(track.id);
      const finished = total > 0 && done === total;
      const open = trainer.track?.id === track.id;
      let entry = cards.get(track.id);
      if (!entry) {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "track-card";
        card.dataset.track = track.id;
        card.innerHTML = `
          <span class="track-icon" aria-hidden="true">${trackIcon(track.id)}</span>
          <span class="track-body">
            <span class="track-title"></span>
            <span class="track-tagline"></span>
            <span class="track-commands"></span>
          </span>
          <span class="track-progress">
            <span class="progress" aria-hidden="true"><span class="progress-bar"></span></span>
            <span class="track-count"></span>
          </span>`;
        card.addEventListener("click", () => opts.onSelect(track.id));
        element.appendChild(card);
        const glow = applyBorderGlow(card, { hostClass: "track-card-host" });
        glow.host.setAttribute("role", "listitem");
        entry = { card, glow };
        cards.set(track.id, entry);
      }
      const { card } = entry;
      card.classList.toggle("finished", finished);
      card.classList.toggle("open", open);
      card.setAttribute("aria-label", `${track.title}: ${done} of ${total} done${open ? ", in progress" : ""}`);
      card.querySelector<HTMLElement>(".progress-bar")!.style.width = `${total ? Math.round((done / total) * 100) : 0}%`;
      card.querySelector(".track-count")!.textContent = finished ? "Completed" : `${done} / ${total}`;
      card.querySelector(".track-title")!.textContent = track.title;
      card.querySelector(".track-tagline")!.textContent = track.tagline;
      const commands = card.querySelector(".track-commands")!;
      commands.replaceChildren();
      for (const name of track.commands.slice(0, 5)) {
        const code = document.createElement("code");
        code.textContent = name;
        commands.appendChild(code);
      }
    }
  };

  const unsubscribe = trainer.subscribe(render);
  render();
  return { element, render, dispose: () => {
    unsubscribe();
    for (const { glow } of cards.values()) glow.dispose();
    cards.clear();
    element.remove();
  } };
}
