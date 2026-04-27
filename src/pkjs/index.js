// ── MLB Live Watchface  ·  PebbleKit JS ───────────────────────────────────
var Clay = require('pebble-clay');
var clayConfig = require('./config.json');
var clay = new Clay(clayConfig);   // autoHandleEvents: true — Clay persists & sends AppMessage

var SIM_MODE = false;
function sendSimGame() {
  var msg = {};
  msg[KEY_AWAY_ABBR]    = "NYY";
  msg[KEY_HOME_ABBR]    = "BAL";
  msg[KEY_AWAY_SCORE]   = 2;
  msg[KEY_HOME_SCORE]   = 6;
  msg[KEY_INNING]       = 7;
  msg[KEY_INNING_HALF]  = 1; // Bot
  msg[KEY_BALLS]        = 2;
  msg[KEY_STRIKES]      = 1;
  msg[KEY_OUTS]         = 1;
  msg[KEY_STATUS]       = "live";
  msg[KEY_AWAY_WINS]    = 12;
  msg[KEY_AWAY_LOSSES]  = 6;
  msg[KEY_HOME_WINS]    = 11;
  msg[KEY_HOME_LOSSES]  = 7;
  msg[KEY_VIBRATE]      = 0;
  msg[KEY_BATTER]       = "Henderson";
  msg[KEY_PITCH_SPEED]  = 97;
  msg[KEY_PITCH_TYPE]   = "Fastball";
  msg[KEY_LAST_PLAY]    = "Single";
  msg[KEY_ON_FIRST]     = 1;
  msg[KEY_ON_SECOND]    = 1;
  msg[KEY_ON_THIRD]     = 0;
  msg[KEY_NEXT_GAME]    = "";
  msg[KEY_BATTERY_BAR]  = 1;
  msg[KEY_WEATHER]      = "";
  msg[KEY_GAME2_STATUS] = "";
  msg[KEY_GAME2_SCORE]  = "";
  var simExtra = {};
  simExtra[KEY_AWAY_PITCHER] = "";
  simExtra[KEY_HOME_PITCHER] = "";
  simExtra[KEY_WIN_PITCHER]  = "";
  simExtra[KEY_LOSS_PITCHER] = "";
  simExtra[KEY_SAVE_PITCHER] = "";
  simExtra[KEY_TV_NETWORK]   = "ESPN";
  sendMessage(msg, simExtra);
}
// Keys must match #define KEY_* in main.c exactly
var KEY_AWAY_ABBR    = 1;
var KEY_HOME_ABBR    = 2;
var KEY_AWAY_SCORE   = 3;
var KEY_HOME_SCORE   = 4;
var KEY_INNING       = 5;
var KEY_INNING_HALF  = 6;
var KEY_BALLS        = 7;
var KEY_STRIKES      = 8;
var KEY_OUTS         = 9;
var KEY_STATUS       = 10;
var KEY_TEAM_IDX     = 11;
var KEY_START_TIME   = 12;
var KEY_AWAY_WINS    = 13;
var KEY_AWAY_LOSSES  = 14;
var KEY_HOME_WINS    = 15;
var KEY_HOME_LOSSES  = 16;
var KEY_VIBRATE      = 17;
var KEY_BATTER       = 18;
var KEY_PITCH_SPEED  = 19;
var KEY_LAST_PLAY    = 20;
var KEY_ON_FIRST     = 21;
var KEY_ON_SECOND    = 22;
var KEY_ON_THIRD     = 23;
var KEY_NEXT_GAME    = 24;
var KEY_BATTERY_BAR  = 25;
var KEY_TICKER       = 26;
var KEY_WEATHER      = 27;
var KEY_PITCH_TYPE   = 28;
var KEY_GAME2_STATUS = 29;
var KEY_GAME2_SCORE  = 30;
var KEY_TZ_OFFSET    = 31;
var KEY_TICKER_SPEED = 32;
var KEY_AWAY_PITCHER = 33;
var KEY_HOME_PITCHER = 34;
var KEY_WIN_PITCHER  = 35;
var KEY_LOSS_PITCHER = 36;
var KEY_SAVE_PITCHER = 37;
var KEY_TV_NETWORK   = 38;

