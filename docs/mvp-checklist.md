# ATENEA MVP checklist

## Navigation

- [ ] Unauthenticated users land on Welcome/Login.
- [ ] Phone login sends OTP and OTP verification opens the main app.
- [ ] Authenticated users land on the main tabs.
- [ ] Bottom tabs show only Groups, Atenea, and Profile.
- [ ] Stack screens open from the existing flows: Chat, Alerts, Summary, Location Settings, Sound Settings, and Map.
- [ ] Atenea written commands route to the correct internal screens.

## Permissions

- [ ] Location permission is requested from Profile > Mi ubicacion.
- [ ] Camera permission is requested only when taking evidence.
- [ ] Gallery permission is requested only when selecting evidence.
- [ ] Notification permission is requested before saving `expoPushToken`.
- [ ] Permission errors are shown as user-facing messages.

## Firebase

- [ ] Firebase project config points to `atena-5ebd9`.
- [ ] Phone Authentication is enabled in Firebase Console.
- [ ] Firestore Database is enabled.
- [ ] Storage is enabled.
- [ ] Existing users receive default fields for location and notifications on next session check.
- [ ] Default groups are ensured for first-time users.

## Data

- [ ] `users` documents contain auth, location, and notification fields.
- [ ] `groups` documents contain `members`, `lastMessage`, and `lastMessageAt`.
- [ ] `messages` are scoped to an existing group and authenticated sender.
- [ ] `alerts` are scoped to a group, category, optional location, and optional media.
- [ ] Empty states appear for missing groups, messages, alerts, summaries, and map markers.

## Security rules

- [ ] Deploy `firestore.rules` before production.
- [ ] Deploy `storage.rules` before production.
- [ ] Confirm `firebase.json` points to both rules files.
- [ ] Verify rules in Firebase Console simulator.
- [ ] Keep client validation and rules aligned when data fields change.

## Platform configuration

- [ ] Expo config includes location, image picker, notifications, and Mapbox plugins.
- [ ] Mapbox token is provided through `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`.
- [ ] Notification sounds exist in `assets/sounds`.
- [ ] No OpenAI, Gemini, DeepSeek, or other AI keys are committed.

## Validation

- [ ] Run `npx tsc --noEmit`.
- [ ] Smoke test login, groups, chat, alerts, profile settings, summary, map, and evidence upload.
