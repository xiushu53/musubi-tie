"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/_components/ui/button";

interface ComposePageHeaderProps {
  onBack: () => void;
  facilityCount: number;
}

export function ComposePageHeader({
  onBack,
  facilityCount,
}: ComposePageHeaderProps) {
  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
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
            選択した{facilityCount}件の施設に一斉問い合わせ
          </p>
        </div>
      </div>
    </div>
  );
}
