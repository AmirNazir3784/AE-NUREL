type GpuNavigator = { gpu?: { requestAdapter(options?: { powerPreference: string }): Promise<{ isFallbackAdapter?: boolean; info?: { isFallbackAdapter?: boolean }; limits?: { maxStorageBufferBindingSize: number } } | null> } };

// An adapter is only a candidate: model initialization/run must also succeed.
// Software adapters do not establish useful hardware acceleration.
export async function hardwareGpu(source: object): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const adapter = await Promise.race([(source as GpuNavigator).gpu?.requestAdapter({ powerPreference: "high-performance" }), new Promise<null>(resolve => { timeout = setTimeout(() => resolve(null), 2000); })]);
    return !!adapter && !adapter.isFallbackAdapter && !adapter.info?.isFallbackAdapter && (adapter.limits?.maxStorageBufferBindingSize ?? 0) >= 128 * 1024 ** 2;
  } catch { return false; } finally { clearTimeout(timeout); }
}

export function lyricCapacity(memoryGiB: number | undefined, accelerated: boolean) {
  if (memoryGiB !== undefined && memoryGiB <= 2) return { seconds: 0, reason: "Automatic recognition needs more available memory. Import SRT/VTT or time your written lyrics instead." };
  // Shortening clips bounds processing time; it does not reduce model memory.
  const seconds = accelerated && (memoryGiB === undefined || memoryGiB >= 8) ? 300 : 30;
  return { seconds, reason: "" };
}
export const eyeClipLimit = (accelerated: boolean) => accelerated ? 120 : 30;
