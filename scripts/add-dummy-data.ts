// scripts/add-dummy-data.ts
import { PrismaClient, InquiryStatus, InquiryItemStatus } from "@prisma/client";

const prisma = new PrismaClient();

// 指定エリアの座標範囲
const SEARCH_AREAS = {
  新宿区: {
    name: "新宿区",
    bounds: {
      minLat: 35.687, maxLat: 35.710,
      minLon: 139.685, maxLon: 139.720
    }
  },
  中野区: {
    name: "中野区", 
    bounds: {
      minLat: 35.695, maxLat: 35.725,
      minLon: 139.645, maxLon: 139.685
    }
  },
  杉並区: {
    name: "杉並区",
    bounds: {
      minLat: 35.685, maxLat: 35.715,
      minLon: 139.615, maxLon: 139.665
    }
  },
  豊島区: {
    name: "豊島区",
    bounds: {
      minLat: 35.720, maxLat: 35.745,
      minLon: 139.695, maxLon: 139.725
    }
  }
} as const;

type AreaName = keyof typeof SEARCH_AREAS;

interface LocationResult {
  lat: number;
  lon: number;
  city: string;
}

interface FacilityWithDistance {
  id: number;
  name: string;
  email: string;
  address: string;
  latitude: number;
  longitude: number;
  facilityType: string;
  prefecture: string;
  city: string;
  distance: number;
}

interface InquiryData {
  id: string;
  searchLatitude: number;
  searchLongitude: number;
  searchRadius: number;
  facilityType: string;
  prefecture: string;
  city: string;
  userEmail: string;
  totalFacilities: number;
  status: InquiryStatus;
  createdAt: Date;
}

interface InquiryItemData {
  id: string;
  inquiryId: string;
  facilityId: number;
  status: InquiryItemStatus;
  resendMessageId: string;
  distanceMeters: number;
  sentAt: Date;
  deliveredAt: Date | null;
  openedAt: Date | null;
  firstReplyAt: Date | null;
  lastReplyAt: Date | null;
  replyCount: number;
}

// エリア内のランダム座標生成
function getRandomLocationInArea(areaName: AreaName): LocationResult {
  const area = SEARCH_AREAS[areaName];
  
  const lat = area.bounds.minLat + Math.random() * (area.bounds.maxLat - area.bounds.minLat);
  const lon = area.bounds.minLon + Math.random() * (area.bounds.maxLon - area.bounds.minLon);
  
  return { lat, lon, city: area.name };
}

// 距離計算（ハーバーサイン公式）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // 地球の半径（メートル）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ダミー問い合わせデータ生成（50件）
function generateDummyInquiries(): InquiryData[] {
  const inquiries: InquiryData[] = [];
  const now = new Date();
  const areaNames = Object.keys(SEARCH_AREAS) as AreaName[];
  const facilityTypes = ["asds", "sept-a", "sept-b", "pco", "ccd"];
  
  for (let i = 0; i < 50; i++) {
    // 過去30日間にランダム分散
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursOffset = Math.floor(Math.random() * 24);
    const minutesOffset = Math.floor(Math.random() * 60);
    
    const createdAt = new Date(now.getTime() - 
      (daysAgo * 24 * 60 * 60 * 1000) - 
      (hoursOffset * 60 * 60 * 1000) - 
      (minutesOffset * 60 * 1000)
    );
    
    // ランダムエリア選択
    const areaName = areaNames[Math.floor(Math.random() * areaNames.length)];
    const location = getRandomLocationInArea(areaName);
    
    // ランダム施設タイプ（重み付き: asdsを多めに）
    let facilityType: string;
    const typeRandom = Math.random();
    if (typeRandom < 0.4) {
      facilityType = "asds"; // 40%
    } else if (typeRandom < 0.6) {
      facilityType = "sept-b"; // 20%
    } else if (typeRandom < 0.75) {
      facilityType = "sept-a"; // 15%
    } else if (typeRandom < 0.9) {
      facilityType = "pco"; // 15%
    } else {
      facilityType = "ccd"; // 10%
    }
    
    inquiries.push({
      id: `dummy_inq_${i.toString().padStart(3, '0')}`,
      searchLatitude: location.lat,
      searchLongitude: location.lon,
      searchRadius: 1000 + Math.floor(Math.random() * 3000), // 1-4km
      facilityType,
      prefecture: "東京都",
      city: location.city,
      userEmail: `dummy_user_${i}@example.com`,
      totalFacilities: 2 + Math.floor(Math.random() * 4), // 2-5施設
      status: InquiryStatus.SENT,
      createdAt,
    });
  }
  
  return inquiries;
}

