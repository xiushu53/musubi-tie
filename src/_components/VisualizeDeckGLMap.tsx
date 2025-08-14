"use client";

import type { Layer } from "@deck.gl/core";
import { GeoJsonLayer, ScatterplotLayer } from "@deck.gl/layers";
import DeckGL from "@deck.gl/react";
import type { Feature, GeoJsonProperties, Geometry } from "geojson";
import type { StyleSpecification } from "maplibre-gl";
import React, { useCallback, useMemo } from "react";
import { Map as MapLibre } from "react-map-gl/maplibre";
import { MAP_SETTINGS } from "@/_settings/visualize-map";
import { useMapData } from "@/hooks/useMapData";
import type { Facility } from "@/types";
import Colorbar from "./Colorbar";
import LayerControlPanel from "./LayerControlPanel";

interface VisualizeDeckGLMapProps {
  facilityType: string;
  maxDistance: number;
}

export default function VisualizeDeckGLMap({
  facilityType,
  maxDistance,
}: VisualizeDeckGLMapProps) {
  const { facilities, meshData, voronoiData, municipalitiesData, loading } =
    useMapData(facilityType);

  // Layer visibility state
  const [layerVisibility, setLayerVisibility] = React.useState({
    municipalities: true,
    mesh: true,
    voronoi: false,
    facilities: true,
  });

  // Color mapping function
  const getColor = useCallback(
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
        return [r, g, b, Math.floor(255 * (MAP_SETTINGS?.opacity ?? 0))]; // Use opacity from settings
      } else {
        // Yellow to Red
        const r = 255;
        const g = Math.floor(255 * (1 - (ratio - 0.5) * 2));
        const b = 0;
        return [r, g, b, Math.floor(255 * (MAP_SETTINGS?.opacity ?? 0))]; // Use opacity from settings
      }
    },
    []
  );

  // Mesh layer - key dependency on maxDistance to force re-render
  const meshLayer = useMemo(() => {
    if (!meshData || !layerVisibility.mesh) return null;

    return new GeoJsonLayer({
      id: "mesh-layer",
      data: meshData,
      filled: true,
      stroked: false,
      getFillColor: (feature: Feature<Geometry, GeoJsonProperties>) => {
        const distance = feature.properties?.distance_m || 0;
        return getColor(distance, maxDistance);
      },
      getLineColor: [255, 255, 255, 0],
      getLineWidth: 0,
      pickable: true,
      updateTriggers: {
        getFillColor: [maxDistance], // Force update when maxDistance changes
      },
    });
  }, [meshData, maxDistance, getColor, layerVisibility.mesh]);

  // Voronoi layer - key dependency on maxDistance to force re-render
  const voronoiLayer = useMemo(() => {
    if (!voronoiData || !layerVisibility.voronoi) return null;

    return new GeoJsonLayer({
      id: "voronoi-layer",
      data: voronoiData,
      filled: true,
      stroked: true,
      getFillColor: (feature: Feature<Geometry, GeoJsonProperties>) => {
        const distance = feature.properties?.distance || 0;
        const color = getColor(distance, maxDistance);
        return [color[0], color[1], color[2], 128]; // Semi-transparent
      },
      getLineColor: [255, 255, 255, 255],
      getLineWidth: 2,
      pickable: true,
      updateTriggers: {
        getFillColor: [maxDistance], // Force update when maxDistance changes
      },
    });
  }, [voronoiData, maxDistance, getColor, layerVisibility.voronoi]);

  // Municipalities layer
  const municipalitiesLayer = useMemo(() => {
    if (!municipalitiesData || !layerVisibility.municipalities) return null;

    return new GeoJsonLayer({
      id: "municipalities-layer",
      data: municipalitiesData,
      filled: false,
      stroked: true,
      getLineColor: [80, 80, 80, 200],
      getLineWidth: 2,
      lineDashArray: [5, 5],
      pickable: true,
    });
  }, [municipalitiesData, layerVisibility.municipalities]);

  // Facilities layer
  const facilitiesLayer = useMemo(() => {
    if (!facilities.length || !layerVisibility.facilities) return null;

    return new ScatterplotLayer<Facility>({
      id: "facilities-layer",
      data: facilities,
      getPosition: (d: Facility) => [d.lon, d.lat],
      getRadius: 50, // メートル単位
      getFillColor: [58, 58, 58, 255],
      getLineColor: [255, 255, 255, 255],
      getLineWidth: 10,
      radiusUnits: "meters",
      pickable: true,
    });
  }, [facilities, layerVisibility.facilities]);

  const layers: Layer[] = useMemo(() => {
    const allLayers = [
      municipalitiesLayer,
      meshLayer,
      voronoiLayer,
      facilitiesLayer,
    ];
    return allLayers.filter(Boolean) as Layer[];
  }, [municipalitiesLayer, meshLayer, voronoiLayer, facilitiesLayer]);

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <p className="mb-4">地図データを読み込んでいます...</p>
        <div className="w-[60%] bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full animate-pulse"
            style={{ width: "66%" }}
          ></div>
        </div>
      </div>
    );
  }

  const mapStyle: StyleSpecification = {
    version: 8,
    sources: {
      "carto-light": {
        type: "raster" as const,
        tiles: [
          "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
          "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
      },
    },
    layers: [
      {
        id: "carto-light-layer",
        type: "raster" as const,
        source: "carto-light",
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };

  return (
    <div className="relative h-full w-full">
      <DeckGL
        initialViewState={{
          longitude: MAP_SETTINGS.center[1],
          latitude: MAP_SETTINGS.center[0],
          zoom: MAP_SETTINGS.zoom,
          pitch: 0,
          bearing: 0,
        }}
        controller={true}
        layers={layers}
        getTooltip={({ object }) => {
          if (!object) return null;

          // Mesh tooltip
          if (object.properties?.distance_m !== undefined) {
            return `最近傍施設までの距離: ${Math.round(object.properties.distance_m)}m`;
          }

          // Municipality tooltip
          if (object.properties?.ward_ja) {
            return object.properties.ward_ja;
          }

          // Facility tooltip
          if (object.name) {
            return {
              html: `<strong>${object.name}</strong><br/>${object.address}`,
              style: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                color: "white",
                padding: "8px",
                borderRadius: "4px",
              },
            };
          }

          return null;
        }}
      >
        <MapLibre
          mapStyle={mapStyle}
          attributionControl={{
            compact: true,
            customAttribution: "© CARTO © OpenStreetMap contributors",
          }}
        />
      </DeckGL>

      <LayerControlPanel
        layerVisibility={layerVisibility}
        onLayerToggle={setLayerVisibility}
      />

      <Colorbar maxDistance={maxDistance} />

      {/* Attribution */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-600 bg-white bg-opacity-80 px-2 py-1 rounded">
        © CARTO © OpenStreetMap contributors
      </div>
    </div>
  );
}
