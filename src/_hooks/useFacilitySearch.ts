import { useCallback, useMemo } from "react";
import { type SearchMethod, useGeohashSearch } from "@/_hooks/useGeohashSearch";
import type { FacilityWithDistance, UserLocation } from "@/app/search/page";

export function useFacilitySearch(
  selectedFacilityType: string,
  userLocation: UserLocation | null,
  searchRadius: number,
  nameFilter: string,
  searchMethod: string
) {
  const {
    searchMethods,
    getRecommendedMethod,
    compareAllMethods,
    getIndexInfo,
    isReady: geohashReady,
    loading: dataLoading,
    error: dataError,
  } = useGeohashSearch(selectedFacilityType);

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

  const runPerformanceTest = useCallback(() => {
    if (!userLocation || !geohashReady) return;
    compareAllMethods(
      userLocation.latitude,
      userLocation.longitude,
      searchRadius
    );
  }, [userLocation, searchRadius, geohashReady, compareAllMethods]);

  return {
    searchResults,
    searchMethods,
    getIndexInfo,
    geohashReady,
    dataLoading,
    dataError,
    runPerformanceTest,
  };
}
