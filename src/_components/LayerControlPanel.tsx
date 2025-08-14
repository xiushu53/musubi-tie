import type React from "react";

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
  const handleToggle = (layerName: keyof typeof layerVisibility) => {
    onLayerToggle((prev) => ({
      ...prev,
      [layerName]: !prev[layerName],
    }));
  };

  const layerConfig = [
    { key: "municipalities" as const, label: "市区町村 境界線" },
    { key: "mesh" as const, label: "アクセス距離 (250mメッシュ)" },
    { key: "voronoi" as const, label: "ボロノイ領域" },
    { key: "facilities" as const, label: "施設マーカー" },
  ];

  return (
    <div className="absolute top-4 right-4 z-10 bg-white bg-opacity-90 p-3 rounded-md shadow-lg border">
      <h3 className="text-sm font-semibold mb-2">レイヤー表示</h3>
      <div className="space-y-2">
        {layerConfig.map(({ key, label }) => (
          <label key={key} className="flex items-center text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={layerVisibility[key]}
              onChange={() => handleToggle(key)}
              className="mr-2"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
