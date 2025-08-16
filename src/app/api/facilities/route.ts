// src/app/api/facilities/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { facilityType } = await request.json();

    // バリデーション
    if (!facilityType) {
      return NextResponse.json(
        { error: "facilityType is required" },
        { status: 400 }
      );
    }

    // DBから施設データ取得
    console.log(`🔍 DB検索: facilityType = ${facilityType}`);
    const startTime = performance.now();

    const facilities = await prisma.facility.findMany({
      where: {
        facilityType: facilityType,
      },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
      },
      // 必要に応じてソート
      orderBy: {
        id: "asc",
      },
    });

    const queryTime = performance.now() - startTime;
    console.log(
      `✅ DB検索完了: ${facilities.length}件, ${queryTime.toFixed(2)}ms`
    );

    return NextResponse.json(facilities);
  } catch (error) {
    console.error("❌ 施設データ取得エラー:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "不明なエラー",
      },
      { status: 500 }
    );
  }
}

// GET メソッドでの取得も対応（オプション）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityType = searchParams.get("type");

    if (!facilityType) {
      return NextResponse.json(
        { error: "facilityType parameter is required" },
        { status: 400 }
      );
    }

    const facilities = await prisma.facility.findMany({
      where: {
        facilityType: facilityType,
      },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json(facilities);
  } catch (error) {
    console.error("❌ 施設データ取得エラー:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
