import AsyncStorage from '@react-native-async-storage/async-storage';

import { AlertCategory } from '../types/domain';

export type AlertSoundPreferences = Record<AlertCategory, boolean>;

const STORAGE_KEY = '@atenea/alert-sound-preferences';
const RECENTLY_HANDLED_MS = 8000;

export const DEFAULT_ALERT_SOUND_PREFERENCES: AlertSoundPreferences = {
  Seguridad: true,
  'Tr\u00e1nsito': true,
  Comunidad: true,
  Servicios: true,
};

const recentlyHandledAlertIds = new Set<string>();

export function markAlertSoundHandled(alertId: string) {
  recentlyHandledAlertIds.add(alertId);

  setTimeout(() => {
    recentlyHandledAlertIds.delete(alertId);
  }, RECENTLY_HANDLED_MS);
}

export function wasAlertSoundHandled(alertId: string) {
  return recentlyHandledAlertIds.has(alertId);
}

export async function loadAlertSoundPreferences(): Promise<AlertSoundPreferences> {
  try {
    const storedPreferences = await AsyncStorage.getItem(STORAGE_KEY);

    if (!storedPreferences) {
      return DEFAULT_ALERT_SOUND_PREFERENCES;
    }

    return {
      ...DEFAULT_ALERT_SOUND_PREFERENCES,
      ...(JSON.parse(storedPreferences) as Partial<AlertSoundPreferences>),
    };
  } catch (error) {
    console.warn('No se pudieron cargar las preferencias de sonido.', error);
    return DEFAULT_ALERT_SOUND_PREFERENCES;
  }
}

export async function saveAlertSoundPreferences(preferences: AlertSoundPreferences) {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...DEFAULT_ALERT_SOUND_PREFERENCES,
      ...preferences,
    }),
  );
}

export async function setAlertSoundEnabled(category: AlertCategory, enabled: boolean) {
  const currentPreferences = await loadAlertSoundPreferences();
  const nextPreferences = {
    ...currentPreferences,
    [category]: enabled,
  };

  await saveAlertSoundPreferences(nextPreferences);

  return nextPreferences;
}

export async function playAlertSound(soundType: AlertCategory) {
  const preferences = await loadAlertSoundPreferences();

  if (!preferences[soundType]) {
    return;
  }

  console.log(
    `[ATENEA startup] Sonido local temporalmente desactivado para ${soundType}.`,
  );
}
