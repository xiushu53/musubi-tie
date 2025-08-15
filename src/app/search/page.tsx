"use client";

import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Database,
  Filter,
  List,
  Map as MapIcon,
  Search,
  Settings,
} from "lucide-react";
import { useCallback, useState } from "react";
import MapLoader from "@/_components/map/MapLoader";
import { InfoCards } from "@/_components/search/InfoCards";
import { LocationInput } from "@/_components/search/LocationInput";
import { SearchResultsList } from "@/_components/search/SearchResultsList";
import { SearchSettings } from "@/_components/search/SearchSettings";
import { StatusDisplay } from "@/_components/search/StatusDisplay";
import { Alert, AlertDescription } from "@/_components/ui/alert";
import { Badge } from "@/_components/ui/badge";
import { Button } from "@/_components/ui/button";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/_components/ui/tabs";
import { useFacilitySearch } from "@/_hooks/useFacilitySearch";
import { useLocation } from "@/_hooks/useLocation";
import { FACILITY_TYPES } from "@/_settings/visualize-map";
import { formatDistance } from "@/_utils/formatDistance";
import type { Facility } from "@/types";

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface FacilityWithDistance extends Facility {
  distance: number;
}

export default function SearchPage() {
  // UI State
  const [selectedFacilityType, setSelectedFacilityType] = useState("asds");
  const [searchRadius, setSearchRadius] = useState<number>(1000);
  const [nameFilter, setNameFilter] = useState<string>("");
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("search");
  const [searchMethod, setSearchMethod] = useState<string>("auto");
  const [cardStates, setCardStates] = useState({
    searchConditions: true, // 検索条件は初期表示
    indexInfo: false, // インデックス情報は折りたたみ
    searchInfo: false, // 検索情報は折りたたみ
    searchResults: true, // 検索結果は初期表示
  });

  // Custom Hooks
  const {
    userLocation,
    isGettingLocation,
    locationError,
    getCurrentLocation,
    address,
    setAddress,
    isGeocoding,
    geocodingError,
    handleAddressSearch,
  } = useLocation();

  const {
    searchResults,
    searchMethods,
    getIndexInfo,
    geohashReady,
    dataLoading,
    dataError,
    runPerformanceTest,
  } = useFacilitySearch(
    selectedFacilityType,
    userLocation,
    searchRadius,
    nameFilter,
    searchMethod
  );

  // UI Handlers
  const toggleCard = useCallback((cardName: keyof typeof cardStates) => {
    setCardStates((prev) => ({
      ...prev,
      [cardName]: !prev[cardName],
    }));
  }, []);

  const handleFacilitySelect = useCallback((facility: Facility) => {
    setSelectedFacility(facility);
    setActiveTab("map");
  }, []);

  const indexInfo = getIndexInfo();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-2 sm:p-4 max-w-7xl">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            高性能施設検索{" "}
            <span className="text-xs sm:text-sm font-normal text-blue-600">
              ⚡ 静的Geohash版
            </span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            事前計算されたGeohash空間インデックスによる超高速施設検索
          </p>

          {/* スマホ用クイックアクセスボタン */}
          <div className="mt-4 flex gap-2 sm:hidden">
            <Button
              size="sm"
              variant={cardStates.searchConditions ? "default" : "outline"}
              onClick={() => toggleCard("searchConditions")}
              className="flex-1"
            >
              <Settings className="h-3 w-3 mr-1" />
              検索条件
            </Button>
            <Button
              size="sm"
              variant={cardStates.searchResults ? "default" : "outline"}
              onClick={() => toggleCard("searchResults")}
              className="flex-1"
            >
              <List className="h-3 w-3 mr-1" />
              結果 ({searchResults.results.length})
            </Button>
            <Button
              size="sm"
              variant={cardStates.indexInfo ? "default" : "outline"}
              onClick={() => toggleCard("indexInfo")}
              className="flex-1"
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              詳細
            </Button>
          </div>

          {/* データ読み込み状況 */}
          {dataLoading && (
            <Alert className="mt-4">
              <Database className="h-4 w-4" />
              <AlertDescription>Geohashデータを読み込み中...</AlertDescription>
            </Alert>
          )}

          {dataError && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                データ読み込みエラー: {dataError}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4 sm:space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="search"
              className="flex items-center gap-1 sm:gap-2"
            >
              <Search className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-sm sm:text-base">検索</span>
            </TabsTrigger>
            <TabsTrigger
              value="map"
              className="flex items-center gap-1 sm:gap-2"
            >
              <MapIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-sm sm:text-base">地図表示</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* 検索条件パネル - レスポンシブ対応 */}
              <div className="lg:col-span-1 space-y-4">
                {/* 1. 検索条件カード */}
                <Collapsible
                  open={cardStates.searchConditions}
                  onOpenChange={() => toggleCard("searchConditions")}
                >
                  <Card className="w-full">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50 pb-2">
                        <CardTitle className="flex items-center justify-between text-base">
                          <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            <span className="sm:text-base text-sm">
                              検索条件
                            </span>
                          </div>
                          {cardStates.searchConditions ? (
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
                          <Label className="text-sm font-medium">
                            施設タイプ
                          </Label>
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
                          <Label className="text-sm font-medium">
                            検索中心
                          </Label>
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

                <InfoCards
                  indexInfo={indexInfo}
                  userLocation={userLocation}
                  geohashReady={geohashReady}
                  searchResults={searchResults}
                  cardStates={cardStates}
                  toggleCard={toggleCard}
                />
              </div>

              {/* 検索結果リスト - レスポンシブ対応 */}
              <div className="lg:col-span-2">
                <Collapsible
                  open={cardStates.searchResults}
                  onOpenChange={() => toggleCard("searchResults")}
                >
                  <Card className="w-full">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <List className="h-5 w-5" />
                            <span className="sm:text-base text-sm">
                              検索結果
                            </span>
                            {searchResults.searchTime > 0 && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                ⚡ {searchResults.searchTime.toFixed(1)}ms
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {searchResults.results.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {searchResults.results.length}件
                              </Badge>
                            )}
                            {cardStates.searchResults ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <StatusDisplay
                          dataLoading={dataLoading}
                          dataError={dataError}
                          userLocation={userLocation}
                          geohashReady={geohashReady}
                          resultsLength={searchResults.results.length}
                          searchRadius={searchRadius}
                          method={searchResults.method}
                          selectedFacilityType={selectedFacilityType}
                        />
                        {searchResults.results.length > 0 && (
                          <SearchResultsList
                            results={searchResults.results}
                            handleFacilitySelect={handleFacilitySelect}
                            selectedFacilityType={selectedFacilityType}
                          />
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            <div className="h-[600px] w-full border rounded-lg overflow-hidden">
              <MapLoader
                mode="search"
                searchResults={searchResults.results}
                userLocation={userLocation ?? undefined}
                selectedFacility={selectedFacility ?? undefined}
                onFacilitySelect={handleFacilitySelect}
                searchRadius={searchRadius}
                facilityType={selectedFacilityType}
              />
            </div>

            {/* 地図操作説明 */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <span>🖱️ 施設をクリックで詳細表示</span>
                    <span>📍 青いマーカーが現在地</span>
                    <span>🔵 青い円が検索範囲</span>
                  </div>
                  {searchResults.results.length > 0 && (
                    <span className="text-green-600 font-medium">
                      {searchResults.results.length}件の施設を表示中
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedFacility && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📍 選択された施設
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-lg mb-2">
                        {selectedFacility.name}
                      </h3>
                      <p className="text-gray-600 mb-2">
                        {selectedFacility.address}
                      </p>

                      {/* 選択施設の距離情報 */}
                      {searchResults.results.find(
                        (f) => f.id === selectedFacility.id
                      ) && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">
                            距離:{" "}
                            {formatDistance(
                              searchResults.results.find(
                                (f) => f.id === selectedFacility.id
                              )?.distance || 0
                            )}
                          </Badge>
                          <Badge variant="secondary">
                            {
                              FACILITY_TYPES.find(
                                (t) => t.value === selectedFacilityType
                              )?.label
                            }
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="text-right space-y-2">
                      <Button
                        onClick={() => {
                          // 地図を選択施設中心に移動（オプション機能）
                          console.log(
                            `地図中心を${selectedFacility.name}に移動`
                          );
                        }}
                        size="sm"
                        variant="outline"
                      >
                        地図で中心表示
                      </Button>
                      <Button
                        onClick={() => setSelectedFacility(null)}
                        size="sm"
                        variant="outline"
                      >
                        選択を解除
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
