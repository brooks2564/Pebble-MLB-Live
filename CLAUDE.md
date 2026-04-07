# MLB Live Scores — Claude Code Instructions

## Project Overview
**MLB Live Scores** is a Pebble smartwatch **watchface** that displays live MLB scores, inning data, pitch info, base runners, BSO counts, and a scrolling ticker of all today's games.
UUID: `2ef10c51-88ea-4939-8e5b-76a139743d33`
GitHub: `brooks2564/Pebble-MLB-Live`
Data: Official MLB Stats API (free, no key — statsapi.mlb.com)

## Build & Install
Always rebuild, update the committed PBW, and push together:
```bash
pebble build
cp build/Pebble-MLB-Live.pbw Pebble-MLB-Live.pbw
pebble install --phone 192.168.0.238
git add Pebble-MLB-Live.pbw
git commit -m "Update PBW"
git push
```

## Project Structure
```
Pebble-MLB-Live/
├── package.json            ← Pebble manifest, all 7 platforms, 32 message keys
├── wscript                 ← Build script
├── CLAUDE.md               ← This file
├── mlb-config.html         ← Settings page (hosted on GitHub Pages)
├── Pebble-MLB-Live.pbw     ← Latest compiled binary (for store upload)
├── screenshots/
│   ├── banner.png          ← 720x320 app store banner
│   ├── icon_144.png        ← 144x144 app icon
│   ├── icon_80.png         ← 80x80 app icon
│   └── icon_25.png         ← 25x25 Pebble menu icon
├── src/
│   ├── c/main.c            ← Watchface C code
│   └── pkjs/index.js       ← PebbleKit JS (fetches scores, builds ticker)
```

## Target Platforms (all 7)
- aplite — Pebble / Pebble Steel (B&W, 144x168)
- basalt — Pebble Time / Time Steel (color, 144x168)
- chalk  — Pebble Time Round (color, round, 180x180)
- diorite — Pebble 2 SE/HR (B&W, 144x168)
- emery  — Pebble Time 2 (color, 200x228)
- flint  — Pebble 2 Duo (B&W, 144x168)
- gabbro — Pebble Round 2 (color, round, 180x180)

## Message Keys (must match #define KEY_* in main.c)
| Key           | ID | Direction   |
|---------------|----|-------------|
| AWAY_ABBR     | 1  | JS → Watch  |
| HOME_ABBR     | 2  | JS → Watch  |
| AWAY_SCORE    | 3  | JS → Watch  |
| HOME_SCORE    | 4  | JS → Watch  |
| INNING        | 5  | JS → Watch  |
| INNING_HALF   | 6  | JS → Watch  |
| BALLS         | 7  | JS → Watch  |
| STRIKES       | 8  | JS → Watch  |
| OUTS          | 9  | JS → Watch  |
| STATUS        | 10 | JS → Watch  |
| TEAM_IDX      | 11 | Both        |
| START_TIME    | 12 | JS → Watch  |
| AWAY_WINS     | 13 | JS → Watch  |
| AWAY_LOSSES   | 14 | JS → Watch  |
| HOME_WINS     | 15 | JS → Watch  |
| HOME_LOSSES   | 16 | JS → Watch  |
| VIBRATE       | 17 | JS → Watch  |
| BATTER        | 18 | JS → Watch  |
| PITCH_SPEED   | 19 | JS → Watch  |
| LAST_PLAY     | 20 | JS → Watch  |
| ON_FIRST      | 21 | JS → Watch  |
| ON_SECOND     | 22 | JS → Watch  |
| ON_THIRD      | 23 | JS → Watch  |
| NEXT_GAME     | 24 | JS → Watch  |
| BATTERY_BAR   | 25 | JS → Watch  |
| TICKER        | 26 | JS → Watch  |
| WEATHER       | 27 | JS → Watch  |
| PITCH_TYPE    | 28 | JS → Watch  |
| GAME2_STATUS  | 29 | JS → Watch  |
| GAME2_SCORE   | 30 | JS → Watch  |
| TZ_OFFSET     | 31 | JS → Watch  |
| TICKER_SPEED  | 32 | JS → Watch  |

## Key Architecture Details
- **Watchface** (not watchapp) — no button handling, no menu
- **MINUTE_UNIT tick** triggers `request_game_data()` every minute
- **AppMessage inbox** is 512 bytes; outbox is 64 bytes
- **Round screen padding** — `hpad=18` on PBL_ROUND, `hpad=2` on rect; all left/right coordinates use `hpad`
- **Ticker animation** — two TextLayer sliding up inside a clip Layer; pipe-delimited string from JS parsed into `s_games[]`
- **Ticker speed** — persisted to flash (PERSIST_TICKER_SPEED=5), valid values: 5000/10000/30000/60000 ms
- **STATUS values**: `"live"`, `"pre"`, `"final"`, `"off"`
- **Vibration** — double pulse when tracked team scores; compares `s_prev_score` to current

## Settings (mlb-config.html)
Hosted at `https://brooks2564.github.io/Pebble-MLB-Live/mlb-config.html`
Hash format passed in: `#teamIdx|vibrate|batteryBar|tzOffset|tickerSpeed`
Returns JSON via `pebblejs://close#encodeURIComponent({...})`

## CloudPebble (repebble)
Import this repo directly into CloudPebble:
```
https://cloudpebble.repebble.com/ide/import/github/brooks2564/Pebble-MLB-Live
```
cloudpebble.net is dead (redirects to Fitbit). Use cloudpebble.repebble.com instead.

## Git
```bash
git add -p
git commit -m "message"
git push   # token already embedded in remote URL
```
