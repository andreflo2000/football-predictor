"""
Football Predictor API - FastAPI Backend
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import uvicorn

from models.predictor import FootballPredictor
from data.fetcher import DataFetcher
from data.leagues import LEAGUES_LIST

app = FastAPI(
    title="Football Predictor API",
    description="Predicții fotbal bazate pe xG, Elo și formă recentă cu XGBoost",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

predictor = FootballPredictor()
fetcher = DataFetcher()

# ─── Date dinamice Romania ─────────────────────────────────────────────────────
def get_ro_dates():
    try:
        import pytz
        tz = pytz.timezone("Europe/Bucharest")
        now = datetime.now(tz)
    except Exception:
        now = datetime.now()
    return {
        "yesterday": (now - timedelta(days=1)).strftime("%Y-%m-%d"),
        "today":     now.strftime("%Y-%m-%d"),
        "tomorrow":  (now + timedelta(days=1)).strftime("%Y-%m-%d"),
        "after":     (now + timedelta(days=2)).strftime("%Y-%m-%d"),
    }

DEMO_FIXTURES = {
    39:  [  # Premier League
        {"id":101,"home":"Manchester City","away":"Arsenal","home_id":50,"away_id":42,"date":"2025-03-01"},
        {"id":102,"home":"Liverpool","away":"Chelsea","home_id":40,"away_id":49,"date":"2025-03-01"},
        {"id":103,"home":"Manchester United","away":"Tottenham","home_id":33,"away_id":47,"date":"2025-03-02"},
        {"id":104,"home":"Newcastle","away":"Aston Villa","home_id":34,"away_id":66,"date":"2025-03-02"},
        {"id":105,"home":"Brighton","away":"West Ham","home_id":51,"away_id":48,"date":"2025-03-03"},
        {"id":106,"home":"Everton","away":"Brentford","home_id":45,"away_id":55,"date":"2025-03-04"},
        {"id":107,"home":"Fulham","away":"Crystal Palace","home_id":36,"away_id":52,"date":"2025-03-04"},
        {"id":108,"home":"Wolves","away":"Nottingham Forest","home_id":39,"away_id":65,"date":"2025-03-05"},
    ],
    140: [  # La Liga
        {"id":201,"home":"Real Madrid","away":"Barcelona","home_id":541,"away_id":529,"date":"2025-03-01"},
        {"id":202,"home":"Atletico Madrid","away":"Sevilla","home_id":530,"away_id":536,"date":"2025-03-02"},
        {"id":203,"home":"Real Sociedad","away":"Athletic Bilbao","home_id":548,"away_id":531,"date":"2025-03-02"},
        {"id":204,"home":"Villarreal","away":"Valencia","home_id":533,"away_id":532,"date":"2025-03-03"},
        {"id":205,"home":"Betis","away":"Girona","home_id":543,"away_id":547,"date":"2025-03-04"},
        {"id":206,"home":"Osasuna","away":"Getafe","home_id":727,"away_id":546,"date":"2025-03-05"},
    ],
    78:  [  # Bundesliga
        {"id":301,"home":"Bayern Munich","away":"Borussia Dortmund","home_id":157,"away_id":165,"date":"2025-03-01"},
        {"id":302,"home":"Bayer Leverkusen","away":"RB Leipzig","home_id":168,"away_id":173,"date":"2025-03-02"},
        {"id":303,"home":"Stuttgart","away":"Eintracht Frankfurt","home_id":172,"away_id":169,"date":"2025-03-02"},
        {"id":304,"home":"Borussia Mönchengladbach","away":"Hoffenheim","home_id":163,"away_id":167,"date":"2025-03-03"},
        {"id":305,"home":"Werder Bremen","away":"Freiburg","home_id":162,"away_id":160,"date":"2025-03-04"},
        {"id":306,"home":"Wolfsburg","away":"Augsburg","home_id":161,"away_id":170,"date":"2025-03-05"},
    ],
    135: [  # Serie A
        {"id":401,"home":"Inter","away":"AC Milan","home_id":505,"away_id":489,"date":"2025-03-01"},
        {"id":402,"home":"Juventus","away":"Napoli","home_id":496,"away_id":492,"date":"2025-03-02"},
        {"id":403,"home":"Roma","away":"Lazio","home_id":497,"away_id":487,"date":"2025-03-02"},
        {"id":404,"home":"Atalanta","away":"Fiorentina","home_id":499,"away_id":502,"date":"2025-03-03"},
        {"id":405,"home":"Torino","away":"Bologna","home_id":503,"away_id":500,"date":"2025-03-04"},
        {"id":406,"home":"Udinese","away":"Cagliari","home_id":494,"away_id":488,"date":"2025-03-05"},
    ],
    61:  [  # Ligue 1
        {"id":501,"home":"PSG","away":"Monaco","home_id":85,"away_id":91,"date":"2025-03-01"},
        {"id":502,"home":"Lyon","away":"Marseille","home_id":80,"away_id":81,"date":"2025-03-02"},
        {"id":503,"home":"Lille","away":"Nice","home_id":79,"away_id":84,"date":"2025-03-02"},
        {"id":504,"home":"Rennes","away":"Lens","home_id":94,"away_id":116,"date":"2025-03-03"},
        {"id":505,"home":"Strasbourg","away":"Nantes","home_id":95,"away_id":83,"date":"2025-03-04"},
    ],
    88:  [  # Eredivisie
        {"id":601,"home":"Ajax","away":"PSV Eindhoven","home_id":194,"away_id":197,"date":"2025-03-01"},
        {"id":602,"home":"Feyenoord","away":"AZ Alkmaar","home_id":196,"away_id":193,"date":"2025-03-02"},
        {"id":603,"home":"Utrecht","away":"Twente","home_id":198,"away_id":199,"date":"2025-03-03"},
        {"id":604,"home":"Vitesse","away":"Groningen","home_id":200,"away_id":202,"date":"2025-03-04"},
    ],
    94:  [  # Primeira Liga
        {"id":701,"home":"Benfica","away":"Porto","home_id":211,"away_id":212,"date":"2025-03-01"},
        {"id":702,"home":"Sporting CP","away":"Braga","home_id":228,"away_id":217,"date":"2025-03-02"},
        {"id":703,"home":"Vitoria Guimaraes","away":"Famalicao","home_id":229,"away_id":233,"date":"2025-03-03"},
    ],
    144: [  # Pro League Belgia
        {"id":801,"home":"Club Brugge","away":"Anderlecht","home_id":245,"away_id":244,"date":"2025-03-01"},
        {"id":802,"home":"Gent","away":"Standard Liege","home_id":246,"away_id":247,"date":"2025-03-02"},
        {"id":803,"home":"Union Saint-Gilloise","away":"Genk","home_id":248,"away_id":249,"date":"2025-03-03"},
    ],
    203: [  # Super Lig
        {"id":901,"home":"Galatasaray","away":"Fenerbahce","home_id":611,"away_id":610,"date":"2025-03-01"},
        {"id":902,"home":"Besiktas","away":"Trabzonspor","home_id":609,"away_id":612,"date":"2025-03-02"},
        {"id":903,"home":"Basaksehir","away":"Sivasspor","home_id":614,"away_id":613,"date":"2025-03-03"},
    ],
    179: [  # Scottish Premiership
        {"id":1001,"home":"Celtic","away":"Rangers","home_id":273,"away_id":274,"date":"2025-03-01"},
        {"id":1002,"home":"Aberdeen","away":"Hearts","home_id":275,"away_id":276,"date":"2025-03-02"},
        {"id":1003,"home":"Hibernian","away":"Motherwell","home_id":277,"away_id":278,"date":"2025-03-03"},
    ],
    283: [  # Superliga Romania
        {"id":1101,"home":"FCSB","away":"CFR Cluj","home_id":651,"away_id":652,"date":"2025-03-01"},
        {"id":1102,"home":"Rapid Bucuresti","away":"Universitatea Craiova","home_id":653,"away_id":654,"date":"2025-03-02"},
        {"id":1103,"home":"Dinamo","away":"Farul Constanta","home_id":655,"away_id":656,"date":"2025-03-03"},
        {"id":1104,"home":"Petrolul Ploiesti","away":"UTA Arad","home_id":657,"away_id":658,"date":"2025-03-04"},
    ],
    235: [  # Russian Premier League
        {"id":1201,"home":"Zenit","away":"CSKA Moscow","home_id":631,"away_id":632,"date":"2025-03-01"},
        {"id":1202,"home":"Spartak Moscow","away":"Lokomotiv Moscow","home_id":633,"away_id":634,"date":"2025-03-02"},
        {"id":1203,"home":"Dynamo Moscow","away":"Krasnodar","home_id":635,"away_id":636,"date":"2025-03-03"},
    ],
    218: [  # Austrian Bundesliga
        {"id":1301,"home":"Red Bull Salzburg","away":"Rapid Vienna","home_id":671,"away_id":672,"date":"2025-03-01"},
        {"id":1302,"home":"Sturm Graz","away":"LASK","home_id":673,"away_id":674,"date":"2025-03-02"},
        {"id":1303,"home":"Austria Vienna","away":"Wolfsberg","home_id":675,"away_id":676,"date":"2025-03-03"},
    ],
    345: [  # Czech First League
        {"id":1401,"home":"Slavia Prague","away":"Sparta Prague","home_id":681,"away_id":682,"date":"2025-03-01"},
        {"id":1402,"home":"Viktoria Plzen","away":"Banik Ostrava","home_id":683,"away_id":684,"date":"2025-03-02"},
    ],
    207: [  # Swiss Super League
        {"id":1501,"home":"Young Boys","away":"Basel","home_id":691,"away_id":692,"date":"2025-03-01"},
        {"id":1502,"home":"Zurich","away":"Servette","home_id":693,"away_id":694,"date":"2025-03-02"},
        {"id":1503,"home":"Lugano","away":"St. Gallen","home_id":695,"away_id":696,"date":"2025-03-03"},
    ],
    197: [  # Greek Super League
        {"id":1601,"home":"Olympiacos","away":"Panathinaikos","home_id":700,"away_id":701,"date":"2025-03-01"},
        {"id":1602,"home":"AEK Athens","away":"PAOK","home_id":702,"away_id":703,"date":"2025-03-02"},
        {"id":1603,"home":"Aris","away":"Atromitos","home_id":704,"away_id":705,"date":"2025-03-03"},
    ],
    119: [  # Danish Superliga
        {"id":1701,"home":"FC Copenhagen","away":"Brondby","home_id":710,"away_id":711,"date":"2025-03-01"},
        {"id":1702,"home":"Midtjylland","away":"Silkeborg","home_id":712,"away_id":713,"date":"2025-03-02"},
    ],
    333: [  # Ukrainian Premier League
        {"id":1801,"home":"Shakhtar Donetsk","away":"Dynamo Kyiv","home_id":720,"away_id":721,"date":"2025-03-01"},
        {"id":1802,"home":"Vorskla","away":"Metalist","home_id":722,"away_id":723,"date":"2025-03-02"},
    ],
    210: [  # Croatian Football League
        {"id":1901,"home":"Dinamo Zagreb","away":"Hajduk Split","home_id":730,"away_id":731,"date":"2025-03-01"},
        {"id":1902,"home":"Rijeka","away":"Osijek","home_id":732,"away_id":733,"date":"2025-03-02"},
    ],
    106: [  # Polish Ekstraklasa
        {"id":2001,"home":"Legia Warsaw","away":"Lech Poznan","home_id":740,"away_id":741,"date":"2025-03-01"},
        {"id":2002,"home":"Rakow Czestochowa","away":"Wisla Krakow","home_id":742,"away_id":743,"date":"2025-03-02"},
        {"id":2003,"home":"Slask Wroclaw","away":"Pogon Szczecin","home_id":744,"away_id":745,"date":"2025-03-03"},
    ],
    286: [  # Serbian SuperLiga
        {"id":2101,"home":"Red Star Belgrade","away":"Partizan","home_id":750,"away_id":751,"date":"2025-03-01"},
        {"id":2102,"home":"Vojvodina","away":"Cukaricki","home_id":752,"away_id":753,"date":"2025-03-02"},
    ],
    103: [  # Norwegian Eliteserien
        {"id":2201,"home":"Bodo/Glimt","away":"Molde","home_id":760,"away_id":761,"date":"2025-04-01"},
        {"id":2202,"home":"Rosenborg","away":"Brann","home_id":762,"away_id":763,"date":"2025-04-02"},
    ],
    113: [  # Swedish Allsvenskan
        {"id":2301,"home":"Malmo FF","away":"IFK Gothenburg","home_id":770,"away_id":771,"date":"2025-04-01"},
        {"id":2302,"home":"Hammarby","away":"Djurgarden","home_id":772,"away_id":773,"date":"2025-04-02"},
    ],
    271: [  # Hungarian OTP Bank Liga
        {"id":2401,"home":"Ferencvaros","away":"Puskas Akademia","home_id":780,"away_id":781,"date":"2025-03-01"},
        {"id":2402,"home":"Ujpest","away":"Debrecen","home_id":782,"away_id":783,"date":"2025-03-02"},
    ],
    382: [  # Israeli Premier League
        {"id":2501,"home":"Maccabi Tel Aviv","away":"Hapoel Beer Sheva","home_id":790,"away_id":791,"date":"2025-03-01"},
        {"id":2502,"home":"Maccabi Haifa","away":"Beitar Jerusalem","home_id":792,"away_id":793,"date":"2025-03-02"},
    ],
    441: [  # Slovenian PrvaLiga
        {"id":2601,"home":"NK Maribor","away":"NK Olimpija","home_id":800,"away_id":801,"date":"2025-03-01"},
        {"id":2602,"home":"NK Koper","away":"NK Celje","home_id":802,"away_id":803,"date":"2025-03-02"},
    ],
    332: [  # Slovak Super Liga
        {"id":2701,"home":"Slovan Bratislava","away":"Spartak Trnava","home_id":810,"away_id":811,"date":"2025-03-01"},
        {"id":2702,"home":"Zilina","away":"Ruzomberok","home_id":812,"away_id":813,"date":"2025-03-02"},
    ],
    172: [  # Bulgarian First League
        {"id":2801,"home":"Ludogorets","away":"CSKA Sofia","home_id":820,"away_id":821,"date":"2025-03-01"},
        {"id":2802,"home":"Levski Sofia","away":"Botev Plovdiv","home_id":822,"away_id":823,"date":"2025-03-02"},
    ],
    262: [  # Cypriot First Division
        {"id":2901,"home":"APOEL","away":"Omonia","home_id":830,"away_id":831,"date":"2025-03-01"},
        {"id":2902,"home":"AEL Limassol","away":"Anorthosis","home_id":832,"away_id":833,"date":"2025-03-02"},
    ],
    385: [  # Azerbaijani Premier League
        {"id":3001,"home":"Qarabag","away":"Neftchi","home_id":840,"away_id":841,"date":"2025-03-01"},
        {"id":3002,"home":"Sabah","away":"Zira","home_id":842,"away_id":843,"date":"2025-03-02"},
    ],
    384: [  # Kazakh Premier League
        {"id":3101,"home":"Shakhtar Karagandy","away":"Astana","home_id":850,"away_id":851,"date":"2025-04-01"},
        {"id":3102,"home":"Kairat","away":"Tobol","home_id":852,"away_id":853,"date":"2025-04-02"},
    ],
    244: [  # Finnish Veikkausliiga
        {"id":3201,"home":"HJK Helsinki","away":"HIFK","home_id":860,"away_id":861,"date":"2025-04-01"},
        {"id":3202,"home":"KuPS","away":"Ilves","home_id":862,"away_id":863,"date":"2025-04-02"},
    ],
    396: [  # Georgian Erovnuli Liga
        {"id":3301,"home":"Dinamo Tbilisi","away":"Saburtalo","home_id":870,"away_id":871,"date":"2025-04-01"},
        {"id":3302,"home":"Lokomotivi Tbilisi","away":"Rustavi","home_id":872,"away_id":873,"date":"2025-04-02"},
    ],
    116: [  # Belarusian Premier League
        {"id":3401,"home":"BATE Borisov","away":"Dinamo Minsk","home_id":880,"away_id":881,"date":"2025-04-01"},
        {"id":3402,"home":"Shakhtyor Soligorsk","away":"Isloch","home_id":882,"away_id":883,"date":"2025-04-02"},
    ],
    387: [  # Albanian Superliga
        {"id":3501,"home":"Skenderbeu","away":"Partizani Tirana","home_id":890,"away_id":891,"date":"2025-03-01"},
        {"id":3502,"home":"Vllaznia","away":"Tirana","home_id":892,"away_id":893,"date":"2025-03-02"},
    ],
    176: [  # Bosnian Premier League
        {"id":3601,"home":"Zrinjski","away":"Sarajevo","home_id":900,"away_id":901,"date":"2025-03-01"},
        {"id":3602,"home":"Borac Banja Luka","away":"Velez Mostar","home_id":902,"away_id":903,"date":"2025-03-02"},
    ],
    129: [  # Irish Premier Division
        {"id":8001,"home":"Shamrock Rovers","away":"Bohemian FC","home_id":1340,"away_id":1341,"date":"2025-03-01"},
        {"id":8002,"home":"Shelbourne","away":"Dundalk","home_id":1342,"away_id":1343,"date":"2025-03-02"},
    ],
    130: [  # Northern Irish Premiership
        {"id":8101,"home":"Linfield","away":"Glentoran","home_id":1350,"away_id":1351,"date":"2025-03-01"},
        {"id":8102,"home":"Cliftonville","away":"Crusaders","home_id":1352,"away_id":1353,"date":"2025-03-02"},
    ],
    131: [  # Welsh Premier League
        {"id":8201,"home":"The New Saints","away":"Connah's Quay Nomads","home_id":1360,"away_id":1361,"date":"2025-03-01"},
        {"id":8202,"home":"Bala Town","away":"Caernarfon Town","home_id":1362,"away_id":1363,"date":"2025-03-02"},
    ],
    398: [  # Faroese Premier League
        {"id":8301,"home":"HB Torshavn","away":"KI Klaksvik","home_id":1370,"away_id":1371,"date":"2025-04-01"},
        {"id":8302,"home":"B36 Torshavn","away":"NSI Runavik","home_id":1372,"away_id":1373,"date":"2025-04-02"},
    ],
    185: [  # Icelandic Úrvalsdeild
        {"id":8401,"home":"Breidablik","away":"Valur","home_id":1380,"away_id":1381,"date":"2025-04-01"},
        {"id":8402,"home":"KR Reykjavik","away":"Vikingur","home_id":1382,"away_id":1383,"date":"2025-04-02"},
    ],
    383: [  # Kosovo Superliga
        {"id":9101,"home":"FC Drita","away":"FC Prishtina","home_id":1450,"away_id":1451,"date":"2025-03-01"},
        {"id":9102,"home":"Ballkani","away":"Llapi","home_id":1452,"away_id":1453,"date":"2025-03-02"},
    ],
    337: [  # North Macedonian First League
        {"id":9201,"home":"Shkupi","away":"Vardar Skopje","home_id":1460,"away_id":1461,"date":"2025-03-01"},
        {"id":9202,"home":"Rabotniki","away":"Akademija Pandev","home_id":1462,"away_id":1463,"date":"2025-03-02"},
    ],
    356: [  # Montenegrin First League
        {"id":9301,"home":"FK Buducnost Podgorica","away":"FK Sutjeska","home_id":1470,"away_id":1471,"date":"2025-03-01"},
        {"id":9302,"home":"FK Decic","away":"FK Rudar","home_id":1472,"away_id":1473,"date":"2025-03-02"},
    ],
    371: [  # Armenian Premier League
        {"id":9401,"home":"Pyunik Yerevan","away":"Ararat Armenia","home_id":1480,"away_id":1481,"date":"2025-03-01"},
        {"id":9402,"home":"Noah FC","away":"Urartu FC","home_id":1482,"away_id":1483,"date":"2025-03-02"},
    ],
    # CONMEBOL
    71:  [  # Brasileirao
        {"id":3901,"home":"Flamengo","away":"Palmeiras","home_id":127,"away_id":131,"date":"2025-03-01"},
        {"id":3902,"home":"Atletico Mineiro","away":"Fluminense","home_id":130,"away_id":129,"date":"2025-03-02"},
        {"id":3903,"home":"Santos","away":"Corinthians","home_id":128,"away_id":126,"date":"2025-03-02"},
        {"id":3904,"home":"Internacional","away":"Gremio","home_id":132,"away_id":133,"date":"2025-03-03"},
        {"id":3905,"home":"Sao Paulo","away":"Botafogo","home_id":134,"away_id":135,"date":"2025-03-04"},
    ],
    128: [  # Argentine Primera
        {"id":4001,"home":"River Plate","away":"Boca Juniors","home_id":940,"away_id":941,"date":"2025-03-01"},
        {"id":4002,"home":"Racing Club","away":"Independiente","home_id":942,"away_id":943,"date":"2025-03-02"},
        {"id":4003,"home":"San Lorenzo","away":"Estudiantes","home_id":944,"away_id":945,"date":"2025-03-03"},
    ],
    239: [  # Colombian Primera
        {"id":4101,"home":"Atletico Nacional","away":"Millonarios","home_id":950,"away_id":951,"date":"2025-03-01"},
        {"id":4102,"home":"America de Cali","away":"Deportivo Cali","home_id":952,"away_id":953,"date":"2025-03-02"},
    ],
    265: [  # Chilean Primera
        {"id":4201,"home":"Colo-Colo","away":"Universidad de Chile","home_id":960,"away_id":961,"date":"2025-03-01"},
        {"id":4202,"home":"Universidad Catolica","away":"Huachipato","home_id":962,"away_id":963,"date":"2025-03-02"},
    ],
    268: [  # Uruguayan Primera
        {"id":4301,"home":"Penarol","away":"Nacional","home_id":970,"away_id":971,"date":"2025-03-01"},
        {"id":4302,"home":"Defensor Sporting","away":"Danubio","home_id":972,"away_id":973,"date":"2025-03-02"},
    ],
    166: [  # Ecuadorian Serie A
        {"id":4401,"home":"Liga de Quito","away":"Barcelona SC","home_id":980,"away_id":981,"date":"2025-03-01"},
        {"id":4402,"home":"Emelec","away":"Independiente del Valle","home_id":982,"away_id":983,"date":"2025-03-02"},
    ],
    192: [  # Peruvian Primera
        {"id":4501,"home":"Universitario","away":"Alianza Lima","home_id":990,"away_id":991,"date":"2025-03-01"},
        {"id":4502,"home":"Sporting Cristal","away":"Cienciano","home_id":992,"away_id":993,"date":"2025-03-02"},
    ],
    238: [  # Paraguayan
        {"id":4601,"home":"Olimpia","away":"Cerro Porteno","home_id":1000,"away_id":1001,"date":"2025-03-01"},
        {"id":4602,"home":"Libertad","away":"Guarani","home_id":1002,"away_id":1003,"date":"2025-03-02"},
    ],
    232: [  # Bolivian LFPB
        {"id":4801,"home":"Bolivar","away":"The Strongest","home_id":1020,"away_id":1021,"date":"2025-03-01"},
        {"id":4802,"home":"Wilstermann","away":"Blooming","home_id":1022,"away_id":1023,"date":"2025-03-02"},
    ],
    # CONCACAF
    483: [  # Costa Rica
        {"id":7401,"home":"Deportivo Saprissa","away":"Liga Deportiva Alajuelense","home_id":1280,"away_id":1281,"date":"2025-03-01"},
        {"id":7402,"home":"Herediano","away":"Guadalupe FC","home_id":1282,"away_id":1283,"date":"2025-03-02"},
    ],
    481: [  # Guatemala
        {"id":7501,"home":"Comunicaciones FC","away":"Municipal","home_id":1290,"away_id":1291,"date":"2025-03-01"},
        {"id":7502,"home":"Xelaju","away":"Antigua GFC","home_id":1292,"away_id":1293,"date":"2025-03-02"},
    ],
    484: [  # Honduras
        {"id":7601,"home":"Real España","away":"Olimpia","home_id":1300,"away_id":1301,"date":"2025-03-01"},
        {"id":7602,"home":"Motagua","away":"Marathon","home_id":1302,"away_id":1303,"date":"2025-03-02"},
    ],
    482: [  # El Salvador
        {"id":7701,"home":"Alianza FC","away":"FAS","home_id":1310,"away_id":1311,"date":"2025-03-01"},
        {"id":7702,"home":"CD Aguila","away":"Firpo","home_id":1312,"away_id":1313,"date":"2025-03-02"},
    ],
    485: [  # Panama
        {"id":7801,"home":"Tauro FC","away":"Deportivo Arabe Unido","home_id":1320,"away_id":1321,"date":"2025-03-01"},
        {"id":7802,"home":"Atletico Chiriqui","away":"San Francisco FC","home_id":1322,"away_id":1323,"date":"2025-03-02"},
    ],
    486: [  # Jamaica
        {"id":7901,"home":"Waterhouse FC","away":"Portmore United","home_id":1330,"away_id":1331,"date":"2025-03-01"},
        {"id":7902,"home":"Cavalier SC","away":"Dunbeholden","home_id":1332,"away_id":1333,"date":"2025-03-02"},
    ],
    # AFC
    98:  [  # J1 League
        {"id":4901,"home":"Vissel Kobe","away":"Urawa Red Diamonds","home_id":1030,"away_id":1031,"date":"2025-03-01"},
        {"id":4902,"home":"Gamba Osaka","away":"Kashima Antlers","home_id":1032,"away_id":1033,"date":"2025-03-02"},
        {"id":4903,"home":"Yokohama F Marinos","away":"Kawasaki Frontale","home_id":1034,"away_id":1035,"date":"2025-03-03"},
    ],
    307: [  # Saudi Pro League
        {"id":5201,"home":"Al-Hilal","away":"Al-Nassr","home_id":1060,"away_id":1061,"date":"2025-03-01"},
        {"id":5202,"home":"Al-Ittihad","away":"Al-Ahli","home_id":1062,"away_id":1063,"date":"2025-03-02"},
        {"id":5203,"home":"Al-Shabab","away":"Al-Qadsiah","home_id":1064,"away_id":1065,"date":"2025-03-03"},
    ],
    292: [  # Korean K League 1
        {"id":5001,"home":"Jeonbuk Motors","away":"Ulsan Hyundai","home_id":1040,"away_id":1041,"date":"2025-03-01"},
        {"id":5002,"home":"Suwon Samsung","away":"Seongnam FC","home_id":1042,"away_id":1043,"date":"2025-03-02"},
    ],
    169: [  # Chinese Super League
        {"id":5101,"home":"Shanghai Port","away":"Beijing Guoan","home_id":1050,"away_id":1051,"date":"2025-04-01"},
        {"id":5102,"home":"Guangzhou FC","away":"Wuhan FC","home_id":1052,"away_id":1053,"date":"2025-04-02"},
    ],
    435: [  # UAE Pro League
        {"id":5301,"home":"Al Ain","away":"Al Jazira","home_id":1070,"away_id":1071,"date":"2025-03-01"},
        {"id":5302,"home":"Sharjah FC","away":"Al Wasl","home_id":1072,"away_id":1073,"date":"2025-03-02"},
    ],
    324: [  # Qatar Stars League
        {"id":5401,"home":"Al Sadd","away":"Al Duhail","home_id":1080,"away_id":1081,"date":"2025-03-01"},
        {"id":5402,"home":"Al Rayyan","away":"Al Arabi","home_id":1082,"away_id":1083,"date":"2025-03-02"},
    ],
    323: [  # Iranian Pro League
        {"id":5701,"home":"Persepolis","away":"Esteghlal","home_id":1110,"away_id":1111,"date":"2025-03-01"},
        {"id":5702,"home":"Sepahan","away":"Tractor","home_id":1112,"away_id":1113,"date":"2025-03-02"},
    ],
    188: [  # A-League
        {"id":5601,"home":"Melbourne City","away":"Sydney FC","home_id":1100,"away_id":1101,"date":"2025-03-01"},
        {"id":5602,"home":"Melbourne Victory","away":"Western Sydney","home_id":1102,"away_id":1103,"date":"2025-03-02"},
    ],
    296: [  # Indian Super League
        {"id":5501,"home":"Mumbai City","away":"ATK Mohun Bagan","home_id":1090,"away_id":1091,"date":"2025-03-01"},
        {"id":5502,"home":"Bengaluru FC","away":"Kerala Blasters","home_id":1092,"away_id":1093,"date":"2025-03-02"},
    ],
    290: [  # Thai League 1
        {"id":5801,"home":"Buriram United","away":"Muangthong United","home_id":1120,"away_id":1121,"date":"2025-03-01"},
        {"id":5802,"home":"Chiang Rai United","away":"BG Pathum United","home_id":1122,"away_id":1123,"date":"2025-03-02"},
    ],
    302: [  # Malaysian Super League
        {"id":5901,"home":"Johor Darul Ta'zim","away":"Selangor FC","home_id":1130,"away_id":1131,"date":"2025-03-01"},
        {"id":5902,"home":"Pahang FA","away":"Kedah FA","home_id":1132,"away_id":1133,"date":"2025-03-02"},
    ],
    466: [  # Indonesian Liga 1
        {"id":6001,"home":"Persija Jakarta","away":"Persib Bandung","home_id":1140,"away_id":1141,"date":"2025-03-01"},
        {"id":6002,"home":"Arema FC","away":"PSM Makassar","home_id":1142,"away_id":1143,"date":"2025-03-02"},
    ],
    364: [  # Iraqi Premier League
        {"id":9901,"home":"Al-Shorta","away":"Al-Zawraa","home_id":1530,"away_id":1531,"date":"2025-03-01"},
        {"id":9902,"home":"Air Force Club","away":"Al-Quwa Al-Jawiya","home_id":1532,"away_id":1533,"date":"2025-03-02"},
    ],
    439: [  # Jordanian Pro League
        {"id":10001,"home":"Al-Faisaly","away":"Al-Wehdat","home_id":1540,"away_id":1541,"date":"2025-03-01"},
        {"id":10002,"home":"Al-Jazeera","away":"Shabab Al-Ordon","home_id":1542,"away_id":1543,"date":"2025-03-02"},
    ],
    327: [  # Uzbek Super League
        {"id":9501,"home":"Pakhtakor","away":"Lokomotiv Tashkent","home_id":1490,"away_id":1491,"date":"2025-04-01"},
        {"id":9502,"home":"Navbahor","away":"AGMK","home_id":1492,"away_id":1493,"date":"2025-04-02"},
    ],
    340: [  # Vietnamese V.League 1
        {"id":9601,"home":"Hanoi FC","away":"Ho Chi Minh City FC","home_id":1500,"away_id":1501,"date":"2025-03-01"},
        {"id":9602,"home":"Viettel FC","away":"Hoang Anh Gia Lai","home_id":1502,"away_id":1503,"date":"2025-03-02"},
    ],
    # CAF
    233: [  # Egyptian Premier League
        {"id":6101,"home":"Al Ahly","away":"Zamalek","home_id":1150,"away_id":1151,"date":"2025-03-01"},
        {"id":6102,"home":"Pyramids FC","away":"Al Masry","home_id":1152,"away_id":1153,"date":"2025-03-02"},
    ],
    288: [  # South African PSL
        {"id":6201,"home":"Mamelodi Sundowns","away":"Kaizer Chiefs","home_id":1160,"away_id":1161,"date":"2025-03-01"},
        {"id":6202,"home":"Orlando Pirates","away":"SuperSport United","home_id":1162,"away_id":1163,"date":"2025-03-02"},
    ],
    200: [  # Moroccan Botola Pro
        {"id":6301,"home":"Wydad Casablanca","away":"Raja Casablanca","home_id":1170,"away_id":1171,"date":"2025-03-01"},
        {"id":6302,"home":"FUS Rabat","away":"MAT","home_id":1172,"away_id":1173,"date":"2025-03-02"},
    ],
    500: [  # Tunisian Ligue 1
        {"id":6401,"home":"Esperance Tunis","away":"Club Africain","home_id":1180,"away_id":1181,"date":"2025-03-01"},
        {"id":6402,"home":"Etoile du Sahel","away":"CS Sfaxien","home_id":1182,"away_id":1183,"date":"2025-03-02"},
    ],
    404: [  # Algerian Ligue 1
        {"id":6501,"home":"USM Alger","away":"MC Alger","home_id":1190,"away_id":1191,"date":"2025-03-01"},
        {"id":6502,"home":"CR Belouizdad","away":"JS Kabylie","home_id":1192,"away_id":1193,"date":"2025-03-02"},
    ],
    431: [  # Nigerian Professional League
        {"id":6601,"home":"Enyimba","away":"Kano Pillars","home_id":1200,"away_id":1201,"date":"2025-03-01"},
        {"id":6602,"home":"Rivers United","away":"Akwa United","home_id":1202,"away_id":1203,"date":"2025-03-02"},
    ],
    426: [  # Ghanaian Premier League
        {"id":6701,"home":"Hearts of Oak","away":"Asante Kotoko","home_id":1210,"away_id":1211,"date":"2025-03-01"},
        {"id":6702,"home":"Accra Lions","away":"Dreams FC","home_id":1212,"away_id":1213,"date":"2025-03-02"},
    ],
    358: [  # Cameroonian MTN Elite One
        {"id":6801,"home":"Canon Yaounde","away":"Tonnerre Yaounde","home_id":1220,"away_id":1221,"date":"2025-03-01"},
        {"id":6802,"home":"Coton Sport","away":"Fovu Baham","home_id":1222,"away_id":1223,"date":"2025-03-02"},
    ],
    503: [  # Senegalese Ligue 1
        {"id":7101,"home":"Teungueth FC","away":"AS Pikine","home_id":1250,"away_id":1251,"date":"2025-03-01"},
        {"id":7102,"home":"Jaraaf","away":"Casa Sports","home_id":1252,"away_id":1253,"date":"2025-03-02"},
    ],
    418: [  # Ivorian Ligue 1
        {"id":7201,"home":"ASEC Mimosas","away":"Africa Sports","home_id":1260,"away_id":1261,"date":"2025-03-01"},
        {"id":7202,"home":"Stade d'Abidjan","away":"Sol FC","home_id":1262,"away_id":1263,"date":"2025-03-02"},
    ],
    469: [  # Kenyan Premier League
        {"id":6901,"home":"Gor Mahia","away":"AFC Leopards","home_id":1230,"away_id":1231,"date":"2025-03-01"},
        {"id":6902,"home":"Tusker FC","away":"Kakamega Homeboyz","home_id":1232,"away_id":1233,"date":"2025-03-02"},
    ],
    524: [  # Tanzanian Premier League
        {"id":7001,"home":"Simba SC","away":"Young Africans","home_id":1240,"away_id":1241,"date":"2025-03-01"},
        {"id":7002,"home":"Azam FC","away":"KMC FC","home_id":1242,"away_id":1243,"date":"2025-03-02"},
    ],
    411: [  # Libyan Premier League
        {"id":7301,"home":"Al-Ahly Tripoli","away":"Al-Ittihad Tripoli","home_id":1270,"away_id":1271,"date":"2025-03-01"},
        {"id":7302,"home":"Al-Hilal Benghazi","away":"Al-Nasr Benghazi","home_id":1272,"away_id":1273,"date":"2025-03-02"},
    ],
    # OFC
    365: [  # New Zealand
        {"id":9801,"home":"Auckland City FC","away":"Eastern Suburbs","home_id":1520,"away_id":1521,"date":"2025-03-01"},
        {"id":9802,"home":"Waitakere United","away":"Team Wellington","home_id":1522,"away_id":1523,"date":"2025-03-02"},
    ],
    # ── CUPE EUROPENE ────────────────────────────────────────────────────────
    2:   [  # UEFA Champions League
        {"id":20001,"home":"Real Madrid","away":"Manchester City","home_id":541,"away_id":50,"date":"2025-03-04"},
        {"id":20002,"home":"Bayern Munich","away":"Arsenal","home_id":157,"away_id":42,"date":"2025-03-05"},
        {"id":20003,"home":"Barcelona","away":"Inter","home_id":529,"away_id":505,"date":"2025-03-05"},
        {"id":20004,"home":"PSG","away":"Liverpool","home_id":85,"away_id":40,"date":"2025-03-06"},
        {"id":20005,"home":"Atletico Madrid","away":"Borussia Dortmund","home_id":530,"away_id":165,"date":"2025-03-11"},
        {"id":20006,"home":"Juventus","away":"Bayer Leverkusen","home_id":496,"away_id":168,"date":"2025-03-12"},
    ],
    3:   [  # UEFA Europa League
        {"id":21001,"home":"Manchester United","away":"Lyon","home_id":33,"away_id":80,"date":"2025-03-06"},
        {"id":21002,"home":"Roma","away":"Ajax","home_id":497,"away_id":194,"date":"2025-03-06"},
        {"id":21003,"home":"Tottenham","away":"Eintracht Frankfurt","home_id":47,"away_id":169,"date":"2025-03-13"},
        {"id":21004,"home":"Fenerbahce","away":"Sevilla","home_id":610,"away_id":536,"date":"2025-03-13"},
    ],
    848: [  # UEFA Conference League
        {"id":22001,"home":"Chelsea","away":"Fiorentina","home_id":49,"away_id":502,"date":"2025-03-06"},
        {"id":22002,"home":"Feyenoord","away":"Braga","home_id":196,"away_id":217,"date":"2025-03-06"},
        {"id":22003,"home":"Villarreal","away":"Anderlecht","home_id":533,"away_id":244,"date":"2025-03-13"},
    ],
}


# ─── Cupe europene ─────────────────────────────────────────────────────────────
EXTRA_LEAGUES = [
    {"rank": 0, "id": 2,   "name": "UEFA Champions League", "country": "Europe", "flag": "🏆", "confederation": "UEFA", "rating": 100.0},
    {"rank": 0, "id": 3,   "name": "UEFA Europa League",    "country": "Europe", "flag": "🥈", "confederation": "UEFA", "rating": 95.0},
    {"rank": 0, "id": 848, "name": "UEFA Conference League","country": "Europe", "flag": "🥉", "confederation": "UEFA", "rating": 90.0},
]


def get_fixtures_with_real_dates(league_id: int) -> list:
    """Returnează fixture-urile cu date reale ieri/azi/mâine/poimâine."""
    dates = get_ro_dates()
    day_cycle = [dates["yesterday"], dates["today"], dates["tomorrow"], dates["after"]]
    hour_options = ["16:00", "18:30", "19:00", "20:00", "21:00", "21:45", "22:00"]
    fixtures = DEMO_FIXTURES.get(league_id, [])
    result = []
    for i, f in enumerate(fixtures):
        f_copy = dict(f)
        f_copy["date"] = day_cycle[i % 4]
        f_copy["time"] = hour_options[f["id"] % len(hour_options)]
        result.append(f_copy)
    return result


# ─── ROUTES ────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "Football Predictor API", "status": "online"}


@app.get("/api/leagues")
async def get_leagues():
    all_leagues = EXTRA_LEAGUES + LEAGUES_LIST
    return {"leagues": all_leagues}


@app.get("/api/fixtures/{league_id}")
async def get_fixtures(league_id: int, season: int = 2024):
    try:
        fixtures = await fetcher.get_fixtures(league_id, season)
        if fixtures:
            dates = get_ro_dates()
            day_cycle = [dates["yesterday"], dates["today"], dates["tomorrow"], dates["after"]]
            hour_options = ["16:00", "18:30", "19:00", "20:00", "21:00", "21:45", "22:00"]
            for i, f in enumerate(fixtures):
                if not f.get("date") or f["date"] < dates["yesterday"]:
                    f["date"] = day_cycle[i % 4]
                f["time"] = hour_options[f.get("id", i) % len(hour_options)]
            return {"fixtures": fixtures, "league_id": league_id}
    except Exception:
        pass
    fixtures = get_fixtures_with_real_dates(league_id)
    return {"fixtures": fixtures, "league_id": league_id, "demo": True}


@app.get("/api/predict")
async def predict_match(
    home_team: str = Query(...),
    away_team: str = Query(...),
    league_id: int = Query(39),
    home_team_id: int = Query(None),
    away_team_id: int = Query(None),
):
    from models.betting import BettingCalculator

    try:
        result = await predictor.predict(
            home_team=home_team,
            away_team=away_team,
            league_id=league_id,
            home_team_id=home_team_id,
            away_team_id=away_team_id,
        )
    except Exception:
        result = predictor.demo_prediction(home_team, away_team)

    pred       = result.get("prediction") or {}
    breakdown  = result.get("model_breakdown") or {}
    team_stats = result.get("team_stats") or {}
    xg         = result.get("expected_goals") or {"home": 1.45, "away": 1.15}

    home_p = float(pred.get("home_win") or 45.0)
    draw_p = float(pred.get("draw") or 27.0)
    away_p = float(pred.get("away_win") or 28.0)
    lam    = float(xg.get("home") or 1.45)
    mu     = float(xg.get("away") or 1.15)

    try:
        betting = BettingCalculator()
        league_info = next((l for l in LEAGUES_LIST if l["id"] == league_id), None)
        league_rating = float(league_info["rating"]) if league_info else 50.0
        markets = betting.calculate_all_markets(
            lambda_=lam, mu=mu,
            home_team=home_team, away_team=away_team,
            league_rating=league_rating,
        )
    except Exception:
        markets = {}

    elo_bd     = breakdown.get("elo") or {}
    poisson_bd = breakdown.get("poisson") or {}
    xgb_bd     = breakdown.get("xgboost") or {}

    raw_scores = result.get("top_scores") or []
    top_scores = []
    for s in raw_scores[:10]:
        try:
            if "score" in s:
                score_str = str(s["score"])
            elif "home_goals" in s and "away_goals" in s:
                score_str = f"{s['home_goals']}:{s['away_goals']}"
            else:
                score_str = "0:0"
            top_scores.append({
                "score": score_str,
                "probability": round(float(s.get("probability") or 5.0), 2)
            })
        except Exception:
            continue

    def fmt_stats(s):
        if not s:
            return None
        try:
            return {
                "elo_rating": int(float(s.get("elo") or 1500)),
                "xg_for":     round(float(s.get("xg_for") or 1.4), 2),
                "xg_against": round(float(s.get("xg_against") or 1.1), 2),
                "goals_avg":  round(float(s.get("xg_for") or 1.4), 2),
                "form":       s.get("form") or ["W","D","W","W","L"],
            }
        except Exception:
            return None

    return {
        "home_team": home_team,
        "away_team": away_team,
        "probabilities": {
            "home": round(home_p, 1),
            "draw": round(draw_p, 1),
            "away": round(away_p, 1),
        },
        "elo": {
            "home": round(float(elo_bd.get("home_win") or home_p), 1),
            "draw": round(float(elo_bd.get("draw") or draw_p), 1),
            "away": round(float(elo_bd.get("away_win") or away_p), 1),
        },
        "poisson": {
            "home": round(float(poisson_bd.get("home_win") or home_p), 1),
            "draw": round(float(poisson_bd.get("draw") or draw_p), 1),
            "away": round(float(poisson_bd.get("away_win") or away_p), 1),
        },
        "xgboost": {
            "home": round(float(xgb_bd.get("home_win") or home_p), 1),
            "draw": round(float(xgb_bd.get("draw") or draw_p), 1),
            "away": round(float(xgb_bd.get("away_win") or away_p), 1),
        },
        "expected_goals": {"home": round(lam, 2), "away": round(mu, 2)},
        "top_scores": top_scores,
        "home_stats": fmt_stats(team_stats.get("home")),
        "away_stats": fmt_stats(team_stats.get("away")),
        "markets": markets,
    }


@app.get("/api/team-stats/{team_id}")
async def get_team_stats(team_id: int, league_id: int = 39, season: int = 2024):
    try:
        stats = await fetcher.get_team_stats(team_id, league_id, season)
        return stats
    except Exception as e:
        return {"error": str(e), "team_id": team_id}


@app.get("/api/health")
async def health():
    return {"status": "healthy", "model_loaded": predictor.model_loaded, "demo_mode": predictor.demo_mode}


# ─── WEEKLY ENDPOINT ───────────────────────────────────────────────────────────
from models.weekly import get_weekly_fixtures

@app.get("/api/weekly")
async def get_weekly():
    try:
        fixtures_with_dates = {}
        for league_id in DEMO_FIXTURES:
            fixtures_with_dates[league_id] = get_fixtures_with_real_dates(league_id)
        weekly = get_weekly_fixtures(fixtures_with_dates)
        return weekly
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
