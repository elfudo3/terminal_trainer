import { describe, expect, it } from "vitest";
import { PROFILES_KEY, ProfileStore, SIGILS, namespacedStorage } from "../../src/profiles/profiles";

function memory() {
  const data = new Map<string, string>();
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe("ProfileStore", () => {
  it("starts empty and signs nobody in", () => {
    const store = new ProfileStore(memory());
    expect(store.list()).toEqual([]);
    expect(store.current).toBeNull();
  });

  it("creates profiles with a name and sigil, trimming and validating the name", () => {
    let t = 1000;
    const store = new ProfileStore(memory(), () => t++);
    const p = store.create("  Fudo  ", SIGILS[2]!);
    expect(p).toMatchObject({ name: "Fudo", sigil: SIGILS[2] });
    expect(p.id).toMatch(/^p_/);
    expect(() => store.create("   ", SIGILS[0]!)).toThrow(/name/i);
    expect(() => store.create("x".repeat(40), SIGILS[0]!)).toThrow(/24/);
    expect(() => store.create("Fudo", SIGILS[0]!)).toThrow(/already/);
    expect(store.create("Ann", "not-a-sigil").sigil).toBe(SIGILS[0]);
  });

  it("signs in and out, remembering the current profile across reloads", () => {
    const storage = memory();
    const first = new ProfileStore(storage);
    const a = first.create("Ann", SIGILS[0]!);
    first.signIn(a.id);
    expect(first.current?.name).toBe("Ann");
    const second = new ProfileStore(storage);
    expect(second.current?.id).toBe(a.id);
    second.signOut();
    expect(second.current).toBeNull();
    expect(new ProfileStore(storage).current).toBeNull();
    expect(() => second.signIn("nope")).toThrow(/unknown/i);
  });

  it("lists most recently used first and removes profiles", () => {
    let t = 1;
    const store = new ProfileStore(memory(), () => t++);
    const a = store.create("A", SIGILS[0]!);
    const b = store.create("B", SIGILS[1]!);
    store.signIn(a.id);
    expect(store.list().map((p) => p.name)).toEqual(["A", "B"]);
    store.signIn(b.id);
    expect(store.list().map((p) => p.name)).toEqual(["B", "A"]);
    store.remove(b.id);
    expect(store.current).toBeNull();
    expect(store.list().map((p) => p.name)).toEqual(["A"]);
  });

  it("survives missing or corrupt storage", () => {
    expect(() => new ProfileStore(undefined).create("A", SIGILS[0]!)).not.toThrow();
    const storage = memory();
    storage.setItem(PROFILES_KEY, "{nope");
    expect(new ProfileStore(storage).list()).toEqual([]);
  });
});

describe("namespacedStorage", () => {
  it("prefixes keys so two profiles never share progress", () => {
    const storage = memory();
    const a = namespacedStorage(storage, "p_1")!;
    const b = namespacedStorage(storage, "p_2")!;
    a.setItem("progress", "A");
    b.setItem("progress", "B");
    expect(a.getItem("progress")).toBe("A");
    expect(b.getItem("progress")).toBe("B");
    expect(storage.data.has("p_1:progress")).toBe(true);
    expect(namespacedStorage(undefined, "x")).toBeUndefined();
  });
});
