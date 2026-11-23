const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function initialize(env, development = true) {
  const calls = [];
  const productionApp = { name: '[DEFAULT]', options: { projectId: 'atena-5ebd9' } };
  const dependencies = {
    '@react-native-async-storage/async-storage': {},
    '@firebase/auth': { getReactNativePersistence: () => ({}) },
    'react-native': { Platform: { OS: 'android' } },
    'firebase/app': {
      getApps: () => [productionApp],
      getApp: () => productionApp,
      initializeApp: (options, name) => {
        calls.push(['app', options.projectId, name]);
        return { name, options };
      },
    },
    'firebase/auth': {
      initializeAuth: (app) => ({ app }),
      getAuth: (app) => ({ app }),
      connectAuthEmulator: (auth, endpoint) => calls.push(['auth', auth.app.options.projectId, endpoint]),
    },
    'firebase/firestore': {
      getFirestore: (app) => ({ app }),
      connectFirestoreEmulator: (db, host, port) => calls.push(['firestore', db.app.options.projectId, host, port]),
    },
    'firebase/storage': {
      getStorage: (app) => ({ app }),
      connectStorageEmulator: (storage, host, port) => calls.push(['storage', storage.app.options.projectId, host, port]),
    },
  };
  const source = ts.transpileModule(fs.readFileSync(require.resolve('../src/services/firebase.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, {
    exports: module.exports, module, process: { env }, __DEV__: development,
    console: { log() {}, warn() {} },
    require(name) {
      assert.ok(name in dependencies);
      return dependencies[name];
    },
  });
  return { calls, exports: module.exports };
}

test('normal initialization keeps the production project and no emulator connections', () => {
  const result = initialize({});
  assert.equal(result.exports.EXPECTED_FIREBASE_PROJECT_ID, 'atena-5ebd9');
  assert.equal(result.calls.length, 0);
});

test('development emulator mode isolates Auth, Firestore and Storage from existing production app', () => {
  const result = initialize({
    EXPO_PUBLIC_ATENEA_FIREBASE_EMULATORS: 'true',
    EXPO_PUBLIC_ATENEA_EMULATOR_HOST: '10.0.2.2',
  });
  assert.equal(result.exports.firebaseApp.options.projectId, 'demo-atenea-security');
  assert.equal(result.exports.EXPECTED_FIREBASE_PROJECT_ID, 'demo-atenea-security');
  assert.equal(result.calls.length, 4);
  for (const call of result.calls) assert.equal(call[1], 'demo-atenea-security');
  assert.equal(result.calls[1][2], 'http://10.0.2.2:9099');
});

test('emulator configuration fails closed in release or with an unapproved host', () => {
  assert.throws(() => initialize({ EXPO_PUBLIC_ATENEA_FIREBASE_EMULATORS: 'true' }, false));
  assert.throws(() => initialize({
    EXPO_PUBLIC_ATENEA_FIREBASE_EMULATORS: 'true',
    EXPO_PUBLIC_ATENEA_EMULATOR_HOST: 'example.com',
  }));
});
