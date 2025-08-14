import type { Feature, GeoJsonProperties, Geometry } from "geojson";
import { GeoJSON, LayersControl } from "react-leaflet";
import type { GeoJsonData } from "@/types";

interface Props {
  data: GeoJsonData;
  maxDistance: number;
}

export default function VoronoiLayer({ data, maxDistance }: Props) {
  const getColor = (distance: number, maxDistance: number) => {
    const normalizedDistance = Math.min(distance, maxDistance) / maxDistance;

    let r: number, g: number, b: number;

    if (normalizedDistance <= 0.5) {
      const ratio = normalizedDistance / 0.5;
      r = Math.round(255 * ratio);
      g = Math.round(255 * ratio);
      b = Math.round(255 * (1 - ratio));
    } else {
      const ratio = (normalizedDistance - 0.5) / 0.5;
      r = 255;
      g = Math.round(255 * (1 - ratio));
      b = 0;
    }

    return `rgb(${r},${g},${b})`;
  };

  const style = (feature: Feature<Geometry, GeoJsonProperties> | undefined) => {
    const distance = feature?.properties?.distance;
    return {
      fillColor:
        distance !== undefined ? getColor(distance, maxDistance) : "gray",
      weight: 2,
      opacity: 1,
      color: "white",
      fillOpacity: 0.5,
    };
  };

  return (
    <LayersControl.Overlay name="ボロノイ領域">
      {data ? <GeoJSON data={data} style={style} /> : null}
    </LayersControl.Overlay>
  );
}
