import NativeAteneaBridge, { type SQLiteAlert } from '../../specs/NativeAteneaBridge';
import type { CommunityAlert } from '../types/domain';

function requireJavaBridge() {
  if (!NativeAteneaBridge) {
    throw new Error('El puente Java requiere una compilación nativa de ATENEA para Android.');
  }

  return NativeAteneaBridge;
}

export function getJavaBridgeDiagnostic(): string {
  return requireJavaBridge().getDiagnosticMessage();
}

function toNativeAlert(alert: CommunityAlert): SQLiteAlert {
  return {
    ...alert,
    userId: alert.userId ?? null,
    createdBy: alert.createdBy ?? null,
    latitude: alert.latitude ?? null,
    longitude: alert.longitude ?? null,
    mediaUrl: alert.mediaUrl ?? null,
    mediaType: alert.mediaType ?? null,
    createdAt: alert.createdAt.getTime(),
  };
}

function fromNativeAlert(alert: SQLiteAlert): CommunityAlert {
  return {
    ...alert,
    userId: alert.userId ?? undefined,
    createdBy: alert.createdBy ?? undefined,
    category: alert.category as CommunityAlert['category'],
    soundType: alert.soundType as CommunityAlert['soundType'],
    latitude: alert.latitude ?? undefined,
    longitude: alert.longitude ?? undefined,
    mediaUrl: alert.mediaUrl ?? undefined,
    mediaType: (alert.mediaType ?? undefined) as CommunityAlert['mediaType'],
    createdAt: new Date(alert.createdAt),
  };
}

export const sqliteAlerts = {
  async create(alert: CommunityAlert): Promise<void> {
    await requireJavaBridge().insertAlert(toNativeAlert(alert));
  },
  async list(groupId?: string): Promise<CommunityAlert[]> {
    return (await requireJavaBridge().listAlerts(groupId ?? null)).map(fromNativeAlert);
  },
  async find(id: string): Promise<CommunityAlert | null> {
    const alert = await requireJavaBridge().findAlert(id);
    return alert ? fromNativeAlert(alert) : null;
  },
  async update(alert: CommunityAlert): Promise<boolean> {
    return requireJavaBridge().updateAlert(toNativeAlert(alert));
  },
  async delete(id: string): Promise<boolean> {
    return requireJavaBridge().deleteAlert(id);
  },
};
