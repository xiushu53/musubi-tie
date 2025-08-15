"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { Facility } from "@/types";

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface FacilityWithDistance extends Facility {
  distance: number;
}

interface MapLoaderProps {
  // 従来の可視化マップ用
  facilityType?: string;
  maxDistance?: number;

  // 検索結果マップ用
  searchResults?: FacilityWithDistance[];
  userLocation?: UserLocation;
  selectedFacility?: Facility;
  onFacilitySelect?: (facility: Facility) => void;
  searchRadius?: number;

  // マップモード
  mode?: "visualization" | "search";
}

export default function MapLoader({
  facilityType,
  maxDistance,
  searchResults,
  userLocation,
  selectedFacility,
  onFacilitySelect,
  searchRadius,
  mode = "visualization",
}: MapLoaderProps) {
  // デバッグ用ログ
  console.log("🗺️ MapLoader props:", {
    mode,
    hasSearchResults: !!searchResults?.length,
    hasUserLocation: !!userLocation,
    facilityType,
    searchRadius,
  });

  // 検索結果マップコンポーネント
  const SearchResultMap = useMemo(
    () =>
      dynamic(() => import("@/_components/SearchResultMap"), {
        loading: () => (
          <div className="flex h-full items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">
                検索結果地図を読み込み中...
              </p>
            </div>
          </div>
        ),
        ssr: false,
      }),
    []
  );

  // 従来の可視化マップコンポーネント
  const VisualizeDeckGLMap = useMemo(
    () =>
      dynamic(() => import("@/_components/VisualizeDeckGLMap"), {
        loading: () => (
          <div className="flex h-full items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">可視化地図を読み込み中...</p>
            </div>
          </div>
        ),
        ssr: false,
      }),
    []
  );

  // モードに応じてコンポーネントを切り替え
  if (mode === "search") {
    console.log("🔍 検索結果マップモードで表示");

    // 検索結果マップモード
    if (!userLocation) {
      console.log("❌ 現在地が未設定");
      return (
        <div className="flex h-full items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <p className="text-lg mb-2">📍</p>
            <p>現在地を取得してください</p>
            <p className="text-sm">位置情報が必要です</p>
            <p className="text-xs text-red-500 mt-2">
              MODE: SEARCH (現在地待ち)
            </p>
          </div>
        </div>
      );
    }

    console.log("✅ 検索結果マップを表示:", {
      facilitiesCount: searchResults?.length || 0,
      userLocation: `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`,
      searchRadius,
    });

    return (
      <div className="relative h-full w-full">
        {/* デバッグ表示 */}
        <div className="absolute top-2 left-2 z-50 bg-green-500 text-white px-2 py-1 rounded text-xs">
          検索結果地図モード
        </div>

        <SearchResultMap
          facilities={searchResults || []}
          userLocation={userLocation}
          selectedFacility={selectedFacility}
          onFacilitySelect={onFacilitySelect}
          searchRadius={searchRadius || 1000}
          facilityType={facilityType}
        />
      </div>
    );
  }

  console.log("📊 可視化マップモードで表示");

  // 従来の可視化マップモード
  if (!facilityType || maxDistance === undefined) {
    console.log("❌ 可視化マップのパラメータが不足");
    return (
      <div className="flex h-full items-center justify-center bg-gray-100">
        <div className="text-center text-gray-500">
          <p>地図パラメータが不足しています</p>
          <p className="text-xs">
            facilityType: {facilityType}, maxDistance: {maxDistance}
          </p>
          <p className="text-xs text-red-500 mt-2">
            MODE: VISUALIZATION (パラメータ不足)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* デバッグ表示 */}
      <div className="absolute top-2 left-2 z-50 bg-blue-500 text-white px-2 py-1 rounded text-xs">
        可視化地図モード
      </div>

      <VisualizeDeckGLMap
        facilityType={facilityType}
        maxDistance={maxDistance}
      />
    </div>
  );
}