// ダミー問い合わせ項目データ生成（目標150件）
async function generateDummyInquiryItems(inquiries: InquiryData[]): Promise<InquiryItemData[]> {
  console.log("📍 既存施設データを取得中...");
  
  // 既存施設データを取得
  const allFacilities = await prisma.facility.findMany({
    orderBy: { id: 'asc' },
  });
  
  if (allFacilities.length === 0) {
    throw new Error("既存DBに施設データがありません。先にmigrate-facilities.tsを実行してください。");
  }
  
  console.log(`✅ 取得した施設数: ${allFacilities.length}件`);
  
  const inquiryItems: InquiryItemData[] = [];
  
  for (let inquiryIndex = 0; inquiryIndex < inquiries.length; inquiryIndex++) {
    const inquiry = inquiries[inquiryIndex];
    
    // 該当施設タイプの施設をフィルタ
    const matchingFacilities = allFacilities.filter(f => f.facilityType === inquiry.facilityType);
    
    if (matchingFacilities.length === 0) {
      console.warn(`⚠️ ${inquiry.facilityType} タイプの施設が見つかりません`);
      continue;
    }
    
    // 検索地点に近い施設を優先的に選択
    const facilitiesWithDistance: FacilityWithDistance[] = matchingFacilities.map(facility => ({
      ...facility,
      distance: calculateDistance(
        inquiry.searchLatitude,
        inquiry.searchLongitude,
        facility.latitude,
        facility.longitude
      )
    }))
    .filter(f => f.distance <= inquiry.searchRadius * 1.5) // 検索半径の1.5倍以内
    .sort((a, b) => a.distance - b.distance); // 距離順
    
    // 各問い合わせで2-5施設を選択（近い順 + ランダム要素）
    const facilityCount = Math.min(
      inquiry.totalFacilities, 
      Math.max(2, facilitiesWithDistance.length)
    );
    
    const selectedFacilities: FacilityWithDistance[] = [];
    
    // 近い施設を優先的に選択（70%）+ ランダム選択（30%）
    const priorityCount = Math.floor(facilityCount * 0.7);
    const randomCount = facilityCount - priorityCount;
    
    // 近い施設から選択
    selectedFacilities.push(...facilitiesWithDistance.slice(0, priorityCount));
    
    // ランダム選択（重複避ける）
    const remainingFacilities = facilitiesWithDistance
      .slice(priorityCount)
      .sort(() => 0.5 - Math.random());
    selectedFacilities.push(...remainingFacilities.slice(0, randomCount));
    
    for (let facilityIndex = 0; facilityIndex < selectedFacilities.length; facilityIndex++) {
      const facility = selectedFacilities[facilityIndex];
      const itemId = `dummy_item_${inquiryIndex}_${facilityIndex}`;
      const sentAt = new Date(inquiry.createdAt.getTime() + Math.random() * 3600000); // 送信から1時間以内
      
      // 現実的なステータス進行
      let status: InquiryItemStatus = InquiryItemStatus.SENT;
      let deliveredAt: Date | null = null;
      let openedAt: Date | null = null;
      let firstReplyAt: Date | null = null;
      let lastReplyAt: Date | null = null;
      let replyCount = 0;
      
      // 95%の確率で配信成功
      if (Math.random() > 0.05) {
        status = InquiryItemStatus.DELIVERED;
        deliveredAt = new Date(sentAt.getTime() + Math.random() * 1800000); // 30分以内に配信
        
        // 80%の確率で開封
        if (Math.random() > 0.2) {
          status = InquiryItemStatus.OPENED;
          openedAt = new Date(deliveredAt.getTime() + Math.random() * 7200000); // 2時間以内に開封
          
          // 距離による返信率調整（近いほど返信率高）
          const baseReplyRate = 0.45; // 基本返信率45%
          const distanceBonus = Math.max(0, (2000 - facility.distance) / 2000 * 0.2); // 距離ボーナス
          const adjustedReplyRate = Math.min(0.8, baseReplyRate + distanceBonus);
          
          if (Math.random() < adjustedReplyRate) {
            status = InquiryItemStatus.REPLIED;
            
            // 返信時間分布（施設タイプで差をつける）
            let replyDelayHours: number;
            if (inquiry.facilityType === "asds") {
              // 放課後等デイサービス: 比較的迅速（2-48時間）
              replyDelayHours = Math.random() < 0.4 
                ? Math.random() * 8 + 2 // 40%: 2-10時間
                : Math.random() * 38 + 10; // 60%: 10-48時間
            } else {
              // その他サービス: やや遅め（4-72時間）
              replyDelayHours = Math.random() < 0.3
                ? Math.random() * 12 + 4 // 30%: 4-16時間  
                : Math.random() * 56 + 16; // 70%: 16-72時間
            }
            
            const replyDelay = replyDelayHours * 3600000;
            firstReplyAt = new Date(openedAt.getTime() + replyDelay);
            lastReplyAt = firstReplyAt;
            
            // 複数回返信の可能性（25%）
            if (Math.random() > 0.75) {
              replyCount = 2 + Math.floor(Math.random() * 2); // 2-3回
              const additionalDelay = Math.random() * 604800000; // 1週間以内
              lastReplyAt = new Date(firstReplyAt.getTime() + additionalDelay);
            } else {
              replyCount = 1;
            }
          }
        }
      }
      
      inquiryItems.push({
        id: itemId,
        inquiryId: inquiry.id,
        facilityId: facility.id,
        status,
        resendMessageId: `dummy_msg_${itemId}`,
        distanceMeters: Math.round(facility.distance),
        sentAt,
        deliveredAt,
        openedAt,
        firstReplyAt,
        lastReplyAt,
        replyCount,
      });
    }
  }
  
  return inquiryItems;
}

