// ── MLB Live Watchface  ·  PebbleKit JS ───────────────────────────────────
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

var API_KEY      = "c342abf737624462ab9d6c660d30a9b2";
var BASE_URL     = "https://api.sportsdata.io/v3/mlb/scores/json/GamesByDate";
var PBP_URL      = "https://api.sportsdata.io/v3/mlb/stats/json/PlayByPlay";
var STANDING_URL = "https://api.sportsdata.io/v3/mlb/scores/json/Standings";
var CONFIG_URL   = "https://brooks2564.github.io/Pebble-MLB-Live/mlb-config.html";

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
  { abbr: "OAK", name: "Athletics" },
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
var gTeamIdx     = parseInt(localStorage.getItem("teamIdx")     || "13");
var gVibrate     = localStorage.getItem("vibrate")    !== "0";
var gBatteryBar  = localStorage.getItem("batteryBar") !== "0";
var gTzOffset    = parseInt(localStorage.getItem("tzOffset")    || "-5");
var gTickerSpeed = parseInt(localStorage.getItem("tickerSpeed") || "5000");
var gStandings   = {};
var gAllGames    = [];  // today's full game list for ticker

// ── Utility ───────────────────────────────────────────────────────────────
function todayDateStr() {
  var d  = new Date();
  var mm = d.getMonth() + 1;
  var dd = d.getDate();
  return d.getFullYear() + "-" +
    (mm < 10 ? "0" + mm : mm) + "-" +
    (dd < 10 ? "0" + dd : dd);
}

function formatStartTime(isoStr) {
  if (!isoStr) return "";
  try {
    var parts = isoStr.split("T");
    if (parts.length < 2) return "";
    var tp = parts[1].split(":");
    var h  = parseInt(tp[0]);
    var m  = tp[1];
    var ampm = h >= 12 ? "PM" : "AM";
    h = h % 12; if (h === 0) h = 12;
    return h + ":" + m + " " + ampm;
  } catch(e) { return ""; }
}

// Map SportsData.io play description to short readable result (max ~12 chars)
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

// Extract pitch type abbreviation from description
function extractPitchType(desc) {
  if (!desc) return "";
  var d = desc.toLowerCase();
  if (d.indexOf("four-seam") !== -1 || d.indexOf("fastball") !== -1) return "FB";
  if (d.indexOf("two-seam")  !== -1 || d.indexOf("sinker")   !== -1) return "SIN";
  if (d.indexOf("curveball") !== -1 || d.indexOf("curve")    !== -1) return "CRV";
  if (d.indexOf("slider")    !== -1) return "SL";
  if (d.indexOf("changeup")  !== -1 || d.indexOf("change-up") !== -1) return "CH";
  if (d.indexOf("cutter")    !== -1) return "CUT";
  if (d.indexOf("sweeper")   !== -1) return "SWP";
  if (d.indexOf("splitter")  !== -1) return "SPL";
  if (d.indexOf("knuckle")   !== -1) return "KN";
  return "";
}

// ── Ticker builder ─────────────────────────────────────────────────────────
// Builds a pipe-delimited string of today's game scores for the ticker strip.
// Format per game: "ARI 3 - LAD 5 F" or "NYY vs BOS 7:05 PM" or "NYY 2 - BOS 4 T5"
function buildTicker(games, myAbbr) {
  var parts = [];
  for (var i = 0; i < games.length; i++) {
    var g    = games[i];
    var away = (g.AwayTeam || "").toUpperCase();
    var home = (g.HomeTeam || "").toUpperCase();
    if (away === myAbbr || home === myAbbr) continue; // skip my team's game
    var raw    = (g.Status || "").toLowerCase();
    var status = raw === "inprogress" ? "live"
               : raw === "final"     ? "final"
               : raw === "scheduled" ? "pre" : null;
    if (!status) continue;

    var entry = "";
    if (status === "pre") {
      var t = formatStartTime(g.DateTime || g.Day || "");
      entry = away + " vs " + home + (t ? " " + t : "");
    } else if (status === "final") {
      entry = away + " " + (g.AwayTeamRuns || 0) + " - " +
              home + " " + (g.HomeTeamRuns || 0) + " F";
    } else {
      // live
      var half = g.InningHalf === "B" ? "B" : "T";
      entry = away + " " + (g.AwayTeamRuns || 0) + " - " +
              home + " " + (g.HomeTeamRuns || 0) +
              " " + half + (g.Inning || "");
    }
    // Trim to 21 chars (GAME_LEN-1)
    if (entry.length > 21) entry = entry.substring(0, 21);
    parts.push(entry);
  }
  return parts.join("|");
}

