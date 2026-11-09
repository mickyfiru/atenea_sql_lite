import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, radius } from '../constants/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'light';
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  style,
}: PrimaryButtonProps) {
  const isLight = variant === 'light';

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isLight && styles.light,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, isLight && styles.lightLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  light: {
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.58,
  },
  label: {
    color: colors.background,
    fontSize: 17,
    fontWeight: '800',
  },
  lightLabel: {
    color: colors.primary,
  },
});
