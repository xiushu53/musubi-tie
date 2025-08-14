"use client";

import { LayersControl, MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type L from "leaflet";
import { useEffect, useState } from "react";
import { Progress } from "@/_components/ui/progress";
import { MAP_SETTINGS } from "@/_settings/visualize-map";
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
  maxDistance,
}: {
  facilityType: string;
  maxDistance: number;
}) {
  const position: L.LatLngExpression = MAP_SETTINGS.center;
  const { facilities, meshData, voronoiData, municipalitiesData, loading } =
    useMapData(facilityType);
  const [progress, setProgress] = useState(13);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setProgress(66), 500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <p className="mb-4">地図データを読み込んでいます...</p>
        <Progress value={progress} className="w-[60%]" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={position}
        zoom={MAP_SETTINGS.zoom}
        style={{ height: "100%", width: "100%" }}
        whenReady={() => {}}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <LayersControl position="topright">
          {municipalitiesData && (
            <MunicipalitiesLayer data={municipalitiesData} />
          )}
          {meshData && <MeshLayer data={meshData} maxDistance={maxDistance} />}
          {voronoiData && (
            <VoronoiLayer data={voronoiData} maxDistance={maxDistance} />
          )}
          {facilities.length > 0 && <FacilitiesLayer data={facilities} />}
        </LayersControl>
      </MapContainer>
      <Colorbar maxDistance={maxDistance} />
    </div>
  );
}
