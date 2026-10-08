"use client";

import { Icon } from "@/components/ui/icon";
import { toggleTheme } from "@/lib/theme";

export function ThemeToggle() {
  // Both actions have identical server/client markup. CSS selects the visible action
  // from the root theme, including before React hydrates.
  return <button type="button" className="theme-toggle" onClick={toggleTheme}>
    <span className="theme-action-light"><Icon name="moon" size={20} /><span className="sr-only">Switch to dark mode</span></span>
    <span className="theme-action-dark"><Icon name="sun" size={20} /><span className="sr-only">Switch to light mode</span></span>
  </button>;
}
