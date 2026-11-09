import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius } from '../constants/theme';

type AppHeaderProps = {
  title: string;
  subtitle: string;
  aiBadge?: boolean;
  showBell?: boolean;
};

export function AppHeader({ title, subtitle, aiBadge, showBell }: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {aiBadge ? <Text style={styles.badge}>AI</Text> : null}
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {showBell ? (
        <View style={styles.bell}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          <View style={styles.count}>
            <Text style={styles.countText}>3</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 18,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  title: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: '500',
    marginTop: 6,
  },
  bell: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  count: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: -8,
    top: -8,
    width: 28,
  },
  countText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '900',
  },
});
