import { GeoJSON, LayersControl } from 'react-leaflet';
import { GeoJsonData } from '@/types';

interface Props {
  data: GeoJsonData;
}

export default function MunicipalitiesLayer({ data }: Props) {
  return (
    <LayersControl.Overlay checked name="市区町村 境界線">
      <GeoJSON
        data={data}
        style={{
          color: 'black',
          weight: 1,
          dashArray: '5, 5',
          fillOpacity: 0.0,
        }}
        onEachFeature={(feature, layer) => {
          if (feature.properties && feature.properties.ward_ja) {
            layer.bindPopup(feature.properties.ward_ja);
          }
        }}
      />
    </LayersControl.Overlay>
  );
}
