"use client";

import { useState } from "react";
import MapLoader from "@/_components/MapLoader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/_components/ui/select";
import { FACILITY_TYPES } from "@/_settings/visualize-map";

export default function FacilitySelectorClient() {
  const [selectedFacilityType, setSelectedFacilityType] = useState("asds");

  return (
    <div className="flex h-screen w-screen flex-col">
      <div className="relative z-10 bg-gray-100 p-4">
        <div className="flex items-center">
          <label htmlFor="facility-select" className="mr-2">
            施設タイプを選択:
          </label>
          <Select
            value={selectedFacilityType}
            onValueChange={(value) => setSelectedFacilityType(value)}
          >
            <SelectTrigger className="w-[280px]" id="facility-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[400]">
              {FACILITY_TYPES.map((type) => (
                <SelectItem value={type.value} key={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex-grow">
        <MapLoader facilityType={selectedFacilityType} />
      </div>
    </div>
  );
}
