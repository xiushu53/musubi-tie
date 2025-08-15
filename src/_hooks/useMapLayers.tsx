"use client";

import type { Layer } from "@deck.gl/core";
import { GeoJsonLayer, IconLayer, ScatterplotLayer } from "@deck.gl/layers";
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
   * 検索結果施設レイヤー（カスタムアイコン対応）
   */
  const createSearchFacilitiesLayer = useCallback(
    (
      facilities: FacilityWithDistance[],
      selectedFacilityId?: number
      // searchRadius: number = 1000
    ): Layer | null => {
      if (!facilities.length) return null;

      // 家アイコンのSVG
      const homeIconSvg = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;

      // 選択時の家アイコン（赤）
      const selectedHomeIconSvg = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="11" fill="#EF4444" stroke="#FFFFFF" stroke-width="2"/>
          <path d="M8 12l2-2 2 2 4-4" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 16h6v-4H9v4z" fill="#FFFFFF"/>
          <path d="M12 8l-3 3v5h6v-5l-3-3z" stroke="#FFFFFF" stroke-width="1.5" fill="none"/>
        </svg>
      `;

      const facilityIconDataUri = `data:image/svg+xml;base64,${btoa(homeIconSvg)}`;
      const selectedIconDataUri = `data:image/svg+xml;base64,${btoa(selectedHomeIconSvg)}`;

      // アイコンレイヤーと背景円レイヤーを組み合わせ
      const facilityData = facilities.map((facility) => ({
        ...facility,
        isSelected: selectedFacilityId === facility.id,
        iconType: selectedFacilityId === facility.id ? "selected" : "normal",
      }));

      return new IconLayer({
        id: "search-facilities-layer",
        data: facilityData,
        getPosition: (d: any) => [d.lon, d.lat],
        getIcon: (d: any) => ({
          url: d.isSelected ? selectedIconDataUri : facilityIconDataUri,
          width: d.isSelected ? 24 : 20,
          height: d.isSelected ? 24 : 20,
          anchorY: d.isSelected ? 12 : 10,
          anchorX: d.isSelected ? 12 : 10,
        }),
        getSize: (d: any) => (d.isSelected ? 40 : 32),
        pickable: true,
        sizeUnits: "pixels",
        updateTriggers: {
          getIcon: [selectedFacilityId],
          getSize: [selectedFacilityId],
        },
      });
    },
    []
  );

  /**
   * 検索結果施設の背景円レイヤー（距離による色分け）
   */
  const createSearchFacilitiesBackgroundLayer = useCallback(
    (
      facilities: FacilityWithDistance[],
      selectedFacilityId?: number,
      searchRadius: number = 1000
    ): Layer | null => {
      if (!facilities.length) return null;

      return new ScatterplotLayer<FacilityWithDistance>({
        id: "search-facilities-background-layer",
        data: facilities,
        getPosition: (d: FacilityWithDistance) => [d.lon, d.lat],
        getRadius: (d: FacilityWithDistance) =>
          selectedFacilityId === d.id ? 180 : 120,
        getFillColor: (
          d: FacilityWithDistance
        ): [number, number, number, number] => {
          if (selectedFacilityId === d.id) {
            return [239, 68, 68, 120]; // 選択時は赤の背景
          } else {
            const [r, g, b] = getSearchResultColor(d.distance, searchRadius);
            return [r, g, b, 100]; // 距離色の薄い背景
          }
        },
        radiusUnits: "meters",
        pickable: false,
        stroked: false,
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
   * 現在地マーカーレイヤー（+アイコン）
   */
  const createUserLocationLayer = useCallback(
    (userLocation: UserLocation): Layer => {
      // +マークのSVGアイコンをBase64エンコード
      const crossIconSvg = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2"/>
          <path d="M12 6v12M6 12h12" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
        </svg>
      `;

      const iconDataUri = `data:image/svg+xml;base64,${btoa(crossIconSvg)}`;

      return new IconLayer({
        id: "user-location-layer",
        data: [{ ...userLocation, icon: "cross" }],
        getPosition: (d: any) => [d.longitude, d.latitude],
        getIcon: () => ({
          url: iconDataUri,
          width: 24,
          height: 24,
          anchorY: 12,
          anchorX: 12,
        }),
        getSize: 32,
        pickable: false,
        sizeUnits: "pixels",
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
    createSearchFacilitiesBackgroundLayer, // 追加
    createUserLocationLayer,
    createSearchRadiusLayer,

    // ユーティリティ
    getVisualizationColor,
    getSearchResultColor,
  };
}
