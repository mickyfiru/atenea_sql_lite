import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../constants/theme';
import { CategorySummary } from '../services/summary';
import { getAlertCategoryTone } from '../utils/alerts';
import { formatRelativeTime } from '../utils/dates';
import { formatDistance } from '../utils/distance';

type SummaryCardProps = {
  summary: CategorySummary;
};

export function SummaryCard({ summary }: SummaryCardProps) {
  const tone = getAlertCategoryTone(summary.category);
  const updateText = summary.updatedAt ? formatRelativeTime(summary.updatedAt) : 'Sin actividad';

  return (
    <View style={[styles.card, { borderColor: tone.backgroundColor }]}>
      <View style={[styles.header, { backgroundColor: tone.backgroundColor }]}>
        <View style={[styles.icon, { backgroundColor: colors.background }]}>
          <Ionicons name={tone.icon} size={22} color={tone.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.category, { color: tone.color }]}>{summary.category}</Text>
          <Text style={styles.updated}>Actualizado {updateText}</Text>
        </View>
        <Text style={[styles.count, { color: tone.color }]}>
          {summary.eventCount} eventos
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.nearbyLine}>
          <Ionicons name="navigate-outline" size={16} color={tone.color} />
          <Text style={[styles.nearbyText, { color: tone.color }]}>
            {summary.nearbyCount} a menos de 10 km
          </Text>
        </View>

        {summary.latestGroupName ? (
          <View style={styles.groupLine}>
            <Ionicons name="people-outline" size={16} color={colors.muted} />
            <Text style={styles.groupText} numberOfLines={1}>
              {summary.latestGroupName}
            </Text>
          </View>
        ) : null}

        {summary.events.length ? (
          summary.events.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <View style={[styles.dot, { backgroundColor: tone.color }]} />
              <View style={styles.eventText}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta} numberOfLines={1}>
                  {event.groupName} · {formatRelativeTime(event.createdAt)}
                  {event.distanceKm !== undefined ? ` · ${formatDistance(event.distanceKm)}` : ''}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No hay alertas recientes para esta categoria.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 16,
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
    fontSize: 18,
    fontWeight: '900',
  },
  updated: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  count: {
    fontSize: 14,
    fontWeight: '900',
  },
  body: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  nearbyLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  nearbyText: {
    fontSize: 13,
    fontWeight: '900',
  },
  groupLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  groupText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  eventRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dot: {
    borderRadius: 4,
    height: 8,
    marginRight: 12,
    marginTop: 7,
    width: 8,
  },
  eventText: {
    flex: 1,
  },
  eventTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  eventMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
});
