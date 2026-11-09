import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/theme';
import { CommunityAlert, CommunityGroup, UserLocation } from '../types/domain';
import { getAlertCategoryTone } from '../utils/alerts';
import { formatRelativeTime } from '../utils/dates';
import { formatDistance, getAlertDistanceKm } from '../utils/distance';

type AlertRowProps = {
  alert: CommunityAlert;
  group?: CommunityGroup;
  onPress?: () => void;
  userLocation?: UserLocation;
};

export function AlertRow({ alert, group, onPress, userLocation }: AlertRowProps) {
  const tone = getAlertCategoryTone(alert.category);
  const distanceLabel = formatDistance(getAlertDistanceKm(alert, userLocation));
  const placeLabel = distanceLabel || [alert.district, alert.city].filter(Boolean).join(', ');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: tone.backgroundColor }]}>
        <Ionicons name={tone.icon} size={24} color={tone.color} />
      </View>
      <View style={styles.content}>
        <View style={styles.topLine}>
          <Text style={[styles.category, { color: tone.color }]}>{alert.category}</Text>
          <Text style={styles.time}>{formatRelativeTime(alert.createdAt)}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {alert.title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {alert.description || 'Sin descripcion'}
        </Text>
        {alert.mediaUrl && alert.mediaType !== 'video' ? (
          <Image source={{ uri: alert.mediaUrl }} style={styles.mediaPreview} />
        ) : null}
        {alert.mediaUrl && alert.mediaType === 'video' ? (
          <View style={styles.videoBadge}>
            <Ionicons name="videocam-outline" size={16} color={colors.primary} />
            <Text style={styles.videoBadgeText}>Video adjunto</Text>
          </View>
        ) : null}
        <Text style={styles.group} numberOfLines={1}>
          {group?.name ?? alert.groupId}
          {placeLabel ? ` · ${placeLabel}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  pressed: {
    backgroundColor: '#F9FBFF',
  },
  icon: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  content: {
    flex: 1,
  },
  topLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  category: {
    fontSize: 13,
    fontWeight: '900',
  },
  time: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 4,
  },
  description: {
    color: '#667793',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 4,
  },
  mediaPreview: {
    backgroundColor: colors.soft,
    borderRadius: 12,
    height: 96,
    marginTop: 10,
    width: '100%',
  },
  videoBadge: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  videoBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  group: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
  },
});
