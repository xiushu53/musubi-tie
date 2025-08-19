// src/stores/inquiryStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { FACILITY_TYPES } from "@/_settings/visualize-map";
import type { Facility } from "@/types";

// 最新の検索情報
export interface CurrentSearch {
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  facilityType: string;
  searchRadius: number;
  displayName: string; // "渋谷駅周辺 (放課後等デイサービス)" など
}

// 選択された施設の情報
export interface SelectedFacility {
  facility: Facility;
  selectedAt: Date; // 選択された時刻
  distance: number; // 選択時の検索地点からの距離
  searchInfo: CurrentSearch; // 選択時の検索情報
}

// ストアの状態
interface InquiryState {
  // 現在の検索情報
  currentSearch: CurrentSearch | null;

  // 選択施設管理（後勝ち）
  selectedFacilities: Map<number, SelectedFacility>; // facilityId -> SelectedFacility

  // UI状態
  isInquiryMode: boolean; // 問い合わせモードかどうか

  // アクション
  actions: {
    // 検索情報更新
    updateCurrentSearch: (
      location: CurrentSearch["location"],
      facilityType: string,
      searchRadius: number
    ) => void;

    // 施設選択関連
    toggleFacilitySelection: (facility: Facility, distance: number) => void;
    selectFacility: (facility: Facility, distance: number) => void;
    deselectFacility: (facilityId: number) => void;
    clearAllSelections: () => void;

    // 問い合わせモード制御
    setInquiryMode: (mode: boolean) => void;

    // 便利メソッド
    getSelectedCount: () => number;
    getSelectedFacilities: () => SelectedFacility[];
    isFacilitySelected: (facilityId: number) => boolean;
  };
}

// Zustandストアの作成
export const useInquiryStore = create<InquiryState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初期状態
        currentSearch: null,
        selectedFacilities: new Map(),
        isInquiryMode: false,

        actions: {
          // 現在の検索情報を更新
          updateCurrentSearch: (location, facilityType, searchRadius) => {
            const facilityTypeLabel = getFacilityTypeLabel(facilityType);
            const locationName = formatLocationName(location);

            const searchInfo: CurrentSearch = {
              location,
              facilityType,
              searchRadius,
              displayName: `${locationName} (${facilityTypeLabel})`,
            };

            set({ currentSearch: searchInfo });
          },

          // 施設選択の切り替え（後勝ち）
          toggleFacilitySelection: (facility, distance) => {
            const state = get();
            const currentSearch = state.currentSearch;

            if (!currentSearch) {
              console.error("検索情報が設定されていません");
              return;
            }

            const selectedFacilities = new Map(state.selectedFacilities);

            if (selectedFacilities.has(facility.id)) {
              // 選択解除
              selectedFacilities.delete(facility.id);
            } else {
              // 新規選択（後勝ち：既存があれば上書き）
              selectedFacilities.set(facility.id, {
                facility,
                selectedAt: new Date(),
                distance,
                searchInfo: { ...currentSearch }, // 現在の検索情報をコピー
              });
            }

            set({ selectedFacilities });
          },

          // 施設を選択（後勝ち）
          selectFacility: (facility, distance) => {
            const state = get();
            const currentSearch = state.currentSearch;

            if (!currentSearch) return;

            const selectedFacilities = new Map(state.selectedFacilities);
            selectedFacilities.set(facility.id, {
              facility,
              selectedAt: new Date(),
              distance,
              searchInfo: { ...currentSearch },
            });

            set({ selectedFacilities });
          },

          // 施設の選択を解除
          deselectFacility: (facilityId) => {
            const selectedFacilities = new Map(get().selectedFacilities);
            selectedFacilities.delete(facilityId);
            set({ selectedFacilities });
          },

          // 全選択解除
          clearAllSelections: () => {
            set({ selectedFacilities: new Map() });
          },

          // 問い合わせモード設定
          setInquiryMode: (mode) => {
            set({ isInquiryMode: mode });
          },

          // 選択数を取得
          getSelectedCount: () => {
            return get().selectedFacilities.size;
          },

          // 全選択施設を取得（配列形式）
          getSelectedFacilities: () => {
            return Array.from(get().selectedFacilities.values());
          },

          // 施設が選択されているかチェック
          isFacilitySelected: (facilityId) => {
            return get().selectedFacilities.has(facilityId);
          },
        },
      }),
      {
        name: "inquiry-store", // localStorageキー
        partialize: (state) => ({
          // 永続化する項目を選択
          currentSearch: state.currentSearch,
          selectedFacilities: Array.from(state.selectedFacilities.entries()),
        }),
        onRehydrateStorage: () => (state) => {
          // 復元時にMapオブジェクトとDateオブジェクトを再構築
          if (state) {
            state.selectedFacilities = new Map(state.selectedFacilities as any);

            // selectedAtをDateオブジェクトに復元
            state.selectedFacilities.forEach((selectedInfo) => {
              if (typeof selectedInfo.selectedAt === "string") {
                selectedInfo.selectedAt = new Date(selectedInfo.selectedAt);
              }
            });
          }
        },
      }
    ),
    { name: "inquiry-store" }
  )
);

// フック型のアクセサー（使いやすさのため）
export const useInquiryActions = () =>
  useInquiryStore((state) => state.actions);
export const useSelectedFacilities = () =>
  useInquiryStore((state) => state.selectedFacilities);
export const useCurrentSearch = () =>
  useInquiryStore((state) => state.currentSearch);
export const useInquiryMode = () =>
  useInquiryStore((state) => state.isInquiryMode);

// ヘルパー関数
function getFacilityTypeLabel(facilityType: string): string {
  return (
    FACILITY_TYPES.find((type) => type.value === facilityType)?.label ||
    facilityType
  );
}

function formatLocationName(location: CurrentSearch["location"]): string {
  // 簡易的な地名表示（実際には逆ジオコーディングAPIを使用することも可能）
  const lat = location.latitude.toFixed(3);
  const lon = location.longitude.toFixed(3);
  return `${lat}, ${lon}`;
}
