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
import { Slider } from "@/_components/ui/slider";
import { COLORBAR_SETTINGS, FACILITY_TYPES } from "@/_settings/visualize-map";

export default function FacilitySelectorClient() {
  const [selectedFacilityType, setSelectedFacilityType] = useState("asds");
  const [maxDistance, setMaxDistance] = useState(COLORBAR_SETTINGS.default);

  return (
    <div className="flex h-screen w-screen flex-col">
      <div className="relative z-10 grid gap-4 bg-gray-100 p-4">
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
        <div className="flex items-center">
          <label htmlFor="distance-slider" className="mr-2 shrink-0">
            最大距離:
          </label>
          <Slider
            id="distance-slider"
            min={COLORBAR_SETTINGS.min}
            max={COLORBAR_SETTINGS.max}
            step={COLORBAR_SETTINGS.step}
            defaultValue={[maxDistance]}
            onValueChange={(value) => setMaxDistance(value[0])}
            className="w-64"
          />
          <span className="ml-4 w-24 text-right">{maxDistance}m</span>
        </div>
      </div>
      <div className="flex-grow">
        <MapLoader
          facilityType={selectedFacilityType}
          maxDistance={maxDistance}
        />
      </div>
    </div>
  );
}
