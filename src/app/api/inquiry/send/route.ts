// src/app/api/inquiry/send/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    prefecture?: string;
    city?: string;
  };
}

// 住所から都道府県・市区町村を抽出（簡易版）
function extractLocationInfo(latitude: number, longitude: number) {
  // 簡易的な地域判定（実際は逆ジオコーディングAPIを使用）
  // 東京都内の大まかな判定
  if (
    latitude >= 35.5 &&
    latitude <= 35.9 &&
    longitude >= 139.3 &&
    longitude <= 139.9
  ) {
    return { prefecture: "東京都", city: "渋谷区" }; // 仮設定
  }
  return { prefecture: "不明", city: "不明" };
}

// 返信専用アドレス生成
function generateReplyAddress(inquiryItemId: string): string {
  return `reply-${inquiryItemId}@your-domain.com`; // 本番では実際のドメイン
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
  searchInfo: any,
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
            <li style="margin: 8px 0;"><strong>📍 検索地点:</strong> ${searchInfo.prefecture}${searchInfo.city}</li>
            <li style="margin: 8px 0;"><strong>📏 施設までの距離:</strong> ${distance}m</li>
          </ul>
        </div>
        
        <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #065f46; margin-top: 0;">📍 検索条件詳細</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="margin: 8px 0;"><strong>検索範囲:</strong> ${searchInfo.radius}m</li>
            <li style="margin: 8px 0;"><strong>施設タイプ:</strong> ${searchInfo.facilityType}</li>
            <li style="margin: 8px 0;"><strong>検索座標:</strong> ${searchInfo.latitude.toFixed(6)}, ${searchInfo.longitude.toFixed(6)}</li>
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

export async function POST(request: NextRequest) {
  try {
    const data: InquiryRequest = await request.json();
    console.log("📧 一括問い合わせ送信開始:", {
      facilities: data.facilities.length,
      user: data.user.email,
    });

    // バリデーション
    if (!data.user.name || !data.user.email) {
      return NextResponse.json(
        { error: "ユーザー名とメールアドレスは必須です" },
        { status: 400 }
      );
    }

    if (!data.facilities || data.facilities.length === 0) {
      return NextResponse.json(
        { error: "送信対象の施設が選択されていません" },
        { status: 400 }
      );
    }

    // 地域情報抽出
    const locationInfo = extractLocationInfo(
      data.searchInfo.latitude,
      data.searchInfo.longitude
    );

    // トランザクション開始
    const result = await prisma.$transaction(async (prisma) => {
      // 1. 問い合わせセッション作成
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

      console.log(`✅ 問い合わせセッション作成: ${inquiry.id}`);

      // 2. 各施設への問い合わせ項目作成 & メール送信
      const inquiryItems = [];
      const emailResults = [];

      for (const facilityData of data.facilities) {
        // 施設情報取得
        const facility = await prisma.facility.findUnique({
          where: { id: facilityData.facilityId },
        });

        if (!facility) {
          console.warn(`⚠️ 施設ID ${facilityData.facilityId} が見つかりません`);
          continue;
        }

        // 問い合わせ項目作成
        const inquiryItem = await prisma.inquiryItem.create({
          data: {
            inquiryId: inquiry.id,
            facilityId: facility.id,
            distanceMeters: Math.round(facilityData.distance),
            status: "DRAFT",
          },
        });

        // 返信専用アドレス生成
        const _replyToAddress = generateReplyAddress(inquiryItem.id);

        // HTML メール生成
        const emailHtml = generateEmailHtml(
          data.user.name,
          data.user.email,
          data.user.phone,
          facility.name,
          facilityData.commonMessage,
          facilityData.facilityMessage,
          facilityData.distance,
          {
            ...data.searchInfo,
            prefecture: locationInfo.prefecture,
            city: locationInfo.city,
          },
          inquiryItem.id
        );

        try {
          // 開発環境では個人アドレスに送信
          const toEmail =
            process.env.NODE_ENV === "development"
              ? process.env.DEV_EMAIL || "your-personal-email@example.com" // 環境変数で設定
              : facility.email;

          console.log(`📧 メール送信: ${facility.name} → ${toEmail}`);

          // Resendでメール送信
          const emailResult = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
            to: [toEmail],
            replyTo: data.user.email, // ユーザーに直接返信
            subject: `【障害福祉サービス】利用相談のお問い合わせ - ${data.user.name}様より`,
            html: emailHtml,
            // テキスト版も提供
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

          // 送信成功時のステータス更新
          await prisma.inquiryItem.update({
            where: { id: inquiryItem.id },
            data: {
              status: "SENT",
              resendMessageId: emailResult.data?.id,
              sentAt: new Date(),
            },
          });

          emailResults.push({
            facilityId: facility.id,
            facilityName: facility.name,
            inquiryItemId: inquiryItem.id,
            messageId: emailResult.data?.id,
            success: true,
          });
        } catch (emailError) {
          console.error(`❌ メール送信失敗 ${facility.name}:`, emailError);

          // 送信失敗のステータス更新
          await prisma.inquiryItem.update({
            where: { id: inquiryItem.id },
            data: {
              status: "DRAFT",
            },
          });

          emailResults.push({
            facilityId: facility.id,
            facilityName: facility.name,
            inquiryItemId: inquiryItem.id,
            success: false,
            error:
              emailError instanceof Error ? emailError.message : "送信エラー",
          });
        }

        inquiryItems.push(inquiryItem);
      }

      return {
        inquiry,
        inquiryItems,
        emailResults,
      };
    });

    // 送信結果集計
    const successCount = result.emailResults.filter((r) => r.success).length;
    const failureCount = result.emailResults.filter((r) => !r.success).length;

    console.log(`📊 送信完了: 成功 ${successCount}件, 失敗 ${failureCount}件`);

    return NextResponse.json({
      inquiryId: result.inquiry.id,
      status: "sent",
      totalFacilities: data.facilities.length,
      successCount,
      failureCount,
      results: result.emailResults,
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
