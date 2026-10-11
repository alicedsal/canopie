import { useEffect, useState } from "react";

import { getProjects, getSuggestions, postFeedback, type Mode, type Project, type Suggestion } from "./api";
import MapView from "./components/MapView";

const LEGEND = ["completed", "in_progress", "proposed", "rejected", "suggested"];

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [budget, setBudget] = useState(2_000_000);
  const [horizon, setHorizon] = useState(12);
  const [mode, setMode] = useState<Mode>("balanced");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getProjects().then(setProjects).catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    getSuggestions(budget, horizon, mode)
      .then((r) => setSuggestions(r.suggestions))
      .catch((e) => setError(String(e)));
  }, [budget, horizon, mode]);

  async function sendFeedback() {
    if (!feedback.trim()) return;
    await postFeedback(feedback).catch((e) => setError(String(e)));
    setFeedback("");
  }

  return (
    <div className="shell">
      <MapView projects={projects} suggestions={suggestions} />

      <aside className="glass sidebar">
        <h1>Canopy</h1>
        <p className="tagline">Chapel Hill, planned in the open.</p>
        {error && <p className="error">{error}</p>}

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
                  {s.constituents_affected?.toLocaleString()} residents · {s.constituent_mentions} asked for this ·{" "}
                  satisfaction {s.survey_delta_pct.overall >= 0 ? "+" : ""}{s.survey_delta_pct.overall} pts
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>Tell the town</h2>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
            placeholder="What should change on your street?" rows={3} />
          <button className="aero on" onClick={sendFeedback}>Send</button>
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
