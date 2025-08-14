import { CircleMarker, LayerGroup, LayersControl, Popup } from "react-leaflet";
import type { Facility } from "@/types";

interface Props {
  data: Facility[];
}

export default function FacilitiesLayer({ data }: Props) {
  return (
    <LayersControl.Overlay checked name="施設マーカー">
      <LayerGroup>
        {data.map((facility) => (
          <CircleMarker
            key={facility.id}
            center={[facility.lat, facility.lon]}
            radius={4}
            pathOptions={{
              color: "white",
              weight: 0.5,
              fillColor: "#3A3A3A",
              fillOpacity: 1.0,
            }}
          >
            <Popup>
              <strong>{facility.name}</strong>
              <br />
              {facility.address}
            </Popup>
          </CircleMarker>
        ))}
      </LayerGroup>
    </LayersControl.Overlay>
  );
}
