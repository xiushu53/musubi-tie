"use client";

import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Filter,
  List,
  Loader2,
  Map as MapIcon,
  MapPin,
  Navigation,
  Search,
  Settings,
  TestTube,
  Zap,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import MapLoader from "@/_components/MapLoader";
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
import { Input } from "@/_components/ui/input";
import { Label } from "@/_components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/_components/ui/select";
import { Slider } from "@/_components/ui/slider";
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

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface FacilityWithDistance extends Facility {
  distance: number;
}

export default function SearchPage() {
  // State管理
  const [selectedFacilityType, setSelectedFacilityType] = useState("asds");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
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
                          <Label className="text-sm font-medium">現在地</Label>
                          <Button
                            onClick={getCurrentLocation}
                            disabled={isGettingLocation}
                            className="w-full mt-1"
                            variant={userLocation ? "outline" : "default"}
                            size="sm"
                          >
                            {isGettingLocation ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                <span className="text-sm">取得中...</span>
                              </>
                            ) : userLocation ? (
                              <>
                                <Navigation className="mr-2 h-4 w-4" />
                                <span className="text-sm">現在地を更新</span>
                              </>
                            ) : (
                              <>
                                <MapPin className="mr-2 h-4 w-4" />
                                <span className="text-sm">現在地を取得</span>
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

                          {userLocation && (
                            <div className="text-xs text-gray-600 mt-2 space-y-1">
                              <div>現在地を取得しました</div>
                              <div className="font-mono text-xs bg-gray-100 p-2 rounded">
                                緯度: {userLocation.latitude.toFixed(6)}
                                <br />
                                経度: {userLocation.longitude.toFixed(6)}
                              </div>
                              {userLocation.accuracy &&
                                userLocation.accuracy < 100 && (
                                  <div>
                                    精度: {Math.round(userLocation.accuracy)}m
                                  </div>
                                )}
                            </div>
                          )}
                        </div>

                        {/* 検索設定 */}
                        {userLocation && geohashReady && (
                          <>
                            <div>
                              <Label className="text-sm font-medium">
                                検索範囲: {formatDistance(searchRadius)}
                              </Label>
                              <Slider
                                value={[searchRadius]}
                                onValueChange={(value) =>
                                  setSearchRadius(value[0])
                                }
                                min={100}
                                max={20000}
                                step={100}
                                className="mt-2"
                              />
                            </div>

                            <div>
                              <Label className="text-sm font-medium">
                                施設名で絞り込み
                              </Label>
                              <Input
                                placeholder="施設名を入力..."
                                value={nameFilter}
                                onChange={(e) => setNameFilter(e.target.value)}
                                className="mt-1 text-sm"
                              />
                            </div>

                            <div>
                              <Label className="text-sm font-medium">
                                検索手法
                              </Label>
                              <Select
                                value={searchMethod}
                                onValueChange={setSearchMethod}
                              >
                                <SelectTrigger className="w-full mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="auto">
                                    <div className="flex items-center gap-2">
                                      <Zap className="h-3 w-3" />
                                      <span className="text-sm">
                                        自動選択（推奨）
                                      </span>
                                    </div>
                                  </SelectItem>
                                  {searchMethods.map((method) => (
                                    <SelectItem
                                      value={method.name}
                                      key={method.name}
                                    >
                                      <div className="flex items-center gap-2">
                                        {method.name.includes("static") && (
                                          <Database className="h-3 w-3" />
                                        )}
                                        <span className="text-sm">
                                          {method.description}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <Button
                              onClick={runPerformanceTest}
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              <TestTube className="mr-2 h-3 w-3" />
                              <span className="text-sm">
                                パフォーマンステスト実行
                              </span>
                            </Button>
                          </>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* 2. 静的Geohashインデックス情報カード */}
                {indexInfo &&
                  (cardStates.indexInfo || window.innerWidth >= 1024) && (
                    <Collapsible
                      open={cardStates.indexInfo}
                      onOpenChange={() => toggleCard("indexInfo")}
                    >
                      <Card className="w-full">
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-gray-50 pb-2">
                            <CardTitle className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                <span>静的Geohashインデックス</span>
                              </div>
                              {cardStates.indexInfo ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </CardTitle>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="text-sm space-y-2 pt-0">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span>データソース:</span>
                                <span className="text-blue-600 font-medium">
                                  {indexInfo.dataSource}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>精度:</span>
                                <span>{indexInfo.precision}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>構築時間:</span>
                                <span>{indexInfo.buildTime}ms</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Hashセル:</span>
                                <span>
                                  {indexInfo.totalCells?.toLocaleString()}
                                </span>
                              </div>
                              {indexInfo.gridCells && (
                                <div className="flex justify-between">
                                  <span>Gridセル:</span>
                                  <span>
                                    {indexInfo.gridCells.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span>平均施設/セル:</span>
                                <span>
                                  {indexInfo.avgFacilitiesPerCell?.toFixed(1)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>メモリ:</span>
                                <span>{indexInfo.memoryEstimate}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>効率:</span>
                                <span className="text-green-600 font-medium">
                                  {indexInfo.efficiency}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  )}

                {/* 3. 検索結果情報カード */}
                {userLocation &&
                  geohashReady &&
                  (cardStates.indexInfo || window.innerWidth >= 1024) && (
                    <Collapsible
                      open={cardStates.searchInfo}
                      onOpenChange={() => toggleCard("searchInfo")}
                    >
                      <Card className="w-full">
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-gray-50 pb-2">
                            <CardTitle className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>検索結果情報</span>
                                {searchResults.searchTime > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {searchResults.searchTime.toFixed(1)}ms
                                  </Badge>
                                )}
                              </div>
                              {cardStates.searchInfo ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </CardTitle>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="text-sm space-y-2 pt-0">
                            <div className="grid grid-cols-1 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span>検索手法:</span>
                                <span className="text-xs font-mono text-right flex-1 ml-2">
                                  {searchResults.method}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>検索時間:</span>
                                <span className="font-bold text-green-600">
                                  {searchResults.searchTime.toFixed(3)}ms
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>検索結果:</span>
                                <span className="font-medium">
                                  {searchResults.results.length}件
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>システム状態:</span>
                                <span>
                                  {dataLoading ? (
                                    <span className="text-yellow-600 text-xs">
                                      🔄読み込み中
                                    </span>
                                  ) : geohashReady ? (
                                    <span className="text-green-600 text-xs">
                                      ✅準備完了
                                    </span>
                                  ) : (
                                    <span className="text-red-600 text-xs">
                                      ❌未準備
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  )}
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
                        {dataLoading ? (
                          <div className="text-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                            <p className="text-sm">
                              静的Geohashデータを読み込んでいます...
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              事前計算済みインデックスで高速検索を準備中
                            </p>
                          </div>
                        ) : dataError ? (
                          <div className="text-center py-8">
                            <Alert variant="destructive">
                              <AlertDescription className="text-sm">
                                データ読み込みエラー: {dataError}
                              </AlertDescription>
                            </Alert>
                            <p className="text-xs text-gray-500 mt-2">
                              `pnpm generate-geohash`
                              を実行してデータを生成してください
                            </p>
                          </div>
                        ) : !userLocation ? (
                          <div className="text-center py-8 text-gray-500">
                            <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">
                              まず現在地を取得してください
                            </p>
                          </div>
                        ) : !geohashReady ? (
                          <div className="text-center py-8 text-gray-500">
                            <Database className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">
                              Geohashインデックスを準備中...
                            </p>
                          </div>
                        ) : searchResults.results.length === 0 ? (
                          <div className="text-center py-8 space-y-4">
                            <div className="text-gray-500">
                              条件に一致する施設が見つかりませんでした
                            </div>
                            <div className="text-xs text-gray-400 space-y-2 max-w-sm mx-auto">
                              <div className="font-medium">現在の検索条件:</div>
                              <div>
                                • 現在地: {userLocation.latitude.toFixed(4)},{" "}
                                {userLocation.longitude.toFixed(4)}
                              </div>
                              <div>
                                • 検索範囲: {formatDistance(searchRadius)}
                              </div>
                              <div>• 検索手法: {searchResults.method}</div>
                              <div>
                                • 施設タイプ:{" "}
                                {
                                  FACILITY_TYPES.find(
                                    (t) => t.value === selectedFacilityType
                                  )?.label
                                }
                              </div>
                              <div className="pt-2 text-blue-600">
                                💡
                                検索範囲を広げるか、別の施設タイプを試してください
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 overflow-y-auto lg:h-[calc(90vh-250px)]">
                            {searchResults.results.map((facility) => (
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
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {formatDistance(facility.distance)}
                                      </Badge>
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        {
                                          FACILITY_TYPES.find(
                                            (t) =>
                                              t.value === selectedFacilityType
                                          )?.label
                                        }
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="text-right ml-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-xs"
                                    >
                                      地図で表示
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
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
