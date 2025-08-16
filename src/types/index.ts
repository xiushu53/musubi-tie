import type { FeatureCollection } from "geojson";

// GeoJSONの型は複雑なため、ここでは any を使用します
export type GeoJsonData = FeatureCollection | null;

export interface Facility {
  id: number;
  name: string;
  address: string;
  lat: number;
  lon: number;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface FacilityWithDistance extends Facility {
  distance: number;
}

export interface InquiryFormData {
  userName: string;
  email: string;
  phone: string;
  commonMessage: string;
  facilityMessages: Record<number, string>; // facilityId -> 個別メッセージ
}
