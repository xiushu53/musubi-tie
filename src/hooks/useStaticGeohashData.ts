// src/hooks/useStaticGeohashData.ts
import { useEffect, useMemo, useState } from "react";
import type { Facility } from "@/types";

interface FacilityWithGeohash extends Facility {
  geohash: string;
  neighbors: string[];
  precision: number;
}

interface StaticGeohashData {
  facilityType: string;
  generatedAt: string;
  facilities: FacilityWithGeohash[];
  facilityHashMap: Record<string, FacilityWithGeohash[]>;
  gridMap: Record<string, FacilityWithGeohash[]>;
  stats: {
    totalFacilities: number;
    hashCells: number;
    gridCells: number;
    avgHashFacilitiesPerCell: number;
    avgGridFacilitiesPerCell: number;
    maxHashFacilitiesPerCell: number;
    maxGridFacilitiesPerCell: number;
    buildTime: number;
    precision: number;
    memoryEstimate: {
      hash: string;
      grid: string;
    };
  };
}

export function useStaticGeohashData(facilityType: string) {
  const [data, setData] = useState<StaticGeohashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        console.log(`📂 静的Geohashデータ読み込み開始: ${facilityType}`);
        const startTime = performance.now();

        const response = await fetch(
          `/data/${facilityType}/facilitiesWithGeohash.json`
        );

        if (!response.ok) {
          throw new Error(`データファイルが見つかりません: ${facilityType}`);
        }

        const jsonData = await response.json();
        const loadTime = performance.now() - startTime;

        if (!isCancelled) {
          console.log(`✅ 静的データ読み込み完了: ${loadTime.toFixed(2)}ms`);
          console.log(
            `📊 ${facilityType}: ${jsonData.stats.totalFacilities}施設, Hash${jsonData.stats.hashCells}セル, Grid${jsonData.stats.gridCells}セル`
          );

          setData(jsonData);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error(`❌ データ読み込みエラー: ${err}`);
          setError(err instanceof Error ? err.message : "データ読み込みエラー");
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [facilityType]);

  // Map形式に変換（検索効率のため）
  const indexMaps = useMemo(() => {
    if (!data) return { facilityHashMap: new Map(), gridMap: new Map() };

    console.log(`🔄 Map形式変換開始: ${data.facilityType}`);
    const convertStart = performance.now();

    const facilityHashMap = new Map<string, FacilityWithGeohash[]>();
    const gridMap = new Map<string, FacilityWithGeohash[]>();

    // Record → Map 変換
    Object.entries(data.facilityHashMap).forEach(([hash, facilities]) => {
      facilityHashMap.set(hash, facilities);
    });

    Object.entries(data.gridMap).forEach(([gridKey, facilities]) => {
      gridMap.set(gridKey, facilities);
    });

    const convertTime = performance.now() - convertStart;
    console.log(`✅ Map変換完了: ${convertTime.toFixed(2)}ms`);

    return { facilityHashMap, gridMap };
  }, [data]);

  return {
    facilities: data?.facilities || [],
    facilityHashMap: indexMaps.facilityHashMap,
    gridMap: indexMaps.gridMap,
    stats: data?.stats || null,
    loading,
    error,
  };
}