// Find next scheduled game for the team (from another date's schedule)
// For now returns empty — future enhancement
function findNextGame() { return ""; }

// ── Standings fetch ────────────────────────────────────────────────────────
function fetchStandings(callback) {
  var year = new Date().getFullYear();
  var url  = STANDING_URL + "/" + year + "?key=" + API_KEY;
  var xhr  = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Accept", "application/json");
  xhr.onload = function() {
    if (xhr.status !== 200) { callback({}); return; }
    try {
      var data      = JSON.parse(xhr.responseText);
      var standings = {};
      var divisions = {};
      for (var i = 0; i < data.length; i++) {
        var s   = data[i];
        var div = s.Division || "?";
        if (!divisions[div]) divisions[div] = [];
        divisions[div].push(s);
      }
      for (var div in divisions) {
        var teams = divisions[div];
        teams.sort(function(a, b) { return (b.Wins || 0) - (a.Wins || 0); });
        for (var r = 0; r < teams.length; r++) {
          var abbr = (teams[r].Key || "").toUpperCase();
          standings[abbr] = {
            wins: teams[r].Wins || 0,
            losses: teams[r].Losses || 0
          };
        }
      }
      gStandings = standings;
      callback(standings);
    } catch(e) { callback({}); }
  };
  xhr.onerror = function() { callback({}); };
  xhr.send();
}

// ── Play-by-play fetch ─────────────────────────────────────────────────────
function fetchPlayByPlay(gameId, callback) {
  var url = PBP_URL + "/" + gameId + "?key=" + API_KEY;
  console.log("[MLB] Fetching PBP: " + url);
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Accept", "application/json");
  xhr.onload = function() {
    if (xhr.status !== 200) { callback(null); return; }
    try { callback(JSON.parse(xhr.responseText)); }
    catch(e) { console.log("[MLB] PBP parse error: " + e); callback(null); }
  };
  xhr.onerror = function() { callback(null); };
  xhr.send();
}

// Extract useful fields from play-by-play data
function extractPBP(pbpData) {
  var result = {
    batter:     "",
    pitchSpeed: 0,
    pitchType:  "",
    lastPlay:   "",
    onFirst:    0,
    onSecond:   0,
    onThird:    0
  };
  if (!pbpData) return result;

  var innings = pbpData.Innings || [];
  if (!innings.length) return result;

  // Walk backwards to find the most recent at-bat with plays
  var lastAtBat = null;
  for (var i = innings.length - 1; i >= 0; i--) {
    var inn   = innings[i];
    var atBats = (inn.TopHalfAtBats || []).concat(inn.BottomHalfAtBats || []);
    if (atBats.length) {
      lastAtBat = atBats[atBats.length - 1];
      break;
    }
  }
  if (!lastAtBat) return result;

  // Batter — last name only
  var batter = lastAtBat.Hitter || lastAtBat.BatterName || "";
  if (batter.indexOf(",") !== -1) {
    batter = batter.split(",")[0].trim();
  } else if (batter.indexOf(" ") !== -1) {
    batter = batter.split(" ").pop();
  }
  result.batter = batter.substring(0, 13);

  // Base runners
  result.onFirst  = lastAtBat.RunnerOnFirst  ? 1 : 0;
  result.onSecond = lastAtBat.RunnerOnSecond ? 1 : 0;
  result.onThird  = lastAtBat.RunnerOnThird  ? 1 : 0;

  // Last pitch/play
  var plays = lastAtBat.Pitches || lastAtBat.Plays || [];
  if (plays.length) {
    var last = plays[plays.length - 1];
    result.pitchSpeed = last.Speed || last.PitchSpeed || 0;
    var desc = last.Description || last.Result || last.Type || "";
    result.pitchType = extractPitchType(desc);
    result.lastPlay  = describePlay(desc);
  }

  return result;
}

// ── Game data fetch ───────────────────────────────────────────────────────
function fetchGameData(teamIdx) {
  var abbr = TEAMS[teamIdx].abbr;
  var url  = BASE_URL + "/" + todayDateStr() + "?key=" + API_KEY;
  console.log("[MLB] Fetching for " + abbr);
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.setRequestHeader("Accept", "application/json");
  xhr.onload = function() {
    if (xhr.status !== 200) { sendOffMessage(); return; }
    try {
      var games = JSON.parse(xhr.responseText);
      gAllGames = Array.isArray(games) ? games : [];
      processGames(gAllGames, abbr);
    } catch(e) {
      console.log("[MLB] Parse error: " + e);
      sendOffMessage();
    }
  };
  xhr.onerror = function() { sendOffMessage(); };
  xhr.send();
}

