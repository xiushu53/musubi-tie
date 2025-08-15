// src/utils/geohashFacilitySearch.ts
// Geohashを使った施設検索の実装

import type { Facility } from "@/types";
import { calculateDistance } from "./calculateDistance";
import {
  BASE32,
  encode,
  getHashesInRadius,
  getNeighbors,
  getPrecisionInfo,
} from "./geohash";

export interface FacilityWithDistance extends Facility {
  distance: number;
}

/**
 * 施設用Geohash空間インデックス
 */
export class FacilityGeohashIndex {
  private index: Map<string, Facility[]> = new Map();
  private precision: number;
  private stats: {
    totalCells: number;
    totalFacilities: number;
    avgFacilitiesPerCell: number;
    maxFacilitiesPerCell: number;
    buildTime: number;
  };

  constructor(facilities: Facility[], precision: number = 6) {
    this.precision = precision;
    this.stats = this.buildIndex(facilities);
  }

  private buildIndex(facilities: Facility[]) {
    console.log(`🏗️ Geohashインデックス構築開始 (精度: ${this.precision})`);
    const startTime = performance.now();

    // 各施設をGeohashセルに配置
    facilities.forEach((facility) => {
      const hash = encode(facility.lat, facility.lon, this.precision);

      if (!this.index.has(hash)) {
        this.index.set(hash, []);
      }

      this.index.get(hash)!.push(facility);
    });

    // 統計計算
    const buildTime = performance.now() - startTime;
    const totalCells = this.index.size;
    const totalFacilities = facilities.length;
    const cellSizes = Array.from(this.index.values()).map((arr) => arr.length);
    const avgFacilitiesPerCell = totalFacilities / totalCells;
    const maxFacilitiesPerCell = Math.max(...cellSizes);

    const precisionInfo = getPrecisionInfo(this.precision);

    console.log(`✅ Geohashインデックス構築完了: ${buildTime.toFixed(2)}ms`);
    console.log(`📊 統計情報:`);
    console.log(`  - セル数: ${totalCells.toLocaleString()}`);
    console.log(
      `  - セルサイズ: ${precisionInfo.cellSizeKm.lat.toFixed(1)}×${precisionInfo.cellSizeKm.lon.toFixed(1)}km`
    );
    console.log(`  - 平均施設数/セル: ${avgFacilitiesPerCell.toFixed(1)}`);
    console.log(`  - 最大施設数/セル: ${maxFacilitiesPerCell}`);
    console.log(
      `  - データ密度: ${((totalCells / ((180 * 360) / (precisionInfo.cellSizeKm.lat * precisionInfo.cellSizeKm.lon))) * 100).toFixed(3)}%`
    );

    return {
      totalCells,
      totalFacilities,
      avgFacilitiesPerCell,
      maxFacilitiesPerCell,
      buildTime,
    };
  }

