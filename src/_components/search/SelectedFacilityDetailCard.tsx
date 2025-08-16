"use client";

import { Badge } from "@/_components/ui/badge";
import { Button } from "@/_components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/_components/ui/card";
import { FACILITY_TYPES } from "@/_settings/visualize-map";
import { formatDistance } from "@/_utils/formatDistance";
import type { Facility, FacilityWithDistance } from "@/types";

interface SelectedFacilityDetailCardProps {
  facility: Facility;
  allSearchResults: FacilityWithDistance[];
  facilityType: string;
  isSelected: boolean;
  onToggleSelection: () => void;
  onCenterMap: () => void;
  onClearSelection: () => void;
}

export function SelectedFacilityDetailCard({
  facility,
  allSearchResults,
  facilityType,
  isSelected,
  onToggleSelection,
  onCenterMap,
  onClearSelection,
}: SelectedFacilityDetailCardProps) {
  const facilityWithDistance = allSearchResults.find(
    (f) => f.id === facility.id
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📍 選択された施設
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-lg mb-2">{facility.name}</h3>
            <p className="text-gray-600 mb-2">{facility.address}</p>

            {facilityWithDistance && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">
                  距離: {formatDistance(facilityWithDistance.distance)}
                </Badge>
                <Badge variant="secondary">
                  {FACILITY_TYPES.find((t) => t.value === facilityType)?.label}
                </Badge>
                {isSelected && (
                  <Badge variant="default" className="bg-blue-600">
                    ✓ 問い合わせ選択済み
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="text-right space-y-2">
            <Button
              onClick={onToggleSelection}
              size="sm"
              variant={isSelected ? "default" : "outline"}
              className={isSelected ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {isSelected ? "✓ 選択済み" : "問い合わせに追加"}
            </Button>

            <Button onClick={onCenterMap} size="sm" variant="outline">
              地図で中心表示
            </Button>
            <Button onClick={onClearSelection} size="sm" variant="outline">
              選択を解除
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
