"use client";

import { ChevronDown, ChevronUp, Clock, Database } from "lucide-react";
import { Badge } from "@/_components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/_components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/_components/ui/collapsible";
import type { UserLocation } from "@/types";

export type IndexInfo = {
  dataSource: string;
  precision: number;
  buildTime: number;
  totalCells?: number;
  gridCells?: number;
  avgFacilitiesPerCell?: number;
  memoryEstimate: string;
  efficiency: string;
} | null;

interface InfoCardsProps {
  indexInfo: IndexInfo;
  userLocation: UserLocation | null;
  geohashReady: boolean;
  searchResults: { searchTime: number; method: string };
  cardStates: { indexInfo: boolean; searchInfo: boolean };
  toggleCard: (cardName: "indexInfo" | "searchInfo") => void;
}

export function InfoCards({
  indexInfo,
  userLocation,
  geohashReady,
  searchResults,
  cardStates,
  toggleCard,
}: InfoCardsProps) {
  return (
    <>
      {/* 2. 静的Geohashインデックス情報カード */}
      {indexInfo && (cardStates.indexInfo || window.innerWidth >= 1024) && (
        <Collapsible
          open={cardStates.indexInfo}
          onOpenChange={() => toggleCard("indexInfo")}
        >
          <Card className="w-full">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>静的Geohashインデックス</span>
                  </div>
                  {cardStates.indexInfo ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="text-sm space-y-2 pt-0">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span>データソース:</span>
                    <span className="text-blue-600 font-medium">
                      {indexInfo.dataSource}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>精度:</span>
                    <span>{indexInfo.precision}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>構築時間:</span>
                    <span>{indexInfo.buildTime}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hashセル:</span>
                    <span>{indexInfo.totalCells?.toLocaleString()}</span>
                  </div>
                  {indexInfo.gridCells && (
                    <div className="flex justify-between">
                      <span>Gridセル:</span>
                      <span>{indexInfo.gridCells.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>平均施設/セル:</span>
                    <span>{indexInfo.avgFacilitiesPerCell?.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>メモリ:</span>
                    <span>{indexInfo.memoryEstimate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>効率:</span>
                    <span className="text-green-600 font-medium">
                      {indexInfo.efficiency}
                    </span>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* 3. 検索結果情報カード */}
      {userLocation &&
        geohashReady &&
        (cardStates.searchInfo || window.innerWidth >= 1024) && (
          <Collapsible
            open={cardStates.searchInfo}
            onOpenChange={() => toggleCard("searchInfo")}
          >
            <Card className="w-full">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>検索結果情報</span>
                      {searchResults.searchTime > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {searchResults.searchTime.toFixed(1)}ms
                        </Badge>
                      )}
                    </div>
                    {cardStates.searchInfo ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="text-sm space-y-2 pt-0">
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span>検索手法:</span>
                      <span className="text-xs font-mono text-right flex-1 ml-2">
                        {searchResults.method}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>検索時間:</span>
                      <span className="font-bold text-green-600">
                        {searchResults.searchTime.toFixed(3)}ms
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>検索結果:</span>
                      <span className="font-medium">
                        {/* searchResults.results.length is not passed */}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>システム状態:</span>
                      <span>
                        {/* dataLoading and geohashReady are not passed */}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}
    </>
  );
}
