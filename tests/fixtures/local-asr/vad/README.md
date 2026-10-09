# Captured speech detector regression fixtures

Actual Silero VAD 6.2.3 native ONNX CPU frame probabilities from the pinned model,
not invented confidence, browser evidence or human speech benchmarks.

Revision: `5cd7945676eb32225748052e2e6a0580e4686a08`.
SHA-256: `1a153a22f4509e292a94e67d6f9b85e8deb25b4988682b7e174c65279d8788e3`.

The source is the owned synthetic narration in
`artifacts/captionx-research-fixtures/original-speech.wav`, resampled to 16 kHz.
The executable provenance is `artifacts/local-asr-qa/batch2/verify-vad.mjs`.
The seven cases are digital zeros, two instrumental sine tones, seeded uniform
non-speech noise, clear narration, narration scaled by 0.02 (approximately -34 dB),
narration with five seconds inserted at the existing 7.4-second sentence pause,
and narration with seeded background noise of amplitude 0.025.

Unit tests replay captured probabilities through the actual speech-region policy.
Separate native integration results execute the model and shared ASR gate.
These files do not prove current browser model compatibility or classification
of arbitrary music, singing, environments, short utterances or human voices.
