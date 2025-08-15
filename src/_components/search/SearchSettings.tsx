"use client";

import { Database, TestTube, Zap } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/_components/ui/button";
import { Input } from "@/_components/ui/input";
import { Label } from "@/_components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/_components/ui/select";
import { Slider } from "@/_components/ui/slider";
import { formatDistance } from "@/_utils/formatDistance";
import type { SearchMethod } from "@/hooks/useGeohashSearch";

interface SearchSettingsProps {
  searchRadius: number;
  setSearchRadius: Dispatch<SetStateAction<number>>;
  nameFilter: string;
  setNameFilter: Dispatch<SetStateAction<string>>;
  searchMethod: string;
  setSearchMethod: Dispatch<SetStateAction<string>>;
  searchMethods: SearchMethod[];
  runPerformanceTest: () => void;
}

export function SearchSettings({
  searchRadius,
  setSearchRadius,
  nameFilter,
  setNameFilter,
  searchMethod,
  setSearchMethod,
  searchMethods,
  runPerformanceTest,
}: SearchSettingsProps) {
  return (
    <>
      <div>
        <Label className="text-sm font-medium">
          検索範囲: {formatDistance(searchRadius)}
        </Label>
        <Slider
          value={[searchRadius]}
          onValueChange={(value) => setSearchRadius(value[0])}
          min={100}
          max={20000}
          step={100}
          className="mt-2"
        />
      </div>

      <div>
        <Label className="text-sm font-medium">施設名で絞り込み</Label>
        <Input
          placeholder="施設名を入力..."
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="mt-1 text-sm"
        />
      </div>

      <div>
        <Label className="text-sm font-medium">検索手法</Label>
        <Select value={searchMethod} onValueChange={setSearchMethod}>
          <SelectTrigger className="w-full mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3" />
                <span className="text-sm">自動選択（推奨）</span>
              </div>
            </SelectItem>
            {searchMethods.map((method) => (
              <SelectItem value={method.name} key={method.name}>
                <div className="flex items-center gap-2">
                  {method.name.includes("static") && (
                    <Database className="h-3 w-3" />
                  )}
                  <span className="text-sm">{method.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={runPerformanceTest}
        variant="outline"
        size="sm"
        className="w-full"
      >
        <TestTube className="mr-2 h-3 w-3" />
        <span className="text-sm">パフォーマンステスト実行</span>
      </Button>
    </>
  );
}
