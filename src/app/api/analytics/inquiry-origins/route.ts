// src/app/api/analytics/inquiry-origins/route.ts
import { type NextRequest, NextResponse } from "next/server";
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
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
}

// 250mメッシュのグリッド計算
function calculateMeshId(
  lat: number,
  lon: number,
  meshSize: number = 250
): string {
  // 250m ≈ 0.00225度 (緯度) / 0.002875度 (経度、東京付近)
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
  meshSize: number = 250
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

  const meshSize = 250;
  const latStep = meshSize / 111000;
  const lonStep = meshSize / (111000 * Math.cos((lat * Math.PI) / 180));

  return [lat + latStep / 2, lon + lonStep / 2];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityType = searchParams.get("facilityType") || "asds";
    const timeRange = searchParams.get("timeRange") || "30";
    const meshSize = parseInt(searchParams.get("meshSize") || "250"); // メッシュサイズ(m)

    // 時間範囲の計算
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    console.log(
      `🗺️ 問い合わせ発信地点メッシュ分析: ${facilityType}, ${timeRange}日間, ${meshSize}mメッシュ`
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

    // メッシュ別にデータを集計
    const meshMap = new Map<
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

      if (!meshMap.has(meshId)) {
        meshMap.set(meshId, {
          inquiryCount: 0,
          uniqueUsers: new Set(),
          totalFacilities: 0,
          totalRadius: 0,
          inquiryIds: [],
          coordinates: [],
        });
      }

      const meshData = meshMap.get(meshId)!;
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

    // メッシュデータを最終形式に変換
    const meshTiles: MeshTile[] = Array.from(meshMap.entries()).map(
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
          recentInquiries: data.inquiryIds.slice(-5), // 最新5件
          bbox,
        };
      }
    );

    // 統計サマリー
    const summary = {
      totalMeshTiles: meshTiles.length,
      totalInquiries: inquiries.length,
      totalUniqueUsers: new Set(inquiries.map((i) => i.userEmail)).size,
      maxInquiriesPerMesh: Math.max(...meshTiles.map((m) => m.inquiryCount), 0),
      averageInquiriesPerMesh:
        meshTiles.length > 0
          ? meshTiles.reduce((sum, m) => sum + m.inquiryCount, 0) /
            meshTiles.length
          : 0,
      hotspots: meshTiles
        .filter((m) => m.inquiryCount >= 3)
        .sort((a, b) => b.inquiryCount - a.inquiryCount)
        .slice(0, 10),
    };

    // GeoJSONフォーマットでも提供
    const geoJsonFeatures = meshTiles.map((tile) => ({
      type: "Feature" as const,
      properties: {
        meshId: tile.id,
        inquiryCount: tile.inquiryCount,
        uniqueUsers: tile.uniqueUsers,
        totalFacilities: tile.totalFacilities,
        averageRadius: Math.round(tile.averageRadius),
        density: tile.inquiryCount / ((meshSize * meshSize) / 1000000), // 件/km²
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
      `📊 メッシュ分析完了: ${meshTiles.length}メッシュ, 最多${summary.maxInquiriesPerMesh}件/メッシュ`
    );

    return NextResponse.json({
      facilityType,
      timeRange: parseInt(timeRange),
      meshSize,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      meshTiles,
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
