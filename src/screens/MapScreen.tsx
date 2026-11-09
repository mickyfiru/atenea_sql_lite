import { Ionicons } from '@expo/vector-icons';
import Mapbox, {
  Camera,
  MapView,
  MarkerView,
  type Camera as MapboxCamera,
} from '@rnmapbox/maps';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryFilter, CategoryFilterValue } from '../components/CategoryFilter';
import { colors } from '../constants/theme';
import { mapboxConfig } from '../config/mapbox';
import { useAuth } from '../context/AuthContext';
import { RootScreenProps } from '../navigation/types';
import { subscribeAlertsForGroups } from '../services/alerts';
import { subscribeDefaultGroups, subscribeUserGroups } from '../services/groups';
import { subscribeUserLocation } from '../services/location';
import { CommunityAlert, CommunityGroup, UserLocation } from '../types/domain';
import { getAlertCategoryTone } from '../utils/alerts';
import { formatRelativeTime } from '../utils/dates';
import { formatDistance, getAlertDistanceKm, isAlertWithinKm } from '../utils/distance';

type Coordinate = [number, number];
const IQUIQUE_FALLBACK_COORDINATE: Coordinate = [-70.1404, -20.21049];

type FirebaseErrorLike = Error & {
  code?: string;
};

function mapScreenUserLogContext(user?: { uid: string; isAnonymous: boolean } | null) {
  return {
    'user.uid': user?.uid ?? '',
    'user.isAnonymous': user?.isAnonymous ?? false,
  };
}

function logMapScreenError(
  functionName: string,
  error: unknown,
  user: { uid: string; isAnonymous: boolean } | null | undefined,
  queryText: string,
  groupIds: string[] = [],
) {
  const firebaseError = error as Partial<FirebaseErrorLike>;

  console.error(`[MapScreen] ${functionName}:error`, {
    functionName,
    ...mapScreenUserLogContext(user),
    query: queryText,
    groupIds,
    'error.code': firebaseError.code ?? 'unknown',
    'error.message': firebaseError.message ?? String(error),
  });
}

