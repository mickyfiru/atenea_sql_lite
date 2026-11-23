const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

function load(relativePath, dependencies = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    require(name) {
      if (!(name in dependencies)) throw new Error('Unexpected dependency ' + name);
      return dependencies[name];
    },
  }, { filename });
  return module.exports;
}

const policy = load('src/services/firestoreAlertPolicy.ts');
const valid = { title: ' Alerta ', description: '', category: 'Seguridad' };

test('validation boundaries, whitespace, optional description and category', () => {
  assert.equal(policy.validateFirestoreAlertEdits(valid).title, 'Alerta');
  policy.validateFirestoreAlertEdits({ ...valid, title: 'x'.repeat(120), description: 'x'.repeat(2000) });
  for (const edits of [
    { title: '' }, { title: ' \n\t ' }, { title: 'x'.repeat(121) },
    { description: 'x'.repeat(2001) }, { category: 'Invalid' },
  ]) {
    assert.throws(() => policy.validateFirestoreAlertEdits({ ...valid, ...edits }));
  }
});

test('conservative historical authorship', () => {
  for (const data of [{ createdBy: 'owner' }, { userId: 'owner' }, { createdBy: 'owner', userId: 'owner' }]) {
    assert.equal(policy.isFirestoreAlertOwner(data, 'owner'), true);
    assert.equal(policy.isFirestoreAlertOwner(data, 'other'), false);
    assert.equal(policy.isFirestoreAlertOwner(data), false);
  }
  for (const data of [
    {}, { createdBy: 'owner', userId: 'other' }, { createdBy: null, userId: 'owner' },
    { createdBy: '', userId: 'owner' }, { createdBy: 'owner', userId: 12 },
  ]) {
    assert.equal(policy.isFirestoreAlertOwner(data, 'owner'), false);
  }
});

function harness() {
  const state = {
    currentUser: { uid: 'owner' },
    alert: { createdBy: 'owner', userId: 'owner', groupId: 'group' },
    group: { members: ['owner'] },
    writes: [],
    error: null,
  };
  const firestore = {
    doc: (_db, collection, id) => ({ collection, id }),
    async getDocFromServer(ref) {
      if (state.error) throw state.error;
      const data = ref.collection === 'alerts' ? state.alert : state.group;
      return { exists: () => Boolean(data), data: () => data };
    },
    async updateDoc(ref, fields) { state.writes.push({ operation: 'update', ref, fields }); },
    async deleteDoc(ref) { state.writes.push({ operation: 'delete', ref }); },
  };
  const validation = {
    assertAuthenticatedUser(user, uid) {
      if (!user || user.uid !== uid) throw new Error('Unauthorized');
    },
  };
  const service = load('src/services/firestoreAlertMutations.ts', {
    'firebase/firestore': firestore,
    '../utils/validation': validation,
    './firebase': { auth: state, db: {} },
    './firestoreAlertPolicy': policy,
  });
  return { state, service };
}

test('update sends explicit editable fields and delete targets the alert only', async () => {
  const { state, service } = harness();
  await service.updateFirestoreAlert('alert', 'owner', { ...valid, groupId: 'tampered', createdAt: 0 });
  assert.equal(JSON.stringify(state.writes[0].fields), JSON.stringify({
    title: 'Alerta', description: '', category: 'Seguridad',
  }));
  assert.equal(state.writes[0].ref.id, 'alert');
  await service.deleteFirestoreAlert('alert', 'owner');
  assert.equal(state.writes[1].operation, 'delete');
  assert.equal(state.writes[1].ref.collection, 'alerts');
});

test('mutation rejects missing session, wrong UID, missing alert, ambiguous author and nonmember', async () => {
  const cases = [
    (state) => { state.currentUser = null; },
    (state) => { state.currentUser = { uid: 'other' }; },
    (state) => { state.alert = null; },
    (state) => { state.alert.createdBy = 'other'; },
    (state) => { state.alert.createdBy = null; },
    (state) => { state.group.members = []; },
    (state) => { state.group = null; },
    (state) => { state.alert.groupId = null; },
  ];
  for (const change of cases) {
    const { state, service } = harness();
    change(state);
    await assert.rejects(service.updateFirestoreAlert('alert', 'owner', valid));
    await assert.rejects(service.deleteFirestoreAlert('alert', 'owner'));
    assert.equal(state.writes.length, 0);
  }
});

test('network and permission errors reach callers without writes', async () => {
  for (const code of ['unavailable', 'permission-denied']) {
    const { state, service } = harness();
    state.error = Object.assign(new Error(code), { code });
    await assert.rejects(service.updateFirestoreAlert('alert', 'owner', valid), { code });
    await assert.rejects(service.deleteFirestoreAlert('alert', 'owner'), { code });
    assert.equal(state.writes.length, 0);
  }
});

test('historical documents with one confirmed author accept mutations', async () => {
  for (const author of [{ createdBy: 'owner' }, { userId: 'owner' }]) {
    const { state, service } = harness();
    state.alert = { ...author, groupId: 'group', legacyField: 'preserved' };
    await service.updateFirestoreAlert('alert', 'owner', valid);
    await service.deleteFirestoreAlert('alert', 'owner');
    assert.equal(state.writes.length, 2);
    assert.equal(state.alert.legacyField, 'preserved');
  }
});

test('invalid edits are rejected before any database access or mutation', async () => {
  const { state, service } = harness();
  state.error = new Error('Database must not be accessed');
  await assert.rejects(service.updateFirestoreAlert('alert', 'owner', { ...valid, title: '' }), /titulo/);
  assert.equal(state.writes.length, 0);
});
