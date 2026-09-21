# Publication receipt — September 21, 2026

## Authorization and scope

The owner explicitly approved publishing V5, updating the existing Devpost submission, and completing GitHub finalization. This supersedes the earlier publication/merge hold. No store release, billing change, real purchase or production deployment was authorized or performed.

## YouTube — verified

- Public video: https://www.youtube.com/watch?v=lKjPDNHgfNc
- Title: **Second Take — One Conversation, A Second Choice | Shipaton 2026**.
- Exact uploaded file: `assets/video/second-take-v5-review.mp4`; SHA-256 `0161BA74FCEA2BA37045BDF4EAC5C6EDCF600B54B1EEDEEA724997189F350131`; local duration 101.452 seconds. YouTube transcodes uploads, so the streamed binary is not claimed to have the same hash.
- Custom thumbnail and English (United States) timed SRT uploaded. Studio confirmed the user-provided caption track; captions appeared in the watch player.
- Visibility selected **Public**, then Studio confirmed **Video published**, dated September 21.
- Copyright checks completed with no problem reported at publication time.
- Not made for children; no paid promotion; synthetic-content disclosure enabled for the locally synthesized narration. Embedding remains allowed.
- Watch player loaded the correct title and 101.47-second duration. Playback advanced to 66.09 seconds with `readyState=4` and no media error. This is a playback check, not a full human listening review.
- A separate unauthenticated YouTube oEmbed request returned the correct title, channel and provider. Full anonymous browser playback was not separately exercised.
- Original public video retained: https://www.youtube.com/watch?v=KMOa5bSV1Eo.

## Devpost — verified

- Existing entry: https://devpost.com/software/second-take-kxgcdq
- Existing submission ID: `1158646`; no new entry created.
- Saved the approved story from `DEVPOST_REVIEW_CANDIDATE_2026-09-21.md`, updated the video field to `lKjPDNHgfNc`, and saved the tagline **One conversation. A second choice. See what changes.**
- Added judge notes linking the provider-free judging guide, explaining Test Store/no real charge, optional own-project Vertex setup and current limitations. Existing academic, eligibility and RevenueCat fields were preserved; no private academic information is reproduced here.
- Finalization showed **Submitted**, **5/5 steps done**, and disabled **Project submitted!**. Existing terms acceptance remained checked/disabled; no new consent or re-submission click was required.
- Reopened the public project page and verified the new video embed, tagline, partial-delivery explanation, repository link and Shipaton association.

## GitHub integration and pre-merge checks

- Starting task SHA: `bec981b3895a19bf445bb158abe5a42ed829f0a4`.
- Integration PR: https://github.com/lawliet8886/second-take/pull/4, targeting `main`. Its merge event is the authoritative integration receipt for this committed document.
- GitHub reported the PR mergeable; no remote status checks were configured. Local gates are explicitly reported instead of inventing CI results.
- Backend `npm run verify`: PASS, build + 24/24 tests + secret check.
- Local fake-provider benchmark: 1,000 requests; p50 0.199 ms, p95 0.932 ms, max 7.687 ms; zero hanging turns. These are not Vertex latencies.
- Android committed wrapper `assembleDebug testDebugUnitTest lintDebug assembleRelease`: **BUILD SUCCESSFUL**, 108 tasks, 2 executed / 106 up-to-date. Existing valid task outputs were reused; this was not a clean rebuild or fresh connected-device test.
- README, judging guide, current status, submission metadata, checklist and YouTube copy point to V5. Historical files explicitly identify superseded versions.

## Rules and remaining limits

Official rules re-read in the authenticated browser: September 30, 2026 at 11:45 PM PDT deadline, sub-two-minute demo guidance, Next Gen judged from video and public code rather than required store download. Source: https://revenuecat-shipaton-2026.devpost.com/rules.

Provider latency, a single authored Alex scenario, local hosting and unvalidated recurring subscription demand remain disclosed. Publication is not new Vertex/RevenueCat validation and does not guarantee a prize. YouTube may require channel verification to make external description links clickable; the source URL remains visible and Devpost links directly to GitHub. No account-verification change was attempted or needed for publication.
