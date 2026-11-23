import type { CommunityAlert } from '../types/domain';

export type AlertEdits = Pick<CommunityAlert, 'title' | 'description' | 'category'>;

// A missing author can use the other field. Present but invalid or conflicting fields deny access.
export function isFirestoreAlertOwner(
  data: { createdBy?: unknown; userId?: unknown },
  uid?: string,
) {
  if (!uid) return false;
  const authors = [data.createdBy, data.userId].filter((value) => value !== undefined);
  return authors.length > 0 && authors.every((value) => value === uid);
}

export function validateFirestoreAlertEdits(edits: AlertEdits): AlertEdits {
  if (typeof edits.title !== 'string' || !edits.title.trim()) {
    throw new Error('Ingresa un titulo para la alerta.');
  }
  const title = edits.title.trim();
  if (title.length > 120) throw new Error('El título admite hasta 120 caracteres.');
  if (typeof edits.description !== 'string' || edits.description.trim().length > 2000) {
    throw new Error('La descripción admite hasta 2000 caracteres.');
  }
  if (!['Seguridad', 'Tránsito', 'Comunidad', 'Servicios'].includes(edits.category)) {
    throw new Error('Categoria de alerta no valida.');
  }
  return { title, description: edits.description.trim(), category: edits.category };
}
