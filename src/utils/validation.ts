import type { User } from 'firebase/auth';

import { AlertCategory, CommunityGroup } from '../types/domain';

const VALID_ALERT_CATEGORIES: AlertCategory[] = [
  'Seguridad',
  'Tr\u00e1nsito',
  'Comunidad',
  'Servicios',
];

export function assertAuthenticatedUser(user: User | null | undefined, expectedUserId?: string) {
  if (!user?.uid) {
    throw new Error('Usuario no autenticado.');
  }

  if (expectedUserId && user.uid !== expectedUserId) {
    throw new Error('El usuario autenticado no coincide con la operacion.');
  }
}

export function assertNonEmptyText(value: string, message: string) {
  if (!value.trim()) {
    throw new Error(message);
  }
}

export function isValidAlertCategory(category: string): category is AlertCategory {
  return VALID_ALERT_CATEGORIES.includes(category as AlertCategory);
}

export function assertValidAlertCategory(category: string) {
  if (!isValidAlertCategory(category)) {
    throw new Error('Categoria de alerta no valida.');
  }
}

export function isValidLatitude(latitude: unknown) {
  return typeof latitude === 'number' && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90;
}

export function isValidLongitude(longitude: unknown) {
  return (
    typeof longitude === 'number' &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function assertValidCoordinates(latitude: unknown, longitude: unknown) {
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    throw new Error('Coordenadas no validas.');
  }
}

export function assertExistingGroup(group?: CommunityGroup): asserts group is CommunityGroup {
  if (!group) {
    throw new Error('El grupo seleccionado no existe.');
  }
}

export function assertGroupMember(group: CommunityGroup, userId: string) {
  if (!group.members.includes(userId)) {
    throw new Error('El usuario no pertenece a este grupo.');
  }
}
