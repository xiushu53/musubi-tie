// scripts/generateGeohashData.mjs
// ES modulesを使った設定ファイル参照版

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modulesでのディレクトリパス取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 設定ファイルから施設タイプを取得
async function getFacilityTypes() {
  try {
    // 動的importで設定ファイルを読み込み
    const settingsModule = await import('../src/_settings/visualize-map/index.ts');
    const facilityTypes = settingsModule.FACILITY_TYPES.map(type => type.value);
    
    console.log(`📋 設定ファイルから施設タイプを読み込み: ${facilityTypes.join(', ')}`);
    return facilityTypes;
    
  } catch (error) {
    console.warn(`⚠️ 設定ファイル読み込みエラー: ${error.message}`);
    console.log(`📋 フォールバック: 正規表現パース試行`);
    
    try {
      // フォールバック: ファイル内容を正規表現で解析
      const settingsPath = path.join(process.cwd(), 'src', '_settings', 'visualize-map', 'index.ts');
      const settingsContent = await fs.readFile(settingsPath, 'utf8');
      
      const facilityTypesMatch = settingsContent.match(
        /export const FACILITY_TYPES = \[([\s\S]*?)\];/
      );
      
      if (!facilityTypesMatch) {
        throw new Error('FACILITY_TYPESが見つかりません');
      }
      
      const valueMatches = facilityTypesMatch[1].matchAll(/value: ["']([^"']+)["']/g);
      const facilityTypes = Array.from(valueMatches, match => match[1]);
      
      console.log(`📋 正規表現で施設タイプを抽出: ${facilityTypes.join(', ')}`);
      return facilityTypes;
      
    } catch (parseError) {
      console.warn(`⚠️ 正規表現パースもエラー: ${parseError.message}`);
      console.log(`📋 最終フォールバック: ハードコード値を使用`);
      
      return ['asds', 'sept-a', 'sept-b', 'spt', 'ccd'];
    }
  }
}

// Geohash関連ユーティリティ（Node.js版）
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

function encode(latitude, longitude, precision = 7) {
  let geohash = "";
  let even = true;

  let latMin = -90.0, latMax = 90.0;
  let lonMin = -180.0, lonMax = 180.0;

  let bit = 0;
  let bitCount = 0;

  while (geohash.length < precision) {
    if (even) {
      const mid = (lonMin + lonMax) / 2;
      if (longitude >= mid) {
        bit = (bit << 1) | 1;
        lonMin = mid;
      } else {
        bit = bit << 1;
        lonMax = mid;
      }
    } else {
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

    if (bitCount === 5) {
      geohash += BASE32[bit];
      bit = 0;
      bitCount = 0;
    }
  }

  return geohash;
}

function decode(geohash) {
  let even = true;
  let latMin = -90.0, latMax = 90.0;
  let lonMin = -180.0, lonMax = 180.0;

  for (const char of geohash) {
    const idx = BASE32.indexOf(char);
    if (idx === -1) throw new Error(`Invalid geohash character: ${char}`);

    for (let i = 4; i >= 0; i--) {
      const bit = (idx >> i) & 1;

      if (even) {
        const mid = (lonMin + lonMax) / 2;
        if (bit === 1) {
          lonMin = mid;
        } else {
          lonMax = mid;
        }
      } else {
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

function getNeighbors(geohash) {
  const neighbors = [];
  const decoded = decode(geohash);
  const precision = geohash.length;

  const offsets = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [-1, 1], [1, -1], [1, 1],
  ];

  const errorLat = decoded.error.lat;
  const errorLon = decoded.error.lon;

  offsets.forEach(([latDir, lonDir]) => {
    const neighborLat = decoded.latitude + latDir * errorLat;
    const neighborLon = decoded.longitude + lonDir * errorLon;

    if (
      neighborLat >= -90 && neighborLat <= 90 &&
      neighborLon >= -180 && neighborLon <= 180
    ) {
      const neighborHash = encode(neighborLat, neighborLon, precision);
      if (neighborHash !== geohash) {
        neighbors.push(neighborHash);
      }
    }
  });

  return neighbors;
}