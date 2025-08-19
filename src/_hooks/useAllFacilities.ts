// src/_hooks/useAllFacilities.ts
import { useEffect, useState } from "react";

interface Facility {
  id: number;
  name: string;
  lat: number;
  lon: number;
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

        const result = await response.json();
        setFacilities(result.facilities || []);

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
