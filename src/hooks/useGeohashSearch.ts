// src/hooks/useGeohashSearch.ts
// Geohash検索のReact Hook

import { useCallback, useMemo } from "react";
import type { Facility } from "@/types";
import { calculateDistance } from "@/utils/calculateDistance";
import {
  decode,
  encode,
  getNeighbors,
  getPrecisionInfo,
} from "@/utils/geohash";
import {
  FacilityGeohashIndex,
  type FacilityWithDistance,
} from "@/utils/geohashFacilitySearch";

export interface SearchMethod {
  name: string;
  description: string;
  search: (
    userLat: number,
    userLon: number,
    radiusMeters: number
  ) => FacilityWithDistance[];
}

/**
 * 複数の検索手法を提供するHook
 */
export function useGeohashSearch(facilities: Facility[]) {
  // Geohashインデックスを構築（施設データ変更時のみ）
  const geohashIndex = useMemo(() => {
    if (facilities.length === 0) return null;

    console.log(`🔧 施設数: ${facilities.length} → Geohashインデックス構築`);
    return new FacilityGeohashIndex(facilities, 6); // 精度6（約1km）
  }, [facilities]);

  // 検索手法の定義
  const searchMethods = useMemo((): SearchMethod[] => {
    const methods: SearchMethod[] = [
      {
        name: "direct",
        description: "直接検索（全件）",
        search: (userLat, userLon, radiusMeters) => {
          console.log("🎯 直接検索開始");
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

    // Geohashインデックスが利用可能な場合のみ追加
    if (geohashIndex) {
      methods.push(
        {
          name: "geohash_basic",
          description: "Geohash基本検索（近隣セル）",
          search: (userLat, userLon, radiusMeters) =>
            geohashIndex.findNearbyBasic(userLat, userLon, radiusMeters),
        },
        {
          name: "geohash_precise",
          description: "Geohash高精度検索（円内セル）",
          search: (userLat, userLon, radiusMeters) =>
            geohashIndex.findNearbyPrecise(userLat, userLon, radiusMeters),
        }
        // 適応検索を削除（取りこぼしが多いため）
      );
    }

    return methods;
  }, [facilities, geohashIndex]);

  // 推奨検索手法を自動選択（信頼性重視版）
  const getRecommendedMethod = useCallback(
    (radiusMeters: number): SearchMethod => {
      if (!geohashIndex || facilities.length < 500) {
        return searchMethods.find((m) => m.name === "direct")!;
      }

      // シンプルな選択ロジック（取りこぼしを避ける）
      if (radiusMeters <= 1500) {
        return searchMethods.find((m) => m.name === "geohash_basic")!; // 1.5km以下: 基本検索
      } else {
        return searchMethods.find((m) => m.name === "geohash_precise")!; // 1.5km超: 高精度検索
      }
    },
    [searchMethods, facilities.length, geohashIndex]
  );

  // 全手法でのパフォーマンス比較
  const compareAllMethods = useCallback(
    (
      userLat: number,
      userLon: number,
      radiusMeters: number
    ): { method: string; time: number; results: number }[] => {
      console.log(`\n🏁 全検索手法パフォーマンス比較`);
      console.log(`条件: 施設${facilities.length}件, 半径${radiusMeters}m`);

      const comparisons: { method: string; time: number; results: number }[] =
        [];

      searchMethods.forEach((method) => {
        const startTime = performance.now();
        const results = method.search(userLat, userLon, radiusMeters);
        const time = performance.now() - startTime;

        comparisons.push({
          method: method.description,
          time,
          results: results.length,
        });

        console.log(
          `${method.description}: ${time.toFixed(2)}ms, ${results.length}件`
        );
      });

      // 最速手法を特定
      const fastest = comparisons.reduce((prev, curr) =>
        curr.time < prev.time ? curr : prev
      );

      console.log(
        `\n🏆 最速: ${fastest.method} (${fastest.time.toFixed(2)}ms)`
      );

      return comparisons;
    },
    [searchMethods, facilities]
  );

  // Geohashインデックスの詳細情報
  const getIndexInfo = useCallback(() => {
    if (!geohashIndex) return null;

    const stats = geohashIndex.getStats();
    return {
      ...stats,
      memoryEstimate: `${((stats.totalCells * 32) / 1024).toFixed(1)}KB`, // 概算
      efficiency: `${(((814 - stats.avgFacilitiesPerCell) / 814) * 100).toFixed(1)}% 削減期待値`,
    };
  }, [geohashIndex]);

  return {
    searchMethods,
    getRecommendedMethod,
    compareAllMethods,
    getIndexInfo,
    isReady: !!geohashIndex,
  };
}

// デバッグ用：Geohash可視化
export function visualizeGeohash(lat: number, lon: number): void {
  console.log(`\n🗺️ Geohash可視化: (${lat}, ${lon})`);

  for (let precision = 1; precision <= 8; precision++) {
    const hash = encode(lat, lon, precision);
    const decoded = decode(hash);
    const info = getPrecisionInfo(precision);

    console.log(
      `精度${precision}: "${hash}" | エリア: ${info.cellSizeKm.lat.toFixed(1)}×${info.cellSizeKm.lon.toFixed(1)}km | ${info.description}`
    );
  }

  // 近隣セルの表示
  const hash6 = encode(lat, lon, 6);
  const neighbors = getNeighbors(hash6);

  console.log(`\n🧭 近隣セル (精度6):`);
  console.log(`中心: ${hash6}`);
  console.log(`近隣: ${neighbors.join(", ")}`);
}
