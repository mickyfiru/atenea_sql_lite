import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  initializeAuth,
  type Persistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

export const EXPECTED_FIREBASE_PROJECT_ID = 'atena-5ebd9';

export const firebaseConfig = {
  apiKey: 'AIzaSyDxvEioJdy0wJ-HDkTwaQHNmh_3uLs0CTc',
  authDomain: 'atena-5ebd9.firebaseapp.com',
  projectId: EXPECTED_FIREBASE_PROJECT_ID,
  storageBucket: 'atena-5ebd9.firebasestorage.app',
  messagingSenderId: '915187577180',
  appId: '1:915187577180:web:af722e359a97d104859199',
  measurementId: 'G-PV8PV178NF',
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

type ReactNativeAuthModule = {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

function initializeFirebaseSafely() {
  console.log('[ATENEA startup] Firebase configured:', isFirebaseConfigured);
  console.log('[ATENEA startup] Firebase project:', firebaseConfig.projectId);

  if (!isFirebaseConfigured) {
    return undefined;
  }

  try {
    return getApps().length ? getApp() : initializeApp(firebaseConfig);
  } catch (error) {
    console.warn('No se pudo inicializar Firebase.', error);
    return undefined;
  }
}

export const firebaseApp = initializeFirebaseSafely();

function createAuth() {
  if (!firebaseApp) {
    return undefined;
  }

  try {
    const persistence: Persistence =
      Platform.OS === 'web'
        ? browserLocalPersistence
        : // Firebase exposes this helper from its React Native conditional export at runtime.
          (require('@firebase/auth') as ReactNativeAuthModule).getReactNativePersistence(
            AsyncStorage,
          );

    return initializeAuth(firebaseApp, {
      persistence,
    });
  } catch {
    return getAuth(firebaseApp);
  }
}

export const auth = createAuth();

function createFirestore() {
  if (!firebaseApp) {
    return undefined;
  }

  try {
    return getFirestore(firebaseApp);
  } catch (error) {
    console.warn('No se pudo inicializar Firestore.', error);
    return undefined;
  }
}

function createStorage() {
  if (!firebaseApp) {
    return undefined;
  }

  try {
    return getStorage(firebaseApp);
  } catch (error) {
    console.warn('No se pudo inicializar Firebase Storage.', error);
    return undefined;
  }
}

export const db = createFirestore();
export const storage = createStorage();