export function MapScreen({ navigation }: RootScreenProps<'Map'>) {
  const { user } = useAuth();
  const cameraRef = useRef<MapboxCamera>(null);
  const [userGroups, setUserGroups] = useState<CommunityGroup[]>([]);
  const [defaultGroups, setDefaultGroups] = useState<CommunityGroup[]>([]);
  const [alerts, setAlerts] = useState<CommunityAlert[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation>();
  const [selectedAlert, setSelectedAlert] = useState<CommunityAlert>();
  const [filter, setFilter] = useState<CategoryFilterValue>('Todas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('[MapScreen:mapboxToken]', mapboxConfig.accessToken ? 'present' : 'missing');

    if (mapboxConfig.accessToken) {
      try {
        void Mapbox.setAccessToken(mapboxConfig.accessToken);
      } catch (mapboxError) {
        console.warn('No se pudo inicializar Mapbox.', mapboxError);
        setError('No pudimos inicializar Mapbox en este dispositivo.');
      }
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setUserGroups([]);
      setDefaultGroups([]);
      setLoading(false);
      return undefined;
    }

    const groupsQueryText = "subscribeUserGroups -> query(groups, where('members', 'array-contains', user.uid))";
    const defaultGroupsQueryText =
      'subscribeDefaultGroups -> doc(groups/default-police), doc(groups/default-firefighters), doc(groups/default-ambulance)';
    console.log('[MapScreen] MapScreen:loadGroups:start', {
      functionName: 'MapScreen:loadGroups',
      ...mapScreenUserLogContext(user),
      query: `${groupsQueryText}; ${defaultGroupsQueryText}`,
      groupIds: [],
    });

    const unsubscribeUserGroups = subscribeUserGroups(
      user.uid,
      (nextGroups) => {
        console.log('[MapScreen] MapScreen:loadGroups:userGroups', {
          functionName: 'MapScreen:loadGroups',
          ...mapScreenUserLogContext(user),
          query: groupsQueryText,
          groupIds: nextGroups.map((group) => group.id),
          groupCount: nextGroups.length,
        });
        setUserGroups(nextGroups);
        setLoading(false);
      },
      (groupsError) => {
        logMapScreenError('MapScreen:loadGroups', groupsError, user, groupsQueryText);
        setError(`[MapScreen:loadGroups] ${groupsError.message}`);
        setLoading(false);
      },
    );

    const unsubscribeDefaultGroups = subscribeDefaultGroups(
      user.uid,
      (nextGroups) => {
        console.log('[MapScreen] MapScreen:loadGroups:defaultGroups', {
          functionName: 'MapScreen:loadGroups',
          ...mapScreenUserLogContext(user),
          query: defaultGroupsQueryText,
          groupIds: nextGroups.map((group) => group.id),
          groupCount: nextGroups.length,
        });
        setDefaultGroups(nextGroups);
        setLoading(false);
      },
      (groupsError) => {
        logMapScreenError('MapScreen:loadGroups', groupsError, user, defaultGroupsQueryText);
        setError(`[MapScreen:loadGroups] ${groupsError.message}`);
        setLoading(false);
      },
    );

    return () => {
      unsubscribeUserGroups();
      unsubscribeDefaultGroups();
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUserLocation(undefined);
      return undefined;
    }

    const locationQueryText = 'doc(users/user.uid)';
    console.log('[MapScreen] MapScreen:loadLocation:start', {
      functionName: 'MapScreen:loadLocation',
      ...mapScreenUserLogContext(user),
      query: locationQueryText,
      groupIds: [],
    });

    return subscribeUserLocation(
      user.uid,
      (nextLocation) => {
        console.log('[MapScreen] MapScreen:loadLocation:success', {
          functionName: 'MapScreen:loadLocation',
          ...mapScreenUserLogContext(user),
          query: locationQueryText,
          groupIds: [],
          locationEnabled: nextLocation.locationEnabled,
        });
        setUserLocation(nextLocation);
      },
      (locationError) => {
        logMapScreenError('MapScreen:loadLocation', locationError, user, locationQueryText);
        setError(`[MapScreen:loadLocation] ${locationError.message}`);
      },
    );
  }, [user]);

  const groups = useMemo(() => {
    const mergedGroups = new Map<string, CommunityGroup>();

    defaultGroups.forEach((group) => {
      mergedGroups.set(group.id, group);
    });

    userGroups.forEach((group) => {
      mergedGroups.set(group.id, group);
    });

    const nextGroups = Array.from(mergedGroups.values());

    console.log('[MapScreen] MapScreen:loadGroups:mergedGroups', {
      functionName: 'MapScreen:loadGroups',
      ...mapScreenUserLogContext(user),
      groupIds: nextGroups.map((group) => group.id),
      userGroupIds: userGroups.map((group) => group.id),
      defaultGroupIds: defaultGroups.map((group) => group.id),
    });

    return nextGroups;
  }, [defaultGroups, user, userGroups]);

  useEffect(() => {
    if (!user) {
      setAlerts([]);
      return undefined;
    }

    const memberGroupIds = groups
      .filter((group) => group.members.includes(user.uid))
      .map((group) => group.id);
    const alertsQueryText = "query(alerts, where('groupId', 'in', groupIdsChunk))";

    console.log('[MapScreen] MapScreen:loadAlerts:start', {
      functionName: 'MapScreen:loadAlerts',
      ...mapScreenUserLogContext(user),
      query: memberGroupIds.length ? alertsQueryText : 'none; skipped because groupIds is empty',
      groupIds: memberGroupIds,
      allGroups: groups.map((group) => ({
        id: group.id,
        type: group.type,
        isMember: group.members.includes(user.uid),
      })),
    });

    if (!memberGroupIds.length) {
      console.log('[MapScreen] MapScreen:loadAlerts:skip', {
        functionName: 'MapScreen:loadAlerts',
        ...mapScreenUserLogContext(user),
        query: 'none; skipped because groupIds is empty',
        groupIds: [],
      });
      setAlerts([]);
      return undefined;
    }

    return subscribeAlertsForGroups(
      memberGroupIds,
      (nextAlerts) => {
        console.log('[MapScreen] MapScreen:loadAlerts:success', {
          functionName: 'MapScreen:loadAlerts',
          ...mapScreenUserLogContext(user),
          query: alertsQueryText,
          groupIds: memberGroupIds,
          alertCount: nextAlerts.length,
        });
        setAlerts(nextAlerts);
        setError('');
      },
      (alertsError) => {
        logMapScreenError('MapScreen:loadAlerts', alertsError, user, alertsQueryText, memberGroupIds);
        setError(`[MapScreen:loadAlerts] ${alertsError.message}`);
      },
      user.uid,
    );
  }, [groups, user]);

  const userCoordinate = useMemo(() => getUserCoordinate(userLocation), [userLocation]);
  const mapAlerts = useMemo(
    () =>
      alerts
        .filter((alert) => getAlertCoordinate(alert))
        .filter((alert) => filter === 'Todas' || alert.category === filter)
        .filter((alert) =>
          userLocation?.locationEnabled
            ? isAlertWithinKm(alert, userLocation, mapboxConfig.nearbyRadiusKm)
            : true,
        ),
    [alerts, filter, userLocation],
  );

  const centerCoordinate = userCoordinate ?? getAlertCoordinate(mapAlerts[0]) ?? IQUIQUE_FALLBACK_COORDINATE;
  const selectedDistance = selectedAlert
    ? formatDistance(getAlertDistanceKm(selectedAlert, userLocation))
    : '';

  function centerOnUser() {
    if (!userCoordinate) {
      setError('Activa tu ubicacion para centrar el mapa.');
      return;
    }

    cameraRef.current?.setCamera({
      centerCoordinate: userCoordinate,
      zoomLevel: 15,
      animationDuration: 600,
    });
  }

  if (!mapboxConfig.accessToken) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
        <Header onBack={() => navigation.goBack()} />
        <View style={styles.messageState}>
          <Ionicons name="map-outline" size={38} color={colors.primary} />
          <Text style={styles.messageTitle}>Configura Mapbox</Text>
          <Text style={styles.messageText}>
            Agrega EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN en tus variables de entorno para ver el mapa.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <Header onBack={() => navigation.goBack()} />

      <View style={styles.filterWrap}>
        <CategoryFilter value={filter} onChange={setFilter} />
      </View>

      <View style={styles.mapWrap}>
        <MapView style={styles.map} styleURL={mapboxConfig.styleURL}>
          <Camera
            ref={cameraRef}
            centerCoordinate={centerCoordinate}
            zoomLevel={mapboxConfig.defaultZoom}
          />

          {userCoordinate ? (
            <MarkerView coordinate={userCoordinate}>
              <View style={styles.userMarker}>
                <View style={styles.userMarkerDot} />
              </View>
            </MarkerView>
          ) : null}

          {mapAlerts.map((alert) => {
            const coordinate = getAlertCoordinate(alert);

            if (!coordinate) {
              return null;
            }

            const tone = getAlertCategoryTone(alert.category);

            return (
              <MarkerView key={alert.id} coordinate={coordinate}>
                <Pressable
                  onPress={() => setSelectedAlert(alert)}
                  style={[styles.alertMarker, { backgroundColor: tone.color }]}
                >
                  <Ionicons name={tone.icon} size={19} color={colors.background} />
                </Pressable>
              </MarkerView>
            );
          })}
        </MapView>

        <Pressable onPress={centerOnUser} style={styles.locationButton}>
          <Ionicons name="navigate-outline" size={20} color={colors.primary} />
          <Text style={styles.locationButtonText}>Ir a mi ubicacion</Text>
        </Pressable>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Cargando mapa...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!userLocation?.locationEnabled ? (
          <Text style={styles.locationHint}>Activa tu ubicacion para ver alertas cercanas.</Text>
        ) : null}

        {!loading && !error && mapAlerts.length === 0 ? (
          <View style={styles.emptyMapState}>
            <Ionicons name="location-outline" size={24} color={colors.primary} />
            <Text style={styles.emptyMapTitle}>Sin alertas en el mapa</Text>
            <Text style={styles.emptyMapText}>
              No hay alertas con ubicacion para el filtro actual.
            </Text>
          </View>
        ) : null}

        {selectedAlert ? (
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailCategory}>{selectedAlert.category}</Text>
              <Pressable onPress={() => setSelectedAlert(undefined)}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>
            <Text style={styles.detailTitle}>{selectedAlert.title}</Text>
            <Text style={styles.detailDescription}>
              {selectedAlert.description || 'Sin descripcion'}
            </Text>
            {selectedAlert.mediaUrl && selectedAlert.mediaType !== 'video' ? (
              <Image source={{ uri: selectedAlert.mediaUrl }} style={styles.detailImage} />
            ) : null}
            {selectedAlert.mediaUrl && selectedAlert.mediaType === 'video' ? (
              <View style={styles.detailVideo}>
                <Ionicons name="videocam-outline" size={24} color={colors.primary} />
                <Text style={styles.detailVideoText}>Video adjunto</Text>
              </View>
            ) : null}
            <Text style={styles.detailMeta}>
              {selectedDistance ? `${selectedDistance} · ` : ''}
              {formatRelativeTime(selectedAlert.createdAt)}
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={26} color={colors.primary} />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.title}>Mapa de alertas</Text>
        <Text style={styles.subtitle}>Alertas cercanas por categoria</Text>
      </View>
    </View>
  );
}

