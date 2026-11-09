import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/theme';

type ProfileOptionRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
  label: string;
  value?: string;
  onPress?: () => void;
};

export function ProfileOptionRow({
  icon,
  iconColor,
  iconBackground,
  label,
  value,
  onPress,
}: ProfileOptionRowProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={styles.label}>{label}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={20} color="#CAD4E2" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 96,
    paddingHorizontal: 24,
  },
  pressed: {
    backgroundColor: '#F9FBFF',
  },
  icon: {
    alignItems: 'center',
    borderRadius: 27,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  label: {
    color: colors.text,
    flex: 1,
    fontSize: 19,
    fontWeight: '800',
    marginLeft: 18,
  },
  value: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: '700',
    marginRight: 10,
  },
});
