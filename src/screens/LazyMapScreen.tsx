import { Ionicons } from '@expo/vector-icons';
import { ComponentType, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mapboxConfig } from '../config/mapbox';
import { colors } from '../constants/theme';
import { RootScreenProps } from '../navigation/types';

type LoadedMapScreen = ComponentType<RootScreenProps<'Map'>>;

export function LazyMapScreen(props: RootScreenProps<'Map'>) {
  const [MapComponent, setMapComponent] = useState<LoadedMapScreen>();
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    if (!mapboxConfig.accessToken) {
      console.log('[ATENEA startup] Mapbox token missing. Map module not loaded.');
      setError('Agrega EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN para ver el mapa.');
      return () => {
        mounted = false;
      };
    }

    console.log('[ATENEA startup] Loading MapScreen on demand.');

    import('./MapScreen')
      .then((module) => {
        if (mounted) {
          setMapComponent(() => module.MapScreen);
        }
      })
      .catch((loadError: unknown) => {
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'No se pudo cargar el modulo de mapa.';

        console.log('[ATENEA startup] MapScreen load failed:', message);

        if (mounted) {
          setError(message);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (MapComponent) {
    return <MapComponent {...props} />;
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => props.navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Mapa de alertas</Text>
          <Text style={styles.subtitle}>Alertas cercanas por categoria</Text>
        </View>
      </View>

      <View style={styles.messageState}>
        {error ? (
          <>
            <Ionicons name="map-outline" size={38} color={colors.primary} />
            <Text style={styles.messageTitle}>Mapa no disponible</Text>
            <Text style={styles.messageText}>
              No pudimos cargar Mapbox en este dispositivo. Revisa la configuracion del build.
            </Text>
            <Text style={styles.detail}>{error}</Text>
          </>
        ) : (
          <>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.messageTitle}>Cargando mapa</Text>
          </>
        )}
      </View>
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
  detail: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
  },
});
