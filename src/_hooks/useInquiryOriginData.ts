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
}

interface InquiryOriginData {
  facilityType: string;
  timeRange: number;
  meshSize: number;
  period: {
    start: string;
    end: string;
  };
  meshTiles: MeshTile[];
  geoJson: any;
  summary: {
    totalMeshTiles: number;
    totalInquiries: number;
    totalUniqueUsers: number;
    maxInquiriesPerMesh: number;
    averageInquiriesPerMesh: number;
    hotspots: MeshTile[];
  };
}

export function useInquiryOriginData(
  facilityType: string,
  timeRange: number,
  meshSize: number = 250
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
          `🔄 問い合わせ発信地点データ取得: ${facilityType}, ${timeRange}日間, ${meshSize}mメッシュ`
        );

        const response = await fetch(
          `/api/analytics/inquiry-origins?facilityType=${facilityType}&timeRange=${timeRange}&meshSize=${meshSize}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);

        console.log(`✅ 発信地点データ取得完了:`, {
          meshTiles: result.meshTiles?.length || 0,
          totalInquiries: result.summary?.totalInquiries || 0,
          hotspots: result.summary?.hotspots?.length || 0,
        });
      } catch (err) {
        console.error("❌ 発信地点データ取得エラー:", err);
        setError(
          err instanceof Error ? err.message : "データ取得に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [facilityType, timeRange, meshSize]);

  return {
    data,
    loading,
    error,
  };
}

export type { MeshTile, InquiryOriginData };
