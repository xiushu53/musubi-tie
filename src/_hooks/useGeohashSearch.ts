// src/hooks/useGeohashSearch.ts
// 静的Geohashデータを使用する高速検索Hook

import { useCallback, useMemo } from "react";
import { calculateDistance } from "@/_utils/calculateDistance";
import { encode, getNeighbors, getPrecisionInfo } from "@/_utils/geohash";
import type { Facility } from "@/types";
import { useStaticGeohashData } from "./useStaticGeohashData";

export interface FacilityWithDistance extends Facility {
  distance: number;
}

export interface SearchMethod {
  name: string;
  description: string;
  search: (
    userLat: number,
    userLon: number,
    radiusMeters: number
  ) => FacilityWithDistance[];
}

interface FacilityWithGeohash extends Facility {
  geohash: string;
  neighbors: string[];
  precision: number;
}

/**
 * 静的Geohashデータを使用する高速検索Hook
 */
export function useGeohashSearch(facilityType: string) {
  // 静的事前計算データを読み込み
  const { facilities, facilityHashMap, gridMap, stats, loading, error } =
    useStaticGeohashData(facilityType);

  // 検索手法の定義（静的データ版）
  const searchMethods = useMemo((): SearchMethod[] => {
    const methods: SearchMethod[] = [
      {
        name: "direct",
        description: "直接検索（全件スキャン）",
        search: (userLat, userLon, radiusMeters) => {
          console.log("🎯 直接検索開始（フォールバック）");
          const startTime = performance.now();

          const results: FacilityWithDistance[] = [];
          for (const facility of facilities) {
            const distance = calculateDistance(
              userLat,
              userLon,
              facility.lat,
              facility.lon
            );
            if (distance <= radiusMeters) {
              results.push({ ...facility, distance });
            }
          }

          const time = performance.now() - startTime;
          console.log(
            `✅ 直接検索完了: ${time.toFixed(2)}ms, ${results.length}件`
          );

          return results.sort((a, b) => a.distance - b.distance);
        },
      },
    ];

    // 静的データが利用可能な場合のみGeohash検索を追加
    if (facilityHashMap.size > 0) {
      methods.push(
        {
          name: "static_basic",
          description: "静的基本検索（近隣セル）",
          search: (userLat, userLon, radiusMeters) =>
            findNearbyStaticBasic(
              userLat,
              userLon,
              radiusMeters,
              facilityHashMap
            ),
        },
        {
          name: "static_precise",
          description: "静的高精度検索（円内セル）",
          search: (userLat, userLon, radiusMeters) =>
            findNearbyStaticPrecise(
              userLat,
              userLon,
              radiusMeters,
              facilityHashMap
            ),
        },
        {
          name: "static_grid",
          description: "静的グリッド検索（最高速）",
          search: (userLat, userLon, radiusMeters) =>
            findNearbyStaticGrid(userLat, userLon, radiusMeters, gridMap),
        }
      );
    }

    return methods;
  }, [facilities, facilityHashMap, gridMap]);

  // 推奨検索手法を自動選択（静的データ優先）
  const getRecommendedMethod = useCallback(
    (radiusMeters: number): SearchMethod => {
      // 静的データが利用可能な場合
      if (facilityHashMap.size > 0) {
        if (radiusMeters <= 1000) {
          return searchMethods.find((m) => m.name === "static_grid")!; // 1km以下: グリッド検索
        } else if (radiusMeters <= 2000) {
          return searchMethods.find((m) => m.name === "static_basic")!; // 2km以下: 基本検索
        } else {
          return searchMethods.find((m) => m.name === "static_precise")!; // 2km超: 高精度検索
        }
      }

      // フォールバック
      return searchMethods.find((m) => m.name === "direct")!;
    },
    [searchMethods, facilityHashMap]
  );

  // 全手法でのパフォーマンス比較
  const compareAllMethods = useCallback(
    (userLat: number, userLon: number, radiusMeters: number) => {
      console.log(`\n🏁 静的データ版パフォーマンス比較`);
      console.log(
        `条件: ${facilityType}, 施設${facilities.length}件, 半径${radiusMeters}m`
      );

      const comparisons: { method: string; time: number; results: number }[] =
        [];

      searchMethods.forEach((method) => {
        try {
          const startTime = performance.now();
          const results = method.search(userLat, userLon, radiusMeters);
          const time = performance.now() - startTime;

          comparisons.push({
            method: method.description,
            time,
            results: results.length,
          });

          console.log(
            `${method.description}: ${time.toFixed(3)}ms, ${results.length}件`
          );
        } catch (error) {
          console.error(`${method.description}: エラー`, error);
        }
      });

      // 最速手法を特定
      if (comparisons.length > 0) {
        const fastest = comparisons.reduce((prev, curr) =>
          curr.time < prev.time ? curr : prev
        );

        console.log(
          `\n🏆 最速: ${fastest.method} (${fastest.time.toFixed(3)}ms)`
        );

        // 速度向上を表示
        const directMethod = comparisons.find((c) => c.method.includes("直接"));
        if (directMethod && fastest.method !== directMethod.method) {
          const speedup = (directMethod.time / fastest.time).toFixed(1);
          console.log(`⚡ 速度向上: ${speedup}倍高速化`);
        }
      }

      return comparisons;
    },
    [searchMethods, facilities, facilityType]
  );

  // インデックス詳細情報
  const getIndexInfo = useCallback(() => {
    if (!stats) return null;

    return {
      totalCells: stats.hashCells,
      avgFacilitiesPerCell: stats.avgHashFacilitiesPerCell,
      buildTime: stats.buildTime,
      memoryEstimate: stats.memoryEstimate.hash,
      efficiency: `${(((facilities.length - stats.avgHashFacilitiesPerCell) / facilities.length) * 100).toFixed(1)}% 削減期待値`,
      gridCells: stats.gridCells,
      dataSource: "静的事前計算",
      precision: stats.precision,
    };
  }, [stats, facilities.length]);

  return {
    searchMethods,
    getRecommendedMethod,
    compareAllMethods,
    getIndexInfo,
    isReady: !loading && !error && facilityHashMap.size > 0,
    loading,
    error,
  };
}