function getUserCoordinate(userLocation?: UserLocation): Coordinate | undefined {
  if (
    !userLocation?.locationEnabled ||
    typeof userLocation.latitude !== 'number' ||
    typeof userLocation.longitude !== 'number'
  ) {
    return undefined;
  }

  return [userLocation.longitude, userLocation.latitude];
}

function getAlertCoordinate(alert?: CommunityAlert): Coordinate | undefined {
  if (
    !alert ||
    typeof alert.latitude !== 'number' ||
    typeof alert.longitude !== 'number'
  ) {
    return undefined;
  }

  return [alert.longitude, alert.latitude];
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  filterWrap: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  mapWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  userMarker: {
    alignItems: 'center',
    backgroundColor: '#BFD5FF',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  userMarkerDot: {
    backgroundColor: colors.primary,
    borderColor: colors.background,
    borderRadius: 8,
    borderWidth: 3,
    height: 18,
    width: 18,
  },
  alertMarker: {
    alignItems: 'center',
    borderColor: colors.background,
    borderRadius: 22,
    borderWidth: 3,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  locationButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'absolute',
    right: 16,
    top: 16,
  },
  locationButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  loading: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'absolute',
    top: 16,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 16,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
    left: 16,
    padding: 12,
    position: 'absolute',
    right: 16,
    top: 78,
  },
  locationHint: {
    backgroundColor: colors.warningSoft,
    borderRadius: 16,
    color: colors.warning,
    fontSize: 13,
    fontWeight: '800',
    left: 16,
    padding: 12,
    position: 'absolute',
    right: 16,
    top: 78,
  },
  emptyMapState: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    left: 20,
    padding: 16,
    position: 'absolute',
    right: 20,
    top: 136,
  },
  emptyMapTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 8,
  },
  emptyMapText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    bottom: 18,
    left: 16,
    padding: 18,
    position: 'absolute',
    right: 16,
  },
  detailHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailCategory: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  detailTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
  detailDescription: {
    color: '#667793',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 6,
  },
  detailImage: {
    backgroundColor: colors.soft,
    borderRadius: 14,
    height: 150,
    marginTop: 12,
    width: '100%',
  },
  detailVideo: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    gap: 8,
    height: 120,
    justifyContent: 'center',
    marginTop: 12,
    width: '100%',
  },
  detailVideoText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  detailMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },
  messageState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 28,
  },
  messageTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 16,
  },
  messageText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 8,
    textAlign: 'center',
  },
});
