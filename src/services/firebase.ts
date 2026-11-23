import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  type Persistence,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const useEmulators = process.env.EXPO_PUBLIC_ATENEA_FIREBASE_EMULATORS === 'true';
const emulatorHost = process.env.EXPO_PUBLIC_ATENEA_EMULATOR_HOST ?? '127.0.0.1';
if (useEmulators && (!__DEV__ || !['127.0.0.1', 'localhost', '10.0.2.2'].includes(emulatorHost))) {
  throw new Error('Los emuladores requieren desarrollo y un host local autorizado.');
}

export const EXPECTED_FIREBASE_PROJECT_ID = useEmulators ? 'demo-atenea-security' : 'atena-5ebd9';

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

const activeConfig = useEmulators
  ? {
      apiKey: 'demo-api-key',
      projectId: 'demo-atenea-security',
      authDomain: 'demo-atenea-security.firebaseapp.com',
      appId: 'demo-atenea-security-app',
      storageBucket: 'demo-atenea-security.appspot.com',
    }
  : firebaseConfig;

type ReactNativeAuthModule = {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

function initializeFirebaseSafely() {
  console.log('[ATENEA startup] Firebase configured:', isFirebaseConfigured);
  console.log('[ATENEA startup] Firebase project:', activeConfig.projectId);

  if (useEmulators) {
    const existing = getApps().find((app) => app.name === 'atenea-emulator');
    if (existing && existing.options.projectId !== 'demo-atenea-security') {
      throw new Error('La instancia local tiene un proyecto inesperado.');
    }
    return existing ?? initializeApp(activeConfig, 'atenea-emulator');
  }

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
if (useEmulators) {
  if (!auth) throw new Error('No se pudo inicializar Auth local.');
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
}

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
if (useEmulators) {
  if (!db || !storage) throw new Error('No se pudieron inicializar los servicios locales.');
  connectFirestoreEmulator(db, emulatorHost, 8180);
  // Storage also targets the fictitious project and local host, even when its emulator is stopped.
  connectStorageEmulator(storage, emulatorHost, 9199);
}
