"use client";

import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { LocationInput } from "@/_components/search/LocationInput";
import { SearchSettings } from "@/_components/search/SearchSettings";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/_components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/_components/ui/collapsible";
import { Label } from "@/_components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/_components/ui/select";
import type { SearchMethod } from "@/_hooks/useFacilitySearch";
import { FACILITY_TYPES } from "@/_settings/visualize-map";
import type { UserLocation } from "@/types";

interface SearchCriteriaPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedFacilityType: string;
  setSelectedFacilityType: (value: string) => void;
  userLocation: UserLocation | null;
  isGettingLocation: boolean;
  locationError: string | null;
  getCurrentLocation: () => void;
  address: string;
  setAddress: (address: string) => void;
  isGeocoding: boolean;
  geocodingError: string | null;
  handleAddressSearch: () => void;
  geohashReady: boolean;
  searchRadius: number;
  setSearchRadius: (radius: number) => void;
  nameFilter: string;
  setNameFilter: (filter: string) => void;
  searchMethod: string;
  setSearchMethod: (method: string) => void;
  searchMethods: SearchMethod[];
  runPerformanceTest: () => void;
}

export function SearchCriteriaPanel({
  isOpen,
  onToggle,
  selectedFacilityType,
  setSelectedFacilityType,
  userLocation,
  isGettingLocation,
  locationError,
  getCurrentLocation,
  address,
  setAddress,
  isGeocoding,
  geocodingError,
  handleAddressSearch,
  geohashReady,
  searchRadius,
  setSearchRadius,
  nameFilter,
  setNameFilter,
  searchMethod,
  setSearchMethod,
  searchMethods,
  runPerformanceTest,
}: SearchCriteriaPanelProps) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className="w-full">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 pb-2">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="sm:text-base text-sm">検索条件</span>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* 施設タイプ選択 */}
            <div>
              <Label className="text-sm font-medium">施設タイプ</Label>
              <Select
                value={selectedFacilityType}
                onValueChange={setSelectedFacilityType}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FACILITY_TYPES.map((type) => (
                    <SelectItem value={type.value} key={type.value}>
                      <span className="text-sm">{type.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 位置情報取得 */}
            <div>
              <Label className="text-sm font-medium">検索地点</Label>
              <LocationInput
                userLocation={userLocation}
                isGettingLocation={isGettingLocation}
                locationError={locationError}
                getCurrentLocation={getCurrentLocation}
                address={address}
                setAddress={setAddress}
                isGeocoding={isGeocoding}
                geocodingError={geocodingError}
                handleAddressSearch={handleAddressSearch}
              />
            </div>

            {/* 検索設定 */}
            {userLocation && geohashReady && (
              <SearchSettings
                searchRadius={searchRadius}
                setSearchRadius={setSearchRadius}
                nameFilter={nameFilter}
                setNameFilter={setNameFilter}
                searchMethod={searchMethod}
                setSearchMethod={setSearchMethod}
                searchMethods={searchMethods}
                runPerformanceTest={runPerformanceTest}
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
