// src/_components/map/InquiryColorbar.tsx
import { Card, CardContent } from "@/_components/ui/card";
import type {
  FacilityAnalytics,
  VisualizationMode,
} from "@/_hooks/useInquiryMapLayers";

interface InquiryColorbarProps {
  mode: VisualizationMode;
  data: FacilityAnalytics[];
}

export default function InquiryColorbar({ mode, data }: InquiryColorbarProps) {
  const getColorbarConfig = () => {
    switch (mode) {
      case "replyRate":
        return {
          gradient:
            "linear-gradient(to right, #EF4444, #F59E0B, #EAB308, #84CC16, #10B981)",
          labels: ["0%", "25%", "50%", "75%", "100%"],
          title: "返信率",
          unit: "%",
          description: "問い合わせに対する返信の割合",
        };

      case "inquiryCount": {
        const maxCount =
          data.length > 0
            ? Math.max(...data.map((d) => d.analytics.totalInquiries))
            : 10;
        return {
          gradient:
            "linear-gradient(to right, #E5E7EB, #60A5FA, #3B82F6, #1D4ED8)",
          labels: [
            "0",
            `${Math.floor(maxCount / 3)}`,
            `${Math.floor((maxCount * 2) / 3)}`,
            `${maxCount}+`,
          ],
          title: "問い合わせ件数",
          unit: "件",
          description: "受信した問い合わせの総数",
        };
      }

      case "replyTime":
        return {
          gradient:
            "linear-gradient(to right, #10B981, #EAB308, #F59E0B, #EF4444)",
          labels: ["< 24h", "24-48h", "48-72h", "72h+"],
          title: "平均返信時間",
          unit: "時間",
          description: "問い合わせから初回返信までの時間",
        };

      case "distance": {
        const maxDistance =
          data.length > 0
            ? Math.max(...data.map((d) => d.analytics.averageDistance))
            : 5000;
        return {
          gradient:
            "linear-gradient(to right, #8B5CF6, #A855F7, #C084FC, #E879F9)",
          labels: [
            "近い",
            `${(maxDistance / 3000).toFixed(1)}km`,
            `${((maxDistance * 2) / 3000).toFixed(1)}km`,
            "遠い",
          ],
          title: "平均距離",
          unit: "km",
          description: "問い合わせ元からの平均距離",
        };
      }

      default:
        return {
          gradient: "linear-gradient(to right, #9CA3AF, #6B7280)",
          labels: ["低", "", "", "高"],
          title: "データなし",
          unit: "",
          description: "",
        };
    }
  };

  const config = getColorbarConfig();

  // 統計情報の取得
  const getStatsInfo = () => {
    if (data.length === 0) {
      return { average: "データなし", max: "" };
    }

    switch (mode) {
      case "replyRate": {
        const avgReplyRate =
          data.reduce((sum, d) => sum + d.analytics.replyRate, 0) / data.length;
        const topRate = Math.max(...data.map((d) => d.analytics.replyRate));
        return {
          average: `平均: ${avgReplyRate.toFixed(1)}%`,
          max: `最高: ${topRate}%`,
        };
      }

      case "inquiryCount": {
        const totalInquiries = data.reduce(
          (sum, d) => sum + d.analytics.totalInquiries,
          0
        );
        const maxInquiries = Math.max(
          ...data.map((d) => d.analytics.totalInquiries)
        );
        return {
          average: `総計: ${totalInquiries}件`,
          max: `最多: ${maxInquiries}件`,
        };
      }

      case "replyTime": {
        const replyTimes = data
          .map((d) => d.analytics.averageReplyTimeHours)
          .filter((t) => t !== null) as number[];
        if (replyTimes.length === 0) {
          return { average: "返信なし", max: "" };
        }
        const avgTime =
          replyTimes.reduce((a, b) => a + b, 0) / replyTimes.length;
        const minTime = Math.min(...replyTimes);
        return {
          average: `平均: ${avgTime.toFixed(1)}時間`,
          max: `最速: ${minTime.toFixed(1)}時間`,
        };
      }

      case "distance": {
        const avgDist =
          data.reduce((sum, d) => sum + d.analytics.averageDistance, 0) /
          data.length;
        const minDist = Math.min(
          ...data.map((d) => d.analytics.averageDistance)
        );
        return {
          average: `平均: ${(avgDist / 1000).toFixed(1)}km`,
          max: `最短: ${(minDist / 1000).toFixed(1)}km`,
        };
      }

      default:
        return { average: "", max: "" };
    }
  };

  const stats = getStatsInfo();

  return (
    <div className="absolute bottom-4 right-4 z-10">
      <Card className="bg-white bg-opacity-95 shadow-lg border backdrop-blur-sm">
        <CardContent className="p-4">
          {/* カラーバー */}
          <div className="space-y-3">
            <div className="text-center">
              <h4 className="font-semibold text-sm text-gray-800 mb-1">
                {config.title}
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                {config.description}
              </p>
            </div>

            {/* グラデーションバー */}
            <div className="space-y-2">
              <div
                style={{
                  background: config.gradient,
                  height: "16px",
                  borderRadius: "8px",
                  border: "1px solid #E5E7EB",
                }}
                className="w-48"
              />

              {/* ラベル */}
              <div className="flex justify-between text-xs text-gray-600 px-1">
                {config.labels.map((label, index) => (
                  <span key={index} className="text-center">
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* 統計情報 */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="text-xs font-medium text-gray-700 mb-2">
                📈 統計情報
              </div>
              <div className="grid grid-cols-1 gap-1">
                <div className="text-xs text-gray-600">{stats.average}</div>
                <div className="text-xs text-gray-600">{stats.max}</div>
              </div>
            </div>

            {/* 凡例 */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-700">
                ℹ️ 表示について
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>• 円のサイズ: 問い合わせ件数</div>
                <div>• 円の色: {config.title}の値</div>
                <div>• マウスオーバーで詳細表示</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
