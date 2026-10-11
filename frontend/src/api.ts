const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type Status = "completed" | "in_progress" | "proposed" | "rejected";

export interface Impact {
  approval_prob: number | null;
  delta_ndvi: number | null;
  delta_lst_f: number | null;
  delta_flood_risk: number | null;
  constituents_affected: number | null;
  runoff_mgal?: number | null;
}

export interface Project extends Impact {
  id: number;
  title: string;
  description: string;
  category: string;
  status: Status;
  source: string;
  district: string;
  lat: number;
  lng: number;
  budget_usd: string;
}

export interface Suggestion extends Impact {
  title: string;
  category: string;
  district: string;
  lat: number;
  lng: number;
  budget_usd: number;
  town_cost_usd: number;
  months: number;
  constituent_mentions: number;
  score: number;
  goals: Record<string, number>;
  contributions: Record<string, number>;
  survey: SurveyItem | null;
  survey_delta_pct: Record<string, number>;
  rationale?: string;
}

export type Mode = "balanced" | "constituent";

export interface SurveyItem {
  item: string;
  importance: number;
  satisfaction: number;
  is_score: number;
  priority: string;
  note: string | null;
  label?: string;
}

export type NeedDomain = "overall" | "heat" | "canopy" | "flood" | "lighting";

export interface NeedCell {
  cell_id: string;
  score: number;
  south: number;
  north: number;
  west: number;
  east: number;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

export const getProjects = () => get<Project[]>("/api/projects");

export const getSurvey = () =>
  get<{ source: { title: string; sample_size: number }; items: SurveyItem[] }>("/api/survey");

export const getNeed = (domain: NeedDomain) =>
  get<{ cells: NeedCell[]; total_cells: number }>(`/api/need?domain=${domain}`);

export const getSuggestions = (budget: number, horizonMonths: number, mode: Mode) =>
  get<{ spent: number; suggestions: Suggestion[] }>(
    `/api/suggestions?budget=${budget}&horizon_months=${horizonMonths}&mode=${mode}`,
  );

export interface FeedbackResult {
  sentiment: number;
  topics: string[];
  district: string | null;
}

export async function postFeedback(body: string): Promise<FeedbackResult> {
  const res = await fetch(API + "/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, channel: "web" }),
  });
  if (!res.ok) throw new Error(`feedback: ${res.status}`);
  return res.json();
}
