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

import { colors, radius } from '../constants/theme';
import { RootScreenProps } from '../navigation/types';
import { ALERT_CATEGORIES } from '../services/alerts';
import {
  DEFAULT_ALERT_SOUND_PREFERENCES,
  AlertSoundPreferences,
  loadAlertSoundPreferences,
  playAlertSound,
  setAlertSoundEnabled,
} from '../services/sounds';
import { AlertCategory } from '../types/domain';
import { getAlertCategoryTone } from '../utils/alerts';

export function SoundSettingsScreen({ navigation }: RootScreenProps<'SoundSettings'>) {
  const [preferences, setPreferences] = useState<AlertSoundPreferences>(
    DEFAULT_ALERT_SOUND_PREFERENCES,
  );
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState<AlertCategory>();
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    loadAlertSoundPreferences()
      .then((loadedPreferences) => {
        if (mounted) {
          setPreferences(loadedPreferences);
        }
      })
      .catch((loadError: Error) => {
        if (mounted) {
          setError(loadError.message);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const enabledCount = useMemo(
    () => ALERT_CATEGORIES.filter((category) => preferences[category]).length,
    [preferences],
  );

  async function handleToggle(category: AlertCategory, enabled: boolean) {
    const previousPreferences = preferences;

    setSavingCategory(category);
    setError('');
    setPreferences({
      ...preferences,
      [category]: enabled,
    });

    try {
      const nextPreferences = await setAlertSoundEnabled(category, enabled);
      setPreferences(nextPreferences);

      if (enabled) {
        void playAlertSound(category);
      }
    } catch (toggleError) {
      setPreferences(previousPreferences);
      setError(toggleError instanceof Error ? toggleError.message : 'No se pudo guardar.');
    } finally {
      setSavingCategory(undefined);
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Sonidos de alertas</Text>
          <Text style={styles.subtitle}>{enabledCount} de 4 categorias activas</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.helperText}>Cargando preferencias...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          {ALERT_CATEGORIES.map((category, index) => {
            const tone = getAlertCategoryTone(category);
            const enabled = preferences[category];
            const saving = savingCategory === category;

            return (
              <View key={category}>
                <View style={styles.row}>
                  <View style={[styles.icon, { backgroundColor: tone.backgroundColor }]}>
                    <Ionicons name={tone.icon} size={24} color={tone.color} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.label}>{category}</Text>
                    <Text style={styles.value}>{enabled ? 'Sonido activo' : 'Silenciado'}</Text>
                  </View>
                  {saving ? <ActivityIndicator color={colors.primary} /> : null}
                  <Pressable
                    accessibilityLabel={`Probar sonido ${category}`}
                    onPress={() => playAlertSound(category)}
                    style={styles.previewButton}
                  >
                    <Ionicons name="volume-medium-outline" size={20} color={colors.muted} />
                  </Pressable>
                  <Switch
                    disabled={saving}
                    onValueChange={(value) => handleToggle(category, value)}
                    thumbColor={enabled ? colors.background : '#F5F7FB'}
                    trackColor={{ false: '#DDE4EF', true: colors.primary }}
                    value={enabled}
                  />
                </View>
                {index < ALERT_CATEGORIES.length - 1 ? <View style={styles.separator} /> : null}
              </View>
            );
          })}
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
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 92,
    paddingHorizontal: 20,
  },
  icon: {
    alignItems: 'center',
    borderRadius: 27,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  rowText: {
    flex: 1,
    marginLeft: 16,
  },
  label: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  value: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 5,
  },
  previewButton: {
    alignItems: 'center',
    backgroundColor: colors.soft,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginHorizontal: 10,
    width: 40,
  },
  separator: {
    backgroundColor: colors.line,
    height: 1,
    marginLeft: 90,
  },
});
