import { AdvancedMarker, APIProvider, InfoWindow, Map, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";

import type { Impact, NeedCell, Project, Suggestion } from "../api";
import NeedLayer from "./NeedLayer";

const CHAPEL_HILL = { lat: 35.9304, lng: -79.0455 };

interface Pin extends Impact {
  key: string;
  title: string;
  description?: string;
  kind: string; // project status, or "suggested"
  lat: number;
  lng: number;
  budget: number | null;
  district: string;
}

const toPins = (projects: Project[], suggestions: Suggestion[]): Pin[] => [
  ...projects.map((p) => ({ ...p, key: `p${p.id}`, kind: p.status, budget: p.budget_usd })),
  ...suggestions.map((s, i) => ({ ...s, key: `s${i}`, kind: "suggested", budget: s.budget_usd })),
];

interface Props {
  projects: Project[];
  suggestions: Suggestion[];
  needCells: NeedCell[];
  needColor: string;
  focus: { lat: number; lng: number } | null;
}

function FlyTo({ focus }: { focus: Props["focus"] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !focus) return;
    map.panTo(focus);
    map.setZoom(16);
  }, [map, focus]);
  return null;
}

export default function MapView({ projects, suggestions, needCells, needColor, focus }: Props) {
  const [selected, setSelected] = useState<Pin | null>(null);
  const pins = toPins(projects, suggestions);

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ""}>
      <Map
        className="map"
        mapId={import.meta.env.VITE_GOOGLE_MAP_ID ?? "DEMO_MAP_ID"}
        defaultCenter={CHAPEL_HILL}
        defaultZoom={13}
        mapTypeId="hybrid"
        gestureHandling="greedy"
        disableDefaultUI
      >
        <NeedLayer cells={needCells} color={needColor} />
        <FlyTo focus={focus} />
        {pins.map((pin) => (
          <AdvancedMarker key={pin.key} position={pin} onClick={() => setSelected(pin)}>
            <div className={`orb orb-${pin.kind}`} title={pin.title} />
          </AdvancedMarker>
        ))}
        {selected && (
          <InfoWindow position={selected} onCloseClick={() => setSelected(null)}>
            <div className="info">
              <strong>{selected.title}</strong>
              <div>
                {selected.kind.replace("_", " ")} · {selected.district} ·{" "}
                {selected.budget == null ? "budget not published" : `$${selected.budget.toLocaleString()}`}
              </div>
              {selected.description && <div>{selected.description}</div>}
              {selected.approval_prob != null && (
                <ul>
                  <li>Council-goal alignment: {Math.round(selected.approval_prob * 100)}/100</li>
                  <li>Canopy (NDVI): {selected.delta_ndvi! >= 0 ? "+" : ""}{selected.delta_ndvi}</li>
                  <li>Surface temp: {selected.delta_lst_f} °F</li>
                  <li>Residents within 500 m: {selected.constituents_affected?.toLocaleString()}</li>
                </ul>
              )}
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}
