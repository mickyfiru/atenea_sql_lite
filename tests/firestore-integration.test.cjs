const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const appSdk = require('firebase/app');
const authSdk = require('firebase/auth');
const firestore = require('firebase/firestore');

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8180' ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') {
  throw new Error('Integration tests require both local emulators.');
}
const project = 'demo-atenea-security';

function load(file, dependencies, provider) {
  const filename = path.resolve(__dirname, '..', file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const evaluate = vm.runInThisContext(
    '(function(module, exports, require, process, console) {\n' + source + '\n})',
    { filename },
  );
  evaluate(module, module.exports, (name) => {
      if (!(name in dependencies)) throw new Error('Unexpected dependency ' + name);
      return dependencies[name];
    },
    { env: { EXPO_PUBLIC_ATENEA_ALERT_PROVIDER: provider } },
    { log() {}, warn() {}, error() {} },
  );
  return module.exports;
}

async function seedGroup(members) {
  const response = await fetch(
    `http://127.0.0.1:8180/v1/projects/${project}/databases/(default)/documents/groups/integration-group`,
    {
      method: 'PATCH',
      headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        members: { arrayValue: { values: members.map((uid) => ({ stringValue: uid })) } },
      } }),
    },
  );
  assert.equal(response.status, 200);
}

async function waitFor(condition) {
  for (let i = 0; i < 150; i++) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Listener did not emit the expected data.');
}

