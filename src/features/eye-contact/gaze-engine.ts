import { DEFAULT_GAZE, EYES, alignedAngle, anchorTensor, vectorCorrection, eyeGeometry, smoothAngle, validateGaze, warpEyeDetail, type AngleHistory, type GazeSettings } from "./gaze-core";
import { createGazeEstimator } from "./gaze-estimator";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { InferenceSession } from "onnxruntime-web";

const RUNTIME = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.0-dev.20260914-8d85527a0/dist/";
export type GazeFrame = { faces: number; eyes: number; reason: string };
export async function createGazeEngine(signal: AbortSignal) {
  const [vision, ort] = await Promise.all([import("@mediapipe/tasks-vision"), import("onnxruntime-web/wasm")]);
  signal.throwIfAborted();
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.wasmPaths = { mjs: RUNTIME + "ort-wasm-simd-threaded.mjs", wasm: RUNTIME + "ort-wasm-simd-threaded.wasm" };
  let detector: FaceLandmarker | undefined;
  let estimator: Awaited<ReturnType<typeof createGazeEstimator>> | undefined;
  const sessions: Partial<Record<"L" | "R", InferenceSession>> = {};
  const dispose = async () => { detector?.close(); detector = undefined; for (const eye of EYES) { await sessions[eye.name]?.release(); delete sessions[eye.name]; } await estimator?.dispose(); estimator = undefined; };
  try {
    const files = await vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm");
    signal.throwIfAborted();
    detector = await vision.FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: "/models/eye-contact/face_landmarker.task", delegate: "CPU" }, runningMode: "IMAGE", numFaces: 2, minFaceDetectionConfidence: .7, minFacePresenceConfidence: .7, minTrackingConfidence: .7 });
    for (const eye of EYES) {
      signal.throwIfAborted();
      const response = await fetch(`/models/eye-contact/${eye.name}.onnx`, { signal });
      if (!response.ok) throw new Error("The correction model could not load. Please retry.");
      sessions[eye.name] = await ort.InferenceSession.create(await response.arrayBuffer(), { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
    }
    estimator = await createGazeEstimator(ort, signal);
    signal.throwIfAborted();
    const analysis = document.createElement("canvas"), patch = document.createElement("canvas"), detail = document.createElement("canvas");
    patch.width = 64; patch.height = 48;
    const pc = patch.getContext("2d", { willReadFrequently: true }), ac = analysis.getContext("2d"), dc = detail.getContext("2d", { willReadFrequently: true });
    if (!pc || !ac || !dc) throw new Error("Video rendering is unavailable.");
    const history: Partial<Record<"L" | "R", AngleHistory>> = {};
    let disposed = false;
    return {
      async render(context: CanvasRenderingContext2D, settings: GazeSettings = DEFAULT_GAZE, time = NaN): Promise<GazeFrame> {
        if (disposed || !detector) throw new Error("Correction was stopped. Choose the video again.");
        validateGaze(settings); signal.throwIfAborted();
        if (!settings.strength) return { faces: 0, eyes: 0, reason: "Correction off" };
        const { width, height } = context.canvas, scale = Math.min(1, 960 / Math.max(width, height));
        analysis.width = Math.round(width * scale); analysis.height = Math.round(height * scale);
        ac.drawImage(context.canvas, 0, 0, analysis.width, analysis.height);
        const faces = detector.detect(analysis).faceLandmarks;
        if (faces.length !== 1) { delete history.L; delete history.R; return { faces: faces.length, eyes: 0, reason: faces.length ? "Multiple faces — original frame kept" : "No clear face — original frame kept" }; }
        const points = faces[0]; let corrected = 0;
        if (EYES.some(eye => !eyeGeometry(points, eye.anchors, analysis.width, analysis.height))) { delete history.L; delete history.R; return { faces: 1, eyes: 0, reason: "Eyes not clearly visible or blinking — original frame kept" }; }
        const vector = settings.automatic ? await estimator!.estimate(context.canvas, points) : [0, 0, 1];
        signal.throwIfAborted();
        const rawAngle = vector ? vectorCorrection(vector, settings) : null;
        if (!rawAngle) { delete history.L; delete history.R; return { faces: 1, eyes: 0, reason: "Gaze or head angle is outside the correction range — original frame kept" }; }
        for (const eye of EYES) {
          if (!eyeGeometry(points, eye.anchors, analysis.width, analysis.height)) { delete history[eye.name]; continue; }
          const geometry = eyeGeometry(points, eye.anchors, width, height);
          if (!geometry) continue;
          history[eye.name] = smoothAngle(rawAngle, time, geometry, JSON.stringify(settings), history[eye.name]);
          const angle = alignedAngle(history[eye.name]!.angle, geometry.rotation);
          if (Math.max(...angle.map(Math.abs)) < .3) continue;
          pc.clearRect(0, 0, 64, 48);
          const cos = Math.cos(geometry.rotation), sin = Math.sin(geometry.rotation), sx = 64 / geometry.width, sy = 48 / geometry.height;
          pc.setTransform(sx * cos, -sy * sin, sx * sin, sy * cos, sx * (-cos * geometry.cx - sin * geometry.cy + geometry.width / 2), sy * (sin * geometry.cx - cos * geometry.cy + geometry.height * 7 / 12));
          pc.drawImage(context.canvas, 0, 0); pc.resetTransform();
          const pixels = pc.getImageData(0, 0, 64, 48).data, bgr = new Float32Array(9216);
          for (let i = 0; i < 3072; i++) for (let c = 0; c < 3; c++) bgr[c * 3072 + i] = pixels[i * 4 + 2 - c] / 255;
          const imageInput = new ort.Tensor("float32", bgr, [1, 3, 48, 64]), anchorsInput = new ort.Tensor("float32", anchorTensor(geometry.anchors), [1, 12, 48, 64]);
          const output = await sessions[eye.name]!.run({ image: imageInput, anchors: anchorsInput, angle: new ort.Tensor("float32", Float32Array.from(angle), [1, 2]) });
          try {
            signal.throwIfAborted();
            const flow = output.flow.data;
            if (!(flow instanceof Float32Array)) throw new Error("Unexpected correction output.");
            detail.width = geometry.width; detail.height = geometry.height;
            dc.setTransform(cos, -sin, sin, cos, -cos * geometry.cx - sin * geometry.cy + geometry.width / 2, sin * geometry.cx - cos * geometry.cy + geometry.height * 7 / 12);
            dc.drawImage(context.canvas, 0, 0); dc.resetTransform();
            const original = dc.getImageData(0, 0, geometry.width, geometry.height);
            dc.putImageData(new ImageData(warpEyeDetail(original.data, geometry.width, geometry.height, flow), geometry.width, geometry.height), 0, 0);
            context.save(); context.translate(geometry.cx, geometry.cy); context.rotate(geometry.rotation); context.drawImage(detail, -geometry.width / 2, -geometry.height * 7 / 12); context.restore();
            corrected++;
          } finally { for (const value of Object.values(output)) value.dispose(); imageInput.dispose(); anchorsInput.dispose(); }
        }
        return { faces: 1, eyes: corrected, reason: corrected ? "Correction preview ready" : "Blink, small adjustment or unsupported eye position — original kept" };
      },
      async dispose() { disposed = true; await dispose(); },
    };
  } catch (error) { await dispose(); throw error; }
}
export type GazeEngine = Awaited<ReturnType<typeof createGazeEngine>>;
