/** Home: Mors's welcome, overall progress and the track menu. */
import type { Trainer } from "@terminal-trainer/core";
import { createMorsBubble, createTrackMenu, type MorsBubble } from "@terminal-trainer/ui";

export interface HomeScreen {
  element: HTMLElement;
  bubble: MorsBubble;
  dispose(): void;
}

export function createHomeScreen(root: HTMLElement, trainer: Trainer, opts: { typing?: number; onSelectTrack: (id: string) => void }): HomeScreen {
  const element = document.createElement("section");
  element.className = "screen home scrollable";
  element.innerHTML = `
    <div class="home-mors"></div>
    <header class="screen-header">
      <p class="eyebrow">Tracks</p>
      <h2>Choose what to practise</h2>
      <p class="overall-progress"></p>
    </header>
    <div class="home-tracks"></div>`;
  root.appendChild(element);

  const bubble = createMorsBubble(element.querySelector(".home-mors")!, { speed: opts.typing ?? 16, avatarSize: 52 });
  const menu = createTrackMenu(element.querySelector(".home-tracks")!, trainer, { onSelect: opts.onSelectTrack });
  const overall = element.querySelector<HTMLElement>(".overall-progress")!;
  const render = () => {
    const { done, total } = trainer.overall;
    overall.textContent = `${done} of ${total} challenges done`;
  };
  const unsubscribe = trainer.subscribe(render);
  render();
  return { element, bubble, dispose: () => { unsubscribe(); menu.dispose(); } };
}
