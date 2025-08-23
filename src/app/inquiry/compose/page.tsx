"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Building,
  CheckCircle,
  Mail,
  MapPin,
  MessageCircle,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/_components/ui/dialog";
import { Input } from "@/_components/ui/input";
import { Label } from "@/_components/ui/label";
import { Textarea } from "@/_components/ui/textarea";
import { FACILITY_TYPES } from "@/_settings/visualize-map";
import {
  useInquiryActions,
  useSelectedFacilities,
} from "@/_stores/inquiryStore";
import { formatDistance } from "@/_utils/formatDistance";

interface InquiryFormData {
  userName: string;
  email: string;
  phone: string;
  commonMessage: string;
  facilityMessages: Record<number, string>; // facilityId -> 個別メッセージ
}

export default function InquiryComposePage() {
  const router = useRouter();
  const selectedFacilities = useSelectedFacilities();
  const inquiryActions = useInquiryActions();

  const [isClient, setIsClient] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<InquiryFormData>({
    userName: "",
    email: "",
    phone: "",
    commonMessage: "",
    facilityMessages: {},
  });

  // ハイドレーション完了チェック
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 選択施設を配列に変換
  const selectedFacilitiesArray = isClient
    ? Array.from(selectedFacilities.values()).sort(
        (a, b) => a.selectedAt.getTime() - b.selectedAt.getTime()
      )
    : [];

  // 選択施設がない場合は検索ページにリダイレクト
  useEffect(() => {
    if (isClient && selectedFacilitiesArray.length === 0) {
      router.push("/search");
    }
  }, [isClient, selectedFacilitiesArray.length, router]);

  // フォーム更新ハンドラー
  const updateFormData = (
    field: keyof Omit<InquiryFormData, "facilityMessages">,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateFacilityMessage = (facilityId: number, message: string) => {
    setFormData((prev) => ({
      ...prev,
      facilityMessages: {
        ...prev.facilityMessages,
        [facilityId]: message,
      },
    }));
  };

  // 施設を選択解除
  const handleRemoveFacility = (facilityId: number) => {
    inquiryActions.deselectFacility(facilityId);
  };

  // 戻るボタン
  const handleBack = () => {
    router.push("/search");
  };

  // 送信ボタンクリック時の処理
  const handleSubmitClick = async () => {
    if (!isFormValid || selectedFacilitiesArray.length === 0) return;

    // デモモード判定のためにAPI keyの存在確認
    try {
      console.log("🔍 デモモード確認開始");

      const checkResponse = await fetch("/api/inquiry/demo-check", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("📡 デモ確認レスポンス状態:", checkResponse.status);

      if (!checkResponse.ok) {
        throw new Error(
          `HTTP ${checkResponse.status}: ${checkResponse.statusText}`
        );
      }

      const responseText = await checkResponse.text();
      console.log("📄 生レスポンス:", responseText);

      let data: { isDemoMode: boolean };

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ JSONパースエラー:", parseError);
        console.error("📄 パース失敗した内容:", responseText.substring(0, 200));
        throw new Error("サーバーからの応答が正しいJSON形式ではありません");
      }

      console.log("✅ デモモード判定結果:", data);

      if (data.isDemoMode) {
        console.log("🎯 デモモーダル表示");
        setShowDemoModal(true);
      } else {
        console.log("📧 通常送信実行");
        await handleActualSubmit();
      }
    } catch (error) {
      console.error("❌ デモモード確認エラー:", error);

      // エラーの詳細をユーザーに表示
      const errorMessage =
        error instanceof Error ? error.message : "不明なエラー";

      if (errorMessage.includes("<!DOCTYPE")) {
        console.log("🎯 APIエラーによりデモモードで続行");
        setShowDemoModal(true); // 安全のためデモモード
      } else {
        console.log("🎯 エラーのためデモモードで続行");
        setShowDemoModal(true);
      }
    }
  };

  // デモモーダル確認後の処理
  const handleDemoConfirm = async () => {
    setShowDemoModal(false);
    await handleActualSubmit();
  };

  // 実際の送信処理（デモモード・通常モード共通）
  const handleActualSubmit = async () => {
    if (!isFormValid || selectedFacilitiesArray.length === 0) return;

    try {
      setIsSubmitting(true);

      // 送信リクエストデータ作成
      const requestData = {
        user: {
          name: formData.userName,
          email: formData.email,
          phone: formData.phone || undefined,
        },
        facilities: selectedFacilitiesArray.map((selected) => ({
          facilityId: selected.facility.id,
          distance: selected.distance,
          commonMessage: formData.commonMessage,
          facilityMessage:
            formData.facilityMessages[selected.facility.id] || undefined,
        })),
        searchInfo: {
          latitude: selectedFacilitiesArray[0].searchInfo.location.latitude,
          longitude: selectedFacilitiesArray[0].searchInfo.location.longitude,
          radius: selectedFacilitiesArray[0].searchInfo.searchRadius,
          facilityType: selectedFacilitiesArray[0].searchInfo.facilityType,
        },
      };

      console.log("📧 送信データ:", requestData);

      // 送信API呼び出し
      const response = await fetch("/api/inquiry/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "メール送信に失敗しました");
      }

      const result = await response.json();
      console.log("✅ 送信完了:", result);

      // 送信完了ページに遷移（実際の結果をパラメータで渡す）
      const params = new URLSearchParams({
        id: result.inquiryId,
        success: result.successCount.toString(),
        failure: result.failureCount.toString(),
        total: result.totalFacilities.toString(),
        demo: result.isDemoMode ? "true" : "false", // デモモード情報も追加
      });

      // 結果詳細も渡す（URLパラメータの長さ制限に注意）
      if (result.results && result.results.length <= 10) {
        const resultsForUrl = result.results.map((r: any) => ({
          facilityName: r.facilityName,
          success: r.success,
          error: r.error,
        }));
        params.set(
          "results",
          encodeURIComponent(JSON.stringify(resultsForUrl))
        );
      }

      router.push(`/inquiry/sent?${params.toString()}`);
    } catch (error) {
      console.error("❌ 送信エラー:", error);
      alert(
        `送信に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // フォームバリデーション
  const isFormValid =
    formData.userName && formData.email && formData.commonMessage;

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">
            問い合わせページを読み込み中...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-2 sm:p-4 max-w-4xl">
          {/* ヘッダー */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">検索に戻る</span>
              </Button>
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  問い合わせリスト
                </h1>
                <p className="text-sm text-gray-600">
                  選択した{selectedFacilitiesArray.length}
                  件の施設に一斉問い合わせ
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* 選択施設一覧 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  選択施設一覧 ({selectedFacilitiesArray.length}件)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedFacilitiesArray.map((selectedInfo, index) => {
                    const facility = selectedInfo.facility;
                    const facilityType = FACILITY_TYPES.find(
                      (t) => t.value === selectedInfo.searchInfo.facilityType
                    );

                    return (
                      <Card
                        key={facility.id}
                        className="p-3 border-l-4 border-l-blue-500"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-500">
                                #{index + 1}
                              </span>
                              <h3 className="font-medium text-sm sm:text-base truncate">
                                {facility.name}
                              </h3>
                            </div>

                            <p className="text-gray-600 text-xs sm:text-sm mb-2 line-clamp-2">
                              {facility.address}
                            </p>

                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {formatDistance(selectedInfo.distance)}
                              </Badge>
                              {facilityType && (
                                <Badge variant="secondary" className="text-xs">
                                  {facilityType.label}
                                </Badge>
                              )}
                            </div>

                            {/* 選択情報 */}
                            <div className="mt-2 text-xs text-gray-500">
                              📍 {selectedInfo.searchInfo.displayName} から選択
                              <span className="ml-2">
                                �{" "}
                                {selectedInfo.selectedAt.toLocaleString(
                                  "ja-JP",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </div>
                          </div>

                          {/* 削除ボタン */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveFacility(facility.id)}
                            className="ml-2 text-xs"
                          >
                            削除
                          </Button>
                        </div>

                        {/* 個別メッセージ入力 */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <Label className="text-xs text-gray-600 mb-1 block">
                            この施設への個別メッセージ（任意）
                          </Label>
                          <Textarea
                            placeholder="この施設に特別に伝えたいことがあれば..."
                            value={formData.facilityMessages[facility.id] || ""}
                            onChange={(e) =>
                              updateFacilityMessage(facility.id, e.target.value)
                            }
                            className="text-sm min-h-16"
                            rows={2}
                          />
                        </div>
                      </Card>
                    );
                  })}

                  {selectedFacilitiesArray.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Building className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>選択された施設がありません</p>
                      <p className="text-sm">
                        検索ページで施設を選択してください
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 問い合わせフォーム */}
            {selectedFacilitiesArray.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    問い合わせ内容
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 基本情報 */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="userName" className="text-sm font-medium">
                        お名前 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="userName"
                        placeholder="山田太郎"
                        value={formData.userName}
                        onChange={(e) =>
                          updateFormData("userName", e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium">
                        メールアドレス <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="example@email.com"
                        value={formData.email}
                        onChange={(e) =>
                          updateFormData("email", e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium">
                      電話番号（任意）
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="090-1234-5678"
                      value={formData.phone}
                      onChange={(e) => updateFormData("phone", e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {/* 共通メッセージ */}
                  <div>
                    <Label
                      htmlFor="commonMessage"
                      className="text-sm font-medium"
                    >
                      全施設への共通メッセージ{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="commonMessage"
                      placeholder="施設の利用を検討しています。見学や相談の予約をお願いします。"
                      value={formData.commonMessage}
                      onChange={(e) =>
                        updateFormData("commonMessage", e.target.value)
                      }
                      className="mt-1 min-h-24"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      このメッセージは選択した全ての施設に送信されます
                    </p>
                  </div>

                  {/* 送信ボタン */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      className="flex-1 sm:flex-none"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      検索に戻る
                    </Button>
                    <Button
                      onClick={handleSubmitClick}
                      disabled={!isFormValid || isSubmitting}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          送信中...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {selectedFacilitiesArray.length}件の施設に送信
                        </>
                      )}
                    </Button>
                  </div>

                  {/* フォーム状態表示 */}
                  {!isFormValid && (
                    <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                      ⚠️ 必須項目を入力してください：
                      {!formData.userName && " 名前"}
                      {!formData.email && " メールアドレス"}
                      {!formData.commonMessage && " 共通メッセージ"}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* サマリー情報 */}
            {selectedFacilitiesArray.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <div className="flex justify-center items-center gap-2">
                      <Mail className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-900">
                        {selectedFacilitiesArray.length}件の施設に一斉問い合わせ
                      </span>
                    </div>

                    <div className="text-sm text-blue-700 space-y-1">
                      <div>
                        📍 検索地点:{" "}
                        {selectedFacilitiesArray.length > 0
                          ? selectedFacilitiesArray[0].searchInfo.displayName
                          : ""}
                      </div>
                      <div>
                        📏 距離範囲:{" "}
                        {selectedFacilitiesArray.length > 0 &&
                          `${formatDistance(Math.min(...selectedFacilitiesArray.map((s) => s.distance)))} 〜 ${formatDistance(Math.max(...selectedFacilitiesArray.map((s) => s.distance)))}`}
                      </div>
                      <div>
                        🏢 施設タイプ:{" "}
                        {selectedFacilitiesArray.length > 0 &&
                          FACILITY_TYPES.find(
                            (t) =>
                              t.value ===
                              selectedFacilitiesArray[0].searchInfo.facilityType
                          )?.label}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* デモモーダル */}
      <Dialog open={showDemoModal} onOpenChange={setShowDemoModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              デモモードでの実行確認
            </DialogTitle>
            <DialogDescription>
              現在デモモードで動作しています
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>デモモード:</strong> 実際のメール送信は行われません
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>対象施設数:</span>
                <span className="font-medium">
                  {selectedFacilitiesArray.length}件
                </span>
              </div>
              <div className="flex justify-between">
                <span>実際の送信:</span>
                <span className="text-red-600 font-medium">なし</span>
              </div>
              <div className="flex justify-between">
                <span>データ記録:</span>
                <span className="text-green-600 font-medium">
                  あり（実データ）
                </span>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>送信完了ページでデモ結果を確認できます</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDemoModal(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleDemoConfirm}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  実行中...
                </>
              ) : (
                "デモ実行する"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
