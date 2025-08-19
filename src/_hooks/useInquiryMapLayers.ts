// src/_hooks/useInquiryMapLayers.ts
"use client";

import type { Layer } from "@deck.gl/core";
import {
  GeoJsonLayer,
  IconLayer,
  ScatterplotLayer,
  TextLayer,
} from "@deck.gl/layers";
import { useCallback } from "react";

export interface FacilityAnalytics {
  facility: {
    id: number;
    name: string;
    address: string;
    lat: number;
    lon: number;
    prefecture: string;
    city: string;
  };
  analytics: {
    totalInquiries: number;
    sentCount: number;
    deliveredCount: number;
    openedCount: number;
    repliedCount: number;
    replyRate: number;
    openRate: number;
    deliveryRate: number;
    averageDistance: number;
    averageReplyTimeHours: number | null;
    firstInquiryAt: string;
    lastInquiryAt: string;
  };
}

export type VisualizationMode =
  | "replyRate"
  | "inquiryCount"
  | "replyTime"
  | "distance"
  | "originDensity";

/**
 * 問い合わせデータ可視化用マップレイヤー
 */
export function useInquiryMapLayers() {
  /**
   * 返信率に基づく色計算
   */
  const getReplyRateColor = useCallback(
    (replyRate: number): [number, number, number, number] => {
      // 0% = 赤, 50% = 黄, 100% = 緑
      if (replyRate === 0) {
        return [239, 68, 68, 200]; // 赤（返信なし）
      } else if (replyRate < 25) {
        // 赤 → オレンジ
        const ratio = replyRate / 25;
        return [239, Math.floor(68 + 112 * ratio), 68, 200];
      } else if (replyRate < 50) {
        // オレンジ → 黄
        const ratio = (replyRate - 25) / 25;
        return [255, Math.floor(180 + 75 * ratio), 68, 200];
      } else if (replyRate < 75) {
        // 黄 → 黄緑
        const ratio = (replyRate - 50) / 25;
        return [Math.floor(255 - 128 * ratio), 255, 68, 200];
      } else {
        // 黄緑 → 緑
        const ratio = (replyRate - 75) / 25;
        return [
          Math.floor(127 - 59 * ratio),
          255,
          Math.floor(68 + 117 * ratio),
          200,
        ];
      }
    },
    []
  );

  /**
   * 問い合わせ件数に基づく色計算
   */
  const getInquiryCountColor = useCallback(
    (count: number, maxCount: number): [number, number, number, number] => {
      if (count === 0) return [200, 200, 200, 150]; // グレー

      const ratio = Math.min(count / maxCount, 1);
      // 青のグラデーション
      const blue = Math.floor(255 * ratio);
      return [0, Math.floor(100 + 155 * ratio), blue, 200];
    },
    []
  );

  /**
   * 問い合わせ発信地点密度に基づく色計算
   */
  const getOriginDensityColor = useCallback(
    (
      inquiryCount: number,
      maxCount: number
    ): [number, number, number, number] => {
      if (inquiryCount === 0) return [240, 240, 240, 0]; // 透明

      const ratio = Math.min(inquiryCount / maxCount, 1);

      if (ratio < 0.2) {
        // 薄い青
        return [147, 197, 253, Math.floor(100 + 100 * ratio)];
      } else if (ratio < 0.4) {
        // 青
        return [59, 130, 246, Math.floor(150 + 80 * ratio)];
      } else if (ratio < 0.6) {
        // 濃い青
        return [37, 99, 235, Math.floor(180 + 60 * ratio)];
      } else if (ratio < 0.8) {
        // 紫
        return [139, 92, 246, Math.floor(200 + 40 * ratio)];
      } else {
        // 濃い紫（ホットスポット）
        return [124, 58, 237, Math.floor(220 + 35 * ratio)];
      }
    },
    []
  );
  /**
   * KDE密度に基づく連続的ヒートマップの色計算
   */
  const getKDEHeatmapColor = useCallback(
    (
      interpolatedDensity: number,
      maxDensity: number,
      isOriginalData: boolean
    ): [number, number, number, number] => {
      if (interpolatedDensity <= 0) return [0, 0, 0, 0]; // 完全透明

      // 正規化された密度値 (0-1)
      const normalizedDensity = Math.min(interpolatedDensity / maxDensity, 1);

      // 実データと補間データで異なる表現
      if (isOriginalData) {
        // 実際の発信地点: より濃い色、不透明度高め
        const alpha = Math.max(180, Math.floor(180 + 75 * normalizedDensity));

        if (normalizedDensity < 0.2) {
          // 低密度: 薄い青
          return [147, 197, 253, alpha];
        } else if (normalizedDensity < 0.4) {
          // 中低密度: 青
          return [59, 130, 246, alpha];
        } else if (normalizedDensity < 0.6) {
          // 中密度: 濃い青
          return [37, 99, 235, alpha];
        } else if (normalizedDensity < 0.8) {
          // 高密度: 青紫
          return [99, 102, 241, alpha];
        } else {
          // 最高密度: 濃い紫（山の頂上）
          return [124, 58, 237, alpha];
        }
      } else {
        // 補間データ: より薄い色、透明度を活用した滑らかなグラデーション
        const alpha = Math.max(40, Math.floor(40 + 120 * normalizedDensity));

        if (normalizedDensity < 0.15) {
          // 非常に薄い: 薄い水色
          return [191, 219, 254, alpha];
        } else if (normalizedDensity < 0.3) {
          // 薄い: 薄い青
          return [147, 197, 253, alpha];
        } else if (normalizedDensity < 0.5) {
          // 中程度: 青
          return [96, 165, 250, alpha];
        } else if (normalizedDensity < 0.7) {
          // やや濃い: 濃い青
          return [59, 130, 246, alpha];
        } else {
          // 濃い: 青紫（山の裾野）
          return [129, 140, 248, alpha];
        }
      }
    },
    []
  );

  /**
   * KDE対応問い合わせ発信地点メッシュレイヤー
   */
  const createInquiryOriginKDELayer = useCallback(
    (
      geoJsonData: any,
      maxInterpolatedDensity: number,
      visible: boolean = true
    ): Layer | null => {
      if (!geoJsonData || !visible) return null;

      return new GeoJsonLayer({
        id: "inquiry-origin-kde-layer",
        data: geoJsonData,
        filled: true,
        stroked: true,
        getFillColor: (feature: any) => {
          const props = feature.properties;
          const interpolatedDensity = props?.interpolatedDensity || 0;
          const isOriginalData = props?.isOriginalData || false;

          return getKDEHeatmapColor(
            interpolatedDensity,
            maxInterpolatedDensity,
            isOriginalData
          );
        },
        getLineColor: (feature: any) => {
          const isOriginalData = feature.properties?.isOriginalData || false;
          // 実データは明確な境界線、補間データは薄い境界線
          return isOriginalData
            ? [255, 255, 255, 150] // 実データ: 白い境界線
            : [255, 255, 255, 30]; // 補間データ: 非常に薄い境界線
        },
        getLineWidth: (feature: any) => {
          const isOriginalData = feature.properties?.isOriginalData || false;
          return isOriginalData ? 2 : 0.5; // 実データはやや太い線
        },
        pickable: true,
        updateTriggers: {
          getFillColor: [maxInterpolatedDensity],
          getLineColor: [],
          getLineWidth: [],
        },
      });
    },
    [getKDEHeatmapColor]
  );

  /**
   * 発信地点の山頂マーカー（実データのみ）
   */
  const createOriginPeakMarkersLayer = useCallback(
    (
      meshTiles: Array<{
        lat: number;
        lon: number;
        inquiryCount: number;
        interpolatedDensity: number;
        isOriginalData: boolean;
      }>,
      visible: boolean = true
    ): Layer | null => {
      if (!meshTiles.length || !visible) return null;

      // 実データのみをフィルター
      const originalDataPoints = meshTiles.filter(
        (tile) => tile.isOriginalData
      );

      if (originalDataPoints.length === 0) return null;

      // 山頂マーカーのSVG
      const peakIconSvg = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" fill="#7C3AED" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="12" cy="12" r="3" fill="#FFFFFF"/>
        <text x="12" y="16" text-anchor="middle" fill="#FFFFFF" font-size="8" font-weight="bold">▲</text>
      </svg>
    `;

      return new IconLayer({
        id: "inquiry-origin-peak-markers",
        data: originalDataPoints,
        getPosition: (d: any) => [d.lon, d.lat],
        getIcon: () => ({
          url: `data:image/svg+xml;base64,${btoa(peakIconSvg)}`,
          width: 16,
          height: 16,
          anchorY: 8,
          anchorX: 8,
        }),
        getSize: (d: any) => {
          // 発信件数に応じてサイズ調整
          return Math.max(16, Math.min(32, 12 + d.inquiryCount * 2));
        },
        pickable: true,
        sizeUnits: "pixels",
      });
    },
    []
  );

  const getReplyTimeColor = useCallback(
    (replyTimeHours: number | null): [number, number, number, number] => {
      if (replyTimeHours === null) return [200, 200, 200, 150]; // グレー（返信なし）

      // 24時間以内 = 緑, 72時間以上 = 赤
      if (replyTimeHours <= 24) {
        return [34, 197, 94, 200]; // 緑（迅速）
      } else if (replyTimeHours <= 48) {
        return [234, 179, 8, 200]; // 黄（普通）
      } else if (replyTimeHours <= 72) {
        return [249, 115, 22, 200]; // オレンジ（遅い）
      } else {
        return [239, 68, 68, 200]; // 赤（非常に遅い）
      }
    },
    []
  );

  /**
   * 問い合わせ施設のヒートマップレイヤー
   */
  const createInquiryHeatmapLayer = useCallback(
    (
      data: FacilityAnalytics[],
      mode: VisualizationMode,
      visible: boolean = true
    ): Layer | null => {
      if (!data.length || !visible) return null;

      const maxCount = Math.max(...data.map((d) => d.analytics.totalInquiries));

      return new ScatterplotLayer<FacilityAnalytics>({
        id: "inquiry-heatmap-layer",
        data,
        getPosition: (d: FacilityAnalytics) => [d.facility.lon, d.facility.lat],
        getRadius: (d: FacilityAnalytics) => {
          // 問い合わせ件数に応じてサイズ調整
          const baseRadius = 100;
          const sizeMultiplier =
            Math.log(d.analytics.totalInquiries + 1) / Math.log(maxCount + 1);
          return baseRadius + baseRadius * sizeMultiplier;
        },
        getFillColor: (d: FacilityAnalytics) => {
          switch (mode) {
            case "replyRate":
              return getReplyRateColor(d.analytics.replyRate);
            case "inquiryCount":
              return getInquiryCountColor(d.analytics.totalInquiries, maxCount);
            case "replyTime":
              return getReplyTimeColor(d.analytics.averageReplyTimeHours);
            case "distance": {
              // 距離モードの場合は平均距離で色分け
              const ratio = Math.min(d.analytics.averageDistance / 5000, 1);
              return [
                Math.floor(255 * ratio),
                Math.floor(255 * (1 - ratio)),
                0,
                200,
              ];
            }
            default:
              return [100, 100, 100, 200];
          }
        },
        getLineColor: [255, 255, 255, 255],
        getLineWidth: 2,
        radiusUnits: "meters",
        pickable: true,
        stroked: true,
        filled: true,
        updateTriggers: {
          getFillColor: [mode],
          getRadius: [maxCount],
        },
      });
    },
    [getReplyRateColor, getInquiryCountColor, getReplyTimeColor]
  );

  /**
   * 問い合わせ傾向を示すアイコンレイヤー
   */
  const createInquiryIconLayer = useCallback(
    (
      data: FacilityAnalytics[],
      mode: VisualizationMode,
      visible: boolean = true
    ): Layer | null => {
      if (!data.length || !visible) return null;

      // アイコンSVGの生成
      const getIconSvg = (analytics: FacilityAnalytics["analytics"]) => {
        const { replyRate, totalInquiries } = analytics;

        if (totalInquiries === 0) {
          // 問い合わせなし
          return `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#D1D5DB" stroke="#FFFFFF" stroke-width="2"/>
              <path d="M15 9l-6 6m0-6l6 6" stroke="#FFFFFF" stroke-width="2"/>
            </svg>
          `;
        } else if (replyRate >= 80) {
          // 高返信率
          return `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#10B981" stroke="#FFFFFF" stroke-width="2"/>
              <path d="M9 12l2 2 4-4" stroke="#FFFFFF" stroke-width="2"/>
            </svg>
          `;
        } else if (replyRate >= 50) {
          // 中返信率
          return `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#F59E0B" stroke="#FFFFFF" stroke-width="2"/>
              <path d="M12 8v4l3 3" stroke="#FFFFFF" stroke-width="2"/>
            </svg>
          `;
        } else {
          // 低返信率
          return `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#EF4444" stroke="#FFFFFF" stroke-width="2"/>
              <path d="M12 9v2m0 4h.01" stroke="#FFFFFF" stroke-width="2"/>
            </svg>
          `;
        }
      };

      return new IconLayer({
        id: "inquiry-icon-layer",
        data,
        getPosition: (d: FacilityAnalytics) => [d.facility.lon, d.facility.lat],
        getIcon: (d: FacilityAnalytics) => ({
          url: `data:image/svg+xml;base64,${btoa(getIconSvg(d.analytics))}`,
          width: 20,
          height: 20,
          anchorY: 10,
          anchorX: 10,
        }),
        getSize: (d: FacilityAnalytics) => {
          // 問い合わせ件数に応じてサイズ調整
          return Math.max(
            24,
            Math.min(40, 20 + d.analytics.totalInquiries * 2)
          );
        },
        pickable: true,
        sizeUnits: "pixels",
        updateTriggers: {
          getIcon: [mode],
          getSize: [],
        },
      });
    },
    []
  );

  /**
   * 問い合わせ発信地点メッシュレイヤー
   */
  const createInquiryOriginMeshLayer = useCallback(
    (
      geoJsonData: any,
      maxInquiryCount: number,
      visible: boolean = true
    ): Layer | null => {
      if (!geoJsonData || !visible) return null;

      return new GeoJsonLayer({
        id: "inquiry-origin-mesh-layer",
        data: geoJsonData,
        filled: true,
        stroked: true,
        getFillColor: (feature: any) => {
          const inquiryCount = feature.properties?.inquiryCount || 0;
          return getOriginDensityColor(inquiryCount, maxInquiryCount);
        },
        getLineColor: [255, 255, 255, 100],
        getLineWidth: 1,
        pickable: true,
        updateTriggers: {
          getFillColor: [maxInquiryCount],
        },
      });
    },
    [getOriginDensityColor]
  );

  /**
   * 問い合わせ発信地点マーカーレイヤー
   */
  const createInquiryOriginPointsLayer = useCallback(
    (
      inquiries: Array<{
        id: string;
        searchLatitude: number;
        searchLongitude: number;
        totalFacilities: number;
        createdAt: string;
      }>,
      visible: boolean = true
    ): Layer | null => {
      if (!inquiries.length || !visible) return null;

      // 検索地点のアイコン
      const originIconSvg = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="6" fill="#8B5CF6" stroke="#FFFFFF" stroke-width="2"/>
          <circle cx="12" cy="12" r="2" fill="#FFFFFF"/>
        </svg>
      `;

      return new IconLayer({
        id: "inquiry-origin-points-layer",
        data: inquiries,
        getPosition: (d: any) => [d.searchLongitude, d.searchLatitude],
        getIcon: () => ({
          url: `data:image/svg+xml;base64,${btoa(originIconSvg)}`,
          width: 12,
          height: 12,
          anchorY: 6,
          anchorX: 6,
        }),
        getSize: (d: any) =>
          Math.max(16, Math.min(32, 12 + d.totalFacilities * 0.5)),
        pickable: true,
        sizeUnits: "pixels",
      });
    },
    []
  );
  /**
   * 統計ラベルレイヤー
   */
  const createStatsLabelLayer = useCallback(
    (
      data: FacilityAnalytics[],
      mode: VisualizationMode,
      visible: boolean = true
    ): Layer | null => {
      if (!data.length || !visible) return null;

      // 上位パフォーマーのみラベル表示
      const topFacilities = data
        .filter((d) => d.analytics.totalInquiries >= 3)
        .sort((a, b) => b.analytics.replyRate - a.analytics.replyRate)
        .slice(0, 5);

      return new TextLayer({
        id: "stats-label-layer",
        data: topFacilities,
        getPosition: (d: FacilityAnalytics) => [d.facility.lon, d.facility.lat],
        getText: (d: FacilityAnalytics) => {
          switch (mode) {
            case "replyRate":
              return `${d.analytics.replyRate}%`;
            case "inquiryCount":
              return `${d.analytics.totalInquiries}件`;
            case "replyTime":
              return d.analytics.averageReplyTimeHours
                ? `${d.analytics.averageReplyTimeHours.toFixed(1)}h`
                : "未返信";
            case "distance":
              return `${(d.analytics.averageDistance / 1000).toFixed(1)}km`;
            default:
              return "";
          }
        },
        getColor: [255, 255, 255, 255],
        getSize: 12,
        getAngle: 0,
        getTextAnchor: "middle",
        getAlignmentBaseline: "center",
        pickable: false,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontWeight: "bold",
        outlineColor: [0, 0, 0, 128],
        outlineWidth: 2,
        updateTriggers: {
          getText: [mode],
        },
      });
    },
    []
  );

  /**
   * 行政区域レイヤー（問い合わせ密度対応）
   */
  const createInquiryMunicipalitiesLayer = useCallback(
    (
      municipalitiesData: any,
      inquiryData: FacilityAnalytics[],
      visible: boolean = true
    ): Layer | null => {
      if (!municipalitiesData || !visible) return null;

      // 市区町村ごとの問い合わせ統計を計算
      const cityStats = new Map();
      inquiryData.forEach((facility) => {
        const city = facility.facility.city;
        if (!cityStats.has(city)) {
          cityStats.set(city, {
            totalInquiries: 0,
            totalReplies: 0,
            facilityCount: 0,
          });
        }
        const stats = cityStats.get(city);
        stats.totalInquiries += facility.analytics.totalInquiries;
        stats.totalReplies += facility.analytics.repliedCount;
        stats.facilityCount++;
      });

      return new GeoJsonLayer({
        id: "inquiry-municipalities-layer",
        data: municipalitiesData,
        filled: true,
        stroked: true,
        getFillColor: (feature: any) => {
          const cityName =
            feature.properties?.ward_ja || feature.properties?.city_ja;
          const stats = cityStats.get(cityName);

          if (!stats || stats.totalInquiries === 0) {
            return [240, 240, 240, 50]; // 薄いグレー
          }

          const replyRate = (stats.totalReplies / stats.totalInquiries) * 100;
          const color = getReplyRateColor(replyRate);
          return [color[0], color[1], color[2], 30]; // 半透明
        },
        getLineColor: [100, 100, 100, 200],
        getLineWidth: 1,
        pickable: true,
        updateTriggers: {
          getFillColor: [inquiryData],
        },
      });
    },
    [getReplyRateColor]
  );

  return {
    createInquiryHeatmapLayer,
    createInquiryIconLayer,
    createInquiryOriginMeshLayer,
    createInquiryOriginPointsLayer,
    createStatsLabelLayer,
    createInquiryMunicipalitiesLayer,
    createInquiryOriginKDELayer,
    createOriginPeakMarkersLayer,

    // カラー計算ユーティリティ
    getReplyRateColor,
    getInquiryCountColor,
    getReplyTimeColor,
    getOriginDensityColor,
    getKDEHeatmapColor,
  };
}
