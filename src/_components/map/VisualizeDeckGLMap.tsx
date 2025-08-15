"use client";

import type { Layer } from "@deck.gl/core";
import React, { useCallback, useMemo } from "react";
import { useMapData } from "@/_hooks/useMapData";
import { useMapLayers } from "@/_hooks/useMapLayers";
import { MAP_SETTINGS } from "@/_settings/visualize-map";
import BaseMap, { type ViewState } from "./BaseMap";
import Colorbar from "./Colorbar";
import LayerControlPanel from "./LayerControlPanel";

interface VisualizeDeckGLMapProps {
  facilityType: string;
  maxDistance: number;
}

export default function VisualizeDeckGLMap({
  facilityType,
  maxDistance,
}: VisualizeDeckGLMapProps) {
  // データ取得
  const { facilities, meshData, voronoiData, municipalitiesData, loading } =
    useMapData(facilityType);

  // レイヤー作成Hook
  const {
    createMunicipalitiesLayer,
    createMeshLayer,
    createVoronoiLayer,
    createVisualizationFacilitiesLayer,
  } = useMapLayers();

  // レイヤー表示状態
  const [layerVisibility, setLayerVisibility] = React.useState({
    municipalities: true,
    mesh: true,
    voronoi: false,
    facilities: true,
  });

  // レイヤー構成（可視化用）
  const layers = useMemo((): Layer[] => {
    const allLayers: (Layer | null)[] = [
      createMunicipalitiesLayer(
        municipalitiesData,
        layerVisibility.municipalities
      ),
      createMeshLayer(meshData, maxDistance, layerVisibility.mesh),
      createVoronoiLayer(voronoiData, maxDistance, layerVisibility.voronoi),
      createVisualizationFacilitiesLayer(
        facilities,
        layerVisibility.facilities
      ),
    ];

    return allLayers.filter(Boolean) as Layer[];
  }, [
    municipalitiesData,
    meshData,
    voronoiData,
    facilities,
    maxDistance,
    layerVisibility,
    createMunicipalitiesLayer,
    createMeshLayer,
    createVoronoiLayer,
    createVisualizationFacilitiesLayer,
  ]);

  // ビューステート（東京中心）
  const viewState = useMemo(
    (): ViewState => ({
      longitude: MAP_SETTINGS.center[1],
      latitude: MAP_SETTINGS.center[0],
      zoom: MAP_SETTINGS.zoom,
      pitch: 0,
      bearing: 0,
    }),
    []
  );

  // ツールチップ（可視化用）
  const getTooltip = useCallback((info: any) => {
    if (!info.object) return null;

    // メッシュツールチップ
    if (info.object.properties?.distance_m !== undefined) {
      return {
        html: `
          <div class="p-2">
            <div class="text-sm font-medium">最近傍施設までの距離</div>
            <div class="text-lg font-bold text-blue-600">
              ${Math.round(info.object.properties.distance_m)}m
            </div>
          </div>
        `,
        style: {
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          color: "#333",
          borderRadius: "6px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          border: "1px solid #e5e7eb",
        },
      };
    }

    // 行政区ツールチップ
    if (info.object.properties?.ward_ja) {
      return {
        html: `<div class="p-2 text-sm font-medium">${info.object.properties.ward_ja}</div>`,
        style: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          color: "white",
          borderRadius: "4px",
        },
      };
    }

    // 施設ツールチップ
    if (info.object.name) {
      return {
        html: `
          <div class="p-2">
            <div class="font-bold text-sm">${info.object.name}</div>
            <div class="text-xs text-gray-600">${info.object.address}</div>
          </div>
        `,
        style: {
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          color: "#333",
          borderRadius: "6px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          border: "1px solid #e5e7eb",
        },
      };
    }

    return null;
  }, []);

  // ローディング表示
  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600 mb-2">
            地図データを読み込んでいます...
          </p>
          <div className="w-64 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full animate-pulse"
              style={{ width: "66%" }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BaseMap
      layers={layers}
      initialViewState={viewState}
      getTooltip={getTooltip}
      showAttribution={true}
    >
      {/* 可視化地図専用のオーバーレイ */}
      <LayerControlPanel
        layerVisibility={layerVisibility}
        onLayerToggle={setLayerVisibility}
      />

      <Colorbar maxDistance={maxDistance} />
    </BaseMap>
  );
}
