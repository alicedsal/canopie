import React, { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { LatLng } from '../types';

interface MapViewportControllerProps {
  targetLocation: LatLng | null;
  targetZoom?: number;
}

export const MapViewportController: React.FC<MapViewportControllerProps> = ({
  targetLocation,
  targetZoom = 15,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !targetLocation) return;

    map.panTo(targetLocation);
    if (targetZoom) {
      map.setZoom(targetZoom);
    }
  }, [map, targetLocation, targetZoom]);

  return null;
};
