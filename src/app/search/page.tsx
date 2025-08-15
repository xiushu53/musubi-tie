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
import { useCallback, useMemo, useState } from "react";
import { InfoCards } from "@/_components/InfoCards";
import { LocationInput } from "@/_components/LocationInput";
import MapLoader from "@/_components/MapLoader";
import { SearchResultsList } from "@/_components/SearchResultsList";
import { SearchSettings } from "@/_components/SearchSettings";
import { StatusDisplay } from "@/_components/StatusDisplay";
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
import { FACILITY_TYPES } from "@/_settings/visualize-map";
import { type SearchMethod, useGeohashSearch } from "@/hooks/useGeohashSearch";
import type { Facility } from "@/types";
import { formatDistance } from "@/utils/formatDistance";

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface FacilityWithDistance extends Facility {
  distance: number;
}

export default function SearchPage() {
  // State管理
  const [selectedFacilityType, setSelectedFacilityType] = useState("asds");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [address, setAddress] = useState<string>("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(1000);
  const [nameFilter, setNameFilter] = useState<string>("");
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("search");
  const [searchMethod, setSearchMethod] = useState<string>("auto");

  // レスポンシブ用カード開閉状態
  const [cardStates, setCardStates] = useState({
    searchConditions: true, // 検索条件は初期表示
    indexInfo: false, // インデックス情報は折りたたみ
    searchInfo: false, // 検索情報は折りたたみ
    searchResults: true, // 検索結果は初期表示
  });

  // カード開閉のトグル関数
  const toggleCard = useCallback((cardName: keyof typeof cardStates) => {
    setCardStates((prev) => ({
      ...prev,
      [cardName]: !prev[cardName],
    }));
  }, []);

  // 静的Geohashデータを使用した検索Hook
  const {
    searchMethods,
    getRecommendedMethod,
    compareAllMethods,
    getIndexInfo,
    isReady: geohashReady,
    loading: dataLoading,
    error: dataError,
  } = useGeohashSearch(selectedFacilityType); // 引数を施設タイプに変更

  // 現在地取得
  const getCurrentLocation = useCallback(() => {
    setIsGettingLocation(true);
    setLocationError(null);
    setGeocodingError(null);

    if (!navigator.geolocation) {
      setLocationError("このブラウザでは位置情報がサポートされていません");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsGettingLocation(false);
      },
      (error) => {
        let errorMessage = "位置情報の取得に失敗しました";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "位置情報の使用が許可されていません";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "位置情報が利用できません";
            break;
          case error.TIMEOUT:
            errorMessage = "位置情報の取得がタイムアウトしました";
            break;
        }
        setLocationError(errorMessage);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  // 住所から緯度経度を検索
  const handleAddressSearch = useCallback(async () => {
    if (!address) {
      setGeocodingError("住所を入力してください");
      return;
    }
    setIsGeocoding(true);
    setGeocodingError(null);
    setLocationError(null); // 既存のエラーもクリア

    try {
      const response = await fetch(
        `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(
          address
        )}`
      );
      if (!response.ok) {
        throw new Error("ジオコーディングサーバーとの通信に失敗しました");
      }
      const data = await response.json();
      if (data.length === 0 || !data[0].geometry?.coordinates) {
        throw new Error("指定された住所の座標が見つかりませんでした。");
      }
      const [longitude, latitude] = data[0].geometry.coordinates;
      setUserLocation({ latitude, longitude });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "不明なエラーが発生しました";
      setGeocodingError(message);
      setUserLocation(null); // 失敗したら位置情報をクリア
    } finally {
      setIsGeocoding(false);
    }
  }, [address]);

  // 施設検索（静的データ使用）
  const searchResults = useMemo(() => {
    if (!userLocation || !geohashReady)
      return { results: [], method: "", searchTime: 0 };

    const startTime = performance.now();
    let results: FacilityWithDistance[] = [];
    let selectedMethodInfo: SearchMethod | null = null;

    try {
      if (searchMethod === "auto") {
        selectedMethodInfo = getRecommendedMethod(searchRadius);
      } else {
        selectedMethodInfo =
          searchMethods.find((m) => m.name === searchMethod) ||
          searchMethods[0] ||
          null;
      }

      if (selectedMethodInfo) {
        results = selectedMethodInfo.search(
          userLocation.latitude,
          userLocation.longitude,
          searchRadius
        );

        // 名前フィルタ適用
        if (nameFilter) {
          results = results.filter((facility) =>
            facility.name.toLowerCase().includes(nameFilter.toLowerCase())
          );
        }
      }
    } catch (error) {
      console.error("検索エラー:", error);
    }

    const searchTime = performance.now() - startTime;

    return {
      results,
      method: selectedMethodInfo?.description || "検索手法が見つかりません",
      searchTime,
    };
  }, [
    userLocation,
    geohashReady,
    searchRadius,
    nameFilter,
    searchMethod,
    searchMethods,
    getRecommendedMethod,
  ]);

  // 施設選択時の処理
  const handleFacilitySelect = useCallback((facility: Facility) => {
    setSelectedFacility(facility);
    setActiveTab("map");
  }, []);

  // パフォーマンステスト
  const runPerformanceTest = useCallback(() => {
    if (!userLocation || !geohashReady) return;

    compareAllMethods(
      userLocation.latitude,
      userLocation.longitude,
      searchRadius
    );
  }, [userLocation, searchRadius, compareAllMethods, geohashReady]);

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
