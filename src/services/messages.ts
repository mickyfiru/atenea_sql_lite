import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';

import { Message } from '../types/domain';
import {
  assertAuthenticatedUser,
  assertExistingGroup,
  assertGroupMember,
  assertNonEmptyText,
} from '../utils/validation';
import { auth } from './firebase';
import { db } from './firebase';
import { getGroupById } from './groups';

type FirestoreMessage = {
  groupId: string;
  userId: string;
  text: string;
  createdAt?: Timestamp;
};

function assertFirestore() {
  if (!db) {
    throw new Error('Firestore no esta configurado.');
  }

  return db;
}

function snapshotToMessage(snapshot: QueryDocumentSnapshot<DocumentData>): Message {
  const data = snapshot.data() as FirestoreMessage;

  return {
    id: snapshot.id,
    groupId: data.groupId,
    userId: data.userId,
    text: data.text,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  };
}

export function subscribeGroupMessages(
  groupId: string,
  onMessages: (messages: Message[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const firestore = assertFirestore();
  const messagesQuery = query(collection(firestore, 'messages'), where('groupId', '==', groupId));

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs
        .map(snapshotToMessage)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      onMessages(messages);
    },
    onError,
  );
}

export function subscribeRecentMessagesForGroups(
  groupIds: string[],
  onMessages: (messages: Message[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const firestore = assertFirestore();
  const uniqueGroupIds = [...new Set(groupIds)].filter(Boolean);

  if (!uniqueGroupIds.length) {
    onMessages([]);
    return () => undefined;
  }

  const chunks: string[][] = [];

  for (let index = 0; index < uniqueGroupIds.length; index += 10) {
    chunks.push(uniqueGroupIds.slice(index, index + 10));
  }

  const messageBuckets = new Map<number, Message[]>();
  const flush = () => {
    const messages = Array.from(messageBuckets.values())
      .flat()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 25);

    onMessages(messages);
  };

  const unsubscribes = chunks.map((chunk, index) => {
    const messagesQuery = query(collection(firestore, 'messages'), where('groupId', 'in', chunk));

    return onSnapshot(
      messagesQuery,
      (snapshot) => {
        messageBuckets.set(index, snapshot.docs.map(snapshotToMessage));
        flush();
      },
      onError,
    );
  });

  return () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}

export async function sendGroupMessage(groupId: string, userId: string, text: string) {
  const firestore = assertFirestore();
  const trimmedText = text.trim();
  assertAuthenticatedUser(auth?.currentUser, userId);
  assertNonEmptyText(trimmedText, 'Ingresa un mensaje para enviar.');

  const group = await getGroupById(groupId);
  assertExistingGroup(group);
  assertGroupMember(group, userId);

  await addDoc(collection(firestore, 'messages'), {
    groupId,
    userId,
    text: trimmedText,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(firestore, 'groups', groupId), {
    lastMessage: trimmedText,
    lastMessageAt: serverTimestamp(),
  });
}
