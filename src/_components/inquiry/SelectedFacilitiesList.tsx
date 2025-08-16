"use client";

import { Building } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/_components/ui/card";
import type { SelectedFacilityInfo } from "@/_stores/inquiryStore";
import { InquiryFacilityCard } from "./InquiryFacilityCard";

interface SelectedFacilitiesListProps {
  selectedFacilities: SelectedFacilityInfo[];
  facilityMessages: Record<number, string>;
  onFacilityMessageChange: (facilityId: number, message: string) => void;
  onRemoveFacility: (facilityId: number) => void;
}

export function SelectedFacilitiesList({
  selectedFacilities,
  facilityMessages,
  onFacilityMessageChange,
  onRemoveFacility,
}: SelectedFacilitiesListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          選択施設一覧 ({selectedFacilities.length}件)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {selectedFacilities.map((selectedInfo, index) => (
            <InquiryFacilityCard
              key={selectedInfo.facility.id}
              selectedInfo={selectedInfo}
              index={index}
              message={facilityMessages[selectedInfo.facility.id] || ""}
              onMessageChange={onFacilityMessageChange}
              onRemove={onRemoveFacility}
            />
          ))}

          {selectedFacilities.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Building className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>選択された施設がありません</p>
              <p className="text-sm">検索ページで施設を選択してください</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
