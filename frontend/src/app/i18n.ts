// ─── Traduceri română / engleză ───────────────────────────────────────────────
// Detectează automat limba telefonului/browserului

export type Lang = 'ro' | 'en'

export function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'ro'
  const lang = navigator.language || 'ro'
  return lang.toLowerCase().startsWith('ro') ? 'ro' : 'en'
}

export const t = {
  ro: {
    // Header / Nav
    predictions: 'Predicții AI',
    results: 'Rezultate',
    tagline: 'Forecast Academy',

    // Hero
    hero_sub: 'xG · Elo · XGBoost · Poisson · 11 Ligi',

    // Selector
    select_league: 'Ligă / Competiție',
    select_league_placeholder: 'Selectează liga...',
    select_match: 'Meci',
    select_match_placeholder: 'Selectează liga mai întâi...',
    select_match_placeholder2: 'Selectează meciul...',
    predict_btn: '🔮 Predicție',

    // Empty state
    empty_title: 'SELECTEAZĂ O LIGĂ ȘI UN MECI',
    empty_sub: 'Meciurile din următoarele 3 zile · Clasament live · Statistici detaliate',

    // Tabs
    tab_bets: '🎯 Pariuri',
    tab_scores: '⚽ Scoruri',
    tab_stats: '📊 Statistici',
    tab_standings: '🏆 Clasament',
    tab_models: '🤖 Modele',

    // Markets
    prob: 'Probabilitate',
    odds: 'Cotă',
    home_win: 'Victorie Gazdă',
    draw: 'Egal',
    away_win: 'Victorie Oaspete',

    // Stats
    form: 'Formă',
    win_rate: 'Rată victorii',
    xg_for: 'xG Atac',
    xg_against: 'xG Apărare',
    goals_avg: 'Goluri/meci',
    elo: 'Rating Elo',
    comparison: 'Comparație directă',

    // Standings
    pos: 'Poz',
    team: 'Echipă',
    played: 'J',
    won: 'V',
    drawn: 'E',
    lost: 'P',
    gd: 'DG',
    points: 'Pct',
    no_standings: 'Clasament indisponibil pentru această ligă',

    // Models
    method: 'Metodă',
    combined: 'Predicție combinată',

    // Footer
    footer: 'Flopi San Forecast Academy — Scop educațional. Nu reprezintă sfaturi de pariuri.',

    // Loading
    loading: 'Maestrul calculează...',
    loading_sub: 'xG · Elo · XGBoost',

    // Weekly page
    weekly_title: 'EVIDENȚA PRONOSTICURILOR',
    weekly_sub: 'Urmărește rata de succes a predicțiilor tale',
    add_prediction: '+ Adaugă pronostic',
    delete_all: '🗑 Șterge tot',
    filter_all: 'Toate',
    filter_pending: '⏳ Așteptare',
    filter_correct: '✅ Corecte',
    filter_wrong: '❌ Greșite',
    total: 'Total',
    correct: '✅ Corecte',
    wrong: '❌ Greșite',
    pending: '⏳ Așteptare',
    success_rate: 'Rată de succes',
    last_7: 'Ultimele 7:',
    total_rate: '🏆 Rată totală',
    yesterday_rate: 'Selecțiile de ieri',
    today_rate: 'Selecțiile de azi',
    no_predictions: 'NICIUN PRONOSTIC ÎNREGISTRAT',
    no_predictions_sub: 'Adaugă primul tău pronostic și urmărește-ți succesul',
    add_first: '+ Adaugă primul pronostic',
    finalized: 'finalizate',
    matches_count: 'meciuri',
    confirm_delete: 'Ștergi acest pronostic?',
    confirm_clear: 'Ștergi toate pronosticurile?',
    btn_correct: '✅ Corect',
    btn_wrong: '❌ Greșit',
    modal_title: '+ Adaugă pronostic',
    league_label: 'Ligă',
    league_custom: 'Ligă (custom)',
    home_team: 'Echipă gazdă',
    away_team: 'Echipă oaspete',
    date_label: 'Data',
    time_label: 'Ora',
    bet_type: 'Tip pariu',
    prediction_label: 'Pronosticul tău',
    prediction_placeholder: 'ex: Arsenal câștigă 58% | Over 2.5 — 67%',
    add_btn: '✅ Adaugă pronostic',
  },

  en: {
    predictions: 'AI Predictions',
    results: 'Results',
    tagline: 'Forecast Academy',
    hero_sub: 'xG · Elo · XGBoost · Poisson · 11 Leagues',
    select_league: 'League / Competition',
    select_league_placeholder: 'Select league...',
    select_match: 'Match',
    select_match_placeholder: 'Select a league first...',
    select_match_placeholder2: 'Select a match...',
    predict_btn: '🔮 Predict',
    empty_title: 'SELECT A LEAGUE AND A MATCH',
    empty_sub: 'Matches from the next 3 days · Live standings · Detailed stats',
    tab_bets: '🎯 Markets',
    tab_scores: '⚽ Scores',
    tab_stats: '📊 Stats',
    tab_standings: '🏆 Standings',
    tab_models: '🤖 Models',
    prob: 'Probability',
    odds: 'Odds',
    home_win: 'Home Win',
    draw: 'Draw',
    away_win: 'Away Win',
    form: 'Form',
    win_rate: 'Win rate',
    xg_for: 'xG Attack',
    xg_against: 'xG Defence',
    goals_avg: 'Goals/match',
    elo: 'Elo Rating',
    comparison: 'Direct comparison',
    pos: 'Pos',
    team: 'Team',
    played: 'P',
    won: 'W',
    drawn: 'D',
    lost: 'L',
    gd: 'GD',
    points: 'Pts',
    no_standings: 'Standings unavailable for this league',
    method: 'Method',
    combined: 'Combined prediction',
    footer: 'Flopi San Forecast Academy — Educational purposes only. Not betting advice.',
    loading: 'The Master is calculating...',
    loading_sub: 'xG · Elo · XGBoost',
    weekly_title: 'PREDICTION TRACKER',
    weekly_sub: 'Track your prediction success rate',
    add_prediction: '+ Add prediction',
    delete_all: '🗑 Clear all',
    filter_all: 'All',
    filter_pending: '⏳ Pending',
    filter_correct: '✅ Correct',
    filter_wrong: '❌ Wrong',
    total: 'Total',
    correct: '✅ Correct',
    wrong: '❌ Wrong',
    pending: '⏳ Pending',
    success_rate: 'Success rate',
    last_7: 'Last 7:',
    total_rate: '🏆 Overall rate',
    yesterday_rate: "Yesterday's picks",
    today_rate: "Today's picks",
    no_predictions: 'NO PREDICTIONS RECORDED',
    no_predictions_sub: 'Add your first prediction and track your success',
    add_first: '+ Add first prediction',
    finalized: 'finalized',
    matches_count: 'matches',
    confirm_delete: 'Delete this prediction?',
    confirm_clear: 'Delete all predictions?',
    btn_correct: '✅ Correct',
    btn_wrong: '❌ Wrong',
    modal_title: '+ Add prediction',
    league_label: 'League',
    league_custom: 'League (custom)',
    home_team: 'Home team',
    away_team: 'Away team',
    date_label: 'Date',
    time_label: 'Time',
    bet_type: 'Bet type',
    prediction_label: 'Your prediction',
    prediction_placeholder: 'e.g. Arsenal wins 58% | Over 2.5 — 67%',
    add_btn: '✅ Add prediction',
  }
}
