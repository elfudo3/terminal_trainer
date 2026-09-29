/**
 * The desktop app: sign-in → home (Mors's welcome and the track menu) →
 * practice (terminal beside the story panel). A session is everything
 * that belongs to one signed-in profile; signing out tears it down.
 */
import {
  ProfileStore,
  Shell,
  Trainer,
  complete,
  createMors,
  createSampleFS,
  namespacedStorage,
  trainerCommands,
  tracks,
  type MorsVoice,
  type Profile,
  type ProgressStorage,
} from "@terminal-trainer/core";
import { createAuthPage, createMorsBubble, createTerminal, createTrackMenu, type TerminalView } from "@terminal-trainer/ui";
import { createPanel, type Panel } from "./panel";

export interface WebAppOptions {
  storage?: ProgressStorage;
  version?: string;
  /** Milliseconds per typed character for Mors; 0 is instant (tests). */
  typing?: number;
}

export interface Session {
  profile: Profile;
  shell: Shell;
  trainer: Trainer;
  mors: MorsVoice;
  terminal: TerminalView;
  panel: Panel;
  element: HTMLElement;
}

export interface WebApp {
  element: HTMLElement;
  store: ProfileStore;
  session: Session | null;
}

const MOTD = "Welcome to sandbox. Nothing you do here touches a real machine.\nType  help  for commands, or  mors  to meet the wizard.\n";

export function createWebApp(root: HTMLElement, opts: WebAppOptions = {}): WebApp {
  const store = new ProfileStore(opts.storage);
  const app: WebApp = { element: root, store, session: null };

  const showAuth = () => {
    root.replaceChildren();
    createAuthPage(root, store, { onSignIn: (profile) => startSession(profile) });
  };

  const startSession = (profile: Profile) => {
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

function createSession(root: HTMLElement, profile: Profile, opts: WebAppOptions, onSignOut: () => void): Session {
  const storage = namespacedStorage(opts.storage, profile.id);
  const shell = new Shell({ fs: createSampleFS() });
  const trainer = new Trainer({ shell, tracks, freshFS: createSampleFS, storage });
  const mors = createMors();
  for (const cmd of trainerCommands(trainer, mors)) shell.register(cmd);
  const typing = opts.typing ?? 16;

  const element = document.createElement("div");
  element.className = "app arcane-bg";
  element.innerHTML = `
    <header class="appbar">
      <div class="brand"><span class="brand-logo" aria-hidden="true">&gt;_</span> Terminal Trainer</div>
      <div class="profile-chip">
        <span class="avatar avatar-sm" aria-hidden="true"></span>
        <span class="profile-chip-name"></span>
        <button type="button" class="btn btn-ghost btn-sm sign-out">Sign out</button>
      </div>
    </header>
    <main class="views">
      <section class="view view-home">
        <div class="home-inner">
          <div class="home-mors"></div>
          <div class="home-head">
            <div>
              <p class="eyebrow">Tracks</p>
              <h2>Choose what to practise</h2>
            </div>
            <p class="overall-progress"></p>
          </div>
          <div class="home-tracks"></div>
        </div>
      </section>
      <section class="view view-practice" hidden>
        <div class="practice-grid">
          <div class="terminal-root"></div>
          <div class="panel-root"></div>
        </div>
      </section>
    </main>
    <footer class="app-footer">
      <span class="kbd">Tab</span> complete · <span class="kbd">↑</span><span class="kbd">↓</span> history · <span class="kbd">Ctrl</span>+<span class="kbd">L</span> clear · <code>help</code> lists every command · v${opts.version ?? "dev"}
    </footer>`;
  root.appendChild(element);

  const q = <T extends HTMLElement>(selector: string) => element.querySelector<T>(selector)!;
  q(".avatar").textContent = profile.sigil;
  q(".profile-chip-name").textContent = profile.name;
  q(".sign-out").addEventListener("click", onSignOut);

  const home = q(".view-home");
  const practice = q(".view-practice");
  const homeBubble = createMorsBubble(q(".home-mors"), { speed: typing, avatarSize: 64 });
  const overall = q(".overall-progress");

  const terminal = createTerminal(q(".terminal-root"), {
    prompt: () => shell.prompt(),
    history: () => shell.history,
    complete: (line) => complete(shell, line),
    onSubmit: (line) => {
      const result = shell.run(line);
      if (result.clear) terminal.clear();
      terminal.print(result.stdout);
      terminal.print(result.stderr, "stderr");
      const challenge = trainer.current;
      if (trainer.afterCommand(line, result) === "solved" && challenge) {
        void panel.bubble.say(mors.solved(challenge, { trackDone: trainer.finished }));
      }
    },
  });
  terminal.print(MOTD, "info");

  const showHome = (line: string) => {
    home.hidden = false;
    practice.hidden = true;
    void homeBubble.say(line);
  };
  const showPractice = () => {
    home.hidden = true;
    practice.hidden = false;
    terminal.focus();
  };

  const panel = createPanel(q(".panel-root"), {
    trainer,
    mors,
    typing,
    onAllTracks: () => {
      trainer.leaveTrack();
      showHome(mors.menu());
    },
  });

  createTrackMenu(q(".home-tracks"), trainer, {
    onSelect: (trackId) => {
      const wasOpen = trainer.track?.id === trackId;
      trainer.selectTrack(trackId);
      showPractice();
      void panel.bubble.say(wasOpen ? mors.hint(trainer.current!) : mors.trackIntro(trainer.track!));
    },
  });

  const renderOverall = () => {
    const { done, total } = trainer.overall;
    overall.textContent = `${done} of ${total} challenges done`;
  };
  trainer.subscribe(renderOverall);
  renderOverall();

  // Resume inside the open track, or welcome on the home page.
  if (trainer.track) {
    showPractice();
    void panel.bubble.say(mors.trackIntro(trainer.track), { instant: true });
    void homeBubble.say(mors.welcome(profile.name, true), { instant: true });
  } else {
    showHome(mors.welcome(profile.name, trainer.overall.done > 0));
  }

  return { profile, shell, trainer, mors, terminal, panel, element };
}
