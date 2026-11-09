import { Ionicons } from '@expo/vector-icons';
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';

import { colors } from '../constants/theme';
import { CommunityGroup } from '../types/domain';
import { formatRelativeTime } from '../utils/dates';
import { assertAuthenticatedUser, assertNonEmptyText } from '../utils/validation';
import { auth, db } from './firebase';

const DEFAULT_GROUPS = [
  {
    id: 'default-police',
    name: 'Policia',
    icon: 'shield-checkmark-outline',
    iconColor: colors.primary,
    iconBackground: colors.primarySoft,
    lastMessage: 'Canal predeterminado de seguridad',
  },
  {
    id: 'default-firefighters',
    name: 'Bomberos',
    icon: 'flame-outline',
    iconColor: colors.danger,
    iconBackground: colors.dangerSoft,
    lastMessage: 'Canal predeterminado de emergencia',
  },
  {
    id: 'default-ambulance',
    name: 'Ambulancia',
    icon: 'pulse-outline',
    iconColor: colors.success,
    iconBackground: colors.successSoft,
    lastMessage: 'Canal predeterminado de salud',
  },
] as const;

type FirestoreGroup = {
  name: string;
  type: 'emergency' | 'community';
  createdBy: string;
  members: string[];
  createdAt?: Timestamp;
  lastMessage?: string;
  lastMessageAt?: Timestamp;
};

type FirebaseErrorLike = Error & {
  code?: string;
};

type FirestoreDebugDetails = {
  functionName?: string;
  query?: string;
  groupIds?: string[];
};

function assertFirestore() {
  if (!db) {
    throw new Error('Firestore no esta configurado.');
  }

  return db;
}

function groupLogContext(userId?: string) {
  const currentUser = auth?.currentUser;

  return {
    'user.uid': currentUser?.uid ?? userId ?? '',
    'user.isAnonymous': currentUser?.isAnonymous ?? false,
  };
}

function logGroupStart(event: string, userId?: string, details: FirestoreDebugDetails = {}) {
  console.log(`[groups] ${event}`, {
    ...groupLogContext(userId),
    functionName: details.functionName ?? event,
    query: details.query ?? '',
    groupIds: details.groupIds ?? [],
  });
}

function logGroupError(
  event: string,
  userId: string | undefined,
  error: unknown,
  details: FirestoreDebugDetails = {},
) {
  const firebaseError = error as Partial<FirebaseErrorLike>;

  console.error(`[groups] ${event}`, {
    ...groupLogContext(userId),
    functionName: details.functionName ?? event,
    query: details.query ?? '',
    groupIds: details.groupIds ?? [],
    'error.code': firebaseError.code ?? 'unknown',
    'error.message': firebaseError.message ?? String(error),
  });
}

function logGroupWarning(
  event: string,
  userId: string | undefined,
  error: unknown,
  details: FirestoreDebugDetails = {},
) {
  const firebaseError = error as Partial<FirebaseErrorLike>;

  console.warn(`[groups] ${event}`, {
    ...groupLogContext(userId),
    functionName: details.functionName ?? event,
    query: details.query ?? '',
    groupIds: details.groupIds ?? [],
    'error.code': firebaseError.code ?? 'unknown',
    'error.message': firebaseError.message ?? String(error),
  });
}

function groupStyle(group: Pick<CommunityGroup, 'id' | 'type'> & { name: string }) {
  if (group.id === 'default-police') {
    return {
      icon: 'shield-checkmark-outline' as keyof typeof Ionicons.glyphMap,
      iconColor: colors.primary,
      iconBackground: colors.primarySoft,
    };
  }

  if (group.id === 'default-firefighters') {
    return {
      icon: 'flame-outline' as keyof typeof Ionicons.glyphMap,
      iconColor: colors.danger,
      iconBackground: colors.dangerSoft,
    };
  }

  if (group.id === 'default-ambulance') {
    return {
      icon: 'pulse-outline' as keyof typeof Ionicons.glyphMap,
      iconColor: colors.success,
      iconBackground: colors.successSoft,
    };
  }

  return {
    icon: group.name.toLowerCase().includes('famil') ? 'people-outline' : 'chatbubbles-outline',
    iconColor: colors.primary,
    iconBackground: colors.soft,
  };
}

