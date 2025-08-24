"use client";

import { useCallback, useState } from "react";
import type { UserLocation } from "@/types";

export function useLocation() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [address, setAddress] = useState<string>("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(() => {
    setIsGettingLocation(true);
    setLocationError(null);
    setGeocodingError(null);

    if (!navigator.geolocation) {
      setLocationError("このブラウザでは位置情報がサポートされていません");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsGettingLocation(false);
      },
      (error) => {
        let errorMessage = "位置情報の取得に失敗しました";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "位置情報の使用が許可されていません";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "位置情報が利用できません";
            break;
          case error.TIMEOUT:
            errorMessage = "位置情報の取得がタイムアウトしました";
            break;
        }
        setLocationError(errorMessage);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  const handleAddressSearch = useCallback(async () => {
    if (!address) {
      setGeocodingError("住所を入力してください");
      return;
    }
    setIsGeocoding(true);
    setGeocodingError(null);
    setLocationError(null);

    try {
      const response = await fetch(
        `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(
          address
        )}`
      );
      if (!response.ok) {
        throw new Error("ジオコーディングサーバーとの通信に失敗しました");
      }
      const data = await response.json();
      if (data.length === 0 || !data[0].geometry?.coordinates) {
        throw new Error("指定された住所の座標が見つかりませんでした。");
      }
      const [longitude, latitude] = data[0].geometry.coordinates;
      setUserLocation({ latitude, longitude });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "不明なエラーが発生しました";
      setGeocodingError(message);
      setUserLocation(null);
    } finally {
      setIsGeocoding(false);
    }
  }, [address]);

  return {
    userLocation,
    isGettingLocation,
    locationError,
    getCurrentLocation,
    address,
    setAddress,
    isGeocoding,
    geocodingError,
    handleAddressSearch,
  };
}
