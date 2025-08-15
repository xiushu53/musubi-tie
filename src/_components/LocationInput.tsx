"use client";

import { Loader2, MapPin, Navigation, Search } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Alert, AlertDescription } from "@/_components/ui/alert";
import { Button } from "@/_components/ui/button";
import { Input } from "@/_components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/_components/ui/tabs";
import type { UserLocation } from "@/app/search/page";

interface LocationInputProps {
  userLocation: UserLocation | null;
  isGettingLocation: boolean;
  locationError: string | null;
  getCurrentLocation: () => void;
  address: string;
  setAddress: Dispatch<SetStateAction<string>>;
  isGeocoding: boolean;
  geocodingError: string | null;
  handleAddressSearch: () => void;
}

export function LocationInput({
  userLocation,
  isGettingLocation,
  locationError,
  getCurrentLocation,
  address,
  setAddress,
  isGeocoding,
  geocodingError,
  handleAddressSearch,
}: LocationInputProps) {
  return (
    <>
      <Tabs defaultValue="currentLocation" className="w-full mt-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="currentLocation">
            <Navigation className="mr-1 h-3 w-3" />
            現在地
          </TabsTrigger>
          <TabsTrigger value="address">
            <Search className="mr-1 h-3 w-3" />
            住所入力
          </TabsTrigger>
        </TabsList>
        <TabsContent value="currentLocation" className="pt-2">
          <Button
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="w-full"
            variant="outline"
            size="sm"
          >
            {isGettingLocation ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="text-sm">取得中...</span>
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                <span className="text-sm">
                  {userLocation ? "現在地を再取得" : "現在地を取得"}
                </span>
              </>
            )}
          </Button>
          {locationError && (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription className="text-sm">
                {locationError}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        <TabsContent value="address" className="pt-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="住所や場所名を入力..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isGeocoding}
                className="text-sm"
              />
              <Button
                onClick={handleAddressSearch}
                disabled={isGeocoding || !address}
                size="sm"
                className="px-3"
              >
                {isGeocoding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {geocodingError && (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription className="text-sm">
                  {geocodingError}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {userLocation && (
        <div className="text-xs text-gray-600 mt-2 space-y-1">
          <div>検索中心地:</div>
          <div className="font-mono text-xs bg-gray-100 p-2 rounded">
            緯度: {userLocation.latitude.toFixed(6)}
            <br />
            経度: {userLocation.longitude.toFixed(6)}
          </div>
          {userLocation.accuracy && userLocation.accuracy < 100 && (
            <div>精度: {Math.round(userLocation.accuracy)}m</div>
          )}
        </div>
      )}
    </>
  );
}
