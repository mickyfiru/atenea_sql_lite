import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AteneaOrb } from '../components/AteneaOrb';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors } from '../constants/theme';
import { RootScreenProps } from '../navigation/types';

export function WelcomeScreen({ navigation }: RootScreenProps<'Welcome'>) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>ATENEA</Text>
          <Text style={styles.badge}>AI</Text>
        </View>
        <Text style={styles.kicker}>Comunicacion comunitaria inteligente</Text>

        <AteneaOrb />

        <View style={styles.copy}>
          <Text style={styles.title}>Tu asistente para estar conectado y seguro</Text>
          <Text style={styles.subtitle}>
            Reporta emergencias, conversa con tus grupos y revisa la actividad de tu comunidad
            desde un solo lugar.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Ingresar con celular" onPress={() => navigation.navigate('PhoneAuth')} />
        <PrimaryButton
          label="Iniciar sesion"
          onPress={() => navigation.navigate('PhoneAuth')}
          variant="light"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  brand: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '900',
  },
  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  kicker: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 18,
  },
  copy: {
    alignItems: 'center',
    gap: 10,
    maxWidth: 340,
  },
  title: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    textAlign: 'center',
  },
  actions: {
    gap: 12,
    paddingBottom: 20,
  },
});
