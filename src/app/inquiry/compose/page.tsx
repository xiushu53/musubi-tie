"use client";

import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ComposePageHeader } from "@/_components/inquiry/ComposePageHeader";
import { InquiryForm } from "@/_components/inquiry/InquiryForm";
import { SelectedFacilitiesList } from "@/_components/inquiry/SelectedFacilitiesList";
import { Card, CardContent } from "@/_components/ui/card";
import { useInquiryForm } from "@/_hooks/useInquiryForm";
import { FACILITY_TYPES } from "@/_settings/visualize-map";
import {
  useInquiryActions,
  useSelectedFacilities,
} from "@/_stores/inquiryStore";
import { formatDistance } from "@/_utils/formatDistance";

export default function InquiryComposePage() {
  const router = useRouter();
  const selectedFacilities = useSelectedFacilities();
  const inquiryActions = useInquiryActions();

  const [isClient, setIsClient] = useState(false);
  const { formData, updateFormData, updateFacilityMessage } = useInquiryForm();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const selectedFacilitiesArray = isClient
    ? Array.from(selectedFacilities.values()).sort(
        (a, b) => a.distance - b.distance
      )
    : [];

  useEffect(() => {
    if (isClient && selectedFacilitiesArray.length === 0) {
      router.push("/search");
    }
  }, [isClient, selectedFacilitiesArray.length, router]);

  const handleRemoveFacility = (facilityId: number) => {
    inquiryActions.deselectFacility(facilityId);
  };

  const handleBack = () => {
    router.push("/search");
  };

  const handleSubmit = () => {
    console.log("📧 問い合わせ送信:", formData);
    console.log("🏢 対象施設:", selectedFacilitiesArray);
    alert(
      `${selectedFacilitiesArray.length}件の施設への問い合わせを送信します！`
    );
  };

  const isFormValid = !!(
    formData.userName &&
    formData.email &&
    formData.commonMessage
  );

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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-2 sm:p-4 max-w-4xl">
        <ComposePageHeader
          onBack={handleBack}
          facilityCount={selectedFacilitiesArray.length}
        />

        <div className="space-y-6">
          <SelectedFacilitiesList
            selectedFacilities={selectedFacilitiesArray}
            facilityMessages={formData.facilityMessages}
            onFacilityMessageChange={updateFacilityMessage}
            onRemoveFacility={handleRemoveFacility}
          />

          {selectedFacilitiesArray.length > 0 && (
            <InquiryForm
              formData={formData}
              onUpdateField={updateFormData}
              onSubmit={handleSubmit}
              onBack={handleBack}
              isFormValid={isFormValid}
              facilityCount={selectedFacilitiesArray.length}
            />
          )}

          {/* Summary Card (kept here for simplicity for now) */}
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
                        `${formatDistance(
                          Math.min(
                            ...selectedFacilitiesArray.map((s) => s.distance)
                          )
                        )} 〜 ${formatDistance(
                          Math.max(
                            ...selectedFacilitiesArray.map((s) => s.distance)
                          )
                        )}`}
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
  );
}
