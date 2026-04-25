# ⚾ MLB Live Scores

A live MLB scoreboard watchface for Pebble smartwatches. Scores, innings, pitch data, base runners, and a full league ticker — all on your wrist.

---

## 🕹️ What It Shows

**Score area:**
- Away and home team abbreviations with win/loss records
- Live score updated every minute
- Inning and half-inning (Top / Bot)

**Pre-game** (shown 2 hours before first pitch):
- Start time and weather conditions (temperature + sky)
- Probable starting pitchers for both teams with current season W-L record
- TV network carrying the game (national broadcast prioritized, falls back to your team's local)

**Final game:**
- Winning and losing pitcher (e.g. `W: Cole  L: Burnes`)
- Save pitcher if applicable (e.g. `SV: Clase`)
- Next scheduled game

**Live game detail:**
- ⚾ **Base runner diamond** — lights up which bases are occupied
- 🔢 **Balls / Strikes / Outs** — dot indicators updated in real time
- 🧢 **Current batter** — last name of the batter at the plate
- 💨 **Pitch speed and type** — e.g. `Fastball 97` or `Slider 88`
- 📋 **Last play result** — e.g. `Single`, `Strikeout`, `Home Run`

**Ticker strip:**
- Scrolling strip across the top showing scores from every other game today
- Cycles through all active games automatically
- Speed is adjustable in settings

**Always visible:**
- 🕐 Current time (large)
- 📅 Date
- 🔋 Battery bar at bottom of screen (optional)

---

## ⚙️ Settings

Open the Pebble app → tap the watchface → **Settings**

- ⚾ **Favorite Team** — choose from all 30 MLB teams
- 📳 **Vibrate on Score** — double pulse when your team scores a run
- 🔋 **Battery Bar** — toggle the battery indicator
- 🌍 **Timezone** — set your local timezone for correct game times
- ⏱️ **Ticker Speed** — how long each game is shown (5s, 10s, 30s, 60s)

---

## ⌚ Supported Watches

Runs on all 7 Pebble platforms — every watch ever made:

- **Pebble** and **Pebble Steel** — original B&W classics
- **Pebble Time** and **Pebble Time Steel** — full color
- **Pebble Time Round** — color, round screen
- **Pebble Time 2** — color, large screen
- **Pebble 2 SE** and **Pebble 2 HR** — heart rate models
- **Pebble 2 Duo** — B&W rectangular
- **Pebble Round 2** — large round color screen

---

## 📡 Data Source

All data comes from the official [MLB Stats API](https://statsapi.mlb.com) — free, no API key required. Game data refreshes every minute while the watchface is active.

---

## 🔧 Building

Requires the [Pebble SDK](https://developer.rebble.io/developer.pebble.com/sdk/index.html).

```bash
pebble build
pebble install --phone YOUR_PHONE_IP
```

---

## 📂 Project Structure

```
src/c/main.c          — Watchface C code (drawing, animation, message handling)
src/pkjs/index.js     — PebbleKit JS (fetches scores, sends data to watch)
mlb-config.html       — Settings page (hosted on GitHub Pages)
package.json          — Pebble project config and message keys
```
