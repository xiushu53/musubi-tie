"use client";

import { MapPin } from "lucide-react";
import { Badge } from "@/_components/ui/badge";
import { Button } from "@/_components/ui/button";
import { Card } from "@/_components/ui/card";
import { Label } from "@/_components/ui/label";
import { Textarea } from "@/_components/ui/textarea";
import { FACILITY_TYPES } from "@/_settings/visualize-map";
import type { SelectedFacilityInfo } from "@/_stores/inquiryStore";
import { formatDistance } from "@/_utils/formatDistance";

interface InquiryFacilityCardProps {
  selectedInfo: SelectedFacilityInfo;
  index: number;
  message: string;
  onMessageChange: (facilityId: number, message: string) => void;
  onRemove: (facilityId: number) => void;
}

export function InquiryFacilityCard({
  selectedInfo,
  index,
  message,
  onMessageChange,
  onRemove,
}: InquiryFacilityCardProps) {
  const facility = selectedInfo.facility;
  const facilityType = FACILITY_TYPES.find(
    (t) => t.value === selectedInfo.searchInfo.facilityType
  );

  return (
    <Card key={facility.id} className="p-3 border-l-4 border-l-blue-500">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-500">
              #{index + 1}
            </span>
            <h3 className="font-medium text-sm sm:text-base truncate">
              {facility.name}
            </h3>
          </div>

          <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2">
            {facility.address}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              <MapPin className="h-3 w-3 mr-1" />
              {formatDistance(selectedInfo.distance)}
            </Badge>
            {facilityType && (
              <Badge variant="secondary" className="text-xs">
                {facilityType.label}
              </Badge>
            )}
          </div>

          <div className="mt-2 text-xs text-gray-500">
            📍 {selectedInfo.searchInfo.displayName} から選択
            <span className="ml-2">
              🕐{" "}
              {selectedInfo.selectedAt.toLocaleString("ja-JP", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onRemove(facility.id)}
          className="ml-2 text-xs"
        >
          削除
        </Button>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <Label className="text-xs text-gray-600 mb-1 block">
          この施設への個別メッセージ（任意）
        </Label>
        <Textarea
          placeholder="この施設に特別に伝えたいことがあれば..."
          value={message}
          onChange={(e) => onMessageChange(facility.id, e.target.value)}
          className="text-sm min-h-16"
          rows={2}
        />
      </div>
    </Card>
  );
}
