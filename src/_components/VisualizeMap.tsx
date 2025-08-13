'use client';

import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  LayerGroup,
  LayersControl,
  CircleMarker,
  Popup,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- 型定義 ---
interface Facility {
  id: number;
  name: string;
  address: string;
  lat: number;
  lon: number;
}
// GeoJSONの型は複雑なため、ここでは any を使用します
type GeoJsonData = any;

// Leafletのデフォルトアイコン問題を修正
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// カラーバーコンポーネント
const Colorbar = () => {
  const gradient = 'linear-gradient(to right, blue, yellow, red)';
  return (
    <div className="leaflet-bottom leaflet-right">
      <div className="leaflet-control leaflet-bar bg-opacity-80 rounded-md bg-white p-2 shadow-lg">
        <div
          style={{ background: gradient, height: '20px', width: '200px' }}
        ></div>
        <div className="flex justify-between text-xs text-gray-700">
          <span>0m</span>
          <span>1000m</span>
          <span>&ge;2000m</span>
        </div>
        <p className="mt-1 text-center text-xs font-semibold">
          最近傍施設までの距離
        </p>
      </div>
    </div>
  );
};

// 地図コンポーネント本体
export default function VisualizeMap() {
  const position: L.LatLngExpression = [35.6895, 139.6917]; // 東京都庁

  // --- データの状態管理 ---
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [meshData, setMeshData] = useState<GeoJsonData>(null);
  const [voronoiData, setVoronoiData] = useState<GeoJsonData>(null);
  const [municipalitiesData, setMunicipalitiesData] =
    useState<GeoJsonData>(null);
  const [loading, setLoading] = useState(true);

  // --- データ取得処理 ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [facRes, meshRes, vorRes, munRes] = await Promise.all([
          fetch('/facilities.json'),
          fetch('/mesh.geojson'),
          fetch('/voronoi.geojson'),
          fetch('/municipalities.geojson'),
        ]);

        setFacilities(await facRes.json());
        setMeshData(await meshRes.json());
        setVoronoiData(await vorRes.json());
        setMunicipalitiesData(await munRes.json());
      } catch (error) {
        console.error('データの読み込みに失敗しました:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- メッシュタイルの色付け関数 ---
  const getMeshColor = (distance: number) => {
    const max = 2000;
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

  const meshStyle = (feature?: any) => {
    if (!feature) return {};
    const color = getMeshColor(feature.properties.distance_m);
    return {
      fillColor: color,
      color: color,
      weight: 0,
      fillOpacity: 0.6,
    };
  };

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
            <LayersControl.Overlay checked name="市区町村 境界線">
              <GeoJSON
                data={municipalitiesData}
                style={{
                  color: 'black',
                  weight: 1,
                  dashArray: '5, 5',
                  fillOpacity: 0.0,
                }}
                onEachFeature={(feature, layer) => {
                  if (feature.properties && feature.properties.ward_ja) {
                    layer.bindPopup(feature.properties.ward_ja);
                  }
                }}
              />
            </LayersControl.Overlay>
          )}

          {meshData && (
            <LayersControl.BaseLayer checked name="アクセス距離 (250mメッシュ)">
              <GeoJSON
                data={meshData}
                style={meshStyle}
                onEachFeature={(feature, layer) => {
                  if (feature.properties && feature.properties.distance_m) {
                    layer.bindPopup(
                      `最近傍施設までの距離: ${Math.round(feature.properties.distance_m)}m`
                    );
                  }
                }}
              />
            </LayersControl.BaseLayer>
          )}

          {voronoiData && (
            <LayersControl.BaseLayer name="ボロノイ領域">
              <GeoJSON
                data={voronoiData}
                style={{ color: 'purple', weight: 2, fillOpacity: 0.1 }}
              />
            </LayersControl.BaseLayer>
          )}

          <LayersControl.Overlay checked name="施設マーカー">
            <LayerGroup>
              {facilities.map((facility) => (
                <CircleMarker
                  key={facility.id}
                  center={[facility.lat, facility.lon]}
                  radius={2}
                  pathOptions={{
                    color: 'white',
                    weight: 0.5,
                    fillColor: '#3A3A3A',
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
        </LayersControl>
      </MapContainer>
      <Colorbar />
    </div>
  );
}
