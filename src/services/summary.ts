import { type Unsubscribe } from 'firebase/firestore';

import { ALERT_CATEGORIES, subscribeAlertsForGroups } from './alerts';
import { AlertCategory, CommunityAlert, CommunityGroup, UserLocation } from '../types/domain';
import { getAlertDistanceKm, isAlertWithinKm } from '../utils/distance';

export type SummaryCategoryKey = 'security' | 'traffic' | 'community' | 'services';

export type SummaryEvent = {
  id: string;
  category: AlertCategory;
  title: string;
  description: string;
  groupId: string;
  groupName: string;
  city: string;
  district: string;
  distanceKm?: number;
  createdAt: Date;
};

export type SummaryDistanceCounts = {
  under1Km: number;
  under5Km: number;
  under10Km: number;
};

export type CategorySummary = {
  key: SummaryCategoryKey;
  category: AlertCategory;
  events: SummaryEvent[];
  eventCount: number;
  nearbyCount: number;
  distanceCounts: SummaryDistanceCounts;
  updatedAt?: Date;
  latestGroupName?: string;
};

export type GeneratedSummary = Record<SummaryCategoryKey, SummaryEvent[]>;

const CATEGORY_KEYS: Record<AlertCategory, SummaryCategoryKey> = {
  Seguridad: 'security',
  'Tr\u00e1nsito': 'traffic',
  Comunidad: 'community',
  Servicios: 'services',
};

export function generateSummary(): GeneratedSummary {
  // Future integration point:
  // - OpenAI: turn recent alerts into natural-language community digests.
  // - Gemini: enrich summaries with multimodal or location context when available.
  // - DeepSeek: produce low-cost categorization or triage drafts before review.
  return {
    security: [],
    traffic: [],
    community: [],
    services: [],
  };
}

export function buildCategorySummaries(
  alerts: CommunityAlert[],
  groups: CommunityGroup[],
  userLocation?: UserLocation,
): CategorySummary[] {
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const sortedAlerts = [...alerts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return ALERT_CATEGORIES.map((category) => {
    const categoryAlerts = sortedAlerts.filter((alert) => alert.category === category);
    const events = categoryAlerts.slice(0, 3).map((alert) => ({
      id: alert.id,
      category: alert.category,
      title: alert.title,
      description: alert.description,
      groupId: alert.groupId,
      groupName: groupsById.get(alert.groupId)?.name ?? alert.groupId,
      city: alert.city,
      district: alert.district,
      distanceKm: getAlertDistanceKm(alert, userLocation),
      createdAt: alert.createdAt,
    }));
    const distanceCounts = getDistanceCounts(categoryAlerts, userLocation);

    return {
      key: CATEGORY_KEYS[category],
      category,
      events,
      eventCount: categoryAlerts.length,
      nearbyCount: distanceCounts.under10Km,
      distanceCounts,
      updatedAt: categoryAlerts[0]?.createdAt,
      latestGroupName: events[0]?.groupName,
    };
  });
}

function getDistanceCounts(
  alerts: CommunityAlert[],
  userLocation?: UserLocation,
): SummaryDistanceCounts {
  return {
    under1Km: alerts.filter((alert) => isAlertWithinKm(alert, userLocation, 1)).length,
    under5Km: alerts.filter((alert) => isAlertWithinKm(alert, userLocation, 5)).length,
    under10Km: alerts.filter((alert) => isAlertWithinKm(alert, userLocation, 10)).length,
  };
}

export function subscribeSummaryForGroups(
  groupIds: string[],
  groups: CommunityGroup[],
  userLocation: UserLocation | undefined,
  onSummary: (summaries: CategorySummary[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return subscribeAlertsForGroups(
    groupIds,
    (alerts) => onSummary(buildCategorySummaries(alerts, groups, userLocation)),
    onError,
  );
}
