// src/app/api/inquiry/send/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

// Resendの初期化（デモモード時は初期化しない）
let resend: Resend | null = null;

interface InquiryRequest {
  user: {
    name: string;
    email: string;
    phone?: string;
  };
  facilities: Array<{
    facilityId: number;
    distance: number;
    commonMessage: string;
    facilityMessage?: string;
  }>;
  searchInfo: {
    latitude: number;
    longitude: number;
    radius: number;
    facilityType: string;
    displayName?: string;
    prefecture?: string;
    city?: string;
  };
}

// デモモード判定とResend初期化
function isDemoMode(): boolean {
  const resendApiKey = process.env.RESEND_API_KEY;
  return !resendApiKey || resendApiKey.trim() === "";
}

// Resendインスタンスを取得（必要時に初期化）
function getResendInstance(): Resend | null {
  if (isDemoMode()) {
    return null; // デモモード時はnull
  }

  if (!resend) {
    try {
      resend = new Resend(process.env.RESEND_API_KEY!);
      console.log("✅ Resend初期化完了");
    } catch (error) {
      console.error("❌ Resend初期化エラー:", error);
      return null;
    }
  }

  return resend;
}

// 座標から住所を逆ジオコーディング（プライバシー配慮版）
async function getPrivacySafeLocation(
  latitude: number,
  longitude: number,
  displayName?: string
): Promise<string> {
  try {
    if (displayName) {
      const locationPart = displayName.split("(")[0].trim();

      if (locationPart.includes("駅")) {
        return locationPart;
      }

      if (
        locationPart.includes("区") ||
        locationPart.includes("市") ||
        locationPart.includes("町")
      ) {
        return locationPart;
      }
    }

    // 国土地理院の逆ジオコーディングAPI使用（プライバシー配慮）
    const response = await fetch(
      `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${latitude},${longitude}&category=STRT`
    );

    if (response.ok) {
      const results = await response.json();
      if (results && results.length > 0) {
        const address = results[0].properties?.title || "";

        const safeAddress = address
          .replace(/\d+番地.*$/, "")
          .replace(/\d+-\d+.*$/, "")
          .replace(/\d+丁目.*$/, "丁目")
          .trim();

        return safeAddress || "検索地点周辺";
      }
    }

    if (
      latitude >= 35.5 &&
      latitude <= 35.9 &&
      longitude >= 139.3 &&
      longitude <= 139.9
    ) {
      return "東京都内";
    }

    return "検索地点周辺";
  } catch (error) {
    console.warn("逆ジオコーディングエラー:", error);
    return "検索地点周辺";
  }
}

// 返信専用アドレス生成
function _generateReplyAddress(inquiryItemId: string): string {
  return `reply-${inquiryItemId}@your-domain.com`;
}