// メイン処理: 既存DBにダミーデータ追加
async function addDummyDataToExistingDB(): Promise<void> {
  try {
    console.log("🎯 既存DBにダミーデータ追加開始...");
    
    // 既存のダミーデータをクリア
    console.log("🗑️ 既存ダミーデータクリア中...");
    
    const deletedItems = await prisma.inquiryItem.deleteMany({
      where: {
        id: {
          startsWith: "dummy_",
        },
      },
    });
    
    const deletedInquiries = await prisma.inquiry.deleteMany({
      where: {
        id: {
          startsWith: "dummy_",
        },
      },
    });
    
    console.log(`✅ 既存ダミーデータクリア完了: 問い合わせ${deletedInquiries.count}件, 項目${deletedItems.count}件`);
    
    // 1. ダミー問い合わせデータ生成・投入（50件）
    console.log("📝 ダミー問い合わせデータ生成中...");
    const dummyInquiries = generateDummyInquiries();
    
    for (const inquiry of dummyInquiries) {
      await prisma.inquiry.create({
        data: inquiry,
      });
    }
    console.log(`✅ ダミー問い合わせデータ投入完了: ${dummyInquiries.length}件`);
    
    // 2. ダミー問い合わせ項目データ生成・投入（目標150件）
    console.log("📋 ダミー問い合わせ項目データ生成中...");
    const dummyInquiryItems = await generateDummyInquiryItems(dummyInquiries);
    
    for (const item of dummyInquiryItems) {
      await prisma.inquiryItem.create({
        data: item,
      });
    }
    console.log(`✅ ダミー問い合わせ項目データ投入完了: ${dummyInquiryItems.length}件`);
    
    // 3. 統計サマリー表示
    const stats = {
      totalFacilities: await prisma.facility.count(),
      totalInquiries: await prisma.inquiry.count(),
      totalInquiryItems: await prisma.inquiryItem.count(),
      dummyInquiries: await prisma.inquiry.count({
        where: { id: { startsWith: "dummy_" } }
      }),
      dummyInquiryItems: await prisma.inquiryItem.count({
        where: { id: { startsWith: "dummy_" } }
      }),
      repliedItems: await prisma.inquiryItem.count({
        where: { 
          id: { startsWith: "dummy_" },
          status: InquiryItemStatus.REPLIED 
        }
      }),
    };
    
    // エリア別統計
    const areaStats = await prisma.inquiry.groupBy({
      by: ['city'],
      where: { id: { startsWith: "dummy_" } },
      _count: { id: true },
    });
    
    // 施設タイプ別統計
    const typeStats = await prisma.inquiry.groupBy({
      by: ['facilityType'],
      where: { id: { startsWith: "dummy_" } },
      _count: { id: true },
    });
    
    console.log("📊 ダミーデータ追加完了統計:");
    console.log(`  - 総施設数: ${stats.totalFacilities}件`);
    console.log(`  - 総問い合わせ: ${stats.totalInquiries}件 (うちダミー: ${stats.dummyInquiries}件)`);
    console.log(`  - 総問い合わせ項目: ${stats.totalInquiryItems}件 (うちダミー: ${stats.dummyInquiryItems}件)`);
    console.log(`  - ダミー返信済み: ${stats.repliedItems}件`);
    console.log(`  - ダミー返信率: ${stats.dummyInquiryItems > 0 ? Math.round((stats.repliedItems / stats.dummyInquiryItems) * 100) : 0}%`);
    
    console.log("\n🏘️ エリア別分布:");
    areaStats.forEach(stat => {
      console.log(`  - ${stat.city}: ${stat._count.id}件`);
    });
    
    console.log("\n🏢 施設タイプ別分布:");
    const typeNames: Record<string, string> = {
      asds: "放課後等デイサービス",
      "sept-a": "就労継続支援A",
      "sept-b": "就労継続支援B",
      pco: "計画相談事業所", 
      ccd: "障害児相談支援事業所",
    };
    typeStats.forEach(stat => {
      console.log(`  - ${typeNames[stat.facilityType] || stat.facilityType}: ${stat._count.id}件`);
    });
    
    console.log("🎉 ダミーデータ追加完了！");
    
  } catch (error) {
    console.error("❌ ダミーデータ追加エラー:", error);
    throw error;
  }
}

// ダミーデータクリア関数
async function clearDummyData(): Promise<void> {
  try {
    console.log("🗑️ ダミーデータクリア開始...");
    
    const deletedItems = await prisma.inquiryItem.deleteMany({
      where: {
        id: {
          startsWith: "dummy_",
        },
      },
    });
    
    const deletedInquiries = await prisma.inquiry.deleteMany({
      where: {
        id: {
          startsWith: "dummy_",
        },
      },
    });
    
    console.log(`✅ ダミーデータクリア完了: 問い合わせ${deletedInquiries.count}件, 項目${deletedItems.count}件`);
    
  } catch (error) {
    console.error("❌ ダミーデータクリアエラー:", error);
    throw error;
  }
}

// コマンドライン引数処理
async function main(): Promise<void> {
  const command = process.argv[2];
  
  try {
    if (command === 'clear') {
      await clearDummyData();
    } else {
      await addDummyDataToExistingDB();
    }
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプト実行
if (require.main === module) {
  main()
    .then(() => {
      console.log("✅ スクリプト実行完了");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ スクリプト実行失敗:", error);
      process.exit(1);
    });
}

export { addDummyDataToExistingDB, clearDummyData };