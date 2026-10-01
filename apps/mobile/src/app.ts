/**
 * Assembles the mobile app: the sign-in gate, then a session per profile
 * with three tabs (Home, Practice, Learn), the settings sheet and the glue
 * between them. Native calls go through the injected bridge so this file
 * is fully testable in jsdom.
 */
import {
  ProfileStore,
  Shell,
  Trainer,
  createMors,
  createSampleFS,
  namespacedStorage,
  trainerCommands,
  tracks,
  type MorsVoice,
  type Profile,
  type ProgressStorage,
} from "@terminal-trainer/core";
import { brandMark, createAuthPage } from "@terminal-trainer/ui";
import { createTabs, type Tabs } from "./components/tabs";
import { showToast } from "./components/toast";
import { noopNative, type NativeBridge } from "./native";
import { loadPreferences, savePreferences } from "./preferences";
import { createHomeScreen, type HomeScreen } from "./screens/home";
import { createLearnScreen, type LearnScreen } from "./screens/learn";
import { createPracticeScreen, type PracticeScreen } from "./screens/practice";
import { createSettingsSheet, type SettingsSheet } from "./screens/settings";

export interface AppOptions {
  storage?: ProgressStorage;
  native?: NativeBridge;
  version?: string;
  /** Milliseconds per typed character for Mors; 0 is instant (tests). */
  typing?: number;
}

export interface Session {
  profile: Profile;
  element: HTMLElement;
  shell: Shell;
  trainer: Trainer;
  mors: MorsVoice;
  tabs: Tabs;
  home: HomeScreen;
  practice: PracticeScreen;
  learn: LearnScreen;
  settings: SettingsSheet;
  /** Android back button logic; returns true when handled. */
  back(): boolean;
}

export interface App {
  element: HTMLElement;
  store: ProfileStore;
  session: Session | null;
}

const ICONS = {
  home: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>',
  practice: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M12 15h5"/></svg>',
  learn: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/></svg>',
  settings: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
};

export function createApp(root: HTMLElement, opts: AppOptions = {}): App {
  const store = new ProfileStore(opts.storage);
  const app: App = { element: root, store, session: null };

  let auth: ReturnType<typeof createAuthPage> | null = null;
  const showAuth = () => {
    root.replaceChildren();
    auth = createAuthPage(root, store, { onSignIn: (profile) => startSession(profile) });
  };
  const startSession = (profile: Profile) => {
    auth?.dispose();
    auth = null;
    root.replaceChildren();
    app.session = createSession(root, profile, opts, () => {
      store.signOut();
      app.session = null;
      showAuth();
    });
  };

  const current = store.current;
  if (current) startSession(current);
  else showAuth();
  return app;
}

function createSession(root: HTMLElement, profile: Profile, opts: AppOptions, onSignOut: () => void): Session {
  const native = opts.native ?? noopNative;
  const storage = namespacedStorage(opts.storage, profile.id);
  const typing = opts.typing ?? 16;

  const shell = new Shell({ fs: createSampleFS() });
  const trainer = new Trainer({ shell, tracks, freshFS: createSampleFS, storage });
  const mors = createMors();
  for (const cmd of trainerCommands(trainer, mors)) shell.register(cmd);
  const prefs = loadPreferences(storage);

  const element = document.createElement("div");
  element.className = "app";
  element.innerHTML = `
    <header class="appbar">
      <h1 class="appbar-title">Terminal Trainer</h1>
      <button type="button" class="icon-button settings-button" aria-label="Settings">${ICONS.settings}</button>
    </header>
    <main class="screens"></main>`;
  root.appendChild(element);
  element.querySelector(".appbar-title")!.prepend(brandMark(26));
  const screens = element.querySelector<HTMLElement>(".screens")!;

  const goHome = (line: string) => {
    tabs.select("home");
    void home.bubble.say(line);
  };

  const home = createHomeScreen(screens, trainer, {
    typing,
    onSelectTrack: (trackId) => {
      const wasOpen = trainer.track?.id === trackId;
      trainer.selectTrack(trackId);
      tabs.select("practice");
      void practice.card.bubble.say(wasOpen ? mors.hint(trainer.current!) : mors.trackIntro(trainer.track!));
    },
  });

  const practice = createPracticeScreen(screens, {
    shell,
    trainer,
    mors,
    prefs,
    typing,
    onPrefsChange: (next) => savePreferences(storage, next),
    onSolved: () => {
      native.hapticSuccess();
      showToast(element, "✓ Solved!");
    },
    onAllTracks: () => {
      trainer.leaveTrack();
      goHome(mors.menu());
    },
  });

  const learn = createLearnScreen(screens, shell, {
    onTry: (command) => {
      tabs.select("practice");
      practice.setLine(command + " ");
    },
  });

  const tabs = createTabs(element, [
    { id: "home", label: "Home", icon: ICONS.home, panel: home.element },
    { id: "practice", label: "Practice", icon: ICONS.practice, panel: practice.element },
    { id: "learn", label: "Learn", icon: ICONS.learn, panel: learn.element },
  ]);
  tabs.onChange(() => native.hapticTap());

  const settings = createSettingsSheet(element, {
    prefs,
    profile,
    version: opts.version ?? "dev",
    onFontSize: (size) => {
      prefs.fontSize = size;
      savePreferences(storage, prefs);
      practice.setFontSize(size);
    },
    onResetProgress: () => {
      trainer.resetProgress();
      goHome("Progress cleared. Every track is new again.");
    },
    onSignOut,
  });
  element.querySelector(".settings-button")!.addEventListener("click", () => settings.open());

  // While the keyboard is up, the chrome hides so the terminal keeps its space.
  const setKeyboard = (open: boolean) => {
    element.classList.toggle("keyboard-open", open);
    practice.setKeyboardOpen(open);
  };
  practice.terminal.input.addEventListener("focus", () => setKeyboard(true));
  practice.terminal.input.addEventListener("blur", () => setKeyboard(false));
  native.onKeyboard(setKeyboard);

  const back = (): boolean => {
    if (settings.isOpen()) {
      settings.close();
      return true;
    }
    if (tabs.current === "learn" && learn.back()) return true;
    if (tabs.current !== "home") {
      tabs.select("home");
      return true;
    }
    return false;
  };
  native.onBackButton(back);

  // Resume inside the open track, or welcome on the home tab.
  if (trainer.track) {
    tabs.select("practice");
    void practice.card.bubble.say(mors.trackIntro(trainer.track), { instant: true });
    void home.bubble.say(mors.welcome(profile.name, true), { instant: true });
  } else {
    goHome(mors.welcome(profile.name, trainer.overall.done > 0));
  }

  return { profile, element, shell, trainer, mors, tabs, home, practice, learn, settings, back };
}
