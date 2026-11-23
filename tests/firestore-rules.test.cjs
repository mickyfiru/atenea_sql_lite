const assert = require('node:assert/strict');
const { test, before } = require('node:test');

const project = 'demo-atenea-security';
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!host || !/^127\.0\.0\.1:8180$/.test(host)) {
  throw new Error('These tests require the local Firestore emulator on 127.0.0.1:8180.');
}
const base = `http://${host}/v1/projects/${project}/databases/(default)/documents`;
const documentName = (path) => `projects/${project}/databases/(default)/documents/${path}`;

function token(uid) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    aud: project, iss: `https://securetoken.google.com/${project}`,
    sub: uid, user_id: uid, iat: now, exp: now + 3600,
    firebase: { sign_in_provider: 'custom', identities: {} },
  })}.`;
}

function value(data) {
  if (data === null) return { nullValue: null };
  if (typeof data === 'string') return { stringValue: data };
  if (typeof data === 'number') return { doubleValue: data };
  if (Array.isArray(data)) return { arrayValue: { values: data.map(value) } };
  throw new Error('Unsupported fixture value');
}

const fields = (data) => Object.fromEntries(Object.entries(data).map(([key, data]) => [key, value(data)]));

async function request(path, method, body, uid = 'owner', admin = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (admin) headers.Authorization = 'Bearer owner';
  else if (uid) headers.Authorization = `Bearer ${token(uid)}`;
  const response = await fetch(base + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  return { status: response.status, result };
}

async function seed(path, data) {
  const result = await request('/' + path, 'PATCH', { fields: fields(data) }, null, true);
  assert.equal(result.status, 200, JSON.stringify(result.result));
}

function fixture(overrides = {}) {
  return {
    groupId: 'group', userId: 'owner', createdBy: 'owner', title: 'Original',
    description: '', category: 'Seguridad', soundType: 'Seguridad',
    latitude: null, longitude: null, city: '', district: '', mediaUrl: '', mediaType: '',
    ...overrides,
  };
}

async function update(id, changes, uid = 'owner') {
  const mask = Object.keys(changes).map((key) => 'updateMask.fieldPaths=' + encodeURIComponent(key)).join('&');
  return request('/alerts/' + id + '?' + mask, 'PATCH', { fields: fields(changes) }, uid);
}
const remove = (id, uid = 'owner') => request('/alerts/' + id, 'DELETE', undefined, uid);
const allowed = (response) => assert.ok(response.status >= 200 && response.status < 300, JSON.stringify(response));
const denied = (response) => assert.equal(response.status, 403, JSON.stringify(response));

before(async () => {
  await seed('groups/group', { members: ['owner', 'other'] });
});

test('owner/member can update the three editable fields and delete', async () => {
  await seed('alerts/owned', fixture());
  allowed(await update('owned', { title: 'Updated', description: 'Details', category: 'Tránsito' }));
  const read = await request('/alerts/owned', 'GET');
  allowed(read);
  assert.equal(read.result.fields.soundType.stringValue, 'Seguridad');
  allowed(await remove('owned'));
});

for (const [label, uid] of [['other authenticated member', 'other'], ['unauthenticated user', null]]) {
  test(label + ' cannot update or delete', async () => {
    await seed('alerts/' + label, fixture());
    denied(await update(label, { title: 'Denied' }, uid));
    denied(await remove(label, uid));
  });
}

test('nonexistent alert cannot be updated or deleted', async () => {
  denied(await update('missing', { title: 'Denied' }));
  denied(await remove('missing'));
});

for (const author of ['createdBy', 'userId']) {
  test('historical ' + author + ' alone permits mutations and preserves legacy fields', async () => {
    const data = fixture({ legacyExtra: 'kept' });
    delete data[author === 'createdBy' ? 'userId' : 'createdBy'];
    delete data.mediaUrl;
    await seed('alerts/history-' + author, data);
    allowed(await update('history-' + author, { title: 'Updated', description: '', category: 'Servicios' }));
    const read = await request('/alerts/history-' + author, 'GET');
    assert.equal(read.result.fields.legacyExtra.stringValue, 'kept');
    allowed(await remove('history-' + author));
  });
}

for (const [label, authors] of [
  ['absent', {}], ['contradictory', { createdBy: 'owner', userId: 'other' }],
  ['null', { createdBy: null, userId: 'owner' }],
  ['empty', { createdBy: '', userId: 'owner' }],
]) {
  test('rejects ' + label + ' authorship', async () => {
    const data = fixture();
    delete data.createdBy;
    delete data.userId;
    await seed('alerts/' + label, { ...data, ...authors });
    denied(await update(label, { title: 'Denied' }));
    denied(await remove(label));
  });
}

for (const [key, data] of Object.entries({
  groupId: 'other-group', createdBy: 'other', userId: 'other',
  createdAt: 'changed', latitude: 1, longitude: 1, city: 'changed',
  district: 'changed', mediaUrl: 'changed', mediaType: 'image', soundType: 'Servicios',
})) {
  test('immutable ' + key + ' cannot be changed', async () => {
    await seed('alerts/immutable-' + key, fixture({ createdAt: 'historical date' }));
    denied(await update('immutable-' + key, { [key]: data }));
  });
}

for (const [label, changes] of [
  ['empty-title', { title: '' }], ['blank-title', { title: ' \t ' }],
  ['long-title', { title: 'a'.repeat(121) }],
  ['long-description', { description: 'a'.repeat(2001) }],
  ['invalid-category', { category: 'Invalid' }],
]) {
  test('rejects ' + label + ' without client validation', async () => {
    await seed('alerts/' + label, fixture());
    denied(await update(label, changes));
  });
}

test('accepts exact text limits and optional empty description', async () => {
  await seed('alerts/limits', fixture());
  allowed(await update('limits', { title: 'a'.repeat(120), description: 'a'.repeat(2000) }));
  allowed(await update('limits', { description: '' }));
});

test('membership revocation after prior read blocks update and delete at write time', async () => {
  await seed('alerts/revoked', fixture());
  allowed(await request('/alerts/revoked', 'GET'));
  await seed('groups/group', { members: ['other'] });
  try {
    denied(await update('revoked', { title: 'Denied' }));
    denied(await remove('revoked'));
  } finally {
    await seed('groups/group', { members: ['owner', 'other'] });
  }
});

async function create(id, overrides = {}, serverTimestamp = true) {
  const write = {
    update: { name: documentName('alerts/' + id), fields: fields(fixture(overrides)) },
    currentDocument: { exists: false },
  };
  if (serverTimestamp) write.updateTransforms = [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }];
  return request(':commit', 'POST', { writes: [write] });
}

test('CREATE accepts ATENEA payload with serverTimestamp and rejects client dates and invalid content', async () => {
  allowed(await create('created'));
  denied(await create('client-date', { createdAt: 'client date' }, false));
  denied(await create('missing-date', {}, false));
  denied(await create('create-long', { title: 'a'.repeat(121) }));
  denied(await create('create-blank', { title: '   ' }));
  denied(await create('create-other', { createdBy: 'other' }));
});
