"use client";

import type { Layer } from "@deck.gl/core";
import { ChevronDown, ChevronUp, List } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/_components/ui/badge";
import { Button } from "@/_components/ui/button";
import { Card, CardContent, CardHeader } from "@/_components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/_components/ui/collapsible";
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

interface AccessibleSearchResultMapProps {
  facilities: FacilityWithDistance[];
  userLocation: UserLocation;
  selectedFacility?: Facility;
  onFacilitySelect?: (facility: Facility) => void;
  searchRadius: number;
  facilityType?: string;
}

export default function AccessibleSearchResultMap({
  facilities,
  userLocation,
  selectedFacility,
  onFacilitySelect,
  searchRadius,
  facilityType = "asds",
}: AccessibleSearchResultMapProps) {
  const [showFacilitiesList, setShowFacilitiesList] = useState(false);
  const [keyboardFocusedIndex, setKeyboardFocusedIndex] = useState<number>(-1);
  const mapRef = useRef<HTMLDivElement>(null);
  const facilitiesListRef = useRef<HTMLDivElement>(null);

  // 行政区データを取得
  const { municipalitiesData } = useMapData(facilityType);

  // レイヤー作成Hook
  const {
    createMunicipalitiesLayer,
    createSearchFacilitiesLayer,
    createSearchFacilitiesBackgroundLayer,
    createUserLocationLayer,
    createSearchRadiusLayer,
  } = useMapLayers();

  // キーボードナビゲーション
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!showFacilitiesList || facilities.length === 0) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setKeyboardFocusedIndex((prev) =>
            prev < facilities.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setKeyboardFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : facilities.length - 1
          );
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          if (
            keyboardFocusedIndex >= 0 &&
            keyboardFocusedIndex < facilities.length
          ) {
            onFacilitySelect?.(facilities[keyboardFocusedIndex]);
          }
          break;
        case "Escape":
          event.preventDefault();
          setShowFacilitiesList(false);
          setKeyboardFocusedIndex(-1);
          mapRef.current?.focus();
          break;
      }
    };

    if (showFacilitiesList) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [showFacilitiesList, facilities, keyboardFocusedIndex, onFacilitySelect]);

  // レイヤー構成
  const layers = useMemo((): Layer[] => {
    const allLayers: (Layer | null)[] = [
      createMunicipalitiesLayer(municipalitiesData, true),
      createSearchRadiusLayer(userLocation, searchRadius),
      createSearchFacilitiesBackgroundLayer(
        facilities,
        selectedFacility?.id,
        searchRadius
      ),
      createSearchFacilitiesLayer(
        facilities,
        selectedFacility?.id
        // searchRadius
      ),
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

  // ビューステート
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

        // スクリーンリーダー向けアナウンス
        const announcement = `施設を選択しました: ${info.object.name}、距離 ${formatDistance(info.object.distance)}`;
        announceToScreenReader(announcement);
      }
    },
    [onFacilitySelect]
  );

  // ツールチップ
  const getTooltip = useCallback((info: any) => {
    if (!info.object) return null;

    if (info.layer?.id === "search-facilities-layer") {
      const facility = info.object as FacilityWithDistance;
      return {
        html: `
          <div class="p-3" role="tooltip">
            <div class="font-bold text-sm mb-1">${facility.name}</div>
            <div class="text-xs text-gray-600 mb-2">${facility.address}</div>
            <div class="text-xs">
              <span class="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded">
                距離: ${formatDistance(facility.distance)}
              </span>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              クリックで詳細表示
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

    if (info.object.properties?.ward_ja) {
      return {
        html: `<div class="p-2 text-xs font-medium" role="tooltip">${info.object.properties.ward_ja}</div>`,
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

  // 施設リストでの選択処理
  const handleFacilityListSelect = useCallback(
    (facility: Facility, index: number) => {
      onFacilitySelect?.(facility);
      setKeyboardFocusedIndex(index);

      // スクリーンリーダー向けアナウンス
      const announcement = `施設を選択しました: ${facility.name}、距離 ${formatDistance((facility as FacilityWithDistance).distance)}`;
      announceToScreenReader(announcement);
    },
    [onFacilitySelect]
  );

  return (
    <div
      className="relative h-full w-full"
      role="application"
      aria-label="施設検索結果の地図表示"
    >
      {/* アクセシブルな地図エリア */}
      <div
        ref={mapRef}
        // tabIndex={0}
        role="img"
        aria-labelledby="map-description"
        className="h-full w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setShowFacilitiesList(true);
          }
        }}
      >
        {/* 地図の説明（非表示） */}
        <div
          id="map-description"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: "0",
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: "0",
          }}
        >
          検索結果地図: 現在地 緯度{userLocation.latitude.toFixed(4)} 経度
          {userLocation.longitude.toFixed(4)} を中心に 半径
          {formatDistance(searchRadius)}以内で{facilities.length}
          件の施設が見つかりました。
          矢印キーで施設を選択、Enterで詳細表示できます。
        </div>
        <BaseMap
          layers={layers}
          initialViewState={viewState}
          onLayerClick={handleLayerClick}
          getTooltip={getTooltip}
          showAttribution={true}
        />
      </div>

      {/* キーボードアクセス用施設リストパネル */}
      <div className="absolute top-4 left-4 z-10">
        <Collapsible
          open={showFacilitiesList}
          onOpenChange={setShowFacilitiesList}
        >
          <Card className="bg-white bg-opacity-95 shadow-lg">
            <CardHeader className="pb-2">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full flex items-center justify-between p-2"
                  aria-expanded={showFacilitiesList}
                  aria-controls="facilities-list"
                >
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      施設リスト ({facilities.length}件)
                    </span>
                  </div>
                  {showFacilitiesList ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </CardHeader>

            <CollapsibleContent>
              <CardContent className="pt-0 max-h-64 overflow-y-auto">
                <div
                  ref={facilitiesListRef}
                  id="facilities-list"
                  role="listbox"
                  aria-label="検索結果施設一覧"
                  className="space-y-2"
                >
                  {facilities.length === 0 ? (
                    <div
                      // role="status"
                      aria-live="polite"
                      className="text-sm text-gray-500 p-2"
                    >
                      検索結果がありません
                    </div>
                  ) : (
                    facilities.map((facility, index) => (
                      <div
                        key={facility.id}
                        role="option"
                        tabIndex={0}
                        aria-selected={selectedFacility?.id === facility.id}
                        aria-describedby={`facility-${facility.id}-details`}
                        className={`
                          p-3 rounded-lg border cursor-pointer transition-all
                          ${
                            selectedFacility?.id === facility.id
                              ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500"
                              : "bg-white border-gray-200 hover:bg-gray-50"
                          }
                          ${
                            keyboardFocusedIndex === index
                              ? "ring-2 ring-blue-500 ring-offset-1"
                              : ""
                          }
                          focus:outline-none focus:ring-2 focus:ring-blue-500
                        `}
                        onClick={() =>
                          handleFacilityListSelect(facility, index)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleFacilityListSelect(facility, index);
                          }
                        }}
                        onFocus={() => setKeyboardFocusedIndex(index)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-sm mb-1">
                              {facility.name}
                            </h3>
                            <p className="text-xs text-gray-600 mb-2">
                              {facility.address}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {formatDistance(facility.distance)}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {index + 1}番目に近い
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* スクリーンリーダー用詳細情報 */}
                        <div
                          id={`facility-${facility.id}-details`}
                          style={{
                            position: "absolute",
                            width: "1px",
                            height: "1px",
                            padding: "0",
                            margin: "-1px",
                            overflow: "hidden",
                            clip: "rect(0, 0, 0, 0)",
                            whiteSpace: "nowrap",
                            border: "0",
                          }}
                        >
                          施設名: {facility.name}、 住所: {facility.address}、
                          現在地からの距離: {formatDistance(facility.distance)}
                          、 検索結果 {facilities.length}件中 {index + 1}番目
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* キーボード操作ヘルプ */}
                <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
                  <div>⌨️ キーボード操作:</div>
                  <div>↑↓ 施設選択 | Enter 決定 | Esc 閉じる</div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* 地図情報パネル（スクリーンリーダー対応） */}
      <div
        className="absolute top-4 right-4 bg-white bg-opacity-95 rounded-lg shadow-lg border p-3"
        // role="region"
        // aria-labelledby="search-info-title"
      >
        <div id="search-info-title" className="text-sm font-medium mb-2">
          検索結果
        </div>
        <div className="space-y-1 text-xs text-gray-600">
          <div>
            現在地:
            <span className="sr-only">緯度</span>
            {userLocation.latitude.toFixed(4)},
            <span className="sr-only">経度</span>
            {userLocation.longitude.toFixed(4)}
          </div>
          <div>検索範囲: {formatDistance(searchRadius)}</div>
          <div>
            見つかった施設:
            <span className="font-medium text-blue-600" aria-live="polite">
              {facilities.length}件
            </span>
          </div>
          {facilities.length > 0 && (
            <div>
              最短距離:{" "}
              {formatDistance(Math.min(...facilities.map((f) => f.distance)))}
            </div>
          )}
        </div>
      </div>

      {/* アクセシビリティ向上のための非表示説明 */}
      <div
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: "0",
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: "0",
        }}
        aria-live="polite"
      >
        {selectedFacility &&
          `選択中の施設: ${selectedFacility.name}、住所: ${selectedFacility.address}`}
      </div>

      {/* 操作説明パネル */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 rounded-lg shadow-lg border p-3">
        <div className="text-sm font-medium mb-2">操作方法</div>
        <div className="space-y-1 text-xs text-gray-600">
          <div>🖱️ 地図上の施設アイコンをクリック</div>
          <div>⌨️ 施設リストボタンでキーボード操作</div>
          <div>📱 タッチでも操作可能</div>
        </div>
      </div>

      {/* スキップリンク */}
      <a
        href="#main-content"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: "0",
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: "0",
        }}
        onFocus={(e) => {
          const target = e.target as HTMLElement;
          target.style.position = "absolute";
          target.style.top = "1rem";
          target.style.left = "50%";
          target.style.transform = "translateX(-50%)";
          target.style.backgroundColor = "#2563eb";
          target.style.color = "white";
          target.style.padding = "0.5rem 1rem";
          target.style.borderRadius = "0.25rem";
          target.style.zIndex = "50";
          target.style.width = "auto";
          target.style.height = "auto";
          target.style.clip = "auto";
          target.style.overflow = "visible";
          target.style.whiteSpace = "normal";
          target.style.border = "none";
          target.style.margin = "0";
        }}
        onBlur={(e) => {
          const target = e.target as HTMLElement;
          target.style.position = "absolute";
          target.style.width = "1px";
          target.style.height = "1px";
          target.style.padding = "0";
          target.style.margin = "-1px";
          target.style.overflow = "hidden";
          target.style.clip = "rect(0, 0, 0, 0)";
          target.style.whiteSpace = "nowrap";
          target.style.border = "0";
        }}
      >
        メインコンテンツにスキップ
      </a>
    </div>
  );
}

/**
 * スクリーンリーダー向けライブアナウンス
 */
function announceToScreenReader(message: string): void {
  const announcement = document.createElement("div");
  announcement.setAttribute("aria-live", "polite");
  announcement.setAttribute("aria-atomic", "true");
  announcement.style.position = "absolute";
  announcement.style.width = "1px";
  announcement.style.height = "1px";
  announcement.style.padding = "0";
  announcement.style.margin = "-1px";
  announcement.style.overflow = "hidden";
  announcement.style.clip = "rect(0, 0, 0, 0)";
  announcement.style.whiteSpace = "nowrap";
  announcement.style.border = "0";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body.removeChild(announcement);
    }
  }, 1000);
}
