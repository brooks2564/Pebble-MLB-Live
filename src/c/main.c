// ── MLB Live Watchface  ·  main.c ─────────────────────────────────────────
#include <pebble.h>

#define KEY_AWAY_ABBR    1
#define KEY_HOME_ABBR    2
#define KEY_AWAY_SCORE   3
#define KEY_HOME_SCORE   4
#define KEY_INNING       5
#define KEY_INNING_HALF  6
#define KEY_BALLS        7
#define KEY_STRIKES      8
#define KEY_OUTS         9
#define KEY_STATUS       10
#define KEY_TEAM_IDX     11
#define KEY_START_TIME   12
#define KEY_AWAY_WINS    13
#define KEY_AWAY_LOSSES  14
#define KEY_HOME_WINS    15
#define KEY_HOME_LOSSES  16
#define KEY_VIBRATE      17
#define KEY_BATTER       18
#define KEY_PITCH_SPEED  19
#define KEY_LAST_PLAY    20
#define KEY_ON_FIRST     21
#define KEY_ON_SECOND    22
#define KEY_ON_THIRD     23
#define KEY_NEXT_GAME    24
#define KEY_BATTERY_BAR  25
#define KEY_TICKER       26
#define KEY_WEATHER      27
#define KEY_PITCH_TYPE   28
#define KEY_GAME2_STATUS 29
#define KEY_GAME2_SCORE  30
#define KEY_TZ_OFFSET    31
#define KEY_TICKER_SPEED 32
#define KEY_AWAY_PITCHER 33
#define KEY_HOME_PITCHER 34
#define KEY_WIN_PITCHER  35
#define KEY_LOSS_PITCHER 36
#define KEY_SAVE_PITCHER 37
#define KEY_TV_NETWORK   38

#define NUM_TEAMS    30
#define PERSIST_TEAM 1
#define PERSIST_VIB  2
#define PERSIST_BAT  3
#define PERSIST_TZ   4
#define PERSIST_TICKER_SPEED 5

#ifdef PBL_PLATFORM_EMERY
#define TICKER_H 24
#else
#define TICKER_H 18
#endif

static const char *TEAM_ABBR[NUM_TEAMS] = {
  "ARI","ATL","BAL","BOS","CHC","CWS","CIN","CLE","COL","DET",
  "HOU","KCR","LAA","LAD","MIA","MIL","MIN","NYM","NYY","ATH",
  "PHI","PIT","SDP","SEA","SFG","STL","TBR","TEX","TOR","WSN"
};

static Window    *s_window;
static Layer     *s_canvas;
#ifdef PBL_PLATFORM_EMERY
static GBitmap   *s_diamond_bmp = NULL;
#endif
static Layer     *s_ticker_clip;   // clips animation to ticker row
static TextLayer *s_ticker_cur;
static TextLayer *s_ticker_next;
static AppTimer  *s_ticker_timer;
static bool       s_anim_running = false;

// Ticker state — all static, no dynamic allocation
#define MAX_GAMES 8
#define GAME_LEN  22
static char s_ticker_raw[200];
static char s_games[MAX_GAMES][GAME_LEN];
static int  s_game_count;
static int  s_game_idx;

// Game state
static char s_time_buf[6]    = "00:00";
static char s_date_buf[14]   = "";
static char s_away_abbr[5]   = "---";
static char s_home_abbr[5]   = "---";
static int  s_away_score;
static int  s_home_score;
static int  s_inning;
static int  s_inning_half;
static int  s_balls;
static int  s_strikes;
static int  s_outs;
static char s_status[8]      = "off";
static char s_start_time[10] = "";
static int  s_away_wins;
static int  s_away_losses;
static int  s_home_wins;
static int  s_home_losses;
static bool s_vibrate        = true;
static char s_batter[14]     = "";
static int  s_pitch_speed;
static char s_last_play[16]  = "";
static bool s_on_first;
static bool s_on_second;
static bool s_on_third;
static char s_next_game[20]  = "";
static char s_weather[16]    = "";
static char s_pitch_type[12] = "";
static char s_game2_status[8]= "";
static char s_game2_score[20]= "";
static int  s_tz_offset      = -5;
static bool s_battery_bar    = true;
static int  s_battery_pct    = 100;
static int  s_team_idx       = 2;
static int  s_prev_score     = -1;
static bool s_i_am_away;
static int  s_ticker_speed   = 5000;  // ms between ticker advances (default 5s)
static char s_away_pitcher[16] = "";
static char s_home_pitcher[16] = "";
static char s_win_pitcher[16]  = "";
static char s_loss_pitcher[16] = "";
static char s_save_pitcher[16] = "";
static char s_tv_network[24]   = "";

static void request_game_data(void);

// ── Ticker ─────────────────────────────────────────────────────────────────
static void ticker_update_text(void) {
  if (!s_ticker_cur) return;
  if (s_game_count == 0) {
    text_layer_set_text(s_ticker_cur, s_date_buf);
  } else if (s_game_idx < s_game_count) {
    text_layer_set_text(s_ticker_cur, s_games[s_game_idx]);
  }
}

