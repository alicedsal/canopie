import { useEffect, useState } from "react";

import {
  getNeed, getProjects, getSuggestions, getSurvey, postFeedback,
  type Mode, type NeedCell, type NeedDomain, type Project, type Suggestion, type SurveyItem,
} from "./api";
import MapView from "./components/MapView";

const LEGEND = ["completed", "in_progress", "proposed", "rejected", "suggested"];

const NEED_LAYERS: { key: NeedDomain | "off"; label: string; color: string }[] = [
  { key: "off", label: "Off", color: "" },
  { key: "overall", label: "Overall", color: "#c86bff" },
  { key: "heat", label: "Heat", color: "#ff5a36" },
  { key: "canopy", label: "Low canopy", color: "#ffc531" },
  { key: "flood", label: "Flood", color: "#19a9e5" },
  { key: "lighting", label: "Dark streets", color: "#3b3f8f" },
];

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [budget, setBudget] = useState(2_000_000);
  const [horizon, setHorizon] = useState(12);
  const [mode, setMode] = useState<Mode>("balanced");
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [needLayer, setNeedLayer] = useState<NeedDomain | "off">("off");
  const [needCells, setNeedCells] = useState<NeedCell[]>([]);
  const [survey, setSurvey] = useState<SurveyItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getProjects().then(setProjects).catch((e) => setError(String(e)));
    getSurvey().then((r) => setSurvey(r.items)).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    getSuggestions(budget, horizon, mode)
      .then((r) => setSuggestions(r.suggestions))
      .catch((e) => setError(String(e)));
  }, [budget, horizon, mode, refresh]);

  useEffect(() => {
    if (needLayer === "off") {
      setNeedCells([]);
      return;
    }
    getNeed(needLayer).then((r) => setNeedCells(r.cells)).catch((e) => setError(String(e)));
  }, [needLayer]);

  async function sendFeedback() {
    if (!feedback.trim() || sending) return;
    setSending(true);
    setSent("");
    try {
      const r = await postFeedback(feedback);
      const mood = r.sentiment > 0.2 ? "positive" : r.sentiment < -0.2 ? "negative" : "neutral";
      setSent(`Logged: ${r.topics.join(", ").replace(/_/g, " ")} · ${r.district ?? "no district"} · ${mood}`);
      setFeedback("");
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(String(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="shell">
      <MapView
        projects={projects}
        suggestions={suggestions}
        needCells={needCells}
        needColor={NEED_LAYERS.find((l) => l.key === needLayer)?.color ?? ""}
      />

      <aside className="glass sidebar">
        <h1>Canopy</h1>
        <p className="tagline">Chapel Hill, planned in the open.</p>
        {error && <p className="error">{error}</p>}

        <section>
          <h2>Where the need is</h2>
          <div className="chips">
            {NEED_LAYERS.map((l) => (
              <button key={l.key} className={needLayer === l.key ? "aero on" : "aero"}
                onClick={() => setNeedLayer(l.key)}>
                {l.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>Next period</h2>
          <label>
            Budget: ${(budget / 1e6).toFixed(1)}M
            <input type="range" min={250_000} max={22_000_000} step={250_000} value={budget}
              onChange={(e) => setBudget(Number(e.target.value))} />
          </label>
          <label>
            Time span: {horizon} months
            <input type="range" min={3} max={36} step={3} value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))} />
          </label>
          <div className="toggle">
            <button className={mode === "balanced" ? "aero on" : "aero"} onClick={() => setMode("balanced")}>
              Best impact
            </button>
            <button className={mode === "constituent" ? "aero on" : "aero"} onClick={() => setMode("constituent")}>
              Constituent voice
            </button>
          </div>
        </section>

        <section>
          <h2>Suggested projects</h2>
          {suggestions.length === 0 && <p>Nothing fits this budget and time span.</p>}
          <ul className="cards">
            {suggestions.map((s) => (
              <li key={s.title} className="glass card">
                <strong>{s.title}</strong>
                <span>
                  ${s.town_cost_usd.toLocaleString()} town cost · {s.months} mo ·{" "}
                  alignment {Math.round((s.approval_prob ?? 0) * 100)}/100
                </span>
                <span>
                  {s.constituents_affected?.toLocaleString()} residents · {s.constituent_mentions} asked for this
                </span>
                {mode === "constituent" && s.survey && (
                  <span>
                    2026 survey: {s.survey.priority} priority · {s.survey.importance}% want more emphasis ·{" "}
                    {s.survey.satisfaction}% satisfied
                  </span>
                )}
                <span>
                  Ranked on:{" "}
                  {Object.entries(s.contributions).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
                    .slice(0, 3).map(([k]) => k).join(", ") || "resident demand"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {mode === "constituent" && (
          <section>
            <h2>What residents said (2026 survey, 421 households)</h2>
            <ul className="cards">
              {survey.map((s) => (
                <li key={s.item} className="glass card">
                  <strong>{s.label}: {s.priority}</strong>
                  <span>{s.item}</span>
                  <span>{s.importance}% want more emphasis · {s.satisfaction}% satisfied</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2>Tell the town</h2>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
            placeholder="What should change on your street?" rows={3} />
          <button className="aero on" onClick={sendFeedback} disabled={sending}>
            {sending ? "Sending…" : "Send"}
          </button>
          {sent && <p className="sent">{sent}</p>}
        </section>

        <footer className="legend">
          {LEGEND.map((k) => (
            <span key={k}><i className={`orb orb-${k}`} /> {k.replace("_", " ")}</span>
          ))}
        </footer>
      </aside>
    </div>
  );
}
