'use client'; // このコンポーネントがクライアントサイドで実行されることを示す

import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Rectangle,
  LayerGroup,
  LayersControl,
  CircleMarker,
  Popup,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leafletのデフォルトアイコン問題を修正
// ★★★ ここを修正: (as any) を追加してTypeScriptエラーを回避 ★★★
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// --- データシミュレーション (プロトタイプ用) ---
// 本来はAPIや外部ファイルから取得します
const facilityData = [
  {
    id: 1,
    lat: 35.708,
    lon: 139.664,
    name: '放課後等デイサービスA',
    address: '中野区中野５丁目',
  },
  {
    id: 2,
    lat: 35.7,
    lon: 139.69,
    name: '放課後等デイサービスB',
    address: '新宿区西新宿２丁目',
  },
];
const meshData = [
  {
    bounds: [
      [35.68, 139.55],
      [35.6825, 139.5525],
    ],
    color: '#FF0000',
    distance: 2500,
  },
  {
    bounds: [
      [35.69, 139.75],
      [35.6925, 139.7525],
    ],
    color: '#0000FF',
    distance: 150,
  },
];
const voronoiData = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [139.6, 35.75],
            [139.7, 35.75],
            [139.7, 35.65],
            [139.6, 35.65],
            [139.6, 35.75],
          ],
        ],
      },
    },
  ],
};
const municipalitiesData = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { ward_ja: '中野区' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [139.64, 35.73],
            [139.69, 35.73],
            [139.69, 35.68],
            [139.64, 35.68],
            [139.64, 35.73],
          ],
        ],
      },
    },
  ],
};

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

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={position}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <LayersControl position="topright">
          <LayersControl.Overlay checked name="市区町村 境界線">
            <GeoJSON
              data={municipalitiesData as any}
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

          <LayersControl.BaseLayer checked name="アクセス距離 (250mメッシュ)">
            <LayerGroup>
              {meshData.map((tile, index) => (
                <Rectangle
                  key={index}
                  bounds={tile.bounds as L.LatLngBoundsExpression}
                  pathOptions={{
                    color: tile.color,
                    fillColor: tile.color,
                    fillOpacity: 0.6,
                    weight: 0,
                  }}
                >
                  <Popup>最近傍施設までの距離: {tile.distance}m</Popup>
                </Rectangle>
              ))}
            </LayerGroup>
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="ボロノイ領域">
            <GeoJSON
              data={voronoiData as any}
              style={{ color: 'purple', weight: 2, fillOpacity: 0.1 }}
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked name="施設マーカー">
            <LayerGroup>
              {facilityData.map((facility) => (
                <CircleMarker
                  key={facility.id}
                  center={[facility.lat, facility.lon]}
                  radius={5}
                  pathOptions={{
                    color: 'white',
                    weight: 1,
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
