/**
 * The main screen: task card (with Mors), terminal, suggestion chips and
 * key bar. It owns running commands (shell → output → trainer check).
 * With no track open it is a free-play terminal with a nudge to pick one.
 */
import type { MorsVoice, Shell, Trainer } from "@terminal-trainer/core";
import { complete } from "@terminal-trainer/core";
import { createTerminal, type TerminalView } from "@terminal-trainer/ui";
import { createKeyBar } from "../components/keybar";
import { applySuggestion, createSuggestionBar, suggestionsFor } from "../components/suggestions";
import { createTaskCard, type TaskCard } from "../components/task-card";
import { FONT_SIZE_PX, type FontSize, type Preferences } from "../preferences";

export interface PracticeScreenDeps {
  shell: Shell;
  trainer: Trainer;
  mors: MorsVoice;
  prefs: Preferences;
  typing?: number;
  onPrefsChange: (prefs: Preferences) => void;
  onSolved?: () => void;
  onAllTracks: () => void;
}

export interface PracticeScreen {
  element: HTMLElement;
  terminal: TerminalView;
  card: TaskCard;
  /** Runs a line as if typed. */
  run(line: string): void;
  /** Puts text on the input line, ready to edit or run (used by Learn's "Try it"). */
  setLine(text: string): void;
  setFontSize(size: FontSize): void;
  /** Tell the screen the soft keyboard opened or closed. */
  setKeyboardOpen(open: boolean): void;
}

const MOTD = "Welcome to sandbox. Nothing you do here touches a real device.\nType  help  for commands, or  mors  to meet the wizard.\n";

export function createPracticeScreen(root: HTMLElement, deps: PracticeScreenDeps): PracticeScreen {
  const { shell, trainer, mors } = deps;
  const element = document.createElement("section");
  element.className = "screen practice";
  root.appendChild(element);

  const prefs = { ...deps.prefs };

  // Nudge shown instead of the card while no track is open.
  const noTrack = document.createElement("div");
  noTrack.className = "no-track card";
  noTrack.innerHTML = `<p>Free play: the sandbox is yours. Open a track to get challenges.</p><button type="button" class="btn btn-primary btn-sm">Choose a track</button>`;
  noTrack.querySelector("button")!.addEventListener("click", () => deps.onAllTracks());
  element.appendChild(noTrack);

  // The saved preference applies while the keyboard is closed. When it opens,
  // the card collapses to give the terminal room; expanding it again during
  // that typing session is temporary and not saved.
  let keyboardOpen = false;
  let expandedWhileTyping = false;
  const applyCollapse = () => card.setCollapsed(keyboardOpen ? !expandedWhileTyping : prefs.taskCardCollapsed);

  const card = createTaskCard(element, {
    trainer,
    mors,
    typing: deps.typing,
    collapsed: prefs.taskCardCollapsed,
    onToggle: (collapsed) => {
      if (keyboardOpen) {
        expandedWhileTyping = !collapsed;
        return;
      }
      prefs.taskCardCollapsed = collapsed;
      deps.onPrefsChange({ ...prefs });
    },
    onAllTracks: deps.onAllTracks,
  });

  const setKeyboardOpen = (open: boolean) => {
    if (open === keyboardOpen) return;
    keyboardOpen = open;
    expandedWhileTyping = false;
    applyCollapse();
  };

  const terminalRoot = document.createElement("div");
  terminalRoot.className = "terminal-root";
  element.appendChild(terminalRoot);

  const terminal = createTerminal(terminalRoot, {
    prompt: () => shell.prompt(),
    history: () => shell.history,
    complete: (line) => complete(shell, line),
    focusOnClick: false,
    dockInput: true,
    submitButton: "Run",
    maxChunks: 300,
    onSubmit: (line) => {
      const result = shell.run(line);
      if (result.clear) terminal.clear();
      terminal.print(result.stdout);
      terminal.print(result.stderr, "stderr");
      const challenge = trainer.current;
      if (trainer.afterCommand(line, result) === "solved" && challenge) {
        void card.bubble.say(mors.solved(challenge, { trackDone: trainer.finished }));
        deps.onSolved?.();
      }
      refreshSuggestions();
    },
  });

  const suggestions = createSuggestionBar(element, {
    onPick: (candidate) => {
      terminal.input.value = applySuggestion(terminal.input.value, candidate);
      terminal.focus();
      refreshSuggestions();
    },
  });
  createKeyBar(element, terminal);

  const refreshSuggestions = () => suggestions.update(suggestionsFor(shell, terminal.input.value));
  terminal.input.addEventListener("input", refreshSuggestions);

  const renderTrackState = () => {
    noTrack.hidden = trainer.track !== null;
  };
  trainer.subscribe(renderTrackState);
  renderTrackState();

  const setLine = (text: string) => {
    terminal.input.value = text;
    terminal.focus();
    terminal.input.setSelectionRange(text.length, text.length);
    refreshSuggestions();
  };

  const setFontSize = (size: FontSize) => {
    terminal.element.style.setProperty("--terminal-font-size", `${FONT_SIZE_PX[size]}px`);
  };

  setFontSize(prefs.fontSize);
  refreshSuggestions();
  terminal.print(MOTD, "info");

  return { element, terminal, card, run: (line) => terminal.submit(line), setLine, setFontSize, setKeyboardOpen };
}
