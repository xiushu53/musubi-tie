"use client";

import { Badge } from "@/_components/ui/badge";
import { Button } from "@/_components/ui/button";

interface InquiryActionBarProps {
  selectedCount: number;
  onClearAll: () => void;
  onStartInquiry: () => void;
}

export function InquiryActionBar({
  selectedCount,
  onClearAll,
  onStartInquiry,
}: InquiryActionBarProps) {
  return (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-blue-600">
            {selectedCount}件選択中
          </Badge>
          <span className="text-sm text-blue-800">問い合わせ可能</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            className="flex-1 sm:flex-none"
          >
            全解除
          </Button>
          <Button
            size="sm"
            onClick={onStartInquiry}
            className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
          >
            {selectedCount}件に問い合わせる
          </Button>
        </div>
      </div>
    </div>
  );
}
