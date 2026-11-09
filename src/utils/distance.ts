import { CommunityAlert, UserLocation } from '../types/domain';

export type Coordinates = {
  latitude?: number;
  longitude?: number;
};

type RequiredCoordinates = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function hasCoordinates(value?: Coordinates): value is RequiredCoordinates {
  return (
    typeof value?.latitude === 'number' &&
    Number.isFinite(value.latitude) &&
    typeof value.longitude === 'number' &&
    Number.isFinite(value.longitude)
  );
}

export function calculateDistanceKm(from?: Coordinates, to?: Coordinates) {
  if (!hasCoordinates(from) || !hasCoordinates(to)) {
    return undefined;
  }

  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

export function getAlertDistanceKm(alert: CommunityAlert, userLocation?: UserLocation) {
  if (!userLocation?.locationEnabled) {
    return undefined;
  }

  return calculateDistanceKm(userLocation, alert);
}

export function isAlertWithinKm(
  alert: CommunityAlert,
  userLocation: UserLocation | undefined,
  radiusKm: number,
) {
  const distanceKm = getAlertDistanceKm(alert, userLocation);

  return distanceKm !== undefined && distanceKm < radiusKm;
}

export function formatDistance(distanceKm?: number) {
  if (distanceKm === undefined) {
    return '';
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
}
