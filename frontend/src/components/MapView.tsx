import { AdvancedMarker, APIProvider, InfoWindow, Map } from "@vis.gl/react-google-maps";
import { useState } from "react";

import type { Impact, NeedCell, Project, Suggestion } from "../api";
import NeedLayer from "./NeedLayer";

const CHAPEL_HILL = { lat: 35.9304, lng: -79.0455 };

interface Pin extends Impact {
  key: string;
  title: string;
  kind: string; // project status, or "suggested"
  lat: number;
  lng: number;
  budget: number;
  district: string;
}

const toPins = (projects: Project[], suggestions: Suggestion[]): Pin[] => [
  ...projects.map((p) => ({ ...p, key: `p${p.id}`, kind: p.status, budget: Number(p.budget_usd) })),
  ...suggestions.map((s, i) => ({ ...s, key: `s${i}`, kind: "suggested", budget: s.budget_usd })),
];

interface Props {
  projects: Project[];
  suggestions: Suggestion[];
  needCells: NeedCell[];
  needColor: string;
}

export default function MapView({ projects, suggestions, needCells, needColor }: Props) {
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
                {selected.kind.replace("_", " ")} · {selected.district} · ${selected.budget.toLocaleString()}
              </div>
              {selected.approval_prob != null && (
                <ul>
                  <li>Council-goal alignment: {Math.round(selected.approval_prob * 100)}/100</li>
                  <li>Canopy (NDVI): {selected.delta_ndvi! >= 0 ? "+" : ""}{selected.delta_ndvi}</li>
                  <li>Surface temp: {selected.delta_lst_f} °F</li>
                  <li>Residents affected: {selected.constituents_affected?.toLocaleString()}</li>
                </ul>
              )}
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}
