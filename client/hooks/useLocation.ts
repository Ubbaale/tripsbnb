import { useState, useEffect, useCallback } from "react";
import * as Location from "expo-location";

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export interface UseLocationReturn {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  permissionStatus: Location.PermissionStatus | null;
  requestPermission: () => Promise<boolean>;
  refreshLocation: () => Promise<void>;
}

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);

  const getLocationDetails = async (latitude: number, longitude: number) => {
    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address) {
        return {
          city: address.city || address.subregion || address.region || undefined,
          country: address.country || undefined,
        };
      }
    } catch (err) {
      console.log("Reverse geocoding failed:", err);
    }
    return { city: undefined, country: undefined };
  };

  const fetchLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const details = await getLocationDetails(coords.latitude, coords.longitude);

      setLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        ...details,
      });
    } catch (err) {
      setError("Could not get your location");
      console.log("Location error:", err);
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status === Location.PermissionStatus.GRANTED) {
        await fetchLocation();
        return true;
      }
      return false;
    } catch (err) {
      setError("Could not request location permission");
      return false;
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    if (permissionStatus === Location.PermissionStatus.GRANTED) {
      await fetchLocation();
    }
  }, [permissionStatus]);

  useEffect(() => {
    const checkPermission = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status === Location.PermissionStatus.GRANTED) {
        await fetchLocation();
      }
    };

    checkPermission();
  }, []);

  return {
    location,
    loading,
    error,
    permissionStatus,
    requestPermission,
    refreshLocation,
  };
}
