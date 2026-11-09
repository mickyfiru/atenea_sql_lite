# Firestore security for ATENEA

This project includes baseline Firestore rules in `firestore.rules` and Storage rules in `storage.rules`.

## Collections

- `users`: each authenticated user can read and update only their own document.
- `groups`: authenticated users can read only groups where their `uid` is in `members`.
- `messages`: group members can read and create messages for their groups. `userId` must match `request.auth.uid`.
- `alerts`: group members can read and create alerts for their groups. `createdBy` and `userId` must match `request.auth.uid`.

## Client validations

The TypeScript services validate before writes:

- authenticated user matches the write operation
- text fields are not empty
- alert category is one of `Seguridad`, `Tránsito`, `Comunidad`, `Servicios`
- coordinates are valid latitude/longitude values
- messages and alerts target an existing group
- messages and alerts are created only by group members

## Storage evidence

Alert photos and videos are uploaded under `alerts/{uid}/{fileName}`.

- authenticated users can read alert media
- users can upload only into their own `uid` folder
- files must be image or video content types
- files must be smaller than 20 MB
- media cannot be updated or deleted by clients

## Group invitations

Groups are not publicly readable. Joining by code updates the group membership directly and lets Firestore rules verify that the user is only adding their own `uid`.

## Deploying rules

Connect this file to Firebase Hosting/Firestore tooling with a `firebase.json` when ready:

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

Then deploy with:

```bash
firebase deploy --only firestore:rules,storage
```

Review the Firebase Console rules simulator before deploying to production.
