import * as Notifications from 'expo-notifications';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { AlertCategory, CommunityAlert } from '../types/domain';
import { db } from './firebase';
import { loadAlertSoundPreferences } from './sounds';

const CATEGORY_SOUND_FILES: Record<AlertCategory, string> = {
  Seguridad: 'security.wav',
  'Tr\u00e1nsito': 'traffic.wav',
  Comunidad: 'community.wav',
  Servicios: 'services.wav',
};

const CATEGORY_CHANNELS: Record<AlertCategory, string> = {
  Seguridad: 'atenea-security-alerts',
  'Tr\u00e1nsito': 'atenea-traffic-alerts',
  Comunidad: 'atenea-community-alerts',
  Servicios: 'atenea-services-alerts',
};

const SILENT_CHANNEL_ID = 'atenea-alerts-silent';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const category = notification.request.content.data?.category;
    const preferences = await loadAlertSoundPreferences();
    const shouldPlaySound =
      typeof category === 'string' &&
      category in CATEGORY_SOUND_FILES &&
      preferences[category as AlertCategory];

    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound,
      shouldSetBadge: false,
    };
  },
});

function assertFirestore() {
  if (!db) {
    throw new Error('Firestore no esta configurado.');
  }

  return db;
}

async function ensureNotificationChannels() {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await Notifications.deleteNotificationChannelAsync(SILENT_CHANNEL_ID);
    await Promise.all(
      Object.values(CATEGORY_CHANNELS).map((channelId) =>
        Notifications.deleteNotificationChannelAsync(channelId),
      ),
    );
  } catch (error) {
    console.warn('No se pudieron reiniciar canales de notificaciones.', error);
  }

  try {
    await Notifications.setNotificationChannelAsync(SILENT_CHANNEL_ID, {
      name: 'ATENEA alertas silenciosas',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
    });

    await Promise.all(
      Object.entries(CATEGORY_CHANNELS).map(([category, channelId]) =>
        Notifications.setNotificationChannelAsync(channelId, {
          name: `ATENEA ${category}`,
          importance: Notifications.AndroidImportance.HIGH,
          sound: CATEGORY_SOUND_FILES[category as AlertCategory],
          vibrationPattern: [0, 220, 120, 220],
        }),
      ),
    );
  } catch (error) {
    console.warn('No se pudieron configurar sonidos de notificacion.', error);
  }
}

export async function requestNotificationPermission() {
  const currentPermissions = await Notifications.getPermissionsAsync();

  if (
    currentPermissions.granted ||
    currentPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();

  return (
    requestedPermissions.granted ||
    requestedPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function registerExpoPushToken(userId: string) {
  const firestore = assertFirestore();

  try {
    const permissionGranted = await requestNotificationPermission();

    if (!permissionGranted) {
      await setDoc(
        doc(firestore, 'users', userId),
        {
          expoPushToken: '',
          notificationsEnabled: false,
          notificationsUpdatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      return '';
    }

    await ensureNotificationChannels();

    const expoToken = await Notifications.getExpoPushTokenAsync();
    await setDoc(
      doc(firestore, 'users', userId),
      {
        expoPushToken: expoToken.data,
        notificationsEnabled: true,
        notificationsUpdatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return expoToken.data;
  } catch (error) {
    console.warn('No se pudo registrar expoPushToken.', error);
    await setDoc(
      doc(firestore, 'users', userId),
      {
        notificationsEnabled: false,
        notificationsUpdatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return '';
  }
}

export async function sendLocalAlertNotification(alert: CommunityAlert) {
  const preferences = await loadAlertSoundPreferences();
  const soundEnabled = preferences[alert.soundType];
  const channelId = soundEnabled ? CATEGORY_CHANNELS[alert.soundType] : SILENT_CHANNEL_ID;

  await ensureNotificationChannels();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${alert.category}: ${alert.title}`,
      body: alert.description || 'Nueva alerta comunitaria.',
      data: {
        alertId: alert.id,
        groupId: alert.groupId,
        category: alert.category,
      },
      sound: soundEnabled ? CATEGORY_SOUND_FILES[alert.soundType] : false,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: Platform.OS === 'android' ? { channelId } : null,
  });
}

export function buildRemoteAlertPushPayload(alert: CommunityAlert, expoPushToken: string) {
  return {
    to: expoPushToken,
    sound: CATEGORY_SOUND_FILES[alert.soundType],
    title: `${alert.category}: ${alert.title}`,
    body: alert.description || 'Nueva alerta comunitaria.',
    data: {
      alertId: alert.id,
      groupId: alert.groupId,
      category: alert.category,
    },
  };
}
