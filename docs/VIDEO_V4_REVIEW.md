# V4 review candidate — not published

Archived alternative. The owner approved V5 instead; the current published video is https://www.youtube.com/watch?v=lKjPDNHgfNc. See `VIDEO_V5_REVIEW.md` and `PUBLICATION_RECEIPT_2026-09-21.md`. The text below records the earlier V4 review, not outstanding submission work.

## Editorial decision

V4 is the preferred candidate for final human review, not a replacement already published to YouTube or Devpost. It uses recorded Android footage, local narration and editorial text. No fresh capture, new scenario or added app feature is implied.

The prior public video remains at https://www.youtube.com/watch?v=KMOa5bSV1Eo. The archival final master is `assets/video/second-take-shipaton-final-master.mp4` (see `SUBMISSION_METADATA.md`); its identity as the exact uploaded binary has not been independently established.

## Candidate package

- `assets/video/second-take-v4-review.mp4`: 1920×1080, H.264, 30 fps, AAC; approximately 100 seconds.
- `assets/video/second-take-v4-review.srt`: English caption track.
- `assets/thumbnail-v4-review.png`: 1280×720 thumbnail, not yet applied to YouTube.
- `assets/video/v4-edit.json`: narration, editorial copy and source time ranges.
- `assets/video/v4-render-manifest.json`: output/source hashes and frame-timed edit map.
- `assets/video/second-take-v3-clean-source.mp4`: clean local V3 edit source, SHA-256 `2D1C5F66DBF6675DFFCF3073B39E176D93603B01EF486CC9DC620E05A7692693`.

## Why this version is stronger

| Review criterion | Previous edit | V4 candidate |
|---|---|---|
| Clear and useful idea | General difficult-conversation introduction | Concrete unfinished-slides problem in the first seven seconds |
| Working core | Rewind begins around 44 seconds | Rewind section starts at 21 seconds; same-checkpoint section at 29 seconds |
| Thoughtful monetization | Technical purchase narration | Free attempts → reason to compare → Test Store purchase → unlocked comparison |
| Care and technical choices | Roughly 16 seconds of dense architecture | Nine seconds of readable explanation; explicitly authored replies and bounded actions |
| Honest outcome | “Trajectory” and “more collaborative” narration | Exact observed contrast: clarification versus a specific commitment |
| Legibility | Portrait app and small burned-in captions | 16:9 composition with enlarged editorial quotes and English captions |

These are editorial judgments supported by the edit, not independent audience scores. No claim is made that the monthly price is validated or that this simulation predicts real people.

## Continuity and disclosure

The video always identifies edited Android capture with waits shortened / frames held. The early comparison is labeled **PREVIEW**. The Intent Lock close-up is labeled **DETAIL INSERT**, because it is an explanatory insert rather than proof of an uninterrupted capture. The chronological thread otherwise remains attempt A → rewind → restored context → attempt B → purchase → comparison.

The exact recorded pairs remain:

- A: “I am worried about the project” → “What do you mean exactly?”
- B: “Can you finish today?” → “I can finish the sources by nine tonight.”

Known brief V3 source flashes near 74.17 and 80.40 seconds are excluded by the new source ranges. There are no invented UI elements; the left panel is editorial explanation outside the recorded screen.

## Reproduction

The renderer requires Python with Pillow 11.3.0 and FFmpeg. Windows Arial regular/bold paths are defaults; pass `--font` and `--bold-font` on another OS. Fonts are rasterized, not distributed. Use the same font files for pixel-identical layout.

Narration used Kokoro 0.9.4, voice `af_heart`, speed 1.03, Torch 2.13.0 and SoundFile 0.14.0. The already-cached Kokoro model revision is `f3ff3571791e39611d31c381e3a41a3af07b4987`; synthesis explicitly enables offline mode. Model/voice license basis is recorded in `TTS_SELECTION.md`.

```text
python scripts/synthesize_v4.py --manifest assets/video/v4-edit.json --output artifacts/v4-work
python scripts/render_v4.py --work artifacts/v4-work
```

Use the TTS environment for the first command and the Pillow environment for the second. Runtime/model/font variations can change timings and hashes; the checked-in MP4 and manifest identify the reviewed artifact.

## Review boundary

The candidate passed full FFmpeg decode and visual inspection of representative frames and the contact sheet. The final encoded audio measured approximately -16.52 LUFS and -1.24 dBTP, without clipping; these are measured output values, not the requested normalization target.

Offline faster-whisper-small recognized the rendered narration with a normalized token sequence match of 98.80%. The only differences were “teammate's” versus “teammates” and “nine” versus “9”; no substantive omission was detected. The complete transcript and comparison are in `evidence/v4-audio-audit.json`. This is not a human listening verdict. A complete human listen, preference judgment against the old video, and publication approval remain part of the final handoff. Do not label a subjective score as an external judge's evaluation.