// メールHTML生成
function generateEmailHtml(
  userName: string,
  userEmail: string,
  userPhone: string | undefined,
  facilityName: string,
  commonMessage: string,
  facilityMessage: string | undefined,
  distance: number,
  privacySafeLocation: string,
  inquiryItemId: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>障害福祉サービス利用相談</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
          🏢 障害福祉サービス利用相談のお問い合わせ
        </h2>
        
        <p><strong>${facilityName}</strong> ご担当者様</p>
        
        <p>障害福祉サービスの利用を検討している <strong>${userName}</strong> と申します。<br>
        施設検索システムを通じてお問い合わせをお送りしています。</p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1e40af; margin-top: 0;">📝 お問い合わせ内容</h3>
          <p style="white-space: pre-wrap; background-color: white; padding: 15px; border-left: 4px solid #3b82f6; margin: 10px 0;">${commonMessage}</p>
          
          ${
            facilityMessage
              ? `
            <h4 style="color: #1e40af;">🎯 ${facilityName} への個別メッセージ</h4>
            <p style="white-space: pre-wrap; background-color: white; padding: 15px; border-left: 4px solid #10b981; margin: 10px 0;">${facilityMessage}</p>
          `
              : ""
          }
        </div>
        
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #0f172a; margin-top: 0;">👤 連絡先情報</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="margin: 8px 0;"><strong>📧 メール:</strong> ${userEmail}</li>
            ${userPhone ? `<li style="margin: 8px 0;"><strong>📱 電話:</strong> ${userPhone}</li>` : ""}
            <li style="margin: 8px 0;"><strong>📍 検索地点:</strong> ${privacySafeLocation}</li>
            <li style="margin: 8px 0;"><strong>📏 施設までの距離:</strong> 約${(distance / 1000).toFixed(1)}km</li>
          </ul>
        </div>
        
        <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #065f46; margin-top: 0;">📍 検索情報</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="margin: 8px 0;"><strong>検索地点:</strong> ${privacySafeLocation}</li>
            <li style="margin: 8px 0;"><strong>施設までの距離:</strong> 約${(distance / 1000).toFixed(1)}km</li>
          </ul>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
          <p><strong>💬 このメールへの返信方法:</strong><br>
          このメールに直接返信していただければ、${userName}様に届きます。<br>
          お忙しいとは思いますが、ご検討のほどよろしくお願いいたします。</p>
          
          <div style="background-color: #fef3c7; padding: 10px; border-radius: 6px; margin: 15px 0; font-size: 12px;">
            <p style="margin: 0;"><strong>🆔 問い合わせ管理番号:</strong> ${inquiryItemId}<br>
            <strong>📅 送信日時:</strong> ${new Date().toLocaleString("ja-JP")}<br>
            <strong>🔗 送信システム:</strong> 障害福祉施設検索システム</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// デモモード用のダミー送信結果生成
function generateDemoResults(facilities: InquiryRequest["facilities"]) {
  return facilities.map((facilityData, index) => {
    // 90%の確率で成功、10%で失敗
    const success = Math.random() > 0.1;

    return {
      facilityId: facilityData.facilityId,
      facilityName: `施設 ${index + 1}`, // 実際の施設名は後でDBから取得
      inquiryItemId: `demo_item_${Date.now()}_${index}`,
      messageId: success ? `demo_msg_${Date.now()}_${index}` : null,
      success,
      error: success ? undefined : "デモモード: 擬似的な送信エラー",
    };
  });
}

export async function POST(request: NextRequest) {
  console.log("🚀 問い合わせ送信API開始");

  try {
    const data: InquiryRequest = await request.json();
    const isDemo = isDemoMode();

    console.log(
      `📧 一括問い合わせ送信開始 (${isDemo ? "デモモード" : "通常モード"}):`,
      {
        facilities: data.facilities.length,
        user: data.user.email,
        isDemoMode: isDemo,
      }
    );

    // バリデーション
    if (!data.user.name || !data.user.email) {
      console.error("❌ バリデーションエラー: ユーザー情報不足");
      return NextResponse.json(
        { error: "ユーザー名とメールアドレスは必須です" },
        { status: 400 }
      );
    }

    if (!data.facilities || data.facilities.length === 0) {
      console.error("❌ バリデーションエラー: 施設が選択されていない");
      return NextResponse.json(
        { error: "送信対象の施設が選択されていません" },
        { status: 400 }
      );
    }

    // Prismaクライアント接続テスト
    try {
      await prisma.$queryRaw`SELECT 1 as test`;
      console.log("✅ データベース接続確認済み");
    } catch (dbError) {
      console.error("❌ データベース接続エラー:", dbError);
      return NextResponse.json(
        { error: "データベース接続エラーが発生しました" },
        { status: 500 }
      );
    }

    // 地域情報抽出（プライバシー配慮版）
    let privacySafeLocation: string;
    try {
      privacySafeLocation = await getPrivacySafeLocation(
        data.searchInfo.latitude,
        data.searchInfo.longitude,
        data.searchInfo.displayName
      );
      console.log("📍 地域情報取得完了:", privacySafeLocation);
    } catch (locationError) {
      console.warn("⚠️ 地域情報取得エラー:", locationError);
      privacySafeLocation = "検索地点周辺"; // フォールバック
    }

    // DB保存用の地域情報
    const locationInfo = {
      prefecture: data.searchInfo.prefecture || "東京都",
      city: data.searchInfo.city || "都内",
    };

    // トランザクション開始
    console.log("💾 データベーストランザクション開始");
    const result = await prisma.$transaction(async (prisma) => {
      // 1. 問い合わせセッション作成（デモモード・通常モード共通）
      console.log("📝 問い合わせセッション作成中...");
      const inquiry = await prisma.inquiry.create({
        data: {
          searchLatitude: data.searchInfo.latitude,
          searchLongitude: data.searchInfo.longitude,
          searchRadius: data.searchInfo.radius,
          facilityType: data.searchInfo.facilityType,
          prefecture: data.searchInfo.prefecture || locationInfo.prefecture,
          city: data.searchInfo.city || locationInfo.city,
          userEmail: data.user.email,
          totalFacilities: data.facilities.length,
          status: "SENT",
        },
      });

      console.log(
        `✅ 問い合わせセッション作成: ${inquiry.id} (デモ: ${isDemo})`
      );

      // 2. 各施設への問い合わせ項目作成 & メール送信処理
      const inquiryItems = [];
      const emailResults = [];

      // デモモードの場合はダミー結果を事前生成
      let demoResults: any[] = [];
      if (isDemo) {
        demoResults = generateDemoResults(data.facilities);
        console.log("🎲 デモ結果生成完了:", demoResults.length, "件");
      }

      console.log("🔄 各施設への送信処理開始...");
      for (let i = 0; i < data.facilities.length; i++) {
        const facilityData = data.facilities[i];

        console.log(
          `📋 施設 ${i + 1}/${data.facilities.length} 処理中: ID=${facilityData.facilityId}`
        );

        // 施設情報取得
        const facility = await prisma.facility.findUnique({
          where: { id: facilityData.facilityId },
        });

        if (!facility) {
          console.warn(`⚠️ 施設ID ${facilityData.facilityId} が見つかりません`);
          continue;
        }

        // 問い合わせ項目作成（実データとして記録）
        const inquiryItem = await prisma.inquiryItem.create({
          data: {
            inquiryId: inquiry.id,
            facilityId: facility.id,
            distanceMeters: Math.round(facilityData.distance),
            status: "DRAFT", // 初期状態
          },
        });

        let emailResult: any;

        if (isDemo) {
          // デモモード: 実際のメール送信はスキップ、ダミーデータで記録
          const demoResult = demoResults[i];

          try {
            // ダミーの送信成功として記録
            await prisma.inquiryItem.update({
              where: { id: inquiryItem.id },
              data: {
                status: demoResult.success ? "SENT" : "DRAFT",
                resendMessageId: demoResult.messageId,
                sentAt: demoResult.success ? new Date() : null,
              },
            });

            emailResult = {
              facilityId: facility.id,
              facilityName: facility.name,
              inquiryItemId: inquiryItem.id,
              messageId: demoResult.messageId,
              success: demoResult.success,
              error: demoResult.error,
            };

            console.log(
              `📧 デモ送信記録: ${facility.name} → ${demoResult.success ? "成功" : "失敗"}`
            );
          } catch (error) {
            console.error(`❌ デモ記録エラー ${facility.name}:`, error);
            emailResult = {
              facilityId: facility.id,
              facilityName: facility.name,
              inquiryItemId: inquiryItem.id,
              success: false,
              error: "デモモード記録エラー",
            };
          }
        } else {
          // 通常モード: 実際のメール送信
          const resendInstance = getResendInstance();

          if (!resendInstance) {
            throw new Error("Resendの初期化に失敗しました");
          }

          const emailHtml = generateEmailHtml(
            data.user.name,
            data.user.email,
            data.user.phone,
            facility.name,
            facilityData.commonMessage,
            facilityData.facilityMessage,
            facilityData.distance,
            privacySafeLocation,
            inquiryItem.id
          );

          try {
            const toEmail =
              process.env.NODE_ENV === "development"
                ? process.env.DEV_EMAIL || "your-personal-email@example.com"
                : facility.email;

            console.log(`📧 実メール送信: ${facility.name} → ${toEmail}`);

            const emailSendResult = await resendInstance.emails.send({
              from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
              to: [toEmail],
              replyTo: data.user.email,
              subject: `【障害福祉サービス】利用相談のお問い合わせ - ${data.user.name}様より`,
              html: emailHtml,
              text: `
${facility.name} ご担当者様

障害福祉サービスの利用を検討している ${data.user.name} と申します。

【お問い合わせ内容】
${facilityData.commonMessage}

${facilityData.facilityMessage ? `【${facility.name}への個別メッセージ】\n${facilityData.facilityMessage}\n` : ""}

【連絡先】
メール: ${data.user.email}
${data.user.phone ? `電話: ${data.user.phone}` : ""}

施設までの距離: ${facilityData.distance}m
問い合わせID: ${inquiryItem.id}

このメールへの返信で直接やり取りが可能です。
よろしくお願いいたします。
              `.trim(),
            });

            await prisma.inquiryItem.update({
              where: { id: inquiryItem.id },
              data: {
                status: "SENT",
                resendMessageId: emailSendResult.data?.id,
                sentAt: new Date(),
              },
            });

            emailResult = {
              facilityId: facility.id,
              facilityName: facility.name,
              inquiryItemId: inquiryItem.id,
              messageId: emailSendResult.data?.id,
              success: true,
            };
          } catch (emailError) {
            console.error(`❌ メール送信失敗 ${facility.name}:`, emailError);

            await prisma.inquiryItem.update({
              where: { id: inquiryItem.id },
              data: {
                status: "DRAFT",
              },
            });

            emailResult = {
              facilityId: facility.id,
              facilityName: facility.name,
              inquiryItemId: inquiryItem.id,
              success: false,
              error:
                emailError instanceof Error ? emailError.message : "送信エラー",
            };
          }
        }

        emailResults.push(emailResult);
        inquiryItems.push(inquiryItem);
      }

      return {
        inquiry,
        inquiryItems,
        emailResults,
        isDemoMode: isDemo,
      };
    });

    // 送信結果集計
    const successCount = result.emailResults.filter((r) => r.success).length;
    const failureCount = result.emailResults.filter((r) => !r.success).length;

    const modeText = isDemo ? "デモモード" : "通常モード";
    console.log(
      `📊 ${modeText}送信完了: 成功 ${successCount}件, 失敗 ${failureCount}件`
    );

    return NextResponse.json({
      inquiryId: result.inquiry.id,
      status: "sent",
      totalFacilities: data.facilities.length,
      successCount,
      failureCount,
      results: result.emailResults,
      isDemoMode: isDemo,
    });
  } catch (error) {
    console.error("❌ 一括問い合わせ送信エラー:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "不明なエラー",
      },
      { status: 500 }
    );
  }
}
