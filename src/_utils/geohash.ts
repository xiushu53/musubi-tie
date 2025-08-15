// src/utils/geohash.ts
// Geohash エンコード・デコード機能

export const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export interface GeohashBounds {
  latitude: { min: number; max: number };
  longitude: { min: number; max: number };
}

export interface GeohashDecoded {
  latitude: number;
  longitude: number;
  error: { lat: number; lon: number };
  bounds: GeohashBounds;
}

/**
 * 緯度経度をGeohashに変換
 */
export function encode(
  latitude: number,
  longitude: number,
  precision: number = 7
): string {
  let geohash = "";
  let even = true; // true: longitude, false: latitude

  let latMin = -90.0,
    latMax = 90.0;
  let lonMin = -180.0,
    lonMax = 180.0;

  let bit = 0;
  let bitCount = 0;

  while (geohash.length < precision) {
    if (even) {
      // 経度を処理
      const mid = (lonMin + lonMax) / 2;
      if (longitude >= mid) {
        bit = (bit << 1) | 1;
        lonMin = mid;
      } else {
        bit = bit << 1;
        lonMax = mid;
      }
    } else {
      // 緯度を処理
      const mid = (latMin + latMax) / 2;
      if (latitude >= mid) {
        bit = (bit << 1) | 1;
        latMin = mid;
      } else {
        bit = bit << 1;
        latMax = mid;
      }
    }

    even = !even;
    bitCount++;

    // 5ビット貯まったらBase32文字に変換
    if (bitCount === 5) {
      geohash += BASE32[bit];
      bit = 0;
      bitCount = 0;
    }
  }

  return geohash;
}

/**
 * Geohashを緯度経度に変換
 */
export function decode(geohash: string): GeohashDecoded {
  let even = true;
  let latMin = -90.0,
    latMax = 90.0;
  let lonMin = -180.0,
    lonMax = 180.0;

  for (const char of geohash) {
    const idx = BASE32.indexOf(char);
    if (idx === -1) throw new Error(`Invalid geohash character: ${char}`);

    // 5ビットを順次処理
    for (let i = 4; i >= 0; i--) {
      const bit = (idx >> i) & 1;

      if (even) {
        // 経度
        const mid = (lonMin + lonMax) / 2;
        if (bit === 1) {
          lonMin = mid;
        } else {
          lonMax = mid;
        }
      } else {
        // 緯度
        const mid = (latMin + latMax) / 2;
        if (bit === 1) {
          latMin = mid;
        } else {
          latMax = mid;
        }
      }
      even = !even;
    }
  }

  const latitude = (latMin + latMax) / 2;
  const longitude = (lonMin + lonMax) / 2;
  const latError = (latMax - latMin) / 2;
  const lonError = (lonMax - lonMin) / 2;

  return {
    latitude,
    longitude,
    error: { lat: latError, lon: lonError },
    bounds: {
      latitude: { min: latMin, max: latMax },
      longitude: { min: lonMin, max: lonMax },
    },
  };
}

/**
 * Geohash精度情報を取得
 */
export function getPrecisionInfo(precision: number): {
  latError: number;
  lonError: number;
  cellSizeKm: { lat: number; lon: number };
  description: string;
} {
  const totalBits = precision * 5;
  const latBits = Math.floor(totalBits / 2);
  const lonBits = Math.ceil(totalBits / 2);

  const latError = 180.0 / 2 ** latBits;
  const lonError = 360.0 / 2 ** lonBits;

  const cellSizeKm = {
    lat: latError * 111,
    lon: lonError * 111 * Math.cos((35.6762 * Math.PI) / 180), // 東京基準
  };

  const descriptions = {
    1: "国レベル",
    2: "地方レベル",
    3: "県レベル",
    4: "市レベル",
    5: "区レベル",
    6: "街区レベル（施設検索最適）",
    7: "建物群レベル",
    8: "建物レベル",
    9: "フロアレベル",
    10: "部屋レベル",
    11: "机レベル",
    12: "座席レベル",
  };

  return {
    latError,
    lonError,
    cellSizeKm,
    description:
      descriptions[precision as keyof typeof descriptions] ||
      `精度${precision}`,
  };
}

/**
 * Geohashの近隣セルを取得
 */
export function getNeighbors(geohash: string): string[] {
  const neighbors: string[] = [];
  const decoded = decode(geohash);
  const precision = geohash.length;

  // 8方向の近隣セルを生成
  const offsets = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1], // 上下左右
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1], // 斜め4方向
  ];

  const errorLat = decoded.error.lat;
  const errorLon = decoded.error.lon;

  offsets.forEach(([latDir, lonDir]) => {
    const neighborLat = decoded.latitude + latDir * errorLat;
    const neighborLon = decoded.longitude + lonDir * errorLon;

    // 地球の境界をチェック
    if (
      neighborLat >= -90 &&
      neighborLat <= 90 &&
      neighborLon >= -180 &&
      neighborLon <= 180
    ) {
      const neighborHash = encode(neighborLat, neighborLon, precision);
      if (neighborHash !== geohash) {
        neighbors.push(neighborHash);
      }
    }
  });

  return neighbors;
}

/**
 * 指定範囲内のGeohashセルを取得
 */
export function getHashesInRadius(
  centerLat: number,
  centerLon: number,
  radiusKm: number,
  precision: number = 6
): string[] {
  const hashes = new Set<string>();
  const precisionInfo = getPrecisionInfo(precision);

  // セルサイズに基づいてサンプリング間隔を決定
  const stepSize =
    Math.min(precisionInfo.cellSizeKm.lat, precisionInfo.cellSizeKm.lon) / 2;
  const steps = Math.ceil(radiusKm / stepSize);

  for (let i = -steps; i <= steps; i++) {
    for (let j = -steps; j <= steps; j++) {
      const lat = centerLat + (i * stepSize) / 111;
      const lon =
        centerLon +
        (j * stepSize) / (111 * Math.cos((centerLat * Math.PI) / 180));

      // 円内判定
      const distance = Math.sqrt(
        ((lat - centerLat) * 111) ** 2 +
          ((lon - centerLon) * 111 * Math.cos((centerLat * Math.PI) / 180)) ** 2
      );

      if (distance <= radiusKm) {
        hashes.add(encode(lat, lon, precision));
      }
    }
  }

  return Array.from(hashes);
}
