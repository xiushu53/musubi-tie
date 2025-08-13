'use client';

import { useState } from 'react';
import MapLoader from '@/_components/MapLoader';

export default function FacilitySelectorClient() {
  const [selectedFacilityType, setSelectedFacilityType] = useState('asds');

  const handleFacilityChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setSelectedFacilityType(event.target.value);
  };

  return (
    <div className="flex h-screen w-screen flex-col">
      <div className="bg-gray-100 p-4">
        <label htmlFor="facility-select" className="mr-2">
          施設タイプを選択:
        </label>
        <select
          id="facility-select"
          value={selectedFacilityType}
          onChange={handleFacilityChange}
          className="rounded border p-2"
        >
          <option value="asds">放課後等デイサービス</option>
          <option value="sept-a">就労継続支援A</option>
          <option value="sept-b">就労継続支援B</option>
          <option value="pco">計画相談事業所</option>
          <option value="ccd">障害児相談支援事業所</option>
        </select>
      </div>
      <div className="flex-grow">
        <MapLoader facilityType={selectedFacilityType} />
      </div>
    </div>
  );
}
