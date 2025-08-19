// src/_hooks/useAllFacilities.ts
import { useEffect, useState } from "react";

interface Facility {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export function useAllFacilities(facilityType: string) {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllFacilities = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(`📍 全施設データ取得: ${facilityType}`);

        const response = await fetch(
          `/api/facilities?facilityType=${facilityType}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result_ = await response.json();

        // lat,lon | latituede, longitude混在問題に対する一時的な回避
        const result = result_.map((facility: Facility) => ({
          id: facility.id,
          name: facility.name,
          lat: facility.latitude, // latitude → lat に変換
          lon: facility.longitude, // longitude → lon に変換
          address: facility.address,
        }));
        setFacilities(result || []);

        console.log(
          `✅ 全施設データ取得完了: ${result.facilities?.length || 0}件`
        );
      } catch (err) {
        console.error("❌ 全施設データ取得エラー:", err);
        setError(
          err instanceof Error ? err.message : "データ取得に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAllFacilities();
  }, [facilityType]);

  return {
    facilities,
    loading,
    error,
  };
}
