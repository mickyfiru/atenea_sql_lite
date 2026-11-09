import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { radius } from '../constants/theme';

type QuickActionCardProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
  onPress: () => void;
};

export function QuickActionCard({
  title,
  subtitle,
  icon,
  color,
  backgroundColor,
  onPress,
}: QuickActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={30} color={color} />
      <Text style={[styles.title, { color }]}>{title}</Text>
      <Text style={[styles.subtitle, { color, opacity: 0.7 }]}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: radius.lg,
    gap: 4,
    height: 88,
    justifyContent: 'center',
    padding: 8,
    width: '23%',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  title: {
    fontSize: 11,
    fontWeight: '900',
    marginTop: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