// Official MLB Stats API — free, no key required
var SCHEDULE_URL = "https://statsapi.mlb.com/api/v1/schedule";
var LIVE_URL     = "https://statsapi.mlb.com/api/v1.1/game";
// MLB Stats API uses shorter abbreviations for 5 teams — map to our internal 3-letter abbrs
var MLB_TO_INTERNAL = { "KC":"KCR", "SD":"SDP", "SF":"SFG", "TB":"TBR", "WSH":"WSN" };
function toInternal(abbr) { return MLB_TO_INTERNAL[abbr] || abbr; }

var TEAMS = [
  { abbr: "ARI", name: "D-backs"   },
  { abbr: "ATL", name: "Braves"    },
  { abbr: "BAL", name: "Orioles"   },
  { abbr: "BOS", name: "Red Sox"   },
  { abbr: "CHC", name: "Cubs"      },
  { abbr: "CWS", name: "White Sox" },
  { abbr: "CIN", name: "Reds"      },
  { abbr: "CLE", name: "Guardians" },
  { abbr: "COL", name: "Rockies"   },
  { abbr: "DET", name: "Tigers"    },
  { abbr: "HOU", name: "Astros"    },
  { abbr: "KCR", name: "Royals"    },
  { abbr: "LAA", name: "Angels"    },
  { abbr: "LAD", name: "Dodgers"   },
  { abbr: "MIA", name: "Marlins"   },
  { abbr: "MIL", name: "Brewers"   },
  { abbr: "MIN", name: "Twins"     },
  { abbr: "NYM", name: "Mets"      },
  { abbr: "NYY", name: "Yankees"   },
  { abbr: "ATH", name: "Athletics" },
  { abbr: "PHI", name: "Phillies"  },
  { abbr: "PIT", name: "Pirates"   },
  { abbr: "SDP", name: "Padres"    },
  { abbr: "SEA", name: "Mariners"  },
  { abbr: "SFG", name: "Giants"    },
  { abbr: "STL", name: "Cardinals" },
  { abbr: "TBR", name: "Rays"      },
  { abbr: "TEX", name: "Rangers"   },
  { abbr: "TOR", name: "Blue Jays" },
  { abbr: "WSN", name: "Nationals" }
];

// ── Saved state ────────────────────────────────────────────────────────────
// Clay stores all settings as one JSON object under 'clay-settings' in localStorage.
function validSpeedStr(s) {
  return s === "5000" || s === "10000" || s === "30000" || s === "60000";
}
var SPEED_NUM = {"5000":5000, "10000":10000, "30000":30000, "60000":60000};

var gTeamIdx     = 13;
var gVibrate     = true;
var gBatteryBar  = true;
var gTzOffset    = -5;
var gTickerSpeed = "5000";   // STRING to avoid Pebble JS number truncation bugs
var gAllGames    = [];

function loadFromClay() {
  var cs = {};
  try { cs = JSON.parse(localStorage.getItem("clay-settings")) || {}; } catch(e) {}

  var pIdx = parseInt(cs.TEAM_IDX, 10);
  if (!isNaN(pIdx) && pIdx >= 0 && pIdx < TEAMS.length) gTeamIdx = pIdx;
  if (cs.VIBRATE     !== undefined) gVibrate    = !!cs.VIBRATE;
  if (cs.BATTERY_BAR !== undefined) gBatteryBar = !!cs.BATTERY_BAR;
  var pTz = parseInt(cs.TZ_OFFSET, 10);
  if (!isNaN(pTz)) gTzOffset = pTz;
  var spd = cs.TICKER_SPEED !== undefined ? String(cs.TICKER_SPEED) : null;
  if (validSpeedStr(spd)) gTickerSpeed = spd;
}
loadFromClay();

// ── Utility ───────────────────────────────────────────────────────────────
function todayDateStr() {
  var d  = new Date();
  var mm = d.getMonth() + 1;
  var dd = d.getDate();
  return d.getFullYear() + "-" +
    (mm < 10 ? "0" + mm : mm) + "-" +
    (dd < 10 ? "0" + dd : dd);
}

