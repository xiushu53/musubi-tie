'use client';

import { MapContainer, TileLayer, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useMapData } from '@/hooks/useMapData';
import { fixLeafletIcon } from '@/utils/leaflet';
import Colorbar from './Colorbar';
import MunicipalitiesLayer from './MunicipalitiesLayer';
import MeshLayer from './MeshLayer';
import VoronoiLayer from './VoronoiLayer';
import FacilitiesLayer from './FacilitiesLayer';

fixLeafletIcon();

export default function VisualizeMap() {
  const position: L.LatLngExpression = [35.6895, 139.6917]; // 東京都庁
  const { facilities, meshData, voronoiData, municipalitiesData, loading } =
    useMapData();

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
        style={{ height: '100%', width: '100%' }}
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