static void ticker_animation_stopped(Animation *anim, bool finished, void *ctx) {
  int w = layer_get_bounds(s_ticker_clip).size.w;
  int h = TICKER_H;

  // Reset: cur goes to visible position, next hides below
  layer_set_frame(text_layer_get_layer(s_ticker_next), GRect(0, 0, w, h));
  layer_set_frame(text_layer_get_layer(s_ticker_cur),  GRect(0, h, w, h));

  // Swap pointers so next becomes cur
  TextLayer *tmp = s_ticker_cur;
  s_ticker_cur   = s_ticker_next;
  s_ticker_next  = tmp;

  s_anim_running = false;
  animation_destroy(anim);
}

static void ticker_advance(void *ctx) {
  if (s_game_count > 1 && s_ticker_cur && s_ticker_next && !s_anim_running) {
    // Prepare next text on hidden layer
    int next_idx = (s_game_idx + 1) % s_game_count;
    const char *next_text = (s_game_count == 0) ? s_date_buf : s_games[next_idx];
    text_layer_set_text(s_ticker_next, next_text);

    int w = layer_get_bounds(s_ticker_clip).size.w;
    int h = TICKER_H;

    // Position next layer below current
    layer_set_frame(text_layer_get_layer(s_ticker_next), GRect(0, h, w, h));

    // Animate current up and off, next up into view
    GRect cur_from = GRect(0,  0, w, h);
    GRect cur_to   = GRect(0, -h, w, h);
    GRect nxt_from = GRect(0,  h, w, h);
    GRect nxt_to   = GRect(0,  0, w, h);

    Animation *anim_cur  = (Animation*)property_animation_create_layer_frame(
      text_layer_get_layer(s_ticker_cur),  &cur_from, &cur_to);
    Animation *anim_next = (Animation*)property_animation_create_layer_frame(
      text_layer_get_layer(s_ticker_next), &nxt_from, &nxt_to);

    animation_set_duration(anim_cur,  300);
    animation_set_duration(anim_next, 300);
    animation_set_curve(anim_cur,  AnimationCurveEaseInOut);
    animation_set_curve(anim_next, AnimationCurveEaseInOut);
    animation_set_handlers(anim_next, (AnimationHandlers){
      .stopped = ticker_animation_stopped
    }, NULL);

    Animation *spawn = animation_spawn_create(anim_cur, anim_next, NULL);
    s_anim_running = true;
    animation_schedule(spawn);

    s_game_idx = next_idx;
  }
  s_ticker_timer = app_timer_register((uint32_t)s_ticker_speed, ticker_advance, NULL);
}

static void ticker_parse_and_start(void) {
  // Parse pipe-delimited string — manual loop, no strtok
  s_game_count = 0;
  s_game_idx   = 0;
  int ri = 0;   // raw index
  int gi = 0;   // game index
  int ci = 0;   // char index within game string

  while (s_ticker_raw[ri] != '\0' && gi < MAX_GAMES) {
    char ch = s_ticker_raw[ri++];
    if (ch == '|') {
      s_games[gi][ci] = '\0';
      gi++;
      ci = 0;
    } else if (ci < GAME_LEN - 1) {
      s_games[gi][ci++] = ch;
    }
  }
  if (ci > 0 && gi < MAX_GAMES) {
    s_games[gi][ci] = '\0';
    gi++;
  }
  s_game_count = gi;

  // Cancel existing timer
  if (s_ticker_timer) {
    app_timer_cancel(s_ticker_timer);
    s_ticker_timer = NULL;
  }

  // Show first game and start timer
  s_anim_running = false;
  ticker_update_text();
  if (s_game_count > 1) {
    s_ticker_timer = app_timer_register((uint32_t)s_ticker_speed, ticker_advance, NULL);
  }
}

// ── Team colors ────────────────────────────────────────────────────────────
#ifdef PBL_PLATFORM_EMERY
static GColor team_color(const char *abbr) {
  if (!abbr) return GColorWhite;
  if (strcmp(abbr,"ARI")==0) return GColorImperialPurple;
  if (strcmp(abbr,"ATL")==0) return GColorRed;
  if (strcmp(abbr,"BAL")==0) return GColorOrange;
  if (strcmp(abbr,"BOS")==0) return GColorRed;
  if (strcmp(abbr,"CHC")==0) return GColorCobaltBlue;
  if (strcmp(abbr,"CWS")==0) return GColorLightGray;
  if (strcmp(abbr,"CIN")==0) return GColorRed;
  if (strcmp(abbr,"CLE")==0) return GColorRed;
  if (strcmp(abbr,"COL")==0) return GColorImperialPurple;
  if (strcmp(abbr,"DET")==0) return GColorOrange;
  if (strcmp(abbr,"HOU")==0) return GColorOrange;
  if (strcmp(abbr,"KCR")==0) return GColorCobaltBlue;
  if (strcmp(abbr,"LAA")==0) return GColorRed;
  if (strcmp(abbr,"LAD")==0) return GColorCobaltBlue;
  if (strcmp(abbr,"MIA")==0) return GColorTiffanyBlue;
  if (strcmp(abbr,"MIL")==0) return GColorYellow;
  if (strcmp(abbr,"MIN")==0) return GColorRed;
  if (strcmp(abbr,"NYM")==0) return GColorCobaltBlue;
  if (strcmp(abbr,"NYY")==0) return GColorCobaltBlue;
  if (strcmp(abbr,"OAK")==0) return GColorIslamicGreen;
  if (strcmp(abbr,"ATH")==0) return GColorIslamicGreen;
  if (strcmp(abbr,"PHI")==0) return GColorRed;
  if (strcmp(abbr,"PIT")==0) return GColorYellow;
  if (strcmp(abbr,"SDP")==0) return GColorYellow;
  if (strcmp(abbr,"SEA")==0) return GColorTiffanyBlue;
  if (strcmp(abbr,"SFG")==0) return GColorOrange;
  if (strcmp(abbr,"STL")==0) return GColorRed;
  if (strcmp(abbr,"TBR")==0) return GColorCobaltBlue;
  if (strcmp(abbr,"TEX")==0) return GColorCobaltBlue;
  if (strcmp(abbr,"TOR")==0) return GColorCobaltBlue;
  if (strcmp(abbr,"WSN")==0) return GColorRed;
  return GColorWhite;
}

