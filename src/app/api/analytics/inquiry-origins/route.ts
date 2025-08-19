// src/app/api/analytics/inquiry-origins/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { TOKYO_AREA_BOUNDS } from "@/_settings/analytics";
import { prisma } from "@/lib/prisma";

interface MeshTile {
  id: string;
  lat: number;
  lon: number;
  inquiryCount: number;
  uniqueUsers: number;
  totalFacilities: number;
  averageRadius: number;
  recentInquiries: string[];
  bbox: [number, number, number, number];
  // KDE拡張
  interpolatedDensity: number; // KDEによる補間密度
  isOriginalData: boolean; // 実際の発信地点かどうか
}

// 東京エリアの境界（大まかな範囲）
const TOKYO_BOUNDS = {
  minLat: 35.5,
  maxLat: 35.9,
  minLon: 139.2,
  maxLon: 139.9,
};

// KDE設定
const KDE_CONFIG = {
  BANDWIDTH: 800, // ガウシアンカーネルの帯域幅（メートル）
  INFLUENCE_RADIUS: 2000, // 影響半径（メートル）
  MIN_DENSITY_THRESHOLD: 0.1, // 表示する最小密度閾値
};

// 2点間の距離計算（メートル）
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // 地球の半径（メートル）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ガウシアンカーネル密度関数
function gaussianKernel(distance: number, bandwidth: number): number {
  const normalized = distance / bandwidth;
  return Math.exp(-0.5 * normalized * normalized);
}

// 500mメッシュのグリッド計算
function calculateMeshId(
  lat: number,
  lon: number,
  meshSize: number = 500
): string {
  const latStep = meshSize / 111000; // 1度 ≈ 111km
  const lonStep = meshSize / (111000 * Math.cos((lat * Math.PI) / 180));

  const meshLat = Math.floor(lat / latStep) * latStep;
  const meshLon = Math.floor(lon / lonStep) * lonStep;

  return `${meshLat.toFixed(6)}_${meshLon.toFixed(6)}`;
}

// メッシュの境界座標計算
function getMeshBounds(
  lat: number,
  lon: number,
  meshSize: number = 500
): [number, number, number, number] {
  const latStep = meshSize / 111000;
  const lonStep = meshSize / (111000 * Math.cos((lat * Math.PI) / 180));

  const meshLat = Math.floor(lat / latStep) * latStep;
  const meshLon = Math.floor(lon / lonStep) * lonStep;

  return [
    meshLon, // minLon
    meshLat, // minLat
    meshLon + lonStep, // maxLon
    meshLat + latStep, // maxLat
  ];
}

// メッシュの中心座標計算
function getMeshCenter(meshId: string): [number, number] {
  const [latStr, lonStr] = meshId.split("_");
  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  const meshSize = 500;
  const latStep = meshSize / 111000;
  const lonStep = meshSize / (111000 * Math.cos((lat * Math.PI) / 180));

  return [lat + latStep / 2, lon + lonStep / 2];
}

// 東京エリアの全500mメッシュを生成
function generateAllMeshTiles(): Array<{
  id: string;
  lat: number;
  lon: number;
  bbox: [number, number, number, number];
}> {
  const meshSize = 500;
  const meshes: Array<{
    id: string;
    lat: number;
    lon: number;
    bbox: [number, number, number, number];
  }> = [];

  const latStep = meshSize / 111000;
  const lonStep =
    meshSize / (111000 * Math.cos((TOKYO_BOUNDS.minLat * Math.PI) / 180));

  // 緯度方向のループ
  for (
    let lat = TOKYO_AREA_BOUNDS.MIN_LAT;
    lat < TOKYO_AREA_BOUNDS.MAX_LAT;
    lat += latStep
  ) {
    // 経度方向のループ
    for (
      let lon = TOKYO_AREA_BOUNDS.MIN_LON;
      lon < TOKYO_AREA_BOUNDS.MAX_LON;
      lon += lonStep
    ) {
      const meshId = calculateMeshId(lat, lon, meshSize);
      const [centerLat, centerLon] = getMeshCenter(meshId);
      const bbox = getMeshBounds(lat, lon, meshSize);

      meshes.push({
        id: meshId,
        lat: centerLat,
        lon: centerLon,
        bbox,
      });
    }
  }

  console.log(`🗂️ 生成された全メッシュ数: ${meshes.length}`);
  return meshes;
}

