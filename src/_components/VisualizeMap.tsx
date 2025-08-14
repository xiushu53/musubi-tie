"use client";

import { LayersControl, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type L from "leaflet";
import { useMapData } from "@/hooks/useMapData";
import { fixLeafletIcon } from "@/utils/leaflet";
import Colorbar from "./Colorbar";
import FacilitiesLayer from "./FacilitiesLayer";
import MeshLayer from "./MeshLayer";
import MunicipalitiesLayer from "./MunicipalitiesLayer";
import VoronoiLayer from "./VoronoiLayer";

fixLeafletIcon();

export default function VisualizeMap({
  facilityType,
}: {
  facilityType: string;
}) {
  const position: L.LatLngExpression = [35.6895, 139.6917]; // 東京都庁
  const { facilities, meshData, voronoiData, municipalitiesData, loading } =
    useMapData(facilityType);

  if (loading) {
    return (
      <p className="flex h-full items-center justify-center">
        地図データを読み込んでいます...
      </p>
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={position}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <LayersControl position="topright">
          {municipalitiesData && (
            <MunicipalitiesLayer data={municipalitiesData} />
          )}
          {meshData && <MeshLayer data={meshData} />}
          {voronoiData && <VoronoiLayer data={voronoiData} />}
          {facilities.length > 0 && <FacilitiesLayer data={facilities} />}
        </LayersControl>
      </MapContainer>
      <Colorbar />
    </div>
  );
}
