"use client";

import { Database, Loader2, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/_components/ui/alert";
import { FACILITY_TYPES } from "@/_settings/visualize-map";
import type { UserLocation } from "@/app/search/page";
import { formatDistance } from "@/utils/formatDistance";

interface StatusDisplayProps {
  dataLoading: boolean;
  dataError: string | null;
  userLocation: UserLocation | null;
  geohashReady: boolean;
  resultsLength: number;
  searchRadius: number;
  method: string;
  selectedFacilityType: string;
}

export function StatusDisplay({
  dataLoading,
  dataError,
  userLocation,
  geohashReady,
  resultsLength,
  searchRadius,
  method,
  selectedFacilityType,
}: StatusDisplayProps) {
  if (dataLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-sm">静的Geohashデータを読み込んでいます...</p>
        <p className="text-xs text-gray-500 mt-2">
          事前計算済みインデックスで高速検索を準備中
        </p>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="text-center py-8">
        <Alert variant="destructive">
          <AlertDescription className="text-sm">
            データ読み込みエラー: {dataError}
          </AlertDescription>
        </Alert>
        <p className="text-xs text-gray-500 mt-2">
          `pnpm generate-geohash` を実行してデータを生成してください
        </p>
      </div>
    );
  }

  if (!userLocation) {
    return (
      <div className="text-center py-8 text-gray-500">
        <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">まず検索中心を指定してください</p>
      </div>
    );
  }

  if (!geohashReady) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">Geohashインデックスを準備中...</p>
      </div>
    );
  }

  if (resultsLength === 0) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="text-gray-500">
          条件に一致する施設が見つかりませんでした
        </div>
        <div className="text-xs text-gray-400 space-y-2 max-w-sm mx-auto">
          <div className="font-medium">現在の検索条件:</div>
          <div>
            • 現在地: {userLocation.latitude.toFixed(4)},{" "}
            {userLocation.longitude.toFixed(4)}
          </div>
          <div>• 検索範囲: {formatDistance(searchRadius)}</div>
          <div>• 検索手法: {method}</div>
          <div>
            • 施設タイプ:{" "}
            {
              FACILITY_TYPES.find((t) => t.value === selectedFacilityType)
                ?.label
            }
          </div>
          <div className="pt-2 text-blue-600">
            💡 検索範囲を広げるか、別の施設タイプを試してください
          </div>
        </div>
      </div>
    );
  }

  return null;
}
