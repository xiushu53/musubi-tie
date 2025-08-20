// src/_settings/inquiry-analytics.ts
import type { VisualizationMode } from "@/_hooks/useInquiryMapLayers";

/**
 * 問い合わせ分析システムの設定
 */

// === レイヤー表示のデフォルト設定 ===
export const DEFAULT_LAYER_VISIBILITY = {
  municipalities: false, // 行政区域
  allFacilities: true, // 全施設位置
  heatmap: true, // 施設ヒートマップ
  icons: false, // 施設アイコン
  labels: true, // 数値ラベル
  originMesh: true, // 発信地点メッシュ
  originPoints: false, // 発信地点マーカー
  origins: false, // 従来の発信地点（後方互換）
};

// === 可視化モードのデフォルト設定 ===
export const DEFAULT_VISUALIZATION_MODE: VisualizationMode = "replyRate";
export const DEFAULT_TIME_RANGE = 30; // 日数

// === KDE設定 ===
export const KDE_CONFIG = {
  MESH_SIZE: 500, // メッシュサイズ（メートル） 250m: 250 / 500m: 500
  BANDWIDTH: 800, // ガウシアンカーネルの帯域幅（メートル） 250m: 500 / 500m: 800
  INFLUENCE_RADIUS: 2500, // 影響半径（メートル） 250m: 2000 / 500m: 2500
  MIN_DENSITY_THRESHOLD: 0.05, // 表示する最小密度閾値 250m: 0.1 / 500m: 0.05
  ENABLE_BY_DEFAULT: true, // デフォルトでKDE有効
} as const;

// === 施設レイヤーの視覚設定 ===
export const FACILITY_LAYER_SETTINGS = {
  // 全施設ベースレイヤー
  BASE_FACILITIES: {
    RADIUS: 80, // ドットサイズ（メートル）
    FILL_COLOR: [180, 180, 180, 120] as [number, number, number, number], // ライトグレー
    LINE_COLOR: [200, 200, 200, 200] as [number, number, number, number], // 境界線色
    LINE_WIDTH: 1, // 境界線幅
  },

  // 問い合わせ施設ヒートマップ
  HEATMAP_FACILITIES: {
    BASE_RADIUS: 100, // 基本サイズ（メートル）
    SIZE_MULTIPLIER: 1.0, // サイズ倍率
    LINE_COLOR: [255, 255, 255, 255] as [number, number, number, number], // 境界線色（白）
    LINE_WIDTH: 2, // 境界線幅
  },

  // 施設アイコン ⚠️
  FACILITY_ICONS: {
    BASE_SIZE: 24, // 基本アイコンサイズ（ピクセル）
    MAX_SIZE: 40, // 最大アイコンサイズ
    SIZE_FACTOR: 2, // 問い合わせ件数による拡大係数
  },
};

// === 発信地点レイヤーの視覚設定 === ⚠️
export const ORIGIN_LAYER_SETTINGS = {
  // KDEヒートマップ
  KDE_HEATMAP: {
    // 境界線設定
    STROKE: {
      ORIGINAL_COLOR: [255, 255, 255, 150] as [number, number, number, number], // 実データの境界線
      INTERPOLATED_COLOR: [255, 255, 255, 30] as [
        number,
        number,
        number,
        number,
      ], // 補間データの境界線
      ORIGINAL_WIDTH: 2, // 実データの境界線幅
      INTERPOLATED_WIDTH: 0.5, // 補間データの境界線幅
    },
  },

  // 山頂マーカー ⚠️
  PEAK_MARKERS: {
    BASE_SIZE: 16, // 基本サイズ（ピクセル）
    MAX_SIZE: 32, // 最大サイズ
    SIZE_FACTOR: 2, // 問い合わせ件数による拡大係数
    ICON_COLOR: "#7C3AED", // マーカー色（紫）
  },
};

// === 時間範囲オプション ===
export const TIME_RANGE_OPTIONS = [
  { value: 7, label: "過去7日間" },
  { value: 14, label: "過去2週間" },
  { value: 30, label: "過去1ヶ月" },
  { value: 180, label: "過去6ヶ月" },
] as const;

// === 統計ラベル設定 ===
export const STATS_LABEL_SETTINGS = {
  MIN_INQUIRIES_FOR_LABEL: 3, // ラベル表示する最小問い合わせ件数
  MAX_LABELS_COUNT: 5, // 表示する最大ラベル数
  FONT_SIZE: 12, // フォントサイズ
  FONT_COLOR: [255, 255, 255, 255] as [number, number, number, number], // 文字色（白）
  OUTLINE_COLOR: [0, 0, 0, 128] as [number, number, number, number], // アウトライン色
  OUTLINE_WIDTH: 2, // アウトライン幅
};

// === 東京エリアの境界設定 ===
export const TOKYO_AREA_BOUNDS = {
  MIN_LAT: 35.5,
  MAX_LAT: 35.9,
  MIN_LON: 139.2,
  MAX_LON: 139.9,
} as const;

// === カラーバー設定 ===
export const COLORBAR_CONFIG = {
  REPLY_RATE: {
    GRADIENT:
      "linear-gradient(to right, #EF4444, #F59E0B, #EAB308, #84CC16, #10B981)",
    LABELS: ["0%", "25%", "50%", "75%", "100%"],
    TITLE: "返信率",
    UNIT: "%",
    DESCRIPTION: "問い合わせに対する返信の割合",
  },
  INQUIRY_COUNT: {
    GRADIENT: "linear-gradient(to right, #E5E7EB, #60A5FA, #3B82F6, #1D4ED8)",
    TITLE: "問い合わせ件数",
    UNIT: "件",
    DESCRIPTION: "受信した問い合わせの総数",
  },
  REPLY_TIME: {
    GRADIENT: "linear-gradient(to right, #10B981, #EAB308, #F59E0B, #EF4444)",
    LABELS: ["< 24h", "24-48h", "48-72h", "72h+"],
    TITLE: "平均返信時間",
    UNIT: "時間",
    DESCRIPTION: "問い合わせから初回返信までの時間",
  },
  DISTANCE: {
    GRADIENT: "linear-gradient(to right, #8B5CF6, #A855F7, #C084FC, #E879F9)",
    TITLE: "平均距離",
    UNIT: "km",
    DESCRIPTION: "問い合わせ元からの平均距離",
  },
} as const;

// === パフォーマンス設定 ===
export const PERFORMANCE_SETTINGS = {
  DEBOUNCE_DELAY: 300, // UI操作のデバウンス時間（ms）
  MAX_FACILITIES_FOR_LABELS: 1000, // ラベル表示する最大施設数
  MAX_MESH_TILES: 10000, // 最大メッシュタイル数
} as const;

// === デバッグ設定 ===
export const DEBUG_SETTINGS = {
  ENABLE_CONSOLE_LOGS: true, // コンソールログ有効化
  ENABLE_PERFORMANCE_LOGS: true, // パフォーマンスログ有効化
  LOG_API_REQUESTS: true, // APIリクエストログ
} as const;
