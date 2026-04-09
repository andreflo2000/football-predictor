export interface BetPick {
  home: string; away: string; league: string; flag: string; time?: string
  prediction: 'H' | 'D' | 'A'; prediction_label?: string
  confidence: number; home_win: number; draw: number; away_win: number
  edge?: number; has_odds?: boolean; value_bet?: boolean
}

export function getBetBuilder(): BetPick[] {
  try { return JSON.parse(localStorage.getItem('oxiano_bb') || '[]') } catch { return [] }
}

export function saveBetBuilder(picks: BetPick[]) {
  localStorage.setItem('oxiano_bb', JSON.stringify(picks))
}
