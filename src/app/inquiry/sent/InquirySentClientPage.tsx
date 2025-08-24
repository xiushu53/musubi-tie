"use client";

import {
  AlertTriangle,
  CheckCircle,
  Home,
  Mail,
  MessageCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/_components/ui/alert";
import { Badge } from "@/_components/ui/badge";
import { Button } from "@/_components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/_components/ui/card";

interface InquiryStatus {
  inquiryId: string;
  status: string;
  totalFacilities: number;
  successCount: number;
  failureCount: number;
  isDemoMode: boolean;
  results: Array<{
    facilityName: string;
    success: boolean;
    error?: string;
  }>;
}

export default function InquirySentClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("id");

  const [inquiryStatus, setInquiryStatus] = useState<InquiryStatus | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!inquiryId) {
      router.push("/search");
      return;
    }

    // 実際の送信結果をURLパラメータから取得
    const successCount = searchParams.get("success");
    const failureCount = searchParams.get("failure");
    const totalFacilities = searchParams.get("total");
    const isDemoMode = searchParams.get("demo") === "true";
    const resultsParam = searchParams.get("results");

    if (successCount && failureCount && totalFacilities) {
      let results: Array<{
        facilityName: string;
        success: boolean;
        error?: string;
      }> = [];

      if (resultsParam) {
        try {
          results = JSON.parse(decodeURIComponent(resultsParam));
        } catch (e) {
          console.warn("結果パラメータの解析に失敗:", e);
        }
      }

      // 結果がない場合は簡易表示
      if (results.length === 0) {
        results = Array.from({ length: parseInt(totalFacilities) }, (_, i) => ({
          facilityName: `施設 ${i + 1}`,
          success: i < parseInt(successCount),
        }));
      }

      const actualData: InquiryStatus = {
        inquiryId,
        status: "sent",
        totalFacilities: parseInt(totalFacilities),
        successCount: parseInt(successCount),
        failureCount: parseInt(failureCount),
        isDemoMode,
        results,
      };

      setInquiryStatus(actualData);
      setLoading(false);
    } else {
      fetchInquiryStatus(inquiryId);
    }
  }, [inquiryId, router, searchParams]);

  const fetchInquiryStatus = async (id: string) => {
    try {
      setLoading(true);

      // TODO: 実際の状態確認API実装
      const simpleData: InquiryStatus = {
        inquiryId: id,
        status: "sent",
        totalFacilities: 1,
        successCount: 1,
        failureCount: 0,
        isDemoMode: false,
        results: [{ facilityName: "送信完了", success: true }],
      };

      setInquiryStatus(simpleData);
    } catch (error) {
      console.error("状態確認エラー:", error);
      router.push("/search");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">送信結果を確認中...</p>
        </div>
      </div>
    );
  }

  if (!inquiryStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">送信結果が見つかりません</p>
          <Button onClick={() => router.push("/search")}>
            検索ページに戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-6">
          {/* デモモード表示 */}
          {inquiryStatus.isDemoMode && (
            <Alert className="mb-4 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>デモモード実行結果:</strong>
                実際のメール送信は行われませんでしたが、データは正常に記録されました。
              </AlertDescription>
            </Alert>
          )}

          {/* 成功メッセージ */}
          <Card
            className={
              inquiryStatus.isDemoMode
                ? "bg-amber-50 border-amber-200"
                : "bg-green-50 border-green-200"
            }
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                {inquiryStatus.isDemoMode ? (
                  <AlertTriangle className="h-12 w-12 text-amber-600" />
                ) : (
                  <CheckCircle className="h-12 w-12 text-green-600" />
                )}
                <div>
                  <h1
                    className={`text-2xl font-bold mb-2 ${inquiryStatus.isDemoMode ? "text-amber-900" : "text-green-900"}`}
                  >
                    {inquiryStatus.isDemoMode
                      ? "デモ実行完了！"
                      : "問い合わせを送信しました！"}
                  </h1>
                  <p
                    className={
                      inquiryStatus.isDemoMode
                        ? "text-amber-700"
                        : "text-green-700"
                    }
                  >
                    {inquiryStatus.totalFacilities}件の施設に
                    {inquiryStatus.isDemoMode
                      ? "デモ問い合わせを実行いたしました。"
                      : "問い合わせメールを送信いたしました。"}
                    {!inquiryStatus.isDemoMode &&
                      "各施設からの返信をお待ちください。"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 送信結果サマリー */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <Mail className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-900">
                {inquiryStatus.totalFacilities}
              </div>
              <div className="text-sm text-gray-600">
                {inquiryStatus.isDemoMode ? "デモ対象施設" : "送信対象施設"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-900">
                {inquiryStatus.successCount}
              </div>
              <div className="text-sm text-gray-600">
                {inquiryStatus.isDemoMode ? "デモ成功" : "送信成功"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <MessageCircle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-amber-900">
                {inquiryStatus.failureCount}
              </div>
              <div className="text-sm text-gray-600">
                {inquiryStatus.isDemoMode ? "デモ失敗" : "送信失敗"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 詳細結果 */}
        <Card>
          <CardHeader>
            <CardTitle>
              {inquiryStatus.isDemoMode ? "デモ実行結果詳細" : "送信結果詳細"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inquiryStatus.results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-gray-500">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{result.facilityName}</div>
                      {result.error && (
                        <div className="text-sm text-red-600">
                          エラー: {result.error}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={result.success ? "default" : "destructive"}
                    className={
                      result.success ? "bg-green-600 hover:bg-green-700" : ""
                    }
                  >
                    {inquiryStatus.isDemoMode
                      ? result.success
                        ? "デモ成功"
                        : "デモ失敗"
                      : result.success
                        ? "送信完了"
                        : "送信失敗"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 次のステップ案内 */}
        {!inquiryStatus.isDemoMode && (
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h3 className="font-bold text-blue-900 mb-3">📬 今後の流れ</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>各施設から直接メールで返信が届きます</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>
                    返信メールに直接返答することで、施設とやり取りできます
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>通常1-3営業日以内に返信がある場合が多いです</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {inquiryStatus.isDemoMode && (
          <Card className="mt-6 bg-gray-50 border-gray-200">
            <CardContent className="pt-6">
              <h3 className="font-bold text-gray-900 mb-3">
                🎯 デモモードについて
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <span>実際のメール送信は行われませんでした</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <span>
                    問い合わせデータは正常にデータベースに記録されています
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <span>本番環境では実際に施設にメールが送信されます</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 管理情報 */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <h3 className="font-medium text-gray-900 mb-3">
              📋 問い合わせ管理情報
            </h3>
            <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm space-y-1">
              <div>問い合わせID: {inquiryStatus.inquiryId}</div>
              <div>実行日時: {new Date().toLocaleString("ja-JP")}</div>
              <div>
                ステータス:{" "}
                {inquiryStatus.isDemoMode ? "デモ実行完了" : "送信完了"}
              </div>
              <div>
                モード: {inquiryStatus.isDemoMode ? "デモモード" : "本番モード"}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ※
              問い合わせに関するご質問がある場合は、上記の問い合わせIDをお伝えください
            </p>
          </CardContent>
        </Card>

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button
            onClick={() => router.push("/search")}
            className="flex-1"
            variant="outline"
          >
            <Home className="h-4 w-4 mr-2" />
            検索ページに戻る
          </Button>

          <Button
            onClick={() => router.push("/search")}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Mail className="h-4 w-4 mr-2" />
            新しい問い合わせを作成
          </Button>
        </div>
      </div>
    </div>
  );
}
