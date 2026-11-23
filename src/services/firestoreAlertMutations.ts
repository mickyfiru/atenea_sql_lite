import { deleteDoc, doc, getDocFromServer, updateDoc } from 'firebase/firestore';

import { assertAuthenticatedUser } from '../utils/validation';
import { auth, db } from './firebase';
import {
  isFirestoreAlertOwner,
  validateFirestoreAlertEdits,
  type AlertEdits,
} from './firestoreAlertPolicy';

async function requireOwnedAlert(id: string, uid: string) {
  assertAuthenticatedUser(auth?.currentUser, uid);
  if (!db) throw new Error('Firestore no esta configurado.');
  const ref = doc(db, 'alerts', id);
  const snapshot = await getDocFromServer(ref);
  if (!snapshot.exists()) throw new Error('La alerta ya no existe.');
  const data = snapshot.data();
  if (!isFirestoreAlertOwner(data, uid)) {
    throw new Error('Solo puedes modificar tus propias alertas con autoría confirmada.');
  }
  if (typeof data.groupId !== 'string' || !data.groupId) {
    throw new Error('La alerta no tiene un grupo válido.');
  }
  const group = await getDocFromServer(doc(db, 'groups', data.groupId));
  if (!group.exists() || !Array.isArray(group.data().members) || !group.data().members.includes(uid)) {
    throw new Error('El usuario no pertenece a este grupo.');
  }
  assertAuthenticatedUser(auth?.currentUser, uid);
  return ref;
}

export async function updateFirestoreAlert(id: string, uid: string, edits: AlertEdits) {
  assertAuthenticatedUser(auth?.currentUser, uid);
  const fields = validateFirestoreAlertEdits(edits);
  const ref = await requireOwnedAlert(id, uid);
  // Rules revalidate ownership, membership and immutable fields at write time.
  await updateDoc(ref, {
    title: fields.title,
    description: fields.description,
    category: fields.category,
  });
}

export async function deleteFirestoreAlert(id: string, uid: string) {
  const ref = await requireOwnedAlert(id, uid);
  await deleteDoc(ref);
}
