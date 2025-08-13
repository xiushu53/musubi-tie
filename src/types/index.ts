import { FeatureCollection } from 'geojson';

// GeoJSONの型は複雑なため、ここでは any を使用します
export type GeoJsonData = FeatureCollection | null;

export interface Facility {
  id: number;
  name: string;
  address: string;
  lat: number;
  lon: number;
}
