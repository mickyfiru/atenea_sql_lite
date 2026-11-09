import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertDetailModal } from '../components/AlertDetailModal';
import { AlertRow } from '../components/AlertRow';
import { colors, radius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { RootScreenProps } from '../navigation/types';
import { ALERT_CATEGORIES, subscribeAlertsForGroups } from '../services/alerts';
import { subscribeUserGroups } from '../services/groups';
import { subscribeUserLocation } from '../services/location';
import { AlertCategory, CommunityAlert, CommunityGroup, UserLocation } from '../types/domain';
import { getAlertCategoryTone } from '../utils/alerts';
import { getAlertDistanceKm, isAlertWithinKm } from '../utils/distance';

type Filter = 'Todas' | AlertCategory;
type DistanceFilter = 'Todas' | 'Cerca de m\u00ed' | '1 km' | '5 km' | '10 km';

const DISTANCE_FILTERS: DistanceFilter[] = ['Todas', 'Cerca de m\u00ed', '1 km', '5 km', '10 km'];

function getDistanceRadiusKm(filter: DistanceFilter) {
  switch (filter) {
    case 'Cerca de m\u00ed':
      return 10;
    case '1 km':
      return 1;
    case '5 km':
      return 5;
    case '10 km':
      return 10;
    case 'Todas':
      return undefined;
  }
}

export function AlertsScreen({ navigation, route }: RootScreenProps<'Alerts'>) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation>();
  const [alerts, setAlerts] = useState<CommunityAlert[]>([]);
  const [filter, setFilter] = useState<Filter>(
    (route.params?.initialCategory as AlertCategory | undefined) ?? 'Todas',
  );
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>('Todas');
  const [selectedAlert, setSelectedAlert] = useState<CommunityAlert>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return undefined;
    }

    return subscribeUserGroups(
      user.uid,
      (nextGroups) => {
        setGroups(nextGroups);
        setLoading(false);
      },
      (groupsError) => {
        setError(groupsError.message);
        setLoading(false);
      },
    );
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUserLocation(undefined);
      return undefined;
    }

    return subscribeUserLocation(
      user.uid,
      setUserLocation,
      (locationError) => setError(locationError.message),
    );
  }, [user]);

  useEffect(() => {
    if (!groups.length) {
      setAlerts([]);
      return undefined;
    }

    return subscribeAlertsForGroups(
      groups.map((group) => group.id),
      (nextAlerts) => {
        setAlerts(nextAlerts);
        setError('');
      },
      (alertsError) => setError(alertsError.message),
    );
  }, [groups]);

  const groupsById = useMemo(
    () => new Map(groups.map((group) => [group.id, group])),
    [groups],
  );

  const filteredAlerts = useMemo(
    () => {
      const radiusKm = getDistanceRadiusKm(distanceFilter);
      const locationActive = Boolean(userLocation?.locationEnabled);
      const categoryAlerts =
        filter === 'Todas' ? alerts : alerts.filter((alert) => alert.category === filter);

      if (!radiusKm) {
        return categoryAlerts;
      }

      if (!locationActive) {
        return [];
      }

      return categoryAlerts
        .filter((alert) => isAlertWithinKm(alert, userLocation, radiusKm))
        .sort(
          (a, b) =>
            (getAlertDistanceKm(a, userLocation) ?? Number.POSITIVE_INFINITY) -
            (getAlertDistanceKm(b, userLocation) ?? Number.POSITIVE_INFINITY),
        );
    },
    [alerts, distanceFilter, filter, userLocation],
  );

  const needsLocation = distanceFilter !== 'Todas' && !userLocation?.locationEnabled;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Revisar alertas</Text>
          <Text style={styles.subtitle}>Historial comunitario por categoria</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          {DISTANCE_FILTERS.map((nextFilter) => {
            const active = distanceFilter === nextFilter;

            return (
              <Pressable
                key={nextFilter}
                onPress={() => setDistanceFilter(nextFilter)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.primary : colors.primarySoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? colors.background : colors.primary },
                  ]}
                >
                  {nextFilter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          {(['Todas', ...ALERT_CATEGORIES] as Filter[]).map((category) => {
            const active = filter === category;
            const tone = category === 'Todas' ? undefined : getAlertCategoryTone(category);

            return (
              <Pressable
                key={category}
                onPress={() => setFilter(category)}
                style={[
                  styles.filterPill,
                  active && {
                    backgroundColor: tone?.color ?? colors.primary,
                  },
                  !active && {
                    backgroundColor: tone?.backgroundColor ?? colors.primarySoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? colors.background : tone?.color ?? colors.primary },
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.helperText}>Cargando alertas...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {needsLocation ? (
          <Text style={styles.locationHint}>Activa tu ubicación para ver alertas cercanas</Text>
        ) : null}

        {!loading && !filteredAlerts.length ? (
          <Text style={styles.empty}>No hay alertas para este filtro.</Text>
        ) : null}

        <View style={styles.list}>
          {filteredAlerts.map((alert, index) => (
            <View key={alert.id}>
              <AlertRow
                alert={alert}
                group={groupsById.get(alert.groupId)}
                onPress={() => setSelectedAlert(alert)}
                userLocation={userLocation}
              />
              {index < filteredAlerts.length - 1 ? <View style={styles.separator} /> : null}
            </View>
          ))}
        </View>
      </ScrollView>
      <AlertDetailModal
        alert={selectedAlert}
        group={selectedAlert ? groupsById.get(selectedAlert.groupId) : undefined}
        onClose={() => setSelectedAlert(undefined)}
        userLocation={userLocation}
      />
    </SafeAreaView>
  );
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
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  filters: {
    flexGrow: 0,
    marginBottom: 16,
  },
  filterPill: {
    borderRadius: radius.pill,
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '900',
  },
  loading: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
  },
  helperText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
  },
  locationHint: {
    backgroundColor: colors.warningSoft,
    borderRadius: 16,
    color: colors.warning,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  empty: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
    padding: 22,
    textAlign: 'center',
  },
  list: {
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  separator: {
    backgroundColor: colors.line,
    height: 1,
    marginLeft: 80,
  },
});
