# Second Take Android

## Local connected development

1. Start the backend from `../backend` using its README and valid Google Cloud ADC.
2. Ensure `local.properties` contains the Android SDK location. Optionally add `SECOND_TAKE_BACKEND_URL=http://10.0.2.2:8765`.
3. Run `./gradlew assembleDebug testDebugUnitTest lintDebug` (PowerShell: `.\gradlew.bat assembleDebug testDebugUnitTest lintDebug`).
4. Start a standard emulator and run `./gradlew installDebug` (PowerShell: `.\gradlew.bat installDebug`).

The emulator reaches the host through `10.0.2.2`. For a physical device, use `adb reverse tcp:8765 tcp:8765` and set the debug backend URL to `http://127.0.0.1:8765`.

The deterministic v0.1 fork engine is retained as a reference and unit-test fixture. `MainActivity` uses the connected repository/ViewModel path. No cloud credential belongs in this project.

## RevenueCat Test Store (debug only)

The v0.8 integration uses RevenueCat Android SDK 10.19.1 and the RevenueCat Test Store. Configure the RevenueCat dashboard with one monthly subscription (`monthly`), attach it to entitlement `pro`, and place it in offering `default` as the monthly package (`$rc_monthly`). See [`../docs/REVENUECAT_TEST_STORE_SETUP.md`](../docs/REVENUECAT_TEST_STORE_SETUP.md).

Add the public Test Store SDK key only to the untracked `android/local.properties` file:

```properties
REVENUECAT_TEST_STORE_API_KEY=test_your_public_sdk_key
```

No `revenuecat.properties.example` file is required. `local.properties` is ignored by Git.

Debug builds enable RevenueCat only when that value is present. Release builds always compile with RevenueCat disabled and never receive the Test Store key. The key is a public client SDK key, not an administrative secret, but it remains local to reduce external use of the demonstration project.

The Full A/B Comparison is the only Pro gate. Conversation, first rewind, second attempt, Intent Lock, and the observable branch change remain free. Access is granted only when `CustomerInfo.entitlements["pro"].isActive` is true.

The live purchase smoke is deliberately opt-in because it creates a zero-cost Test Store sandbox event. With the public key in ignored `local.properties` and an emulator running:

```powershell
.\gradlew.bat connectedDebugAndroidTest '-Pandroid.testInstrumentationRunnerArguments.class=com.secondtake.verticalslice.RevenueCatPurchaseSmokeTest' '-Pandroid.testInstrumentationRunnerArguments.runRevenueCatPurchase=true'
```

The ordinary connected suite skips this test unless `runRevenueCatPurchase=true` is supplied.

## Submission-build limitation

Second Take is a Shipaton Next Gen development/demo build. The release build intentionally contains no Test Store key and points at a non-production backend placeholder. It is not presented as a production-distributed APK; Next Gen judging uses the public code repository and submitted demo video.