function yesterdayDateStr() {
  var d  = new Date();
  d.setDate(d.getDate() - 1);
  var mm = d.getMonth() + 1;
  var dd = d.getDate();
  return d.getFullYear() + "-" +
    (mm < 10 ? "0" + mm : mm) + "-" +
    (dd < 10 ? "0" + dd : dd);
}

function tomorrowDateStr() {
  var d  = new Date();
  d.setDate(d.getDate() + 1);
  var mm = d.getMonth() + 1;
  var dd = d.getDate();
  return d.getFullYear() + "-" +
    (mm < 10 ? "0" + mm : mm) + "-" +
    (dd < 10 ? "0" + dd : dd);
}

// MLB Stats API returns game times in UTC — convert to phone's local timezone
function formatStartTime(isoStr) {
  if (!isoStr) return "";
  try {
    var d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    var h = d.getHours(), m = d.getMinutes();
    var ampm = h >= 12 ? "PM" : "AM";
    h = h % 12; if (h === 0) h = 12;
    return h + ":" + (m < 10 ? "0" + m : m) + " " + ampm;
  } catch(e) { return ""; }
}

function formatDayOfWeek(isoStr) {
  if (!isoStr) return "";
  try {
    var d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
  } catch(e) { return ""; }
}

// Map play description to short readable result (max ~12 chars)
function describePlay(desc) {
  if (!desc) return "";
  var d = desc.toLowerCase();
  if (d.indexOf("home run")  !== -1 || d.indexOf("homer") !== -1) return "Home Run";
  if (d.indexOf("triple")    !== -1) return "Triple";
  if (d.indexOf("double")    !== -1) return "Double";
  if (d.indexOf("single")    !== -1) return "Single";
  if (d.indexOf("walk")      !== -1 || d.indexOf("base on balls") !== -1) return "Walk";
  if (d.indexOf("hit by pitch") !== -1) return "HBP";
  if (d.indexOf("strikeout") !== -1 || d.indexOf("struck out")  !== -1) return "Strikeout";
  if (d.indexOf("fly out")   !== -1 || d.indexOf("flied out")   !== -1) return "Flyout";
  if (d.indexOf("ground out") !== -1 || d.indexOf("grounded out") !== -1) return "Groundout";
  if (d.indexOf("line out")  !== -1 || d.indexOf("lined out")   !== -1) return "Lineout";
  if (d.indexOf("pop out")   !== -1 || d.indexOf("popped out")  !== -1) return "Pop Out";
  if (d.indexOf("sac fly")   !== -1 || d.indexOf("sacrifice fly") !== -1) return "Sac Fly";
  if (d.indexOf("sac bunt")  !== -1 || d.indexOf("sacrifice bunt") !== -1) return "Sac Bunt";
  if (d.indexOf("double play") !== -1) return "Dbl Play";
  if (d.indexOf("force out")  !== -1) return "Force Out";
  if (d.indexOf("error")      !== -1) return "Error";
  if (d.indexOf("wild pitch") !== -1) return "Wild Pitch";
  if (d.indexOf("passed ball") !== -1) return "Passed Ball";
  if (d.indexOf("stolen base") !== -1) return "Stolen Base";
  if (d.indexOf("caught stealing") !== -1) return "Caught Stlg";
  if (d.indexOf("ball")   !== -1) return "Ball";
  if (d.indexOf("strike") !== -1) return "Strike";
  return desc.substring(0, 12);
}

// Map MLB Stats API pitch type codes to short display strings
var PITCH_CODE_MAP = {
  "FF":"Fastball", "FA":"Fastball", "SI":"Sinker", "FT":"Sinker",
  "CU":"Curveball", "KC":"Curveball", "SL":"Slider", "ST":"Sweeper",
  "CH":"Changeup", "FS":"Splitter", "FC":"Cutter", "KN":"Knuckle"
};
function pitchCodeToAbbr(code) { return PITCH_CODE_MAP[code] || ""; }

// Get last name, handling Jr./Sr./II/III suffixes
function getLastName(fullName) {
  if (!fullName) return "";
  var parts = fullName.split(" ");
  var suffixes = ["Jr.", "Sr.", "II", "III", "IV", "V"];
  var last = parts[parts.length - 1];
  if (parts.length >= 3 && suffixes.indexOf(last) !== -1)
    return (parts[parts.length - 2] + " " + last).substring(0, 12);
  return last.substring(0, 12);
}

