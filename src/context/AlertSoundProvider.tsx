import { PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from './AuthContext';
import { subscribeAlertsForGroups } from '../services/alerts';
import { subscribeUserGroups } from '../services/groups';
import { CommunityAlert } from '../types/domain';

export function AlertSoundProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const groupIdsKey = useMemo(() => groupIds.join('|'), [groupIds]);
  const hydratedRef = useRef(false);
  const seenAlertIdsRef = useRef(new Set<string>());

  useEffect(() => {
    hydratedRef.current = false;
    seenAlertIdsRef.current.clear();
    setGroupIds([]);
  }, [user?.uid]);

  useEffect(() => {
    if (!user) {
      return;
    }

    console.log('[ATENEA startup] Loading notifications after auth.');

    void import('../services/notifications')
      .then((notifications) => notifications.registerExpoPushToken(user.uid))
      .catch((error) => console.warn('No se pudo cargar expo-notifications.', error));
  }, [user]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    return subscribeUserGroups(
      user.uid,
      (groups) => {
        const nextGroupIds = groups.map((group) => group.id).sort();

        setGroupIds((currentGroupIds) => {
          const currentKey = currentGroupIds.join('|');
          const nextKey = nextGroupIds.join('|');

          return currentKey === nextKey ? currentGroupIds : nextGroupIds;
        });
      },
      (error) => console.warn('No se pudieron escuchar grupos para sonidos.', error),
    );
  }, [user]);

  useEffect(() => {
    const ids = groupIdsKey ? groupIdsKey.split('|') : [];
    hydratedRef.current = false;
    seenAlertIdsRef.current.clear();

    if (!user || !ids.length) {
      return undefined;
    }

    return subscribeAlertsForGroups(
      ids,
      (alerts) => handleIncomingAlerts(alerts),
      (error) => console.warn('No se pudieron escuchar alertas para sonidos.', error),
    );
  }, [groupIdsKey, user]);

  function handleIncomingAlerts(alerts: CommunityAlert[]) {
    if (!hydratedRef.current) {
      alerts.forEach((alert) => seenAlertIdsRef.current.add(alert.id));
      hydratedRef.current = true;
      return;
    }

    const newAlerts = alerts.filter((alert) => !seenAlertIdsRef.current.has(alert.id));
    newAlerts.forEach((alert) => seenAlertIdsRef.current.add(alert.id));

    newAlerts.slice(0, 3).forEach((alert) => {
      void handleNewAlert(alert);
    });
  }

  async function handleNewAlert(alert: CommunityAlert) {
    try {
      const [sounds, notifications] = await Promise.all([
        import('../services/sounds'),
        import('../services/notifications'),
      ]);

      if (sounds.wasAlertSoundHandled(alert.id)) {
        return;
      }

      sounds.markAlertSoundHandled(alert.id);
      await notifications.sendLocalAlertNotification(alert);
    } catch (error) {
      console.warn('No se pudo manejar la notificacion local de alerta.', error);
    }
  }

  return <>{children}</>;
}
