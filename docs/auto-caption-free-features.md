# Auto Caption Generator: reversible free access

Owner authorization: 12 November 2026. All Auto Caption Generator feature capabilities are free to visitors. This is a tool-level policy, not a paid account or Source Window license grant.

The switch is `AUTO_CAPTION_FREE_FEATURES` in `src/lib/auto-caption-features.ts`. The Auto Caption Generator page opts in through `freeFeatures`; shared studio consumers such as Burn Subtitles retain their previous policy.

Free access includes every preset and font, advanced style and animation controls, word highlighting when word timing is available, Fast/Accurate transcription, watermark-free MP4/WebM exports, SRT/VTT downloads, and no account-based daily generation quota. Existing technical and resource checks remain: 120 seconds, 200 MiB, up to 4096×2160 pixels, codec compatibility, available memory and caption limits. Optional private transcription retains its token and explicit upload consent.

Account project saving is optional and still authenticated. Free auto-caption projects carry a validated tool identifier so saving does not strip advanced styles or reject supported 4K source metadata. That identifier does not set an account owner, subscription or purchase; existing ownership, origin checks, validation and rate limiting remain enforced.

## Restore the previous feature policy

Set `AUTO_CAPTION_FREE_FEATURES = false`. This restores the previous entry limits, membership-dependent generation and exports, style locks, watermark and tool-page pricing content. It does not undo homepage work or modify account/payment records. Projects already saved with advanced styles are retained; the restored access policy determines which styles can be used afterward.

## Exact pre-change checkpoint

Private directory: `.aenural-local/caption-free-features-2026-11-12/`.

- `before.json`: existing/new file inventory, timestamp, HEAD and original hashes.
- `before/`: byte-for-byte copies of each affected existing file, including prior uncommitted Caption Studio work.
- `after.json` and `unlock.patch`: final hashes and the exact incremental changes, recorded after checks.

For a later full code rollback, compare current files with the recorded final hashes first. If subsequent work exists, reverse only the unlock hunks; do not overwrite whole files or use `git reset`/`git checkout` on the development worktree. Files absent in `before.json` may be removed only after checking they have no new unrelated changes. Never restore a membership database or credentials as part of this rollback.

The owner authorized synchronizing the checked change to both repositories on 12 November 2026. It preserves the existing Auto Caption Generator preview/release guard. A repository push is not proof of a completed hosting deployment; verify the live response separately.
