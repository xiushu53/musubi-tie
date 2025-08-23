// src/_components/map/ExportButton.tsx (shadcn/ui版)

import {
  AlertCircle,
  CheckCircle,
  Download,
  FileDown,
  Settings,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "@/_components/ui/button";
import { Card, CardContent, CardHeader } from "@/_components/ui/card";
import { Label } from "@/_components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/_components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/_components/ui/select";
import { Switch } from "@/_components/ui/switch";

interface ExportButtonProps {
  facilityType: string;
  timeRange: number;
  className?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  facilityType,
  timeRange,
  className = "",
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [exportStatus, setExportStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [exportConfig, setExportConfig] = useState({
    meshSize: 250,
    includeInterpolated: true,
    minInquiryCount: 1,
  });

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus("idle");

      console.log("📤 GeoJSONエクスポート開始...", {
        facilityType,
        timeRange,
        exportConfig,
      });

      // エクスポートAPIを呼び出し
      const params = new URLSearchParams({
        facilityType,
        timeRange: timeRange.toString(),
        meshSize: exportConfig.meshSize.toString(),
        includeInterpolated: exportConfig.includeInterpolated.toString(),
        minInquiryCount: exportConfig.minInquiryCount.toString(),
      });

      const response = await fetch(`/api/analytics/export/mesh?${params}`);

      if (!response.ok) {
        throw new Error(`エクスポート失敗: ${response.statusText}`);
      }

      // ファイルダウンロード処理
      const blob = await response.blob();
      const filename =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] ||
        `inquiry_mesh_${facilityType}_${timeRange}days.geojson`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // クリーンアップ
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportStatus("success");
      console.log("✅ GeoJSONエクスポート完了:", filename);

      // 成功状態を3秒後にリセット
      setTimeout(() => setExportStatus("idle"), 3000);
    } catch (error) {
      console.error("❌ GeoJSONエクスポートエラー:", error);
      setExportStatus("error");

      // エラー状態を5秒後にリセット
      setTimeout(() => setExportStatus("idle"), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const facilityTypeNames: Record<string, string> = {
    asds: "放課後等デイサービス",
    "sept-a": "就労継続支援A",
    "sept-b": "就労継続支援B",
    pco: "計画相談事業所",
    ccd: "障害児相談支援事業所",
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        {/* メインエクスポートボタン */}
        <Button
          onClick={handleExport}
          disabled={isExporting}
          variant={
            exportStatus === "success"
              ? "outline"
              : exportStatus === "error"
                ? "destructive"
                : "default"
          }
          size="sm"
          className={`
            ${exportStatus === "success" ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100" : ""}
            ${exportStatus === "error" ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : ""}
          `}
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
              エクスポート中...
            </>
          ) : exportStatus === "success" ? (
            <>
              <CheckCircle className="h-4 w-4" />
              ダウンロード完了
            </>
          ) : exportStatus === "error" ? (
            <>
              <AlertCircle className="h-4 w-4" />
              エクスポート失敗
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              GeoJSON出力
            </>
          )}
        </Button>

        {/* 設定ポップオーバー */}
        <Popover open={showOptions} onOpenChange={setShowOptions}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-80 p-0" align="end" side="bottom">
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileDown className="h-4 w-4 text-blue-600" />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">
                      GeoJSONエクスポート設定
                    </h3>
                    <p className="text-xs text-gray-600">
                      {facilityTypeNames[facilityType] || facilityType} | 過去
                      {timeRange}日間
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* メッシュサイズ設定 */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">メッシュサイズ</Label>
                  <Select
                    value={exportConfig.meshSize.toString()}
                    onValueChange={(value) =>
                      setExportConfig((prev) => ({
                        ...prev,
                        meshSize: parseInt(value),
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="250">250m（高解像度）</SelectItem>
                      <SelectItem value="500">500m（標準）</SelectItem>
                      <SelectItem value="1000">1km（広域）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 最小問い合わせ件数 */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    最小問い合わせ件数
                  </Label>
                  <Select
                    value={exportConfig.minInquiryCount.toString()}
                    onValueChange={(value) =>
                      setExportConfig((prev) => ({
                        ...prev,
                        minInquiryCount: parseInt(value),
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1件以上（全データ）</SelectItem>
                      <SelectItem value="2">2件以上</SelectItem>
                      <SelectItem value="3">3件以上（高信頼性）</SelectItem>
                      <SelectItem value="5">
                        5件以上（ホットスポット）
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* KDE補間データ設定 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="kde-switch" className="text-xs font-medium">
                      KDE補間データを含める
                    </Label>
                    <Switch
                      id="kde-switch"
                      checked={exportConfig.includeInterpolated}
                      onCheckedChange={(checked) =>
                        setExportConfig((prev) => ({
                          ...prev,
                          includeInterpolated: checked,
                        }))
                      }
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    実データ周辺の推定密度メッシュも出力
                  </p>
                </div>

                {/* 出力内容説明 */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <h4 className="text-xs font-medium text-blue-800 mb-2">
                    📋 出力データ
                  </h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>
                      • メッシュポリゴン（{exportConfig.meshSize}m正方形）
                    </li>
                    <li>• 問い合わせ統計（件数、密度、ユーザー数）</li>
                    <li>• 時間分析（時間帯・曜日分布）</li>
                    <li>• 施設タイプ別分布</li>
                    <li>• 返信パフォーマンス統計</li>
                    <li>• 地域情報（区、最寄り駅推定）</li>
                  </ul>
                </div>

                {/* アクションボタン */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex-1"
                    size="sm"
                  >
                    {isExporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                        出力中...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        ダウンロード
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowOptions(false)}
                    variant="outline"
                    size="sm"
                  >
                    閉じる
                  </Button>
                </div>
              </CardContent>
            </Card>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default ExportButton;
