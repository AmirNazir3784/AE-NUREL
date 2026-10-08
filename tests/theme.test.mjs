import { describe, it } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { THEME_STORAGE_KEY, themeInitializationScript } from "../src/lib/theme.ts";

function page({ stored = null, systemDark = false, blocked = false } = {}) {
  const root = { dataset: {} };
  const writes = [];
  const windowEvents = new Map();
  const documentEvents = new Map();
  const mediaEvents = new Map();
  const listen = (events, name, callback) => events.set(name, [...(events.get(name) ?? []), callback]);
  const emit = (events, name, event) => events.get(name)?.forEach((callback) => callback(event));
  const media = { matches: systemDark, addEventListener: (name, callback) => listen(mediaEvents, name, callback) };
  const window = {
    matchMedia: () => media,
    localStorage: {
      getItem: (key) => { assert.equal(key, THEME_STORAGE_KEY); if (blocked) throw new Error("Storage unavailable"); return stored; },
      setItem: (key, value) => { if (blocked) throw new Error("Storage unavailable"); writes.push([key, value]); },
    },
    addEventListener: (name, callback) => listen(windowEvents, name, callback),
  };
  const document = { documentElement: root, addEventListener: (name, callback) => listen(documentEvents, name, callback) };
  // Exercise the exact script emitted into HTML, without a browser or an added DOM dependency.
  vm.runInNewContext(themeInitializationScript, { window, document });
  return {
    theme: () => root.dataset.theme,
    writes,
    toggle: () => emit(documentEvents, "toolsuite:toggle-theme"),
    system: (dark) => { media.matches = dark; emit(mediaEvents, "change"); },
    storage: (key, newValue) => emit(windowEvents, "storage", { key, newValue }),
    initializeAgain: () => vm.runInNewContext(themeInitializationScript, { window, document }),
  };
}

describe("shared theme initialization and preference", () => {
  it("sets the system theme synchronously without persisting a first-visit choice", () => {
    for (const systemDark of [false, true]) {
      const current = page({ systemDark });
      assert.equal(current.theme(), systemDark ? "dark" : "light");
      assert.deepEqual(current.writes, []);
    }
  });
  it("honors stored light and dark preferences over the system, including on a fresh page", () => {
    for (const stored of ["light", "dark"]) {
      const current = page({ stored, systemDark: stored === "light" });
      assert.equal(current.theme(), stored);
      current.system(stored === "dark");
      assert.equal(current.theme(), stored);
      assert.equal(page({ stored }).theme(), stored);
    }
  });
  it("ignores invalid storage values and follows subsequent system changes", () => {
    for (const stored of [null, "system", "DARK", "", "<script>"]) {
      const current = page({ stored });
      assert.equal(current.theme(), "light");
      current.system(true);
      assert.equal(current.theme(), "dark");
      current.system(false);
      assert.equal(current.theme(), "light");
    }
  });
  it("toggles immediately, saves only the UI preference, and stops following the system", () => {
    const current = page();
    current.toggle();
    assert.equal(current.theme(), "dark");
    current.system(false);
    assert.equal(current.theme(), "dark");
    assert.deepEqual(current.writes, [[THEME_STORAGE_KEY, "dark"]]);
    current.toggle();
    assert.equal(current.theme(), "light");
    assert.deepEqual(current.writes[1], [THEME_STORAGE_KEY, "light"]);
  });
  it("still applies and retains a manual choice when storage reads and writes fail", () => {
    const current = page({ blocked: true, systemDark: true });
    assert.equal(current.theme(), "dark");
    current.toggle();
    assert.equal(current.theme(), "light");
    current.system(true);
    assert.equal(current.theme(), "light");
    assert.deepEqual(current.writes, []);
  });
  it("syncs preference changes from another tab and resumes system mode after removal", () => {
    const current = page({ stored: "light", systemDark: true });
    current.storage("unrelated", "dark");
    assert.equal(current.theme(), "light");
    current.storage(THEME_STORAGE_KEY, "dark");
    assert.equal(current.theme(), "dark");
    current.storage(THEME_STORAGE_KEY, null);
    assert.equal(current.theme(), "dark");
    current.system(false);
    assert.equal(current.theme(), "light");
    current.storage(THEME_STORAGE_KEY, "dark");
    current.storage(null, null);
    assert.equal(current.theme(), "light");
  });
  it("registers handlers once even when initialization is replayed", () => {
    const current = page();
    current.initializeAgain();
    current.toggle();
    assert.equal(current.theme(), "dark");
    assert.deepEqual(current.writes, [[THEME_STORAGE_KEY, "dark"]]);
    current.initializeAgain();
    current.toggle();
    assert.equal(current.theme(), "light");
    assert.equal(current.writes.length, 2);
  });
});
