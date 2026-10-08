/**
 * The sign-in page: pick an existing profile or create one with a name and
 * a sigil. Profiles are local to the device (see core/profiles), so there
 * is no password; the page is about identity and progress, not security.
 *
 * Composition: Mors and the introduction on one side, the profile card on
 * the other (stacked on narrow screens), over the animated backdrop. The
 * portrait, text and controls render first; the effects attach after.
 */
import { SIGILS, type Profile, type ProfileStore, type Sigil } from "@terminal-trainer/core";
import { createBackdrop, type Backdrop } from "./effects/backdrop";
import { applyBorderGlow, type Glow } from "./effects/border-glow";
import { morsImage } from "./mors-image";
import { SIGIL_ART, avatar, sigilImage } from "./sigils";
import trainerLogo from "./assets/terminal_trainer_logo_v2.png";
import fudoLogo from "./assets/fudo_brand_logo_colour.png";

export interface AuthPage {
  element: HTMLElement;
  backdrop: Backdrop;
  glow: Glow;
  render(): void;
  dispose(): void;
}

/** "Just now", "3 days ago"... for the profile list. */
export function timeAgo(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export interface AuthPageOptions {
  onSignIn: (profile: Profile) => void;
  /** Skip the animated backdrop (defaults to the OS reduced-motion setting). */
  reducedMotion?: boolean;
  /** Force the backdrop's WebGL check (tests). */
  webgl?: boolean;
}

export function createAuthPage(root: HTMLElement, store: ProfileStore, opts: AuthPageOptions): AuthPage {
  const element = document.createElement("div");
  element.className = "auth-page";
  element.innerHTML = `
    <div class="auth-backdrop"></div>
    <header class="auth-header">
      <img class="auth-logo" src="${trainerLogo}" alt="Terminal Trainer logo" width="1254" height="1254" decoding="async" />
      <p class="auth-product-name">Terminal Trainer</p>
    </header>
    <main class="auth-layout">
      <section class="auth-hero" aria-labelledby="auth-title">
        <div class="auth-intro">
          <h1 class="auth-title" id="auth-title">Learn the terminal.<br />Keep your real machine safe.</h1>
          <p class="auth-tagline">Mors guides you through practical Unix commands in a safe simulator. Try things, make mistakes, and build confidence at your own pace.</p>
        </div>
        <div class="auth-guide">
          <figure class="auth-portrait"></figure>
          <p class="auth-greeting"><span class="auth-prompt">mors@simulator:~$</span> Hello, traveller.<br />Let’s start with a command.</p>
        </div>
      </section>
      <div class="auth-profiles">
        <div class="auth-card card">
          <div class="auth-existing">
            <h2 class="auth-heading">Who's practising?</h2>
            <ul class="profile-list"></ul>
            <p class="auth-or"><span>or start fresh</span></p>
          </div>
          <form class="profile-form" autocomplete="off" aria-labelledby="profile-heading">
            <h2 class="auth-heading auth-heading-new" id="profile-heading">Create your profile</h2>
            <label class="field">
              <span class="field-label">Name</span>
              <input class="field-input" name="name" type="text" maxlength="24" placeholder="What should Mors call you?" autocapitalize="words" spellcheck="false" aria-describedby="profile-error" required />
            </label>
            <fieldset class="sigil-picker">
              <legend class="field-label">Pick a sigil</legend>
              <div class="sigil-options" role="radiogroup" aria-label="Sigil"></div>
            </fieldset>
            <p class="form-error" id="profile-error" role="alert"></p>
            <button type="submit" class="btn btn-primary btn-block">Start practising</button>
          </form>
        </div>
        <p class="auth-note">No installation. No account needed. Progress saved on this device.</p>
      </div>
    </main>
    <footer class="auth-footer">
      <span class="auth-credit">Built by <img src="${fudoLogo}" alt="Fudo" width="1774" height="887" decoding="async" /></span>
      <a href="https://github.com/elfudo3" target="_blank" rel="noopener noreferrer" aria-label="Fudo on GitHub (opens in a new tab)">GitHub <span aria-hidden="true">↗</span></a>
    </footer>`;
  const portrait = morsImage(320);
  portrait.loading = "eager";
  element.querySelector(".auth-portrait")!.appendChild(portrait);
  root.appendChild(element);

  const list = element.querySelector<HTMLUListElement>(".profile-list")!;
  const existing = element.querySelector<HTMLElement>(".auth-existing")!;
  const form = element.querySelector<HTMLFormElement>(".profile-form")!;
  const nameInput = element.querySelector<HTMLInputElement>('input[name="name"]')!;
  const error = element.querySelector<HTMLElement>(".form-error")!;
  const sigilBox = element.querySelector<HTMLElement>(".sigil-options")!;
  let sigil: Sigil = SIGILS[0];

  const renderSigils = () => {
    sigilBox.replaceChildren();
    for (const id of SIGILS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sigil-option";
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(id === sigil));
      button.tabIndex = id === sigil ? 0 : -1;
      button.setAttribute("aria-label", SIGIL_ART[id].label);
      button.dataset.sigil = id;
      button.appendChild(sigilImage(id, 36));
      button.addEventListener("click", () => {
        sigil = id;
        renderSigils();
        sigilBox.querySelector<HTMLButtonElement>(`[data-sigil="${sigil}"]`)!.focus();
      });
      sigilBox.appendChild(button);
    }
  };

  sigilBox.addEventListener("keydown", (event) => {
    const index = SIGILS.indexOf(sigil);
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % SIGILS.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index + SIGILS.length - 1) % SIGILS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = SIGILS.length - 1;
    else return;
    event.preventDefault();
    sigilBox.querySelector<HTMLButtonElement>(`[data-sigil="${SIGILS[next]}"]`)!.click();
  });

  const render = () => {
    const profiles = store.list();
    existing.hidden = profiles.length === 0;
    element.querySelector(".auth-heading-new")!.textContent = profiles.length === 0 ? "Create your profile" : "New profile";
    list.replaceChildren();
    for (const profile of profiles) {
      const item = document.createElement("li");
      item.className = "profile-item";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "profile-button";
      button.dataset.id = profile.id;
      button.innerHTML = `<span class="profile-text"><span class="profile-name"></span><span class="profile-meta"></span></span>`;
      button.prepend(avatar(profile.sigil, 40));
      button.querySelector(".profile-name")!.textContent = profile.name;
      button.querySelector(".profile-meta")!.textContent = `Last seen ${timeAgo(profile.lastSeenAt)}`;
      button.addEventListener("click", () => opts.onSignIn(store.signIn(profile.id)));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "profile-remove";
      remove.setAttribute("aria-label", `Remove ${profile.name}`);
      remove.textContent = "×";
      // Two taps to remove: the first arms the button and changes its label.
      remove.addEventListener("click", () => {
        if (remove.dataset.armed === "true") {
          store.remove(profile.id);
          render();
        } else {
          remove.dataset.armed = "true";
          remove.textContent = "Remove?";
          remove.setAttribute("aria-label", `Confirm removing ${profile.name}`);
        }
      });
      item.append(button, remove);
      list.appendChild(item);
    }
    renderSigils();
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    error.textContent = "";
    try {
      const profile = store.create(nameInput.value, sigil);
      nameInput.value = "";
      opts.onSignIn(store.signIn(profile.id));
    } catch (err) {
      error.textContent = (err as Error).message;
      nameInput.focus();
    }
  });

  render();

  // Effects last: the page is usable before either attaches.
  const glow = applyBorderGlow(element.querySelector(".auth-card")!, { hostClass: "auth-card-host" });
  const backdrop = createBackdrop(element.querySelector(".auth-backdrop")!, { reducedMotion: opts.reducedMotion, webgl: opts.webgl, pointerSource: element });

  return {
    element,
    backdrop,
    glow,
    render,
    dispose: () => {
      backdrop.dispose();
      glow.dispose();
      element.remove();
    },
  };
}
