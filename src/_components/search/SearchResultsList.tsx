"use client";

import { Check, MapPin } from "lucide-react";
import { useCallback } from "react";
import { Badge } from "@/_components/ui/badge";
import { Button } from "@/_components/ui/button";
import { Card } from "@/_components/ui/card";
import { FACILITY_TYPES } from "@/_settings/visualize-map";
import {
  useInquiryActions,
  useSelectedFacilities,
} from "@/_stores/inquiryStore";
import { formatDistance } from "@/_utils/formatDistance";
import type { FacilityWithDistance } from "@/app/search/page";
import type { Facility } from "@/types";
import { Checkbox } from "../ui/checkbox";

interface SearchResultsListProps {
  results: FacilityWithDistance[];
  handleFacilitySelect: (facility: Facility) => void;
  selectedFacilityType: string;
}

export function SearchResultsList({
  results,
  handleFacilitySelect,
  selectedFacilityType,
}: SearchResultsListProps) {
  const selectedFacilities = useSelectedFacilities();
  const actions = useInquiryActions();

  // 施設選択の切り替え
  const handleFacilityToggle = useCallback(
    (facility: FacilityWithDistance, event: React.MouseEvent) => {
      event.stopPropagation(); // カードクリックイベントを阻止
      actions.toggleFacilitySelection(facility, facility.distance);
    },
    [actions]
  );

  // 地図表示用のクリック（既存機能）
  const handleMapView = useCallback(
    (facility: Facility, event: React.MouseEvent) => {
      event.stopPropagation();
      handleFacilitySelect(facility);
    },
    [handleFacilitySelect]
  );

  // 全選択/全解除
  const handleSelectAll = useCallback(() => {
    const allSelected = results.every((facility) =>
      selectedFacilities.has(facility.id)
    );

    if (allSelected) {
      // 全解除：表示中の施設のみ
      results.forEach((facility) => {
        if (selectedFacilities.has(facility.id)) {
          actions.deselectFacility(facility.id);
        }
      });
    } else {
      // 全選択：未選択の施設のみ
      results.forEach((facility) => {
        if (!selectedFacilities.has(facility.id)) {
          actions.selectFacility(facility, facility.distance);
        }
      });
    }
  }, [results, selectedFacilities, actions]);

  // 表示中の施設で選択されているもの
  const displayedSelectedCount = results.filter((facility) =>
    selectedFacilities.has(facility.id)
  ).length;

  const allDisplayedSelected =
    displayedSelectedCount === results.length && results.length > 0;
  const someDisplayedSelected = displayedSelectedCount > 0;

  return (
    <div className="space-y-3">
      {/* 全選択/全解除ヘッダー */}
      {results.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allDisplayedSelected}
              onCheckedChange={handleSelectAll}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <span className="text-sm font-medium">
              {allDisplayedSelected ? "全て選択解除" : "全て選択"}
            </span>
            {someDisplayedSelected && (
              <Badge variant="secondary" className="text-xs">
                {displayedSelectedCount}/{results.length}件選択中
              </Badge>
            )}
          </div>

          {/* 選択数の表示 */}
          <div className="text-xs text-gray-600">
            全体で{selectedFacilities.size}件選択中
          </div>
        </div>
      )}

      {/* 施設リスト */}
      <div className="space-y-3 overflow-y-auto lg:h-[calc(90vh-350px)]">
        {results.map((facility) => {
          const isSelected = selectedFacilities.has(facility.id);
          const selectedInfo = selectedFacilities.get(facility.id);

          return (
            <Card
              key={facility.id}
              className={`
                p-3 sm:p-4 transition-all duration-200 border-l-4
                ${
                  isSelected
                    ? "bg-blue-50 border-l-blue-500 ring-2 ring-blue-200"
                    : "hover:bg-gray-50 border-l-gray-300 hover:border-l-blue-400"
                }
              `}
            >
              <div className="flex items-start gap-3">
                {/* チェックボックス */}
                <div className="mt-1">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(_, event) =>
                      handleFacilityToggle(facility, event as React.MouseEvent)
                    }
                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                </div>

                {/* 施設情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm sm:text-base mb-1 truncate">
                        {facility.name}
                      </h3>
                      <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2">
                        {facility.address}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {formatDistance(facility.distance)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {
                            FACILITY_TYPES.find(
                              (t) => t.value === selectedFacilityType
                            )?.label
                          }
                        </Badge>

                        {/* 選択状態の表示 */}
                        {isSelected && (
                          <Badge
                            variant="default"
                            className="text-xs bg-blue-600"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            選択中
                          </Badge>
                        )}
                      </div>

                      {/* 選択時の詳細情報表示 */}
                      {isSelected && selectedInfo && (
                        <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-800">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {selectedInfo.searchInfo.displayName}から
                              {formatDistance(selectedInfo.distance)}
                            </span>
                          </div>
                          <div className="text-blue-600 mt-1">
                            選択日時:{" "}
                            {selectedInfo.selectedAt.toLocaleString("ja-JP")}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 右側のボタン */}
                    <div className="flex flex-col gap-2 ml-2">
                      <Button
                        onClick={(event) => handleMapView(facility, event)}
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                      >
                        地図で表示
                      </Button>

                      {/* 選択/選択解除ボタン */}
                      <Button
                        onClick={(event) =>
                          handleFacilityToggle(facility, event)
                        }
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        className={`text-xs ${
                          isSelected
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "hover:bg-blue-50 hover:border-blue-300"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            選択解除
                          </>
                        ) : (
                          "選択"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 選択数が多い場合の注意 */}
      {selectedFacilities.size > 10 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-amber-800 text-sm">
            <span>⚠️</span>
            <span>
              {selectedFacilities.size}件の施設を選択中です。
              問い合わせ送信には時間がかかる場合があります。
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