function snapshotToGroup(snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): CommunityGroup {
  const data = snapshot.data() as FirestoreGroup;
  const lastMessageAt = data.lastMessageAt?.toDate();
  const style = groupStyle({
    id: snapshot.id,
    name: data.name,
    type: data.type,
  });

  return {
    id: snapshot.id,
    name: data.name,
    type: data.type,
    createdBy: data.createdBy,
    members: data.members ?? [],
    createdAt: data.createdAt?.toDate() ?? new Date(),
    lastMessage: data.lastMessage || 'Sin mensajes todavia',
    lastMessageAt,
    time: formatRelativeTime(lastMessageAt),
    icon: style.icon,
    iconColor: style.iconColor,
    iconBackground: style.iconBackground,
  };
}

function sortGroups(groups: CommunityGroup[]) {
  return groups.sort(
    (a, b) =>
      (b.lastMessageAt?.getTime() ?? b.createdAt.getTime()) -
      (a.lastMessageAt?.getTime() ?? a.createdAt.getTime()),
  );
}

export async function ensureDefaultGroupsForUser(userId: string) {
  const firestore = assertFirestore();
  logGroupStart('ensureDefaultGroupsForUser:start', userId, {
    functionName: 'ensureDefaultGroupsForUser',
    query: 'doc(groups/{defaultGroupId})',
    groupIds: DEFAULT_GROUPS.map((group) => group.id),
  });

  try {
    assertAuthenticatedUser(auth?.currentUser, userId);

    await Promise.all(
      DEFAULT_GROUPS.map(async (group) => {
        const groupRef = doc(firestore, 'groups', group.id);
        const snapshot = await getDoc(groupRef);

        if (snapshot.exists()) {
          const members = snapshot.data().members;

          if (Array.isArray(members) && members.includes(userId)) {
            return;
          }

          await updateDoc(groupRef, {
            members: arrayUnion(userId),
          });
          return;
        }

        await setDoc(
          groupRef,
          {
            id: group.id,
            name: group.name,
            type: 'emergency',
            createdBy: userId,
            members: [userId],
            createdAt: serverTimestamp(),
            lastMessage: group.lastMessage,
            lastMessageAt: serverTimestamp(),
          },
        );
      }),
    );
  } catch (error) {
    logGroupError('ensureDefaultGroupsForUser:error', userId, error, {
      functionName: 'ensureDefaultGroupsForUser',
      query: 'doc(groups/{defaultGroupId})',
      groupIds: DEFAULT_GROUPS.map((group) => group.id),
    });
    throw error;
  }
}

