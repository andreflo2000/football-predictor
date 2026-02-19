// API client pentru Football Predictor Backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface League {
  rank: number
  id: number
  name: string
  country: string
  flag: string
  confederation: string
}

export interface Fixture {
  id: number
  home: string
  away: string
  home_id: number
  away_id: number
  date: string
  status?: string
}

export interface Prediction {
  match: string
  home_team: string
  away_team: string
  demo?: boolean
  prediction: {
    home_win: number
    draw: number
    away_win: number
    method: string
  }
  top_scores: { score: string; home_goals: number; away_goals: number; probability: number }[]
  expected_goals: { home: number; away: number }
  model_breakdown: {
    elo: { home_win: number; draw: number; away_win: number; home_rating: number; away_rating: number }
    poisson: { home_win: number; draw: number; away_win: number }
    xgboost?: { home_win: number; draw: number; away_win: number; method: string } | null
  }
  team_stats: {
    home: { form: string[]; form_score: number; xg_for: number; xg_against: number; elo: number }
    away: { form: string[]; form_score: number; xg_for: number; xg_against: number; elo: number }
  }
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function getLeagues(): Promise<League[]> {
  const data = await apiFetch<{ leagues: League[] }>('/api/leagues')
  return data.leagues
}

export async function getFixtures(leagueId: number): Promise<Fixture[]> {
  const data = await apiFetch<{ fixtures: Fixture[] }>(`/api/fixtures/${leagueId}`)
  return data.fixtures
}

export async function getPrediction(
  homeTeam: string,
  awayTeam: string,
  leagueId: number,
  homeTeamId?: number,
  awayTeamId?: number
): Promise<Prediction> {
  const params = new URLSearchParams({
    home_team: homeTeam,
    away_team: awayTeam,
    league_id: String(leagueId),
    ...(homeTeamId ? { home_team_id: String(homeTeamId) } : {}),
    ...(awayTeamId ? { away_team_id: String(awayTeamId) } : {}),
  })
  return apiFetch<Prediction>(`/api/predict?${params}`)
}
