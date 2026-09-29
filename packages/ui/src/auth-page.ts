/**
 * The sign-in page: pick an existing profile or create one with a name and
 * a sigil. Profiles are local to the device (see core/profiles), so there
 * is no password; the page is about identity and progress, not security.
 */
import { SIGILS, type Profile, type ProfileStore } from "@terminal-trainer/core";
import { morsAvatar } from "./mors-avatar";

export interface AuthPage {
  element: HTMLElement;
  render(): void;
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

export function createAuthPage(root: HTMLElement, store: ProfileStore, opts: { onSignIn: (profile: Profile) => void }): AuthPage {
  const element = document.createElement("section");
  element.className = "auth-page arcane-bg";
  element.innerHTML = `
    <div class="auth-hero">
      <div class="auth-avatar"></div>
      <h1 class="auth-title">Terminal Trainer</h1>
      <p class="auth-tagline">Master the command line, with a little help from a wizard who is technically dead.</p>
    </div>
    <div class="auth-card card">
      <div class="auth-existing">
        <h2 class="auth-heading">Who's practising?</h2>
        <ul class="profile-list"></ul>
        <p class="auth-or"><span>or start fresh</span></p>
      </div>
      <form class="profile-form" autocomplete="off">
        <h2 class="auth-heading auth-heading-new">Create your profile</h2>
        <label class="field">
          <span class="field-label">Name</span>
          <input class="field-input" name="name" type="text" maxlength="24" placeholder="What should Mors call you?" autocapitalize="words" spellcheck="false" required />
        </label>
        <fieldset class="sigil-picker">
          <legend class="field-label">Pick a sigil</legend>
          <div class="sigil-options" role="radiogroup" aria-label="Sigil"></div>
        </fieldset>
        <p class="form-error" role="alert"></p>
        <button type="submit" class="btn btn-primary btn-block">Start practising</button>
      </form>
    </div>`;
  element.querySelector(".auth-avatar")!.appendChild(morsAvatar(112));
  root.appendChild(element);

  const list = element.querySelector<HTMLUListElement>(".profile-list")!;
  const existing = element.querySelector<HTMLElement>(".auth-existing")!;
  const form = element.querySelector<HTMLFormElement>(".profile-form")!;
  const nameInput = element.querySelector<HTMLInputElement>('input[name="name"]')!;
  const error = element.querySelector<HTMLElement>(".form-error")!;
  const sigilBox = element.querySelector<HTMLElement>(".sigil-options")!;
  let sigil: string = SIGILS[0];

  const renderSigils = () => {
    sigilBox.replaceChildren();
    for (const glyph of SIGILS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sigil-option";
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(glyph === sigil));
      button.setAttribute("aria-label", `Sigil ${glyph}`);
      button.dataset.sigil = glyph;
      button.textContent = glyph;
      button.addEventListener("click", () => {
        sigil = glyph;
        renderSigils();
      });
      sigilBox.appendChild(button);
    }
  };

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
      button.innerHTML = `<span class="avatar" aria-hidden="true"></span><span class="profile-text"><span class="profile-name"></span><span class="profile-meta"></span></span>`;
      button.querySelector(".avatar")!.textContent = profile.sigil;
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
  return { element, render };
}
