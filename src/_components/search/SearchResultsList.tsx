"use client";

import { Badge } from "@/_components/ui/badge";
import { Button } from "@/_components/ui/button";
import { Card } from "@/_components/ui/card";
import { FACILITY_TYPES } from "@/_settings/visualize-map";
import { formatDistance } from "@/_utils/formatDistance";
import type { FacilityWithDistance } from "@/app/search/page";
import type { Facility } from "@/types";

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
  return (
    <div className="space-y-3 overflow-y-auto lg:h-[calc(90vh-250px)]">
      {results.map((facility) => (
        <Card
          key={facility.id}
          className="p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 border-l-blue-500"
          onClick={() => handleFacilitySelect(facility)}
        >
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
                    FACILITY_TYPES.find((t) => t.value === selectedFacilityType)
                      ?.label
                  }
                </Badge>
              </div>
            </div>
            <div className="text-right ml-2">
              <Button size="sm" variant="ghost" className="text-xs">
                地図で表示
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
