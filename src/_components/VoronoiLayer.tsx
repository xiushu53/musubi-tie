import { GeoJSON, LayersControl } from "react-leaflet";
import type { GeoJsonData } from "@/types";

interface Props {
  data: GeoJsonData;
}

export default function VoronoiLayer({ data }: Props) {
  return (
    <LayersControl.Overlay name="ボロノイ領域">
      <GeoJSON
        data={data}
        style={{ color: "purple", weight: 2, fillOpacity: 0.1 }}
      />
    </LayersControl.Overlay>
  );
}
