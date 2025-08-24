#!/usr/bin/env tsx

/**
 * ダミー問い合わせデータ生成スクリプト
 * Vercel環境対応版
 */

import { PrismaClient } from '@prisma/client';

// Prismaクライアントの接続管理
let prisma: PrismaClient;

async function initializePrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['error'],
    });
    
    await prisma.$connect();
    console.log('✅ Database connected for dummy data');
  }
  return prisma;
}

async function seedDummyInquiries() {
  console.log('🎭 ダミー問い合わせデータ生成開始...');

  try {
    const client = await initializePrisma();

    // 既存のダミーデータ確認
    const existingCount = await client.inquiry.count();
    console.log(`📊 既存問い合わせ数: ${existingCount}`);

    // 施設データの確認
    const facilityCount = await client.facility.count();
    if (facilityCount === 0) {
      console.log('⚠️ 施設データが存在しません。ダミーデータ生成をスキップします。');
      return;
    }

    if (existingCount >= 50) {
      console.log('⚠️ 十分なダミーデータが存在します。スキップします。');
      return;
    }

    // 施設データを取得
    const facilities = await client.facility.findMany({
      select: { id: true, facilityType: true, latitude: true, longitude: true }
    });

    console.log(`📊 利用可能施設数: ${facilities.length}`);

    // ダミーデータ生成
    const inquiriesToGenerate = Math.min(50 - existingCount, 50);
    console.log(`🎯 生成予定件数: ${inquiriesToGenerate}件`);

    for (let i = 0; i < inquiriesToGenerate; i++) {
      try {
        // ランダムな検索地点（東京周辺）
        const searchLat = 35.6762 + (Math.random() - 0.5) * 0.2;
        const searchLng = 139.6503 + (Math.random() - 0.5) * 0.2;
        
        // ランダムな施設タイプ
        const facilityTypes = [...new Set(facilities.map(f => f.facilityType))];
        const randomType = facilityTypes[Math.floor(Math.random() * facilityTypes.length)];
        
        // 該当施設を取得
        const typeFacilities = facilities.filter(f => f.facilityType === randomType);
        const selectedFacilities = typeFacilities
          .slice(0, Math.floor(Math.random() * 5) + 1); // 1-5施設

        if (selectedFacilities.length === 0) continue;

        // 問い合わせ作成
        const inquiry = await client.inquiry.create({
          data: {
            totalFacilities: selectedFacilities.length,
            searchLatitude: searchLat,
            searchLongitude: searchLng,
            searchRadius: [1000, 2000, 5000][Math.floor(Math.random() * 3)],
            facilityType: randomType,
            prefecture: '東京都',
            city: '渋谷区',
            userEmail: `demo-user-${i + 1}@example.com`,
            status: ['SENT', 'COMPLETED'][Math.floor(Math.random() * 2)] as any,
          }
        });

        // 問い合わせアイテム作成
        for (const facility of selectedFacilities) {
          const distance = Math.floor(Math.random() * 5000) + 500; // 500-5500m
          
          await client.inquiryItem.create({
            data: {
              inquiryId: inquiry.id,
              facilityId: facility.id,
              distanceMeters: distance,
              status: ['SENT', 'DELIVERED', 'REPLIED'][Math.floor(Math.random() * 3)] as any,
              sentAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
              replyCount: Math.floor(Math.random() * 3),
            }
          });
        }

        if ((i + 1) % 10 === 0) {
          console.log(`📊 生成進捗: ${i + 1}/${inquiriesToGenerate}`);
        }

      } catch (error) {
        console.error(`❌ ダミーデータ生成エラー ${i + 1}:`, error);
      }
    }

    const finalCount = await client.inquiry.count();
    console.log(`✅ ダミーデータ生成完了！総問い合わせ数: ${finalCount}件`);

  } catch (error) {
    console.error('❌ ダミーデータ生成エラー:', error);
    // Vercelビルドを止めない（ダミーデータは必須ではない）
  }
}

async function main() {
  try {
    await seedDummyInquiries();
  } finally {
    if (prisma) {
      await prisma.$disconnect();
      console.log('✅ Database disconnected from dummy seeding');
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ ダミーデータスクリプトエラー:', error);
    // ダミーデータエラーではプロセスを終了しない
  });
}

export { seedDummyInquiries };