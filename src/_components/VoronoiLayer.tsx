import { GeoJSON, LayersControl } from 'react-leaflet';
import { GeoJsonData } from '@/types';

interface Props {
  data: GeoJsonData;
}

export default function VoronoiLayer({ data }: Props) {
  return (
    <LayersControl.BaseLayer name="ボロノイ領域">
      <GeoJSON
        data={data}
        style={{ color: 'purple', weight: 2, fillOpacity: 0.1 }}
      />
    </LayersControl.BaseLayer>
  );
}