static void draw_team_text(GContext *ctx, const char *text, GFont font, GRect rect,
                           GTextOverflowMode overflow, GTextAlignment align, GColor color) {
  GRect r = rect;
  graphics_context_set_text_color(ctx, GColorBlack);
  r.origin.x -= 1; graphics_draw_text(ctx, text, font, r, overflow, align, NULL);
  r.origin.x += 2; graphics_draw_text(ctx, text, font, r, overflow, align, NULL);
  r.origin.x -= 1; r.origin.y -= 1; graphics_draw_text(ctx, text, font, r, overflow, align, NULL);
  r.origin.y += 2; graphics_draw_text(ctx, text, font, r, overflow, align, NULL);
  graphics_context_set_text_color(ctx, color);
  graphics_draw_text(ctx, text, font, rect, overflow, align, NULL);
}
#endif

// ── Dots ───────────────────────────────────────────────────────────────────
static void draw_dots(GContext *ctx, int x, int y, int n, int filled, int r, int sp) {
  for (int i = 0; i < n; i++) {
    GPoint p = GPoint(x + i * sp, y);
    if (i < filled) {
      graphics_context_set_fill_color(ctx, GColorWhite);
      graphics_fill_circle(ctx, p, r);
    } else {
      graphics_context_set_stroke_color(ctx, GColorWhite);
      graphics_draw_circle(ctx, p, r);
    }
  }
}

// ── Canvas ─────────────────────────────────────────────────────────────────
static void canvas_update(Layer *layer, GContext *ctx) {
  GRect b  = layer_get_bounds(layer);
  int w    = b.size.w;
  int h    = b.size.h;
  int split= h * 3 / 10;
  int by   = split + 2;
#ifdef PBL_ROUND
  int hpad = 18;
#else
  int hpad = 2;
#endif

  // Background
  graphics_context_set_fill_color(ctx, GColorBlack);
  graphics_fill_rect(ctx, b, 0, GCornerNone);

  // Battery bar
  if (s_battery_bar) {
    int bw = (w * s_battery_pct) / 100;
    graphics_context_set_fill_color(ctx, GColorDarkGray);
    graphics_fill_rect(ctx, GRect(0, h-3, w, 3), 0, GCornerNone);
    GColor bc = s_battery_pct > 50 ? GColorGreen :
                s_battery_pct > 20 ? GColorYellow : GColorRed;
    graphics_context_set_fill_color(ctx, bc);
    graphics_fill_rect(ctx, GRect(0, h-3, bw, 3), 0, GCornerNone);
  }

  // Divider
  graphics_context_set_stroke_color(ctx, GColorDarkGray);
  graphics_draw_line(ctx, GPoint(0, split), GPoint(w, split));

#ifdef PBL_PLATFORM_EMERY
  GFont f28 = fonts_get_system_font(FONT_KEY_BITHAM_30_BLACK);
  GFont f24 = fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD);
  GFont f18 = fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD);
  GFont f14 = fonts_get_system_font(FONT_KEY_GOTHIC_18);
  int score_w=110, abbr_w=44;
  int score_y=by-8, score_h=32;
  int rec_y=by+16, inn_y=by+36, inn_h=26;
  int bat_y=by+64, bat_w=w-80-hpad;
  int spd_y=by+64, lp_y=by+82, lp_w=w-28-hpad;
  int g2_y=by+64;
  int bso_bl=by+100, bso_bd=by+108;
  int bso_sl=by+115, bso_sd=by+123;
  int bso_ol=by+130, bso_od=by+138;
  int dot_r=4, dot_sp=13;
  int pre_pitch_y=by+82, pre_tv_y=by+98;
  int fin_dec_y=by+82, fin_save_y=by+98, fin_next_y=by+114;
#else
  GFont f28 = fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD);
  GFont f24 = fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD);
  GFont f18 = fonts_get_system_font(FONT_KEY_GOTHIC_18);
  GFont f14 = fonts_get_system_font(FONT_KEY_GOTHIC_14);
  int score_w=68, abbr_w=36;
  int score_y=by-4, score_h=26;
  int rec_y=by+24, inn_y=by+26, inn_h=20;
  int bat_y=by+46, bat_w=w-70-hpad;
  int spd_y=by+46, lp_y=by+60, lp_w=w-36-hpad;
  int g2_y=by+46;
  int bso_bl=by+75, bso_bd=by+82;
  int bso_sl=by+89, bso_sd=by+96;
  int bso_ol=by+103, bso_od=by+110;
  int dot_r=3, dot_sp=10;
  int pre_pitch_y=by+58, pre_tv_y=by+72;
  int fin_dec_y=by+58, fin_save_y=by+72, fin_next_y=by+86;
