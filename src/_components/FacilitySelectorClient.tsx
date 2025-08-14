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
              <SelectItem value="asds">放課後等デイサービス</SelectItem>
              <SelectItem value="sept-a">就労継続支援A</SelectItem>
              <SelectItem value="sept-b">就労継続支援B</SelectItem>
              <SelectItem value="pco">計画相談事業所</SelectItem>
              <SelectItem value="ccd">障害児相談支援事業所</SelectItem>
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
