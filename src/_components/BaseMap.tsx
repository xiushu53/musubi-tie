"use client";

import type { Layer } from "@deck.gl/core";
import DeckGL from "@deck.gl/react";
import type { StyleSpecification } from "maplibre-gl";
import type React from "react";
import { Map as MapLibre } from "react-map-gl/maplibre";

export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

export interface BaseMapProps {
  layers: Layer[];
  initialViewState: ViewState;
  onLayerClick?: (info: any) => void;
  onLayerHover?: (info: any) => void;
  getTooltip?: (info: any) => any;
  showAttribution?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * DeckGL + MapLibreベースの汎用地図コンポーネント
 */
export default function BaseMap({
  layers,
  initialViewState,
  onLayerClick,
  onLayerHover,
  getTooltip,
  showAttribution = true,
  className = "relative h-full w-full",
  children,
}: BaseMapProps) {
  // 軽量なベースマップスタイル
  const mapStyle: StyleSpecification = {
    version: 8,
    sources: {
      "carto-light": {
        type: "raster" as const,
        tiles: [
          "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: "carto-light-layer",
        type: "raster" as const,
        source: "carto-light",
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };

  return (
    <div className={className}>
      <DeckGL
        initialViewState={initialViewState}
        controller={true}
        layers={layers}
        onClick={onLayerClick}
        onHover={onLayerHover}
        getTooltip={getTooltip}
      >
        <MapLibre
          mapStyle={mapStyle}
          attributionControl={{
            compact: true,
            customAttribution: showAttribution
              ? "© CARTO © OpenStreetMap contributors"
              : "",
          }}
        />
      </DeckGL>

      {/* オーバーレイコンテンツ */}
      {children}

      {/* デフォルト属性表示 */}
      {showAttribution && (
        <div className="absolute bottom-2 left-2 text-xs text-gray-600 bg-white bg-opacity-80 px-2 py-1 rounded">
          © CARTO © OpenStreetMap contributors
        </div>
      )}
    </div>
  );
}
