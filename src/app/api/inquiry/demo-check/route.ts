// src/app/api/inquiry/demo-check/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("🔍 デモモード判定API呼び出し");

    // RESEND_API_KEYが空文字またはundefinedの場合はデモモード
    const resendApiKey = process.env.RESEND_API_KEY;
    const isDemoMode = !resendApiKey || resendApiKey.trim() === "";

    console.log("📧 RESEND_API_KEY存在:", !!resendApiKey);
    console.log("🎯 デモモード判定:", isDemoMode);

    const response = {
      isDemoMode,
      message: isDemoMode
        ? "デモモード: メール送信は行われません"
        : "通常モード: 実際にメールが送信されます",
      resendApiKeyExists: !!resendApiKey,
    };

    console.log("✅ デモモード判定レスポンス:", response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ デモモード判定エラー:", error);
    return NextResponse.json(
      {
        error: "デモモード判定に失敗しました",
        isDemoMode: true, // エラー時はデモモードとして扱う
        message: "エラーが発生したため、安全のためデモモードで動作します",
      },
      { status: 500 }
    );
  }
}
