// src/_components/map/InquiryAnalyticsMap.tsx
"use client";

import type { Layer } from "@deck.gl/core";
import { useCallback, useMemo, useState } from "react";
import {
  type FacilityAnalytics,
  useInquiryData,
} from "@/_hooks/useInquiryData";
import {
  useInquiryMapLayers,
  type VisualizationMode,
} from "@/_hooks/useInquiryMapLayers";
import { useInquiryOriginData } from "@/_hooks/useInquiryOriginData";
import { useMapData } from "@/_hooks/useMapData";
import { MAP_SETTINGS } from "@/_settings/visualize-map";
import BaseMap, { type ViewState } from "./BaseMap";
import InquiryColorbar from "./InquiryColorbar";
import InquiryControlPanel from "./InquiryControlPanel";

interface InquiryAnalyticsMapProps {
  facilityType: string;
  timeRange: number; // days
}

// interface InquiryAnalyticsData {
//   facilities: FacilityAnalytics[];
//   summary: {
//     totalFacilities: number;
//     totalInquiries: number;
//     totalReplies: number;
//     averageReplyRate: number;
//     topPerformers: FacilityAnalytics[];
//   };
// }

export default function InquiryAnalyticsMap({
  facilityType,
  timeRange,
}: InquiryAnalyticsMapProps) {
  // データ取得
  const { municipalitiesData, loading: mapLoading } = useMapData(facilityType);
  const {
    data: analyticsData,
    loading: analyticsLoading,
    error,
  } = useInquiryData(facilityType, timeRange);
  const { data: originData, loading: originLoading } = useInquiryOriginData(
    facilityType,
    timeRange,
    250
  );

  const loading = mapLoading || analyticsLoading || originLoading;

  // レイヤー作成Hook
  const {
    createInquiryHeatmapLayer,
    createInquiryIconLayer,
    createInquiryOriginMeshLayer,
    createInquiryOriginPointsLayer,
    createStatsLabelLayer,
    createInquiryMunicipalitiesLayer,
  } = useInquiryMapLayers();

  // 表示モードとレイヤー設定
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>("replyRate");
  const [layerVisibility, setLayerVisibility] = useState({
    municipalities: true,
    heatmap: true,
    icons: false,
    labels: true,
    origins: false,
    originMesh: false, // 新機能：発信地点メッシュ
    originPoints: false, // 新機能：発信地点マーカー
  });

  // レイヤー構成
  const layers = useMemo((): Layer[] => {
    if (!analyticsData || !analyticsData.facilities.length) {
      return [];
    }

    const allLayers: (Layer | null)[] = [
      // 行政区域（問い合わせ密度対応）
      createInquiryMunicipalitiesLayer(
        municipalitiesData,
        analyticsData.facilities,
        layerVisibility.municipalities
      ),

      // 発信地点メッシュレイヤー（背景として表示）
      originData && layerVisibility.originMesh
        ? createInquiryOriginMeshLayer(
            originData.geoJson,
            originData.summary.maxInquiriesPerMesh,
            true
          )
        : null,

      // ヒートマップ（メイン可視化）
      createInquiryHeatmapLayer(
        analyticsData.facilities,
        visualizationMode,
        layerVisibility.heatmap
      ),

      // アイコン表示
      createInquiryIconLayer(
        analyticsData.facilities,
        visualizationMode,
        layerVisibility.icons
      ),

      // 統計ラベル
      createStatsLabelLayer(
        analyticsData.facilities,
        visualizationMode,
        layerVisibility.labels
      ),

      // 発信地点マーカー
      originData && layerVisibility.originPoints
        ? createInquiryOriginPointsLayer(
            originData.meshTiles.flatMap((tile) =>
              tile.recentInquiries.slice(0, 1).map((inquiryId) => ({
                id: inquiryId,
                searchLatitude: tile.lat,
                searchLongitude: tile.lon,
                totalFacilities: Math.round(
                  tile.totalFacilities / tile.inquiryCount
                ),
                createdAt: new Date().toISOString(),
              }))
            ),
            true
          )
        : null,
    ];

    return allLayers.filter(Boolean) as Layer[];
  }, [
    analyticsData,
    originData,
    municipalitiesData,
    visualizationMode,
    layerVisibility,
    createInquiryMunicipalitiesLayer,
    createInquiryOriginMeshLayer,
    createInquiryHeatmapLayer,
    createInquiryIconLayer,
    createStatsLabelLayer,
    createInquiryOriginPointsLayer,
  ]);

  // ビューステート
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

  // ツールチップ
  const getTooltip = useCallback(
    (info: any) => {
      if (!info.object) return null;

      // 発信地点メッシュのツールチップ
      if (info.layer?.id === "inquiry-origin-mesh-layer") {
        const props = info.object.properties;
        const density = props.density?.toFixed(2) || 0;

        return {
          html: `
          <div class="p-4 max-w-sm" role="tooltip">
            <div class="font-bold text-base mb-2 text-purple-800">
              📍 問い合わせ発信エリア
            </div>
            <div class="text-sm text-gray-600 mb-3">
              250m × 250m メッシュ
            </div>
            
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div class="bg-purple-50 p-2 rounded">
                <div class="font-semibold text-purple-800">発信数</div>
                <div class="text-lg font-bold text-purple-600">${props.inquiryCount}件</div>
              </div>
              <div class="bg-blue-50 p-2 rounded">
                <div class="font-semibold text-blue-800">ユーザー</div>
                <div class="text-lg font-bold text-blue-600">${props.uniqueUsers}人</div>
              </div>
              <div class="bg-green-50 p-2 rounded">
                <div class="font-semibold text-green-800">平均対象</div>
                <div class="text-lg font-bold text-green-600">${Math.round(props.totalFacilities / props.inquiryCount)}件</div>
              </div>
              <div class="bg-orange-50 p-2 rounded">
                <div class="font-semibold text-orange-800">密度</div>
                <div class="text-lg font-bold text-orange-600">${density}/km²</div>
              </div>
            </div>
            
            <div class="mt-3 text-xs text-gray-600">
              平均検索半径: ${Math.round(props.averageRadius)}m
            </div>
          </div>
        `,
          style: {
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            color: "#333",
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            border: "1px solid #e5e7eb",
            fontSize: "12px",
            maxWidth: "320px",
          },
        };
      }

      // 問い合わせデータのツールチップ
      if (
        info.layer?.id === "inquiry-heatmap-layer" ||
        info.layer?.id === "inquiry-icon-layer"
      ) {
        const facility = info.object as FacilityAnalytics;
        const { analytics } = facility;

        return {
          html: `
          <div class="p-4 max-w-sm" role="tooltip">
            <div class="font-bold text-base mb-2 text-gray-800">${facility.facility.name}</div>
            <div class="text-sm text-gray-600 mb-3">${facility.facility.address}</div>
            
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div class="bg-blue-50 p-2 rounded">
                <div class="font-semibold text-blue-800">問い合わせ</div>
                <div class="text-lg font-bold text-blue-600">${analytics.totalInquiries}件</div>
              </div>
              <div class="bg-green-50 p-2 rounded">
                <div class="font-semibold text-green-800">返信率</div>
                <div class="text-lg font-bold text-green-600">${analytics.replyRate}%</div>
              </div>
              <div class="bg-yellow-50 p-2 rounded">
                <div class="font-semibold text-yellow-800">開封率</div>
                <div class="text-lg font-bold text-yellow-600">${analytics.openRate}%</div>
              </div>
              <div class="bg-purple-50 p-2 rounded">
                <div class="font-semibold text-purple-800">平均距離</div>
                <div class="text-lg font-bold text-purple-600">${(analytics.averageDistance / 1000).toFixed(1)}km</div>
              </div>
            </div>
            
            ${
              analytics.averageReplyTimeHours
                ? `<div class="mt-2 text-xs text-gray-600">
                   平均返信時間: ${analytics.averageReplyTimeHours.toFixed(1)}時間
                 </div>`
                : ""
            }
            
            <div class="text-xs text-gray-500 mt-2">
              クリックで詳細表示
            </div>
          </div>
        `,
          style: {
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            color: "#333",
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            border: "1px solid #e5e7eb",
            fontSize: "12px",
            maxWidth: "280px",
          },
        };
      }

      // 行政区域のツールチップ
      if (info.layer?.id === "inquiry-municipalities-layer") {
        const cityName =
          info.object.properties?.ward_ja || info.object.properties?.city_ja;

        // この地域の統計を計算
        const cityFacilities =
          analyticsData?.facilities.filter(
            (f) => f.facility.city === cityName
          ) || [];

        const totalInquiries = cityFacilities.reduce(
          (sum, f) => sum + f.analytics.totalInquiries,
          0
        );
        const totalReplies = cityFacilities.reduce(
          (sum, f) => sum + f.analytics.repliedCount,
          0
        );
        const avgReplyRate =
          totalInquiries > 0 ? (totalReplies / totalInquiries) * 100 : 0;

        return {
          html: `
          <div class="p-3" role="tooltip">
            <div class="font-bold text-sm mb-2">${cityName}</div>
            <div class="text-xs space-y-1">
              <div>施設数: ${cityFacilities.length}件</div>
              <div>問い合わせ: ${totalInquiries}件</div>
              <div>返信率: ${avgReplyRate.toFixed(1)}%</div>
            </div>
          </div>
        `,
          style: {
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            color: "white",
            borderRadius: "6px",
            fontSize: "12px",
          },
        };
      }

      return null;
    },
    [analyticsData]
  );

  // ローディング表示
  if (loading || mapLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            問い合わせデータを分析中...
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {facilityType} | 過去{timeRange}日間のデータ
          </p>
          <div className="w-64 bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full animate-pulse"
              style={{ width: "75%" }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            データ読み込みエラー
          </h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  // データがない場合
  if (!analyticsData || analyticsData.facilities.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-gray-400 text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            問い合わせデータがありません
          </h3>
          <p className="text-sm text-gray-600">
            {facilityType} タイプの過去{timeRange}
            日間に問い合わせデータが見つかりませんでした。
          </p>
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
      {/* 問い合わせ分析専用コントロールパネル */}
      <InquiryControlPanel
        visualizationMode={visualizationMode}
        onModeChange={setVisualizationMode}
        layerVisibility={layerVisibility}
        onLayerToggle={setLayerVisibility}
        summaryStats={analyticsData.summary}
        timeRange={timeRange}
        facilityType={facilityType}
      />

      {/* 問い合わせ用カラーバー */}
      <InquiryColorbar
        mode={visualizationMode}
        data={analyticsData.facilities}
      />

      {/* 統計サマリーパネル */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 rounded-lg shadow-lg border p-4 max-w-sm">
        <h4 className="font-semibold text-sm mb-3 text-gray-800">
          📊 分析サマリー
        </h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {analyticsData.summary.totalFacilities}
            </div>
            <div className="text-gray-600">対象施設</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {analyticsData.summary.totalInquiries}
            </div>
            <div className="text-gray-600">総問い合わせ</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">
              {analyticsData.summary.totalReplies}
            </div>
            <div className="text-gray-600">総返信</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">
              {analyticsData.summary.averageReplyRate.toFixed(1)}%
            </div>
            <div className="text-gray-600">平均返信率</div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            過去{timeRange}日間のデータ
          </div>
        </div>
      </div>
    </BaseMap>
  );
}
