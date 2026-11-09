import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { RootScreenProps } from '../navigation/types';
import {
  disableUserLocation,
  enableOrUpdateUserLocation,
  subscribeUserLocation,
} from '../services/location';
import { UserLocation } from '../types/domain';
import { formatRelativeTime } from '../utils/dates';

export function LocationSettingsScreen({ navigation }: RootScreenProps<'LocationSettings'>) {
  const { user } = useAuth();
  const [location, setLocation] = useState<UserLocation>({
    locationEnabled: false,
    city: '',
    district: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return undefined;
    }

    return subscribeUserLocation(
      user.uid,
      (nextLocation) => {
        setLocation(nextLocation);
        setLoading(false);
      },
      (locationError) => {
        setError(locationError.message);
        setLoading(false);
      },
    );
  }, [user]);

  const sectorLabel = useMemo(() => {
    if (!location.locationEnabled) {
      return 'Ubicacion desactivada';
    }

    return [location.district, location.city].filter(Boolean).join(', ') || 'Sector actualizado';
  }, [location]);

  const coordinatesLabel = useMemo(() => {
    if (!location.locationEnabled || location.latitude === undefined || location.longitude === undefined) {
      return 'Sin coordenadas guardadas';
    }

    return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
  }, [location]);

  async function handleEnableOrUpdate() {
    if (!user) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await enableOrUpdateUserLocation(user.uid);
    } catch (locationError) {
      setError(locationError instanceof Error ? locationError.message : 'No se pudo actualizar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable() {
    if (!user) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await disableUserLocation(user.uid);
    } catch (locationError) {
      setError(locationError instanceof Error ? locationError.message : 'No se pudo desactivar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(value: boolean) {
    if (value) {
      await handleEnableOrUpdate();
      return;
    }

    await handleDisable();
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Mi ubicacion</Text>
          <Text style={styles.subtitle}>Sector para alertas y resumenes</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.helperText}>Cargando ubicacion...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={styles.locationIcon}>
              <Ionicons name="location-outline" size={28} color={colors.primary} />
            </View>
            <View style={styles.statusText}>
              <Text style={styles.statusTitle}>{sectorLabel}</Text>
              <Text style={styles.statusSubtitle}>
                {location.updatedAt ? `Actualizado ${formatRelativeTime(location.updatedAt)}` : 'Sin actualizacion'}
              </Text>
            </View>
            <Switch
              disabled={saving}
              onValueChange={handleToggle}
              thumbColor={location.locationEnabled ? colors.background : '#F5F7FB'}
              trackColor={{ false: '#DDE4EF', true: colors.primary }}
              value={location.locationEnabled}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Coordenadas</Text>
            <Text style={styles.detailValue}>{coordinatesLabel}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ciudad</Text>
            <Text style={styles.detailValue}>{location.city || 'No definida'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Distrito</Text>
            <Text style={styles.detailValue}>{location.district || 'No definido'}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            disabled={saving}
            label={
              saving
                ? 'Actualizando...'
                : location.locationEnabled
                  ? 'Actualizar ubicacion'
                  : 'Activar ubicacion'
            }
            onPress={handleEnableOrUpdate}
          />
          {location.locationEnabled ? (
            <Pressable disabled={saving} onPress={handleDisable} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Desactivar ubicacion</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
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
  card: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: 20,
  },
  locationIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  statusText: {
    flex: 1,
    marginLeft: 16,
  },
  statusTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  statusSubtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 5,
  },
  divider: {
    backgroundColor: colors.line,
    height: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  detailValue: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 18,
    textAlign: 'right',
  },
  actions: {
    gap: 12,
    marginTop: 20,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: 16,
  },
  secondaryText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '900',
  },
});
