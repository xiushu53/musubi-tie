// src/app/api/analytics/inquiries/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityType = searchParams.get("facilityType") || "asds";
    const timeRange = searchParams.get("timeRange") || "30"; // days
    const includeDetails = searchParams.get("details") === "true";

    // 時間範囲の計算
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    console.log(
      `📊 問い合わせ分析データ取得: ${facilityType}, ${timeRange}日間`
    );

    // 基本的な問い合わせ統計を取得
    const inquiryStats = await prisma.inquiry.findMany({
      where: {
        facilityType,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        inquiryItems: {
          include: {
            facility: true,
          },
        },
      },
    });

    // 施設ごとの統計を集計
    const facilityAnalytics = new Map();

    for (const inquiry of inquiryStats) {
      for (const item of inquiry.inquiryItems) {
        const facilityId = item.facilityId;

        if (!facilityAnalytics.has(facilityId)) {
          facilityAnalytics.set(facilityId, {
            facility: item.facility,
            totalInquiries: 0,
            sentCount: 0,
            deliveredCount: 0,
            openedCount: 0,
            repliedCount: 0,
            averageDistance: 0,
            distances: [],
            replyTimes: [], // 返信までの時間（時間）
            lastInquiryAt: null,
            firstInquiryAt: null,
          });
        }

        const stats = facilityAnalytics.get(facilityId);
        stats.totalInquiries++;

        // ステータス別カウント
        if (item.status !== "DRAFT") stats.sentCount++;
        if (item.deliveredAt) stats.deliveredCount++;
        if (item.openedAt) stats.openedCount++;
        if (item.firstReplyAt) stats.repliedCount++;

        // 距離データ
        stats.distances.push(item.distanceMeters);

        // 返信時間計算
        if (item.sentAt && item.firstReplyAt) {
          const replyTimeHours =
            (item.firstReplyAt.getTime() - item.sentAt.getTime()) /
            (1000 * 60 * 60);
          stats.replyTimes.push(replyTimeHours);
        }

        // 日時記録
        const inquiryDate = inquiry.createdAt;
        if (!stats.firstInquiryAt || inquiryDate < stats.firstInquiryAt) {
          stats.firstInquiryAt = inquiryDate;
        }
        if (!stats.lastInquiryAt || inquiryDate > stats.lastInquiryAt) {
          stats.lastInquiryAt = inquiryDate;
        }
      }
    }

    // 集計結果を配列に変換
    const analyticsData = Array.from(facilityAnalytics.values()).map(
      (stats) => {
        // 平均距離計算
        const avgDistance =
          stats.distances.length > 0
            ? stats.distances.reduce((a: number, b: number) => a + b, 0) /
              stats.distances.length
            : 0;

        // 平均返信時間計算
        const avgReplyTime =
          stats.replyTimes.length > 0
            ? stats.replyTimes.reduce((a: number, b: number) => a + b, 0) /
              stats.replyTimes.length
            : null;

        // 返信率計算
        const replyRate =
          stats.sentCount > 0
            ? (stats.repliedCount / stats.sentCount) * 100
            : 0;
        const openRate =
          stats.sentCount > 0 ? (stats.openedCount / stats.sentCount) * 100 : 0;
        const deliveryRate =
          stats.sentCount > 0
            ? (stats.deliveredCount / stats.sentCount) * 100
            : 0;

        return {
          facility: {
            id: stats.facility.id,
            name: stats.facility.name,
            address: stats.facility.address,
            lat: stats.facility.latitude,
            lon: stats.facility.longitude,
            prefecture: stats.facility.prefecture,
            city: stats.facility.city,
          },
          analytics: {
            totalInquiries: stats.totalInquiries,
            sentCount: stats.sentCount,
            deliveredCount: stats.deliveredCount,
            openedCount: stats.openedCount,
            repliedCount: stats.repliedCount,

            // 率計算
            replyRate: Math.round(replyRate * 10) / 10,
            openRate: Math.round(openRate * 10) / 10,
            deliveryRate: Math.round(deliveryRate * 10) / 10,

            // 距離統計
            averageDistance: Math.round(avgDistance),
            minDistance: Math.min(...stats.distances),
            maxDistance: Math.max(...stats.distances),

            // 時間統計
            averageReplyTimeHours: avgReplyTime
              ? Math.round(avgReplyTime * 10) / 10
              : null,

            // 日時
            firstInquiryAt: stats.firstInquiryAt,
            lastInquiryAt: stats.lastInquiryAt,
          },
          ...(includeDetails && {
            details: {
              distances: stats.distances,
              replyTimes: stats.replyTimes,
            },
          }),
        };
      }
    );

    // 全体統計も計算
    const totalStats = {
      totalFacilities: analyticsData.length,
      totalInquiries: analyticsData.reduce(
        (sum, item) => sum + item.analytics.totalInquiries,
        0
      ),
      totalReplies: analyticsData.reduce(
        (sum, item) => sum + item.analytics.repliedCount,
        0
      ),
      averageReplyRate:
        analyticsData.length > 0
          ? analyticsData.reduce(
              (sum, item) => sum + item.analytics.replyRate,
              0
            ) / analyticsData.length
          : 0,
      topPerformers: analyticsData
        .filter((item) => item.analytics.sentCount >= 3) // 最低3件以上の問い合わせがある施設
        .sort((a, b) => b.analytics.replyRate - a.analytics.replyRate)
        .slice(0, 10),
    };

    console.log(
      `📈 分析完了: ${analyticsData.length}施設, 全体返信率${totalStats.averageReplyRate.toFixed(1)}%`
    );

    return NextResponse.json({
      facilityType,
      timeRange: parseInt(timeRange),
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      facilities: analyticsData,
      summary: totalStats,
    });
  } catch (error) {
    console.error("❌ 問い合わせ分析データ取得エラー:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "不明なエラー",
      },
      { status: 500 }
    );
  }
}
