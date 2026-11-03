# Eye-contact model assets (unreleased prototype)

Prepared 30 October 2026. No paid API or processing service is used.

## Learned gaze and head pose

Intel Open Model Zoo models, Apache-2.0 (full terms in `LICENSE-INTEL.txt`):

- `gaze-estimation.onnx` is the FP32 `gaze-estimation-adas-0002` model converted
  and distributed by MindSight:
  https://github.com/kylen-d/mindsight/releases/download/weights/gaze-estimation-adas-0002.onnx
  SHA-256: `cd153584e7f8f72e0dc7f5388978d6b06e34ba2c46b1a6ae825975dbb1282491`.
  This matches the distributor's public `weights_manifest.json`.
- `head-pose.onnx` is converted by `scripts/eye-contact/convert-head-pose.mjs`
  from Intel's FP32 `head-pose-estimation-adas-0001` IR:
  https://storage.openvinotoolkit.org/repositories/open_model_zoo/2023.0/models_bin/1/head-pose-estimation-adas-0001/FP32/
  SHA-256: `efdc2445a372a046e386d22a5b86f3b324a9580f7bf2002d58914238ac0ebae2`.
  Original XML: `5e6764af6246d6ed48f35f5eda2088e470bf204d820b6ad63fcf7ba961976678`.
  Original BIN: `dda80461641b0bc1f2b8aea81f045179d0e89e8348850e49eb9cc8273dea0152`.

Original model authors: Intel Corporation. Source model configurations explicitly
reference the Open Model Zoo Apache license:
https://github.com/openvinotoolkit/open_model_zoo/tree/master/models/intel

Both networks take BGR pixels in [0,255]; head pose is yaw/pitch/roll in degrees.
The gaze network receives subject-left and subject-right 60×60 eye crops. We use
the OMZ demo's supported mode without eye-image roll alignment, supplying the
actual roll. The correction stage independently aligns its eye patches to the
training orientation and transforms requested rotations into that eye plane.

For the released gaze weights, camera-looking vectors have negative z, as
reflected in Intel's `gazeVectorToGazeAngles` source. We canonicalize the depth
sign before computing a shared correction for both eyes. Do not restore the
earlier independent iris-position heuristic or infer this sign from the prose
model card alone.

- https://docs.openvino.ai/2023.3/omz_models_model_gaze_estimation_adas_0002.html
- https://docs.openvino.ai/2023.3/omz_models_model_head_pose_estimation_adas_0001.html
- https://github.com/openvinotoolkit/open_model_zoo/blob/master/demos/gaze_estimation_demo/cpp/src/gaze_estimator.cpp
- https://github.com/openvinotoolkit/open_model_zoo/blob/master/demos/gaze_estimation_demo/cpp/src/utils.cpp

The distributor reports its own native OpenVINO/ONNX numerical comparison. That
is not an AENural benchmark. AENural checked model signatures, finite outputs and
actual inference on test footage; these do not establish universal gaze accuracy.

## FLX gaze redirection

Upstream: https://github.com/chihfanhsu/gaze_correction

Observed upstream revision: `7cc76e4ccaf76c950730c593ffa22bed30c807a4`.
Original checkpoints: `gaze_correction_system/weights/warping_model/flx/12/{L,R}/`.
Copyright 2019 Chih-Fan Hsu. BSD-3-Clause terms are preserved in `LICENSE-FLX.txt`.
The inference architecture and pretrained weights were adapted to ONNX by
`scripts/eye-contact/convert-checkpoints.mjs`. No upstream Python is executed.
Each graph outputs a neural displacement field and lighting weights. The
application performs the final sampling/composition; it does not draw fake eyes.

Converted files, SHA-256:

- `L.onnx`: `acb2bd316cf45f2c9e00201016cc426d6f9e39c563e60ab22c9a6119b75b1d45`
- `R.onnx`: `ecca0fea107bfe3183b6000e4e0b4d86344c40fc78b1456714c256d15d553b39`

Checkpoint SHA-256:

- `L.index`: `02205855352657b1e4b036fa1abb79c16891fa036c7fe0b5504bb685c0cddb85`
- `L.data-00000-of-00001`: `f3fc192fef20f56ff9ff39966c6b7fa650a7122df2e406daaa84fc7b8e426e2b`
- `R.index`: `540e80dca8c58eba3adb7393a65c233242df2054f5ad86ee3919c1e8324fdf30`
- `R.data-00000-of-00001`: `b978676480ecdb8c8134b8c033aa6ee959a40401b3d5492aa99003f9e37843c3`

Reproduce from these checkpoint files:

```sh
node scripts/eye-contact/convert-checkpoints.mjs artifacts/eye-contact public/models/eye-contact
```

The converter reads TensorFlow tensor-bundle indices, omits optimizer tensors,
changes convolution weights from HWIO to OIHW, and preserves the dense,
ReLU-then-batch-normalization, coarse/fine and lighting network structure.
It uses the already-installed ONNX Runtime protobuf schema. The conversion is
reproducible but has **not** been numerically compared with TensorFlow execution.

Important limits: the upstream training notes specify frontal head poses and
48 × 64 eye patches. This is an older model, not NVIDIA Maxine and not an
established replacement for it. Original 4K frame dimensions do not imply 4K
generated eye detail. Do not advertise equivalent or superior quality without
evidence.

## Face Landmarker

Google MediaPipe, Apache-2.0; license preserved in `LICENSE-MEDIAPIPE.txt`.
Unmodified model bundle, version 1, float16:
https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task

`face_landmarker.task` SHA-256:
`64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.

Official documentation and model cards:

- https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker
- https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf
- https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf
- https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20(Short%20Range).pdf

Runtime package: `@mediapipe/tasks-vision@1.2.0`. Runtime WASM/JavaScript assets
are fetched from jsDelivr at pinned package versions. Recordings are not sent
to jsDelivr. No identity recognition or persistent face templates are used.

The public route is gated to development and marked noindex. These assets and
their presence in the working tree do not mean the tool is approved for release.