function processGames(games, abbr) {
  if (!Array.isArray(games) || !games.length) { sendOffMessage(); return; }

  var target = abbr.toUpperCase();

  // Find game 1 (and optionally game 2 for doubleheaders)
  var game1 = null, game2 = null;
  for (var i = 0; i < games.length; i++) {
    var g = games[i];
    if ((g.AwayTeam && g.AwayTeam.toUpperCase() === target) ||
        (g.HomeTeam && g.HomeTeam.toUpperCase() === target)) {
      if (!game1) game1 = g;
      else if (!game2) game2 = g;
    }
  }

  if (!game1) { sendOffMessage(); return; }

  var raw    = (game1.Status || "").toLowerCase();
  var status = raw === "inprogress" ? "live"
             : raw === "final"      ? "final"
             : raw === "scheduled"  ? "pre"
             : "off";

  var awayAbbr  = (game1.AwayTeam || "---").toUpperCase();
  var homeAbbr  = (game1.HomeTeam || "---").toUpperCase();
  var startTime = formatStartTime(game1.DateTime || game1.Day || "");
  var awayS     = gStandings[awayAbbr] || { wins: 0, losses: 0 };
  var homeS     = gStandings[homeAbbr] || { wins: 0, losses: 0 };

  // Weather from game data if available
  var weather = "";
  if (game1.Temperature)  weather = game1.Temperature + "F";
  else if (game1.Weather) weather = game1.Weather.substring(0, 15);

  // Game 2 (doubleheader)
  var g2status = "";
  var g2score  = "";
  if (game2) {
    var r2 = (game2.Status || "").toLowerCase();
    g2status = r2 === "inprogress" ? "live"
             : r2 === "final"      ? "final"
             : r2 === "scheduled"  ? "pre" : "off";
    if (g2status !== "off" && g2status !== "pre") {
      g2score = awayAbbr + " " + (game2.AwayTeamRuns || 0) + " - " +
                homeAbbr + " " + (game2.HomeTeamRuns || 0);
      if (g2status === "live") {
        var h2 = game2.InningHalf === "B" ? "Bot" : "Top";
        g2score += " " + h2 + " " + (game2.Inning || "");
      } else {
        g2score += " F";
      }
    } else if (g2status === "pre") {
      g2score = formatStartTime(game2.DateTime || game2.Day || "");
    }
  }

  // Ticker — all other games today
  var ticker = buildTicker(games, target);

  // Base message
  var msg = {};
  msg[KEY_AWAY_ABBR]    = awayAbbr;
  msg[KEY_HOME_ABBR]    = homeAbbr;
  msg[KEY_AWAY_SCORE]   = game1.AwayTeamRuns !== null && game1.AwayTeamRuns !== undefined ? game1.AwayTeamRuns : 0;
  msg[KEY_HOME_SCORE]   = game1.HomeTeamRuns !== null && game1.HomeTeamRuns !== undefined ? game1.HomeTeamRuns : 0;
  msg[KEY_INNING]       = game1.Inning    || 0;
  msg[KEY_INNING_HALF]  = game1.InningHalf === "B" ? 1 : 0;
  msg[KEY_BALLS]        = game1.Balls     || 0;
  msg[KEY_STRIKES]      = game1.Strikes   || 0;
  msg[KEY_OUTS]         = game1.Outs      || 0;
  msg[KEY_STATUS]       = status;
  msg[KEY_START_TIME]   = startTime;
  msg[KEY_AWAY_WINS]    = awayS.wins;
  msg[KEY_AWAY_LOSSES]  = awayS.losses;
  msg[KEY_HOME_WINS]    = homeS.wins;
  msg[KEY_HOME_LOSSES]  = homeS.losses;
  msg[KEY_VIBRATE]      = gVibrate ? 1 : 0;
  msg[KEY_BATTER]       = "";
  msg[KEY_PITCH_SPEED]  = 0;
  msg[KEY_LAST_PLAY]    = "";
  msg[KEY_ON_FIRST]     = 0;
  msg[KEY_ON_SECOND]    = 0;
  msg[KEY_ON_THIRD]     = 0;
  msg[KEY_NEXT_GAME]    = "";
  msg[KEY_BATTERY_BAR]  = gBatteryBar ? 1 : 0;
  msg[KEY_TICKER]       = ticker;
  msg[KEY_TICKER_SPEED] = gTickerSpeed;
  msg[KEY_WEATHER]      = weather;
  msg[KEY_PITCH_TYPE]   = "";
  msg[KEY_GAME2_STATUS] = g2status;
  msg[KEY_GAME2_SCORE]  = g2score;

  // Fetch play-by-play for live games
  if (status === "live") {
    var gameId = game1.GameID || game1.ScoreID || null;
    if (gameId) {
      fetchPlayByPlay(gameId, function(pbpData) {
        var pbp = extractPBP(pbpData);
        msg[KEY_BATTER]      = pbp.batter;
        msg[KEY_PITCH_SPEED] = pbp.pitchSpeed;
        msg[KEY_LAST_PLAY]   = pbp.lastPlay;
        msg[KEY_ON_FIRST]    = pbp.onFirst;
        msg[KEY_ON_SECOND]   = pbp.onSecond;
        msg[KEY_ON_THIRD]    = pbp.onThird;
        msg[KEY_PITCH_TYPE]  = pbp.pitchType;
        sendMessage(msg);
      });
      return;
    }
  }

  sendMessage(msg);
}

