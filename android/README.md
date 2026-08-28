# Second Take Android

## Local connected development

1. Start `../second-take-backend` using its README and valid ADC.
2. Ensure `local.properties` contains the Android SDK. Optionally add `SECOND_TAKE_BACKEND_URL=http://10.0.2.2:8765`.
3. Run `./gradlew assembleDebug testDebugUnitTest lintDebug` (PowerShell: `.\gradlew.bat ...`).
4. Start a standard emulator and run `.\gradlew.bat installDebug`.

The emulator reaches the host through `10.0.2.2`. For a physical device, use `adb reverse tcp:8765 tcp:8765` and override the debug URL with `http://127.0.0.1:8765`.

The deterministic v0.1 fork engine is retained as a reference and unit-test fixture. `MainActivity` now uses the connected repository/ViewModel path. No cloud credential belongs in this project.

## RevenueCat Test Store (debug only)

The v0.8 integration uses RevenueCat Android SDK 10.19.1 and the RevenueCat Test Store. Configure the RevenueCat dashboard with one monthly subscription (qualified ID: `monthly`), attach it to entitlement `pro`, and place it in offering `default` as `$rc_monthly`. The reproducible setup is documented in `REVENUECAT_TEST_STORE_SETUP_V08.md`.

Copy the placeholder from `revenuecat.properties.example` into the untracked `local.properties` file and replace it with the public Test Store SDK key:

```properties
REVENUECAT_TEST_STORE_API_KEY=test_your_public_sdk_key
```

Debug builds enable RevenueCat only when that value is present. Release builds always compile with RevenueCat disabled and never receive the Test Store key. The key is a public client SDK key, not an administrative secret, but it remains local to reduce external use of the demonstration project.

The Full A/B Comparison is the only Pro gate. Conversation, first rewind, second attempt, Intent Lock, and the observable branch change remain free. Access is granted only when `CustomerInfo.entitlements["pro"].isActive` is true.
