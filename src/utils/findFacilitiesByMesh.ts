// メッシュベースの効率的検索（修正版2：Point-in-Polygon + 距離チェック）
import type { Facility, GeoJsonData } from "@/types";
import { calculateDistance } from "./calculateDistance";

export interface FacilityWithDistance extends Facility {
  distance: number;
}

export const findFacilitiesByMesh = (
  userLat: number,
  userLon: number,
  meshData: GeoJsonData | null,
  facilities: Facility[],
  radiusMeters: number
): FacilityWithDistance[] => {
  if (!meshData) {
    console.log("❌ メッシュデータが利用できません");
    return [];
  }

  console.log(`🔍 メッシュベース検索開始:`, {
    userLocation: [userLat, userLon],
    radius: radiusMeters,
    meshFeatures: meshData.features.length,
    facilities: facilities.length,
  });

  // 施設IDの型を確認してMapを作成
  const facilityMap = new Map();
  facilities.forEach((f) => {
    facilityMap.set(String(f.id), f); // IDを文字列として統一
  });

  console.log(
    `📋 施設Map作成完了: ${facilityMap.size}件, サンプルID型: ${typeof facilities[0]?.id}`
  );

  // メッシュデータのサンプルを確認
  if (meshData.features.length > 0) {
    const sampleMesh = meshData.features[0];
    console.log(`📐 メッシュサンプル:`, {
      properties: sampleMesh.properties,
      facilityIdType: typeof sampleMesh.properties?.nearest_facility_id,
      distanceType: typeof sampleMesh.properties?.distance_m,
    });
  }

  const candidateFacilities = new Set<string>();
  let checkedMeshes = 0;
  let validMeshes = 0;

  // シンプルな方法：全メッシュをチェックして、距離条件に合うものを抽出
  for (const feature of meshData.features) {
    checkedMeshes++;

    // メッシュの境界ボックスを計算
    const geometry = feature.geometry;
    if (geometry.type === "Polygon" && geometry.coordinates[0]) {
      const coords = geometry.coordinates[0];

      // 境界ボックス計算
      let minLat = Infinity,
        maxLat = -Infinity;
      let minLon = Infinity,
        maxLon = -Infinity;

      coords.forEach((coord) => {
        const lon = coord[0];
        const lat = coord[1];
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      });

      // メッシュの中心点
      const centerLat = (minLat + maxLat) / 2;
      const centerLon = (minLon + maxLon) / 2;

      // ユーザーからメッシュ中心までの距離
      const distanceToMeshCenter = calculateDistance(
        userLat,
        userLon,
        centerLat,
        centerLon
      );

      // メッシュのサイズ（対角線の半分）を考慮した範囲チェック
      const meshSize = calculateDistance(minLat, minLon, maxLat, maxLon) / 2;
      const effectiveDistance = distanceToMeshCenter - meshSize;

      // メッシュ内の施設までの距離を加算
      const meshInternalDistance = feature.properties?.distance_m || 0;
      const totalEstimatedDistance =
        Math.max(0, effectiveDistance) + meshInternalDistance;

      console.log(
        `メッシュ ${checkedMeshes}: 中心距離=${distanceToMeshCenter.toFixed(0)}m, サイズ=${meshSize.toFixed(0)}m, 内部距離=${meshInternalDistance}m, 総計=${totalEstimatedDistance.toFixed(0)}m`
      );

      if (totalEstimatedDistance <= radiusMeters) {
        validMeshes++;
        const facilityId = feature.properties?.nearest_facility_id;

        if (facilityId) {
          // IDを文字列として統一
          candidateFacilities.add(String(facilityId));
        }
      }
    }
  }

  console.log(`🔍 候補施設数: ${candidateFacilities.size}`);

  // 候補施設の実際の距離を計算
  const nearbyFacilities: FacilityWithDistance[] = [];
  for (const facilityId of candidateFacilities) {
    const facility = facilityMap.get(facilityId); // 文字列IDで検索
    if (facility) {
      const actualDistance = calculateDistance(
        userLat,
        userLon,
        facility.lat,
        facility.lon
      );

      console.log(
        `施設 ${facility.name}: 実際の距離=${actualDistance.toFixed(0)}m`
      );

      if (actualDistance <= radiusMeters) {
        nearbyFacilities.push({ ...facility, distance: actualDistance });
      }
    } else {
      console.warn(`⚠️ 施設ID ${facilityId} が見つかりません`);
    }
  }

  console.log(`✅ メッシュベース検索完了:`, {
    checkedMeshes,
    validMeshes,
    candidateFacilities: candidateFacilities.size,
    foundFacilities: nearbyFacilities.length,
  });

  return nearbyFacilities.sort((a, b) => a.distance - b.distance);
};
