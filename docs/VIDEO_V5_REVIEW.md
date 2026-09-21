# V5 review candidate — not published

## Editorial change

V5 retains the same real Android capture and single Alex scenario as V4. It makes the observed outcome more explicit: Alex offers **sources by nine**, not completion of the entire project. The comparison explains what remains unclear in A and what was actually offered in B. Intent Lock is presented as the user's decision about their intended meaning.

The interpretation is editorial text outside the captured app, labeled `DEMO INTERPRETATION`. It is not an in-app analysis feature, coaching score, user study, or prediction of real-world behavior. No new scenario or runtime feature is implied. V4 remains available unchanged for comparison.

## Artifacts

- `assets/video/second-take-v5-review.mp4`
- `assets/video/second-take-v5-review.srt`
- `assets/thumbnail-v5-review.png`
- `assets/video/v5-edit.json`
- `assets/video/v5-render-manifest.json`: source/video hashes and exact source-to-output timeline.

## Reproduction

Use the same offline Kokoro environment and cached model described in `VIDEO_V4_REVIEW.md`. No new TTS service, model download, cloud inference or payment is needed.

```text
python scripts/synthesize_v4.py --manifest assets/video/v5-edit.json --output artifacts/v5-work
python scripts/render_v4.py --manifest assets/video/v5-edit.json --version v5 --work artifacts/v5-work
```

The renderer retains its V4 defaults. It now rejects mismatched version/narration, overflowing title/body/captions, and duration at or above 120 seconds. Test failures for stale V4 audio and mismatched V4 output were exercised before V5 rendering. These deliberate negative-test failures are expected, not failed product gates.

## Verified media checks

- Final container: 101.452 seconds, 1920×1080, 30 fps, H.264/AAC; full FFmpeg decode passed.
- SHA-256: `0161BA74FCEA2BA37045BDF4EAC5C6EDCF600B54B1EEDEEA724997189F350131`.
- Final encoded audio measured -16.54 LUFS integrated and -1.35 dBTP true peak, without clipping.
- All 13 segments rendered with text/caption bounds checks. The sampled contact sheet and enlarged changed editorial panels were visually inspected.
- V4 SHA-256 remains `6E5544F64F6783D44D4C83132C9A12CC8CDE7C6F9A152BA97E3C95F68EFF5737`: prior candidate unchanged.
- Narration timing is archived in `assets/video/v5-voice-timing.json`; source frame ranges and timeline in the render manifest.
- Offline ASR matched 98.20% of normalized word tokens. Differences were only apostrophe tokenization, `Intent Lock` versus `IntentLock`, and `nine` versus `9`; no substantive omission was detected. Full evidence: `evidence/v5-audio-audit.json`. This is not a human listening verdict.

## Review limits

Full human listening, independent audience comprehension and preference remain unverified. Publication and Devpost replacement require approval of the actual candidate. Runtime tests from prior work remain historical except for backend `npm run verify`, rerun successfully during this editorial change (24 tests and security check). Android runtime code and provider configuration are unchanged; Android and cloud suites are not claimed as newly executed here.
