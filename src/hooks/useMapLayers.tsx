"use client";

import type { Layer } from "@deck.gl/core";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { Feature, GeoJsonProperties, Geometry } from "geojson";
import { useCallback } from "react";
import { MAP_SETTINGS } from "@/_settings/visualize-map";
import type { Facility } from "@/types";

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface FacilityWithDistance extends Facility {
  distance: number;
}

/**
 * 地図レイヤー作成用Hook
 */
export function useMapLayers() {
  // 距離に応じた色計算（可視化用）
  const getVisualizationColor = useCallback(
    (
      distance: number,
      maxDistance: number
    ): [number, number, number, number] => {
      const max = maxDistance;
      const min = 0;
      const d = Math.max(min, Math.min(distance, max));
      const ratio = (d - min) / (max - min);

      if (ratio < 0.5) {
        // Blue to Yellow
        const r = Math.floor(255 * (ratio * 2));
        const g = Math.floor(255 * (ratio * 2));
        const b = Math.floor(255 * (1 - ratio * 2));
        return [r, g, b, Math.floor(255 * (MAP_SETTINGS?.opacity ?? 0.4))];
      } else {
        // Yellow to Red
        const r = 255;
        const g = Math.floor(255 * (1 - (ratio - 0.5) * 2));
        const b = 0;
        return [r, g, b, Math.floor(255 * (MAP_SETTINGS?.opacity ?? 0.4))];
      }
    },
    []
  );

  // 検索結果用の色計算（シンプル版）
  const getSearchResultColor = useCallback(
    (
      distance: number,
      searchRadius: number
    ): [number, number, number, number] => {
      const ratio = Math.min(distance / searchRadius, 1);

      if (ratio < 0.5) {
        // 近い: 緑 → 黄
        const r = Math.floor(255 * (ratio * 2));
        const g = 255;
        const b = 0;
        return [r, g, b, 220];
      } else {
        // 遠い: 黄 → 赤
        const r = 255;
        const g = Math.floor(255 * (1 - (ratio - 0.5) * 2));
        const b = 0;
        return [r, g, b, 220];
      }
    },
    []
  );

  /**
   * 行政区境界レイヤー
   */
  const createMunicipalitiesLayer = useCallback(
    (data: any, visible: boolean = true): Layer | null => {
      if (!data || !visible) return null;

      return new GeoJsonLayer({
        id: "municipalities-layer",
        data,
        filled: false,
        stroked: true,
        getLineColor: [80, 80, 80, 200],
        getLineWidth: 64,
        lineDashArray: [5, 5],
        pickable: true,
      });
    },
    []
  );

  /**
   * メッシュレイヤー（可視化用）
   */
  const createMeshLayer = useCallback(
    (data: any, maxDistance: number, visible: boolean = true): Layer | null => {
      if (!data || !visible) return null;

      return new GeoJsonLayer({
        id: "mesh-layer",
        data,
        filled: true,
        stroked: false,
        getFillColor: (feature: Feature<Geometry, GeoJsonProperties>) => {
          const distance = feature.properties?.distance_m || 0;
          return getVisualizationColor(distance, maxDistance);
        },
        getLineColor: [255, 255, 255, 0],
        getLineWidth: 0,
        pickable: true,
        updateTriggers: {
          getFillColor: [maxDistance],
        },
      });
    },
    [getVisualizationColor]
  );

  /**
   * ボロノイレイヤー（可視化用）
   */
  const createVoronoiLayer = useCallback(
    (data: any, maxDistance: number, visible: boolean = true): Layer | null => {
      if (!data || !visible) return null;

      return new GeoJsonLayer({
        id: "voronoi-layer",
        data,
        filled: true,
        stroked: true,
        getFillColor: (feature: Feature<Geometry, GeoJsonProperties>) => {
          const distance = feature.properties?.distance || 0;
          const color = getVisualizationColor(distance, maxDistance);
          return [color[0], color[1], color[2], 32]; // 半透明
        },
        getLineColor: [255, 255, 255, 255],
        getLineWidth: 64,
        pickable: true,
        updateTriggers: {
          getFillColor: [maxDistance],
        },
      });
    },
    [getVisualizationColor]
  );

  /**
   * 施設マーカーレイヤー（可視化用）
   */
  const createVisualizationFacilitiesLayer = useCallback(
    (facilities: Facility[], visible: boolean = true): Layer | null => {
      if (!facilities.length || !visible) return null;

      return new ScatterplotLayer<Facility>({
        id: "visualization-facilities-layer",
        data: facilities,
        getPosition: (d: Facility) => [d.lon, d.lat],
        getRadius: 50,
        getFillColor: [58, 58, 58, 255],
        getLineColor: [255, 255, 255, 255],
        getLineWidth: 10,
        radiusUnits: "meters",
        pickable: true,
        stroked: true,
        filled: true,
      });
    },
    []
  );

  /**
   * 検索結果施設レイヤー
   */
  const createSearchFacilitiesLayer = useCallback(
    (
      facilities: FacilityWithDistance[],
      selectedFacilityId?: number,
      searchRadius: number = 1000
    ): Layer | null => {
      if (!facilities.length) return null;

      return new ScatterplotLayer<FacilityWithDistance>({
        id: "search-facilities-layer",
        data: facilities,
        getPosition: (d: FacilityWithDistance) => [d.lon, d.lat],
        getRadius: (d: FacilityWithDistance) =>
          selectedFacilityId === d.id ? 120 : 80,
        getFillColor: (d: FacilityWithDistance) =>
          selectedFacilityId === d.id
            ? [255, 107, 107, 255] // 選択時は赤
            : getSearchResultColor(d.distance, searchRadius),
        getLineColor: [255, 255, 255, 255],
        getLineWidth: 3,
        radiusUnits: "meters",
        pickable: true,
        stroked: true,
        filled: true,
        updateTriggers: {
          getRadius: [selectedFacilityId],
          getFillColor: [selectedFacilityId, searchRadius],
        },
      });
    },
    [getSearchResultColor]
  );

  /**
   * 現在地マーカーレイヤー
   */
  const createUserLocationLayer = useCallback(
    (userLocation: UserLocation): Layer => {
      return new ScatterplotLayer({
        id: "user-location-layer",
        data: [userLocation],
        getPosition: (d: UserLocation) => [d.longitude, d.latitude],
        getRadius: 150,
        getFillColor: [59, 130, 246, 255], // 青色
        getLineColor: [255, 255, 255, 255],
        getLineWidth: 5,
        radiusUnits: "meters",
        pickable: false,
        stroked: true,
        filled: true,
      });
    },
    []
  );

  /**
   * 検索範囲円レイヤー
   */
  const createSearchRadiusLayer = useCallback(
    (userLocation: UserLocation, radius: number): Layer => {
      return new ScatterplotLayer({
        id: "search-radius-layer",
        data: [userLocation],
        getPosition: (d: UserLocation) => [d.longitude, d.latitude],
        getRadius: radius,
        getFillColor: [59, 130, 246, 30], // 青色半透明
        getLineColor: [59, 130, 246, 150],
        getLineWidth: 3,
        radiusUnits: "meters",
        pickable: false,
        stroked: true,
        filled: true,
      });
    },
    []
  );

  return {
    // 共通レイヤー
    createMunicipalitiesLayer,

    // 可視化用レイヤー
    createMeshLayer,
    createVoronoiLayer,
    createVisualizationFacilitiesLayer,

    // 検索結果用レイヤー
    createSearchFacilitiesLayer,
    createUserLocationLayer,
    createSearchRadiusLayer,

    // ユーティリティ
    getVisualizationColor,
    getSearchResultColor,
  };
}
