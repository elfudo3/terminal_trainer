/**
 * Types text into an element one character at a time. Respects the
 * user's reduced-motion setting (instant), and `speed: 0` is instant too,
 * which keeps tests synchronous.
 */
export interface Typewriter {
  cancel(): void;
  /** Resolves when the text is fully shown (immediately if instant). */
  done: Promise<void>;
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function typewrite(el: HTMLElement, text: string, opts: { speed?: number } = {}): Typewriter {
  const speed = opts.speed ?? 16;
  if (speed <= 0 || prefersReducedMotion()) {
    el.textContent = text;
    return { cancel: () => {}, done: Promise.resolve() };
  }
  el.textContent = "";
  let index = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finish: () => void = () => {};
  const done = new Promise<void>((resolve) => (finish = resolve));
  const tick = () => {
    index++;
    el.textContent = text.slice(0, index);
    if (index < text.length) {
      // Pause a little longer at sentence ends, like someone actually typing.
      const ch = text[index - 1];
      timer = setTimeout(tick, ch === "." || ch === "!" || ch === "?" ? speed * 8 : ch === "," ? speed * 3 : speed);
    } else finish();
  };
  timer = setTimeout(tick, speed);
  return {
    cancel: () => {
      clearTimeout(timer);
      el.textContent = text;
      finish();
    },
    done,
  };
}
