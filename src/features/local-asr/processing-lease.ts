// Avoid starting another heavy job in an AENural tab while one already owns
// the device. Web Locks are released automatically on tab close/crash.
export async function withProcessingLease<T>(signal: AbortSignal, operation: () => Promise<T>, locks: LockManager | undefined = typeof navigator === "undefined" ? undefined : navigator.locks): Promise<T> {
  signal.throwIfAborted();
  if (!locks) return operation();
  // Non-blocking acquisition cannot be combined with AbortSignal in Web Locks.
  // Check cancellation inside the immediately invoked callback instead.
  return locks.request("aenural-media-recognition", { ifAvailable: true }, async lock => {
    signal.throwIfAborted();
    if (!lock) throw new Error("Another AENural task is running. Finish or cancel it, then try again.");
    return operation();
  });
}