export function subscribeDefaultGroups(
  userId: string,
  onGroups: (groups: CommunityGroup[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const firestore = assertFirestore();
  const defaultGroups = new Map<string, CommunityGroup>();
  const defaultGroupIds = DEFAULT_GROUPS.map((group) => group.id);
  logGroupStart('subscribeDefaultGroups:start', userId, {
    functionName: 'subscribeDefaultGroups',
    query: 'doc(groups/default-police), doc(groups/default-firefighters), doc(groups/default-ambulance)',
    groupIds: defaultGroupIds,
  });

  const emitDefaultGroups = () => {
    onGroups(sortGroups(Array.from(defaultGroups.values())));
  };

  const unsubscribes = DEFAULT_GROUPS.map((group) => {
    const groupRef = doc(firestore, 'groups', group.id);

    return onSnapshot(
      groupRef,
      (snapshot) => {
        if (snapshot.exists()) {
          defaultGroups.set(snapshot.id, snapshotToGroup(snapshot));
        } else {
          defaultGroups.delete(group.id);
        }

        emitDefaultGroups();
      },
      (error) => {
        logGroupError('subscribeDefaultGroups:error', userId, error, {
          functionName: 'subscribeDefaultGroups',
          query: `doc(groups/${group.id})`,
          groupIds: [group.id],
        });
        onError(error);
      },
    );
  });

  return () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}

export function subscribeUserGroups(
  userId: string,
  onGroups: (groups: CommunityGroup[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const firestore = assertFirestore();
  const groupMembershipQuery = "query(groups, where('members', 'array-contains', user.uid))";
  logGroupStart('subscribeUserGroups:start', userId, {
    functionName: 'subscribeUserGroups',
    query: groupMembershipQuery,
    groupIds: [],
  });
  const groupsQuery = query(
    collection(firestore, 'groups'),
    where('members', 'array-contains', userId),
  );

  return onSnapshot(
    groupsQuery,
    (snapshot) => {
      const nextGroups = sortGroups(snapshot.docs.map(snapshotToGroup));

      console.log('[groups] subscribeUserGroups:snapshot', {
        'user.uid': userId,
        documentCount: snapshot.docs.length,
        groupIds: snapshot.docs.map((groupSnapshot) => groupSnapshot.id),
        groupTypes: snapshot.docs.map((groupSnapshot) => ({
          id: groupSnapshot.id,
          type: groupSnapshot.data().type,
        })),
        members: snapshot.docs.map((groupSnapshot) => ({
          id: groupSnapshot.id,
          members: groupSnapshot.data().members,
          membersIsArray: Array.isArray(groupSnapshot.data().members),
          includesUser: Array.isArray(groupSnapshot.data().members)
            ? groupSnapshot.data().members.includes(userId)
            : false,
        })),
      });

      console.log('[groups] subscribeUserGroups:emit', {
        'user.uid': userId,
        documentCount: nextGroups.length,
        groupIds: nextGroups.map((group) => group.id),
        groupTypes: nextGroups.map((group) => ({
          id: group.id,
          type: group.type,
        })),
      });

      onGroups(nextGroups);
    },
    (error) => {
      if ((error as FirebaseErrorLike).code === 'permission-denied') {
        logGroupWarning('subscribeUserGroups permission-denied fallback []', userId, error, {
          functionName: 'subscribeUserGroups',
          query: groupMembershipQuery,
          groupIds: [],
        });
        onGroups([]);
        return;
      }

      logGroupError('subscribeUserGroups:error', userId, error, {
        functionName: 'subscribeUserGroups',
        query: groupMembershipQuery,
        groupIds: [],
      });
      onError(error);
    },
  );
}

export async function createGroup(userId: string, name: string) {
  const firestore = assertFirestore();
  logGroupStart('createGroup:start', userId, {
    functionName: 'createGroup',
    query: 'setDoc(doc(collection(groups)))',
    groupIds: [],
  });

  try {
    const trimmedName = name.trim();
    const currentUser = auth?.currentUser;
    assertAuthenticatedUser(currentUser, userId);
    assertNonEmptyText(trimmedName, 'Ingresa un nombre para el grupo.');

    const ownerId = currentUser?.uid;
    if (!ownerId) {
      throw new Error('Usuario no autenticado.');
    }

    const groupRef = doc(collection(firestore, 'groups'));
    const groupId = groupRef.id;

    await setDoc(groupRef, {
      id: groupId,
      name: trimmedName,
      type: 'community',
      createdBy: ownerId,
      members: [ownerId],
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
    });

    return groupId;
  } catch (error) {
    logGroupError('createGroup:error', userId, error, {
      functionName: 'createGroup',
      query: 'setDoc(doc(collection(groups)))',
      groupIds: [],
    });
    throw error;
  }
}

export async function joinGroupByCode(userId: string, code: string) {
  const firestore = assertFirestore();
  const groupId = code.trim();
  assertAuthenticatedUser(auth?.currentUser, userId);

  if (!groupId) {
    throw new Error('Ingresa un codigo de invitacion.');
  }

  const groupRef = doc(firestore, 'groups', groupId);

  try {
    await updateDoc(groupRef, {
      members: arrayUnion(userId),
    });
  } catch {
    throw new Error('No encontramos un grupo con ese codigo.');
  }

  return groupId;
}

export async function getGroupById(groupId: string) {
  const firestore = assertFirestore();
  const snapshot = await getDoc(doc(firestore, 'groups', groupId));

  if (!snapshot.exists()) {
    return undefined;
  }

  return snapshotToGroup(snapshot as QueryDocumentSnapshot<DocumentData>);
}

export async function readGroupByIdForDiagnostics(groupId: string, userId: string) {
  const firestore = assertFirestore();
  const snapshot = await getDoc(doc(firestore, 'groups', groupId));
  const data = snapshot.data();
  const members = data?.members;
  const membersIsArray = Array.isArray(members);
  const includesUser = membersIsArray ? members.includes(userId) : false;

  console.log('[groups] readGroupByIdForDiagnostics', {
    groupId,
    exists: snapshot.exists(),
    'user.uid': userId,
    type: data?.type,
    members,
    membersIsArray,
    membersType: typeof members,
    includesUser,
  });

  return {
    exists: snapshot.exists(),
    group: snapshot.exists() ? snapshotToGroup(snapshot) : undefined,
    members,
    membersIsArray,
    includesUser,
  };
}
