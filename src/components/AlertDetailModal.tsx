import { Ionicons } from '@expo/vector-icons';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../constants/theme';
import { CommunityAlert, CommunityGroup, UserLocation } from '../types/domain';
import { getAlertCategoryTone } from '../utils/alerts';
import { formatRelativeTime } from '../utils/dates';
import { formatDistance, getAlertDistanceKm } from '../utils/distance';

type AlertDetailModalProps = {
  alert?: CommunityAlert;
  group?: CommunityGroup;
  onClose: () => void;
  userLocation?: UserLocation;
};

export function AlertDetailModal({
  alert,
  group,
  onClose,
  userLocation,
}: AlertDetailModalProps) {
  if (!alert) {
    return null;
  }

  const tone = getAlertCategoryTone(alert.category);
  const distance = formatDistance(getAlertDistanceKm(alert, userLocation));

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: tone.backgroundColor }]}>
              <Ionicons name={tone.icon} size={24} color={tone.color} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.category, { color: tone.color }]}>{alert.category}</Text>
              <Text style={styles.meta}>
                {group?.name ?? alert.groupId} · {formatRelativeTime(alert.createdAt)}
                {distance ? ` · ${distance}` : ''}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          <Text style={styles.title}>{alert.title}</Text>
          <Text style={styles.description}>{alert.description || 'Sin descripcion'}</Text>

          {alert.mediaUrl && alert.mediaType !== 'video' ? (
            <Image source={{ uri: alert.mediaUrl }} style={styles.media} />
          ) : null}
          {alert.mediaUrl && alert.mediaType === 'video' ? (
            <View style={styles.videoBox}>
              <Ionicons name="videocam-outline" size={28} color={colors.primary} />
              <Text style={styles.videoText}>Video adjunto</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(8, 20, 43, 0.38)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: 20,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  icon: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  headerText: {
    flex: 1,
    marginLeft: 14,
  },
  category: {
    fontSize: 14,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  closeButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 18,
  },
  description: {
    color: '#667793',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 8,
  },
  media: {
    backgroundColor: colors.soft,
    borderRadius: radius.md,
    height: 220,
    marginTop: 16,
    width: '100%',
  },
  videoBox: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    gap: 8,
    height: 160,
    justifyContent: 'center',
    marginTop: 16,
    width: '100%',
  },
  videoText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },
});
