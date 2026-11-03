import { EYES, type Point } from "./gaze-core";
type Runtime = typeof import("onnxruntime-web/wasm");
type Session = import("onnxruntime-web").InferenceSession;

// Intel Open Model Zoo inputs are BGR pixels in [0,255], not normalized RGB.
// Use the documented unaligned-eye mode: pass the actual roll angle and keep
// both eye crops unrotated. The output vector is already in camera coordinates.
export async function createGazeEstimator(ort: Runtime, signal: AbortSignal) {
  let head: Session | undefined, gaze: Session | undefined;
  const dispose = async () => { await head?.release(); await gaze?.release(); head = gaze = undefined; };
  const load = async (name: string) => {
    const response = await fetch(`/models/eye-contact/${name}.onnx`, { signal });
    if (!response.ok) throw new Error("The gaze model could not load. Please retry.");
    return ort.InferenceSession.create(await response.arrayBuffer(), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
  };
  try {
    head = await load("head-pose"); signal.throwIfAborted();
    gaze = await load("gaze-estimation"); signal.throwIfAborted();
    const crop = document.createElement("canvas"); crop.width = crop.height = 60;
    const context = crop.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Eye analysis is unavailable.");
    function tensor(source: HTMLCanvasElement, x: number, y: number, width: number, height: number) {
      context!.clearRect(0, 0, 60, 60); context!.drawImage(source, x, y, width, height, 0, 0, 60, 60);
      const rgba = context!.getImageData(0, 0, 60, 60).data, bgr = new Float32Array(10800);
      for (let i = 0; i < 3600; i++) for (let c = 0; c < 3; c++) bgr[c * 3600 + i] = rgba[i * 4 + 2 - c];
      return new ort.Tensor("float32", bgr, [1, 3, 60, 60]);
    }
    return {
      async estimate(source: HTMLCanvasElement, points: readonly Point[]) {
        if (!head || !gaze) throw new Error("Eye analysis was stopped.");
        signal.throwIfAborted();
        const { width, height } = source;
        const xs = points.map(p => p.x * width), ys = points.map(p => p.y * height);
        const left = Math.min(...xs), top = Math.min(...ys), right = Math.max(...xs), bottom = Math.max(...ys);
        const margin = (right - left) * .03;
        const x = Math.max(0, left - margin), y = Math.max(0, top - margin), w = Math.min(width - x, right - left + margin * 2), h = Math.min(height - y, bottom - top + margin * 2);
        if (![x, y, w, h].every(Number.isFinite) || w < 40 || h < 40) return null;
        const face = tensor(source, x, y, w, h);
        const pose = await head.run({ data: face }); face.dispose();
        let yaw: number, pitch: number, roll: number;
        try { yaw = Number(pose.fc_y.data[0]); pitch = Number(pose.fc_p.data[0]); roll = Number(pose.fc_r.data[0]); }
        finally { for (const output of Object.values(pose)) output.dispose(); }
        signal.throwIfAborted();
        if (![yaw, pitch, roll].every(Number.isFinite) || Math.abs(yaw) > 30 || Math.abs(pitch) > 30 || Math.abs(roll) > 18) return null;
        const eyes: Partial<Record<"L" | "R", ReturnType<typeof tensor>>> = {};
        try {
          for (const eye of EYES) {
            const a = points[eye.anchors[0]], b = points[eye.anchors[3]], size = Math.hypot((a.x - b.x) * width, (a.y - b.y) * height) * 1.8;
            const ex = (a.x + b.x) * width / 2 - size / 2, ey = (a.y + b.y) * height / 2 - size / 2;
            if (ex < 0 || ey < 0 || ex + size > width || ey + size > height) return null;
            eyes[eye.name] = tensor(source, ex, ey, size, size);
          }
          const angles = new ort.Tensor("float32", Float32Array.of(yaw, pitch, roll), [1, 3]);
          const output = await gaze.run({ left_eye_image: eyes.L!, right_eye_image: eyes.R!, head_pose_angles: angles }); angles.dispose();
          try {
            signal.throwIfAborted();
            const vector = Array.from(output[gaze.outputNames[0]].data, Number);
            // OMZ's own gazeVectorToGazeAngles uses pi/2 + atan2(z,x):
            // camera-looking gaze has negative z. Canonicalize depth once.
            return vector.length === 3 && vector.every(Number.isFinite) && vector[2] < 0 ? [vector[0], vector[1], -vector[2]] : null;
          } finally { for (const value of Object.values(output)) value.dispose(); }
        } finally { eyes.L?.dispose(); eyes.R?.dispose(); }
      },
      dispose,
    };
  } catch (failure) { await dispose(); throw failure; }
}