// Fetch pitcher season W-L record from MLB Stats API
function fetchPitcherRecord(personId, callback) {
  var year = new Date().getFullYear();
  var url = "https://statsapi.mlb.com/api/v1/people/" + personId +
            "/stats?stats=season&season=" + year + "&group=pitching";
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Accept", "application/json");
  xhr.onload = function() {
    if (xhr.status !== 200) { callback(null); return; }
    try {
      var data   = JSON.parse(xhr.responseText);
      var splits = (data.stats && data.stats[0] && data.stats[0].splits) || [];
      if (splits.length > 0) {
        callback({ wins: splits[0].stat.wins || 0, losses: splits[0].stat.losses || 0 });
      } else { callback(null); }
    } catch(e) { callback(null); }
  };
  xhr.onerror = function() { callback(null); };
  xhr.send();
}

// True if game starts between now and 2 hours from now
function isWithinTwoHours(isoStr) {
  if (!isoStr) return false;
  try {
    var gameMs = new Date(isoStr).getTime();
    var nowMs  = Date.now();
    return gameMs > nowMs && (gameMs - nowMs) <= 2 * 60 * 60 * 1000;
  } catch(e) { return false; }
}

// Pick best TV network: national first, then user's team's local
function getTV(broadcasts, isUserHome) {
  if (!broadcasts || !broadcasts.length) return "";
  var national = ["FOX", "ESPN", "TBS", "FS1", "ESPN2", "MLB Network", "Peacock", "Apple TV+"];
  for (var i = 0; i < broadcasts.length; i++) {
    var bn = broadcasts[i].name || "";
    for (var j = 0; j < national.length; j++) {
      if (bn.indexOf(national[j]) !== -1) return bn.substring(0, 20);
    }
  }
  var side = isUserHome ? "home" : "away";
  for (var i = 0; i < broadcasts.length; i++) {
    if ((broadcasts[i].homeAway || "").toLowerCase() === side)
      return (broadcasts[i].name || "").substring(0, 20);
  }
  return broadcasts[0] ? (broadcasts[0].name || "").substring(0, 20) : "";
}

// ── Ticker builder ─────────────────────────────────────────────────────────
function buildTicker(games, myAbbr) {
  var parts = [];
  for (var i = 0; i < games.length; i++) {
    var g    = games[i];
    var away = toInternal((g.teams.away.team.abbreviation || "").toUpperCase());
    var home = toInternal((g.teams.home.team.abbreviation || "").toUpperCase());
    if (away === myAbbr || home === myAbbr) continue;

    var state  = (g.status && g.status.abstractGameState) || "";
    var status = state === "Live"    ? "live"
               : state === "Final"   ? "final"
               : state === "Preview" ? "pre" : null;
    if (!status) continue;

    var entry = "";
    if (status === "pre") {
      var t = formatStartTime(g.gameDate || "");
      entry = away + " vs " + home + (t ? " " + t : "");
    } else if (status === "final") {
      entry = away + " " + (g.teams.away.score || 0) + " - " +
              home + " " + (g.teams.home.score || 0) + " F";
    } else {
      var ls   = g.linescore || {};
      var half = ls.isTopInning ? "T" : "B";
      entry = away + " " + (g.teams.away.score || 0) + " - " +
              home + " " + (g.teams.home.score || 0) +
              " " + half + (ls.currentInning || "");
    }
    if (entry.length > 21) entry = entry.substring(0, 21);
    parts.push(entry);
  }
  return parts.join("|");
}

// ── Live game fetch ────────────────────────────────────────────────────────
function fetchLiveGame(gamePk, callback) {
  var url = LIVE_URL + "/" + gamePk + "/feed/live";
  console.log("[MLB] Fetching live: " + gamePk);
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Accept", "application/json");
  xhr.onload = function() {
    if (xhr.status !== 200) { callback(null); return; }
    try { callback(JSON.parse(xhr.responseText)); }
    catch(e) { console.log("[MLB] Live parse error: " + e); callback(null); }
  };
  xhr.onerror = function() { callback(null); };
  xhr.send();
}