  /**
   * 範囲検索：基本版（近隣セル方式）
   */
  findNearbyBasic(
    userLat: number,
    userLon: number,
    radiusMeters: number
  ): FacilityWithDistance[] {
    console.log(`🎯 Geohash基本検索開始: 半径${radiusMeters}m`);
    const startTime = performance.now();

    const userHash = encode(userLat, userLon, this.precision);

    // 1. 検索対象セルを特定
    const searchHashes = new Set<string>([userHash]);
    const neighbors = getNeighbors(userHash);
    neighbors.forEach((hash) => searchHashes.add(hash));

    // 2. 候補施設を収集
    const candidates: Facility[] = [];
    let checkedCells = 0;

    searchHashes.forEach((hash) => {
      const facilities = this.index.get(hash);
      if (facilities) {
        checkedCells++;
        candidates.push(...facilities);
      }
    });

    // 3. 正確な距離計算・フィルタリング
    const results: FacilityWithDistance[] = [];
    for (const facility of candidates) {
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
    const efficiency = (1 - checkedCells / this.stats.totalCells) * 100;

    console.log(`✅ 基本検索完了: ${time.toFixed(2)}ms`, {
      searchCells: checkedCells,
      totalCells: this.stats.totalCells,
      efficiency: `${efficiency.toFixed(1)}% 削減`,
      candidates: candidates.length,
      results: results.length,
    });

    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * 範囲検索：高精度版（円内セル方式）
   */
  findNearbyPrecise(
    userLat: number,
    userLon: number,
    radiusMeters: number
  ): FacilityWithDistance[] {
    console.log(`🎯 Geohash高精度検索開始: 半径${radiusMeters}m`);
    const startTime = performance.now();

    const radiusKm = radiusMeters / 1000;

    // 1. 検索範囲内の全Geohashセルを取得
    const searchHashes = getHashesInRadius(
      userLat,
      userLon,
      radiusKm,
      this.precision
    );

    // 2. 候補施設を収集
    const candidates: Facility[] = [];
    let checkedCells = 0;

    searchHashes.forEach((hash) => {
      const facilities = this.index.get(hash);
      if (facilities) {
        checkedCells++;
        candidates.push(...facilities);
      }
    });

    // 3. 正確な距離計算・フィルタリング
    const results: FacilityWithDistance[] = [];
    for (const facility of candidates) {
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
    const efficiency = (1 - checkedCells / this.stats.totalCells) * 100;

    console.log(`✅ 高精度検索完了: ${time.toFixed(2)}ms`, {
      searchCells: checkedCells,
      totalCells: this.stats.totalCells,
      efficiency: `${efficiency.toFixed(1)}% 削減`,
      candidates: candidates.length,
      results: results.length,
    });

    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * 適応的検索：範囲に応じて最適手法を選択
   */
  findNearbyAdaptive(
    userLat: number,
    userLon: number,
    radiusMeters: number
  ): FacilityWithDistance[] {
    const radiusKm = radiusMeters / 1000;
    const precisionInfo = getPrecisionInfo(this.precision);
    const cellSizeKm = Math.max(
      precisionInfo.cellSizeKm.lat,
      precisionInfo.cellSizeKm.lon
    );

    // 検索範囲がセルサイズの何倍かで手法を選択
    if (radiusKm <= cellSizeKm) {
      console.log("📍 小範囲検索: 基本方式を使用");
      return this.findNearbyBasic(userLat, userLon, radiusMeters);
    } else if (radiusKm <= cellSizeKm * 3) {
      console.log("📍 中範囲検索: 高精度方式を使用");
      return this.findNearbyPrecise(userLat, userLon, radiusMeters);
    } else {
      console.log("📍 大範囲検索: 階層方式を使用");
      return this.findNearbyHierarchical(userLat, userLon, radiusMeters);
    }
  }

  /**
   * 階層検索：大範囲用（低精度→高精度）
   */
  private findNearbyHierarchical(
    userLat: number,
    userLon: number,
    radiusMeters: number
  ): FacilityWithDistance[] {
    console.log(`🌐 Geohash階層検索開始: 半径${radiusMeters}m`);
    const startTime = performance.now();

    // Phase 1: 低精度で粗い範囲を特定
    const lowPrecision = Math.max(1, this.precision - 2);
    const radiusKm = radiusMeters / 1000;
    const coarseHashes = getHashesInRadius(
      userLat,
      userLon,
      radiusKm,
      lowPrecision
    );

    // Phase 2: 高精度セルに展開
    const fineHashes = new Set<string>();
    coarseHashes.forEach((coarseHash) => {
      const expandedHashes = this.expandHash(coarseHash, this.precision);
      expandedHashes.forEach((hash) => fineHashes.add(hash));
    });

    // Phase 3: 候補収集・距離計算
    const candidates: Facility[] = [];
    let checkedCells = 0;

    fineHashes.forEach((hash) => {
      const facilities = this.index.get(hash);
      if (facilities) {
        checkedCells++;
        candidates.push(...facilities);
      }
    });

    const results: FacilityWithDistance[] = [];
    for (const facility of candidates) {
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

    console.log(`✅ 階層検索完了: ${time.toFixed(2)}ms`, {
      coarseHashes: coarseHashes.length,
      fineHashes: fineHashes.size,
      checkedCells,
      candidates: candidates.length,
      results: results.length,
    });

    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Geohashを展開（低精度→高精度）
   */
  private expandHash(shortHash: string, targetPrecision: number): string[] {
    if (shortHash.length >= targetPrecision) {
      return [shortHash.substring(0, targetPrecision)];
    }

    const expanded: string[] = [];

    BASE32.split("").forEach((char) => {
      const newHash = shortHash + char;
      if (newHash.length === targetPrecision) {
        expanded.push(newHash);
      } else if (newHash.length < targetPrecision) {
        expanded.push(...this.expandHash(newHash, targetPrecision));
      }
    });

    return expanded;
  }

  /**
   * インデックス統計情報を取得
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * セル分布の可視化（デバッグ用）
   */
  visualizeCellDistribution(): void {
    const distribution = new Map<number, number>();

    this.index.forEach((facilities) => {
      const count = facilities.length;
      distribution.set(count, (distribution.get(count) || 0) + 1);
    });

    console.log("\n📊 セル内施設数の分布:");
    Array.from(distribution.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([facilityCount, cellCount]) => {
        const bar = "█".repeat(Math.min(50, cellCount));
        console.log(
          `${facilityCount.toString().padStart(2)}施設/セル: ${cellCount.toString().padStart(4)}セル ${bar}`
        );
      });
  }
}
