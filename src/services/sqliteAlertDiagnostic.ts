import type { CommunityAlert } from '../types/domain';
import { getJavaBridgeDiagnostic, sqliteAlerts } from './nativeBridge';

function check(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectRejected(operation: () => Promise<unknown>, expected: RegExp) {
  try {
    await operation();
  } catch (error) {
    check(error instanceof Error && expected.test(error.message), 'La operación falló por un motivo inesperado.');
    return;
  }
  throw new Error('Se aceptó una operación inválida.');
}

export async function runSQLiteAlertDiagnostic(phase: 'seed' | 'verify', runId: string) {
  check(/^[a-f0-9]{32}$/.test(runId), 'Se requiere un identificador de prueba único.');
  check(getJavaBridgeDiagnostic() === 'ATENEA_JAVA_OK', 'El puente Java no respondió.');
  const id = `atenea-sqlite-test-${runId}`;
  const owner = `${id}-owner`;
  const fixture: CommunityAlert = {
    id,
    groupId: id,
    createdBy: owner,
    title: "Prueba de SQLite 'ATENEA'",
    description: 'Registro de diagnóstico',
    category: 'Tránsito',
    soundType: 'Tránsito',
    latitude: -33.45,
    longitude: -70.66,
    city: 'Santiago',
    district: '',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const updatedTitle = 'Registro actualizado';
  const existing = await sqliteAlerts.find(id);

  if (phase === 'seed') {
    check(existing === null, 'El identificador de prueba ya existe.');
    const invalidInputs: [Partial<CommunityAlert>, RegExp][] = [
      [{ title: '' }, /Ingresa/],
      [{ title: '   ' }, /Ingresa/],
      [{ title: 'a'.repeat(121) }, /120/],
      [{ description: 'a'.repeat(2001) }, /2000/],
      [{ category: 'Inválida' as CommunityAlert['category'] }, /Categoría/],
    ];
    for (const [changes, expected] of invalidInputs) {
      await expectRejected(() => sqliteAlerts.create({ ...fixture, ...changes }), expected);
    }
    check((await sqliteAlerts.find(id)) === null, 'Una creación fallida dejó un registro.');
    await sqliteAlerts.create(fixture);
    await expectRejected(() => sqliteAlerts.create(fixture), /UNIQUE constraint failed/);
    for (const [changes, expected] of invalidInputs) {
      await expectRejected(() => sqliteAlerts.update(id, owner, { ...fixture, ...changes }), expected);
    }
    check((await sqliteAlerts.list(`${id}-other-group`)).length === 0, 'Se devolvió una alerta de otro grupo.');
    const created = await sqliteAlerts.find(id);
    check(
      created?.title === fixture.title && created.latitude === fixture.latitude &&
        created.longitude === fixture.longitude && created.userId === undefined &&
        created.category === fixture.category && created.createdAt.getTime() === fixture.createdAt.getTime(),
      'La consulta por identificador no coincide con el registro insertado.',
    );
    const byGroup = await sqliteAlerts.list(fixture.groupId);
    check(byGroup.length === 1 && byGroup[0].id === id, 'La consulta por grupo falló.');
    check((await sqliteAlerts.list()).some((alert) => alert.id === id), 'La consulta general falló.');
    check(!(await sqliteAlerts.update(id, `${id}-other`, { ...fixture, title: 'Edición ajena' })), 'Java permitió una edición ajena.');
    check(!(await sqliteAlerts.delete(id, `${id}-other`)), 'Java permitió un borrado ajeno.');
    check((await sqliteAlerts.find(id))?.title === fixture.title, 'La alerta cambió pese al rechazo.');
    console.log('[ATENEA SQLite] VALIDATION_AND_ATOMICITY_OK');
    console.log('[ATENEA SQLite] NATIVE_OWNERSHIP_OK');
    check(await sqliteAlerts.update(id, owner, { ...fixture, title: updatedTitle }), 'Falló la actualización.');
    check((await sqliteAlerts.find(id))?.title === updatedTitle, 'No se encontró el título actualizado.');
    console.log('[ATENEA SQLite] ATENEA_JAVA_OK SEED_OK', id);
    return;
  }

  check(
    existing?.groupId === fixture.groupId && existing.description === fixture.description &&
      existing.title === updatedTitle && existing.createdAt.getTime() === fixture.createdAt.getTime() &&
      existing.latitude === fixture.latitude && existing.longitude === fixture.longitude,
    'El registro actualizado no persistió tras reiniciar.',
  );
  check(await sqliteAlerts.delete(id, owner), 'Falló el borrado del registro de prueba.');
  check((await sqliteAlerts.find(id)) === null, 'El registro de prueba sigue presente.');
  check((await sqliteAlerts.list(fixture.groupId)).length === 0, 'El grupo de prueba contiene registros.');
  console.log('[ATENEA SQLite] ATENEA_JAVA_OK PERSISTENCE_AND_DELETE_OK', id);
}