// KDE密度計算
function calculateKDEDensity(
  targetLat: number,
  targetLon: number,
  originPoints: Array<{
    lat: number;
    lon: number;
    inquiryCount: number;
  }>
): number {
  let totalDensity = 0;

  for (const origin of originPoints) {
    const distance = calculateDistance(
      targetLat,
      targetLon,
      origin.lat,
      origin.lon
    );

    // 影響半径内の場合のみ計算
    if (distance <= KDE_CONFIG.INFLUENCE_RADIUS) {
      const kernelValue = gaussianKernel(distance, KDE_CONFIG.BANDWIDTH);
      totalDensity += origin.inquiryCount * kernelValue;
    }
  }

  return totalDensity;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityType = searchParams.get("facilityType") || "asds";
    const timeRange = searchParams.get("timeRange") || "30";
    const meshSize = parseInt(searchParams.get("meshSize") || "500"); // 500mに変更
    const useKDE = searchParams.get("kde") === "true"; // KDE有効化フラグ

    // 時間範囲の計算
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    console.log(
      `🗺️ 問い合わせ発信地点メッシュ分析: ${facilityType}, ${timeRange}日間, ${meshSize}mメッシュ${useKDE ? " (KDE有効)" : ""}`
    );

    // 問い合わせデータを取得（発信地点ベース）
    const inquiries = await prisma.inquiry.findMany({
      where: {
        facilityType,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        searchLatitude: true,
        searchLongitude: true,
        searchRadius: true,
        totalFacilities: true,
        userEmail: true,
        createdAt: true,
        inquiryItems: {
          select: {
            id: true,
            status: true,
            firstReplyAt: true,
          },
        },
      },
    });

    console.log(`📍 取得した問い合わせ: ${inquiries.length}件`);

    // 実際の発信地点をメッシュ別に集計
    const originalMeshMap = new Map<
      string,
      {
        inquiryCount: number;
        uniqueUsers: Set<string>;
        totalFacilities: number;
        totalRadius: number;
        inquiryIds: string[];
        coordinates: { lat: number; lon: number }[];
      }
    >();

    for (const inquiry of inquiries) {
      const meshId = calculateMeshId(
        inquiry.searchLatitude,
        inquiry.searchLongitude,
        meshSize
      );

      if (!originalMeshMap.has(meshId)) {
        originalMeshMap.set(meshId, {
          inquiryCount: 0,
          uniqueUsers: new Set(),
          totalFacilities: 0,
          totalRadius: 0,
          inquiryIds: [],
          coordinates: [],
        });
      }

      const meshData = originalMeshMap.get(meshId)!;
      meshData.inquiryCount++;
      meshData.uniqueUsers.add(inquiry.userEmail);
      meshData.totalFacilities += inquiry.totalFacilities;
      meshData.totalRadius += inquiry.searchRadius;
      meshData.inquiryIds.push(inquiry.id);
      meshData.coordinates.push({
        lat: inquiry.searchLatitude,
        lon: inquiry.searchLongitude,
      });
    }

    let finalMeshTiles: MeshTile[];

    if (useKDE && originalMeshMap.size > 0) {
      // === KDE方式: 連続的ヒートマップ ===
      console.log(`🔥 KDE密度計算開始...`);

      // 発信地点データを準備
      const originPoints = Array.from(originalMeshMap.entries()).map(
        ([meshId, data]) => {
          const [centerLat, centerLon] = getMeshCenter(meshId);
          return {
            lat: centerLat,
            lon: centerLon,
            inquiryCount: data.inquiryCount,
          };
        }
      );

      // 東京エリア全体の500mメッシュを生成
      const allMeshes = generateAllMeshTiles();
      console.log(`📊 KDE計算対象メッシュ: ${allMeshes.length}個`);

      // 各メッシュの密度をKDEで計算
      finalMeshTiles = allMeshes
        .map((mesh) => {
          const interpolatedDensity = calculateKDEDensity(
            mesh.lat,
            mesh.lon,
            originPoints
          );

          // 実際の発信地点かどうかをチェック
          const originalData = originalMeshMap.get(mesh.id);
          const isOriginalData = !!originalData;

          return {
            id: mesh.id,
            lat: mesh.lat,
            lon: mesh.lon,
            bbox: mesh.bbox,

            // 実データがある場合はそれを使用、ない場合は0
            inquiryCount: originalData?.inquiryCount || 0,
            uniqueUsers: originalData?.uniqueUsers.size || 0,
            totalFacilities: originalData?.totalFacilities || 0,
            averageRadius: originalData
              ? originalData.totalRadius / originalData.inquiryCount
              : 0,
            recentInquiries: originalData?.inquiryIds.slice(-5) || [],

            // KDE計算結果
            interpolatedDensity,
            isOriginalData,
          };
        })
        // 最小密度閾値以上のメッシュのみ残す
        .filter(
          (mesh) =>
            mesh.interpolatedDensity >= KDE_CONFIG.MIN_DENSITY_THRESHOLD ||
            mesh.isOriginalData // 実データがあるメッシュは必ず含める
        );

      console.log(
        `🎨 KDE計算完了: ${finalMeshTiles.length}メッシュ（実データ${originalMeshMap.size}個 + 補間${finalMeshTiles.length - originalMeshMap.size}個）`
      );
    } else {
      // === 従来方式: 実データのみ ===
      finalMeshTiles = Array.from(originalMeshMap.entries()).map(
        ([meshId, data]) => {
          const [centerLat, centerLon] = getMeshCenter(meshId);
          const bbox = getMeshBounds(centerLat, centerLon, meshSize);

          return {
            id: meshId,
            lat: centerLat,
            lon: centerLon,
            inquiryCount: data.inquiryCount,
            uniqueUsers: data.uniqueUsers.size,
            totalFacilities: data.totalFacilities,
            averageRadius: data.totalRadius / data.inquiryCount,
            recentInquiries: data.inquiryIds.slice(-5),
            bbox,
            interpolatedDensity: data.inquiryCount, // 実データ = そのまま
            isOriginalData: true,
          };
        }
      );
    }

    // 統計サマリー（KDE対応）
    const maxDensity = Math.max(
      ...finalMeshTiles.map((m) => m.interpolatedDensity),
      0
    );
    const maxOriginalCount = Math.max(
      ...finalMeshTiles.map((m) => m.inquiryCount),
      0
    );

    const summary = {
      totalMeshTiles: finalMeshTiles.length,
      originalDataMeshes: finalMeshTiles.filter((m) => m.isOriginalData).length,
      interpolatedMeshes: finalMeshTiles.filter((m) => !m.isOriginalData)
        .length,
      totalInquiries: inquiries.length,
      totalUniqueUsers: new Set(inquiries.map((i) => i.userEmail)).size,
      maxInquiriesPerMesh: maxOriginalCount,
      maxInterpolatedDensity: maxDensity,
      averageInquiriesPerMesh:
        originalMeshMap.size > 0
          ? Array.from(originalMeshMap.values()).reduce(
              (sum, m) => sum + m.inquiryCount,
              0
            ) / originalMeshMap.size
          : 0,
      hotspots: finalMeshTiles
        .filter((m) => m.inquiryCount >= 3)
        .sort((a, b) => b.inquiryCount - a.inquiryCount)
        .slice(0, 10),

      // KDE統計
      kde: useKDE
        ? {
            bandwidth: KDE_CONFIG.BANDWIDTH,
            influenceRadius: KDE_CONFIG.INFLUENCE_RADIUS,
            minThreshold: KDE_CONFIG.MIN_DENSITY_THRESHOLD,
            densityRange: {
              min: Math.min(
                ...finalMeshTiles.map((m) => m.interpolatedDensity)
              ),
              max: maxDensity,
            },
          }
        : null,
    };

    // GeoJSONフォーマット（KDE密度対応）
    const geoJsonFeatures = finalMeshTiles.map((tile) => ({
      type: "Feature" as const,
      properties: {
        meshId: tile.id,
        inquiryCount: tile.inquiryCount,
        uniqueUsers: tile.uniqueUsers,
        totalFacilities: tile.totalFacilities,
        averageRadius: Math.round(tile.averageRadius),
        density: tile.inquiryCount / ((meshSize * meshSize) / 1000000), // 実データ密度 件/km²
        interpolatedDensity: tile.interpolatedDensity, // KDE密度
        isOriginalData: tile.isOriginalData,
        // 正規化された密度（可視化用）
        normalizedDensity:
          maxDensity > 0 ? tile.interpolatedDensity / maxDensity : 0,
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [tile.bbox[0], tile.bbox[1]], // 左下
            [tile.bbox[2], tile.bbox[1]], // 右下
            [tile.bbox[2], tile.bbox[3]], // 右上
            [tile.bbox[0], tile.bbox[3]], // 左上
            [tile.bbox[0], tile.bbox[1]], // 閉じる
          ],
        ],
      },
    }));

    const geoJsonData = {
      type: "FeatureCollection" as const,
      features: geoJsonFeatures,
    };

    console.log(
      `📊 メッシュ分析完了: ${finalMeshTiles.length}メッシュ${useKDE ? ` (最大密度: ${maxDensity.toFixed(2)})` : ""}`
    );

    return NextResponse.json({
      facilityType,
      timeRange: parseInt(timeRange),
      meshSize,
      useKDE,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      meshTiles: finalMeshTiles,
      geoJson: geoJsonData,
      summary,
    });
  } catch (error) {
    console.error("❌ 問い合わせ発信地点分析エラー:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "不明なエラー",
      },
      { status: 500 }
    );
  }
}
