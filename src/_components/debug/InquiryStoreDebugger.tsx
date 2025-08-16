import { useEffect, useState } from "react";
import { useInquiryStore } from "@/_stores/inquiryStore";

export default function InquiryStoreDebugger() {
  const store = useInquiryStore();
  const [isClient, setIsClient] = useState(false);

  // ハイドレーション完了後にのみ表示
  useEffect(() => {
    setIsClient(true);
  }, []);

  // クライアントサイドでのみレンダリング
  if (!isClient) {
    return (
      <div className="p-4 bg-gray-900 text-green-400 font-mono text-sm">
        <div className="text-yellow-400 font-bold">
          🔄 デバッガー初期化中...
        </div>
      </div>
    );
  }

  // 選択施設の配列表示用
  const selectedFacilitiesArray = Array.from(
    store.selectedFacilities.entries()
  );

  return (
    <div className="p-4 bg-gray-900 text-green-400 font-mono text-sm max-h-96 overflow-auto">
      <div className="mb-4">
        <h3 className="text-yellow-400 font-bold mb-2">
          🔍 InquiryStore State Debug
        </h3>
        <div className="text-xs text-gray-400">
          リアルタイム更新 - {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* 現在の検索情報 */}
      <div className="mb-4">
        <div className="text-cyan-400 font-semibold">📍 Current Search:</div>
        {store.currentSearch ? (
          <div className="ml-4 space-y-1">
            <div>
              📍 Location: {store.currentSearch.location.latitude.toFixed(6)},{" "}
              {store.currentSearch.location.longitude.toFixed(6)}
            </div>
            <div>🏢 Facility Type: {store.currentSearch.facilityType}</div>
            <div>📏 Search Radius: {store.currentSearch.searchRadius}m</div>
            <div>🏷️ Display Name: "{store.currentSearch.displayName}"</div>
            {store.currentSearch.location.accuracy && (
              <div>
                🎯 Accuracy: {Math.round(store.currentSearch.location.accuracy)}
                m
              </div>
            )}
          </div>
        ) : (
          <div className="ml-4 text-red-400">❌ NULL (未設定)</div>
        )}
      </div>

      {/* 選択施設一覧 */}
      <div className="mb-4">
        <div className="text-cyan-400 font-semibold">
          ✅ Selected Facilities ({store.selectedFacilities.size}):
        </div>
        {selectedFacilitiesArray.length > 0 ? (
          <div className="ml-4 space-y-2">
            {selectedFacilitiesArray.map(([facilityId, selectedInfo]) => (
              <div
                key={facilityId}
                className="border border-gray-600 p-2 rounded"
              >
                <div className="text-yellow-300">🏢 ID: {facilityId}</div>
                <div className="text-white">
                  📝 Name: "{selectedInfo.facility.name}"
                </div>
                <div className="text-gray-300">
                  📍 Address: {selectedInfo.facility.address}
                </div>
                <div className="text-blue-300">
                  📏 Distance: {selectedInfo.distance.toFixed(0)}m
                </div>
                <div className="text-green-300">
                  🕐 Selected At: {selectedInfo.selectedAt.toLocaleString()}
                </div>
                <div className="text-purple-300">
                  🔍 From Search: "{selectedInfo.searchInfo.displayName}"
                </div>
                <div className="text-orange-300">
                  📍 Search Location:{" "}
                  {selectedInfo.searchInfo.location.latitude.toFixed(4)},{" "}
                  {selectedInfo.searchInfo.location.longitude.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ml-4 text-red-400">❌ 選択なし</div>
        )}
      </div>

      {/* UI状態 */}
      <div className="mb-4">
        <div className="text-cyan-400 font-semibold">🎛️ UI State:</div>
        <div className="ml-4">
          <div>📋 Inquiry Mode: {store.isInquiryMode ? "✅ ON" : "❌ OFF"}</div>
        </div>
      </div>

      {/* アクション実行ボタン */}
      <div className="space-y-2">
        <div className="text-cyan-400 font-semibold">🎮 Quick Actions:</div>
        <div className="ml-4 space-y-1">
          <button
            type="button"
            onClick={() => store.actions.clearAllSelections()}
            className="bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white text-xs mr-2"
          >
            🗑️ Clear All
          </button>
          <button
            type="button"
            onClick={() => store.actions.setInquiryMode(!store.isInquiryMode)}
            className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white text-xs mr-2"
          >
            🔄 Toggle Inquiry Mode
          </button>
          <button
            type="button"
            onClick={() => console.log("Store State:", store)}
            className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-white text-xs"
          >
            📊 Log to Console
          </button>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="mt-4 pt-4 border-t border-gray-600">
        <div className="text-cyan-400 font-semibold">📊 Statistics:</div>
        <div className="ml-4 space-y-1">
          <div>Total Selected: {store.actions.getSelectedCount()}</div>
          <div>Has Current Search: {store.currentSearch ? "✅" : "❌"}</div>
          <div>
            Store Ready:{" "}
            {store.currentSearch && store.selectedFacilities ? "✅" : "❌"}
          </div>
        </div>
      </div>
    </div>
  );
}
