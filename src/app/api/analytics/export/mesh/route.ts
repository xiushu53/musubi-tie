// src/app/api/analytics/export/mesh/route.ts - 内部API修正版対応

import { type NextRequest, NextResponse } from "next/server";
import { KDE_CONFIG } from "@/_settings/analytics";
import { prisma } from "@/lib/prisma";

// ... 既存のinterface定義（MeshGeoJSONFeature, MeshGeoJSON）をそのまま使用 ...
interface MeshGeoJSONFeature {
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: [Array<[number, number]>];
  };
  properties: {
    meshId: string;
    meshSize: number;
    centerLat: number;
    centerLon: number;
    inquiryCount: number;
    uniqueUsers: number;
    totalFacilities: number;
    averageSearchRadius: number;
    periodStart: string;
    periodEnd: string;
    firstInquiryAt: number | null;
    lastInquiryAt: number | null;
    densityPerKm2: number;
    interpolatedDensity: number;
    isOriginalData: boolean;
    confidenceLevel: number;
    prefecture: string;
    city: string | null;
    nearestStation: string | null;
    facilityTypeBreakdown: {
      asds: number;
      "sept-a": number;
      "sept-b": number;
      pco: number;
      ccd: number;
    };
    hourlyDistribution: number[];
    weekdayDistribution: number[];
    averageResponseRate: number;
    averageResponseTimeHours: number;
    successfulContactRate: number;
    exportedAt: string;
    dataVersion: string;
    calculationMethod: "KDE" | "RAW";
  };
}

interface MeshGeoJSON {
  type: "FeatureCollection";
  crs: {
    type: "name";
    properties: {
      name: "EPSG:4326";
    };
  };
  metadata: {
    title: string;
    description: string;
    source: string;
    createdAt: string;
    version: string;
    totalFeatures: number;
    boundingBox: [number, number, number, number];
    analysisParams: {
      meshSizeMeters: number;
      facilityTypes: string[];
      kdeSettings: {
        bandwidth: number;
        influenceRadius: number;
        minThreshold: number;
      };
      timePeriod: {
        start: string;
        end: string;
        days: number;
      };
    };
  };
  features: MeshGeoJSONFeature[];
}

// 内部APIと同じメッシュID計算ロジックを使用
function calculateMeshId(
  lat: number,
  lon: number,
  meshSize: number = KDE_CONFIG.MESH_SIZE
): string {
  const latStep = meshSize / 111000;
  const lonStep = meshSize / (111000 * Math.cos((lat * Math.PI) / 180));
  const meshLat = Math.floor(lat / latStep) * latStep;
  const meshLon = Math.floor(lon / lonStep) * lonStep;
  return `${meshLat.toFixed(6)}_${meshLon.toFixed(6)}`;
}

// 時間帯・曜日分布計算
function calculateTimeDistributions(inquiries: Array<{ createdAt: Date }>) {
  const hourlyDist = new Array(24).fill(0);
  const weekdayDist = new Array(7).fill(0);
  inquiries.forEach((inquiry) => {
    const date = new Date(inquiry.createdAt);
    hourlyDist[date.getHours()]++;
    weekdayDist[date.getDay()]++;
  });
  return { hourlyDist, weekdayDist };
}

// 施設タイプ別分布計算
function calculateFacilityTypeBreakdown(
  inquiries: Array<{ facilityType: string }>
) {
  const breakdown = { asds: 0, "sept-a": 0, "sept-b": 0, pco: 0, ccd: 0 };
  inquiries.forEach((inquiry) => {
    if (Object.hasOwn(breakdown, inquiry.facilityType)) {
      (breakdown as any)[inquiry.facilityType]++;
    }
  });
  return breakdown;
}

