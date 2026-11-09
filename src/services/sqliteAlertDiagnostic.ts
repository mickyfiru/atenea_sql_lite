import type { CommunityAlert } from '../types/domain';
import { getJavaBridgeDiagnostic, sqliteAlerts } from './nativeBridge';

function check(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export async function runSQLiteAlertDiagnostic(phase: 'seed' | 'verify', runId: string) {
  check(/^[a-f0-9]{32}$/.test(runId), 'Se requiere un identificador de prueba único.');
  check(getJavaBridgeDiagnostic() === 'ATENEA_JAVA_OK', 'El puente Java no respondió.');
  const id = `atenea-sqlite-test-${runId}`;
  const fixture: CommunityAlert = {
    id,
    groupId: id,
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
    await sqliteAlerts.create(fixture);
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
    check(await sqliteAlerts.update({ ...fixture, title: updatedTitle, latitude: undefined, longitude: undefined }), 'Falló la actualización.');
    check((await sqliteAlerts.find(id))?.title === updatedTitle, 'No se encontró el título actualizado.');
    console.log('[ATENEA SQLite] ATENEA_JAVA_OK SEED_OK', id);
    return;
  }

  check(
    existing?.groupId === fixture.groupId && existing.description === fixture.description &&
      existing.title === updatedTitle && existing.createdAt.getTime() === fixture.createdAt.getTime() &&
      existing.latitude === undefined && existing.longitude === undefined,
    'El registro actualizado no persistió tras reiniciar.',
  );
  check(await sqliteAlerts.delete(id), 'Falló el borrado del registro de prueba.');
  check((await sqliteAlerts.find(id)) === null, 'El registro de prueba sigue presente.');
  check((await sqliteAlerts.list(fixture.groupId)).length === 0, 'El grupo de prueba contiene registros.');
  console.log('[ATENEA SQLite] ATENEA_JAVA_OK PERSISTENCE_AND_DELETE_OK', id);
}
