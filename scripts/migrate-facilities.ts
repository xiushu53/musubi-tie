#!/usr/bin/env tsx

/**
 * 施設データをJSONファイルからデータベースに移行するスクリプト
 * Vercel環境対応版
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Prismaクライアントの接続管理を改善
let prisma: PrismaClient;

async function initializePrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['error'],
    });
    
    // 明示的に接続
    await prisma.$connect();
    console.log('✅ Database connected');
  }
  return prisma;
}

async function migrateFacilities() {
  console.log('🚀 施設データ移行開始...');

  try {
    // Prismaクライアントの初期化
    const client = await initializePrisma();

    // 既存データの確認
    const existingCount = await client.facility.count();
    console.log(`📊 既存施設数: ${existingCount}`);

    if (existingCount > 0) {
      console.log('⚠️ 既存データが存在します。スキップします。');
      return;
    }

    // データ移行処理
    let totalInserted = 0;
    let totalSkipped = 0;

    const publicDir = join(process.cwd(), 'public');
    const facilityDirs = readdirSync(publicDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
      .map(dirent => dirent.name);

    for (const dirName of facilityDirs) {
      const facilitiesPath = join(publicDir, dirName, 'facilities.json');
      
      try {
        console.log(`📂 処理中: ${dirName}...`);
        const facilitiesData = JSON.parse(readFileSync(facilitiesPath, 'utf-8'));
        
        if (!Array.isArray(facilitiesData)) {
          console.warn(`⚠️ 無効なデータ形式: ${dirName}/facilities.json`);
          continue;
        }

        // バッチ処理で効率化
        const batchSize = 100;
        for (let i = 0; i < facilitiesData.length; i += batchSize) {
          const batch = facilitiesData.slice(i, i + batchSize);
          
          for (const facility of batch) {
            try {
              await client.facility.create({
                data: {
                  id: facility.id,
                  name: facility.name || '',
                  email: facility.email || `contact-${facility.id}@example.com`,
                  address: facility.address || '',
                  latitude: facility.latitude || 0,
                  longitude: facility.longitude || 0,
                  facilityType: mapFacilityType(dirName),
                  prefecture: facility.prefecture || extractPrefecture(facility.address || ''),
                  city: facility.city || extractCity(facility.address || ''),
                }
              });
              
              totalInserted++;
              
            } catch (error: any) {
              if (error.code === 'P2002') {
                // 重複エラーはスキップ
                totalSkipped++;
              } else {
                console.error(`❌ 施設登録エラー ${facility.id}:`, error.message);
                totalSkipped++;
              }
            }
          }
          
          // 進捗表示
          if ((i + batchSize) % 500 === 0 || i + batchSize >= facilitiesData.length) {
            console.log(`📊 ${dirName}: ${Math.min(i + batchSize, facilitiesData.length)}/${facilitiesData.length}`);
          }
        }
        
        console.log(`✅ ${dirName} 完了`);
        
      } catch (error) {
        console.warn(`⚠️ ${dirName} 処理できませんでした:`, error);
        continue;
      }
    }

    console.log(`✅ 挿入完了: ${totalInserted}件, スキップ: ${totalSkipped}件`);
    console.log('✅ 全施設データ移行完了！');

  } catch (error) {
    console.error('❌ 移行エラー:', error);
    throw error; // Vercel buildを失敗させる
  }
}

// 施設タイプマッピング
function mapFacilityType(dirName: string): string {
  const mapping: Record<string, string> = {
    '放課後等デイサービス事業所': 'after-school-day-service',
    '障害児相談支援事業所': 'disabled-child-consultation',
    '計画相談事業所': 'consultation-planning',
    '就労継続支援（Ａ型）事業所': 'continuous-employment-support-a',
    '就労継続支援（Ｂ型）事業所': 'continuous-employment-support-b'
  };
  
  return mapping[dirName] || dirName;
}

// 都道府県抽出
function extractPrefecture(address: string): string {
  const prefectures = ['東京都', '大阪府', '京都府', '北海道'];
  const prefectureSuffixes = ['県', '府', '都', '道'];
  
  for (const prefecture of prefectures) {
    if (address.includes(prefecture)) {
      return prefecture;
    }
  }
  
  for (const suffix of prefectureSuffixes) {
    const match = address.match(new RegExp(`(.+?${suffix})`));
    if (match) {
      return match[1];
    }
  }
  
  return '東京都';
}

// 市区町村抽出
function extractCity(address: string): string {
  const citySuffixes = ['市', '区', '町', '村'];
  
  for (const suffix of citySuffixes) {
    const match = address.match(new RegExp(`[都道府県](.+?${suffix})`));
    if (match) {
      return match[1];
    }
  }
  
  return '';
}

// メイン実行
async function main() {
  try {
    await migrateFacilities();
  } finally {
    // 確実に接続を切断
    if (prisma) {
      await prisma.$disconnect();
      console.log('✅ Database disconnected');
    }
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ スクリプト実行エラー:', error);
    process.exit(1);
  });
}

export { migrateFacilities };