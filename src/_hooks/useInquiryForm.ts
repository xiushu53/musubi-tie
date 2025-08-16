import { useState } from "react";
import type { InquiryFormData } from "@/types";

const initialFormData: InquiryFormData = {
  userName: "",
  email: "",
  phone: "",
  commonMessage: "",
  facilityMessages: {},
};

export const useInquiryForm = (
  initialState: InquiryFormData = initialFormData
) => {
  const [formData, setFormData] = useState<InquiryFormData>(initialState);

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

  return {
    formData,
    updateFormData,
    updateFacilityMessage,
  };
};