function sendOffMessage() {
  var msg = {};
  msg[KEY_STATUS] = "off";
  sendMessage(msg);
}

function sendMessage(dict) {
  Pebble.sendAppMessage(dict,
    function()  { console.log("[MLB] Message sent OK"); },
    function(e) { console.log("[MLB] NACK: " + JSON.stringify(e)); }
  );
}

// ── Pebble events ─────────────────────────────────────────────────────────
Pebble.addEventListener("ready", function() {
  console.log("[MLB] Ready – team: " + TEAMS[gTeamIdx].abbr);
  fetchStandings(function() {
    fetchGameData(gTeamIdx);
  });
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

// ── Settings ───────────────────────────────────────────────────────────────
Pebble.addEventListener("showConfiguration", function() {
  var url = CONFIG_URL + "#" + gTeamIdx +
    "|" + (gVibrate    ? "1" : "0") +
    "|" + (gBatteryBar ? "1" : "0") +
    "|" + gTzOffset +
    "|" + gTickerSpeed;
  Pebble.openURL(url);
});

Pebble.addEventListener("webviewclosed", function(e) {
  if (!e.response) return;
  try {
    var cfg = JSON.parse(decodeURIComponent(e.response));
    var idx = parseInt(cfg.teamIdx);
    if (isNaN(idx) || idx < 0 || idx >= TEAMS.length) return;

    gTeamIdx     = idx;
    gVibrate     = cfg.vibrate    === 1 || cfg.vibrate    === true || cfg.vibrate    === "1";
    gBatteryBar  = cfg.batteryBar === 1 || cfg.batteryBar === true || cfg.batteryBar === "1";
    gTzOffset    = parseInt(cfg.tzOffset)    || -5;
    gTickerSpeed = parseInt(cfg.tickerSpeed) || 5000;

    localStorage.setItem("teamIdx",     String(gTeamIdx));
    localStorage.setItem("vibrate",     gVibrate    ? "1" : "0");
    localStorage.setItem("batteryBar",  gBatteryBar ? "1" : "0");
    localStorage.setItem("tzOffset",    String(gTzOffset));
    localStorage.setItem("tickerSpeed", String(gTickerSpeed));

    console.log("[MLB] Settings – team: " + TEAMS[gTeamIdx].abbr +
      " vibrate: " + gVibrate + " battery: " + gBatteryBar +
      " tz: " + gTzOffset + " tickerSpeed: " + gTickerSpeed);

    // Send settings to watch, then refresh game data
    var settingsMsg = {};
    settingsMsg[KEY_TEAM_IDX]     = gTeamIdx;
    settingsMsg[KEY_VIBRATE]      = gVibrate    ? 1 : 0;
    settingsMsg[KEY_BATTERY_BAR]  = gBatteryBar ? 1 : 0;
    settingsMsg[KEY_TZ_OFFSET]    = gTzOffset;
    settingsMsg[KEY_TICKER_SPEED] = gTickerSpeed;
    Pebble.sendAppMessage(settingsMsg,
      function() { fetchGameData(gTeamIdx); },
      function() { fetchGameData(gTeamIdx); }
    );
  } catch(ex) {
    console.log("[MLB] webviewclosed error: " + ex);
  }
});
