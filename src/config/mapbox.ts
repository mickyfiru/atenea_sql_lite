export const mapboxConfig = {
  accessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '',
  styleURL: 'mapbox://styles/mapbox/streets-v12',
  defaultZoom: 13,
  nearbyRadiusKm: 10,
} as const;
