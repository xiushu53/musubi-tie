// 静的Geohash実装戦略

// 1. ビルド時データ生成スクリプト
// scripts/generateGeohashData.js
const fs = require('fs');
const path = require('path');

class GeohashDataGenerator {
  static async generateAll() {
    console.log('🏗️ 静的Geohashデータ生成開始');
    
    const facilityTypes = ['asds', 'hospital', 'school', 'park', 'station']; // 実際のタイプ
    
    for (const type of facilityTypes) {
      await this.generateForType(type);
    }
    
    console.log('✅ 全ての施設タイプのGeohashデータ生成完了');
  }
  
  static async generateForType(facilityType) {
    console.log(`📍 ${facilityType} のGeohashデータ生成中...`);
    
    // 1. 元の施設データ読み込み
    const facilitiesPath = `./public/data/${facilityType}/facilities.json`;
    const facilities = JSON.parse(fs.readFileSync(facilitiesPath, 'utf8'));
    
    // 2. Geohash計算
    const facilitiesWithGeohash = facilities.map((facility, index) => {
      const geohash = this.encode(facility.lat, facility.lon, 6);
      const neighborHashes = this.getNeighbors(geohash);
      const gridKey = geohash.substring(0, 5);
      
      if (index % 100 === 0) {
        console.log(`  進捗: ${index}/${facilities.length} (${(index/facilities.length*100).toFixed(1)}%)`);
      }
      
      return {
        ...facility,
        geohash,
        neighborHashes,
        gridKey
      };
    });
    
    // 3. インデックス構築
    const facilityHashMap = {};
    const gridMap = {};
    
    facilitiesWithGeohash.forEach(facility => {
      // ハッシュマップ
      if (!facilityHashMap[facility.geohash]) {
        facilityHashMap[facility.geohash] = [];
      }
      facilityHashMap[facility.geohash].push(facility);
      
      // グリッドマップ
      if (!gridMap[facility.gridKey]) {
        gridMap[facility.gridKey] = [];
      }
      gridMap[facility.gridKey].push(facility);
    });
    
    // 4. 統計情報
    const stats = {
      totalFacilities: facilities.length,
      hashCells: Object.keys(facilityHashMap).length,
      gridCells: Object.keys(gridMap).length,
      avgFacilitiesPerHashCell: facilities.length / Object.keys(facilityHashMap).length,
      avgFacilitiesPerGridCell: facilities.length / Object.keys(gridMap).length,
      generatedAt: new Date().toISOString(),
      precision: 6
    };
    
    // 5. ファイル出力
    const outputData = {
      facilityType,
      facilities: facilitiesWithGeohash,
      facilityHashMap,
      gridMap,
      stats
    };
    
    const outputPath = `./public/data/${facilityType}/facilitiesWithGeohash.json`;
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    
    const fileSizeKB = fs.statSync(outputPath).size / 1024;
    console.log(`✅ ${facilityType}: ${fileSizeKB.toFixed(1)}KB 生成完了`);
    
    return stats;
  }
  
  // Geohash計算ロジック（同じものをNode.js版で実装）
  static encode(lat, lon, precision = 6) {
    // encode実装...
  }
  
  static getNeighbors(geohash) {
    // getNeighbors実装...
  }
}

// 実行
GeohashDataGenerator.generateAll();