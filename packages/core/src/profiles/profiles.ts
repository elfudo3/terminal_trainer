/**
 * Local user profiles. Each profile gets its own progress and preferences
 * through `namespacedStorage`. Everything lives in the given key-value
 * storage (localStorage in the apps), so it works offline and on-device.
 *
 * To back this with a real account system, implement the same methods over
 * an HTTP API and keep the apps unchanged.
 */
import type { ProgressStorage } from "../trainer/trainer";

export interface Profile {
  id: string;
  name: string;
  /** The avatar artwork, one of SIGILS. */
  sigil: Sigil;
  createdAt: number;
  lastSeenAt: number;
}

/** Avatar artwork ids; the images live in packages/ui/src/assets. */
export const SIGILS = ["star", "moon", "lightning", "blackhole", "flower", "jellyfish", "knight"] as const;
export type Sigil = (typeof SIGILS)[number];

/** Profiles saved before the artwork existed stored a glyph; map each to the nearest icon. */
const LEGACY_SIGILS: Record<string, Sigil> = { "✦": "star", "☾": "moon", "⚡": "lightning", "❄": "blackhole", "✿": "flower", "⚗": "jellyfish", "♞": "knight", "☄": "blackhole" };

/** A valid sigil id for any stored value, defaulting to the first. */
export function normalizeSigil(value: unknown): Sigil {
  if (typeof value !== "string") return SIGILS[0];
  if ((SIGILS as readonly string[]).includes(value)) return value as Sigil;
  return LEGACY_SIGILS[value] ?? SIGILS[0];
}

export const PROFILES_KEY = "terminal-trainer.profiles";
export const MAX_NAME_LENGTH = 24;

interface Saved {
  profiles: Profile[];
  currentId: string | null;
}

export class ProfileStore {
  private profiles: Profile[] = [];
  private currentId: string | null = null;
  private counter = 0;

  constructor(
    private readonly storage?: ProgressStorage,
    private readonly now: () => number = Date.now,
  ) {
    this.load();
  }

  /** Profiles, most recently used first. */
  list(): Profile[] {
    return [...this.profiles].sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  }

  get current(): Profile | null {
    return this.profiles.find((p) => p.id === this.currentId) ?? null;
  }

  create(rawName: string, sigil: string): Profile {
    const name = rawName.trim();
    if (name === "") throw new Error("Please enter a name.");
    if (name.length > MAX_NAME_LENGTH) throw new Error(`Names can be at most ${MAX_NAME_LENGTH} characters.`);
    if (this.profiles.some((p) => p.name.toLowerCase() === name.toLowerCase())) throw new Error("That name is already taken on this device.");
    const time = this.now();
    const profile: Profile = {
      id: `p_${time.toString(36)}${(this.counter++).toString(36)}`,
      name,
      sigil: normalizeSigil(sigil),
      createdAt: time,
      lastSeenAt: time,
    };
    this.profiles.push(profile);
    this.save();
    return profile;
  }

  signIn(id: string): Profile {
    const profile = this.profiles.find((p) => p.id === id);
    if (!profile) throw new Error("Unknown profile.");
    profile.lastSeenAt = this.now();
    this.currentId = id;
    this.save();
    return profile;
  }

  signOut(): void {
    this.currentId = null;
    this.save();
  }

  remove(id: string): void {
    this.profiles = this.profiles.filter((p) => p.id !== id);
    if (this.currentId === id) this.currentId = null;
    this.save();
  }

  private load(): void {
    try {
      const raw = this.storage?.getItem(PROFILES_KEY);
      const saved = raw ? (JSON.parse(raw) as Partial<Saved>) : {};
      this.profiles = Array.isArray(saved.profiles)
        ? saved.profiles.filter((p) => p && typeof p.id === "string" && typeof p.name === "string").map((p) => ({ ...p, sigil: normalizeSigil(p.sigil) }))
        : [];
      this.currentId = typeof saved.currentId === "string" ? saved.currentId : null;
    } catch {
      this.profiles = [];
      this.currentId = null;
    }
  }

  private save(): void {
    try {
      this.storage?.setItem(PROFILES_KEY, JSON.stringify({ profiles: this.profiles, currentId: this.currentId } satisfies Saved));
    } catch {
      // Storage unavailable: profiles live for this session only.
    }
  }
}

/** A view of `storage` where every key is prefixed with `namespace:`. */
export function namespacedStorage(storage: ProgressStorage | undefined, namespace: string): ProgressStorage | undefined {
  if (!storage) return undefined;
  return {
    getItem: (key) => storage.getItem(`${namespace}:${key}`),
    setItem: (key, value) => storage.setItem(`${namespace}:${key}`, value),
  };
}
