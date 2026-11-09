import type { User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from './firebase';
import { ensureDefaultGroupsForUser } from './groups';

export async function ensureUserDocument(user: User) {
  if (!db) {
    throw new Error('Firestore no esta configurado.');
  }

  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      id: user.uid,
      phoneNumber: user.phoneNumber ?? '',
      displayName: '',
      locationEnabled: false,
      latitude: null,
      longitude: null,
      city: '',
      district: '',
      expoPushToken: '',
      notificationsEnabled: false,
      notificationsUpdatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    const data = snapshot.data();
    const missingDefaults: Record<string, unknown> = {};

    if (typeof data.locationEnabled !== 'boolean') {
      missingDefaults.locationEnabled = false;
    }

    if (data.latitude === undefined) {
      missingDefaults.latitude = null;
    }

    if (data.longitude === undefined) {
      missingDefaults.longitude = null;
    }

    if (typeof data.city !== 'string') {
      missingDefaults.city = '';
    }

    if (typeof data.district !== 'string') {
      missingDefaults.district = '';
    }

    if (typeof data.expoPushToken !== 'string') {
      missingDefaults.expoPushToken = '';
    }

    if (typeof data.notificationsEnabled !== 'boolean') {
      missingDefaults.notificationsEnabled = false;
    }

    if (Object.keys(missingDefaults).length) {
      await setDoc(
        userRef,
        {
          ...missingDefaults,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
  }

  await ensureDefaultGroupsForUser(user.uid);
}
