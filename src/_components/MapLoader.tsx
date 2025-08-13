'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

export default function MapLoader({ facilityType }: { facilityType: string }) {
  // useMemoを使って、VisualizeMapコンポーネントの動的インポートが再レンダリングのたびに再生成されるのを防ぎます。
  const VisualizeMap = useMemo(
    () =>
      dynamic(() => import('@/_components/VisualizeMap'), {
        loading: () => (
          <p className="flex h-full items-center justify-center">
            地図を読み込んでいます...
          </p>
        ),
        ssr: false,
      }),
    []
  );

  return <VisualizeMap facilityType={facilityType} />;
}
