"use client";

import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { Button } from "@/_components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/_components/ui/card";
import { Input } from "@/_components/ui/input";
import { Label } from "@/_components/ui/label";
import { Textarea } from "@/_components/ui/textarea";
import type { InquiryFormData } from "@/types";

interface InquiryFormProps {
  formData: InquiryFormData;
  onUpdateField: (
    field: keyof Omit<InquiryFormData, "facilityMessages">,
    value: string
  ) => void;
  onSubmit: () => void;
  onBack: () => void;
  isFormValid: boolean;
  facilityCount: number;
}

export function InquiryForm({
  formData,
  onUpdateField,
  onSubmit,
  onBack,
  isFormValid,
  facilityCount,
}: InquiryFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          問い合わせ内容
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="userName" className="text-sm font-medium">
              お名前 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="userName"
              placeholder="山田太郎"
              value={formData.userName}
              onChange={(e) => onUpdateField("userName", e.target.value)}
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
              onChange={(e) => onUpdateField("email", e.target.value)}
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
            onChange={(e) => onUpdateField("phone", e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="commonMessage" className="text-sm font-medium">
            全施設への共通メッセージ <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="commonMessage"
            placeholder="施設の利用を検討しています。見学や相談の予約をお願いします。"
            value={formData.commonMessage}
            onChange={(e) => onUpdateField("commonMessage", e.target.value)}
            className="mt-1 min-h-24"
            rows={4}
          />
          <p className="text-xs text-gray-500 mt-1">
            このメッセージは選択した全ての施設に送信されます
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 sm:flex-none"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            検索に戻る
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!isFormValid}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Send className="h-4 w-4 mr-2" />
            {facilityCount}件の施設に送信
          </Button>
        </div>

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
  );
}
