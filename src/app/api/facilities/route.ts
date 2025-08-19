// src/app/api/facilities/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityType = searchParams.get("facilityType"); // ← "type" から "facilityType" に変更
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

    // useAllFacilities.ts が期待する形式に合わせる
    return NextResponse.json(facilities);
  } catch (error) {
    console.error("❌ 施設データ取得エラー:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
