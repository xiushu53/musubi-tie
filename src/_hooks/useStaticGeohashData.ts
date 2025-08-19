// src/hooks/useStaticGeohashData.ts
// DB版: Prismaから施設データを読み込み、Geohashインデックスを構築

import { useCallback, useEffect, useState } from "react";
import { encode, getNeighbors } from "@/_utils/geohash";
import type { Facility } from "@/types";

interface FacilityWithGeohash extends Facility {
  geohash: string;
  neighbors: string[];
  precision: number;
}

interface GeohashStats {
  hashCells: number;
  avgHashFacilitiesPerCell: number;
  gridCells: number;
  avgGridFacilitiesPerCell: number;
  buildTime: number;
  memoryEstimate: {
    hash: string;
    grid: string;
  };
  precision: number;
}

export function useStaticGeohashData(facilityType: string) {
  const [facilities, setFacilities] = useState<FacilityWithGeohash[]>([]);
  const [facilityHashMap, setFacilityHashMap] = useState<
    Map<string, FacilityWithGeohash[]>
  >(new Map());
  const [gridMap, setGridMap] = useState<Map<string, FacilityWithGeohash[]>>(
    new Map()
  );
  const [stats, setStats] = useState<GeohashStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // DBから施設データを読み込み、Geohashインデックスを構築
  const loadFacilitiesFromDB = useCallback(async (type: string) => {
    console.log(`🔄 DB から ${type} 施設データを読み込み開始...`);
    const startTime = performance.now();
    setLoading(true);
    setError(null);

    try {
      // Prismaで施設データ取得
      const dbFacilities = await fetch(
        `/api/facilities?facilityType=${facilityType}`
      ).then((res) => {
        if (!res.ok) throw new Error(`API エラー: ${res.status}`);
        return res.json();
      });

      // const dbFacilities = response.facilities || [];

      console.log(`📊 DB から ${dbFacilities.length} 件の ${type} 施設を取得`);

      if (dbFacilities.length === 0) {
        setFacilities([]);
        setFacilityHashMap(new Map());
        setGridMap(new Map());
        setStats(null);
        return;
      }

      // GeohashとGrid情報を付与
      const facilitiesWithGeohash: FacilityWithGeohash[] = dbFacilities.map(
        (facility: any) => {
          const precision = 6;
          const geohash = encode(
            facility.latitude,
            facility.longitude,
            precision
          );
          const neighbors = getNeighbors(geohash);

          return {
            id: facility.id,
            name: facility.name,
            address: facility.address,
            lat: facility.latitude,
            lon: facility.longitude,
            geohash,
            neighbors,
            precision,
          };
        }
      );

      // Geohash インデックス構築
      const hashMap = new Map<string, FacilityWithGeohash[]>();
      facilitiesWithGeohash.forEach((facility) => {
        const hash = facility.geohash;
        if (!hashMap.has(hash)) {
          hashMap.set(hash, []);
        }
        hashMap.get(hash)!.push(facility);
      });

      // Grid インデックス構築（1km格子）
      const GRID_SIZE = 0.01; // 約1km
      const gridMapLocal = new Map<string, FacilityWithGeohash[]>();

      facilitiesWithGeohash.forEach((facility) => {
        const gridLat = Math.floor(facility.lat / GRID_SIZE);
        const gridLon = Math.floor(facility.lon / GRID_SIZE);
        const gridKey = `${gridLat},${gridLon}`;

        if (!gridMapLocal.has(gridKey)) {
          gridMapLocal.set(gridKey, []);
        }
        gridMapLocal.get(gridKey)!.push(facility);
      });

      // 統計情報計算
      const buildTime = performance.now() - startTime;
      const hashCells = hashMap.size;
      const gridCells = gridMapLocal.size;
      const avgHashFacilitiesPerCell = facilitiesWithGeohash.length / hashCells;
      const avgGridFacilitiesPerCell = facilitiesWithGeohash.length / gridCells;

      const statsData: GeohashStats = {
        hashCells,
        avgHashFacilitiesPerCell,
        gridCells,
        avgGridFacilitiesPerCell,
        buildTime,
        memoryEstimate: {
          hash: `${Math.round((hashCells * 50) / 1024)}KB`,
          grid: `${Math.round((gridCells * 30) / 1024)}KB`,
        },
        precision: 6,
      };

      // 状態更新
      setFacilities(facilitiesWithGeohash);
      setFacilityHashMap(hashMap);
      setGridMap(gridMapLocal);
      setStats(statsData);

      console.log(
        `✅ DB Geohash インデックス構築完了: ${buildTime.toFixed(2)}ms`
      );
      console.log(`📊 Hash cells: ${hashCells}, Grid cells: ${gridCells}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "DB読み込みエラー";
      console.error("❌ DB 施設データ読み込みエラー:", errorMessage);
      setError(errorMessage);
      setFacilities([]);
      setFacilityHashMap(new Map());
      setGridMap(new Map());
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 施設タイプ変更時にデータ再読み込み
  useEffect(() => {
    if (facilityType) {
      loadFacilitiesFromDB(facilityType);
    }
  }, [facilityType, loadFacilitiesFromDB]);

  return {
    facilities,
    facilityHashMap,
    gridMap,
    stats,
    loading,
    error,
  };
}
