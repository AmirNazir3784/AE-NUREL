export type NavigationAttempt = { href: string; currentHref: string; target?: string | null; download?: boolean; button?: number; modified?: boolean; prevented?: boolean };
// Pure policy shared by the DOM guard and regression tests. No caption content is stored.
export function guardedDestination(attempt: NavigationAttempt): string | null {
  if (attempt.prevented || attempt.modified || (attempt.button ?? 0) !== 0 || attempt.download || (attempt.target && attempt.target !== "_self")) return null;
  try {
    const current = new URL(attempt.currentHref), next = new URL(attempt.href, current);
    if (!['http:', 'https:'].includes(next.protocol)) return null;
    if (next.origin === current.origin && next.pathname === current.pathname && next.search === current.search) return null;
    return next.href;
  } catch { return null; }
}
