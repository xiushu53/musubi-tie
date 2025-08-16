// scripts/migrate-facilities.ts
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// 住所から都道府県を抽出
function extractPrefecture(address: string): string {
  const prefectures = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
    '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
    '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
  ]
  
  const found = prefectures.find(pref => address.includes(pref))
  return found || '不明'
}

// 住所から市区町村を抽出
function extractCity(address: string): string {
  // 市区町村のパターンマッチング
  const patterns = [
    /([\u4e00-\u9faf]+市)/,     // ○○市
    /([\u4e00-\u9faf]+区)/,     // ○○区
    /([\u4e00-\u9faf]+町)/,     // ○○町
    /([\u4e00-\u9faf]+村)/,     // ○○村
  ]
  
  for (const pattern of patterns) {
    const match = address.match(pattern)
    if (match) {
      return match[1]
    }
  }
  
  return '不明'
}

// メールアドレス生成（仮設定）
function generateFacilityEmail(facility: any, facilityType: string): string {
  // 実際の運用では各施設の正しいメールアドレスを設定する必要があります
  // 現在は開発用の仮アドレス
  return `${facilityType}-${facility.id}@example.com`
}

// 全施設タイプのJSONファイルを読み込み
function loadAllFacilityData(): Array<{id: number, name: string, address: string, lat: number, lon: number, facilityType: string}> {
  const facilityTypes = [
    { type: 'asds', file: 'public/asds/facilities.json' },
    { type: 'ccd', file: 'public/ccd/facilities.json' },
    { type: 'pco', file: 'public/pco/facilities.json' },
    { type: 'sept-a', file: 'public/sept-a/facilities.json' },
    { type: 'sept-b', file: 'public/sept-b/facilities.json' },
  ]
  
  const allFacilities: any[] = []
  let globalId = 0 // 全施設で一意のIDを割り当て

  facilityTypes.forEach(({ type, file }) => {
    if (!fs.existsSync(file)) {
      console.warn(`⚠️  ${file} が見つかりません。スキップします。`)
      return
    }

    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'))
      console.log(`📁 ${file}: ${data.length}件読み込み`)
      
      // 各施設に施設タイプとグローバルIDを付与
      const facilitiesWithType = data.map((facility: any) => ({
        ...facility,
        id: globalId++, // 新しい一意IDを割り当て
        originalId: facility.id, // 元のIDを保持
        facilityType: type,
      }))
      
      allFacilities.push(...facilitiesWithType)
    } catch (error) {
      console.error(`❌ ${file} の読み込みエラー:`, error)
    }
  })

  console.log(`\n📊 総施設数: ${allFacilities.length}件`)
  return allFacilities
}

async function migrateFacilities() {
  try {
    console.log('🚀 全施設データ移行を開始...')
    
    // 全施設タイプのJSONファイルを読み込み
    const allFacilitiesData = loadAllFacilityData()
    
    if (allFacilitiesData.length === 0) {
      console.error('❌ 移行対象のデータが見つかりません')
      return
    }
    
    // 既存データクリア（開発時のみ）
    console.log('🧹 既存データをクリア...')
    await prisma.inquiryItem.deleteMany()
    await prisma.inquiry.deleteMany() 
    await prisma.facility.deleteMany()
    
    // データ変換と検証
    console.log('🔄 データ変換中...')
    const facilities = allFacilitiesData.map((f: any, index: number) => {
      // 必須フィールドチェック
      if (f.id === undefined) throw new Error(`施設${index}: IDが不正`)
      if (!f.name) throw new Error(`施設${index}: 名前が不正`)
      if (!f.address) throw new Error(`施設${index}: 住所が不正`)
      if (typeof f.lat !== 'number') throw new Error(`施設${index}: 緯度が不正`)
      if (typeof f.lon !== 'number') throw new Error(`施設${index}: 経度が不正`)
      
      const prefecture = extractPrefecture(f.address)
      const city = extractCity(f.address)
      
      return {
        id: f.id,
        name: f.name,
        address: f.address,
        latitude: f.lat,
        longitude: f.lon,
        facilityType: f.facilityType,
        email: generateFacilityEmail(f, f.facilityType),
        prefecture,
        city,
      }
    })
    
    // バッチ挿入
    console.log('💾 データベースに挿入中...')
    
    // 1件ずつ upsert で安全に挿入
    let insertedCount = 0
    let skippedCount = 0
    
    for (const facility of facilities) {
      try {
        await prisma.facility.upsert({
          where: { id: facility.id },
          update: {}, // 既存データがあっても更新しない
          create: facility
        })
        insertedCount++
      } catch (error) {
        console.warn(`⚠️  施設ID${facility.id}のスキップ: ${error}`)
        skippedCount++
      }
    }
    
    console.log(`✅ 挿入完了: ${insertedCount}件, スキップ: ${skippedCount}件`)
    
    console.log('✅ 全施設データ移行完了！')
    
    // 統計情報表示
    const stats = await prisma.facility.groupBy({
      by: ['prefecture', 'facilityType'],
      _count: { id: true }
    })
    
    const totalCount = await prisma.facility.count()
    
    console.log(`\n📊 移行完了統計:`)
    console.log(`総施設数: ${totalCount}件`)
    
    console.log(`\n🏢 施設タイプ別:`)
    const typeStats = await prisma.facility.groupBy({
      by: ['facilityType'],
      _count: { id: true }
    })
    typeStats.forEach(stat => {
      const typeName = {
        'asds': '放課後等デイサービス',
        'ccd': '障害児相談支援事業所', 
        'pco': 'PCO',
        'sept-a': '就労継続支援A',
        'sept-b': '就労継続支援B'
      }[stat.facilityType] || stat.facilityType
      
      console.log(`  ${typeName}: ${stat._count.id}件`)
    })
    
    console.log(`\n📍 都道府県別（上位5位）:`)
    const prefStats = await prisma.facility.groupBy({
      by: ['prefecture'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    })
    prefStats.slice(0, 5).forEach(stat => {
      console.log(`  ${stat.prefecture}: ${stat._count.id}件`)
    })
    
    // サンプルデータ表示
    const sampleFacilities = await prisma.facility.findMany({
      take: 3,
      select: {
        id: true,
        name: true,
        prefecture: true,
        city: true,
        facilityType: true
      }
    })
    
    console.log(`\n🏢 サンプル施設:`)
    sampleFacilities.forEach(f => {
      console.log(`  ID:${f.id} ${f.name} (${f.prefecture}${f.city}, ${f.facilityType})`)
    })
    
  } catch (error) {
    console.error('❌ 移行エラー:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// スクリプト実行
if (require.main === module) {
  migrateFacilities()
}

// スクリプト実行
if (require.main === module) {
  migrateFacilities()
}