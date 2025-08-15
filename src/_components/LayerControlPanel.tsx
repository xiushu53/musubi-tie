import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "@/_components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/_components/ui/collapsible";

interface LayerControlPanelProps {
  layerVisibility: {
    municipalities: boolean;
    mesh: boolean;
    voronoi: boolean;
    facilities: boolean;
  };
  onLayerToggle: React.Dispatch<
    React.SetStateAction<{
      municipalities: boolean;
      mesh: boolean;
      voronoi: boolean;
      facilities: boolean;
    }>
  >;
}

export default function LayerControlPanel({
  layerVisibility,
  onLayerToggle,
}: LayerControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (layerName: keyof typeof layerVisibility) => {
    onLayerToggle((prev) => ({
      ...prev,
      [layerName]: !prev[layerName],
    }));
  };

  const layerConfig = [
    {
      key: "municipalities" as const,
      label: "市区町村 境界線",
      description: "行政区域の境界を表示",
    },
    {
      key: "mesh" as const,
      label: "アクセス距離 (250mメッシュ)",
      description: "施設までの距離をメッシュで可視化",
    },
    {
      key: "voronoi" as const,
      label: "ボロノイ領域",
      description: "各施設の影響範囲を表示",
    },
    {
      key: "facilities" as const,
      label: "施設マーカー",
      description: "施設の位置を表示",
    },
  ];

  // Count active layers
  const activeLayersCount =
    Object.values(layerVisibility).filter(Boolean).length;

  return (
    <div className="absolute top-4 right-4 z-20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="bg-white bg-opacity-95 rounded-lg shadow-lg border backdrop-blur-sm">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
              aria-label={
                isOpen ? "レイヤーパネルを閉じる" : "レイヤーパネルを開く"
              }
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-800">
                  {isOpen ? "レイヤー表示" : `レイヤー (${activeLayersCount})`}
                </span>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="border-t border-gray-100">
            <div className="p-3 space-y-3">
              {layerConfig.map(({ key, label, description }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="flex items-center text-sm cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={layerVisibility[key]}
                      onChange={() => handleToggle(key)}
                      className="mr-3 h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      aria-describedby={`${key}-description`}
                    />
                    <span className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                      {label}
                    </span>
                  </label>
                  <span
                    id={`${key}-description`}
                    className="text-xs text-gray-500 ml-7 leading-relaxed"
                  >
                    {description}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