function extractLivePBP(liveData) {
  var result = { batter:"", pitchSpeed:0, pitchType:"", lastPlay:"", onFirst:0, onSecond:0, onThird:0 };
  if (!liveData) return result;

  var ld        = liveData.liveData || {};
  var linescore = ld.linescore || {};
  var offense   = linescore.offense || {};

  // Batter last name (handle suffixes like Jr., Sr., II, III, IV)
  if (offense.batter && offense.batter.fullName) {
    var np = offense.batter.fullName.split(" ");
    var suffixes = ["Jr.", "Sr.", "II", "III", "IV", "V"];
    var last = np[np.length - 1];
    if (np.length >= 3 && suffixes.indexOf(last) !== -1) {
      result.batter = (np[np.length - 2] + " " + last).substring(0, 13);
    } else {
      result.batter = last.substring(0, 13);
    }
  }

  // Base runners
  result.onFirst  = offense.first  ? 1 : 0;
  result.onSecond = offense.second ? 1 : 0;
  result.onThird  = offense.third  ? 1 : 0;

  // Current play
  var plays       = ld.plays || {};
  var currentPlay = plays.currentPlay || {};
  var playResult  = currentPlay.result || {};
  result.lastPlay = describePlay(playResult.description || "");

  // Last pitch in current play
  var playEvents = currentPlay.playEvents || [];
  for (var i = playEvents.length - 1; i >= 0; i--) {
    var ev = playEvents[i];
    if (ev.isPitch) {
      var pd      = ev.pitchData || {};
      var details = ev.details  || {};
      var typeObj = details.type || {};
      result.pitchSpeed = Math.round(pd.startSpeed || 0);
      result.pitchType  = pitchCodeToAbbr(typeObj.code || "");
      break;
    }
  }

  return result;
}

// ── Game data fetch ───────────────────────────────────────────────────────
function fetchGameData(teamIdx) {
  if (SIM_MODE) { sendSimGame(); return; }
  var abbr      = TEAMS[teamIdx].abbr;
  var today     = todayDateStr();
  var yesterday = yesterdayDateStr();
  var tomorrow  = tomorrowDateStr();
  var url = SCHEDULE_URL + "?sportId=1&startDate=" + yesterday + "&endDate=" + tomorrow + "&hydrate=linescore,team,probables,weather,broadcasts(all),decisions";
  console.log("[MLB] Fetching for " + abbr + " (" + yesterday + " to " + today + ")");
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Accept", "application/json");
  xhr.onload = function() {
    if (xhr.status !== 200) {
      console.log("[MLB] API error: " + xhr.status);
      sendOffMessage();
      return;
    }
    try {
      var data  = JSON.parse(xhr.responseText);
      var dates = data.dates || [];
      // Collect today's games for ticker and next-game lookup
      var todayGames = [];
      for (var d = 0; d < dates.length; d++) {
        if (dates[d].date === today) { todayGames = dates[d].games || []; break; }
      }
      gAllGames = todayGames;
      processGames(dates, todayGames, abbr, today, yesterday, tomorrow);
    } catch(e) {
      console.log("[MLB] Parse error: " + e);
      sendOffMessage();
    }
  };
  xhr.onerror = function() { sendOffMessage(); };
  xhr.send();
}

function findTeamGame(gamesList, target, stateFilter) {
  for (var i = 0; i < gamesList.length; i++) {
    var g     = gamesList[i];
    var awayA = toInternal((g.teams.away.team.abbreviation || "").toUpperCase());
    var homeA = toInternal((g.teams.home.team.abbreviation || "").toUpperCase());
    if (awayA !== target && homeA !== target) continue;
    var state = (g.status && g.status.abstractGameState) || "";
    if (!stateFilter || state === stateFilter) return g;
  }
  return null;
}

