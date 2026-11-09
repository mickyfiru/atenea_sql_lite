import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../constants/theme';

type SectionCardProps = PropsWithChildren<{
  title?: string;
  tone?: 'default' | 'danger';
}>;

export function SectionCard({ title, tone = 'default', children }: SectionCardProps) {
  return (
    <View style={styles.block}>
      {title ? <Text style={styles.heading}>{title}</Text> : null}
      <View style={[styles.card, tone === 'danger' && styles.dangerCard]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: 24,
  },
  heading: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dangerCard: {
    borderColor: '#FFD9DD',
  },
});
