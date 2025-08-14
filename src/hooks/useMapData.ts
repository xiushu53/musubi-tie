import { useEffect, useState } from "react";
import type { Facility, GeoJsonData } from "@/types";

export function useMapData(facilityType: string) {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [meshData, setMeshData] = useState<GeoJsonData>(null);
  const [voronoiData, setVoronoiData] = useState<GeoJsonData>(null);
  const [municipalitiesData, setMunicipalitiesData] =
    useState<GeoJsonData>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [facRes, meshRes, vorRes, munRes] = await Promise.all([
          fetch(`/${facilityType}/facilities.json`),
          fetch(`/${facilityType}/mesh.geojson`),
          fetch(`/${facilityType}/voronoi.geojson`),
          fetch("/municipalities.geojson"),
        ]);

        setFacilities(await facRes.json());
        setMeshData(await meshRes.json());
        setVoronoiData(await vorRes.json());
        setMunicipalitiesData(await munRes.json());
      } catch (error) {
        console.error("データの読み込みに失敗しました:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [facilityType]);

  return { facilities, meshData, voronoiData, municipalitiesData, loading };
}
