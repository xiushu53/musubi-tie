// src/_components/search/FacilitySelectorClient.tsx
"use client";

import { BarChart3, MapPin, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import InquiryAnalyticsMap from "@/_components/map/InquiryAnalyticsMap";
import MapLoader from "@/_components/map/MapLoader";
import { Button } from "@/_components/ui/button";
import { Card, CardContent } from "@/_components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/_components/ui/select";
import { Slider } from "@/_components/ui/slider";
import { COLORBAR_SETTINGS, FACILITY_TYPES } from "@/_settings/visualize-map";
import { convertDistanceUnit } from "@/_utils/convertDistansUnit";

type MapMode = "visualization" | "inquiry-analytics";

export default function FacilitySelectorClient() {
  // 基本設定
  const [selectedFacilityType, setSelectedFacilityType] = useState("asds");
  const [maxDistance, setMaxDistance] = useState(COLORBAR_SETTINGS.default);
  const [debouncedMaxDistance, setDebouncedMaxDistance] = useState(maxDistance);

  // 新機能：マップモード切り替え
  const [mapMode, setMapMode] = useState<MapMode>("visualization");

  // 問い合わせ分析設定
  const [timeRange, setTimeRange] = useState(30); // 日数

  // 距離設定のデバウンス処理
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedMaxDistance(maxDistance);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [maxDistance]);

  // 時間範囲オプション
  const timeRangeOptions = [
    { value: 7, label: "過去7日間" },
    { value: 14, label: "過去2週間" },
    { value: 30, label: "過去1ヶ月" },
    { value: 60, label: "過去2ヶ月" },
    { value: 90, label: "過去3ヶ月" },
    { value: 180, label: "過去6ヶ月" },
  ];

  const mapModes = [
    {
      value: "visualization" as const,
      label: "距離分析",
      icon: MapPin,
      description: "施設までの距離を可視化",
      color: "text-blue-600",
    },
    {
      value: "inquiry-analytics" as const,
      label: "問い合わせ分析",
      icon: BarChart3,
      description: "問い合わせの返信率や傾向を分析",
      color: "text-green-600",
    },
  ];

  return (
    <div className="flex h-screen w-screen flex-col">
      {/* コントロールヘッダー */}
      <div className="relative z-10 bg-white shadow-sm border-b">
        <div className="p-4 space-y-4">
          {/* マップモード切り替え */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                分析モード:
              </span>
            </div>
            <div className="flex gap-2">
              {mapModes.map((mode) => {
                const Icon = mode.icon;
                return (
                  <Button
                    key={mode.value}
                    variant={mapMode === mode.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMapMode(mode.value)}
                    className="flex items-center gap-2"
                  >
                    <Icon
                      className={`h-4 w-4 ${mapMode === mode.value ? "text-white" : mode.color}`}
                    />
                    <span>{mode.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 共通設定 */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* 施設タイプ選択 */}
            <div className="flex items-center gap-3">
              <label
                htmlFor="facility-select"
                className="text-sm font-medium text-gray-700 shrink-0"
              >
                施設タイプ:
              </label>
              <Select
                value={selectedFacilityType}
                onValueChange={(value) => setSelectedFacilityType(value)}
              >
                <SelectTrigger className="flex-1" id="facility-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[400] bg-white">
                  {FACILITY_TYPES.map((type) => (
                    <SelectItem value={type.value} key={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 条件設定（モードに応じて切り替え） */}
            {mapMode === "visualization" ? (
              // 距離分析モード
              <div className="flex items-center gap-3">
                <label
                  htmlFor="distance-slider"
                  className="text-sm font-medium text-gray-700 shrink-0"
                >
                  最大距離:
                </label>
                <Slider
                  id="distance-slider"
                  min={COLORBAR_SETTINGS.min}
                  max={COLORBAR_SETTINGS.max}
                  step={COLORBAR_SETTINGS.step}
                  defaultValue={[maxDistance]}
                  onValueChange={(value) => setMaxDistance(value[0])}
                  className="flex-1 max-w-32"
                />
                <span className="text-sm text-gray-600 w-16 text-right">
                  {convertDistanceUnit(maxDistance)}
                </span>
              </div>
            ) : (
              // 問い合わせ分析モード
              <div className="flex items-center gap-3">
                <label
                  htmlFor="time-range-select"
                  className="text-sm font-medium text-gray-700 shrink-0"
                >
                  期間:
                </label>
                <Select
                  value={timeRange.toString()}
                  onValueChange={(value) => setTimeRange(parseInt(value))}
                >
                  <SelectTrigger className="flex-1" id="time-range-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[400] bg-white">
                    {timeRangeOptions.map((option) => (
                      <SelectItem
                        value={option.value.toString()}
                        key={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* モード説明 */}
            <div className="flex items-center">
              <Card className="w-full">
                <CardContent className="p-3">
                  <div className="text-xs text-gray-600">
                    {mapModes.find((m) => m.value === mapMode)?.description}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* マップ表示エリア */}
      <div className="flex-grow relative">
        {mapMode === "visualization" ? (
          // 従来の距離可視化マップ
          <MapLoader
            facilityType={selectedFacilityType}
            maxDistance={debouncedMaxDistance}
            mode="visualization"
          />
        ) : (
          // 問い合わせ分析マップ
          <InquiryAnalyticsMap
            facilityType={selectedFacilityType}
            timeRange={timeRange}
          />
        )}

        {/* モード表示インジケーター */}
        <div className="absolute top-4 left-4 z-30">
          <Card className="bg-white bg-opacity-90 border shadow-sm">
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                {mapMode === "visualization" ? (
                  <MapPin className="h-4 w-4 text-blue-600" />
                ) : (
                  <BarChart3 className="h-4 w-4 text-green-600" />
                )}
                <span className="text-xs font-medium text-gray-700">
                  {mapModes.find((m) => m.value === mapMode)?.label}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