#endif
  GFont fsm = fonts_get_system_font(FONT_KEY_GOTHIC_14);

  // Time + date
  graphics_context_set_text_color(ctx, GColorWhite);
#ifdef PBL_PLATFORM_EMERY
  graphics_draw_text(ctx, s_time_buf, f24,
    GRect(hpad, 2, 72, 30), GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
  graphics_context_set_text_color(ctx, GColorLightGray);
  graphics_draw_text(ctx, s_date_buf, fonts_get_system_font(FONT_KEY_GOTHIC_24),
    GRect(68, 2, w - 68 - hpad, 26), GTextOverflowModeWordWrap, GTextAlignmentRight, NULL);
#else
  graphics_draw_text(ctx, s_time_buf, f24,
    GRect(hpad, 2, 60, 24), GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
  graphics_context_set_text_color(ctx, GColorLightGray);
  graphics_draw_text(ctx, s_date_buf, fonts_get_system_font(FONT_KEY_GOTHIC_18),
    GRect(56, 2, w - 56 - hpad, 20), GTextOverflowModeWordWrap, GTextAlignmentRight, NULL);
#endif

  // No game
  if (strcmp(s_status, "off") == 0) {
    graphics_context_set_text_color(ctx, GColorWhite);
    graphics_draw_text(ctx, "No Game Today", f24,
      GRect(0, by+2, w, 28), GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL);
    char tl[16];
    snprintf(tl, sizeof(tl), "~ %s ~", TEAM_ABBR[s_team_idx]);
    graphics_context_set_text_color(ctx, GColorDarkGray);
    graphics_draw_text(ctx, tl, f14,
      GRect(0, by+32, w, 18), GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL);
    if (s_next_game[0]) {
      graphics_context_set_text_color(ctx, GColorLightGray);
      graphics_draw_text(ctx, "Next:", f14,
        GRect(hpad, by+54, 42, 18), GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
      graphics_draw_text(ctx, s_next_game, f14,
        GRect(hpad+44, by+54, w-hpad-46, 18), GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
    }
    return;
  }

  // Score — G1 label if doubleheader
#ifdef PBL_PLATFORM_EMERY
  draw_team_text(ctx, s_away_abbr, f24,
    GRect(hpad, score_y, abbr_w, score_h), GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft,
    team_color(s_away_abbr));
#else
  graphics_context_set_text_color(ctx, GColorWhite);
  graphics_draw_text(ctx, s_away_abbr, f24,
    GRect(hpad, score_y, abbr_w, score_h), GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
#endif
  char sc[16];
  snprintf(sc, sizeof(sc), "%d - %d", s_away_score, s_home_score);
  graphics_context_set_text_color(ctx, GColorWhite);
  graphics_draw_text(ctx, sc, f28,
    GRect(w/2 - score_w/2, score_y, score_w, score_h), GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL);
#ifdef PBL_PLATFORM_EMERY
  draw_team_text(ctx, s_home_abbr, f24,
    GRect(w - abbr_w - hpad, score_y, abbr_w, score_h), GTextOverflowModeTrailingEllipsis, GTextAlignmentRight,
    team_color(s_home_abbr));
#else
  graphics_draw_text(ctx, s_home_abbr, f24,
    GRect(w - abbr_w - hpad, score_y, abbr_w, score_h), GTextOverflowModeTrailingEllipsis, GTextAlignmentRight, NULL);
#endif
  if (s_game2_status[0] && strcmp(s_game2_status,"off")!=0) {
    graphics_context_set_text_color(ctx, GColorYellow);
    graphics_draw_text(ctx, "G1", fsm,
      GRect(hpad, rec_y, 20, 14), GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
  }

  // Records
  graphics_context_set_text_color(ctx, GColorLightGray);
  char rec[10];
  snprintf(rec, sizeof(rec), "%d-%d", s_away_wins, s_away_losses);
  graphics_draw_text(ctx, rec, f14,
    GRect(hpad, rec_y, abbr_w, 18), GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
  snprintf(rec, sizeof(rec), "%d-%d", s_home_wins, s_home_losses);
  graphics_draw_text(ctx, rec, f14,
    GRect(w - abbr_w - 2 - hpad, rec_y, abbr_w + 2, 18), GTextOverflowModeWordWrap, GTextAlignmentRight, NULL);

  // Inning
  char inn[32];
  if (strcmp(s_status,"live")==0) {
    if (s_inning > 0)
      snprintf(inn, sizeof(inn), "%s %d", s_inning_half?"Bot":"Top", s_inning);
    else
      snprintf(inn, sizeof(inn), "Live");
  }
  else if (strcmp(s_status,"pre")==0) {
    if (s_weather[0])
      snprintf(inn, sizeof(inn), "%s  %s", s_start_time[0]?s_start_time:"Pre-Game", s_weather);
    else
      snprintf(inn, sizeof(inn), "%s", s_start_time[0]?s_start_time:"Pre-Game");
  } else
    snprintf(inn, sizeof(inn), "Final");

  graphics_context_set_text_color(ctx, GColorYellow);
  graphics_draw_text(ctx, inn, f18,
    GRect(0, inn_y, w, inn_h), GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL);

  // Game 2 score if doubleheader
  if (s_game2_status[0] && strcmp(s_game2_status,"off")!=0 && s_game2_score[0]) {
    graphics_context_set_text_color(ctx, GColorLightGray);
    graphics_draw_text(ctx, "G2:", fsm,
      GRect(hpad, g2_y, 24, 14), GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
    graphics_draw_text(ctx, s_game2_score, f14,
      GRect(hpad+26, g2_y, w-hpad-28, 18), GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
  }

  // Pre-game: probable starters (left/right) + TV network
  if (strcmp(s_status,"pre")==0) {
    int pw = w/2 - hpad - 2;
    graphics_context_set_text_color(ctx, GColorLightGray);
    if (s_away_pitcher[0])
      graphics_draw_text(ctx, s_away_pitcher, f14,
        GRect(hpad, pre_pitch_y, pw, 18), GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
    if (s_home_pitcher[0])
      graphics_draw_text(ctx, s_home_pitcher, f14,
        GRect(w/2+2, pre_pitch_y, pw, 18), GTextOverflowModeTrailingEllipsis, GTextAlignmentRight, NULL);
    if (s_tv_network[0]) {
      char tv[28];
      snprintf(tv, sizeof(tv), "TV: %s", s_tv_network);
      graphics_context_set_text_color(ctx, GColorDarkGray);
      graphics_draw_text(ctx, tv, f14,
        GRect(0, pre_tv_y, w, 18), GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);
    }
  }

  // Final: W/L/SV decisions + next game
  if (strcmp(s_status,"final")==0) {
    graphics_context_set_text_color(ctx, GColorLightGray);
    if (s_win_pitcher[0] || s_loss_pitcher[0]) {
      char dec[36]; dec[0] = 0;
      if (s_win_pitcher[0] && s_loss_pitcher[0])
        snprintf(dec, sizeof(dec), "%s  %s", s_win_pitcher, s_loss_pitcher);
      else if (s_win_pitcher[0])
        snprintf(dec, sizeof(dec), "%s", s_win_pitcher);
      else
        snprintf(dec, sizeof(dec), "%s", s_loss_pitcher);
      graphics_draw_text(ctx, dec, f14,
        GRect(hpad, fin_dec_y, w-hpad*2, 18), GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);
    }
    if (s_save_pitcher[0])
      graphics_draw_text(ctx, s_save_pitcher, f14,
        GRect(0, fin_save_y, w, 18), GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL);
    if (s_next_game[0] && (!s_game2_status[0] || strcmp(s_game2_status,"off")==0)) {
      graphics_draw_text(ctx, "Next:", f14,
        GRect(hpad, fin_next_y, 42, 18), GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
      graphics_draw_text(ctx, s_next_game, f14,
        GRect(hpad+44, fin_next_y, w-hpad-46, 18), GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
    }
  }

  if (strcmp(s_status,"live")!=0) return;

  // Batter + speed
  if (s_batter[0]) {
    graphics_context_set_text_color(ctx, GColorWhite);
    graphics_draw_text(ctx, s_batter, f14,
      GRect(hpad, bat_y, bat_w, 18), GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
  }
  if (s_pitch_speed > 0 || s_pitch_type[0]) {
    char spd[24] = "";
    if (s_pitch_type[0] && s_pitch_speed > 0)
      snprintf(spd, sizeof(spd), "%s %d", s_pitch_type, s_pitch_speed);
    else if (s_pitch_speed > 0)
      snprintf(spd, sizeof(spd), "%d mph", s_pitch_speed);
    else
      snprintf(spd, sizeof(spd), "%s", s_pitch_type);
    graphics_context_set_text_color(ctx, GColorYellow);
    graphics_draw_text(ctx, spd, f14,
      GRect(hpad + bat_w, spd_y, w - hpad - bat_w, 18), GTextOverflowModeWordWrap, GTextAlignmentRight, NULL);
  }

  // Last play
  if (s_last_play[0]) {
    graphics_context_set_text_color(ctx, GColorLightGray);
    graphics_draw_text(ctx, s_last_play, f14,
      GRect(hpad, lp_y, lp_w, 18), GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
  }

  // Diamond
#ifdef PBL_PLATFORM_EMERY
  if (s_diamond_bmp) {
    int img_x = w - 90;
    int img_y = by + 95;
    graphics_draw_bitmap_in_rect(ctx, s_diamond_bmp, GRect(img_x, img_y, 60, 60));
    GPoint base2 = GPoint(img_x + 29, img_y + 17); // 2nd base
    GPoint base1 = GPoint(img_x + 44, img_y + 32); // 1st base
    GPoint base3 = GPoint(img_x + 14, img_y + 32); // 3rd base
    GPoint home  = GPoint(img_x + 29, img_y + 48); // home plate (batter)
    if (s_on_second) { graphics_context_set_fill_color(ctx, GColorRed); graphics_fill_circle(ctx, base2, 4); }
    if (s_on_first)  { graphics_context_set_fill_color(ctx, GColorRed); graphics_fill_circle(ctx, base1, 4); }
    if (s_on_third)  { graphics_context_set_fill_color(ctx, GColorRed); graphics_fill_circle(ctx, base3, 4); }
    graphics_context_set_fill_color(ctx, GColorRed);
    graphics_fill_circle(ctx, home, 4);
  }
#else
  {
    int bx=w-24, bby=by+88, bs=8;
    graphics_context_set_stroke_color(ctx, GColorDarkGray);
    graphics_draw_line(ctx, GPoint(bx,bby-bs), GPoint(bx+bs,bby));
    graphics_draw_line(ctx, GPoint(bx+bs,bby), GPoint(bx,bby+bs));
    graphics_draw_line(ctx, GPoint(bx,bby+bs), GPoint(bx-bs,bby));
    graphics_draw_line(ctx, GPoint(bx-bs,bby), GPoint(bx,bby-bs));
    if (s_on_second) { graphics_context_set_fill_color(ctx,GColorYellow); graphics_fill_circle(ctx,GPoint(bx,bby-bs),3); }
    else { graphics_context_set_stroke_color(ctx,GColorWhite); graphics_draw_circle(ctx,GPoint(bx,bby-bs),3); }
    if (s_on_first)  { graphics_context_set_fill_color(ctx,GColorYellow); graphics_fill_circle(ctx,GPoint(bx+bs,bby),3); }
    else { graphics_context_set_stroke_color(ctx,GColorWhite); graphics_draw_circle(ctx,GPoint(bx+bs,bby),3); }
    if (s_on_third)  { graphics_context_set_fill_color(ctx,GColorYellow); graphics_fill_circle(ctx,GPoint(bx-bs,bby),3); }
    else { graphics_context_set_stroke_color(ctx,GColorWhite); graphics_draw_circle(ctx,GPoint(bx-bs,bby),3); }
    graphics_context_set_fill_color(ctx, GColorWhite);
    graphics_fill_circle(ctx, GPoint(bx,bby+bs), 3);
  }
#endif

  // BSO
  graphics_context_set_text_color(ctx, GColorMediumAquamarine);
  graphics_draw_text(ctx, "B", fsm, GRect(hpad,bso_bl,14,14), GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
  draw_dots(ctx, hpad+16, bso_bd, 4, s_balls, dot_r, dot_sp);
  graphics_context_set_text_color(ctx, GColorMediumAquamarine);
  graphics_draw_text(ctx, "S", fsm, GRect(hpad,bso_sl,14,14), GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
  draw_dots(ctx, hpad+16, bso_sd, 3, s_strikes, dot_r, dot_sp);
  graphics_context_set_text_color(ctx, GColorWhite);
  graphics_draw_text(ctx, "O", fsm, GRect(hpad,bso_ol,14,14), GTextOverflowModeWordWrap, GTextAlignmentLeft, NULL);
  draw_dots(ctx, hpad+16, bso_od, 3, s_outs, dot_r, dot_sp);
}

// ── Clock ──────────────────────────────────────────────────────────────────
static void update_clock(struct tm *t) {
  clock_copy_time_string(s_time_buf, sizeof(s_time_buf));
  strftime(s_date_buf, sizeof(s_date_buf), "%a  %b %d", t);
  if (s_game_count == 0 && s_ticker_cur)
    text_layer_set_text(s_ticker_cur, s_date_buf);
}

static void tick_handler(struct tm *t, TimeUnits u) {
  update_clock(t);
  if (u & MINUTE_UNIT) request_game_data();
  layer_mark_dirty(s_canvas);
}

// ── Inbox ──────────────────────────────────────────────────────────────────
static void inbox_received(DictionaryIterator *iter, void *ctx) {
  Tuple *t;
  t = dict_find(iter, KEY_AWAY_ABBR);
  if (t) { strncpy(s_away_abbr, t->value->cstring, 4); s_away_abbr[4]=0; }
  t = dict_find(iter, KEY_HOME_ABBR);
  if (t) { strncpy(s_home_abbr, t->value->cstring, 4); s_home_abbr[4]=0; }
  s_i_am_away = strcmp(s_away_abbr, TEAM_ABBR[s_team_idx])==0;
  t = dict_find(iter,KEY_AWAY_SCORE);  if(t) s_away_score  =(int)t->value->int32;
  t = dict_find(iter,KEY_HOME_SCORE);  if(t) s_home_score  =(int)t->value->int32;
  t = dict_find(iter,KEY_INNING);      if(t) s_inning      =(int)t->value->int32;
  t = dict_find(iter,KEY_INNING_HALF); if(t) s_inning_half =(int)t->value->int32;
  t = dict_find(iter,KEY_BALLS);       if(t) s_balls       =(int)t->value->int32;
  t = dict_find(iter,KEY_STRIKES);     if(t) s_strikes     =(int)t->value->int32;
  t = dict_find(iter,KEY_OUTS);        if(t) s_outs        =(int)t->value->int32;
  t = dict_find(iter,KEY_STATUS);
  if(t){strncpy(s_status,t->value->cstring,7);s_status[7]=0;}
  t = dict_find(iter,KEY_START_TIME);
  if(t){strncpy(s_start_time,t->value->cstring,9);s_start_time[9]=0;}
  t = dict_find(iter,KEY_AWAY_WINS);   if(t) s_away_wins   =(int)t->value->int32;
  t = dict_find(iter,KEY_AWAY_LOSSES); if(t) s_away_losses =(int)t->value->int32;
  t = dict_find(iter,KEY_HOME_WINS);   if(t) s_home_wins   =(int)t->value->int32;
  t = dict_find(iter,KEY_HOME_LOSSES); if(t) s_home_losses =(int)t->value->int32;
  t = dict_find(iter,KEY_VIBRATE);
  if(t){s_vibrate=(bool)t->value->int32;persist_write_bool(PERSIST_VIB,s_vibrate);}
  t = dict_find(iter,KEY_BATTER);
  if(t){strncpy(s_batter,t->value->cstring,13);s_batter[13]=0;}
  t = dict_find(iter,KEY_PITCH_SPEED); if(t) s_pitch_speed=(int)t->value->int32;
  t = dict_find(iter,KEY_LAST_PLAY);
  if(t){strncpy(s_last_play,t->value->cstring,15);s_last_play[15]=0;}
  t = dict_find(iter,KEY_ON_FIRST);  if(t) s_on_first  =(bool)t->value->int32;
  t = dict_find(iter,KEY_ON_SECOND); if(t) s_on_second =(bool)t->value->int32;
  t = dict_find(iter,KEY_ON_THIRD);  if(t) s_on_third  =(bool)t->value->int32;
  t = dict_find(iter,KEY_NEXT_GAME);
  if(t){strncpy(s_next_game,t->value->cstring,19);s_next_game[19]=0;}
  t = dict_find(iter,KEY_WEATHER);
  if(t){strncpy(s_weather,t->value->cstring,15);s_weather[15]=0;}
  t = dict_find(iter,KEY_PITCH_TYPE);
  if(t){strncpy(s_pitch_type,t->value->cstring,11);s_pitch_type[11]=0;}
  t = dict_find(iter,KEY_GAME2_STATUS);
  if(t){strncpy(s_game2_status,t->value->cstring,7);s_game2_status[7]=0;}
  t = dict_find(iter,KEY_GAME2_SCORE);
  if(t){strncpy(s_game2_score,t->value->cstring,19);s_game2_score[19]=0;}
  t = dict_find(iter,KEY_TZ_OFFSET);
  if(t){s_tz_offset=(int)t->value->int32;persist_write_int(PERSIST_TZ,s_tz_offset);}
  t = dict_find(iter,KEY_BATTERY_BAR);
  if(t){s_battery_bar=(bool)t->value->int32;persist_write_bool(PERSIST_BAT,s_battery_bar);}
  t = dict_find(iter,KEY_TICKER);
  if(t){
    strncpy(s_ticker_raw,t->value->cstring,199);
    s_ticker_raw[199]=0;
    ticker_parse_and_start();
  }
  t = dict_find(iter,KEY_AWAY_PITCHER);
  if(t){strncpy(s_away_pitcher,t->value->cstring,15);s_away_pitcher[15]=0;}
  t = dict_find(iter,KEY_HOME_PITCHER);
  if(t){strncpy(s_home_pitcher,t->value->cstring,15);s_home_pitcher[15]=0;}
  t = dict_find(iter,KEY_WIN_PITCHER);
  if(t){strncpy(s_win_pitcher,t->value->cstring,15);s_win_pitcher[15]=0;}
  t = dict_find(iter,KEY_LOSS_PITCHER);
  if(t){strncpy(s_loss_pitcher,t->value->cstring,15);s_loss_pitcher[15]=0;}
  t = dict_find(iter,KEY_SAVE_PITCHER);
  if(t){strncpy(s_save_pitcher,t->value->cstring,15);s_save_pitcher[15]=0;}
  t = dict_find(iter,KEY_TV_NETWORK);
  if(t){strncpy(s_tv_network,t->value->cstring,23);s_tv_network[23]=0;}
  t = dict_find(iter,KEY_TICKER_SPEED);
  if(t){
    int spd=(int)t->value->int32;
    // Accept only valid values: 5000, 10000, 30000, 60000
    if(spd==5000||spd==10000||spd==30000||spd==60000){
      s_ticker_speed=spd;
      persist_write_int(PERSIST_TICKER_SPEED,s_ticker_speed);
      // Restart timer at new speed if active
      if(s_ticker_timer){
        app_timer_cancel(s_ticker_timer);
        s_ticker_timer=app_timer_register((uint32_t)s_ticker_speed,ticker_advance,NULL);
      }
    }
  }

  if(strcmp(s_status,"live")==0 && s_vibrate){
    int my=s_i_am_away?s_away_score:s_home_score;
    if(s_prev_score>=0 && my>s_prev_score) vibes_double_pulse();
    s_prev_score=my;
  } else s_prev_score=-1;

  t = dict_find(iter,KEY_TEAM_IDX);
  if(t){
    int idx=(int)t->value->int32;
    if(idx>=0 && idx<NUM_TEAMS && idx!=s_team_idx){
      s_team_idx=idx;
      persist_write_int(PERSIST_TEAM,s_team_idx);
      strncpy(s_away_abbr,"---",4); strncpy(s_home_abbr,"---",4);
      s_away_score=s_home_score=0;
      s_inning=s_balls=s_strikes=s_outs=0;
      s_away_wins=s_away_losses=s_home_wins=s_home_losses=0;
      s_start_time[0]=s_batter[0]=s_last_play[0]=0;
      s_pitch_speed=0;
      s_on_first=s_on_second=s_on_third=false;
      s_next_game[0]=s_weather[0]=s_pitch_type[0]=0;
      s_game2_status[0]=s_game2_score[0]=0;
      s_away_pitcher[0]=s_home_pitcher[0]=0;
      s_win_pitcher[0]=s_loss_pitcher[0]=s_save_pitcher[0]=s_tv_network[0]=0;
      s_prev_score=-1;
      strncpy(s_status,"off",7);
      request_game_data();
    }
  }
  layer_mark_dirty(s_canvas);
}

static void inbox_dropped(AppMessageResult r, void *ctx) {
  APP_LOG(APP_LOG_LEVEL_ERROR, "Dropped: %d", (int)r);
}

static void request_game_data(void) {
  DictionaryIterator *iter;
  if(app_message_outbox_begin(&iter)!=APP_MSG_OK) return;
  dict_write_int(iter,KEY_TEAM_IDX,&s_team_idx,sizeof(int),true);
  app_message_outbox_send();
}

static void battery_handler(BatteryChargeState state) {
  s_battery_pct=state.charge_percent;
  if(s_canvas) layer_mark_dirty(s_canvas);
}

// ── Window ─────────────────────────────────────────────────────────────────
static void window_load(Window *window) {
  Layer *root=window_get_root_layer(window);
  GRect bounds=layer_get_bounds(root);
  int w=bounds.size.w;

  s_canvas=layer_create(bounds);
  layer_set_update_proc(s_canvas,canvas_update);
  layer_add_child(root,s_canvas);
#ifdef PBL_PLATFORM_EMERY
  s_diamond_bmp = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_BALLDIAMOND);
#endif

  // Clip container for ticker
#ifdef PBL_PLATFORM_EMERY
  s_ticker_clip = layer_create(GRect(0, 32, w, TICKER_H));
  GFont ticker_font = fonts_get_system_font(FONT_KEY_GOTHIC_24);
#else
  s_ticker_clip = layer_create(GRect(0, 28, w, TICKER_H));
  GFont ticker_font = fonts_get_system_font(FONT_KEY_GOTHIC_18);
#endif
  layer_add_child(root, s_ticker_clip);

  // Two text layers INSIDE the clip — coords relative to clip
  s_ticker_cur  = text_layer_create(GRect(0, 0, w, TICKER_H));
  s_ticker_next = text_layer_create(GRect(0, TICKER_H, w, TICKER_H));
  TextLayer *tls[2] = {s_ticker_cur, s_ticker_next};
  for (int i = 0; i < 2; i++) {
    text_layer_set_background_color(tls[i], GColorBlack);
    text_layer_set_text_color(tls[i], GColorWhite);
    text_layer_set_font(tls[i], ticker_font);
    text_layer_set_overflow_mode(tls[i], GTextOverflowModeTrailingEllipsis);
    text_layer_set_text(tls[i], "");
    layer_add_child(s_ticker_clip, text_layer_get_layer(tls[i]));
  }
}

static void window_unload(Window *window) {
  if(s_ticker_timer){app_timer_cancel(s_ticker_timer);s_ticker_timer=NULL;}
  if(s_ticker_cur) {text_layer_destroy(s_ticker_cur);  s_ticker_cur =NULL;}
  if(s_ticker_next){text_layer_destroy(s_ticker_next); s_ticker_next=NULL;}
  if(s_ticker_clip){layer_destroy(s_ticker_clip);      s_ticker_clip=NULL;}
  if(s_canvas)     {layer_destroy(s_canvas);           s_canvas     =NULL;}
#ifdef PBL_PLATFORM_EMERY
  if(s_diamond_bmp){gbitmap_destroy(s_diamond_bmp);   s_diamond_bmp=NULL;}
#endif
}

static void init(void) {
  // Zero all state
  s_game_count=0; s_game_idx=0;
  memset(s_ticker_raw,0,sizeof(s_ticker_raw));

  if(persist_exists(PERSIST_TEAM))         s_team_idx    =persist_read_int(PERSIST_TEAM);
  if(persist_exists(PERSIST_VIB))          s_vibrate     =persist_read_bool(PERSIST_VIB);
  if(persist_exists(PERSIST_BAT))          s_battery_bar =persist_read_bool(PERSIST_BAT);
  if(persist_exists(PERSIST_TZ))           s_tz_offset   =persist_read_int(PERSIST_TZ);
  if(persist_exists(PERSIST_TICKER_SPEED)) s_ticker_speed=persist_read_int(PERSIST_TICKER_SPEED);

  time_t now=time(NULL);
  update_clock(localtime(&now));

  s_window=window_create();
  window_set_background_color(s_window,GColorBlack);
  window_set_window_handlers(s_window,(WindowHandlers){
    .load=window_load,.unload=window_unload});
  window_stack_push(s_window,true);

  tick_timer_service_subscribe(MINUTE_UNIT,tick_handler);
  battery_state_service_subscribe(battery_handler);
  s_battery_pct=battery_state_service_peek().charge_percent;

  app_message_open(512,64);
  app_message_register_inbox_received(inbox_received);
  app_message_register_inbox_dropped(inbox_dropped);
  request_game_data();
}

static void deinit(void) {
  tick_timer_service_unsubscribe();
  battery_state_service_unsubscribe();
  window_destroy(s_window);
}

int main(void) { init(); app_event_loop(); deinit(); return 0; }
