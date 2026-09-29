/**
 * The tracks menu: one card per track with its icon, tagline, the commands
 * it teaches and progress. Tracks are independent, so every card is always
 * available; the open track and finished tracks are marked.
 */
import type { Trainer } from "@terminal-trainer/core";
import { trackIcon } from "./track-icons";

export interface TrackMenu {
  element: HTMLElement;
  render(): void;
}

export function createTrackMenu(root: HTMLElement, trainer: Trainer, opts: { onSelect: (trackId: string) => void }): TrackMenu {
  const element = document.createElement("div");
  element.className = "track-menu";
  element.setAttribute("role", "list");
  root.appendChild(element);

  const render = () => {
    element.replaceChildren();
    for (const track of trainer.tracks) {
      const { done, total } = trainer.trackProgress(track.id);
      const finished = total > 0 && done === total;
      const open = trainer.track?.id === track.id;
      const card = document.createElement("button");
      card.type = "button";
      card.className = ["track-card", finished ? "finished" : "", open ? "open" : ""].join(" ").trim();
      card.dataset.track = track.id;
      card.setAttribute("role", "listitem");
      card.setAttribute("aria-label", `${track.title}: ${done} of ${total} done${open ? ", in progress" : ""}`);
      card.innerHTML = `
        <span class="track-icon" aria-hidden="true">${trackIcon(track.id)}</span>
        <span class="track-body">
          <span class="track-title"></span>
          <span class="track-tagline"></span>
          <span class="track-commands"></span>
        </span>
        <span class="track-progress">
          <span class="progress" aria-hidden="true"><span class="progress-bar" style="width:${total ? Math.round((done / total) * 100) : 0}%"></span></span>
          <span class="track-count">${finished ? "Completed" : `${done} / ${total}`}</span>
        </span>`;
      card.querySelector(".track-title")!.textContent = track.title;
      card.querySelector(".track-tagline")!.textContent = track.tagline;
      const commands = card.querySelector(".track-commands")!;
      for (const name of track.commands.slice(0, 5)) {
        const code = document.createElement("code");
        code.textContent = name;
        commands.appendChild(code);
      }
      card.addEventListener("click", () => opts.onSelect(track.id));
      element.appendChild(card);
    }
  };

  trainer.subscribe(render);
  render();
  return { element, render };
}