/**
 * 静的基本検索（近隣セル方式）
 */
function findNearbyStaticBasic(
  userLat: number,
  userLon: number,
  radiusMeters: number,
  facilityHashMap: Map<string, FacilityWithGeohash[]>
): FacilityWithDistance[] {
  console.log(`⚡ 静的基本検索: 半径${radiusMeters}m`);
  const startTime = performance.now();

  // ユーザーGeohash + 近隣セル
  const userHash = encode(userLat, userLon, 6);
  const searchHashes = new Set<string>([userHash]);
  const neighbors = getNeighbors(userHash);
  neighbors.forEach((hash) => searchHashes.add(hash));

  // 事前計算済みインデックスから即座に取得
  const candidates: FacilityWithGeohash[] = [];
  let checkedCells = 0;

  searchHashes.forEach((hash) => {
    const facilities = facilityHashMap.get(hash);
    if (facilities) {
      checkedCells++;
      candidates.push(...facilities);
    }
  });

  // 距離計算・フィルタリング
  const results: FacilityWithDistance[] = [];
  for (const facility of candidates) {
    const distance = calculateDistance(
      userLat,
      userLon,
      facility.lat,
      facility.lon
    );

    if (distance <= radiusMeters) {
      results.push({
        id: facility.id,
        name: facility.name,
        lat: facility.lat,
        lon: facility.lon,
        address: facility.address,
        distance,
      });
    }
  }

  const time = performance.now() - startTime;
  console.log(`✅ 静的基本検索完了: ${time.toFixed(3)}ms`, {
    searchCells: checkedCells,
    candidates: candidates.length,
    results: results.length,
  });

  return results.sort((a, b) => a.distance - b.distance);
}

/**
 * 静的高精度検索（円内セル方式）
 */
