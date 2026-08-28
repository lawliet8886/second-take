# Privacy and data flow

This document describes the development build; it is not a legal privacy policy.

The Android app sends the user's visible turn, an idempotency ID, and public session identifiers to the local backend. The backend owns conversation state, hidden facts, revealed facts, policy candidates, selector execution, graph transitions, and rewind snapshots. Hidden facts are not serialized to the client before authorized revelation.

For AI-backed development, the backend sends only context needed for routing or safe plan selection to Vertex AI. Google Cloud ADC credentials remain on the developer machine and are never embedded in the APK. RevenueCat runs independently in the Android client with a public Test Store SDK key; CustomerInfo is the authority for `pro` access. No RevenueCat secret REST key is used.

Operational logs avoid full conversation text by default. The candidate repository excludes local configuration, credentials, build outputs, private student evidence, and administrative dashboard data.