// パフォーマンス統計計算
async function calculatePerformanceStats(meshInquiryIds: string[]): Promise<{
  averageResponseRate: number;
  averageResponseTimeHours: number;
  successfulContactRate: number;
}> {
  if (meshInquiryIds.length === 0) {
    return {
      averageResponseRate: 0,
      averageResponseTimeHours: 0,
      successfulContactRate: 0,
    };
  }

  const inquiryItems = await prisma.inquiryItem.findMany({
    where: { inquiryId: { in: meshInquiryIds } },
    select: {
      status: true,
      sentAt: true,
      firstReplyAt: true,
      deliveredAt: true,
    },
  });

  const repliedCount = inquiryItems.filter((item) => item.firstReplyAt).length;
  const deliveredCount = inquiryItems.filter((item) => item.deliveredAt).length;

  const responseRate =
    inquiryItems.length > 0 ? (repliedCount / inquiryItems.length) * 100 : 0;
  const successRate =
    inquiryItems.length > 0 ? (deliveredCount / inquiryItems.length) * 100 : 0;

  const replyTimes = inquiryItems
    .filter((item) => item.sentAt && item.firstReplyAt)
    .map(
      (item) =>
        (item.firstReplyAt!.getTime() - item.sentAt!.getTime()) /
        (1000 * 60 * 60)
    );

  const avgReplyTime =
    replyTimes.length > 0
      ? replyTimes.reduce((sum, time) => sum + time, 0) / replyTimes.length
      : 0;

  return {
    averageResponseRate: Math.round(responseRate * 10) / 10,
    averageResponseTimeHours: Math.round(avgReplyTime * 10) / 10,
    successfulContactRate: Math.round(successRate * 10) / 10,
  };
}

// メッシュ座標計算
function calculateMeshGeometry(
  meshId: string,
  meshSize: number
): [Array<[number, number]>] {
  const [latStr, lonStr] = meshId.split("_");
  const baseLat = parseFloat(latStr);
  const baseLon = parseFloat(lonStr);
  const latStep = meshSize / 111000;
  const lonStep = meshSize / (111000 * Math.cos((baseLat * Math.PI) / 180));
  return [
    [
      [baseLon, baseLat],
      [baseLon + lonStep, baseLat],
      [baseLon + lonStep, baseLat + latStep],
      [baseLon, baseLat + latStep],
      [baseLon, baseLat],
    ],
  ];
}

