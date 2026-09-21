# Second Take — Final Master QA

> Historical August 28 technical QA, archived with its master during the September 21 candidacy revision. These measurements are not new tests of the V4 candidate. See `docs/VIDEO_V4_REVIEW.md` for the current review artifact.

Date: 2026-08-28  
Artifact: `assets/video/second-take-shipaton-final-master.mp4`

## Technical identity

- Duration: **107.633333 s**
- Resolution: **1080 × 1920**
- Frame rate: **30/1 fps constant**
- Video: **H.264 High, yuv420p**
- Audio: **AAC-LC, mono, 24 kHz**
- Video frames: **3,229**
- Audio frames: **2,522**
- File size: **5,109,934 bytes**
- SHA-256: **C1F6CB8151216BC1114D619BCF974CC297D15A8C692C8D43C971967717E8EBA3**

## Audio

- Integrated loudness: **-19.04 LUFS**
- True peak: **-1.49 dBTP**
- Loudness range: **3.00 LU**
- Audio elementary-stream SHA-256 matches the approved mastered V3 exactly: **07B719F2DD84C248B84AD8146FC5C779A672FE5ABB25D0C939D61F2941C5E3DB**
- Audio was copied, not re-encoded, during the visual microfix.
- No silence interval of at least 1.5 seconds at -45 dB was detected.

## Decode and image integrity

- Full video/audio decode: **PASS; 0 error lines**
- Corrupt frames: **0 observed**
- Accidental black/blank frames: **0**
- FFmpeg's broad black detector flags 44.400000–47.566667 because the intentional rewind screen uses a near-black design; frame inspection confirms the animated rewind indicator and text are present throughout. This is not a blank-frame defect.
- Accidental flashes: **0**
- Unclassified short shots: **0**

## Content integrity

- Language: **en-US**
- Portuguese user-facing text: **0**
- Captions: **intact**
- Narration/caption timing: **unchanged**
- RevenueCat Test Store sequence: **intact**
- Architecture card: **intact**
- Attempt A: **“I am worried about the project” → “What do you mean exactly?”**
- Attempt B: **“Can you finish today?” → “I can finish the sources by nine tonight.”**
- Full A/B Comparison reproduces both exact branches: **PASS**

## Microfix scope

Only the following video frames were replaced:

- Frames 2225–2231 with clean comparison frame 2232.
- Frames 2412–2422 with clean comparison frame 2423.

No timing, audio, narration, caption, RevenueCat, architecture, or product-content change was made.

Verdict: **PASS**.
