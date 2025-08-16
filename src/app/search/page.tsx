"use client";

import {
  ChevronDown,
  ChevronUp,
  List,
  Map as MapIcon,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import InquiryStoreDebugger from "@/_components/debug/InquiryStoreDebugger";
import MapLoader from "@/_components/map/MapLoader";
import { InfoCards } from "@/_components/search/InfoCards";
import { InquiryActionBar } from "@/_components/search/InquiryActionBar";
import { SearchCriteriaPanel } from "@/_components/search/SearchCriteriaPanel";
import { SearchPageHeader } from "@/_components/search/SearchPageHeader";
import { SearchResultsList } from "@/_components/search/SearchResultsList";
import { SelectedFacilityDetailCard } from "@/_components/search/SelectedFacilityDetailCard";
import { StatusDisplay } from "@/_components/search/StatusDisplay";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/_components/ui/tabs";
import { useCardState } from "@/_hooks/useCardState";
import { useFacilitySearch } from "@/_hooks/useFacilitySearch";
import { useLocation } from "@/_hooks/useLocation";
import {
  useInquiryActions,
  useSelectedFacilities,
} from "@/_stores/inquiryStore";
import type { Facility } from "@/types";

export default function SearchPage() {
  const router = useRouter();
  // UI State
  const [selectedFacilityType, setSelectedFacilityType] = useState("asds");
  const [searchRadius, setSearchRadius] = useState<number>(1000);
  const [nameFilter, setNameFilter] = useState<string>("");
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("search");
  const [searchMethod, setSearchMethod] = useState<string>("auto");
  const { cardStates, toggleCard } = useCardState({
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

  // Inquiry Store連携
  const inquiryActions = useInquiryActions();
  const selectedFacilities = useSelectedFacilities();
  const selectedCount = inquiryActions.getSelectedCount();

  // ハイドレーション完了チェック
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 検索条件変更時にストアを更新
  useEffect(() => {
    if (userLocation && geohashReady) {
      inquiryActions.updateCurrentSearch(
        userLocation,
        selectedFacilityType,
        searchRadius
      );
    }
  }, [
    userLocation,
    selectedFacilityType,
    searchRadius,
    geohashReady,
    inquiryActions,
  ]);

  // UI Handlers
  const handleFacilitySelect = useCallback((facility: Facility) => {
    setSelectedFacility(facility);
    setActiveTab("map");
  }, []);

  // 問い合わせページへの遷移
  const handleStartInquiry = useCallback(() => {
    if (selectedCount === 0) return;

    inquiryActions.setInquiryMode(true);
    console.log(`${selectedCount}件の施設への問い合わせを開始`);
    router.push("/inquiry/compose");
  }, [selectedCount, inquiryActions, router]);

  const indexInfo = getIndexInfo();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-2 sm:p-4 max-w-7xl">
        <SearchPageHeader
          cardStates={cardStates}
          toggleCard={toggleCard}
          dataLoading={dataLoading}
          dataError={dataError}
          searchResultsCount={searchResults.results.length}
        />

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
              <div className="lg:col-span-1 space-y-4">
                <SearchCriteriaPanel
                  isOpen={cardStates.searchConditions}
                  onToggle={() => toggleCard("searchConditions")}
                  selectedFacilityType={selectedFacilityType}
                  setSelectedFacilityType={setSelectedFacilityType}
                  userLocation={userLocation}
                  isGettingLocation={isGettingLocation}
                  locationError={locationError}
                  getCurrentLocation={getCurrentLocation}
                  address={address}
                  setAddress={setAddress}
                  isGeocoding={isGeocoding}
                  geocodingError={geocodingError}
                  handleAddressSearch={handleAddressSearch}
                  geohashReady={geohashReady}
                  searchRadius={searchRadius}
                  setSearchRadius={setSearchRadius}
                  nameFilter={nameFilter}
                  setNameFilter={setNameFilter}
                  searchMethod={searchMethod}
                  setSearchMethod={setSearchMethod}
                  searchMethods={searchMethods}
                  runPerformanceTest={runPerformanceTest}
                />

                <InfoCards
                  indexInfo={indexInfo}
                  userLocation={userLocation}
                  geohashReady={geohashReady}
                  searchResults={searchResults}
                  cardStates={cardStates}
                  toggleCard={toggleCard}
                />
              </div>

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
                            {isClient && selectedCount > 0 && (
                              <Badge
                                variant="default"
                                className="text-xs bg-blue-600"
                              >
                                {selectedCount}件選択
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
                        {isClient && selectedCount > 0 && (
                          <InquiryActionBar
                            selectedCount={selectedCount}
                            onClearAll={() =>
                              inquiryActions.clearAllSelections()
                            }
                            onStartInquiry={handleStartInquiry}
                          />
                        )}

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
              <SelectedFacilityDetailCard
                facility={selectedFacility}
                allSearchResults={searchResults.results}
                facilityType={selectedFacilityType}
                isSelected={selectedFacilities.has(selectedFacility.id)}
                onToggleSelection={() => {
                  const facilityWithDistance = searchResults.results.find(
                    (f) => f.id === selectedFacility.id
                  );
                  if (facilityWithDistance) {
                    inquiryActions.toggleFacilitySelection(
                      selectedFacility,
                      facilityWithDistance.distance
                    );
                  }
                }}
                onCenterMap={() => {
                  console.log(`地図中心を${selectedFacility.name}に移動`);
                }}
                onClearSelection={() => setSelectedFacility(null)}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {isClient && selectedCount > 0 && (
        <div className="fixed bottom-4 right-4 z-50 sm:hidden">
          <Button
            onClick={handleStartInquiry}
            size="lg"
            className="rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg px-6"
          >
            <span className="font-medium">{selectedCount}件に問い合わせる</span>
          </Button>
        </div>
      )}
      <InquiryStoreDebugger />
    </div>
  );
}