test('real Auth and Firestore with ATENEA alert services', { timeout: 60000 }, async (t) => {
  const app = appSdk.initializeApp({ apiKey: 'demo-key', projectId: project }, 'integration');
  const auth = authSdk.getAuth(app);
  authSdk.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = firestore.getFirestore(app);
  firestore.connectFirestoreEmulator(db, '127.0.0.1', 8180);
  const bindings = { auth, db };
  const policy = load('src/services/firestoreAlertPolicy.ts', {});
  const validation = load('src/utils/validation.ts', {});
  const mutations = load('src/services/firestoreAlertMutations.ts', {
    'firebase/firestore': firestore, './firebase': bindings,
    './firestoreAlertPolicy': policy, '../utils/validation': validation,
  });
  const sqliteCalls = [];
  const sqliteProvider = {
    update: async (...args) => { sqliteCalls.push(['update', ...args]); },
    delete: async (...args) => { sqliteCalls.push(['delete', ...args]); },
    subscribe: () => { sqliteCalls.push(['subscribe']); return () => {}; },
    insert: async () => { sqliteCalls.push(['insert']); return 'sqlite-id'; },
  };
  const dependencies = {
    'firebase/firestore': firestore,
    'react-native': { Platform: { OS: 'android' } },
    '../utils/validation': validation,
    './firebase': bindings,
    './groups': {
      async getGroupById(id) {
        const snapshot = await firestore.getDocFromServer(firestore.doc(db, 'groups', id));
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : undefined;
      },
    },
    './location': {
      async getUserLocation(uid) {
        const snapshot = await firestore.getDocFromServer(firestore.doc(db, 'users', uid));
        assert.ok(snapshot.exists());
        return { locationEnabled: false, city: '', district: '' };
      },
    },
    './sqliteAlertProvider': {
      sqliteAlertProvider: sqliteProvider,
      isAlertOwner: (alert, uid) => (alert.createdBy || alert.userId) === uid,
      async assertSQLiteAlertGroupMember(groupId, uid) {
        const snapshot = await firestore.getDocFromServer(firestore.doc(db, 'groups', groupId));
        assert.ok(snapshot.data().members.includes(uid));
      },
    },
    './firestoreAlertPolicy': policy,
    './firestoreAlertMutations': mutations,
    './sounds': { markAlertSoundHandled() {} },
    './notifications': { async sendLocalAlertNotification() {} },
  };
  const service = load('src/services/alerts.ts', dependencies);
  let unsubscribe = () => {};
  try {
    const owner = (await authSdk.signInAnonymously(auth)).user.uid;
    await seedGroup([owner]);
    await firestore.setDoc(firestore.doc(db, 'users', owner), {
      id: owner, phoneNumber: '', displayName: 'Demo', createdAt: firestore.serverTimestamp(),
      locationEnabled: false, latitude: null, longitude: null, city: '', district: '',
      expoPushToken: '', notificationsEnabled: false,
    });
    const emissions = [];
    const errors = [];
    unsubscribe = service.subscribeAlertsForGroups(
      ['integration-group'], (rows) => emissions.push(rows), (error) => errors.push(error), owner,
    );
    await waitFor(() => emissions.length > 0);
    let id;
    let original;
    await t.test('CREATE, server timestamp, READ and initial onSnapshot', async () => {
      id = await service.createAlert({
        groupId: 'integration-group', userId: owner, category: 'Seguridad',
        title: 'Integration alert', description: 'Original description',
      });
      await waitFor(() => emissions.some((rows) => rows.some((row) => row.id === id)));
      const snapshot = await firestore.getDocFromServer(firestore.doc(db, 'alerts', id));
      original = snapshot.data();
      assert.ok(original.createdAt instanceof firestore.Timestamp);
      assert.equal(snapshot.id, id);
      assert.equal(service.canManageAlert({ ...original, id }, owner), true);
    });
    await t.test('UPDATE explicit fields, immutable preservation, real-time listener', async () => {
      await service.updateAlert(id, owner, { title: 'Edited', description: 'Edited description', category: 'Servicios' });
      await waitFor(() => emissions.some((rows) => rows.some((row) => row.id === id && row.title === 'Edited')));
      const updated = (await firestore.getDocFromServer(firestore.doc(db, 'alerts', id))).data();
      for (const key of Object.keys(original).filter((key) => !['title', 'description', 'category'].includes(key))) {
        assert.deepEqual(updated[key], original[key], key);
      }
      const latest = emissions.at(-1).find((row) => row.id === id);
      assert.equal(typeof latest.createdAt.getTime, 'function');
    });
    await t.test('unauthenticated service calls cannot mutate', async () => {
      await authSdk.signOut(auth);
      await assert.rejects(service.updateAlert(id, owner, { title: 'Denied', description: '', category: 'Seguridad' }));
      await assert.rejects(service.deleteAlert(id, owner));
    });
    await t.test('another real anonymous user is denied by service and server rules', async () => {
      const other = (await authSdk.signInAnonymously(auth)).user.uid;
      await seedGroup([owner, other]);
      await assert.rejects(service.updateAlert(id, other, { title: 'Denied', description: '', category: 'Seguridad' }));
      await assert.rejects(service.deleteAlert(id, other));
      await assert.rejects(firestore.updateDoc(firestore.doc(db, 'alerts', id), { title: 'Bypass' }),
        (error) => error.code === 'permission-denied');
      assert.equal(service.canManageAlert({ ...original, id }, other), false);
      await authSdk.signOut(auth);
    });
    // Restore the original account through the Auth emulator's custom token support.
    const now = Math.floor(Date.now() / 1000);
    const encode = (data) => Buffer.from(JSON.stringify(data)).toString('base64url');
    const customToken = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
      uid: owner, sub: 'local-test', iss: 'local-test', aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
      iat: now, exp: now + 3600,
    })}.`;
    await authSdk.signInWithCustomToken(auth, customToken);
    await t.test('revoked membership rejects mutations and a fresh server listener', async () => {
      unsubscribe();
      errors.length = 0;
      let ready = false;
      unsubscribe = service.subscribeAlertsForGroups(
        ['integration-group'], () => { ready = true; }, (error) => errors.push(error), owner,
      );
      await waitFor(() => ready);
      await seedGroup([]);
      try {
        await assert.rejects(service.deleteAlert(id, owner));
        await assert.rejects(service.updateAlert(id, owner, { title: 'Denied', description: '', category: 'Seguridad' }));
        unsubscribe();
        unsubscribe = service.subscribeAlertsForGroups(
          ['integration-group'], () => {}, (error) => errors.push(error), owner,
        );
        await waitFor(() => errors.some((error) => error.code === 'permission-denied'));
      } finally {
        await seedGroup([owner]);
      }
    });
    await t.test('cancelled listener stays cancelled and DELETE persists on reread', async () => {
      unsubscribe();
      let ready = false;
      unsubscribe = service.subscribeAlertsForGroups(
        ['integration-group'], (rows) => { emissions.push(rows); ready = true; }, (error) => errors.push(error), owner,
      );
      await waitFor(() => ready);
      unsubscribe();
      const count = emissions.length;
      let deleted = false;
      const watchDeletion = service.subscribeAlertsForGroups(
        ['integration-group'], (rows) => { deleted = !rows.some((row) => row.id === id); }, (error) => errors.push(error), owner,
      );
      await service.deleteAlert(id, owner);
      await waitFor(() => deleted);
      watchDeletion();
      const absent = await fetch(
        `http://127.0.0.1:8180/v1/projects/${project}/databases/(default)/documents/alerts/${id}`,
        { headers: { Authorization: 'Bearer owner' } },
      );
      assert.equal(absent.status, 404);
      await new Promise((resolve) => setTimeout(resolve, 200));
      assert.equal(emissions.length, count);
    });
    await t.test('missing document produces a handled service rejection', async () => {
      const missingOrHidden = (error) => error.code === 'permission-denied' || /ya no existe/.test(error.message);
      await assert.rejects(service.deleteAlert(id, owner), missingOrHidden);
      await assert.rejects(service.updateAlert(id, owner, { title: 'Missing', description: '', category: 'Seguridad' }), missingOrHidden);
    });
    await t.test('SQLite selector retains delegated CRUD without native changes', async () => {
      const local = load('src/services/alerts.ts', dependencies, 'sqlite');
      assert.equal(await local.createAlert({
        groupId: 'integration-group', userId: owner, title: 'SQLite', description: '', category: 'Seguridad',
      }), 'sqlite-id');
      local.subscribeAlertsForGroups(['integration-group'], () => {}, () => {}, owner)();
      await local.updateAlert('local-id', owner, { title: 'SQLite', description: '', category: 'Seguridad' });
      await local.deleteAlert('local-id', owner);
      assert.equal(sqliteCalls.length, 4);
    });
  } finally {
    unsubscribe();
    await firestore.terminate(db);
    await appSdk.deleteApp(app);
  }
});
