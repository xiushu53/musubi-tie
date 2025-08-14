import type L from "leaflet";

export const FACILITY_TYPES = [
  { value: "asds", label: "放課後等デイサービス" },
  { value: "sept-a", label: "就労継続支援A" },
  { value: "sept-b", label: "就労継続支援B" },
  { value: "spt", label: "就労移行支援" },
  { value: "ccd", label: "障害児相談支援事業所" },
];

export const COLORBAR_SETTINGS = {
  default: 2000,
  min: 500,
  max: 5000,
  step: 100,
};

export const MAP_SETTINGS: {
  center: L.LatLngTuple;
  zoom: number;
  tileSize: number;
  opacity?: number;
} = {
  center: [35.660154, 139.457],
  zoom: 11,
  tileSize: 256,
  opacity: 0.4,
};
