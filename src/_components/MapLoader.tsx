"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

export default function MapLoader({
  facilityType,
  maxDistance,
}: {
  facilityType: string;
  maxDistance: number;
}) {
  // DeckGL版のVisualizeDeckGLMapコンポーネントを動的にインポート
  const VisualizeDeckGLMap = useMemo(
    () =>
      dynamic(() => import("@/_components/VisualizeDeckGLMap"), {
        loading: () => (
          <p className="flex h-full items-center justify-center">
            地図を読み込んでいます...
          </p>
        ),
        ssr: false,
      }),
    []
  );

  return (
    <VisualizeDeckGLMap facilityType={facilityType} maxDistance={maxDistance} />
  );
}
