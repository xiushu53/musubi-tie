// src/_hooks/useInquiryOriginData.ts
import { useEffect, useState } from "react";

interface MeshTile {
  id: string;
  lat: number;
  lon: number;
  inquiryCount: number;
  uniqueUsers: number;
  totalFacilities: number;
  averageRadius: number;
  recentInquiries: string[];
  bbox: [number, number, number, number];
  // KDE拡張
  interpolatedDensity: number;
  isOriginalData: boolean;
}

interface InquiryOriginData {
  facilityType: string;
  timeRange: number;
  meshSize: number;
  useKDE: boolean;
  period: {
    start: string;
    end: string;
  };
  meshTiles: MeshTile[];
  geoJson: any;
  summary: {
    totalMeshTiles: number;
    originalDataMeshes: number;
    interpolatedMeshes: number;
    totalInquiries: number;
    totalUniqueUsers: number;
    maxInquiriesPerMesh: number;
    maxInterpolatedDensity: number;
    averageInquiriesPerMesh: number;
    hotspots: MeshTile[];
    kde?: {
      bandwidth: number;
      influenceRadius: number;
      minThreshold: number;
      densityRange: {
        min: number;
        max: number;
      };
    };
  };
}

export function useInquiryOriginData(
  facilityType: string,
  timeRange: number,
  meshSize: number = 500,
  useKDE: boolean = true // デフォルトでKDE有効
) {
  const [data, setData] = useState<InquiryOriginData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(
          `📄 問い合わせ発信地点データ取得: ${facilityType}, ${timeRange}日間, ${meshSize}mメッシュ${useKDE ? " (KDE有効)" : ""}`
        );

        const response = await fetch(
          `/api/analytics/inquiry-origins?facilityType=${facilityType}&timeRange=${timeRange}&meshSize=${meshSize}&kde=${useKDE}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);

        console.log(`✅ 発信地点データ取得完了:`, {
          totalMeshTiles: result.summary?.totalMeshTiles || 0,
          originalData: result.summary?.originalDataMeshes || 0,
          interpolated: result.summary?.interpolatedMeshes || 0,
          maxDensity: result.summary?.maxInterpolatedDensity?.toFixed(2) || 0,
          totalInquiries: result.summary?.totalInquiries || 0,
          kdeEnabled: result.useKDE,
        });
      } catch (err) {
        console.error("⚠️ 発信地点データ取得エラー:", err);
        setError(
          err instanceof Error ? err.message : "データ取得に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [facilityType, timeRange, meshSize, useKDE]);

  return {
    data,
    loading,
    error,
  };
}

export type { MeshTile, InquiryOriginData };
