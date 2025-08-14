import { GeoJSON, LayersControl } from "react-leaflet";
import type { GeoJsonData } from "@/types";

interface Props {
  data: GeoJsonData;
  maxDistance: number;
}

const getMeshColor = (distance: number, maxDistance: number) => {
  const max = maxDistance;
  const min = 0;
  const d = Math.max(min, Math.min(distance, max));
  const ratio = (d - min) / (max - min);

  if (ratio < 0.5) {
    // 青 -> 黄
    const r = Math.floor(255 * (ratio * 2));
    const g = Math.floor(255 * (ratio * 2));
    const b = Math.floor(255 * (1 - ratio * 2));
    return `rgb(${r},${g},${b})`;
  } else {
    // 黄 -> 赤
    const r = 255;
    const g = Math.floor(255 * (1 - (ratio - 0.5) * 2));
    const b = 0;
    return `rgb(${r},${g},${b})`;
  }
};

import type { Feature } from "geojson";
import { MAP_SETTINGS } from "@/_settings/visualize-map";

const meshStyle = (feature?: Feature, maxDistance?: number) => {
  if (!feature || !feature.properties || maxDistance === undefined) return {};
  const color = getMeshColor(feature.properties.distance_m, maxDistance);
  return {
    fillColor: color,
    color: color,
    weight: 0,
    fillOpacity: MAP_SETTINGS.opacity,
  };
};

export default function MeshLayer({ data, maxDistance }: Props) {
  return (
    <LayersControl.Overlay checked name="アクセス距離 (250mメッシュ)">
      {data ? (
        <GeoJSON
          data={data}
          style={(feature) => meshStyle(feature, maxDistance)}
          onEachFeature={(feature, layer) => {
            if (feature.properties?.distance_m) {
              layer.bindPopup(
                `最近傍施設までの距離: ${Math.round(feature.properties.distance_m)}m`
              );
            }
          }}
        />
      ) : null}
    </LayersControl.Overlay>
  );
}
