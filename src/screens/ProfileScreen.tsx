import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileOptionRow } from '../components/ProfileOptionRow';
import { SectionCard } from '../components/SectionCard';
import { colors, radius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { mockUser } from '../data/mockData';
import { RootStackParamList } from '../navigation/types';

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const phoneNumber = user?.phoneNumber ?? mockUser.phoneNumber;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Account, safety and preferences</Text>
        </View>

        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={36} color={colors.primary} />
          </View>
          <View style={styles.userText}>
            <Text style={styles.userName}>{mockUser.displayName}</Text>
            <Text style={styles.phone}>{phoneNumber}</Text>
          </View>
        </View>

        <SectionCard title="Safety">
          <ProfileOptionRow
            icon="call-outline"
            iconBackground={colors.dangerSoft}
            iconColor={colors.danger}
            label="Contactos de emergencia"
            value="3 contactos"
          />
          <View style={styles.separator} />
          <ProfileOptionRow
            icon="time-outline"
            iconBackground={colors.warningSoft}
            iconColor={colors.warning}
            label="Historial"
            onPress={() => navigation.navigate('Alerts')}
            value="Alertas"
          />
          <View style={styles.separator} />
          <ProfileOptionRow
            icon="shield-checkmark-outline"
            iconBackground={colors.primarySoft}
            iconColor={colors.primary}
            label="Revisar alertas"
            onPress={() => navigation.navigate('Alerts')}
            value="Abrir"
          />
        </SectionCard>

        <SectionCard title="Preferences">
          <ProfileOptionRow
            icon="notifications-outline"
            iconBackground={colors.primarySoft}
            iconColor={colors.primary}
            label="Notificaciones"
            value="Activas"
          />
          <View style={styles.separator} />
          <ProfileOptionRow
            icon="location-outline"
            iconBackground={colors.primarySoft}
            iconColor={colors.primary}
            label="Mi ubicacion"
            onPress={() => navigation.navigate('LocationSettings')}
            value="Sector"
          />
          <View style={styles.separator} />
          <ProfileOptionRow
            icon="volume-medium-outline"
            iconBackground={colors.violetSoft}
            iconColor={colors.violet}
            label="Sonidos de alertas"
            onPress={() => navigation.navigate('SoundSettings')}
            value="Configurar"
          />
          <View style={styles.separator} />
          <ProfileOptionRow
            icon="lock-closed-outline"
            iconBackground={colors.tealSoft}
            iconColor={colors.teal}
            label="Privacidad"
            value="Solo grupos"
          />
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    paddingBottom: 124,
    paddingHorizontal: 22,
  },
  header: {
    marginBottom: 22,
    marginTop: 12,
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: '600',
    marginTop: 6,
  },
  userCard: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    marginBottom: 26,
    padding: 20,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  userText: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    color: colors.background,
    fontSize: 20,
    fontWeight: '900',
  },
  phone: {
    color: '#DDE8FF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  separator: {
    backgroundColor: colors.line,
    height: 1,
    marginLeft: 96,
  },
});
