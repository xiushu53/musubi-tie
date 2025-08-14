"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MapPin, Search, Loader2, Navigation, Filter, List, Map as MapIcon } from "lucide-react";
import { Button } from "@/_components/ui/button";
import { Input } from "@/_components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/_components/ui/card";
import { Badge } from "@/_components/ui/badge";
import { Alert, AlertDescription } from "@/_components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/_components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/_components/ui/select";
import { Slider } from "@/_components/ui/slider";
import { Switch } from "@/_components/ui/switch";
import { Label } from "@/_components/ui/label";
import MapLoader from "@/_components/MapLoader";
import { useMapData } from "@/hooks/useMapData";
import { FACILITY_TYPES } from "@/_settings/visualize-map";
import type { Facility, GeoJsonData } from "@/types";

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface FacilityWithDistance extends Facility {
  distance: number;
}

// 2点間の距離を計算（Haversine formula）
function calculateDistance(
  lat1: number, lon1: number, 
  lat2: number, lon2: number
): number {
  const R = 6371000; // 地球の半径（メートル）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// メッシュベースの効率的検索（修正版2：Point-in-Polygon + 距離チェック）
function findFacilitiesByMesh(
  userLat: number,
  userLon: number,
  meshData: GeoJsonData | null,
  facilities: Facility[],
  radiusMeters: number
): FacilityWithDistance[] {
  if (!meshData) {
    console.log('❌ メッシュデータが利用できません');
    return [];
  }
  
  console.log(`🔍 メッシュベース検索開始:`, {
    userLocation: [userLat, userLon],
    radius: radiusMeters,
    meshFeatures: meshData.features.length,
    facilities: facilities.length
  });
  
  // 施設IDの型を確認してMapを作成
  const facilityMap = new Map();
  facilities.forEach(f => {
    facilityMap.set(String(f.id), f); // IDを文字列として統一
  });
  
  console.log(`📋 施設Map作成完了: ${facilityMap.size}件, サンプルID型: ${typeof facilities[0]?.id}`);
  
  // メッシュデータのサンプルを確認
  if (meshData.features.length > 0) {
    const sampleMesh = meshData.features[0];
    console.log(`📐 メッシュサンプル:`, {
      properties: sampleMesh.properties,
      facilityIdType: typeof sampleMesh.properties?.nearest_facility_id,
      distanceType: typeof sampleMesh.properties?.distance_m
    });
  }
  
  const candidateFacilities = new Set<string>();
  let checkedMeshes = 0;
  let validMeshes = 0;
  
  // シンプルな方法：全メッシュをチェックして、距離条件に合うものを抽出
  for (const feature of meshData.features) {
    checkedMeshes++;
    
    // メッシュの境界ボックスを計算
    const geometry = feature.geometry;
    if (geometry.type === 'Polygon' && geometry.coordinates[0]) {
      const coords = geometry.coordinates[0];
      
      // 境界ボックス計算
      let minLat = Infinity, maxLat = -Infinity;
      let minLon = Infinity, maxLon = -Infinity;
      
      coords.forEach(coord => {
        const lon = coord[0];
        const lat = coord[1];
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      });
      
      // メッシュの中心点
      const centerLat = (minLat + maxLat) / 2;
      const centerLon = (minLon + maxLon) / 2;
      
      // ユーザーからメッシュ中心までの距離
      const distanceToMeshCenter = calculateDistance(userLat, userLon, centerLat, centerLon);
      
      // メッシュのサイズ（対角線の半分）を考慮した範囲チェック
      const meshSize = calculateDistance(minLat, minLon, maxLat, maxLon) / 2;
      const effectiveDistance = distanceToMeshCenter - meshSize;
      
      // メッシュ内の施設までの距離を加算
      const meshInternalDistance = feature.properties?.distance_m || 0;
      const totalEstimatedDistance = Math.max(0, effectiveDistance) + meshInternalDistance;
      
      console.log(`メッシュ ${checkedMeshes}: 中心距離=${distanceToMeshCenter.toFixed(0)}m, サイズ=${meshSize.toFixed(0)}m, 内部距離=${meshInternalDistance}m, 総計=${totalEstimatedDistance.toFixed(0)}m`);
      
      if (totalEstimatedDistance <= radiusMeters) {
        validMeshes++;
        const facilityId = feature.properties?.nearest_facility_id;
        
        if (facilityId) {
          // IDを文字列として統一
          candidateFacilities.add(String(facilityId));
        }
      }
    }
  }
  
  console.log(`🔍 候補施設数: ${candidateFacilities.size}`);
  
  // 候補施設の実際の距離を計算
  const nearbyFacilities: FacilityWithDistance[] = [];
  for (const facilityId of candidateFacilities) {
    const facility = facilityMap.get(facilityId); // 文字列IDで検索
    if (facility) {
      const actualDistance = calculateDistance(
        userLat, userLon, facility.lat, facility.lon
      );
      
      console.log(`施設 ${facility.name}: 実際の距離=${actualDistance.toFixed(0)}m`);
      
      if (actualDistance <= radiusMeters) {
        nearbyFacilities.push({ ...facility, distance: actualDistance });
      }
    } else {
      console.warn(`⚠️ 施設ID ${facilityId} が見つかりません`);
    }
  }
  
  console.log(`✅ メッシュベース検索完了:`, {
    checkedMeshes,
    validMeshes,
    candidateFacilities: candidateFacilities.size,
    foundFacilities: nearbyFacilities.length
  });
  
  return nearbyFacilities.sort((a, b) => a.distance - b.distance);
}

// 距離フォーマット
function formatDistance(distance: number): string {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
}

export default function SearchPage() {
  // State管理
  const [selectedFacilityType, setSelectedFacilityType] = useState("asds");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(1000);
  const [nameFilter, setNameFilter] = useState<string>("");
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [useMeshSearch, setUseMeshSearch] = useState(false); // デフォルトを全件検索に変更
  const [activeTab, setActiveTab] = useState("search");

  // データ取得
  const { facilities, meshData, loading } = useMapData(selectedFacilityType);

  // 現在地取得
  const getCurrentLocation = useCallback(() => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('このブラウザでは位置情報がサポートされていません');
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
        let errorMessage = '位置情報の取得に失敗しました';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '位置情報の使用が許可されていません';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置情報が利用できません';
            break;
          case error.TIMEOUT:
            errorMessage = '位置情報の取得がタイムアウトしました';
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

  // 施設検索（フォールバック機能付き）
  const nearbyFacilities = useMemo<FacilityWithDistance[]>(() => {
    if (!userLocation || !facilities.length) return [];

    console.log(`🎯 検索開始:`, {
      userLocation: [userLocation.latitude, userLocation.longitude],
      searchRadius,
      useMeshSearch,
      facilitiesCount: facilities.length,
      hasMeshData: !!meshData
    });

    let results: FacilityWithDistance[];

    if (useMeshSearch && meshData) {
      // メッシュベース高速検索
      const startTime = performance.now();
      results = findFacilitiesByMesh(
        userLocation.latitude,
        userLocation.longitude,
        meshData,
        facilities,
        searchRadius
      );
      const meshTime = performance.now() - startTime;
      
      console.log(`⏱️ メッシュ検索時間: ${meshTime.toFixed(2)}ms`);
      
      // フォールバック: メッシュ検索で結果が0件の場合、全件検索を実行
      if (results.length === 0) {
        console.log('⚠️ メッシュ検索で結果が0件のため、全件検索にフォールバック');
        const fallbackStart = performance.now();
        results = facilities
          .map(facility => ({
            ...facility,
            distance: calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              facility.lat,
              facility.lon
            ),
          }))
          .filter(facility => facility.distance <= searchRadius)
          .sort((a, b) => a.distance - b.distance);
        
        const fallbackTime = performance.now() - fallbackStart;
        console.log(`⏱️ フォールバック検索時間: ${fallbackTime.toFixed(2)}ms, 結果: ${results.length}件`);
      }
    } else {
      // 従来の全施設検索
      console.log('🔍 全件検索開始');
      const startTime = performance.now();
      results = facilities
        .map(facility => ({
          ...facility,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            facility.lat,
            facility.lon
          ),
        }))
        .filter(facility => facility.distance <= searchRadius)
        .sort((a, b) => a.distance - b.distance);
      
      const allSearchTime = performance.now() - startTime;
      console.log(`✅ 全件検索完了: ${results.length}件, 時間: ${allSearchTime.toFixed(2)}ms`);
    }

    // 名前フィルタ適用
    if (nameFilter) {
      const beforeFilter = results.length;
      results = results.filter(facility =>
        facility.name.toLowerCase().includes(nameFilter.toLowerCase())
      );
      console.log(`🔤 名前フィルタ適用: ${beforeFilter}件 → ${results.length}件`);
    }

    return results;
  }, [userLocation, facilities, meshData, searchRadius, nameFilter, useMeshSearch]);

  // 施設選択時の処理
  const handleFacilitySelect = useCallback((facility: Facility) => {
    setSelectedFacility(facility);
    setActiveTab("map");
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">施設検索</h1>
          <p className="text-gray-600">現在地周辺の施設を効率的に検索できます</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                            緯度: {userLocation.latitude.toFixed(6)}<br/>
                            経度: {userLocation.longitude.toFixed(6)}
                          </div>
                          {userLocation.accuracy && userLocation.accuracy < 100 && (
                            <div>精度: {Math.round(userLocation.accuracy)}m</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 検索範囲 */}
                    {userLocation && (
                      <>
                        <div>
                          <Label className="text-sm font-medium">
                            検索範囲: {formatDistance(searchRadius)}
                          </Label>
                          <Slider
                            value={[searchRadius]}
                            onValueChange={(value) => setSearchRadius(value[0])}
                            min={100}
                            max={20000} // 最大20kmに拡大
                            step={100}
                            className="mt-2"
                          />
                        </div>

                        {/* 施設名フィルタ */}
                        <div>
                          <Label className="text-sm font-medium">施設名で絞り込み</Label>
                          <Input
                            placeholder="施設名を入力..."
                            value={nameFilter}
                            onChange={(e) => setNameFilter(e.target.value)}
                            className="mt-1"
                          />
                        </div>

                        {/* 高速検索オプション */}
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="mesh-search"
                            checked={useMeshSearch}
                            onCheckedChange={setUseMeshSearch}
                          />
                          <Label htmlFor="mesh-search" className="text-sm">
                            高速検索を使用
                            <div className="text-xs text-gray-500">
                              メッシュベースの効率的検索
                            </div>
                          </Label>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* パフォーマンス情報とデバッグ情報 */}
                {userLocation && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">検索情報</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span>総施設数:</span>
                        <span>{facilities.length.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>メッシュ数:</span>
                        <span>{meshData?.features?.length?.toLocaleString() || 'なし'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>検索方法:</span>
                        <span>{useMeshSearch ? "メッシュベース" : "全件検索"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>検索結果:</span>
                        <span>{nearbyFacilities.length}件</span>
                      </div>
                      
                      {/* デバッグ情報 */}
                      <details className="mt-3 pt-2 border-t">
                        <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                          デバッグ情報
                        </summary>
                        <div className="mt-2 space-y-1 text-xs font-mono bg-gray-50 p-2 rounded">
                          <div>現在地: {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}</div>
                          <div>検索範囲: {searchRadius}m</div>
                          <div>施設データ読み込み: {loading ? '読み込み中' : '完了'}</div>
                          <div>メッシュデータ: {meshData ? '利用可能' : '利用不可'}</div>
                          {facilities.length > 0 && (
                            <div>
                              最初の施設例: {facilities[0].name} 
                              ({facilities[0].lat.toFixed(6)}, {facilities[0].lon.toFixed(6)})
                            </div>
                          )}
                          {nearbyFacilities.length === 0 && facilities.length > 0 && (
                            <div className="text-red-600 mt-2">
                              検索範囲内に施設が見つかりません。<br/>
                              範囲を広げるか、別の場所で試してください。
                            </div>
                          )}
                        </div>
                      </details>
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
                      </div>
                      {nearbyFacilities.length > 0 && (
                        <Badge variant="secondary">
                          {nearbyFacilities.length}件
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <p>データを読み込んでいます...</p>
                      </div>
                    ) : !userLocation ? (
                      <div className="text-center py-8 text-gray-500">
                        まず現在地を取得してください
                      </div>
                    ) : nearbyFacilities.length === 0 ? (
                      <div className="text-center py-8 space-y-4">
                        <div className="text-gray-500">
                          条件に一致する施設が見つかりませんでした
                        </div>
                        {userLocation && facilities.length > 0 && (
                          <div className="text-sm text-gray-400 space-y-2">
                            <div>現在の検索条件:</div>
                            <div>• 現在地: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}</div>
                            <div>• 検索範囲: {formatDistance(searchRadius)}</div>
                            <div>• 施設タイプ: {FACILITY_TYPES.find(t => t.value === selectedFacilityType)?.label}</div>
                            <div>• 総施設数: {facilities.length}件</div>
                            <div className="pt-2 text-blue-600">
                              💡 検索範囲を広げるか、別の施設タイプを試してください
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {nearbyFacilities.map((facility) => (
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
                                    {FACILITY_TYPES.find(t => t.value === selectedFacilityType)?.label}
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
                      <h3 className="font-medium text-lg mb-2">{selectedFacility.name}</h3>
                      <p className="text-gray-600 mb-4">{selectedFacility.address}</p>
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