"use client";

import type { Layer } from "@deck.gl/core";
import { useCallback, useMemo } from "react";
import { useMapData } from "@/hooks/useMapData";
import { useMapLayers } from "@/hooks/useMapLayers";
import type { Facility } from "@/types";
import { formatDistance } from "@/utils/formatDistance";
import BaseMap, { type ViewState } from "./BaseMap";

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface FacilityWithDistance extends Facility {
  distance: number;
}

interface SearchResultMapProps {
  facilities: FacilityWithDistance[];
  userLocation: UserLocation;
  selectedFacility?: Facility;
  onFacilitySelect?: (facility: Facility) => void;
  searchRadius: number;
  facilityType?: string; // 行政区データ取得用
}

export default function SearchResultMap({
  facilities,
  userLocation,
  selectedFacility,
  onFacilitySelect,
  searchRadius,
  facilityType = "asds", // デフォルト値
}: SearchResultMapProps) {
  // 行政区データを取得（参考表示用）
  const { municipalitiesData } = useMapData(facilityType);

  // レイヤー作成Hook
  const {
    createMunicipalitiesLayer,
    createSearchFacilitiesLayer,
    createSearchFacilitiesBackgroundLayer,
    createUserLocationLayer,
    createSearchRadiusLayer,
  } = useMapLayers();

  // レイヤー構成
  const layers = useMemo((): Layer[] => {
    const allLayers: (Layer | null)[] = [
      // 1. 行政区境界（背景）
      createMunicipalitiesLayer(municipalitiesData, true),

      // 2. 検索範囲円
      createSearchRadiusLayer(userLocation, searchRadius),

      // 3. 施設背景円（距離による色分け）
      createSearchFacilitiesBackgroundLayer(
        facilities,
        selectedFacility?.id,
        searchRadius
      ),

      // 4. 施設アイコン
      createSearchFacilitiesLayer(
        facilities,
        selectedFacility?.id
        // searchRadius
      ),

      // 5. 現在地マーカー（最上位）
      createUserLocationLayer(userLocation),
    ];

    return allLayers.filter(Boolean) as Layer[];
  }, [
    municipalitiesData,
    userLocation,
    searchRadius,
    facilities,
    selectedFacility,
    createMunicipalitiesLayer,
    createSearchRadiusLayer,
    createSearchFacilitiesBackgroundLayer,
    createSearchFacilitiesLayer,
    createUserLocationLayer,
  ]);

  // ビューステート（現在地中心、検索範囲に応じたズーム）
  const viewState = useMemo((): ViewState => {
    const baseZoom =
      searchRadius <= 500
        ? 15
        : searchRadius <= 1000
          ? 14
          : searchRadius <= 2000
            ? 13
            : searchRadius <= 5000
              ? 12
              : 11;

    return {
      longitude: userLocation.longitude,
      latitude: userLocation.latitude,
      zoom: baseZoom,
      pitch: 0,
      bearing: 0,
    };
  }, [userLocation, searchRadius]);

  // 施設クリック処理
  const handleLayerClick = useCallback(
    (info: any) => {
      if (info.object && info.layer?.id === "search-facilities-layer") {
        onFacilitySelect?.(info.object);
      }
    },
    [onFacilitySelect]
  );

  // ツールチップ
  const getTooltip = useCallback((info: any) => {
    if (!info.object) return null;

    // 検索結果施設のツールチップ
    if (info.layer?.id === "search-facilities-layer") {
      const facility = info.object as FacilityWithDistance;
      return {
        html: `
          <div class="p-3">
            <div class="font-bold text-sm mb-1">${facility.name}</div>
            <div class="text-xs text-gray-600 mb-2">${facility.address}</div>
            <div class="text-xs">
              <span class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded">
                距離: ${formatDistance(facility.distance)}
              </span>
            </div>
          </div>
        `,
        style: {
          backgroundColor: "rgba(255, 255, 255, 0.97)",
          color: "#333",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          border: "1px solid #e5e7eb",
          fontSize: "12px",
          maxWidth: "220px",
        },
      };
    }

    // 行政区ツールチップ
    if (info.object.properties?.ward_ja) {
      return {
        html: `<div class="p-2 text-xs font-medium">${info.object.properties.ward_ja}</div>`,
        style: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          color: "white",
          borderRadius: "4px",
          padding: "4px 8px",
        },
      };
    }

    return null;
  }, []);

  return (
    <BaseMap
      layers={layers}
      initialViewState={viewState}
      onLayerClick={handleLayerClick}
      getTooltip={getTooltip}
      showAttribution={true}
    >
      {/* 検索結果地図専用のオーバーレイ */}
      <SearchMapOverlay
        facilities={facilities}
        searchRadius={searchRadius}
        userLocation={userLocation}
      />
    </BaseMap>
  );
}

/**
 * 検索地図用オーバーレイ
 */
function SearchMapOverlay({
  facilities,
  searchRadius,
  userLocation,
}: {
  facilities: FacilityWithDistance[];
  searchRadius: number;
  userLocation: UserLocation;
}) {
  return (
    <>
      {/* 検索情報パネル */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-95 rounded-lg shadow-lg border p-3">
        <div className="text-sm font-medium mb-2 flex items-center gap-2">
          🔍 検索結果
        </div>
        <div className="space-y-1 text-xs text-gray-600">
          <div>
            現在地: {userLocation.latitude.toFixed(4)},{" "}
            {userLocation.longitude.toFixed(4)}
          </div>
          <div>検索範囲: {formatDistance(searchRadius)}</div>
          <div>
            見つかった施設:{" "}
            <span className="font-medium text-blue-600">
              {facilities.length}件
            </span>
          </div>
          {facilities.length > 0 && (
            <div>
              最近距離:{" "}
              {formatDistance(Math.min(...facilities.map((f) => f.distance)))}
            </div>
          )}
        </div>
      </div>

      {/* 凡例 */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-95 rounded-lg shadow-lg border p-3">
        <div className="text-sm font-medium mb-2">凡例</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">+</span>
            </div>
            <span>現在地</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-blue-400 rounded-full bg-blue-100"></div>
            <span>検索範囲</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-400 rounded flex items-center justify-center">
              <span className="text-white text-xs">🏠</span>
            </div>
            <span>近い施設</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 rounded flex items-center justify-center">
              <span className="text-white text-xs">🏠</span>
            </div>
            <span>中距離施設</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-400 rounded flex items-center justify-center">
              <span className="text-white text-xs">🏠</span>
            </div>
            <span>遠い施設</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
              <span className="text-white text-xs font-bold">🏠</span>
            </div>
            <span>選択中施設</span>
          </div>
        </div>
      </div>
    </>
  );
}
