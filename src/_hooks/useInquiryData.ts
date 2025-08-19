// src/_hooks/useInquiryData.ts
import { useEffect, useState } from "react";

export interface FacilityAnalytics {
  facility: {
    id: number;
    name: string;
    address: string;
    lat: number;
    lon: number;
    prefecture: string;
    city: string;
  };
  analytics: {
    totalInquiries: number;
    sentCount: number;
    deliveredCount: number;
    openedCount: number;
    repliedCount: number;
    replyRate: number;
    openRate: number;
    deliveryRate: number;
    averageDistance: number;
    averageReplyTimeHours: number | null;
    firstInquiryAt: string;
    lastInquiryAt: string;
  };
}

interface InquiryDataResponse {
  facilityType: string;
  timeRange: number;
  period: {
    start: string;
    end: string;
  };
  facilities: FacilityAnalytics[];
  summary: {
    totalFacilities: number;
    totalInquiries: number;
    totalReplies: number;
    averageReplyRate: number;
    topPerformers: FacilityAnalytics[];
  };
}

export function useInquiryData(facilityType: string, timeRange: number) {
  const [data, setData] = useState<InquiryDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(
          `🔄 問い合わせデータ取得開始: ${facilityType}, ${timeRange}日間`
        );

        const response = await fetch(
          `/api/analytics/inquiries?facilityType=${facilityType}&timeRange=${timeRange}&details=false`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setData(result);

        console.log(`✅ 問い合わせデータ取得完了:`, {
          facilities: result.facilities?.length || 0,
          totalInquiries: result.summary?.totalInquiries || 0,
          averageReplyRate: result.summary?.averageReplyRate?.toFixed(1) || 0,
        });
      } catch (err) {
        console.error("❌ 問い合わせデータ取得エラー:", err);
        setError(
          err instanceof Error ? err.message : "データ取得に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [facilityType, timeRange]);

  const refetch = () => {
    if (!loading) {
      setData(null);
      setError(null);
      // useEffectが再実行される
    }
  };

  return {
    data,
    loading,
    error,
    refetch,
  };
}
