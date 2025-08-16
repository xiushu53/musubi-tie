"use client";

import { BarChart3, Database, List, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/_components/ui/alert";
import { Button } from "@/_components/ui/button";

interface SearchPageHeaderProps {
  cardStates: {
    searchConditions: boolean;
    searchResults: boolean;
    indexInfo: boolean;
  };
  toggleCard: (
    cardName: "searchConditions" | "searchResults" | "indexInfo"
  ) => void;
  dataLoading: boolean;
  dataError: string | null;
  searchResultsCount: number;
}

export function SearchPageHeader({
  cardStates,
  toggleCard,
  dataLoading,
  dataError,
  searchResultsCount,
}: SearchPageHeaderProps) {
  return (
    <div className="mb-4 sm:mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
        障害福祉施設検索
        <span className="text-xs ml-2 sm:text-sm font-normal text-blue-600">
          ⚡ 静的Geohash版
        </span>
      </h1>
      <p className="text-sm sm:text-base text-gray-600">
        近くの障害福祉施設を手軽に検索🔍
        <br />
        施設タイプや範囲を指定して見つけよう
      </p>

      {/* スマホ用クイックアクセスボタン */}
      <div className="mt-4 flex gap-2 sm:hidden">
        <Button
          size="sm"
          variant={cardStates.searchConditions ? "default" : "outline"}
          onClick={() => toggleCard("searchConditions")}
          className="flex-1"
        >
          <Settings className="h-3 w-3 mr-1" />
          検索条件
        </Button>
        <Button
          size="sm"
          variant={cardStates.searchResults ? "default" : "outline"}
          onClick={() => toggleCard("searchResults")}
          className="flex-1"
        >
          <List className="h-3 w-3 mr-1" />
          結果 ({searchResultsCount})
        </Button>
        <Button
          size="sm"
          variant={cardStates.indexInfo ? "default" : "outline"}
          onClick={() => toggleCard("indexInfo")}
          className="flex-1"
        >
          <BarChart3 className="h-3 w-3 mr-1" />
          詳細
        </Button>
      </div>

      {/* データ読み込み状況 */}
      {dataLoading && (
        <Alert className="mt-4">
          <Database className="h-4 w-4" />
          <AlertDescription>Geohashデータを読み込み中...</AlertDescription>
        </Alert>
      )}

      {dataError && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>データ読み込みエラー: {dataError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
