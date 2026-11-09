import * as Location from 'expo-location';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';

import { UserLocation } from '../types/domain';
import { assertAuthenticatedUser, assertValidCoordinates } from '../utils/validation';
import { auth, db } from './firebase';

type FirestoreUserLocation = {
  locationEnabled?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  city?: string;
  district?: string;
  updatedAt?: Timestamp;
};

function assertFirestore() {
  if (!db) {
    throw new Error('Firestore no esta configurado.');
  }

  return db;
}

function snapshotToUserLocation(data?: DocumentData): UserLocation {
  const locationData = (data ?? {}) as FirestoreUserLocation;

  return {
    locationEnabled: Boolean(locationData.locationEnabled),
    latitude: typeof locationData.latitude === 'number' ? locationData.latitude : undefined,
    longitude: typeof locationData.longitude === 'number' ? locationData.longitude : undefined,
    city: locationData.city ?? '',
    district: locationData.district ?? '',
    updatedAt: locationData.updatedAt?.toDate(),
  };
}

async function resolveSector(latitude: number, longitude: number) {
  try {
    const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });

    return {
      city: address?.city ?? address?.subregion ?? address?.region ?? '',
      district: address?.district ?? address?.name ?? address?.street ?? '',
    };
  } catch {
    return {
      city: '',
      district: '',
    };
  }
}

export async function getUserLocation(userId: string): Promise<UserLocation> {
  const firestore = assertFirestore();
  const snapshot = await getDoc(doc(firestore, 'users', userId));

  return snapshotToUserLocation(snapshot.data());
}

export function subscribeUserLocation(
  userId: string,
  onLocation: (location: UserLocation) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const firestore = assertFirestore();

  return onSnapshot(
    doc(firestore, 'users', userId),
    (snapshot) => onLocation(snapshotToUserLocation(snapshot.data())),
    onError,
  );
}

export async function enableOrUpdateUserLocation(userId: string) {
  const firestore = assertFirestore();
  assertAuthenticatedUser(auth?.currentUser, userId);

  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new Error('ATENEA necesita permiso de ubicacion para activar esta funcion.');
  }

  const currentLocation = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const { latitude, longitude } = currentLocation.coords;
  assertValidCoordinates(latitude, longitude);

  const sector = await resolveSector(latitude, longitude);
  const userLocation = {
    locationEnabled: true,
    latitude,
    longitude,
    city: sector.city,
    district: sector.district,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(firestore, 'users', userId), userLocation, { merge: true });

  return {
    ...userLocation,
    updatedAt: new Date(),
  };
}

export async function disableUserLocation(userId: string) {
  const firestore = assertFirestore();
  assertAuthenticatedUser(auth?.currentUser, userId);

  await setDoc(
    doc(firestore, 'users', userId),
    {
      locationEnabled: false,
      latitude: null,
      longitude: null,
      city: '',
      district: '',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