// バウンディングボックス計算
function calculateBoundingBox(
  features: MeshGeoJSONFeature[]
): [number, number, number, number] {
  if (features.length === 0) return [139.0, 35.0, 140.0, 36.0];
  let minLon = Infinity,
    minLat = Infinity,
    maxLon = -Infinity,
    maxLat = -Infinity;
  features.forEach((feature) => {
    feature.geometry.coordinates[0].forEach(([lon, lat]) => {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });
  });
  return [minLon, minLat, maxLon, maxLat];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityType = searchParams.get("facilityType") || "asds";
    const timeRange = parseInt(searchParams.get("timeRange") || "30");
    const meshSize = parseInt(searchParams.get("meshSize") || "250");
    const includeInterpolated =
      searchParams.get("includeInterpolated") !== "false";
    const minInquiryCount = parseInt(
      searchParams.get("minInquiryCount") || "1"
    );

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    console.log(
      `🔤 メッシュデータGeoJSONエクスポート開始: ${facilityType}, ${timeRange}日間, ${meshSize}mメッシュ`
    );

    // === Step 1: 修正された内部APIからメッシュデータを取得 ===
    const meshResponse = await fetch(
      `${request.nextUrl.origin}/api/analytics/inquiry-origins?facilityType=${facilityType}&timeRange=${timeRange}&meshSize=${meshSize}&kde=${includeInterpolated}`,
      {
        headers: {
          "User-Agent": "Internal-Export-API",
          Accept: "application/json",
        },
      }
    );

    if (!meshResponse.ok) {
      throw new Error(
        `メッシュデータ取得失敗: ${meshResponse.status} ${meshResponse.statusText}`
      );
    }

    const meshData = await meshResponse.json();
    console.log(`📊 内部API応答:`, {
      meshTilesCount: meshData?.meshTiles?.length || 0,
      originalDataMeshes: meshData?.summary?.originalDataMeshes || 0,
      interpolatedMeshes: meshData?.summary?.interpolatedMeshes || 0,
    });

    // メッシュデータが存在しない場合
    if (!meshData || !meshData.meshTiles || meshData.meshTiles.length === 0) {
      console.warn("⚠️ 内部APIからのメッシュデータが空です");
      return new NextResponse(
        JSON.stringify(
          {
            type: "FeatureCollection",
            crs: { type: "name", properties: { name: "EPSG:4326" } },
            metadata: {
              title: "障害福祉施設問い合わせ発信地点メッシュ分析",
              description: `${meshSize}mメッシュによる問い合わせ発信地点の密度・特性分析データ`,
              source: "障害福祉施設検索システム",
              createdAt: new Date().toISOString(),
              version: "1.0.0",
              totalFeatures: 0,
              boundingBox: [139, 35, 140, 36],
              analysisParams: {
                meshSizeMeters: meshSize,
                facilityTypes: [facilityType],
                kdeSettings: {
                  bandwidth: KDE_CONFIG?.BANDWIDTH || 800,
                  influenceRadius: KDE_CONFIG?.INFLUENCE_RADIUS || 2500,
                  minThreshold: KDE_CONFIG?.MIN_DENSITY_THRESHOLD || 0.05,
                },
                timePeriod: {
                  start: startDate.toISOString(),
                  end: endDate.toISOString(),
                  days: timeRange,
                },
              },
            },
            features: [],
          },
          null,
          2
        ),
        {
          status: 200,
          headers: {
            "Content-Type": "application/geo+json",
            "Content-Disposition": `attachment; filename="inquiry_mesh_${facilityType}_empty.geojson"`,
          },
        }
      );
    }

    // === Step 2: 詳細統計用の問い合わせデータを取得 ===
    const detailedInquiries = await prisma.inquiry.findMany({
      where: {
        facilityType,
        createdAt: { gte: startDate, lte: endDate },
        searchLatitude: { not: undefined },
        searchLongitude: { not: undefined },
      },
      include: {
        inquiryItems: {
          select: {
            status: true,
            sentAt: true,
            firstReplyAt: true,
            deliveredAt: true,
          },
        },
      },
    });

    console.log(`📋 詳細問い合わせデータ: ${detailedInquiries.length}件`);

    // === Step 3: 問い合わせをメッシュごとに分類 ===
    const inquiriesByMesh = new Map<string, typeof detailedInquiries>();
    detailedInquiries.forEach((inquiry) => {
      const meshId = calculateMeshId(
        inquiry.searchLatitude,
        inquiry.searchLongitude,
        meshSize
      );
      if (!inquiriesByMesh.has(meshId)) inquiriesByMesh.set(meshId, []);
      inquiriesByMesh.get(meshId)!.push(inquiry);
    });

    console.log(
      `🔗 メッシュ分類結果: ${inquiriesByMesh.size}個のメッシュに分類`
    );

    // === Step 4: フィーチャ生成 ===
    const features: MeshGeoJSONFeature[] = [];

    for (const meshTile of meshData.meshTiles) {
      const meshInquiries = inquiriesByMesh.get(meshTile.id) || [];
      const actualInquiryCount = meshInquiries.length;

      // 最小問い合わせ件数フィルタ（実データがある場合のみ適用）
      if (meshTile.isOriginalData && actualInquiryCount < minInquiryCount) {
        console.log(
          `⏭️ メッシュ ${meshTile.id}: ${actualInquiryCount}件 < ${minInquiryCount}件 (スキップ)`
        );
        continue;
      }

      // 補間データの場合は minInquiryCount チェックをスキップ
      if (!meshTile.isOriginalData && !includeInterpolated) {
        continue;
      }

      console.log(
        `✅ メッシュ ${meshTile.id}: ${meshTile.isOriginalData ? "実データ" : "補間"} ${actualInquiryCount}件`
      );

      // 統計計算
      const { hourlyDist, weekdayDist } =
        calculateTimeDistributions(meshInquiries);
      const facilityTypeBreakdown =
        calculateFacilityTypeBreakdown(meshInquiries);
      const performanceStats = await calculatePerformanceStats(
        meshInquiries.map((inq) => inq.id)
      );

      const uniqueUsers = new Set(meshInquiries.map((inq) => inq.userEmail))
        .size;
      const totalFacilities = meshInquiries.reduce(
        (sum, inq) => sum + inq.totalFacilities,
        0
      );
      const averageSearchRadius =
        meshInquiries.length > 0
          ? Math.round(
              meshInquiries.reduce((sum, inq) => sum + inq.searchRadius, 0) /
                meshInquiries.length
            )
          : meshTile.averageRadius || 0;

      const confidenceLevel = meshTile.isOriginalData
        ? 1.0
        : Math.min(
            0.8,
            meshTile.interpolatedDensity /
              (meshData.summary?.maxInterpolatedDensity || 1)
          );

      features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: calculateMeshGeometry(meshTile.id, meshSize),
        },
        properties: {
          meshId: meshTile.id,
          meshSize,
          centerLat: meshTile.lat,
          centerLon: meshTile.lon,
          inquiryCount:
            actualInquiryCount > 0 ? actualInquiryCount : meshTile.inquiryCount,
          uniqueUsers:
            actualInquiryCount > 0 ? uniqueUsers : meshTile.uniqueUsers,
          totalFacilities:
            actualInquiryCount > 0 ? totalFacilities : meshTile.totalFacilities,
          averageSearchRadius,
          periodStart: startDate.toISOString(),
          periodEnd: endDate.toISOString(),
          firstInquiryAt:
            meshInquiries.length > 0
              ? Math.min(...meshInquiries.map((inq) => inq.createdAt.getTime()))
              : null,
          lastInquiryAt:
            meshInquiries.length > 0
              ? Math.max(...meshInquiries.map((inq) => inq.createdAt.getTime()))
              : null,
          densityPerKm2:
            (actualInquiryCount || meshTile.inquiryCount) /
            ((meshSize * meshSize) / 1000000),
          interpolatedDensity: meshTile.interpolatedDensity,
          isOriginalData: meshTile.isOriginalData,
          confidenceLevel: Math.round(confidenceLevel * 100) / 100,
          prefecture: "東京都",
          city: null,
          nearestStation: null,
          facilityTypeBreakdown,
          hourlyDistribution: hourlyDist,
          weekdayDistribution: weekdayDist,
          averageResponseRate: performanceStats.averageResponseRate,
          averageResponseTimeHours: performanceStats.averageResponseTimeHours,
          successfulContactRate: performanceStats.successfulContactRate,
          exportedAt: new Date().toISOString(),
          dataVersion: "1.0",
          calculationMethod: includeInterpolated ? "KDE" : "RAW",
        },
      });
    }

    console.log(`📊 生成されたフィーチャ数: ${features.length}`);

    // === メタデータ作成 ===
    const geoJson: MeshGeoJSON = {
      type: "FeatureCollection",
      crs: { type: "name", properties: { name: "EPSG:4326" } },
      metadata: {
        title: "障害福祉施設問い合わせ発信地点メッシュ分析",
        description: `${meshSize}mメッシュによる問い合わせ発信地点の密度・特性分析データ`,
        source: "障害福祉施設検索システム",
        createdAt: new Date().toISOString(),
        version: "1.0.0",
        totalFeatures: features.length,
        boundingBox: calculateBoundingBox(features),
        analysisParams: {
          meshSizeMeters: meshSize,
          facilityTypes: [facilityType],
          kdeSettings: {
            bandwidth: KDE_CONFIG?.BANDWIDTH || 800,
            influenceRadius: KDE_CONFIG?.INFLUENCE_RADIUS || 2500,
            minThreshold: KDE_CONFIG?.MIN_DENSITY_THRESHOLD || 0.05,
          },
          timePeriod: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            days: timeRange,
          },
        },
      },
      features,
    };

    const filename = `inquiry_mesh_${facilityType}_${timeRange}days_${meshSize}m_${new Date().toISOString().split("T")[0]}.geojson`;

    console.log(
      `🏁 GeoJSONエクスポート完了: ${features.length}メッシュ, ${filename}`
    );

    return new NextResponse(JSON.stringify(geoJson, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/geo+json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Total-Features": features.length.toString(),
        "X-Analysis-Period": `${timeRange}days`,
        "X-Mesh-Size": `${meshSize}m`,
      },
    });
  } catch (error) {
    console.error("❌ メッシュGeoJSONエクスポートエラー:", error);
    return NextResponse.json(
      {
        error: "Export failed",
        message: error instanceof Error ? error.message : "不明なエラー",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
