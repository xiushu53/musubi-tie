// src/app/search/page.tsx
// 静的Geohashデータを使用する高速検索ページ

"use client";

import {
  Clock,
  Database,
  Filter,
  List,
  Loader2,
  Map as MapIcon,
  MapPin,
  Navigation,
  Search,
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

  // 静的Geohashデータを使用した検索Hook
  const {
    searchMethods,
    getRecommendedMethod,
    compareAllMethods,
    getIndexInfo,
    isReady: geohashReady,
    loading: dataLoading,
    error: dataError,
  } = useGeohashSearch(selectedFacilityType);

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
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            高性能施設検索{" "}
            <span className="text-sm font-normal text-blue-600">
              ⚡ 静的Geohash版
            </span>
          </h1>
          <p className="text-gray-600">
            事前計算されたGeohash空間インデックスによる超高速施設検索
          </p>

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
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              検索
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapIcon className="h-4 w-4" />
              地図表示
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* 検索条件パネル */}
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      検索条件
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                              {type.label}
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
                      >
                        {isGettingLocation ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            取得中...
                          </>
                        ) : userLocation ? (
                          <>
                            <Navigation className="mr-2 h-4 w-4" />
                            現在地を更新
                          </>
                        ) : (
                          <>
                            <MapPin className="mr-2 h-4 w-4" />
                            現在地を取得
                          </>
                        )}
                      </Button>

                      {locationError && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertDescription>{locationError}</AlertDescription>
                        </Alert>
                      )}

                      {userLocation && (
                        <div className="text-sm text-gray-600 mt-2 space-y-1">
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
                            onValueChange={(value) => setSearchRadius(value[0])}
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
                            className="mt-1"
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
                                  <Zap className="h-4 w-4" />
                                  自動選択（推奨）
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
                                    {method.description}
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
                          <TestTube className="mr-2 h-4 w-4" />
                          パフォーマンステスト実行
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* 静的Geohashインデックス情報 */}
                {indexInfo && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        静的Geohashインデックス
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span>データソース:</span>
                        <span className="text-blue-600">
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
                        <span>Hashセル数:</span>
                        <span>{indexInfo.totalCells?.toLocaleString()}</span>
                      </div>
                      {indexInfo.gridCells && (
                        <div className="flex justify-between">
                          <span>Gridセル数:</span>
                          <span>{indexInfo.gridCells.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>平均施設/セル:</span>
                        <span>
                          {indexInfo.avgFacilitiesPerCell?.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>メモリ使用量:</span>
                        <span>{indexInfo.memoryEstimate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>検索効率:</span>
                        <span className="text-green-600">
                          {indexInfo.efficiency}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 検索情報 */}
                {userLocation && geohashReady && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        検索結果情報
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span>検索手法:</span>
                        <span className="text-xs font-mono">
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
                        <span>{searchResults.results.length}件</span>
                      </div>
                      <div className="flex justify-between">
                        <span>システム状態:</span>
                        <span>
                          {dataLoading ? (
                            <span className="text-yellow-600">
                              🔄データ読み込み中
                            </span>
                          ) : geohashReady ? (
                            <span className="text-green-600">✅準備完了</span>
                          ) : (
                            <span className="text-red-600">❌未準備</span>
                          )}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* 検索結果リスト */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <List className="h-5 w-5" />
                        検索結果
                        {searchResults.searchTime > 0 && (
                          <Badge variant="outline" className="ml-2">
                            ⚡ {searchResults.searchTime.toFixed(1)}ms
                          </Badge>
                        )}
                      </div>
                      {searchResults.results.length > 0 && (
                        <Badge variant="secondary">
                          {searchResults.results.length}件
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dataLoading ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <p>静的Geohashデータを読み込んでいます...</p>
                        <p className="text-sm text-gray-500 mt-2">
                          事前計算済みインデックスで高速検索を準備中
                        </p>
                      </div>
                    ) : dataError ? (
                      <div className="text-center py-8">
                        <Alert variant="destructive">
                          <AlertDescription>
                            データ読み込みエラー: {dataError}
                          </AlertDescription>
                        </Alert>
                        <p className="text-sm text-gray-500 mt-2">
                          `pnpm generate-geohash`
                          を実行してデータを生成してください
                        </p>
                      </div>
                    ) : !userLocation ? (
                      <div className="text-center py-8 text-gray-500">
                        まず現在地を取得してください
                      </div>
                    ) : !geohashReady ? (
                      <div className="text-center py-8 text-gray-500">
                        Geohashインデックスを準備中...
                      </div>
                    ) : searchResults.results.length === 0 ? (
                      <div className="text-center py-8 space-y-4">
                        <div className="text-gray-500">
                          条件に一致する施設が見つかりませんでした
                        </div>
                        <div className="text-sm text-gray-400 space-y-2">
                          <div>現在の検索条件:</div>
                          <div>
                            • 現在地: {userLocation.latitude.toFixed(4)},{" "}
                            {userLocation.longitude.toFixed(4)}
                          </div>
                          <div>• 検索範囲: {formatDistance(searchRadius)}</div>
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
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {searchResults.results.map((facility) => (
                          <Card
                            key={facility.id}
                            className="p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 border-l-blue-500"
                            onClick={() => handleFacilitySelect(facility)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-medium text-lg mb-1">
                                  {facility.name}
                                </h3>
                                <p className="text-gray-600 text-sm mb-2">
                                  {facility.address}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">
                                    {formatDistance(facility.distance)}
                                  </Badge>
                                  <Badge variant="secondary">
                                    {
                                      FACILITY_TYPES.find(
                                        (t) => t.value === selectedFacilityType
                                      )?.label
                                    }
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <Button size="sm" variant="ghost">
                                  地図で表示
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            <div className="h-[600px] w-full border rounded-lg overflow-hidden">
              <MapLoader
                facilityType={selectedFacilityType}
                maxDistance={5000}
              />
            </div>

            {selectedFacility && (
              <Card>
                <CardHeader>
                  <CardTitle>選択された施設</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-lg mb-2">
                        {selectedFacility.name}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {selectedFacility.address}
                      </p>
                    </div>
                    <div className="text-right">
                      <Button
                        onClick={() => setSelectedFacility(null)}
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
