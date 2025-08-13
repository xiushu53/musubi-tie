'use client';

import { useState } from 'react';
import MapLoader from '@/_components/MapLoader';

export default function FacilitySelectorClient() {
  const [selectedFacilityType, setSelectedFacilityType] = useState('asds');

  const handleFacilityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFacilityType(event.target.value);
  };

  return (
    <div className="h-screen w-screen flex flex-col">
      <div className="p-4 bg-gray-100">
        <label htmlFor="facility-select" className="mr-2">施設タイプを選択:</label>
        <select
          id="facility-select"
          value={selectedFacilityType}
          onChange={handleFacilityChange}
          className="p-2 border rounded"
        >
          <option value="asds">放課後等デイサービス</option>
          <option value="sept-b">就労継続支援B</option>
          <option value="pco">計画相談事業所</option>
        </select>
      </div>
      <div className="flex-grow">
        <MapLoader facilityType={selectedFacilityType} />
      </div>
    </div>
  );
}
