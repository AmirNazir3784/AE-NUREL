export type HistoryBlocker = (resume: () => void) => void;
export type HistoryGuard = { block: (handler: HistoryBlocker) => () => void; cancel: () => void };
declare global { interface Window { aenuralHistory?: HistoryGuard } }

// Installed before Next hydrates. Only an entry position is stored, never captions
// or a second dirty flag. Native push/replace retain every Next-owned state field.
export function initializeHistory(host: Window = window): HistoryGuard {
  if (host.aenuralHistory) return host.aenuralHistory;
  const key = "__aenuralPosition", history = host.history;
  const push = history.pushState.bind(history), replace = history.replaceState.bind(history);
  let position = Number.isSafeInteger(history.state?.[key]) ? history.state[key] as number : 0;
  let currentUrl = host.location.href, blocker: HistoryBlocker | null = null;
  let restoring = false, pending: { delta: number; notified: boolean } | null = null, approved: number | null = null;
  function stamp(state: unknown, index: number) {
    return Object.assign({}, state && typeof state === "object" ? state : {}, { [key]: index });
  }
  replace(stamp(history.state, position), "", currentUrl);
  history.pushState = (state, unused, url) => {
    push(stamp(state, position + 1), unused, url);
    position++; currentUrl = host.location.href;
  };
  history.replaceState = (state, unused, url) => {
    replace(stamp(state, position), unused, url);
    currentUrl = host.location.href;
  };
  function samePage(a: string, b: string) {
    const first = new URL(a), second = new URL(b);
    return first.origin === second.origin && first.pathname === second.pathname && first.search === second.search;
  }
  host.addEventListener("popstate", (event) => {
    const target = event.state?.[key];
    // A native fragment navigation can create an unmarked entry. It does not
    // discard this workspace; stamp it without adding an entry.
    if (!Number.isSafeInteger(target)) {
      if (samePage(currentUrl, host.location.href)) {
        position++; replace(stamp(event.state, position), "", host.location.href);
        currentUrl = host.location.href;
      }
      return; // Cross-document exits are protected by beforeunload.
    }
    const delta = target - position;
    if (restoring) {
      event.stopImmediatePropagation();
      if (delta) { history.go(-delta); return; }
      restoring = false;
      const attempt = pending;
      if (attempt && blocker && !attempt.notified) { attempt.notified = true; blocker(() => {
        if (pending !== attempt) return;
        pending = null; approved = position + attempt.delta;
        history.go(attempt.delta);
      }); }
      return;
    }
    if (approved === target) {
      approved = null; pending = null; position = target; currentUrl = host.location.href;
      return; // Next receives the real approved popstate, with its original state.
    }
    if (delta && blocker && !samePage(currentUrl, host.location.href)) {
      event.stopImmediatePropagation();
      // Roll back the traversal before displaying a dialog. No sentinel pushes,
      // no synthetic popstate, and Next never unmounts the dirty editor.
      pending ??= { delta, notified: false };
      restoring = true; history.go(-delta);
      return;
    }
    position = target; currentUrl = host.location.href;
  }, true);
  const api: HistoryGuard = {
    block(handler) {
      blocker = handler;
      return () => { if (blocker === handler) { blocker = null; pending = null; } };
    },
    cancel() { pending = null; },
  };
  host.aenuralHistory = api;
  return api;
}
export const historyInitializationScript = "(" + initializeHistory.toString() + ")();";
