// src/_components/map/InquiryControlPanel.tsx
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  MessageCircle,
  TrendingUp,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "@/_components/ui/button";
import { Card, CardContent, CardHeader } from "@/_components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/_components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/_components/ui/select";
import type {
  FacilityAnalytics,
  VisualizationMode,
} from "@/_hooks/useInquiryMapLayers";
import { KDE_CONFIG } from "@/_settings/analytics";

interface InquiryControlPanelProps {
  visualizationMode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
  layerVisibility: {
    municipalities: boolean;
    heatmap: boolean;
    icons: boolean;
    labels: boolean;
    origins: boolean;
    originMesh: boolean;
    originPoints: boolean;
    allFacilities: boolean;
  };
  onLayerToggle: React.Dispatch<
    React.SetStateAction<{
      municipalities: boolean;
      heatmap: boolean;
      icons: boolean;
      labels: boolean;
      origins: boolean;
      originMesh: boolean;
      originPoints: boolean;
      allFacilities: boolean;
    }>
  >;
  summaryStats: {
    totalFacilities: number;
    totalInquiries: number;
    totalReplies: number;
    averageReplyRate: number;
    topPerformers: FacilityAnalytics[];
  };
  timeRange: number;
  facilityType: string;
}

export default function InquiryControlPanel({
  visualizationMode,
  onModeChange,
  layerVisibility,
  onLayerToggle,
  summaryStats,
  timeRange,
  facilityType,
}: InquiryControlPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showTopPerformers, setShowTopPerformers] = useState(false);

  const handleLayerToggle = (layerName: keyof typeof layerVisibility) => {
    onLayerToggle((prev) => ({
      ...prev,
      [layerName]: !prev[layerName],
    }));
  };

  const visualizationModes = [
    {
      value: "replyRate" as const,
      label: "返信率",
      icon: MessageCircle,
      description: "施設ごとの返信率を色分け表示",
      color: "text-green-600",
    },
    {
      value: "inquiryCount" as const,
      label: "問い合わせ件数",
      icon: BarChart3,
      description: "受信した問い合わせの総数",
      color: "text-blue-600",
    },
    {
      value: "replyTime" as const,
      label: "返信速度",
      icon: Clock,
      description: "平均返信時間の速さ",
      color: "text-orange-600",
    },
    {
      value: "distance" as const,
      label: "距離分析",
      icon: MapPin,
      description: "問い合わせ元からの平均距離",
      color: "text-purple-600",
    },
  ];

  const layerConfig = [
    {
      key: "municipalities" as const,
      label: "行政区域",
      description: "市区町村の境界線と問い合わせ密度",
    },
    {
      key: "allFacilities" as const, // ← この設定を追加
      label: "全施設位置",
      description: "すべての施設の基本位置（ライトグレー）",
    },
    {
      key: "heatmap" as const,
      label: "施設ヒートマップ",
      description: "選択した指標による施設の色分け表示",
    },
    // {
    //   key: "icons" as const,
    //   label: "施設アイコン",
    //   description: "施設のパフォーマンスアイコン",
    // },
    // {
    //   key: "labels" as const,
    //   label: "数値ラベル",
    //   description: "上位施設の数値表示",
    // },
    {
      key: "originMesh" as const,
      label: "発信地点メッシュ",
      description: `${KDE_CONFIG.MESH_SIZE}mメッシュによる問い合わせ発信密度`,
    },
    // {
    //   key: "originPoints" as const,
    //   label: "発信地点マーカー",
    //   description: "個別の問い合わせ発信地点",
    // },
  ];

  const activeLayersCount =
    Object.values(layerVisibility).filter(Boolean).length;
  const currentMode = visualizationModes.find(
    (mode) => mode.value === visualizationMode
  );

  return (
    <div className="absolute top-4 right-4 z-20 max-w-xs">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="bg-white bg-opacity-95 shadow-xl border backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                aria-label={
                  isOpen
                    ? "コントロールパネルを閉じる"
                    : "コントロールパネルを開く"
                }
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-800">
                      問い合わせ分析
                    </div>
                    <div className="text-xs text-gray-500">
                      {facilityType} | {timeRange}日間
                    </div>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* 可視化モード選択 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-700">
                  📊 可視化モード
                </div>
                <Select value={visualizationMode} onValueChange={onModeChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[500]">
                    {visualizationModes.map((mode) => {
                      const Icon = mode.icon;
                      return (
                        <SelectItem key={mode.value} value={mode.value}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${mode.color}`} />
                            <span>{mode.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {currentMode && (
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {currentMode.description}
                  </p>
                )}
              </div>

              {/* レイヤー表示設定 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-gray-700">
                    🗺️ 表示レイヤー
                  </div>
                  <span className="text-xs text-gray-500">
                    {activeLayersCount}個有効
                  </span>
                </div>

                {layerConfig.map(({ key, label, description }) => (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="flex items-center text-xs cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={layerVisibility[key]}
                        onChange={() => handleLayerToggle(key)}
                        className="mr-2 h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-1"
                      />
                      <span className="font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                        {label}
                      </span>
                    </label>
                    <span className="text-xs text-gray-500 ml-5 leading-relaxed">
                      {description}
                    </span>
                  </div>
                ))}
              </div>

              {/* トップパフォーマー */}
              <div className="space-y-2">
                <Collapsible
                  open={showTopPerformers}
                  onOpenChange={setShowTopPerformers}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full flex items-center justify-between p-2 hover:bg-gray-50"
                    >
                      <span className="text-xs font-medium text-gray-700">
                        🏆 高返信率施設 (TOP5)
                      </span>
                      {showTopPerformers ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-1 mt-2">
                    {summaryStats.topPerformers
                      .slice(0, 5)
                      .map((facility, index) => (
                        <div
                          key={facility.facility.id}
                          className="bg-gray-50 rounded p-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-800 truncate">
                              {index + 1}. {facility.facility.name}
                            </span>
                            <span className="text-green-600 font-bold">
                              {facility.analytics.replyRate}%
                            </span>
                          </div>
                          <div className="text-gray-500 mt-1">
                            {facility.analytics.totalInquiries}件問い合わせ
                          </div>
                        </div>
                      ))}

                    {summaryStats.topPerformers.length === 0 && (
                      <div className="text-xs text-gray-500 p-2">
                        十分なデータがありません
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* 使い方説明 */}
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-800">
                  <div className="font-medium mb-1">💡 統合分析</div>
                  <ul className="space-y-1 text-blue-700">
                    <li>• 施設にマウスオーバーで詳細表示</li>
                    <li>• 発信地点メッシュで需要エリア把握</li>
                    <li>• 可視化モードで異なる指標を表示</li>
                    <li>• レイヤーのON/OFFで表示を調整</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
