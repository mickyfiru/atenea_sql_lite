import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDocFromServer, onSnapshot, query, where } from 'firebase/firestore';

import type { CommunityAlert } from '../types/domain';
import { assertAuthenticatedUser, assertNonEmptyText, assertValidAlertCategory } from '../utils/validation';
import type { AlertProvider } from './alertProvider';
import { auth, db } from './firebase';
import { sqliteAlerts } from './nativeBridge';
import { markAlertSoundHandled } from './sounds';

const refreshListeners = new Set<(groupId: string) => void>();

export type AlertEdits = Pick<CommunityAlert, 'title' | 'description' | 'category'>;

export function isAlertOwner(alert: CommunityAlert, userId?: string) {
  return Boolean(userId && (alert.createdBy || alert.userId) === userId);
}

async function requireOwnedAlert(id: string, userId: string) {
  assertAuthenticatedUser(auth?.currentUser, userId);
  const alert = await sqliteAlerts.find(id);
  if (!alert || !isAlertOwner(alert, userId)) {
    throw new Error('Solo puedes modificar tus propias alertas.');
  }
  await assertSQLiteAlertGroupMember(alert.groupId, userId);
  return alert;
}

function notifyGroup(groupId: string) {
  refreshListeners.forEach((refresh) => refresh(groupId));
}

export async function updateSQLiteAlert(id: string, userId: string, edits: AlertEdits) {
  const title = edits.title.trim();
  assertNonEmptyText(title, 'Ingresa un titulo para la alerta.');
  assertValidAlertCategory(edits.category);
  const alert = await requireOwnedAlert(id, userId);
  if (!(await sqliteAlerts.update(id, userId, { ...edits, title, description: edits.description.trim() }))) {
    throw new Error('La alerta ya no está disponible para editar.');
  }
  notifyGroup(alert.groupId);
}

export async function deleteSQLiteAlert(id: string, userId: string) {
  const alert = await requireOwnedAlert(id, userId);
  if (!(await sqliteAlerts.delete(id, userId))) {
    throw new Error('La alerta ya no está disponible para eliminar.');
  }
  notifyGroup(alert.groupId);
}

function groupCollection() {
  if (!db) {
    throw new Error('Firestore no esta configurado.');
  }
  return collection(db, 'groups');
}

export async function assertSQLiteAlertGroupMember(groupId: string, userId: string) {
  const group = await getDocFromServer(doc(groupCollection(), groupId));
  if (!group.exists()) {
    throw new Error('El grupo seleccionado no existe.');
  }
  const members = group.data().members;
  if (!Array.isArray(members) || !members.includes(userId)) {
    throw new Error('El usuario no pertenece a este grupo.');
  }
  assertAuthenticatedUser(auth?.currentUser, userId);
}

export const sqliteAlertProvider: AlertProvider = {
  async insert(alert) {
    assertAuthenticatedUser(auth?.currentUser, alert.userId);
    const createdAt = new Date();
    const id = `local-${createdAt.getTime()}-${Math.random().toString(36).slice(2)}`;
    await sqliteAlerts.create({ ...alert, id, createdAt });
    markAlertSoundHandled(id);
    notifyGroup(alert.groupId);
    return id;
  },

  subscribe(groupIds, onAlerts, onError, userId) {
    const requested = new Set(groupIds.filter(Boolean));
    if (!requested.size) {
      onAlerts([]);
      return () => undefined;
    }

    const uid = auth?.currentUser?.uid;
    if (!auth || !uid || (userId && userId !== uid)) {
      onAlerts([]);
      onError(new Error('Usuario no autorizado para consultar alertas.'));
      return () => undefined;
    }

    let active = true;
    let revision = 0;
    let allowed: string[] = [];
    const clear = () => {
      revision++;
      allowed = [];
      onAlerts([]);
    };

    const refresh = async () => {
      const readRevision = ++revision;
      const isCurrent = () => active && revision === readRevision && auth?.currentUser?.uid === uid;
      try {
        const rows = await Promise.all(allowed.map((groupId) => sqliteAlerts.list(groupId)));
        if (isCurrent()) {
          onAlerts(rows.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
        }
      } catch (error) {
        if (isCurrent()) {
          onAlerts([]);
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    };

    const afterWrite = (groupId: string) => {
      if (allowed.includes(groupId)) {
        void refresh();
      }
    };

    const unsubscribeGroups = onSnapshot(
      query(groupCollection(), where('members', 'array-contains', uid)),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!active || auth?.currentUser?.uid !== uid) {
          return;
        }
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) {
          clear();
          return;
        }
        const nextAllowed = snapshot.docs.map((group) => group.id).filter((id) => requested.has(id));
        if (allowed.some((id) => !nextAllowed.includes(id))) {
          clear();
        }
        allowed = nextAllowed;
        void refresh();
      },
      (error) => {
        if (active) {
          clear();
          onError(error);
        }
      },
    );

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (active && user?.uid !== uid) {
        clear();
        unsubscribeGroups();
      }
    });
    refreshListeners.add(afterWrite);

    return () => {
      active = false;
      refreshListeners.delete(afterWrite);
      unsubscribeAuth();
      unsubscribeGroups();
    };
  },
};