function findNearbyStaticPrecise(
  userLat: number,
  userLon: number,
  radiusMeters: number,
  facilityHashMap: Map<string, FacilityWithGeohash[]>
): FacilityWithDistance[] {
  console.log(`⚡ 静的高精度検索: 半径${radiusMeters}m`);
  const startTime = performance.now();

  // より広い範囲のGeohashセルを収集
  const radiusKm = radiusMeters / 1000;
  const precision = 6;
  const precisionInfo = getPrecisionInfo(precision);

  // セル単位で範囲を拡張
  const cellSteps = Math.ceil(
    radiusKm /
      Math.min(precisionInfo.cellSizeKm.lat, precisionInfo.cellSizeKm.lon)
  );

  const searchHashes = new Set<string>();

  // 中心から放射状にセルを追加
  for (let i = -cellSteps; i <= cellSteps; i++) {
    for (let j = -cellSteps; j <= cellSteps; j++) {
      const latOffset = (i * precisionInfo.cellSizeKm.lat) / 111;
      const lonOffset =
        (j * precisionInfo.cellSizeKm.lon) /
        (111 * Math.cos((userLat * Math.PI) / 180));

      const sampleLat = userLat + latOffset;
      const sampleLon = userLon + lonOffset;

      // 大まかな円内判定
      const roughDistance = Math.sqrt(
        (latOffset * 111) ** 2 +
          (lonOffset * 111 * Math.cos((userLat * Math.PI) / 180)) ** 2
      );

      if (roughDistance <= radiusKm * 1.2) {
        // 少し余裕を持たせる
        searchHashes.add(encode(sampleLat, sampleLon, precision));
      }
    }
  }

  // 候補収集
  const candidates: FacilityWithGeohash[] = [];
  let checkedCells = 0;

  searchHashes.forEach((hash) => {
    const facilities = facilityHashMap.get(hash);
    if (facilities) {
      checkedCells++;
      candidates.push(...facilities);
    }
  });

  // 正確な距離計算
  const results: FacilityWithDistance[] = [];
  for (const facility of candidates) {
    const distance = calculateDistance(
      userLat,
      userLon,
      facility.lat,
      facility.lon
    );

    if (distance <= radiusMeters) {
      results.push({
        id: facility.id,
        name: facility.name,
        lat: facility.lat,
        lon: facility.lon,
        address: facility.address,
        distance,
      });
    }
  }

  const time = performance.now() - startTime;
  console.log(`✅ 静的高精度検索完了: ${time.toFixed(3)}ms`, {
    searchCells: checkedCells,
    candidates: candidates.length,
    results: results.length,
  });

  return results.sort((a, b) => a.distance - b.distance);
}

/**
 * 静的グリッド検索（最高速版）
 */
function findNearbyStaticGrid(
  userLat: number,
  userLon: number,
  radiusMeters: number,
  gridMap: Map<string, FacilityWithGeohash[]>
): FacilityWithDistance[] {
  console.log(`⚡ 静的グリッド検索: 半径${radiusMeters}m`);
  const startTime = performance.now();

  const GRID_SIZE = 0.01; // 約1km
  const radiusGrids = Math.ceil(radiusMeters / 1000 / (GRID_SIZE * 111));

  // ユーザー位置のグリッド座標
  const userGridLat = Math.floor(userLat / GRID_SIZE);
  const userGridLon = Math.floor(userLon / GRID_SIZE);

  const candidates: FacilityWithGeohash[] = [];
  let checkedGrids = 0;

  // 周辺グリッドを検索
  for (let i = -radiusGrids; i <= radiusGrids; i++) {
    for (let j = -radiusGrids; j <= radiusGrids; j++) {
      const gridLat = userGridLat + i;
      const gridLon = userGridLon + j;
      const gridKey = `${gridLat},${gridLon}`;

      const facilities = gridMap.get(gridKey);
      if (facilities) {
        checkedGrids++;
        candidates.push(...facilities);
      }
    }
  }

  // 距離計算・フィルタリング
  const results: FacilityWithDistance[] = [];
  for (const facility of candidates) {
    const distance = calculateDistance(
      userLat,
      userLon,
      facility.lat,
      facility.lon
    );

    if (distance <= radiusMeters) {
      results.push({
        id: facility.id,
        name: facility.name,
        lat: facility.lat,
        lon: facility.lon,
        address: facility.address,
        distance,
      });
    }
  }

  const time = performance.now() - startTime;
  console.log(`✅ 静的グリッド検索完了: ${time.toFixed(3)}ms`, {
    searchGrids: checkedGrids,
    candidates: candidates.length,
    results: results.length,
  });

  return results.sort((a, b) => a.distance - b.distance);
}

/**
 * デバッグ用：検索結果の検証
 */
export function validateSearchResults(
  baseResults: FacilityWithDistance[],
  testResults: FacilityWithDistance[],
  methodName: string
): void {
  const baseIds = new Set(baseResults.map((f) => f.id));
  const testIds = new Set(testResults.map((f) => f.id));

  const missing = baseResults.filter((f) => !testIds.has(f.id));
  const extra = testResults.filter((f) => !baseIds.has(f.id));

  console.log(`\n🔍 ${methodName} 検証結果:`);
  console.log(`基準: ${baseResults.length}件, 検証: ${testResults.length}件`);

  if (missing.length > 0) {
    console.log(
      `❌ 漏れ: ${missing.length}件`,
      missing.map((f) => `${f.name}(${f.distance.toFixed(0)}m)`)
    );
  }

  if (extra.length > 0) {
    console.log(
      `⚠️ 余分: ${extra.length}件`,
      extra.map((f) => `${f.name}(${f.distance.toFixed(0)}m)`)
    );
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log(`✅ 完全一致！`);
  }
}