function processGames(dates, todayGames, abbr, today, yesterday, tomorrow) {
  var target = abbr.toUpperCase();

  // Collect tomorrow's games for next-game lookup
  var tomorrowGames = [];
  for (var d = 0; d < dates.length; d++) {
    if (dates[d].date === tomorrow) { tomorrowGames = dates[d].games || []; break; }
  }

  // Pass 1: LIVE game on any date (midnight crossing)
  var game1 = null;
  for (var d = 0; d < dates.length && !game1; d++) {
    game1 = findTeamGame(dates[d].games || [], target, "Live");
  }

  // Pass 1b: PRE-GAME starting within 2 hours — beats yesterday's final
  if (!game1) {
    var preGame = findTeamGame(todayGames, target, "Preview");
    if (preGame && isWithinTwoHours(preGame.gameDate)) game1 = preGame;
  }

  // Pass 2: FINAL — prefer today over yesterday
  if (!game1) {
    game1 = findTeamGame(todayGames, target, "Final");
  }
  if (!game1) {
    var yGames = [];
    for (var d = 0; d < dates.length; d++) {
      if (dates[d].date === yesterday) { yGames = dates[d].games || []; break; }
    }
    game1 = findTeamGame(yGames, target, "Final");
  }

  // Pass 3: PRE-GAME from today
  if (!game1) {
    game1 = findTeamGame(todayGames, target, "Preview");
  }

  if (!game1) { sendOffMessage(); return; }

  var state  = (game1.status && game1.status.abstractGameState) || "";
  var status = state === "Live"    ? "live"
             : state === "Final"   ? "final"
             : state === "Preview" ? "pre"
             : "off";

  var awayAbbr = toInternal((game1.teams.away.team.abbreviation || "---").toUpperCase());
  var homeAbbr = toInternal((game1.teams.home.team.abbreviation || "---").toUpperCase());
  var awayRec  = game1.teams.away.leagueRecord || {};
  var homeRec  = game1.teams.home.leagueRecord || {};
  var ls       = game1.linescore || {};
  var offense  = ls.offense || {};

  // Game 2 (doubleheader) — only look in same-date games as game1
  var game1Date = (game1.officialDate || game1.gameDate || "").substring(0, 10);
  var sameDateGames = [];
  for (var d = 0; d < dates.length; d++) {
    if ((dates[d].date || "") === game1Date) { sameDateGames = dates[d].games || []; break; }
  }
  var game2 = null;
  var foundFirst = false;
  for (var i = 0; i < sameDateGames.length; i++) {
    var g     = sameDateGames[i];
    var awayA = toInternal((g.teams.away.team.abbreviation || "").toUpperCase());
    var homeA = toInternal((g.teams.home.team.abbreviation || "").toUpperCase());
    if (awayA !== target && homeA !== target) continue;
    if (!foundFirst) { foundFirst = true; continue; }
    game2 = g; break;
  }

  var g2status = "", g2score = "";
  if (game2) {
    var s2   = (game2.status && game2.status.abstractGameState) || "";
    g2status = s2 === "Live"    ? "live"
             : s2 === "Final"   ? "final"
             : s2 === "Preview" ? "pre" : "off";
    if (g2status === "pre") {
      g2score = formatStartTime(game2.gameDate || "");
    } else if (g2status !== "off") {
      var ls2 = game2.linescore || {};
      g2score = awayAbbr + " " + (game2.teams.away.score || 0) + " - " +
                homeAbbr + " " + (game2.teams.home.score || 0);
      if (g2status === "live") {
        g2score += " " + (ls2.isTopInning ? "Top" : "Bot") + " " + (ls2.currentInning || "");
      } else {
        g2score += " F";
      }
    }
  }

  // Next game: when final (and doubleheader game2, if any, is also done)
  var nextGame = "";
  if (status === "final" && (!game2 || g2status === "final")) {
    var nextG = findTeamGame(todayGames, target, "Preview") ||
                findTeamGame(tomorrowGames, target, "Preview");
    if (nextG) {
      var nextAway = toInternal((nextG.teams.away.team.abbreviation || "").toUpperCase());
      var nextHome = toInternal((nextG.teams.home.team.abbreviation || "").toUpperCase());
      var opp      = (nextAway === target) ? nextHome : nextAway;
      var t        = formatStartTime(nextG.gameDate || "");
      var day      = formatDayOfWeek(nextG.gameDate || "");
      nextGame     = opp + (day ? " " + day : "") + (t ? " " + t : "");
      if (nextGame.length > 19) nextGame = nextGame.substring(0, 19);
    }
  }

  var msg = {};
  msg[KEY_AWAY_ABBR]    = awayAbbr;
  msg[KEY_HOME_ABBR]    = homeAbbr;
  msg[KEY_AWAY_SCORE]   = game1.teams.away.score || 0;
  msg[KEY_HOME_SCORE]   = game1.teams.home.score || 0;
  msg[KEY_INNING]       = ls.currentInning || 0;
  msg[KEY_INNING_HALF]  = ls.isTopInning ? 0 : 1;
  msg[KEY_BALLS]        = ls.balls   || 0;
  msg[KEY_STRIKES]      = ls.strikes || 0;
  msg[KEY_OUTS]         = ls.outs    || 0;
  msg[KEY_STATUS]       = status;
  msg[KEY_START_TIME]   = formatStartTime(game1.gameDate || "");
  msg[KEY_AWAY_WINS]    = awayRec.wins   || 0;
  msg[KEY_AWAY_LOSSES]  = awayRec.losses || 0;
  msg[KEY_HOME_WINS]    = homeRec.wins   || 0;
  msg[KEY_HOME_LOSSES]  = homeRec.losses || 0;
  msg[KEY_VIBRATE]      = gVibrate ? 1 : 0;
  msg[KEY_BATTER]       = "";
  msg[KEY_PITCH_SPEED]  = 0;
  msg[KEY_LAST_PLAY]    = "";
  msg[KEY_ON_FIRST]     = offense.first  ? 1 : 0;
  msg[KEY_ON_SECOND]    = offense.second ? 1 : 0;
  msg[KEY_ON_THIRD]     = offense.third  ? 1 : 0;
  msg[KEY_NEXT_GAME]    = nextGame;
  msg[KEY_BATTERY_BAR]  = gBatteryBar ? 1 : 0;
  msg[KEY_TICKER]       = buildTicker(todayGames, target);
  // Weather from schedule API
  var gWeather = game1.weather || {};
  var weatherStr = "";
  if (gWeather.temp) weatherStr = gWeather.temp + "\xB0";
  if (gWeather.condition && gWeather.condition !== "Unknown")
    weatherStr += (weatherStr ? " " : "") + gWeather.condition;
  msg[KEY_WEATHER]      = weatherStr;
  msg[KEY_PITCH_TYPE]   = "";
  msg[KEY_GAME2_STATUS] = g2status;
  msg[KEY_GAME2_SCORE]  = g2score;

  // Extra message: pitchers, decisions, TV (sent separately to stay under 512 bytes)
  var isUserHome = (homeAbbr === target);
  var extraMsg = {};
  extraMsg[KEY_TV_NETWORK]   = getTV(game1.broadcasts || [], isUserHome);
  extraMsg[KEY_AWAY_PITCHER] = "";
  extraMsg[KEY_HOME_PITCHER] = "";
  extraMsg[KEY_WIN_PITCHER]  = "";
  extraMsg[KEY_LOSS_PITCHER] = "";
  extraMsg[KEY_SAVE_PITCHER] = "";

  if (status === "live" && game1.gamePk) {
    fetchLiveGame(game1.gamePk, function(liveData) {
      var pbp = extractLivePBP(liveData);
      msg[KEY_BATTER]      = pbp.batter;
      msg[KEY_PITCH_SPEED] = pbp.pitchSpeed;
      msg[KEY_LAST_PLAY]   = pbp.lastPlay;
      msg[KEY_ON_FIRST]    = pbp.onFirst;
      msg[KEY_ON_SECOND]   = pbp.onSecond;
      msg[KEY_ON_THIRD]    = pbp.onThird;
      msg[KEY_PITCH_TYPE]  = pbp.pitchType;
      sendMessage(msg, extraMsg);
    });
    return;
  }

  // Final: pitcher decisions from schedule hydration
  if (status === "final") {
    var d = game1.decisions || {};
    if (d.winner && d.winner.fullName) extraMsg[KEY_WIN_PITCHER]  = "W: "  + getLastName(d.winner.fullName);
    if (d.loser  && d.loser.fullName)  extraMsg[KEY_LOSS_PITCHER] = "L: "  + getLastName(d.loser.fullName);
    if (d.save   && d.save.fullName)   extraMsg[KEY_SAVE_PITCHER] = "SV: " + getLastName(d.save.fullName);
    sendMessage(msg, extraMsg);
    return;
  }

  // Pre-game: probable starters + season W-L records (async)
  if (status === "pre") {
    var awayProb = game1.teams.away.probablePitcher || {};
    var homeProb = game1.teams.home.probablePitcher || {};
    var awayName = getLastName(awayProb.fullName || "");
    var homeName = getLastName(homeProb.fullName || "");
    var awayId   = awayProb.id;
    var homeId   = homeProb.id;
    var pending = 0, awayRec = null, homeRec = null;

    function onPitchersDone() {
      if (awayName) extraMsg[KEY_AWAY_PITCHER] = awayName + (awayRec ? " " + awayRec.wins + "-" + awayRec.losses : "");
      if (homeName) extraMsg[KEY_HOME_PITCHER] = homeName + (homeRec ? " " + homeRec.wins + "-" + homeRec.losses : "");
      sendMessage(msg, extraMsg);
    }
    if (awayId) { pending++; fetchPitcherRecord(awayId, function(r) { awayRec = r; if (--pending === 0) onPitchersDone(); }); }
    if (homeId) { pending++; fetchPitcherRecord(homeId, function(r) { homeRec = r; if (--pending === 0) onPitchersDone(); }); }
    if (pending === 0) onPitchersDone();
    return;
  }

  sendMessage(msg, extraMsg);
}

