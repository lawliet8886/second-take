# V6 — real updated-app review video

Status: **REVIEW CANDIDATE ON PR #5, NOT THE YOUTUBE/DEVPOST SUBMISSION VIDEO**.
Date: September 21, 2026. Production code: `246fd4811fd70c8a707c3b64d6664b2c6c07bb62`.
The published V5 remains unchanged; this candidate belongs to PR #5.

## Watch and inspect

- [V6 MP4](../assets/video/second-take-v6-review.mp4): 1:43, English narration and burned-in English captions.
- [English SRT](../assets/video/second-take-v6-review.srt) and [Portuguese SRT](../assets/video/second-take-v6-review.pt-BR.srt).
- [Thumbnail](../assets/thumbnail-v6-review.png).
- [Original connected capture](../assets/video/second-take-v6-real-source.mp4).
- [30 fps editing source](../assets/video/second-take-v6-cfr-source.mp4): timestamp-preserving frame duplication, no interpolation.
- [Exact edit](../assets/video/v6-edit.json), [render manifest](../assets/video/v6-render-manifest.json), and [capture evidence](../evidence/v6-real-capture.json).

## What changed

The opening previews the actual in-app comparison, not an editorial mockup.
Screen details are enlarged so the new reading notes can be inspected. The
story remains one coherent Alex rehearsal: concern, clarification, exact rewind,
ambiguous question, Intent Lock confirmation, sources-by-nine response, real
Test Store unlock, and reflection about what remains unspecified.

The real captured replies are “Can you be more specific?” and “I can get the
sources done by nine tonight.” The latter is described as a statement about
sources and a deadline, not a promise to complete the entire project.
Neither branch is given a score. No additional scenario, free-form coaching,
sentiment inference, production launch, customer demand, or competition result
is implied.

## Verified now

- `assembleDebug` and `assembleDebugAndroidTest` passed for the opt-in capture test.
- `RealDemoCaptureTest`: **OK (1 test)**, 153.532 seconds. It launches the real
  application, asserts both repository overrides are absent, requires a Test
  Store SDK key, completes a valid test purchase and checks refreshed real
  `CustomerInfo` for active `pro` before recording the comparison.
- SDK key was obtained from the existing authenticated dashboard, passed as an
  ephemeral Gradle environment property, never printed or committed. No key
  was created or renewed. No billing settings or charged transaction changed.
- Vertex authentication was usable. A real API preflight returned `ALEX_REPLY`
  with `GEMINI_SELECTOR`; the combined session/turn request took 9,379 ms.
  The capture uses the real configured backend and unchanged deadlines. This
  is not a claim that every captured selection bypassed deterministic fallback.
- Backend `npm run verify`: TypeScript build, **24 tests**, credential-pattern
  scan over **172 files**, all passed.
- Both modified media scripts passed Python syntax compilation.
- Final media: **102.652 seconds, 1920×1080, 30 fps, H.264/AAC**, 3,955,904 bytes.
  Full FFmpeg decode passed. All 13 editorial panels passed title/body/caption
  bounds checks. Raw capture and enlarged comparison frames were inspected.
- Audio: **-16.4 LUFS**, **-1.4 dBFS true peak**, 4.5 LU loudness range.
- Offline ASR matched **97.55%** of normalized tokens. Differences were apostrophe
  tokenization, `Intent Lock`/`IntentLock` and `nine tonight`/`9 to night`, not a
  detected substantive omission. This is not a human listening verdict.
  [Audit transcript](../evidence/v6-audio-audit.json) identifies the decoded PCM
  audio hash, allowing the same audio check to survive video-only cut corrections.
- Final MP4 SHA-256: `386B2F7C30B8EAD238D1449CA9E44753EE56401FEFEDA4E5803EA25349EFC8E8`.
- The corrected render passed full decode again. Its decoded audio hash exactly
  matches the audited PCM (`55196788c43d8a8c7148dcc59c561e83aed6b6dfd0eb6e7ab555743da4de11ea`).
  Intent Lock, Alex's second reply and the complete reflection crop were visually
  checked in the corrected render. A negative test confirmed that the renderer
  rejects the original VFR source before rendering.
- V5 SHA-256 is still `0161BA74FCEA2BA37045BDF4EAC5C6EDCF600B54B1EEDEEA724997189F350131`.

## Failures and limits preserved

The first real capture stopped at recovery before the first Alex reply; it was
not presented as success. Cold-call latency and host memory pressure were
observed, but the exact first-failure cause was not fully isolated. One direct
router probe succeeded after 13.6 seconds; the later API preflight succeeded
within the existing application budget. Two other recording starts did not
reach the app because of emulator boot/snapshot state. Those are infrastructure
attempts, not two additional failed product flows. Failed-run logs and capture
remain in ignored `artifacts/v6-work/`.

The accepted recording uses the original emulator launch configuration after
reinstalling the actual debug and instrumentation APKs. No provider model,
prompt, policy, candidate, timeout, Pro gate or application code was changed to
make the recording pass. Real response variants were accepted as returned.

The earlier 34 Android unit and 13 fixture/integration checks, lint and release
build are recorded in `COMPARISON_READING_2026-09-21.md`; they are not mislabeled
as freshly rerun media checks. Restore/relaunch verification remains the earlier
Test Store evidence, not a new claim from this capture. The new recording adds
the real updated-UI flow, not a human usability study or availability guarantee.

Waiting time is shortened and frames may be held. Preview and detail crops are
identified in the edit manifest; no app UI or response is fabricated. The
original recording is not a latency benchmark. Independent audience preference,
human full-length listening approval and judging outcome remain unverified.

The initial V6 render exposed an editing issue with the sparse variable-frame-rate
Android recording: seeking/resetting timestamps could advance a cut to a later
screen. It was rejected during full-panel review. The final render uses a 30 fps
normalization of the same source, and the V6 renderer now rejects non-30-fps
source metadata. The reflection cut also starts after its scroll has completed.

## Reproduce

Use an authorized local Vertex backend and an ephemeral public Test Store SDK
key. Build the actual debug app and instrumentation APKs, then run:

```text
adb shell am instrument -w -r -e class com.secondtake.verticalslice.RealDemoCaptureTest -e runRealCapture true com.secondtake.verticalslice.debug.test/androidx.test.runner.AndroidJUnitRunner
```

Capture the emulator separately with Android `screenrecord`; use emitted stage
markers and inspect frames to align the edit. Do not substitute fixture footage
if the real-provider guard fails. The test is opt-in and skips by default.

For this accepted source, use the existing cached Kokoro environment described
in `VIDEO_V4_REVIEW.md` (offline `af_heart`, speed 1.03):

```text
ffmpeg -i assets/video/second-take-v6-real-source.mp4 -map 0:v:0 -vf fps=30 -c:v libx264 -crf 18 -preset fast -pix_fmt yuv420p -threads 4 -movflags +faststart assets/video/second-take-v6-cfr-source.mp4
python scripts/synthesize_v4.py --manifest assets/video/v6-edit.json --output artifacts/v6-work --reuse-work artifacts/v5-work
python scripts/render_v4.py --manifest assets/video/v6-edit.json --version v6 --work artifacts/v6-work
```

`--reuse-work` is optional and copies only exact matching narration texts after
checking mono/24 kHz WAV format. Omit it to synthesize every segment. Use the
Pillow/FFmpeg environment for rendering. Voice timing and source-to-output crops
are archived alongside the final MP4. Font/runtime changes may change hashes.
