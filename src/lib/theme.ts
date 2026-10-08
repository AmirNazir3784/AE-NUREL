export type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "toolsuite-theme";
const THEME_TOGGLE_EVENT = "toolsuite:toggle-theme";

// This self-contained function also runs in <head>, before any page content paints.
// Keep its dependencies inside the function so its serialized source is safe to execute.
export function initializeTheme(storageKey: string, toggleEvent: string) {
  const root = document.documentElement;
  // Head scripts can be replayed during development/navigation. Register handlers once.
  if (root.dataset.themeReady === "true") return;
  root.dataset.themeReady = "true";
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  const parse = (value: string | null): Theme | null => value === "light" || value === "dark" ? value : null;
  let preference: Theme | null = null;
  try {
    preference = parse(window.localStorage.getItem(storageKey));
  } catch {
    // Storage can be unavailable in private or restricted browsing. System mode still works.
  }
  const apply = () => {
    root.dataset.theme = preference ?? (media?.matches ? "dark" : "light");
  };
  apply();
  media?.addEventListener("change", () => {
    if (preference === null) apply();
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    preference = parse(event.newValue);
    apply();
  });
  document.addEventListener(toggleEvent, () => {
    preference = root.dataset.theme === "dark" ? "light" : "dark";
    apply();
    try {
      window.localStorage.setItem(storageKey, preference);
    } catch {
      // A manual choice remains active for this page even if it cannot be saved.
    }
  });
}

export const themeInitializationScript = `(${initializeTheme.toString()})(${JSON.stringify(THEME_STORAGE_KEY)},${JSON.stringify(THEME_TOGGLE_EVENT)});`;

export function toggleTheme() {
  document.dispatchEvent(new Event(THEME_TOGGLE_EVENT));
}
