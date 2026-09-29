/** Mors's speech bubble: avatar on the left, typed text on the right. */
import { morsAvatar } from "./mors-avatar";
import { typewrite, type Typewriter } from "./typewriter";

export interface MorsBubbleOptions {
  /** Milliseconds per character; 0 shows text instantly. */
  speed?: number;
  /** Avatar size in pixels. */
  avatarSize?: number;
}

export interface MorsBubble {
  element: HTMLElement;
  /** Shows a message, typing it out unless `instant`. */
  say(text: string, opts?: { instant?: boolean }): Promise<void>;
  clear(): void;
}

export function createMorsBubble(root: HTMLElement, opts: MorsBubbleOptions = {}): MorsBubble {
  const element = document.createElement("div");
  element.className = "mors-bubble";
  element.appendChild(morsAvatar(opts.avatarSize ?? 44));
  const speech = document.createElement("div");
  speech.className = "mors-speech";
  speech.innerHTML = '<span class="mors-name">Mors</span><p class="mors-text" aria-live="polite"></p>';
  element.appendChild(speech);
  root.appendChild(element);

  const text = speech.querySelector<HTMLElement>(".mors-text")!;
  let current: Typewriter | undefined;

  return {
    element,
    say: (message, sayOpts = {}) => {
      current?.cancel();
      element.hidden = false;
      element.classList.remove("mors-bubble-enter");
      void element.offsetWidth; // restart the enter animation
      element.classList.add("mors-bubble-enter");
      current = typewrite(text, message, { speed: sayOpts.instant ? 0 : opts.speed });
      return current.done;
    },
    clear: () => {
      current?.cancel();
      text.textContent = "";
      element.hidden = true;
    },
  };
}