function sendOffMessage() {
  var msg = {};
  msg[KEY_STATUS] = "off";
  sendMessage(msg);
}

function sendExtraMsg(extraMsg) {
  Pebble.sendAppMessage(extraMsg,
    function()  { console.log("[MLB] Extra sent OK"); },
    function(e) { console.log("[MLB] Extra NACK: " + JSON.stringify(e)); }
  );
}

function sendMessage(dict, extraMsg) {
  // Send TICKER in a separate message to avoid 512-byte inbox overflow.
  // A full game message + long ticker string can exceed the buffer.
  // Extra msg (pitchers, TV) goes in a third message for the same reason.
  var ticker = dict[KEY_TICKER];
  delete dict[KEY_TICKER];

  Pebble.sendAppMessage(dict,
    function() {
      console.log("[MLB] Message sent OK");
      if (ticker !== undefined) {
        var tm = {};
        tm[KEY_TICKER] = ticker;
        Pebble.sendAppMessage(tm,
          function() {
            console.log("[MLB] Ticker sent OK");
            if (extraMsg) sendExtraMsg(extraMsg);
          },
          function(e) { console.log("[MLB] Ticker NACK: " + JSON.stringify(e)); }
        );
      } else if (extraMsg) {
        sendExtraMsg(extraMsg);
      }
    },
    function(e) { console.log("[MLB] NACK: " + JSON.stringify(e)); }
  );
}

// ── Pebble events ─────────────────────────────────────────────────────────
Pebble.addEventListener("ready", function() {
  console.log("[MLB] Ready – team: " + TEAMS[gTeamIdx].abbr);
  fetchGameData(gTeamIdx);
});

Pebble.addEventListener("appmessage", function(e) {
  var msg = e.payload;
  var idx = parseInt(msg[KEY_TEAM_IDX]);
  if (!isNaN(idx) && idx >= 0 && idx < TEAMS.length) {
    gTeamIdx = idx;
    localStorage.setItem("teamIdx", String(gTeamIdx));
  }
  fetchGameData(gTeamIdx);
});

// ── Settings (Clay) ────────────────────────────────────────────────────────
// Clay handles showConfiguration + webviewclosed automatically (saves to localStorage,
// sends AppMessage to watch). We listen afterward to refresh our pkjs globals and
// trigger an immediate data refetch with the new team.
Pebble.addEventListener("webviewclosed", function(e) {
  if (!e || !e.response || e.response === "CANCELLED") return;
  try {
    loadFromClay();
    fetchGameData(gTeamIdx);
  } catch(ex) {
    console.log("[MLB] webviewclosed error: " + ex);
  }
});
