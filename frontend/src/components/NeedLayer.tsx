import { useMap } from "@vis.gl/react-google-maps";
import { useEffect } from "react";

import type { NeedCell } from "../api";

// Draws the highest-need 100 m cells as translucent squares; stronger colour = higher need.
export default function NeedLayer({ cells, color }: { cells: NeedCell[]; color: string }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const rects = cells.map(
      (c) =>
        new google.maps.Rectangle({
          map,
          bounds: { south: c.south, north: c.north, west: c.west, east: c.east },
          strokeWeight: 0,
          fillColor: color,
          fillOpacity: 0.08 + 0.5 * c.score ** 3,
          clickable: false,
        }),
    );
    return () => rects.forEach((r) => r.setMap(null));
  }, [map, cells, color]);

  return null;
}
