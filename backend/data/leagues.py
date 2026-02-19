"""
Top 100 ligi de fotbal din lume - date din documentul oficial FootPredict.
Sursă: Top100_Ligi_Fotbal.docx — Rating bazat pe coeficienți UEFA/FIFA,
valoarea transferurilor, nivel competitiv și reputație internațională (2024-2025).
"""

LEAGUES_LIST = [
    # ── UEFA ─────────────────────────────────────────────────────────────────
    {"rank": 1,  "id": 39,  "name": "Premier League",                  "country": "England",        "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "confederation": "UEFA",     "rating": 94.66, "fd_code": "PL"},
    {"rank": 2,  "id": 140, "name": "La Liga",                         "country": "Spain",           "flag": "🇪🇸", "confederation": "UEFA",     "rating": 88.07, "fd_code": "PD"},
    {"rank": 3,  "id": 78,  "name": "Bundesliga",                      "country": "Germany",         "flag": "🇩🇪", "confederation": "UEFA",     "rating": 81.75, "fd_code": "BL1"},
    {"rank": 4,  "id": 135, "name": "Serie A",                         "country": "Italy",           "flag": "🇮🇹", "confederation": "UEFA",     "rating": 78.50, "fd_code": "SA"},
    {"rank": 5,  "id": 61,  "name": "Ligue 1",                         "country": "France",          "flag": "🇫🇷", "confederation": "UEFA",     "rating": 72.12, "fd_code": "FL1"},
    {"rank": 6,  "id": 88,  "name": "Eredivisie",                      "country": "Netherlands",     "flag": "🇳🇱", "confederation": "UEFA",     "rating": 60.45, "fd_code": "DED"},
    {"rank": 7,  "id": 94,  "name": "Primeira Liga",                   "country": "Portugal",        "flag": "🇵🇹", "confederation": "UEFA",     "rating": 58.33, "fd_code": "PPL"},
    {"rank": 8,  "id": 144, "name": "Pro League",                      "country": "Belgium",         "flag": "🇧🇪", "confederation": "UEFA",     "rating": 53.21, "fd_code": None},
    {"rank": 9,  "id": 203, "name": "Super Lig",                       "country": "Turkey",          "flag": "🇹🇷", "confederation": "UEFA",     "rating": 49.87, "fd_code": None},
    {"rank": 10, "id": 179, "name": "Scottish Premiership",            "country": "Scotland",        "flag": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "confederation": "UEFA",     "rating": 46.22, "fd_code": None},
    {"rank": 11, "id": 283, "name": "Liga I (Superliga)",              "country": "Romania",         "flag": "🇷🇴", "confederation": "UEFA",     "rating": 43.50, "fd_code": None},
    {"rank": 12, "id": 235, "name": "Russian Premier League",          "country": "Russia",          "flag": "🇷🇺", "confederation": "UEFA",     "rating": 42.88, "fd_code": None},
    {"rank": 13, "id": 218, "name": "Austrian Bundesliga",             "country": "Austria",         "flag": "🇦🇹", "confederation": "UEFA",     "rating": 41.75, "fd_code": None},
    {"rank": 14, "id": 345, "name": "Czech First League",              "country": "Czech Republic",  "flag": "🇨🇿", "confederation": "UEFA",     "rating": 40.90, "fd_code": None},
    {"rank": 15, "id": 207, "name": "Swiss Super League",              "country": "Switzerland",     "flag": "🇨🇭", "confederation": "UEFA",     "rating": 39.65, "fd_code": None},
    {"rank": 16, "id": 197, "name": "Greek Super League",              "country": "Greece",          "flag": "🇬🇷", "confederation": "UEFA",     "rating": 38.44, "fd_code": None},
    {"rank": 17, "id": 119, "name": "Danish Superliga",                "country": "Denmark",         "flag": "🇩🇰", "confederation": "UEFA",     "rating": 37.80, "fd_code": None},
    {"rank": 18, "id": 333, "name": "Ukrainian Premier League",        "country": "Ukraine",         "flag": "🇺🇦", "confederation": "UEFA",     "rating": 36.95, "fd_code": None},
    {"rank": 19, "id": 210, "name": "Croatian Football League",        "country": "Croatia",         "flag": "🇭🇷", "confederation": "UEFA",     "rating": 36.10, "fd_code": None},
    {"rank": 20, "id": 106, "name": "Polish Ekstraklasa",              "country": "Poland",          "flag": "🇵🇱", "confederation": "UEFA",     "rating": 35.55, "fd_code": None},
    {"rank": 21, "id": 286, "name": "Serbian SuperLiga",               "country": "Serbia",          "flag": "🇷🇸", "confederation": "UEFA",     "rating": 34.70, "fd_code": None},
    {"rank": 22, "id": 103, "name": "Norwegian Eliteserien",           "country": "Norway",          "flag": "🇳🇴", "confederation": "UEFA",     "rating": 34.20, "fd_code": None},
    {"rank": 23, "id": 113, "name": "Swedish Allsvenskan",             "country": "Sweden",          "flag": "🇸🇪", "confederation": "UEFA",     "rating": 33.80, "fd_code": None},
    {"rank": 24, "id": 271, "name": "Hungarian OTP Bank Liga",         "country": "Hungary",         "flag": "🇭🇺", "confederation": "UEFA",     "rating": 33.15, "fd_code": None},
    {"rank": 25, "id": 382, "name": "Israeli Premier League",          "country": "Israel",          "flag": "🇮🇱", "confederation": "UEFA",     "rating": 32.60, "fd_code": None},
    {"rank": 26, "id": 441, "name": "Slovenian PrvaLiga",              "country": "Slovenia",        "flag": "🇸🇮", "confederation": "UEFA",     "rating": 31.90, "fd_code": None},
    {"rank": 27, "id": 332, "name": "Slovak Super Liga",               "country": "Slovakia",        "flag": "🇸🇰", "confederation": "UEFA",     "rating": 31.30, "fd_code": None},
    {"rank": 28, "id": 172, "name": "Bulgarian First League",          "country": "Bulgaria",        "flag": "🇧🇬", "confederation": "UEFA",     "rating": 30.75, "fd_code": None},
    {"rank": 29, "id": 262, "name": "Cypriot First Division",          "country": "Cyprus",          "flag": "🇨🇾", "confederation": "UEFA",     "rating": 30.20, "fd_code": None},
    {"rank": 30, "id": 385, "name": "Azerbaijani Premier League",      "country": "Azerbaijan",      "flag": "🇦🇿", "confederation": "UEFA",     "rating": 29.55, "fd_code": None},
    {"rank": 31, "id": 384, "name": "Kazakh Premier League",           "country": "Kazakhstan",      "flag": "🇰🇿", "confederation": "UEFA",     "rating": 29.10, "fd_code": None},
    {"rank": 32, "id": 244, "name": "Finnish Veikkausliiga",           "country": "Finland",         "flag": "🇫🇮", "confederation": "UEFA",     "rating": 28.65, "fd_code": None},
    {"rank": 33, "id": 396, "name": "Georgian Erovnuli Liga",          "country": "Georgia",         "flag": "🇬🇪", "confederation": "UEFA",     "rating": 28.20, "fd_code": None},
    {"rank": 34, "id": 116, "name": "Belarusian Premier League",       "country": "Belarus",         "flag": "🇧🇾", "confederation": "UEFA",     "rating": 27.75, "fd_code": None},
    {"rank": 35, "id": 387, "name": "Albanian Superliga",              "country": "Albania",         "flag": "🇦🇱", "confederation": "UEFA",     "rating": 27.30, "fd_code": None},
    {"rank": 36, "id": 176, "name": "Bosnian Premier League",          "country": "Bosnia",          "flag": "🇧🇦", "confederation": "UEFA",     "rating": 26.85, "fd_code": None},
    {"rank": 80, "id": 129, "name": "Irish Premier Division",          "country": "Ireland",         "flag": "🇮🇪", "confederation": "UEFA",     "rating": 26.50, "fd_code": None},
    {"rank": 81, "id": 130, "name": "Northern Irish Premiership",      "country": "N. Ireland",      "flag": "🇬🇧", "confederation": "UEFA",     "rating": 25.90, "fd_code": None},
    {"rank": 82, "id": 131, "name": "Welsh Premier League",            "country": "Wales",           "flag": "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "confederation": "UEFA",     "rating": 24.80, "fd_code": None},
    {"rank": 92, "id": 337, "name": "North Macedonian First League",   "country": "N. Macedonia",    "flag": "🇲🇰", "confederation": "UEFA",     "rating": 24.30, "fd_code": None},
    {"rank": 84, "id": 185, "name": "Icelandic Úrvalsdeild",           "country": "Iceland",         "flag": "🇮🇸", "confederation": "UEFA",     "rating": 24.10, "fd_code": None},
    {"rank": 83, "id": 398, "name": "Faroese Premier League",          "country": "Faroe Islands",   "flag": "🇫🇴", "confederation": "UEFA",     "rating": 23.40, "fd_code": None},
    {"rank": 91, "id": 383, "name": "Kosovo Superliga",                "country": "Kosovo",          "flag": "🇽🇰", "confederation": "UEFA",     "rating": 23.60, "fd_code": None},
    {"rank": 93, "id": 356, "name": "Montenegrin First League",        "country": "Montenegro",      "flag": "🇲🇪", "confederation": "UEFA",     "rating": 23.10, "fd_code": None},
    {"rank": 94, "id": 371, "name": "Armenian Premier League",         "country": "Armenia",         "flag": "🇦🇲", "confederation": "UEFA",     "rating": 22.70, "fd_code": None},
    {"rank": 85, "id": 200, "name": "Estonian Meistriliiga",           "country": "Estonia",         "flag": "🇪🇪", "confederation": "UEFA",     "rating": 22.80, "fd_code": None},
    {"rank": 86, "id": 121, "name": "Latvian Higher League",           "country": "Latvia",          "flag": "🇱🇻", "confederation": "UEFA",     "rating": 22.30, "fd_code": None},
    {"rank": 87, "id": 440, "name": "Lithuanian A Lyga",               "country": "Lithuania",       "flag": "🇱🇹", "confederation": "UEFA",     "rating": 21.90, "fd_code": None},
    {"rank": 88, "id": 370, "name": "Maltese Premier League",          "country": "Malta",           "flag": "🇲🇹", "confederation": "UEFA",     "rating": 21.20, "fd_code": None},
    {"rank": 89, "id": 136, "name": "Luxembourgish National Division", "country": "Luxembourg",      "flag": "🇱🇺", "confederation": "UEFA",     "rating": 20.80, "fd_code": None},
    {"rank": 90, "id": 415, "name": "Andorran Primera Divisió",        "country": "Andorra",         "flag": "🇦🇩", "confederation": "UEFA",     "rating": 17.50, "fd_code": None},
    # ── CONMEBOL ─────────────────────────────────────────────────────────────
    {"rank": 39, "id": 71,  "name": "Brasileirão Série A",             "country": "Brazil",          "flag": "🇧🇷", "confederation": "CONMEBOL", "rating": 64.20, "fd_code": "BSA"},
    {"rank": 40, "id": 128, "name": "Argentine Primera División",      "country": "Argentina",       "flag": "🇦🇷", "confederation": "CONMEBOL", "rating": 60.10, "fd_code": None},
    {"rank": 41, "id": 239, "name": "Colombian Primera A",             "country": "Colombia",        "flag": "🇨🇴", "confederation": "CONMEBOL", "rating": 42.50, "fd_code": None},
    {"rank": 42, "id": 265, "name": "Chilean Primera División",        "country": "Chile",           "flag": "🇨🇱", "confederation": "CONMEBOL", "rating": 40.80, "fd_code": None},
    {"rank": 43, "id": 268, "name": "Uruguayan Primera División",      "country": "Uruguay",         "flag": "🇺🇾", "confederation": "CONMEBOL", "rating": 38.90, "fd_code": None},
    {"rank": 44, "id": 166, "name": "Ecuadorian Serie A",              "country": "Ecuador",         "flag": "🇪🇨", "confederation": "CONMEBOL", "rating": 37.40, "fd_code": None},
    {"rank": 45, "id": 192, "name": "Peruvian Primera División",       "country": "Peru",            "flag": "🇵🇪", "confederation": "CONMEBOL", "rating": 35.60, "fd_code": None},
    {"rank": 46, "id": 238, "name": "Paraguayan División de Honor",    "country": "Paraguay",        "flag": "🇵🇾", "confederation": "CONMEBOL", "rating": 33.80, "fd_code": None},
    {"rank": 47, "id": 253, "name": "Venezuelan Primera División",     "country": "Venezuela",       "flag": "🇻🇪", "confederation": "CONMEBOL", "rating": 31.50, "fd_code": None},
    {"rank": 48, "id": 232, "name": "Bolivian LFPB",                   "country": "Bolivia",         "flag": "🇧🇴", "confederation": "CONMEBOL", "rating": 29.20, "fd_code": None},
    # ── CONCACAF ─────────────────────────────────────────────────────────────
    {"rank": 37, "id": 253, "name": "MLS",                             "country": "USA/Canada",      "flag": "🇺🇸", "confederation": "CONCACAF", "rating": 55.40, "fd_code": None},
    {"rank": 38, "id": 262, "name": "Liga MX",                         "country": "Mexico",          "flag": "🇲🇽", "confederation": "CONCACAF", "rating": 52.30, "fd_code": None},
    {"rank": 74, "id": 483, "name": "Costa Rican Primera División",    "country": "Costa Rica",      "flag": "🇨🇷", "confederation": "CONCACAF", "rating": 33.40, "fd_code": None},
    {"rank": 75, "id": 481, "name": "Guatemalan Liga Nacional",        "country": "Guatemala",       "flag": "🇬🇹", "confederation": "CONCACAF", "rating": 30.60, "fd_code": None},
    {"rank": 76, "id": 484, "name": "Honduran Liga Nacional",          "country": "Honduras",        "flag": "🇭🇳", "confederation": "CONCACAF", "rating": 29.30, "fd_code": None},
    {"rank": 77, "id": 482, "name": "Salvadoran Primera División",     "country": "El Salvador",     "flag": "🇸🇻", "confederation": "CONCACAF", "rating": 27.80, "fd_code": None},
    {"rank": 78, "id": 485, "name": "Panamanian LPF",                  "country": "Panama",          "flag": "🇵🇦", "confederation": "CONCACAF", "rating": 26.20, "fd_code": None},
    {"rank": 79, "id": 486, "name": "Jamaican National Premier League","country": "Jamaica",         "flag": "🇯🇲", "confederation": "CONCACAF", "rating": 24.90, "fd_code": None},
    # ── AFC ──────────────────────────────────────────────────────────────────
    {"rank": 49, "id": 98,  "name": "J1 League",                       "country": "Japan",           "flag": "🇯🇵", "confederation": "AFC",      "rating": 53.60, "fd_code": None},
    {"rank": 52, "id": 307, "name": "Saudi Pro League",                "country": "Saudi Arabia",    "flag": "🇸🇦", "confederation": "AFC",      "rating": 52.40, "fd_code": None},
    {"rank": 50, "id": 292, "name": "Korean K League 1",               "country": "South Korea",     "flag": "🇰🇷", "confederation": "AFC",      "rating": 48.30, "fd_code": None},
    {"rank": 51, "id": 169, "name": "Chinese Super League",            "country": "China",           "flag": "🇨🇳", "confederation": "AFC",      "rating": 45.70, "fd_code": None},
    {"rank": 53, "id": 435, "name": "UAE Pro League",                  "country": "UAE",             "flag": "🇦🇪", "confederation": "AFC",      "rating": 44.20, "fd_code": None},
    {"rank": 54, "id": 324, "name": "Qatar Stars League",              "country": "Qatar",           "flag": "🇶🇦", "confederation": "AFC",      "rating": 42.60, "fd_code": None},
    {"rank": 57, "id": 323, "name": "Iranian Persian Gulf Pro League", "country": "Iran",            "flag": "🇮🇷", "confederation": "AFC",      "rating": 41.30, "fd_code": None},
    {"rank": 56, "id": 188, "name": "A-League",                        "country": "Australia",       "flag": "🇦🇺", "confederation": "AFC",      "rating": 38.50, "fd_code": None},
    {"rank": 55, "id": 296, "name": "Indian Super League",             "country": "India",           "flag": "🇮🇳", "confederation": "AFC",      "rating": 35.80, "fd_code": None},
    {"rank": 58, "id": 290, "name": "Thai League 1",                   "country": "Thailand",        "flag": "🇹🇭", "confederation": "AFC",      "rating": 32.40, "fd_code": None},
    {"rank": 99, "id": 364, "name": "Iraqi Premier League",            "country": "Iraq",            "flag": "🇮🇶", "confederation": "AFC",      "rating": 30.50, "fd_code": None},
    {"rank": 100,"id": 439, "name": "Jordanian Pro League",            "country": "Jordan",          "flag": "🇯🇴", "confederation": "AFC",      "rating": 28.90, "fd_code": None},
    {"rank": 59, "id": 302, "name": "Malaysian Super League",          "country": "Malaysia",        "flag": "🇲🇾", "confederation": "AFC",      "rating": 29.80, "fd_code": None},
    {"rank": 60, "id": 466, "name": "Indonesian Liga 1",               "country": "Indonesia",       "flag": "🇮🇩", "confederation": "AFC",      "rating": 28.50, "fd_code": None},
    {"rank": 95, "id": 327, "name": "Uzbek Super League",              "country": "Uzbekistan",      "flag": "🇺🇿", "confederation": "AFC",      "rating": 27.20, "fd_code": None},
    {"rank": 96, "id": 340, "name": "Vietnamese V.League 1",           "country": "Vietnam",         "flag": "🇻🇳", "confederation": "AFC",      "rating": 26.70, "fd_code": None},
    {"rank": 97, "id": 466, "name": "Filipino PFL",                    "country": "Philippines",     "flag": "🇵🇭", "confederation": "AFC",      "rating": 22.10, "fd_code": None},
    # ── CAF ──────────────────────────────────────────────────────────────────
    {"rank": 61, "id": 233, "name": "Egyptian Premier League",         "country": "Egypt",           "flag": "🇪🇬", "confederation": "CAF",      "rating": 45.30, "fd_code": None},
    {"rank": 62, "id": 288, "name": "South African PSL",               "country": "South Africa",    "flag": "🇿🇦", "confederation": "CAF",      "rating": 42.10, "fd_code": None},
    {"rank": 63, "id": 200, "name": "Moroccan Botola Pro",             "country": "Morocco",         "flag": "🇲🇦", "confederation": "CAF",      "rating": 38.70, "fd_code": None},
    {"rank": 64, "id": 500, "name": "Tunisian Ligue Professionnelle 1","country": "Tunisia",         "flag": "🇹🇳", "confederation": "CAF",      "rating": 36.50, "fd_code": None},
    {"rank": 65, "id": 404, "name": "Algerian Ligue Professionnelle 1","country": "Algeria",         "flag": "🇩🇿", "confederation": "CAF",      "rating": 34.20, "fd_code": None},
    {"rank": 66, "id": 431, "name": "Nigerian Professional League",    "country": "Nigeria",         "flag": "🇳🇬", "confederation": "CAF",      "rating": 32.80, "fd_code": None},
    {"rank": 67, "id": 426, "name": "Ghanaian Premier League",         "country": "Ghana",           "flag": "🇬🇭", "confederation": "CAF",      "rating": 30.10, "fd_code": None},
    {"rank": 68, "id": 358, "name": "Cameroonian MTN Elite One",       "country": "Cameroon",        "flag": "🇨🇲", "confederation": "CAF",      "rating": 28.70, "fd_code": None},
    {"rank": 71, "id": 503, "name": "Senegalese Ligue 1",              "country": "Senegal",         "flag": "🇸🇳", "confederation": "CAF",      "rating": 27.60, "fd_code": None},
    {"rank": 72, "id": 418, "name": "Ivorian Ligue 1",                 "country": "Ivory Coast",     "flag": "🇨🇮", "confederation": "CAF",      "rating": 26.90, "fd_code": None},
    {"rank": 69, "id": 469, "name": "Kenyan Premier League",           "country": "Kenya",           "flag": "🇰🇪", "confederation": "CAF",      "rating": 26.40, "fd_code": None},
    {"rank": 70, "id": 524, "name": "Tanzanian Premier League",        "country": "Tanzania",        "flag": "🇹🇿", "confederation": "CAF",      "rating": 25.20, "fd_code": None},
    {"rank": 73, "id": 411, "name": "Libyan Premier League",           "country": "Libya",           "flag": "🇱🇾", "confederation": "CAF",      "rating": 24.50, "fd_code": None},
    # ── OFC ──────────────────────────────────────────────────────────────────
    {"rank": 98, "id": 365, "name": "New Zealand NRFL Premier",        "country": "New Zealand",     "flag": "🇳🇿", "confederation": "OFC",      "rating": 19.80, "fd_code": None},
]

# Sortare după rank
LEAGUES_LIST = sorted(LEAGUES_LIST, key=lambda x: x["rank"])

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_league_by_id(league_id: int):
    return next((l for l in LEAGUES_LIST if l["id"] == league_id), None)

def get_leagues_by_confederation(conf: str) -> list:
    return [l for l in LEAGUES_LIST if l["confederation"] == conf]

def get_top_n_leagues(n: int = 10) -> list:
    return LEAGUES_LIST[:n]

FOOTBALL_DATA_COMPETITION_MAP = {l["id"]: l["fd_code"] for l in LEAGUES_LIST if l.get("fd_code")}
CONFEDERATIONS = ["UEFA", "CONMEBOL", "CONCACAF", "AFC", "CAF", "OFC"]
