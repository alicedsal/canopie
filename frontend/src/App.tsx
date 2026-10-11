import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

import {
  addProposal, getDistricts, getFeedback, getMetrics, getNeed, getProjects, getSuggestions, getSurvey,
  postFeedback, postRationale,
  type District, type FeedbackItem, type MetricPoint, type Mode, type NeedCell, type NeedDomain,
  type Project, type Suggestion, type SurveyItem,
} from "./api";
import MapView from "./components/MapView";
import Sparkline from "./components/Sparkline";

const STATUSES = ["completed", "in_progress", "proposed", "rejected", "suggested"];

const NEED_LAYERS: { key: NeedDomain | "off"; label: string; color: string }[] = [
  { key: "off", label: "Off", color: "" },
  { key: "overall", label: "Overall", color: "#c86bff" },
  { key: "heat", label: "Heat", color: "#ff5a36" },
  { key: "canopy", label: "Low canopy", color: "#ffc531" },
  { key: "flood", label: "Flood", color: "#19a9e5" },
  { key: "lighting", label: "Dark streets", color: "#3b3f8f" },
];

// The agent's phone number, from the Photon dashboard. Set VITE_AGENT_NUMBER in .env.local.
const AGENT_NUMBER: string = import.meta.env.VITE_AGENT_NUMBER ?? "";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [lists, setLists] = useState<Record<Mode, Suggestion[]>>({ balanced: [], constituent: [] });
  const [spent, setSpent] = useState(0);
  const [budget, setBudget] = useState(2_000_000);
  const [horizon, setHorizon] = useState(12);
  const [mode, setMode] = useState<Mode>("balanced");
  const [hidden, setHidden] = useState<string[]>([]);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [needLayer, setNeedLayer] = useState<NeedDomain | "off">("off");
  const [needCells, setNeedCells] = useState<NeedCell[]>([]);
  const [survey, setSurvey] = useState<SurveyItem[]>([]);
  const [voices, setVoices] = useState<FeedbackItem[]>([]);
  const [gauge, setGauge] = useState<MetricPoint[]>([]);
  const [error, setError] = useState("");

  const fail = (e: unknown) => setError(String(e));
  const suggestions = lists[mode];
  const other = lists[mode === "balanced" ? "constituent" : "balanced"];

  useEffect(() => {
    getProjects().then(setProjects).catch(fail);
    getSurvey().then((r) => setSurvey(r.items)).catch(fail);
    getDistricts()
      .then((ds) => {
        setDistricts(ds);
        const booker = ds.find((d) => d.name === "Booker Creek");
        if (booker) getMetrics(booker.id, "gauge_height_ft", 30).then(setGauge).catch(() => {});
      })
      .catch(fail);
  }, []);

  // Both lists are fetched so each card can say whether the other mode agrees.
  useEffect(() => {
    Promise.all([getSuggestions(budget, horizon, "balanced"), getSuggestions(budget, horizon, "constituent")])
      .then(([b, c]) => {
        setLists({ balanced: b.suggestions, constituent: c.suggestions });
        setSpent(mode === "balanced" ? b.spent : c.spent);
      })
      .catch(fail);
  }, [budget, horizon, mode, refresh]);

  // Poll the feed so a text sent to the agent shows up without a reload; when a new
  // message arrives, the suggestions are recomputed too.
  useEffect(() => {
    let newest = "";
    const load = () =>
      getFeedback()
        .then((items) => {
          setVoices(items);
          const top = items[0]?.id ?? "";
          if (newest && top !== newest) setRefresh((n) => n + 1);
          newest = top;
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (needLayer === "off") {
      setNeedCells([]);
      return;
    }
    getNeed(needLayer).then((r) => setNeedCells(r.cells)).catch(fail);
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
      getFeedback().then(setVoices).catch(() => {});
    } catch (e) {
      fail(e);
    } finally {
      setSending(false);
    }
  }

  async function explain(s: Suggestion) {
    setRationales((r) => ({ ...r, [s.title]: "Asking Gemini…" }));
    const text = await postRationale(s).catch(() => "Could not reach Gemini.");
    setRationales((r) => ({ ...r, [s.title]: text }));
  }

  async function propose(s: Suggestion) {
    await addProposal(s).catch(fail);
    setAdded((a) => [...a, s.title]);
    getProjects().then(setProjects).catch(fail);
  }

  const toggleStatus = (k: string) => setHidden((h) => (h.includes(k) ? h.filter((x) => x !== k) : [...h, k]));

  return (
    <div className="shell">
      <MapView
        projects={projects.filter((p) => !hidden.includes(p.status))}
        suggestions={hidden.includes("suggested") ? [] : suggestions}
        needCells={needCells}
        needColor={NEED_LAYERS.find((l) => l.key === needLayer)?.color ?? ""}
        focus={focus}
      />

      <aside className="glass sidebar">
        <h1>Canopy</h1>
        <p className="tagline">Chapel Hill, planned in the open.</p>
        {error && <p className="error">{error}</p>}

        <section>
          <h2>Go to</h2>
          <div className="chips">
            {districts.map((d) => (
              <button key={d.id} className="aero" onClick={() => setFocus({ lat: d.lat, lng: d.lng })}>
                {d.name}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>Show on map</h2>
          <div className="chips">
            {STATUSES.map((k) => (
              <button key={k} className={hidden.includes(k) ? "aero" : "aero on"} onClick={() => toggleStatus(k)}>
                <i className={`orb orb-${k}`} /> {k.replace("_", " ")}
              </button>
            ))}
          </div>
        </section>

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

        {gauge.length > 1 && (
          <section>
            <h2>Booker Creek gauge, last 30 days</h2>
            <Sparkline points={gauge.map((g) => g.max_value)} />
            <span className="meta">
              Daily peak height, USGS gauge 02097386 · latest {gauge[gauge.length - 1].max_value.toFixed(2)} ft
            </span>
          </section>
        )}

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
          <div className="bar"><div style={{ width: `${Math.min(100, (spent / budget) * 100)}%` }} /></div>
          <span className="meta">
            ${(spent / 1e6).toFixed(2)}M of ${(budget / 1e6).toFixed(1)}M committed (town share, after grants)
          </span>
          {suggestions.length === 0 && <p>Nothing fits this budget and time span.</p>}
          <ul className="cards">
            {suggestions.map((s) => (
              <li key={s.title} className="glass card">
                <strong>{s.title}</strong>
                <span className="meta">
                  {other.some((o) => o.title === s.title)
                    ? "Both lists agree on this one"
                    : mode === "balanced" ? "Not on the Constituent voice list" : "Not on the Best impact list"}
                </span>
                <span>
                  ${s.town_cost_usd.toLocaleString()} town cost · {s.months} mo ·{" "}
                  alignment {Math.round((s.approval_prob ?? 0) * 100)}/100
                </span>
                <span>
                  {s.constituents_affected?.toLocaleString()} residents within 500 m · {s.constituent_mentions} asked for this
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
                {rationales[s.title] && <span className="why">{rationales[s.title]}</span>}
                <div className="chips">
                  <button className="aero" onClick={() => setFocus({ lat: s.lat, lng: s.lng })}>Show</button>
                  <button className="aero" onClick={() => explain(s)}>Why?</button>
                  <button className="aero" onClick={() => propose(s)} disabled={added.includes(s.title)}>
                    {added.includes(s.title) ? "Proposed" : "Add to proposals"}
                  </button>
                </div>
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
          {AGENT_NUMBER && (
            <div className="text-us">
              <QRCodeSVG value={`sms:${AGENT_NUMBER}`} size={84} bgColor="transparent" />
              <span>
                Or text Canopy on iMessage:
                <strong>{AGENT_NUMBER}</strong>
              </span>
            </div>
          )}
        </section>

        <section>
          <h2>Resident voices</h2>
          {voices.length === 0 && <p>No messages yet.</p>}
          <ul className="cards">
            {voices.map((v) => (
              <li key={v.id} className="glass card">
                <span>
                  <i className={`mood ${v.sentiment > 0.2 ? "pos" : v.sentiment < -0.2 ? "neg" : "neu"}`} />{" "}
                  {v.body}
                </span>
                <span className="meta">
                  {v.channel === "imessage" ? "text" : "web"} · {v.district ?? "town-wide"} ·{" "}
                  {v.topics.map((t) => t.replace(/_/g, " ")).join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
