import { BUILTIN_NEWS_PHOTOS } from './builtinNewsPhotos';
import { INITIAL_NPL_DATA } from './defaultNplData';
import { BugFixItem, NplDataState } from '../types/npl';
import {
  getSeriesList,
  OFFICIAL_NPL_LOGO_PATH,
  syncActiveSeriesIntoMap,
} from '../utils/nplEngine';

export const BUG_AUDIT_ITEMS: BugFixItem[] = [
  {
    id: 'bug-studio-1to1-sync',
    severity: 'Critical',
    title: 'Multi-Series Engine (Series Count, T20 & ODI World Cups), Official NPL Logo & 1:1 Admin/Frontpage Parity (v6.6.0)',
    symptom: 'Single-series lock prevented managing multiple tournaments (NPL, ICC T20 World Cup, ICC Cricket World Cup 50-over ODI, ACC Premier Cup) with live series counts, format-specific 20/50-over NRR, and portable Official NPL Logo.',
    rootCause: '1) Series storage was hardcoded to a single tournament and 20.0 overs. 2) Local Vite logo paths broke when pasted into WordPress without a portable builtin:npl_logo Base64 carrier.',
    linesInOriginal: 'sp660_load_defaults, sp660_calc_points, sp660_resolve_live_scorecard, sp660_admin_page & sp660_render_hub_inner',
    beforeCode: `// Single hardcoded series + 20.0-over lock + broken local logo URLs in WordPress`,
    afterCode: `// Multi-Series Hub & Admin with Series (N) count, 0ms Series Switcher, T20 (20ov) & ODI (50ov) NRR/Career engines,
// + Built-in Official NPL Logo (builtin:npl_logo) + 1:1 Live Scorecard Centre + phrasing-only <button> shield`,
  },
  {
    id: 'bug-admin-inputs-and-mysql',
    severity: 'Critical',
    title: 'Zero-Dead-End Smart Facebook Publish, WAF-Safe Base64 AJAX Sync & Server GD Card (v6.5.6)',
    symptom: 'Clicking Publish on cPanel/LiteSpeed showed a Meta Token warning when blank, or 500KB base64 canvas POST fields triggered ModSecurity SecRequestBodyNoFilesLimit.',
    rootCause: '1) Submitting a 500KB data:image/png;base64 hidden input in standard POST exceeded cPanel ModSecurity 128KB field limits. 2) Clicking the main Publish button without an EAA... token reloaded PHP with a warning instead of triggering Instant Browser Share.',
    linesInOriginal: 'Facebook Page Sync Form, sp660_ajax_admin_save, sp660_render_server_card_png & Smart Publish JS',
    beforeCode: `// Raw 500KB canvas POST + full-page reload warning when token blank
<input type="hidden" name="fb_card_png_data" value="data:image/png;base64,...">`,
    afterCode: `// 0KB server-side PHP GD 1200x630 PNG + <2KB WAF-safe Base64 AJAX token verify/publish
// + Smart Publish button auto-runs Instant Copy + HD Card Download + Opens Page 61590852571494 when no token set`,
  },
  {
    id: 'bug-series-and-live-trap',
    severity: 'Critical',
    title: '3-State Match Status Eliminates the Hidden "Live Match" Checkbox Trap',
    symptom: 'Completed matches saved with scores still showed 0 Played / 0 Points in Points Table and did not appear in Results.',
    rootCause: '1) Matches with blank/legacy series names failed ($m["series"] === "Nepal Premier League"). 2) Leaving "Mark as Live Match" checked excluded the match from both Points Table and Results.',
    linesInOriginal: 'Lines 180–187 & 772–775',
    beforeCode: `if (($m['series'] ?? '') !== $series_name) continue;
if (!empty($m['live'])) continue; // Excluded even after Winner was entered!`,
    afterCode: `// Explicit 3-button Match Status (Completed Result / Live Match / Upcoming Fixture)
// Entering Winner or Result Summary automatically finalizes match & updates Standings`,
  },
  {
    id: 'bug-exact-ui-parity',
    severity: 'Critical',
    title: 'Editorial Newsroom Upgrade & 1:1 Visual Parity with Live Studio Preview (v6.5.6)',
    symptom: 'News cards used cramped 12px text with no full-article reader, and fresh installs showed empty logos, 0 players, and theme CSS conflicts.',
    rootCause: 'Original news rendered 2-line 12px snippets without full prose, standfirsts, pull-quotes, or visual fallbacks, and lacked scoped CSS protection.',
    linesInOriginal: 'Shortcodes [setopress_npl] & [setopress_npl_news]',
    beforeCode: `// Cramped 12px 2-line news boxes, no full-article reader, empty logos, un-scoped CSS`,
    afterCode: `// 3-Tier Editorial Newsroom (Fraunces serif + 65ch Full-Article Reader Modal + Kirtipur Himalayan SVG Art) + built-in franchise crests`,
  },
  {
    id: 'bug-overs-missing',
    severity: 'Critical',
    title: 'Missing Overs Inputs in Admin Form (NRR Always 0.000)',
    symptom: 'Points Table Net Run Rate (NRR) stayed stuck at 0.000 for every team even after entering match scores.',
    rootCause: 'sc_npl_points() required $o1 > 0 && $o2 > 0 from $m["team1_overs"] and $m["team2_overs"], which had no <input> fields in Admin.',
    linesInOriginal: 'Lines 204–210 & 526–539',
    beforeCode: `$o1 = sc_parse_overs($m['team1_overs']); // Always 0!
if ($o1 > 0 && $o2 > 0) { /* Never ran */ }`,
    afterCode: `$o1 = sp660_parse_overs($m['team1_overs'] ?? '', $m['team1_score'] ?? '');
if ($o1 <= 0) $o1 = $max_ov;
if ($w1 >= 10 && $o1 < $max_ov) $o1 = $max_ov; // Format-aware ICC All-Out Rule (20.0 T20 / 50.0 ODI)`,
  },
  {
    id: 'bug-winner-dropdown',
    severity: 'High',
    title: 'Outcome Auto-Detection from Scores, Winner Dropdown & Result Summary',
    symptom: 'Matches showed P: 1 in Points Table while W, L, and Pts remained 0, or wickets failed to parse when typed as 176-5.',
    rootCause: 'Winner was a plain text box, and score parsing only split on "/" instead of both "/" and "-".',
    linesInOriginal: 'Lines 112–126 & 540',
    beforeCode: `<input type="text" name="winner" class="npl-form-input">`,
    afterCode: `// Dynamic Winner <select> + sp660_resolve_match_outcome() auto-winner from scores OR result_text + 176/5 & 176-5 support`,
  },
  {
    id: 'bug-wp-media',
    severity: 'High',
    title: 'Broken Image Uploaders & Unsaved Player Photos / Stats in Admin',
    symptom: 'Upload buttons failed with "wp.media is undefined" and player photos/runs/wickets were not persisted.',
    rootCause: 'Missing admin_enqueue_scripts calling wp_enqueue_media(), and player photo inputs lacked .npl-lv.',
    linesInOriginal: 'Lines 155–160 & 701',
    beforeCode: `<input type="hidden" name="player_photo[]" class="npl-p-photo">`,
    afterCode: `add_action('admin_enqueue_scripts', 'sp660_admin_assets'); // Enqueues wp.media + saves Runs, Wickets & Photos`,
  },
];

export type PhpExportFormat = 'snippet' | 'plugin' | 'functions';

function encodeUtf8Base64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function portableMediaUrl(url?: string, allowSvgData = false): string {
  const clean = (url || '').trim();
  if (!clean) return '';
  if (
    clean === OFFICIAL_NPL_LOGO_PATH ||
    clean.includes('NPL_Logo') ||
    clean === BUILTIN_NEWS_PHOTOS.npl_logo
  ) {
    return 'builtin:npl_logo';
  }
  if (/^builtin:(spin_wicket|fans_enclosure|kirtipur_twilight|npl_logo)$/i.test(clean)) {
    return clean.toLowerCase();
  }
  if (/^https?:\/\//i.test(clean)) return clean;
  if (clean.startsWith('data:image/')) {
    if (!allowSvgData && clean.startsWith('data:image/svg+xml')) return '';
    return clean;
  }
  return '';
}

function portableNewsImageToken(url?: string, id?: string): string {
  const clean = (url || '').trim();
  if (clean.includes('npl_spin_wicket') || clean === BUILTIN_NEWS_PHOTOS.spin_wicket) {
    return 'builtin:spin_wicket';
  }
  if (clean.includes('npl_fans_enclosure') || clean === BUILTIN_NEWS_PHOTOS.fans_enclosure) {
    return 'builtin:fans_enclosure';
  }
  if (clean.includes('npl_kirtipur_twilight') || clean === BUILTIN_NEWS_PHOTOS.kirtipur_twilight) {
    return 'builtin:kirtipur_twilight';
  }
  if (clean === OFFICIAL_NPL_LOGO_PATH || clean.includes('NPL_Logo') || clean === BUILTIN_NEWS_PHOTOS.npl_logo) {
    return 'builtin:npl_logo';
  }
  const portable = portableMediaUrl(clean, true);
  if (portable) return portable;
  if (!clean) {
    if (id === 'npl_news_3') return 'builtin:spin_wicket';
    if (id === 'npl_news_2') return 'builtin:fans_enclosure';
    if (id === 'npl_news_1') return 'builtin:kirtipur_twilight';
  }
  return '';
}

function serializeTeamsMapForPhp(teamsMap: NplDataState['teams']): Record<string, unknown> {
  const teamsOut: Record<string, unknown> = {};
  for (const [teamName, t] of Object.entries(teamsMap || {})) {
    teamsOut[teamName] = {
      name: t.name || teamName,
      shortCode: t.shortCode || teamName.slice(0, 3).toUpperCase(),
      logo: portableMediaUrl(t.logo, true),
      color: t.color || '#1a237e',
      captain: t.captain || '',
      coach: t.coach || '',
      owner: t.owner || '',
      venue: t.venue || '',
      titles: t.titles || '',
      description: t.description || '',
      players: (t.players || []).map((p) => ({
        name: p.name,
        role: p.role || 'Batsman',
        runs: Number(p.runs || 0),
        wickets: Number(p.wickets || 0),
        photo: portableMediaUrl(p.photo, true),
      })),
    };
  }
  return teamsOut;
}

function buildStudioSeedBase64(appData: NplDataState): string {
  const rawSource = appData && appData.teams ? appData : INITIAL_NPL_DATA;
  const source = syncActiveSeriesIntoMap(rawSource);
  const seriesList = getSeriesList(source);
  const activeSeriesName = source.activeSeries || source.seriesName || 'Nepal Premier League';

  const seriesMapOut: Record<string, unknown> = {};
  for (const sr of seriesList) {
    seriesMapOut[sr.name] = {
      name: sr.name,
      code: sr.code || 'NPL',
      format: sr.format === 'ODI' ? 'ODI' : 'T20',
      maxOvers: sr.format === 'ODI' ? 50 : 20,
      season: sr.season || '2026',
      category: sr.category || 'Cricket Tournament',
      venue: sr.venue || 'TU Cricket Ground, Kirtipur',
      logo:
        portableMediaUrl(sr.logo, true) ||
        (sr.name === 'Nepal Premier League' ? 'builtin:npl_logo' : ''),
      teams: serializeTeamsMapForPhp(sr.teams || {}),
    };
  }

  const teamsOut = serializeTeamsMapForPhp(source.teams || {});

  const matchesOut: Record<string, unknown> = {};
  for (const m of source.matches || []) {
    if (!m || !m.id) continue;
    matchesOut[m.id] = {
      id: m.id,
      series: m.series || 'Nepal Premier League',
      match_no: m.match_no || '',
      date: m.date || '',
      time: m.time || '',
      venue: m.venue || '',
      team1: m.team1 || '',
      team2: m.team2 || '',
      team1_score: m.team1_score || '',
      team1_overs: m.team1_overs || '',
      team2_score: m.team2_score || '',
      team2_overs: m.team2_overs || '',
      winner: m.winner || '',
      result_text: m.result_text || '',
      live: Boolean(m.live),
      live_status: m.live_status || '',
      live_details: m.live_details || null,
    };
  }

  const newsOut: Record<string, unknown> = {};
  for (const n of source.news || []) {
    if (!n || !n.id) continue;
    newsOut[n.id] = {
      id: n.id,
      series: n.series || 'Nepal Premier League',
      title: n.title || '',
      category: n.category || 'press',
      date: n.date || '',
      time: n.time || '',
      author: n.author || 'By SetoPress Cricket Desk · Kirtipur',
      team1: n.team1 || '',
      team2: n.team2 || '',
      image: portableNewsImageToken(n.image, n.id),
      excerpt: n.excerpt || '',
      content: n.content || '',
      quote: n.quote || '',
    };
  }

  const payload = {
    activeSeries: activeSeriesName,
    season: source.season || '2026',
    logo: portableMediaUrl(source.logo, true) || 'builtin:npl_logo',
    seriesMap: seriesMapOut,
    teams: teamsOut,
    matches: matchesOut,
    news: newsOut,
  };

  return encodeUtf8Base64(JSON.stringify(payload));
}

export function getFixedWordPressPhpCode(
  format: PhpExportFormat,
  appData: NplDataState = INITIAL_NPL_DATA
): string {
  const studioSeedB64 = buildStudioSeedBase64(appData);
  const coreBody = `/**
 * Nepal Premier League & Multi-Series Cricket Manager - Studio Edition (1:1 SetoPress App Sync + MySQL Save + Facebook Sync)
 * Shortcodes: [setopress_npl], [setopress_npl series="ICC Cricket World Cup"], [setopress_npl_news]
 * Facebook Page Sync: https://www.facebook.com/profile.php?id=61590852571494 (ID: 61590852571494)
 * Version: 6.6.0 (PHP 7.0 - 8.3+ AST Validated for WordPress Code Snippets)
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!defined('SP659_NPL_SERIES')) define('SP659_NPL_SERIES', 'Nepal Premier League');
if (!defined('SP659_VERSION'))    define('SP659_VERSION', '6.6.0');

/* ─────────────────────────────────────────────────────────
   1. BUILT-IN SVG CRESTS & LIVE SETOPRESS STUDIO SEED
   ───────────────────────────────────────────────────────── */
if (!function_exists('sp659_studio_seed')) {
    function sp659_studio_seed() {
        $b64 = '${studioSeedB64}';
        $raw = base64_decode($b64, true);
        if (!is_string($raw) || $raw === '') return array();
        $dec = json_decode($raw, true);
        return is_array($dec) ? $dec : array();
    }
}

if (!function_exists('sp659_studio_seed_sig')) {
    function sp659_studio_seed_sig() {
        return SP659_VERSION . '_' . substr(md5('${studioSeedB64}'), 0, 12);
    }
}

if (!function_exists('sp659_make_crest_svg')) {
    function sp659_make_crest_svg($code, $bg1, $bg2) {
        $gid = 'spcg_' . preg_replace('/[^A-Za-z0-9]/', '', (string)$code);
        if ($gid === 'spcg_') $gid = 'spcg_npl';
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">'
             . '<defs><linearGradient id="' . $gid . '" x1="0" y1="0" x2="1" y2="1">'
             . '<stop offset="0%" stop-color="' . $bg1 . '"/><stop offset="100%" stop-color="' . $bg2 . '"/>'
             . '</linearGradient></defs>'
             . '<circle cx="60" cy="60" r="56" fill="url(#' . $gid . ')" stroke="#ffffff" stroke-width="4"/>'
             . '<path d="M28 84 L60 22 L92 84 Z" fill="rgba(255,255,255,0.12)"/>'
             . '<text x="60" y="69" font-family="Arial,sans-serif" font-weight="800" font-size="26" fill="#ffffff" text-anchor="middle" letter-spacing="1">'
             . htmlspecialchars((string)$code, ENT_QUOTES, 'UTF-8')
             . '</text></svg>';
        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }
}

if (!function_exists('sp659_builtin_photo')) {
    function sp659_builtin_photo($key) {
        static $photos = null;
        if ($photos === null) {
            $photos = array(
                'npl_logo'          => '${BUILTIN_NEWS_PHOTOS.npl_logo}',
                'spin_wicket'       => '${BUILTIN_NEWS_PHOTOS.spin_wicket}',
                'fans_enclosure'    => '${BUILTIN_NEWS_PHOTOS.fans_enclosure}',
                'kirtipur_twilight' => '${BUILTIN_NEWS_PHOTOS.kirtipur_twilight}',
            );
        }
        return isset($photos[$key]) ? $photos[$key] : '';
    }
}

if (!function_exists('sp659_is_wide_logo')) {
    function sp659_is_wide_logo($url) {
        $u = trim((string)$url);
        if ($u === '') return false;
        if ($u === 'builtin:npl_logo' || strpos($u, 'NPL_Logo') !== false || strpos($u, 'data:image/jpeg') === 0) {
            return true;
        }
        return false;
    }
}

if (!function_exists('sp659_sanitize_media_field')) {
    function sp659_sanitize_media_field($val) {
        $u = trim((string)$val);
        if ($u === '') return '';
        if (preg_match('/^builtin:(spin_wicket|fans_enclosure|kirtipur_twilight|npl_logo)$/i', $u)) {
            return strtolower($u);
        }
        if (preg_match('/^data:image\\/(svg\\+xml|png|jpe?g|webp|gif);(base64,[A-Za-z0-9+\\/=\\r\\n]+|utf8,[^"<>\\s]+)$/i', $u)) {
            return $u;
        }
        return esc_url_raw($u);
    }
}

if (!function_exists('sp659_resolve_news_image')) {
    function sp659_resolve_news_image($item) {
        if (!is_array($item)) return '';
        $raw = trim((string)($item['image'] ?? ''));
        if (strpos($raw, 'builtin:') === 0) {
            return sp659_builtin_photo(substr($raw, 8));
        }
        if ($raw !== '') {
            return $raw;
        }
        $id = (string)($item['id'] ?? '');
        if ($id === 'npl_news_3') return sp659_builtin_photo('spin_wicket');
        if ($id === 'npl_news_2') return sp659_builtin_photo('fans_enclosure');
        if ($id === 'npl_news_1') return sp659_builtin_photo('kirtipur_twilight');
        return '';
    }
}

if (!function_exists('sp659_esc_img')) {
    function sp659_esc_img($url) {
        $u = trim((string)$url);
        if ($u === '') return '';
        if (strpos($u, 'builtin:') === 0) {
            $u = sp659_builtin_photo(substr($u, 8));
        }
        if ($u === '') return '';
        if (preg_match('/^data:image\\/(svg\\+xml|png|jpe?g|webp|gif);(base64,[A-Za-z0-9+\\/=\\r\\n]+|utf8,[^"<>\\s]+)$/i', $u)) {
            return esc_attr($u);
        }
        return esc_url($u);
    }
}

if (!function_exists('sp659_clean_shortcode_output')) {
    function sp659_clean_shortcode_output($html) {
        $parts = preg_split('/(<script\\b[^>]*>[\\s\\S]*?<\\/script>|<style\\b[^>]*>[\\s\\S]*?<\\/style>)/i', (string)$html, -1, PREG_SPLIT_DELIM_CAPTURE);
        if (!is_array($parts)) return (string)$html;
        $out = '';
        foreach ($parts as $i => $chunk) {
            if ($i % 2 === 1) {
                $out .= preg_replace("/\\r?\\n\\s*\\r?\\n+/", "\n", $chunk);
            } else {
                $clean = preg_replace('/>\\s*[\\r\\n]+\\s*</', '><', $chunk);
                $out .= trim((string)$clean);
            }
        }
        return $out;
    }
}

if (!function_exists('sp659_franchise_presets')) {
    function sp659_franchise_presets() {
        return array(
            'Janakpur Bolts' => array(
                'code' => 'JKB', 'color' => '#1e3a8a', 'accent' => '#f59e0b',
                'captain' => 'Anil Sah', 'coach' => 'Pubudu Dassanayake', 'owner' => 'Dream Sports Pvt. Ltd.',
                'venue' => 'Ram Janaki International Stadium',
                'description' => 'Representing Madhesh Province in the Nepal Premier League.',
                'players' => array(
                    array('name' => 'Aasif Sheikh', 'role' => 'Marquee Player', 'runs' => 318, 'wickets' => 0, 'photo' => ''),
                    array('name' => 'Anil Sah', 'role' => 'Captain', 'runs' => 245, 'wickets' => 0, 'photo' => ''),
                    array('name' => 'Lalit Rajbanshi', 'role' => 'Bowler', 'runs' => 18, 'wickets' => 13, 'photo' => ''),
                    array('name' => 'Kishore Mahato', 'role' => 'Bowler', 'runs' => 22, 'wickets' => 9, 'photo' => ''),
                    array('name' => 'Harsh Thaker', 'role' => 'Allrounder', 'runs' => 164, 'wickets' => 7, 'photo' => '')
                )
            ),
            'Sudurpaschim Royals' => array(
                'code' => 'SPR', 'color' => '#0f766e', 'accent' => '#eab308',
                'captain' => 'Dipendra Singh Airee', 'coach' => 'Jagat Tamata', 'owner' => 'Empire Sports Management',
                'venue' => 'Fapla Cricket Ground, Dhangadhi',
                'description' => 'Representing Sudurpashchim Province with dynamic all-round firepower.',
                'players' => array(
                    array('name' => 'Dipendra Singh Airee', 'role' => 'Captain', 'runs' => 294, 'wickets' => 11, 'photo' => ''),
                    array('name' => 'Aarif Sheikh', 'role' => 'Batsman', 'runs' => 198, 'wickets' => 2, 'photo' => ''),
                    array('name' => 'Abinash Bohara', 'role' => 'Bowler', 'runs' => 12, 'wickets' => 10, 'photo' => ''),
                    array('name' => 'Binod Bhandari', 'role' => 'Wicketkeeper', 'runs' => 156, 'wickets' => 0, 'photo' => '')
                )
            ),
            'Chitwan Rhinos' => array(
                'code' => 'CWR', 'color' => '#b91c1c', 'accent' => '#dc2626',
                'captain' => 'Kushal Malla', 'coach' => 'Umesh Patwal', 'owner' => 'Chitwan Medical College Sports',
                'venue' => 'Gautam Buddha International Cricket Stadium',
                'description' => 'Representing Bagmati Corridor & Chitwan Valley in the NPL.',
                'players' => array(
                    array('name' => 'Kushal Malla', 'role' => 'Captain', 'runs' => 262, 'wickets' => 6, 'photo' => ''),
                    array('name' => 'Rijan Dhakal', 'role' => 'Bowler', 'runs' => 15, 'wickets' => 12, 'photo' => ''),
                    array('name' => 'Sharad Vesawkar', 'role' => 'Batsman', 'runs' => 141, 'wickets' => 1, 'photo' => ''),
                    array('name' => 'Santosh Karki', 'role' => 'Wicketkeeper', 'runs' => 128, 'wickets' => 0, 'photo' => '')
                )
            ),
            'Karnali Yaks' => array(
                'code' => 'KNY', 'color' => '#0369a1', 'accent' => '#0284c7',
                'captain' => 'Sompal Kami', 'coach' => 'Gyanendra Malla', 'owner' => 'Himalayan Builders & Sports',
                'venue' => 'Kalinchowk Cricket Ground, Surkhet',
                'description' => 'Representing Karnali Province with pace and discipline.',
                'players' => array(
                    array('name' => 'Sompal Kami', 'role' => 'Captain', 'runs' => 134, 'wickets' => 9, 'photo' => ''),
                    array('name' => 'Gulshan Jha', 'role' => 'Allrounder', 'runs' => 176, 'wickets' => 7, 'photo' => ''),
                    array('name' => 'Dev Khanal', 'role' => 'Batsman', 'runs' => 189, 'wickets' => 0, 'photo' => ''),
                    array('name' => 'Nandan Yadav', 'role' => 'Bowler', 'runs' => 24, 'wickets' => 9, 'photo' => ''),
                    array('name' => 'Mousom Dhakal', 'role' => 'Bowler', 'runs' => 8, 'wickets' => 8, 'photo' => '')
                )
            ),
            'Kathmandu Gurkhas' => array(
                'code' => 'KTG', 'color' => '#312e81', 'accent' => '#ca8a04',
                'captain' => 'Karan KC', 'coach' => 'Basanta Shahi', 'owner' => 'Kathmandu Sports Development',
                'venue' => 'TU International Cricket Ground, Kirtipur',
                'description' => 'Capital franchise competing out of historic TU Ground, Kirtipur.',
                'players' => array(
                    array('name' => 'Karan KC', 'role' => 'Captain', 'runs' => 118, 'wickets' => 10, 'photo' => ''),
                    array('name' => 'Bhim Sharki', 'role' => 'Batsman', 'runs' => 210, 'wickets' => 0, 'photo' => ''),
                    array('name' => 'Rashid Khan', 'role' => 'Allrounder', 'runs' => 84, 'wickets' => 7, 'photo' => ''),
                    array('name' => 'Shahab Alam', 'role' => 'Bowler', 'runs' => 14, 'wickets' => 9, 'photo' => ''),
                    array('name' => 'Shankar Rana', 'role' => 'Batsman', 'runs' => 132, 'wickets' => 0, 'photo' => '')
                )
            ),
            'Biratnagar Kings' => array(
                'code' => 'BRK', 'color' => '#c8102e', 'accent' => '#7f1d1d',
                'captain' => 'Sandeep Lamichhane', 'coach' => 'Kevin O Brien', 'owner' => 'MAD Dream Sports',
                'venue' => 'Girija Prasad Koirala Stadium, Biratnagar',
                'description' => 'Representing Koshi Province in the Nepal Premier League.',
                'players' => array(
                    array('name' => 'Sandeep Lamichhane', 'role' => 'Captain', 'runs' => 54, 'wickets' => 14, 'photo' => ''),
                    array('name' => 'Lokesh Bam', 'role' => 'Wicketkeeper', 'runs' => 226, 'wickets' => 0, 'photo' => ''),
                    array('name' => 'Pratish GC', 'role' => 'Bowler', 'runs' => 68, 'wickets' => 7, 'photo' => ''),
                    array('name' => 'Bashir Ahamad', 'role' => 'Allrounder', 'runs' => 119, 'wickets' => 5, 'photo' => '')
                )
            ),
            'Pokhara Avengers' => array(
                'code' => 'PKA', 'color' => '#b45309', 'accent' => '#dc2626',
                'captain' => 'Kushal Bhurtel', 'coach' => 'Rajiv Kumar', 'owner' => 'Pokhara T20 Pvt. Ltd.',
                'venue' => 'Pokhara Rangasala Cricket Ground',
                'description' => 'Representing Gandaki Province beneath the Annapurna range.',
                'players' => array(
                    array('name' => 'Kushal Bhurtel', 'role' => 'Captain', 'runs' => 278, 'wickets' => 3, 'photo' => ''),
                    array('name' => 'Sagar Dhakal', 'role' => 'Bowler', 'runs' => 11, 'wickets' => 8, 'photo' => ''),
                    array('name' => 'Dilip Nath', 'role' => 'Wicketkeeper', 'runs' => 144, 'wickets' => 0, 'photo' => ''),
                    array('name' => 'Akash Chand', 'role' => 'Bowler', 'runs' => 19, 'wickets' => 6, 'photo' => '')
                )
            ),
            'Lumbini Lions' => array(
                'code' => 'LBL', 'color' => '#1d4ed8', 'accent' => '#eab308',
                'captain' => 'Rohit Paudel', 'coach' => 'Nandan Phadnis', 'owner' => 'Fortuna Health & Sports',
                'venue' => 'Extratech Oval Cricket Stadium, Tilottama',
                'description' => 'Representing Lumbini Province with Nepal national skipper Rohit Paudel.',
                'players' => array(
                    array('name' => 'Rohit Paudel', 'role' => 'Captain', 'runs' => 305, 'wickets' => 4, 'photo' => ''),
                    array('name' => 'Sundeep Jora', 'role' => 'Batsman', 'runs' => 185, 'wickets' => 0, 'photo' => ''),
                    array('name' => 'Surya Tamang', 'role' => 'Bowler', 'runs' => 9, 'wickets' => 8, 'photo' => ''),
                    array('name' => 'Bibek Yadav', 'role' => 'Allrounder', 'runs' => 124, 'wickets' => 4, 'photo' => '')
                )
            )
        );
    }
}

if (!function_exists('sp659_sample_matches_and_news')) {
    function sp659_sample_matches_and_news() {
        $sn = SP659_NPL_SERIES;
        $matches = array(
            'npl_match_1' => array('id' => 'npl_match_1', 'series' => $sn, 'match_no' => 'Match 1', 'date' => '2026-10-24', 'time' => '12:15', 'venue' => 'TU Cricket Ground, Kirtipur', 'team1' => 'Janakpur Bolts', 'team2' => 'Biratnagar Kings', 'team1_score' => '176/5', 'team2_score' => '152/9', 'team1_overs' => '20.0', 'team2_overs' => '20.0', 'winner' => 'Janakpur Bolts', 'result_text' => 'Janakpur Bolts won by 24 runs', 'live' => 0, 'live_status' => ''),
            'npl_match_2' => array('id' => 'npl_match_2', 'series' => $sn, 'match_no' => 'Match 2', 'date' => '2026-10-25', 'time' => '09:15', 'venue' => 'TU Cricket Ground, Kirtipur', 'team1' => 'Kathmandu Gurkhas', 'team2' => 'Chitwan Rhinos', 'team1_score' => '138/10', 'team2_score' => '141/5', 'team1_overs' => '18.4', 'team2_overs' => '17.5', 'winner' => 'Chitwan Rhinos', 'result_text' => 'Chitwan Rhinos won by 5 wickets', 'live' => 0, 'live_status' => ''),
            'npl_match_3' => array('id' => 'npl_match_3', 'series' => $sn, 'match_no' => 'Match 3', 'date' => '2026-10-26', 'time' => '13:15', 'venue' => 'TU Cricket Ground, Kirtipur', 'team1' => 'Sudurpaschim Royals', 'team2' => 'Lumbini Lions', 'team1_score' => '189/4', 'team2_score' => '144/10', 'team1_overs' => '20.0', 'team2_overs' => '18.2', 'winner' => 'Sudurpaschim Royals', 'result_text' => 'Sudurpaschim Royals won by 45 runs', 'live' => 0, 'live_status' => ''),
            'npl_match_4' => array('id' => 'npl_match_4', 'series' => $sn, 'match_no' => 'Match 4', 'date' => '2026-10-27', 'time' => '12:15', 'venue' => 'TU Cricket Ground, Kirtipur', 'team1' => 'Karnali Yaks', 'team2' => 'Pokhara Avengers', 'team1_score' => '163/7', 'team2_score' => '158/8', 'team1_overs' => '20.0', 'team2_overs' => '20.0', 'winner' => 'Karnali Yaks', 'result_text' => 'Karnali Yaks won by 5 runs', 'live' => 0, 'live_status' => ''),
            'npl_match_5' => array('id' => 'npl_match_5', 'series' => $sn, 'match_no' => 'Match 5', 'date' => '2026-10-28', 'time' => '12:15', 'venue' => 'TU Cricket Ground, Kirtipur', 'team1' => 'Janakpur Bolts', 'team2' => 'Chitwan Rhinos', 'team1_score' => '168/6', 'team2_score' => '164/7', 'team1_overs' => '20.0', 'team2_overs' => '20.0', 'winner' => 'Janakpur Bolts', 'result_text' => 'Janakpur Bolts won by 4 runs', 'live' => 0, 'live_status' => ''),
            'npl_match_6' => array('id' => 'npl_match_6', 'series' => $sn, 'match_no' => 'Match 6', 'date' => '2026-10-29', 'time' => '13:00', 'venue' => 'TU Cricket Ground, Kirtipur', 'team1' => 'Biratnagar Kings', 'team2' => 'Pokhara Avengers', 'team1_score' => '171/6', 'team2_score' => '154/9', 'team1_overs' => '20.0', 'team2_overs' => '20.0', 'winner' => 'Biratnagar Kings', 'result_text' => 'Biratnagar Kings won by 17 runs', 'live' => 0, 'live_status' => ''),
            'npl_match_7' => array('id' => 'npl_match_7', 'series' => $sn, 'match_no' => 'Match 7', 'date' => '2026-10-30', 'time' => '12:45', 'venue' => 'TU Cricket Ground, Kirtipur', 'team1' => 'Sudurpaschim Royals', 'team2' => 'Kathmandu Gurkhas', 'team1_score' => '', 'team2_score' => '', 'team1_overs' => '', 'team2_overs' => '', 'winner' => '', 'result_text' => '', 'live' => 0, 'live_status' => ''),
            'npl_match_8' => array('id' => 'npl_match_8', 'series' => $sn, 'match_no' => 'Match 8', 'date' => '2026-10-31', 'time' => '09:15', 'venue' => 'TU Cricket Ground, Kirtipur', 'team1' => 'Lumbini Lions', 'team2' => 'Karnali Yaks', 'team1_score' => '', 'team2_score' => '', 'team1_overs' => '', 'team2_overs' => '', 'winner' => '', 'result_text' => '', 'live' => 0, 'live_status' => ''),
            'npl_match_9' => array('id' => 'npl_match_9', 'series' => $sn, 'match_no' => 'Match 9', 'date' => '2026-11-01', 'time' => '13:15', 'venue' => 'TU Cricket Ground, Kirtipur', 'team1' => 'Pokhara Avengers', 'team2' => 'Janakpur Bolts', 'team1_score' => '', 'team2_score' => '', 'team1_overs' => '', 'team2_overs' => '', 'winner' => '', 'result_text' => '', 'live' => 0, 'live_status' => ''),
            'npl_match_10' => array(
                'id' => 'npl_match_10',
                'series' => $sn,
                'match_no' => '10th Match',
                'date' => '2026-11-02',
                'time' => '13:15',
                'venue' => 'Kirtipur',
                'team1' => 'Karnali Yaks',
                'team2' => 'Kathmandu Gurkhas',
                'team1_score' => '180/6',
                'team1_overs' => '20.0',
                'team2_score' => '113/4',
                'team2_overs' => '14.4',
                'winner' => '',
                'result_text' => '',
                'live' => 1,
                'live_status' => 'Kathmandu need 68 runs in 32 balls.',
                'live_details' => array(
                    'batting_team' => 'team2',
                    'target' => 181,
                    'batters' => array(
                        array('name' => 'Karan KC', 'hand' => 'rhb', 'striker' => true, 'r' => 14, 'b' => 9, 'fours' => 2, 'sixes' => 0, 'sr' => '155.55', 'this_bowler' => '1 (6b)', 'last_5' => '2 (4b)', 'mat' => 102, 'career_runs' => 549, 'hs' => '45', 'ave' => '14.84'),
                        array('name' => 'Rashid Khan', 'hand' => 'rhb', 'striker' => false, 'r' => 39, 'b' => 27, 'fours' => 1, 'sixes' => 2, 'sr' => '144.44', 'this_bowler' => '13 (7b)', 'last_5' => '0 (1b)', 'mat' => 7, 'career_runs' => 84, 'hs' => '39*', 'ave' => '16.80')
                    ),
                    'bowlers' => array(
                        array('name' => 'Nandan Yadav', 'arm' => 'rm', 'o' => '2.4', 'm' => 0, 'r' => 20, 'w' => 1, 'econ' => '7.50', 'dots' => 10, 'fours' => 1, 'sixes' => 1, 'this_spell' => '-', 'mat' => 22, 'career_wkts' => 26, 'bbi' => '2/13', 'ave' => '19.15'),
                        array('name' => 'Gulsan Jha', 'arm' => 'rm', 'o' => '2', 'm' => 0, 'r' => 23, 'w' => 0, 'econ' => '11.50', 'dots' => 2, 'fours' => 2, 'sixes' => 1, 'this_spell' => '-', 'mat' => 68, 'career_wkts' => 31, 'bbi' => '3/31', 'ave' => '24.23')
                    ),
                    'last_bat' => 'Bhim Sharki 5 (4b)',
                    'fow' => '89/4 (12.3 Ov)',
                    'recent_overs' => array(
                        array('balls' => array('1lb', '1', '•', '1w', '1w', '1w', '•')),
                        array('over_label' => '14th', 'runs' => 13, 'balls' => array('1', '1', '1', '2', '4', '4')),
                        array('over_label' => '13th', 'runs' => 9, 'balls' => array('2', '2', '1w', '1', 'W'))
                    )
                )
            )
        );
        $news = array(
            'npl_news_3' => array(
                'id' => 'npl_news_3',
                'title' => 'Sandeep Lamichhane Spins Biratnagar Kings Back Into Winning Column Against Pokhara',
                'category' => 'match',
                'date' => '2026-10-29',
                'time' => '18:15',
                'author' => 'SetoPress Cricket Desk · Kirtipur',
                'excerpt' => 'A clinical three-wicket middle-overs spell from skipper Sandeep Lamichhane strangled Pokhara Avengers at 154/9 after Lokesh Bam brisk half-century lifted Biratnagar to 171/6.',
                'content' => "Defending a competitive 171/6 under fading afternoon light at the Tribhuvan University International Cricket Ground, Biratnagar Kings turned to captain Sandeep Lamichhane just as Pokhara Avengers threatened to break the chase open inside the powerplay.\\n\\nKushal Bhurtel had given Pokhara early momentum with crisp strokeplay over extra cover, racing to 44 off 27 deliveries. Introducing himself in the seventh over, Lamichhane immediately altered the tempo—dropping his pace through the air and extracting sharp drift across the right-handers before bowling Dilip Nath with a googly through the gate.\\n\\nEarlier in the afternoon, wicketkeeper-batter Lokesh Bam anchored Biratnagar's innings with an enterprising 64 off 39 balls, supported by Bashir Ahamad's calculated late cameo of 29 not out. Pratish GC then closed out the 19th over with pinpoint yorkers, sealing a 17-run victory that lifts Koshi Province's franchise firmly into the top-four playoff race.",
                'quote' => 'On the Kirtipur surface, patience with flight matters far more than bowling flat—once we squeezed two quiet overs after the powerplay, scoreboard pressure did the rest.',
                'image' => 'builtin:spin_wicket',
                'team1' => 'Biratnagar Kings',
                'team2' => 'Pokhara Avengers'
            ),
            'npl_news_2' => array(
                'id' => 'npl_news_2',
                'title' => 'CAN Announces Sold-Out Weekend Enclosures at TU Cricket Ground Kirtipur',
                'category' => 'press',
                'date' => '2026-10-29',
                'time' => '11:00',
                'author' => 'CAN Media Relations · Kathmandu',
                'excerpt' => 'The Cricket Association of Nepal confirmed full-capacity digital ticketing allocations for Saturday marquee double-header featuring Sudurpaschim Royals, Lumbini Lions, and Karnali Yaks.',
                'content' => "Supporters heading to the terraced grass embankments of Kirtipur this weekend will greet a capacity crowd after the Cricket Association of Nepal (CAN) confirmed that all general and hospitality enclosures for Saturday's Nepal Premier League double-header sold out 48 hours in advance.\\n\\nGates at the Tribhuvan University International Cricket Ground will open at 07:30 NPT ahead of the 09:15 morning fixture between Lumbini Lions and Karnali Yaks. Organizers have deployed six dedicated QR-verification lanes along the Balkhu and Kirtipur University entry corridors to streamline supporter entry.\\n\\nSpectators holding digital passes are advised to carry valid photo identification and arrive at least 45 minutes prior to the toss. Additional shuttle buses will operate between Sundhara, Kalanki, and the stadium gates throughout matchday.",
                'quote' => 'The energy on the Kirtipur grass banks remains unmatched anywhere in associate cricket—every weekend session has felt like an international final.',
                'image' => 'builtin:fans_enclosure',
                'team1' => '',
                'team2' => ''
            ),
            'npl_news_1' => array(
                'id' => 'npl_news_1',
                'title' => 'Aasif Sheikh & Lalit Rajbanshi Propel Janakpur Bolts to Top of NPL Standings',
                'category' => 'match',
                'date' => '2026-10-28',
                'time' => '17:30',
                'author' => 'SetoPress Cricket Desk · Kirtipur',
                'excerpt' => 'Defending champions Janakpur Bolts held their nerve in the final six balls at Kirtipur to edge Chitwan Rhinos by 4 runs and preserve an unbeaten start to the 2026 campaign.',
                'content' => "Janakpur Bolts showcased the composure of defending champions at TU Cricket Ground, surviving a ferocious late assault from Kushal Malla to defeat Chitwan Rhinos by four runs in one of the tightest finishes of the tournament.\\n\\nSent in to bat first, marquee opener Aasif Sheikh constructed a fluent 72 from 48 deliveries, threading nine boundaries around the carpet while sharing an 86-run partnership with skipper Anil Sah. Despite Rijan Dhakal striking twice with the older ball at the death, Harsh Thaker's boundary off the final ball nudged Janakpur to 168/6.\\n\\nChitwan appeared marginally ahead at 134/4 with three overs left before left-arm spinner Lalit Rajbanshi conceded just five runs in a decisive 18th over. Needing 14 off the final over bowled by Kishore Mahato, Chitwan finished agonizingly short on 164/7, sending Janakpur clear at the summit of the official NPL Points Table.",
                'quote' => 'When the margin is four runs in T20 cricket, every single saved on the boundary in the sixth over counts just as much as the twentieth over.',
                'image' => 'builtin:kirtipur_twilight',
                'team1' => 'Janakpur Bolts',
                'team2' => 'Chitwan Rhinos'
            ),
            'npl_news_4' => array(
                'id' => 'npl_news_4',
                'title' => 'Updated Playoff Qualification & ICC Net Run Rate Playing Conditions Confirmed',
                'category' => 'update',
                'date' => '2026-10-27',
                'time' => '14:20',
                'author' => 'NPL Technical Committee',
                'excerpt' => 'The Tournament Technical Committee has reaffirmed official ICC T20 Net Run Rate regulations ahead of the mid-season stage, including full 20-over allocation whenever a side is bowled out.',
                'content' => "With less than a single victory separating five franchises in the middle of the Nepal Premier League standings, the NPL Technical Committee has circulated an official statistical note clarifying playoff tie-breakers and Net Run Rate (NRR) calculations.\\n\\nIn accordance with standard ICC Twenty20 playing conditions, Net Run Rate across the league stage is determined by subtracting the average runs per over conceded by a franchise from the average runs per over scored throughout completed matches. Crucially, if a batting side is dismissed all out (10 wickets) prior to completing its allotted 20 overs, that innings is calculated against the full 20.0-over quota.\\n\\nThe top four franchises at the conclusion of the round-robin stage qualify for the NPL Playoffs: 1st vs 2nd in Qualifier 1 for direct entry to the Final, while 3rd vs 4th contest the Eliminator.",
                'quote' => '',
                'image' => '',
                'team1' => 'Sudurpaschim Royals',
                'team2' => 'Lumbini Lions'
            ),
            'npl_news_5' => array(
                'id' => 'npl_news_5',
                'title' => 'Dipendra Singh Airee All-Round Masterclass Sets Early Benchmark for Royals',
                'category' => 'match',
                'date' => '2026-10-26',
                'time' => '19:10',
                'author' => 'SetoPress Cricket Desk · Kirtipur',
                'excerpt' => 'Skipper Dipendra Singh Airee smashed an unbeaten 68 off 34 balls and claimed two middle-order wickets as Sudurpaschim Royals overpowered Lumbini Lions by 45 runs.',
                'content' => "Sudurpaschim Royals delivered the most emphatic net-run-rate statement of the opening week, posting a commanding 189/4 before bowling out Lumbini Lions for 144 in 18.2 overs.\\n\\nWalking in at 74/2 in the tenth over, Dipendra Singh Airee accelerated effortlessly against both pace and spin, clearing the long-on rope four times in a 34-ball 68 not out alongside Aarif Sheikh's composed 51. That partnership added 92 runs in just 8.1 overs.\\n\\nUnder scoreboard pressure from the outset, Lumbini skipper Rohit Paudel fought lone resistance with a brisk 56, but Abinash Bohara's twin strikes in the powerplay and Airee's tidy off-spin through the middle overs ensured a comprehensive 45-run victory—and a massive early NRR boost because Lumbini were dismissed inside 20 overs.",
                'quote' => '',
                'image' => '',
                'team1' => 'Sudurpaschim Royals',
                'team2' => 'Lumbini Lions'
            )
        );
        return array('matches' => $matches, 'news' => $news);
    }
}

/* ─────────────────────────────────────────────────────────
   2. CACHE-BUSTING DATABASE ENGINE & CRICKET PARSERS
   ───────────────────────────────────────────────────────── */
if (!function_exists('sp659_normalize_collection')) {
    function sp659_normalize_collection($items, $prefix) {
        if (!is_array($items)) return array();
        $out = array();
        $idx = 1;
        foreach ($items as $k => $row) {
            if (!is_array($row)) continue;
            $id = isset($row['id']) && trim((string)$row['id']) !== ''
                ? trim((string)$row['id'])
                : (is_string($k) && trim($k) !== '' ? trim($k) : ($prefix . '_legacy_' . $idx));
            $row['id'] = $id;
            $out[$id] = $row;
            $idx++;
        }
        return $out;
    }
}

if (!function_exists('sp659_get_data')) {
    function sp659_get_data($bypass_cache = false) {
        global $wpdb;
        $d = null;
        if (isset($wpdb) && !empty($wpdb->options)) {
            $raw = $wpdb->get_var($wpdb->prepare(
                "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s ORDER BY option_id DESC LIMIT 1",
                'setopress_npl_data'
            ));
            if ($raw !== null) {
                $d = maybe_unserialize($raw);
            }
        }
        if (!is_array($d)) {
            if ($bypass_cache) {
                wp_cache_delete('setopress_npl_data', 'options');
                wp_cache_delete('alloptions', 'options');
            }
            $d = get_option('setopress_npl_data');
        }
        if (!is_array($d)) $d = array('series' => array(), 'matches' => array(), 'news' => array(), 'updated_at' => 0);
        if (!isset($d['series']) || !is_array($d['series'])) $d['series'] = array();
        $d['matches'] = sp659_normalize_collection($d['matches'] ?? array(), 'npl_match');
        $d['news']    = sp659_normalize_collection($d['news'] ?? array(), 'npl_news');
        if (!isset($d['updated_at'])) $d['updated_at'] = 0;
        return $d;
    }
}

if (!function_exists('sp659_purge_page_caches')) {
    function sp659_purge_page_caches() {
        wp_cache_delete('setopress_npl_data', 'options');
        wp_cache_delete('alloptions', 'options');
        if (has_action('litespeed_purge_all')) {
            do_action('litespeed_purge_all');
        }
        if (function_exists('rocket_clean_domain')) {
            rocket_clean_domain();
        }
        if (function_exists('w3tc_flush_all')) {
            w3tc_flush_all();
        }
        if (function_exists('wp_cache_clear_cache')) {
            wp_cache_clear_cache();
        }
        if (function_exists('sg_cachepress_purge_cache')) {
            sg_cachepress_purge_cache();
        }
    }
}

if (!function_exists('sp659_save_data')) {
    function sp659_save_data($d) {
        global $wpdb;
        $d['matches']    = sp659_normalize_collection($d['matches'] ?? array(), 'npl_match');
        $d['news']       = sp659_normalize_collection($d['news'] ?? array(), 'npl_news');
        $d['updated_at'] = time() + wp_rand(1, 99);
        $serialized      = maybe_serialize($d);

        if (isset($wpdb) && !empty($wpdb->options)) {
            $ids = $wpdb->get_col($wpdb->prepare(
                "SELECT option_id FROM {$wpdb->options} WHERE option_name = %s ORDER BY option_id DESC",
                'setopress_npl_data'
            ));
            if (!empty($ids)) {
                $keep_id = intval($ids[0]);
                if (count($ids) > 1) {
                    $extra = array_map('intval', array_slice($ids, 1));
                    $in_sql = implode(',', $extra);
                    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_id IN ({$in_sql})");
                }
                $wpdb->update(
                    $wpdb->options,
                    array('option_value' => $serialized, 'autoload' => 'yes'),
                    array('option_id' => $keep_id)
                );
            } else {
                $wpdb->insert(
                    $wpdb->options,
                    array('option_name' => 'setopress_npl_data', 'option_value' => $serialized, 'autoload' => 'yes')
                );
            }
        } else {
            update_option('setopress_npl_data', $d, true);
        }

        wp_cache_delete('setopress_npl_data', 'options');
        wp_cache_delete('alloptions', 'options');
        if (function_exists('wp_load_alloptions')) {
            wp_load_alloptions(true);
        }
        sp659_purge_page_caches();
        return true;
    }
}

if (!function_exists('sp659_active_series_name')) {
    function sp659_active_series_name($d) {
        $series = isset($d['series']) && is_array($d['series']) ? $d['series'] : array();
        $act = trim((string)($d['active_series'] ?? ''));
        if ($act !== '' && isset($series[$act])) return $act;
        if (isset($series[SP659_NPL_SERIES])) return SP659_NPL_SERIES;
        $keys = array_keys($series);
        return isset($keys[0]) ? (string)$keys[0] : SP659_NPL_SERIES;
    }
}

if (!function_exists('sp659_derive_series_code')) {
    function sp659_derive_series_code($name, $code = '') {
        $clean = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)$code));
        if ($clean !== '') return substr($clean, 0, 6);
        $words = preg_split('/\\s+/', trim((string)$name));
        $acr = '';
        foreach ($words as $w) {
            if ($w !== '' && preg_match('/^[A-Za-z0-9]/', $w)) {
                $acr .= strtoupper(substr($w, 0, 1));
            }
        }
        return $acr !== '' ? substr($acr, 0, 5) : 'NPL';
    }
}

if (!function_exists('sp659_load_defaults')) {
    function sp659_load_defaults($force_sample_matches = false) {
        $d       = sp659_get_data(true);
        $presets = sp659_franchise_presets();
        $seed    = sp659_studio_seed();
        $s_map   = isset($seed['seriesMap']) && is_array($seed['seriesMap']) ? $seed['seriesMap'] : array();

        if (!empty($s_map)) {
            foreach ($s_map as $sr_name => $sr_row) {
                if (!is_array($sr_row)) continue;
                $old_sr  = isset($d['series'][$sr_name]) && is_array($d['series'][$sr_name]) ? $d['series'][$sr_name] : array();
                $s_teams = isset($sr_row['teams']) && is_array($sr_row['teams']) ? $sr_row['teams'] : array();
                $teams   = array();
                $is_npl  = ($sr_name === SP659_NPL_SERIES);
                $all_team_names = $is_npl
                    ? array_unique(array_merge(array_keys($presets), array_keys($s_teams)))
                    : array_keys($s_teams);

                foreach ($all_team_names as $tn) {
                    $pre = $presets[$tn] ?? array(
                        'code'        => strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $tn), 0, 3)),
                        'color'       => '#1a237e',
                        'captain'     => '',
                        'coach'       => '',
                        'owner'       => '',
                        'venue'       => '',
                        'description' => '',
                        'players'     => array()
                    );
                    $st = isset($s_teams[$tn]) && is_array($s_teams[$tn]) ? $s_teams[$tn] : array();
                    $p  = isset($old_sr['teams'][$tn]) && is_array($old_sr['teams'][$tn]) ? $old_sr['teams'][$tn] : array();

                    $seed_players = (!empty($st['players']) && is_array($st['players'])) ? $st['players'] : $pre['players'];
                    $existing_players = (!$force_sample_matches && isset($p['players']) && is_array($p['players']) && count($p['players']) > 0)
                        ? $p['players']
                        : $seed_players;

                    $teams[$tn] = array(
                        'name'        => $tn,
                        'shortCode'   => !empty($st['shortCode']) ? $st['shortCode'] : $pre['code'],
                        'logo'        => (!$force_sample_matches && !empty($p['logo'])) ? $p['logo'] : ($st['logo'] ?? ''),
                        'color'       => (!$force_sample_matches && !empty($p['color']) && $p['color'] !== '#c8102e') ? $p['color'] : (!empty($st['color']) ? $st['color'] : $pre['color']),
                        'captain'     => (!$force_sample_matches && !empty($p['captain'])) ? $p['captain'] : (!empty($st['captain']) ? $st['captain'] : $pre['captain']),
                        'coach'       => (!$force_sample_matches && !empty($p['coach'])) ? $p['coach'] : (!empty($st['coach']) ? $st['coach'] : $pre['coach']),
                        'owner'       => (!$force_sample_matches && !empty($p['owner'])) ? $p['owner'] : (!empty($st['owner']) ? $st['owner'] : $pre['owner']),
                        'venue'       => (!$force_sample_matches && !empty($p['venue'])) ? $p['venue'] : (!empty($st['venue']) ? $st['venue'] : $pre['venue']),
                        'titles'      => (!$force_sample_matches && !empty($p['titles'])) ? $p['titles'] : ($st['titles'] ?? ''),
                        'description' => (!$force_sample_matches && !empty($p['description'])) ? $p['description'] : (!empty($st['description']) ? $st['description'] : $pre['description']),
                        'players'     => $existing_players
                    );
                }

                $fmt = (($sr_row['format'] ?? 'T20') === 'ODI') ? 'ODI' : 'T20';
                $def_logo = $is_npl ? 'builtin:npl_logo' : '';
                $d['series'][$sr_name] = array(
                    'name'      => $sr_name,
                    'code'      => sp659_derive_series_code($sr_name, $old_sr['code'] ?? ($sr_row['code'] ?? '')),
                    'format'    => (!$force_sample_matches && !empty($old_sr['format'])) ? $old_sr['format'] : $fmt,
                    'max_overs' => $fmt === 'ODI' ? 50 : 20,
                    'season'    => (!$force_sample_matches && !empty($old_sr['season'])) ? $old_sr['season'] : (!empty($sr_row['season']) ? $sr_row['season'] : '2026'),
                    'category'  => (!$force_sample_matches && !empty($old_sr['category'])) ? $old_sr['category'] : (!empty($sr_row['category']) ? $sr_row['category'] : 'Cricket Tournament'),
                    'venue'     => (!$force_sample_matches && !empty($old_sr['venue'])) ? $old_sr['venue'] : (!empty($sr_row['venue']) ? $sr_row['venue'] : 'TU Cricket Ground, Kirtipur'),
                    'logo'      => (!$force_sample_matches && !empty($old_sr['logo'])) ? $old_sr['logo'] : (!empty($sr_row['logo']) ? $sr_row['logo'] : $def_logo),
                    'teams'     => $teams
                );
            }
        } else {
            $sn      = SP659_NPL_SERIES;
            $old     = isset($d['series'][$sn]) && is_array($d['series'][$sn]) ? $d['series'][$sn] : array();
            $s_teams = isset($seed['teams']) && is_array($seed['teams']) ? $seed['teams'] : array();
            $teams   = array();
            $all_team_names = array_unique(array_merge(array_keys($presets), array_keys($s_teams)));
            foreach ($all_team_names as $tn) {
                $pre = $presets[$tn] ?? array('code' => strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $tn), 0, 3)), 'color' => '#1a237e', 'captain' => '', 'coach' => '', 'owner' => '', 'venue' => '', 'description' => '', 'players' => array());
                $st  = isset($s_teams[$tn]) && is_array($s_teams[$tn]) ? $s_teams[$tn] : array();
                $p   = isset($old['teams'][$tn]) && is_array($old['teams'][$tn]) ? $old['teams'][$tn] : array();
                $teams[$tn] = array(
                    'name'        => $tn,
                    'shortCode'   => !empty($st['shortCode']) ? $st['shortCode'] : $pre['code'],
                    'logo'        => (!$force_sample_matches && !empty($p['logo'])) ? $p['logo'] : ($st['logo'] ?? ''),
                    'color'       => !empty($st['color']) ? $st['color'] : $pre['color'],
                    'captain'     => !empty($st['captain']) ? $st['captain'] : $pre['captain'],
                    'coach'       => !empty($st['coach']) ? $st['coach'] : $pre['coach'],
                    'owner'       => !empty($st['owner']) ? $st['owner'] : $pre['owner'],
                    'venue'       => !empty($st['venue']) ? $st['venue'] : $pre['venue'],
                    'titles'      => $st['titles'] ?? '',
                    'description' => !empty($st['description']) ? $st['description'] : $pre['description'],
                    'players'     => (!empty($st['players']) && is_array($st['players'])) ? $st['players'] : $pre['players']
                );
            }
            $d['series'][$sn] = array(
                'name'      => $sn,
                'code'      => 'NPL',
                'format'    => 'T20',
                'max_overs' => 20,
                'season'    => '2026',
                'category'  => 'Franchise T20 League',
                'venue'     => 'TU Cricket Ground, Kirtipur',
                'logo'      => 'builtin:npl_logo',
                'teams'     => $teams
            );
        }

        if ($force_sample_matches || empty($d['active_series']) || !isset($d['series'][$d['active_series']])) {
            $seed_act = trim((string)($seed['activeSeries'] ?? ''));
            $d['active_series'] = ($seed_act !== '' && isset($d['series'][$seed_act])) ? $seed_act : sp659_active_series_name($d);
        }

        $sample       = sp659_sample_matches_and_news();
        $seed_matches = (!empty($seed['matches']) && is_array($seed['matches'])) ? $seed['matches'] : $sample['matches'];
        $seed_news    = (!empty($seed['news']) && is_array($seed['news'])) ? $seed['news'] : $sample['news'];

        if ($force_sample_matches) {
            $d['matches'] = $seed_matches;
            $d['news']    = $seed_news;
        } else {
            if (empty($d['matches']) || !is_array($d['matches'])) {
                $d['matches'] = $seed_matches;
            } else {
                foreach ($seed_matches as $mid => $mrow) {
                    if (!isset($d['matches'][$mid])) {
                        $d['matches'][$mid] = $mrow;
                    } elseif (empty($d['matches'][$mid]['live_details']) && !empty($mrow['live_details'])) {
                        $d['matches'][$mid]['live_details'] = $mrow['live_details'];
                    }
                }
            }

            if (empty($d['news']) || !is_array($d['news'])) {
                $d['news'] = $seed_news;
            } else {
                foreach ($seed_news as $def_id => $def_row) {
                    if (!isset($d['news'][$def_id])) {
                        $d['news'][$def_id] = $def_row;
                    } elseif (empty($d['news'][$def_id]['content'])) {
                        $d['news'][$def_id]['content'] = $def_row['content'];
                        if (empty($d['news'][$def_id]['author'])) $d['news'][$def_id]['author'] = $def_row['author'];
                        if (empty($d['news'][$def_id]['quote']))  $d['news'][$def_id]['quote']  = $def_row['quote'];
                    }
                }
            }
        }

        $d['seed_sig'] = sp659_studio_seed_sig();
        sp659_save_data($d);
    }
}

if (!function_exists('sp659_canonical_team')) {
    function sp659_canonical_team($teams, $raw_name) {
        $clean = trim((string)$raw_name);
        if ($clean === '') return '';
        if (isset($teams[$clean])) return $clean;
        foreach ($teams as $k => $v) {
            if (strcasecmp($k, $clean) === 0 || strcasecmp($v['name'] ?? '', $clean) === 0) {
                return $k;
            }
        }
        $presets = sp659_franchise_presets();
        foreach ($presets as $k => $v) {
            if (strcasecmp($k, $clean) === 0) return $k;
        }
        return $clean;
    }
}

if (!function_exists('sp659_logo')) {
    function sp659_logo($s, $t) {
        $ts = $s['teams'] ?? array();
        $canon = sp659_canonical_team($ts, $t);
        if (!empty($ts[$canon]['logo'])) return $ts[$canon]['logo'];
        $presets = sp659_franchise_presets();
        if (isset($presets[$canon])) {
            return sp659_make_crest_svg($presets[$canon]['code'], $presets[$canon]['color'], $presets[$canon]['accent']);
        }
        $code = !empty($ts[$canon]['shortCode'])
            ? $ts[$canon]['shortCode']
            : strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $canon), 0, 3));
        $col = !empty($ts[$canon]['color']) ? $ts[$canon]['color'] : '#1a237e';
        return sp659_make_crest_svg($code ?: 'TM', $col, '#0f172a');
    }
}

if (!function_exists('sp659_series_logo')) {
    function sp659_series_logo($info) {
        if (!empty($info['logo'])) return $info['logo'];
        if (($info['name'] ?? '') === SP659_NPL_SERIES) return 'builtin:npl_logo';
        $code = sp659_derive_series_code($info['name'] ?? 'Series', $info['code'] ?? '');
        return sp659_make_crest_svg($code, '#0f172a', '#035fb2');
    }
}

if (!function_exists('sp659_team_color')) {
    function sp659_team_color($s, $t) {
        $ts = $s['teams'] ?? array();
        $canon = sp659_canonical_team($ts, $t);
        if (!empty($ts[$canon]['color'])) return $ts[$canon]['color'];
        $presets = sp659_franchise_presets();
        if (isset($presets[$canon])) return $presets[$canon]['color'];
        return '#1a237e';
    }
}

if (!function_exists('sp659_parse_score')) {
    function sp659_parse_score($score_str) {
        if ($score_str === null || trim((string)$score_str) === '') return 0;
        $clean = trim(explode('(', (string)$score_str)[0]);
        $parts = preg_split('/[\\/-]/', $clean);
        return intval(preg_replace('/[^0-9]/', '', $parts[0] ?? '0'));
    }
}

if (!function_exists('sp659_parse_wickets')) {
    function sp659_parse_wickets($score_str) {
        if ($score_str === null || trim((string)$score_str) === '') return 0;
        $str = strtolower((string)$score_str);
        if (strpos($str, 'all out') !== false || strpos($str, 'ao') !== false) return 10;
        $clean = trim(explode('(', (string)$score_str)[0]);
        $parts = preg_split('/[\\/-]/', $clean);
        if (!isset($parts[1])) return 0;
        $w = intval(preg_replace('/[^0-9]/', '', $parts[1]));
        return max(0, min(10, $w));
    }
}

if (!function_exists('sp659_parse_overs')) {
    function sp659_parse_overs($ov_str, $fallback_score_str = '') {
        $raw = trim((string)$ov_str);
        if ($raw === '' && !empty($fallback_score_str)) {
            if (preg_match('/\\(([0-9]+(?:\\.[0-5])?)\\s*(?:ov|overs)?\\)/i', (string)$fallback_score_str, $m)) {
                $raw = $m[1];
            }
        }
        if ($raw === '') return 0.0;
        $raw = preg_replace('/[^0-9.]/', '', $raw);
        if ($raw === '') return 0.0;
        if (strpos($raw, '.') !== false) {
            $parts = explode('.', $raw);
            $overs = intval($parts[0]);
            $balls = isset($parts[1]) && $parts[1] !== '' ? min(5, max(0, intval(substr($parts[1], 0, 1)))) : 0;
            return $overs + ($balls / 6.0);
        }
        return floatval($raw);
    }
}

if (!function_exists('sp659_resolve_match_outcome')) {
    function sp659_resolve_match_outcome($m) {
        $t1 = trim($m['team1'] ?? '');
        $t2 = trim($m['team2'] ?? '');
        $w  = trim($m['winner'] ?? '');
        $rt = trim($m['result_text'] ?? '');
        $s1 = trim($m['team1_score'] ?? '');
        $s2 = trim($m['team2_score'] ?? '');
        $has_scores = ($s1 !== '' && $s2 !== '');

        if ($w === '' && !$has_scores && $rt === '') {
            return array('type' => 'fixture', 'winner' => '');
        }
        if (strcasecmp($w, 'NR') === 0 || strcasecmp($w, 'No Result') === 0 || strcasecmp($w, 'Abandoned') === 0) {
            return array('type' => 'nr', 'winner' => 'No Result');
        }
        if (strcasecmp($w, 'Tie') === 0 || strcasecmp($w, 'Tied') === 0) {
            return array('type' => 'tie', 'winner' => 'Tie');
        }
        if ($w !== '') {
            if (strcasecmp($w, $t1) === 0) return array('type' => 'team1', 'winner' => $t1);
            if (strcasecmp($w, $t2) === 0) return array('type' => 'team2', 'winner' => $t2);
            if ($t1 !== '' && stripos($t1, $w) !== false && ($t2 === '' || stripos($t2, $w) === false)) {
                return array('type' => 'team1', 'winner' => $t1);
            }
            if ($t2 !== '' && stripos($t2, $w) !== false && ($t1 === '' || stripos($t1, $w) === false)) {
                return array('type' => 'team2', 'winner' => $t2);
            }
        }
        if ($has_scores) {
            $r1 = sp659_parse_score($s1);
            $r2 = sp659_parse_score($s2);
            if ($r1 > $r2) return array('type' => 'team1', 'winner' => $t1);
            if ($r2 > $r1) return array('type' => 'team2', 'winner' => $t2);
            if ($r1 > 0 && $r1 === $r2) return array('type' => 'tie', 'winner' => 'Tie');
        }
        if ($rt !== '' && strcasecmp($rt, 'Upcoming Fixture') !== 0) {
            if (stripos($rt, 'no result') !== false || stripos($rt, 'abandoned') !== false) {
                return array('type' => 'nr', 'winner' => 'No Result');
            }
            if (stripos($rt, 'match tied') !== false || strcasecmp($rt, 'tie') === 0 || strcasecmp($rt, 'tied') === 0) {
                return array('type' => 'tie', 'winner' => 'Tie');
            }
            $m1 = ($t1 !== '' && stripos($rt, $t1) !== false);
            $m2 = ($t2 !== '' && stripos($rt, $t2) !== false);
            if (!$m1 && $t1 !== '') {
                foreach (explode(' ', $t1) as $pw) {
                    if (strlen($pw) >= 4 && stripos($rt, $pw) !== false) { $m1 = true; break; }
                }
            }
            if (!$m2 && $t2 !== '') {
                foreach (explode(' ', $t2) as $pw) {
                    if (strlen($pw) >= 4 && stripos($rt, $pw) !== false) { $m2 = true; break; }
                }
            }
            if ($m1 && !$m2) return array('type' => 'team1', 'winner' => $t1);
            if ($m2 && !$m1) return array('type' => 'team2', 'winner' => $t2);
        }
        return array('type' => 'fixture', 'winner' => '');
    }
}

if (!function_exists('sp659_match_result_label')) {
    function sp659_match_result_label($m) {
        if (!empty($m['result_text'])) return $m['result_text'];
        $out = sp659_resolve_match_outcome($m);
        if ($out['type'] === 'nr')  return 'Match abandoned without a result (1 pt each)';
        if ($out['type'] === 'tie') return 'Match tied';
        if ($out['type'] === 'team1' || $out['type'] === 'team2') {
            $r1 = sp659_parse_score($m['team1_score'] ?? '');
            $r2 = sp659_parse_score($m['team2_score'] ?? '');
            if ($r1 > 0 && $r2 > 0 && $r1 !== $r2) {
                if ($out['type'] === 'team1') {
                    return $m['team1'] . ' won by ' . abs($r1 - $r2) . ' runs';
                } else {
                    $wkts_left = max(1, 10 - sp659_parse_wickets($m['team2_score'] ?? ''));
                    return $m['team2'] . ' won by ' . $wkts_left . ' wicket' . ($wkts_left !== 1 ? 's' : '');
                }
            }
            return $out['winner'] . ' won';
        }
        return 'Upcoming Fixture';
    }
}

if (!function_exists('sp659_overs_to_balls')) {
    function sp659_overs_to_balls($ov_str) {
        $raw = preg_replace('/[^0-9.]/', '', trim((string)$ov_str));
        if ($raw === '') return 0;
        if (strpos($raw, '.') !== false) {
            $parts = explode('.', $raw);
            $o = intval($parts[0]);
            $b = isset($parts[1]) && $parts[1] !== '' ? min(5, max(0, intval(substr($parts[1], 0, 1)))) : 0;
            return ($o * 6) + $b;
        }
        return intval($raw) * 6;
    }
}

if (!function_exists('sp659_format_long_date')) {
    function sp659_format_long_date($iso) {
        $raw = trim((string)$iso);
        if (preg_match('/^(\\d{4})-(\\d{2})-(\\d{2})$/', $raw, $m)) {
            $months = array('', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December');
            $mi = intval($m[2]);
            if ($mi >= 1 && $mi <= 12) {
                return $months[$mi] . ' ' . $m[3] . ', ' . $m[1];
            }
        }
        return $raw !== '' ? $raw : 'Season 2026';
    }
}

if (!function_exists('sp659_format_sr')) {
    function sp659_format_sr($r, $b, $sr = '') {
        if ($sr !== '' && $sr !== null) return (string)$sr;
        $balls = intval($b);
        if ($balls <= 0) return '0.00';
        $val = floor(((floatval($r) / $balls) * 10000.0) + 0.0001) / 100.0;
        return number_format($val, 2, '.', '');
    }
}

if (!function_exists('sp659_format_econ')) {
    function sp659_format_econ($r, $o_str, $econ = '') {
        if ($econ !== '' && $econ !== null) return (string)$econ;
        $balls = sp659_overs_to_balls($o_str);
        if ($balls <= 0) return '0.00';
        return number_format((floatval($r) * 6.0) / $balls, 2, '.', '');
    }
}

if (!function_exists('sp659_ball_tile_class')) {
    function sp659_ball_tile_class($ball_raw) {
        $b = trim((string)$ball_raw);
        if ($b === 'W' || (strpos($b, 'W') !== false && substr($b, -1) !== 'w')) {
            return 'sp-sc-ball-w';
        }
        if ($b === '4' || $b === '6') {
            return 'sp-sc-ball-b';
        }
        return 'sp-sc-ball-n';
    }
}

if (!function_exists('sp659_serialize_overs_timeline')) {
    function sp659_serialize_overs_timeline($overs) {
        if (!is_array($overs) || empty($overs)) return '';
        $chunks = array();
        foreach ($overs as $ov) {
            if (!is_array($ov) || empty($ov['balls']) || !is_array($ov['balls'])) continue;
            $balls_str = implode(' ', $ov['balls']);
            if (!empty($ov['over_label'])) {
                $r_str = isset($ov['runs']) && $ov['runs'] !== '' ? (string)$ov['runs'] : '0';
                $chunks[] = $ov['over_label'] . ':' . $r_str . ': ' . $balls_str;
            } else {
                $chunks[] = $balls_str;
            }
        }
        return implode(' | ', $chunks);
    }
}

if (!function_exists('sp659_parse_overs_timeline')) {
    function sp659_parse_overs_timeline($raw) {
        $str = trim((string)$raw);
        if ($str === '') return array();
        $out = array();
        foreach (explode('|', $str) as $part) {
            $seg = trim($part);
            if ($seg === '') continue;
            if (preg_match('/^([0-9A-Za-z]+)\\s*:\\s*(\\d+)\\s*:\\s*(.+)$/', $seg, $m)) {
                $balls = preg_split('/\\s+/', trim($m[3]));
                $out[] = array(
                    'over_label' => $m[1],
                    'runs'       => intval($m[2]),
                    'balls'      => array_values(array_filter($balls, function($x) { return $x !== ''; }))
                );
            } else {
                $balls = preg_split('/\\s+/', $seg);
                $out[] = array(
                    'balls' => array_values(array_filter($balls, function($x) { return $x !== ''; }))
                );
            }
        }
        return $out;
    }
}

if (!function_exists('sp659_resolve_live_scorecard')) {
    function sp659_resolve_live_scorecard($m, $info) {
        $teams = $info['teams'] ?? array();
        $fmt = (($info['format'] ?? 'T20') === 'ODI') ? 'ODI' : 'T20';
        $max_ov = ($fmt === 'ODI') ? 50 : 20;
        $def_ov_str = $max_ov . '.0';
        $series_code = sp659_derive_series_code($info['name'] ?? 'Nepal Premier League', $info['code'] ?? '');
        $career_heading = $fmt . ' CAREER';

        $t1 = sp659_canonical_team($teams, $m['team1'] ?? '');
        $t2 = sp659_canonical_team($teams, $m['team2'] ?? '');
        $details = isset($m['live_details']) && is_array($m['live_details']) ? $m['live_details'] : array();

        $has_t2_score = trim((string)($m['team2_score'] ?? '')) !== '';
        $batting_side = (!empty($details['batting_team']) && in_array($details['batting_team'], array('team1', 'team2'), true))
            ? $details['batting_team']
            : ($has_t2_score ? 'team2' : 'team1');

        $bat_team_name  = $batting_side === 'team2' ? $t2 : $t1;
        $bowl_team_name = $batting_side === 'team2' ? $t1 : $t2;
        $bat_team_obj   = $teams[$bat_team_name] ?? array();
        $bowl_team_obj  = $teams[$bowl_team_name] ?? array();

        $is_live = !empty($m['live']);
        $out     = sp659_resolve_match_outcome($m);
        $is_completed = (!$is_live && $out['type'] !== 'fixture');
        $status_tag   = $is_live ? 'LIVE' : ($is_completed ? 'RESULT' : 'UPCOMING');

        $active_score = $batting_side === 'team2'
            ? (trim((string)($m['team2_score'] ?? '')) !== '' ? trim((string)$m['team2_score']) : ($is_live ? '0/0' : ''))
            : (trim((string)($m['team1_score'] ?? '')) !== '' ? trim((string)$m['team1_score']) : ($is_live ? '0/0' : ''));

        $raw_overs = $batting_side === 'team2'
            ? (trim((string)($m['team2_overs'] ?? '')) !== '' ? trim((string)$m['team2_overs']) : ($has_t2_score ? $def_ov_str : '0.0'))
            : (trim((string)($m['team1_overs'] ?? '')) !== '' ? trim((string)$m['team1_overs']) : (trim((string)($m['team1_score'] ?? '')) !== '' ? $def_ov_str : '0.0'));

        $first_inn_runs = $batting_side === 'team2' ? sp659_parse_score($m['team1_score'] ?? '') : 0;
        $target = (!empty($details['target']) && intval($details['target']) > 0)
            ? intval($details['target'])
            : (($batting_side === 'team2' && $first_inn_runs > 0) ? ($first_inn_runs + 1) : 0);

        $clean_ov_lbl = $raw_overs !== '' ? ($raw_overs . '/' . $max_ov . ' ov') : ('0.0/' . $max_ov . ' ov');
        $overs_target = $target > 0
            ? '(' . $clean_ov_lbl . ', T:' . $target . ')'
            : ($raw_overs !== '' ? '(' . $clean_ov_lbl . ')' : '');

        if ($is_live) {
            if (!empty($m['live_status']) && trim((string)$m['live_status']) !== '') {
                $status_eq = trim((string)$m['live_status']);
            } elseif ($target > 0) {
                $cur_runs   = sp659_parse_score($active_score);
                $runs_need  = max(0, $target - $cur_runs);
                $balls_left = max(0, ($max_ov * 6) - sp659_overs_to_balls($raw_overs));
                $short_tm   = explode(' ', $bat_team_name)[0] ?: $bat_team_name;
                $status_eq  = $runs_need > 0
                    ? ($short_tm . ' need ' . $runs_need . ' runs in ' . $balls_left . ' balls.')
                    : ($bat_team_name . ' scores level / target reached.');
            } else {
                $status_eq = $bat_team_name . ' elected to bat first at ' . ($m['venue'] ?: ($info['venue'] ?? 'Kirtipur')) . '.';
            }
        } elseif ($is_completed) {
            $status_eq = rtrim(sp659_match_result_label($m), '.') . '.';
        } else {
            $status_eq = 'Match scheduled for ' . sp659_format_long_date($m['date'] ?? '') . (!empty($m['time']) ? ' at ' . $m['time'] . ' NPT' : '') . ' · ' . ($m['venue'] ?: ($info['venue'] ?? 'TU Cricket Ground, Kirtipur')) . '.';
        }

        $batters_in = array();
        if (!empty($details['batters']) && is_array($details['batters'])) {
            foreach ($details['batters'] as $b) {
                if (is_array($b) && !empty($b['name'])) $batters_in[] = $b;
            }
        }
        if (empty($batters_in)) {
            $sq = $bat_team_obj['players'] ?? array();
            $p1 = $sq[0] ?? array('name' => ($bat_team_obj['captain'] ?? ($bat_team_name . ' Batter 1')), 'runs' => 215);
            $p2 = $sq[1] ?? array('name' => ($bat_team_name . ' Batter 2'), 'runs' => 168);
            $tot_r = sp659_parse_score($active_score);
            $b1_r = $tot_r > 0 ? max(8, intval(round($tot_r * 0.34))) : 0;
            $b2_r = $tot_r > 0 ? max(6, intval(round($tot_r * 0.28))) : 0;
            $b1_b = $b1_r > 0 ? max(5, intval(round($b1_r * ($fmt === 'ODI' ? 0.96 : 0.68)))) : 0;
            $b2_b = $b2_r > 0 ? max(5, intval(round($b2_r * ($fmt === 'ODI' ? 1.02 : 0.72)))) : 0;
            $batters_in = array(
                array('name' => $p1['name'], 'hand' => 'rhb', 'striker' => true, 'r' => $b1_r, 'b' => $b1_b, 'fours' => intval(floor($b1_r / 9)), 'sixes' => intval(floor($b1_r / 18)), 'this_bowler' => $b1_b > 0 ? (min($b1_r, 6) . ' (4b)') : '-', 'last_5' => $b1_b > 0 ? (min($b1_r, 8) . ' (5b)') : '-', 'mat' => 44, 'career_runs' => intval($p1['runs'] ?? 180) + 640, 'hs' => $fmt === 'ODI' ? '114*' : '78*', 'ave' => $fmt === 'ODI' ? '38.45' : '26.45'),
                array('name' => $p2['name'], 'hand' => 'lhb', 'striker' => false, 'r' => $b2_r, 'b' => $b2_b, 'fours' => intval(floor($b2_r / 10)), 'sixes' => intval(floor($b2_r / 16)), 'this_bowler' => $b2_b > 0 ? (min($b2_r, 9) . ' (5b)') : '-', 'last_5' => $b2_b > 0 ? (min($b2_r, 4) . ' (3b)') : '-', 'mat' => 30, 'career_runs' => intval($p2['runs'] ?? 140) + 490, 'hs' => $fmt === 'ODI' ? '96' : '64', 'ave' => $fmt === 'ODI' ? '34.10' : '24.10')
            );
        }

        $batters = array();
        foreach (array_slice($batters_in, 0, 2) as $bi => $b) {
            $r_val = intval($b['r'] ?? 0);
            $b_val = intval($b['b'] ?? 0);
            $batters[] = array(
                'name'        => (string)($b['name'] ?? ''),
                'hand'        => (string)($b['hand'] ?? 'rhb'),
                'striker'     => !empty($b['striker']),
                'r'           => $r_val,
                'b'           => $b_val,
                'fours'       => intval($b['fours'] ?? 0),
                'sixes'       => intval($b['sixes'] ?? 0),
                'sr_fmt'      => sp659_format_sr($r_val, $b_val, $b['sr'] ?? ''),
                'this_bowler' => !empty($b['this_bowler']) ? (string)$b['this_bowler'] : '-',
                'last_5'      => !empty($b['last_5']) ? (string)$b['last_5'] : '-',
                'mat'         => isset($b['mat']) && $b['mat'] !== '' ? (string)$b['mat'] : '-',
                'career_runs' => isset($b['career_runs']) && $b['career_runs'] !== '' ? (string)$b['career_runs'] : '-',
                'hs'          => !empty($b['hs']) ? (string)$b['hs'] : '-',
                'ave'         => !empty($b['ave']) ? (string)$b['ave'] : '-'
            );
        }

        $bowlers_in = array();
        if (!empty($details['bowlers']) && is_array($details['bowlers'])) {
            foreach ($details['bowlers'] as $bw) {
                if (is_array($bw) && !empty($bw['name'])) $bowlers_in[] = $bw;
            }
        }
        if (empty($bowlers_in)) {
            $sq = $bowl_team_obj['players'] ?? array();
            $cands = array_values(array_filter($sq, function($p) {
                $rl = strtolower($p['role'] ?? '');
                return strpos($rl, 'bowl') !== false || strpos($rl, 'all') !== false || intval($p['wickets'] ?? 0) > 0;
            }));
            $bw1 = $cands[0] ?? ($sq[2] ?? array('name' => ($bowl_team_name . ' Bowler 1'), 'wickets' => 10));
            $bw2 = $cands[1] ?? ($sq[3] ?? array('name' => ($bowl_team_name . ' Bowler 2'), 'wickets' => 8));
            $wkts_lost = sp659_parse_wickets($active_score);
            $def_sp_ov = $active_score !== '' ? ($fmt === 'ODI' ? '7.0' : '3.0') : '0.0';
            $bowlers_in = array(
                array('name' => $bw1['name'], 'arm' => 'rm', 'o' => $def_sp_ov, 'm' => 0, 'r' => $active_score !== '' ? ($fmt === 'ODI' ? 34 : 21) : 0, 'w' => $wkts_lost > 0 ? min(3, intval(ceil($wkts_lost / 2.0))) : 0, 'dots' => $active_score !== '' ? 9 : 0, 'fours' => $active_score !== '' ? 2 : 0, 'sixes' => 0, 'this_spell' => '-', 'mat' => 38, 'career_wkts' => intval($bw1['wickets'] ?? 8) + 34, 'bbi' => '4/19', 'ave' => '19.80'),
                array('name' => $bw2['name'], 'arm' => 'sla', 'o' => $def_sp_ov, 'm' => 0, 'r' => $active_score !== '' ? ($fmt === 'ODI' ? 38 : 24) : 0, 'w' => $wkts_lost > 1 ? 1 : 0, 'dots' => $active_score !== '' ? 7 : 0, 'fours' => $active_score !== '' ? 2 : 0, 'sixes' => $active_score !== '' ? 1 : 0, 'this_spell' => '-', 'mat' => 27, 'career_wkts' => intval($bw2['wickets'] ?? 6) + 22, 'bbi' => '3/22', 'ave' => '22.40')
            );
        }

        $bowlers = array();
        foreach (array_slice($bowlers_in, 0, 2) as $bw) {
            $r_val = intval($bw['r'] ?? 0);
            $o_val = (string)($bw['o'] ?? '0');
            $bowlers[] = array(
                'name'        => (string)($bw['name'] ?? ''),
                'arm'         => (string)($bw['arm'] ?? 'rm'),
                'o'           => $o_val,
                'm'           => intval($bw['m'] ?? 0),
                'r'           => $r_val,
                'w'           => intval($bw['w'] ?? 0),
                'econ_fmt'    => sp659_format_econ($r_val, $o_val, $bw['econ'] ?? ''),
                'dots'        => intval($bw['dots'] ?? 0),
                'fours'       => intval($bw['fours'] ?? 0),
                'sixes'       => intval($bw['sixes'] ?? 0),
                'this_spell'  => !empty($bw['this_spell']) ? (string)$bw['this_spell'] : '-',
                'mat'         => isset($bw['mat']) && $bw['mat'] !== '' ? (string)$bw['mat'] : '-',
                'career_wkts' => isset($bw['career_wkts']) && $bw['career_wkts'] !== '' ? (string)$bw['career_wkts'] : '-',
                'bbi'         => !empty($bw['bbi']) ? (string)$bw['bbi'] : '-',
                'ave'         => !empty($bw['ave']) ? (string)$bw['ave'] : '-'
            );
        }

        $wkts_now = sp659_parse_wickets($active_score);
        $runs_now = sp659_parse_score($active_score);
        $sq_third = $bat_team_obj['players'][2]['name'] ?? 'Middle-Order Batter';

        $last_bat = (!empty($details['last_bat']))
            ? (string)$details['last_bat']
            : ($wkts_now > 0 ? ($sq_third . ' 14 (11b)') : 'None yet');

        $fow = (!empty($details['fow']))
            ? (string)$details['fow']
            : ($wkts_now > 0 ? (max(12, $runs_now - 22) . '/' . $wkts_now . ' (12.2 Ov)') : '-');

        $recent_overs = (!empty($details['recent_overs']) && is_array($details['recent_overs']))
            ? $details['recent_overs']
            : ($active_score !== '' ? array(
                array('balls' => array('1', '•', '2', '4', '1', '•')),
                array('over_label' => ($max_ov - 1) . 'th', 'runs' => 9, 'balls' => array('1', '4', '1', '1', '2', '•')),
                array('over_label' => ($max_ov - 2) . 'th', 'runs' => 7, 'balls' => array('•', '1', 'W', '2', '4', '•'))
            ) : array());

        $first_inn_summary = ($batting_side === 'team2' && !empty($m['team1_score']))
            ? ('1st Innings: ' . $t1 . ' ' . $m['team1_score'] . (!empty($m['team1_overs']) ? ' (' . $m['team1_overs'] . ' ov)' : ''))
            : '';

        return array(
            'id'                => (string)($m['id'] ?? ''),
            'series_code'       => $series_code,
            'career_heading'    => $career_heading,
            'max_overs'         => $max_ov,
            'match_no'          => !empty($m['match_no']) ? (string)$m['match_no'] : 'League Match',
            'venue'             => !empty($m['venue']) ? (string)$m['venue'] : ($info['venue'] ?? 'Kirtipur'),
            'date_long'         => sp659_format_long_date($m['date'] ?? ''),
            'time'              => (string)($m['time'] ?? ''),
            'status_tag'        => $status_tag,
            'is_live'           => $is_live,
            'is_completed'      => $is_completed,
            'batting_side'      => $batting_side,
            'batting_team'      => $bat_team_name,
            'batting_logo'      => sp659_logo($info, $bat_team_name),
            'active_score'      => $active_score !== '' ? $active_score : (!empty($m['time']) ? (string)$m['time'] : 'TBA'),
            'overs_target'      => $overs_target,
            'status_equation'   => $status_eq,
            'first_inn_summary' => $first_inn_summary,
            'batters'           => $batters,
            'bowlers'           => $bowlers,
            'last_bat'          => $last_bat,
            'fow'               => $fow,
            'recent_overs'      => $recent_overs
        );
    }
}

/* ─────────────────────────────────────────────────────────
   3. POINTS TABLE & OFFICIAL ICC NET RUN RATE ENGINE
   ───────────────────────────────────────────────────────── */
if (!function_exists('sp659_calc_points')) {
    function sp659_calc_points($d, $series_name) {
        $t = array();
        $s = $d['series'][$series_name] ?? array();
        $teams_map = $s['teams'] ?? array();
        $max_ov = (($s['format'] ?? 'T20') === 'ODI') ? 50.0 : 20.0;

        if (!empty($teams_map)) {
            foreach ($teams_map as $tname => $row) {
                $nm = $row['name'] ?? $tname;
                $t[$nm] = array(
                    'name' => $nm,
                    'logo' => sp659_logo($s, $nm),
                    'color' => sp659_team_color($s, $nm),
                    'p' => 0, 'w' => 0, 'l' => 0, 't' => 0, 'nr' => 0, 'pts' => 0,
                    'nrr' => 0.0, 'runs_for' => 0, 'overs_for' => 0.0,
                    'runs_against' => 0, 'overs_against' => 0.0, 'wkts_taken' => 0
                );
            }
        }

        foreach ($d['matches'] as $m) {
            if (!is_array($m)) continue;
            $m_series = !empty($m['series']) ? $m['series'] : SP659_NPL_SERIES;
            if ($m_series !== $series_name) continue;
            if (!empty($m['live'])) continue;

            $t1 = sp659_canonical_team($teams_map, $m['team1'] ?? '');
            $t2 = sp659_canonical_team($teams_map, $m['team2'] ?? '');
            if ($t1 === '' || $t2 === '' || strcasecmp($t1, $t2) === 0) continue;

            $m_norm = $m;
            $m_norm['team1'] = $t1;
            $m_norm['team2'] = $t2;

            $outcome = sp659_resolve_match_outcome($m_norm);
            if ($outcome['type'] === 'fixture') continue;

            if (!isset($t[$t1])) {
                $t[$t1] = array('name' => $t1, 'logo' => sp659_logo($s, $t1), 'color' => sp659_team_color($s, $t1), 'p' => 0, 'w' => 0, 'l' => 0, 't' => 0, 'nr' => 0, 'pts' => 0, 'nrr' => 0.0, 'runs_for' => 0, 'overs_for' => 0.0, 'runs_against' => 0, 'overs_against' => 0, 'wkts_taken' => 0);
            }
            if (!isset($t[$t2])) {
                $t[$t2] = array('name' => $t2, 'logo' => sp659_logo($s, $t2), 'color' => sp659_team_color($s, $t2), 'p' => 0, 'w' => 0, 'l' => 0, 't' => 0, 'nr' => 0, 'pts' => 0, 'nrr' => 0.0, 'runs_for' => 0, 'overs_for' => 0.0, 'runs_against' => 0, 'overs_against' => 0, 'wkts_taken' => 0);
            }

            $t[$t1]['p']++;
            $t[$t2]['p']++;

            if ($outcome['type'] === 'nr') {
                $t[$t1]['nr']++; $t[$t2]['nr']++;
                $t[$t1]['pts'] += 1; $t[$t2]['pts'] += 1;
            } elseif ($outcome['type'] === 'tie') {
                $t[$t1]['t']++; $t[$t2]['t']++;
                $t[$t1]['pts'] += 1; $t[$t2]['pts'] += 1;
            } elseif ($outcome['type'] === 'team1') {
                $t[$t1]['w']++; $t[$t2]['l']++;
                $t[$t1]['pts'] += 2;
            } elseif ($outcome['type'] === 'team2') {
                $t[$t2]['w']++; $t[$t1]['l']++;
                $t[$t2]['pts'] += 2;
            }

            $has_scores = (trim($m['team1_score'] ?? '') !== '' && trim($m['team2_score'] ?? '') !== '');
            if ($has_scores && $outcome['type'] !== 'nr') {
                $r1 = sp659_parse_score($m['team1_score']);
                $w1 = sp659_parse_wickets($m['team1_score']);
                $o1 = sp659_parse_overs($m['team1_overs'] ?? '', $m['team1_score']);
                if ($o1 <= 0) $o1 = $max_ov;
                if ($w1 >= 10 && $o1 < $max_ov) $o1 = $max_ov;

                $r2 = sp659_parse_score($m['team2_score']);
                $w2 = sp659_parse_wickets($m['team2_score']);
                $o2 = sp659_parse_overs($m['team2_overs'] ?? '', $m['team2_score']);
                if ($o2 <= 0) $o2 = $max_ov;
                if ($w2 >= 10 && $o2 < $max_ov) $o2 = $max_ov;

                $t[$t1]['runs_for']      += $r1;
                $t[$t1]['overs_for']     += $o1;
                $t[$t1]['runs_against']  += $r2;
                $t[$t1]['overs_against'] += $o2;
                $t[$t1]['wkts_taken']    += $w2;

                $t[$t2]['runs_for']      += $r2;
                $t[$t2]['overs_for']     += $o2;
                $t[$t2]['runs_against']  += $r1;
                $t[$t2]['overs_against'] += $o1;
                $t[$t2]['wkts_taken']    += $w1;
            }
        }

        foreach ($t as &$row) {
            if ($row['overs_for'] > 0 && $row['overs_against'] > 0) {
                $row['nrr'] = ($row['runs_for'] / $row['overs_for']) - ($row['runs_against'] / $row['overs_against']);
            }
        }
        unset($row);

        usort($t, function ($a, $b) {
            if ($a['pts'] !== $b['pts']) return $b['pts'] - $a['pts'];
            if ($a['w'] !== $b['w'])     return $b['w'] - $a['w'];
            if (abs($a['nrr'] - $b['nrr']) > 0.0001) return ($b['nrr'] > $a['nrr']) ? 1 : -1;
            if ($a['wkts_taken'] !== $b['wkts_taken']) return $b['wkts_taken'] - $a['wkts_taken'];
            return strcasecmp($a['name'], $b['name']);
        });

        return $t;
    }
}

/* ─────────────────────────────────────────────────────────
   4. FACEBOOK PAGE SYNC (ID: 61590852571494) & ADMIN SAVE ENGINE
   ───────────────────────────────────────────────────────── */
if (!function_exists('sp659_get_fb_settings')) {
    function sp659_get_fb_settings() {
        global $wpdb;
        $defaults = array(
            'page_id'          => '61590852571494',
            'page_name'        => '',
            'page_url'         => 'https://www.facebook.com/profile.php?id=61590852571494',
            'access_token'     => '',
            'app_id'           => '',
            'app_secret'       => '',
            'site_hub_url'     => home_url('/'),
            'auto_post_result' => 1,
            'auto_post_table'  => 1,
            'auto_post_news'   => 1,
            'attach_card_png'  => 1,
            'last_post_id'     => '',
            'last_post_time'   => '',
            'last_error'       => ''
        );
        $saved = null;
        if (isset($wpdb) && !empty($wpdb->options)) {
            $raw = $wpdb->get_var($wpdb->prepare(
                "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s ORDER BY option_id DESC LIMIT 1",
                'setopress_npl_fb_settings'
            ));
            if ($raw !== null) {
                $saved = maybe_unserialize($raw);
            }
        }
        if (!is_array($saved)) {
            wp_cache_delete('setopress_npl_fb_settings', 'options');
            $saved = get_option('setopress_npl_fb_settings', array());
        }
        if (!is_array($saved)) $saved = array();
        $merged = array_merge($defaults, $saved);
        if (empty($merged['page_id'])) $merged['page_id'] = '61590852571494';
        $merged['page_url'] = 'https://www.facebook.com/profile.php?id=' . rawurlencode($merged['page_id']);
        return $merged;
    }
}

if (!function_exists('sp659_save_fb_settings')) {
    function sp659_save_fb_settings($fb) {
        global $wpdb;
        if (!is_array($fb)) return false;
        if (empty($fb['page_id'])) $fb['page_id'] = '61590852571494';
        $fb['page_url'] = 'https://www.facebook.com/profile.php?id=' . rawurlencode($fb['page_id']);
        $serialized = maybe_serialize($fb);

        if (isset($wpdb) && !empty($wpdb->options)) {
            $ids = $wpdb->get_col($wpdb->prepare(
                "SELECT option_id FROM {$wpdb->options} WHERE option_name = %s ORDER BY option_id DESC",
                'setopress_npl_fb_settings'
            ));
            if (!empty($ids)) {
                $keep_id = intval($ids[0]);
                if (count($ids) > 1) {
                    $extra = array_map('intval', array_slice($ids, 1));
                    $in_sql = implode(',', $extra);
                    $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_id IN ({$in_sql})");
                }
                $wpdb->update(
                    $wpdb->options,
                    array('option_value' => $serialized, 'autoload' => 'no'),
                    array('option_id' => $keep_id)
                );
            } else {
                $wpdb->insert(
                    $wpdb->options,
                    array('option_name' => 'setopress_npl_fb_settings', 'option_value' => $serialized, 'autoload' => 'no')
                );
            }
        } else {
            update_option('setopress_npl_fb_settings', $fb, false);
        }
        wp_cache_delete('setopress_npl_fb_settings', 'options');
        wp_cache_delete('alloptions', 'options');
        return true;
    }
}

if (!function_exists('sp659_resolve_page_token')) {
    function sp659_resolve_page_token($raw_token, $page_id = '61590852571494', $app_id = '', $app_secret = '') {
        $token = str_replace(array('"', "'"), '', trim((string)$raw_token));
        if ($token === '') {
            return array('token' => '', 'page_id' => $page_id, 'page_name' => '');
        }

        // 1. Optional: Exchange short-lived User Token for 60-day User Token if App ID + Secret provided
        if ($app_id !== '' && $app_secret !== '') {
            $ext_url = add_query_arg(array(
                'grant_type'        => 'fb_exchange_token',
                'client_id'         => $app_id,
                'client_secret'     => $app_secret,
                'fb_exchange_token' => $token
            ), 'https://graph.facebook.com/v21.0/oauth/access_token');
            $ext_resp = wp_remote_get($ext_url, array('timeout' => 15));
            if (!is_wp_error($ext_resp)) {
                $ext_json = json_decode(wp_remote_retrieve_body($ext_resp), true);
                if (!empty($ext_json['access_token'])) {
                    $token = trim($ext_json['access_token']);
                }
            }
        }

        // 2. Auto-detect if user pasted a User Access Token & exchange via /me/accounts for Page 61590852571494
        $page_name = '';
        $acc_url = add_query_arg(array(
            'fields'       => 'id,name,access_token',
            'limit'        => 100,
            'access_token' => $token
        ), 'https://graph.facebook.com/v21.0/me/accounts');
        $acc_resp = wp_remote_get($acc_url, array('timeout' => 15));
        if (!is_wp_error($acc_resp)) {
            $acc_json = json_decode(wp_remote_retrieve_body($acc_resp), true);
            if (!empty($acc_json['data']) && is_array($acc_json['data'])) {
                $chosen = null;
                foreach ($acc_json['data'] as $pg) {
                    if (!empty($pg['id']) && (string)$pg['id'] === (string)$page_id) {
                        $chosen = $pg;
                        break;
                    }
                }
                if (!$chosen && !empty($acc_json['data'][0])) {
                    $chosen = $acc_json['data'][0];
                }
                if ($chosen && !empty($chosen['access_token'])) {
                    $token     = trim($chosen['access_token']);
                    $page_id   = sanitize_text_field($chosen['id']);
                    $page_name = sanitize_text_field($chosen['name'] ?? '');
                }
            }
        }

        // 3. Verify Page Name on Graph API if not yet populated
        if ($page_name === '' && $page_id !== '') {
            $pg_url = add_query_arg(array(
                'fields'       => 'id,name',
                'access_token' => $token
            ), 'https://graph.facebook.com/v21.0/' . rawurlencode($page_id));
            $pg_resp = wp_remote_get($pg_url, array('timeout' => 12));
            if (!is_wp_error($pg_resp)) {
                $pg_json = json_decode(wp_remote_retrieve_body($pg_resp), true);
                if (!empty($pg_json['name'])) {
                    $page_name = sanitize_text_field($pg_json['name']);
                }
            }
        }

        return array('token' => $token, 'page_id' => $page_id, 'page_name' => $page_name);
    }
}

if (!function_exists('sp659_format_fb_result_text')) {
    function sp659_format_fb_result_text($d, $match = null) {
        $sn = ($match && !empty($match['series']) && isset($d['series'][$match['series']]))
            ? $match['series']
            : sp659_active_series_name($d);
        $info   = $d['series'][$sn] ?? array();
        $season = $info['season'] ?? '2026';
        $s_up   = strtoupper($sn);
        $s_code = sp659_derive_series_code($sn, $info['code'] ?? '');
        if (!$match) {
            $completed = array_values(array_filter($d['matches'] ?? array(), function($m) use ($sn) {
                $ms = !empty($m['series']) ? $m['series'] : SP659_NPL_SERIES;
                return is_array($m) && $ms === $sn && empty($m['live']) && sp659_resolve_match_outcome($m)['type'] !== 'fixture';
            }));
            usort($completed, function($a, $b) { return strcmp($b['date'] ?? '', $a['date'] ?? ''); });
            $match = $completed[0] ?? null;
        }
        if (!$match) {
            return "🏏 {$s_up} {$season} — MATCH RESULTS UPDATE\\nStay tuned for official scores and standings!";
        }
        $summary = !empty($match['result_text']) ? $match['result_text'] : sp659_match_result_label($match);
        $s1 = trim(($match['team1_score'] ?? '') . (!empty($match['team1_overs']) ? ' (' . $match['team1_overs'] . ' ov)' : ''));
        $s2 = trim(($match['team2_score'] ?? '') . (!empty($match['team2_overs']) ? ' (' . $match['team2_overs'] . ' ov)' : ''));
        $lines = array(
            "🏏 {$s_up} {$season} — OFFICIAL RESULT",
            ($match['match_no'] ? $match['match_no'] . ' · ' : '') . ($match['venue'] ?? ($info['venue'] ?? 'TU Cricket Ground, Kirtipur')),
            "",
            "🔹 " . $match['team1'] . ($s1 !== '' ? ": {$s1}" : ''),
            "🔸 " . $match['team2'] . ($s2 !== '' ? ": {$s2}" : ''),
            "",
            "🏆 " . $summary,
            "",
            "#{$s_code}{$season} #Cricket #SetoPress"
        );
        return implode("\\n", $lines);
    }
}

if (!function_exists('sp659_format_fb_table_text')) {
    function sp659_format_fb_table_text($d) {
        $sn     = sp659_active_series_name($d);
        $info   = $d['series'][$sn] ?? array();
        $season = $info['season'] ?? '2026';
        $s_up   = strtoupper($sn);
        $s_code = sp659_derive_series_code($sn, $info['code'] ?? '');
        $table  = sp659_calc_points($d, $sn);
        $lines = array(
            "📊 {$s_up} {$season} — OFFICIAL POINTS TABLE",
            "Updated Standings (Top 4 Qualify for Playoffs):",
            ""
        );
        $pos = 1;
        foreach ($table as $r) {
            $nrr = ($r['nrr'] >= 0 ? '+' : '') . number_format((float)$r['nrr'], 3);
            $q = $pos <= 4 ? '🟢' : '⚪';
            $lines[] = "{$q} {$pos}. {$r['name']} — P:{$r['p']} | W:{$r['w']} | L:{$r['l']} | Pts:{$r['pts']} (NRR {$nrr})";
            $pos++;
        }
        $lines[] = "";
        $lines[] = "#{$s_code}{$season} #{$s_code}Standings #SetoPress";
        return implode("\\n", $lines);
    }
}

if (!function_exists('sp659_format_fb_news_text')) {
    function sp659_format_fb_news_text($d, $article = null) {
        $sn = ($article && !empty($article['series']) && isset($d['series'][$article['series']]))
            ? $article['series']
            : sp659_active_series_name($d);
        $info   = $d['series'][$sn] ?? array();
        $season = $info['season'] ?? '2026';
        $s_up   = strtoupper($sn);
        $s_code = sp659_derive_series_code($sn, $info['code'] ?? '');
        if (!$article) {
            $ns = array_values(array_filter($d['news'] ?? array(), function($n) use ($sn) {
                return is_array($n) && (($n['series'] ?? SP659_NPL_SERIES) === $sn);
            }));
            if (empty($ns)) $ns = array_values($d['news'] ?? array());
            usort($ns, function($a, $b) { return strcmp($b['date'] ?? '', $a['date'] ?? ''); });
            $article = $ns[0] ?? null;
        }
        if (!$article) {
            return "📰 {$s_up} {$season} — LATEST NEWS\\nFollow our official page for match reports and squad updates!";
        }
        $cat = strtoupper($article['category'] ?? 'UPDATE');
        $lines = array(
            "📰 {$s_code} {$season} {$cat}: " . ($article['title'] ?? ''),
            ""
        );
        if (!empty($article['excerpt'])) {
            $lines[] = $article['excerpt'];
            $lines[] = "";
        }
        $lines[] = "#{$s_code}{$season} #Cricket #SetoPress";
        return implode("\\n", $lines);
    }
}

if (!function_exists('sp659_render_server_card_png')) {
    function sp659_render_server_card_png($d = null) {
        if (!function_exists('imagecreatetruecolor') || !function_exists('imagepng')) {
            return '';
        }
        if (!is_array($d)) {
            $d = sp659_get_data(true);
        }
        $sn     = sp659_active_series_name($d);
        $info   = $d['series'][$sn] ?? array();
        $season = $info['season'] ?? '2026';
        $s_up   = strtoupper($sn);
        $s_code = sp659_derive_series_code($sn, $info['code'] ?? '');
        $table  = sp659_calc_points($d, $sn);

        $completed = array_values(array_filter($d['matches'] ?? array(), function($m) use ($sn) {
            $ms = !empty($m['series']) ? $m['series'] : SP659_NPL_SERIES;
            return is_array($m) && $ms === $sn && empty($m['live']) && sp659_resolve_match_outcome($m)['type'] !== 'fixture';
        }));
        usort($completed, function($a, $b) { return strcmp($b['date'] ?? '', $a['date'] ?? ''); });
        $latest = $completed[0] ?? null;

        $im = @imagecreatetruecolor(1200, 630);
        if (!$im) return '';

        $navyDark = imagecolorallocate($im, 11, 19, 59);
        $navyCard = imagecolorallocate($im, 24, 35, 108);
        $crimson  = imagecolorallocate($im, 200, 16, 46);
        $white    = imagecolorallocate($im, 255, 255, 255);
        $teal     = imagecolorallocate($im, 94, 234, 212);
        $gold     = imagecolorallocate($im, 253, 230, 138);
        $emerald  = imagecolorallocate($im, 16, 185, 129);
        $slate900 = imagecolorallocate($im, 15, 23, 42);
        $slate600 = imagecolorallocate($im, 71, 85, 105);
        $rowQual  = imagecolorallocate($im, 236, 253, 245);
        $borderLt = imagecolorallocate($im, 226, 232, 240);

        imagefilledrectangle($im, 0, 0, 1200, 630, $navyDark);
        imagefilledrectangle($im, 0, 0, 1200, 10, $crimson);

        imagestring($im, 5, 48, 34, substr($s_up . ' ' . $season . ' - OFFICIAL STANDINGS & RESULTS', 0, 72), $teal);
        $headline = $latest ? (($latest['team1'] ?? '') . ' vs ' . ($latest['team2'] ?? '')) : ($s_code . ' ' . $season . ' Official Hub');
        imagestring($im, 5, 48, 68, substr($headline, 0, 64), $white);

        // Left Card: Latest Match Result
        imagefilledrectangle($im, 48, 118, 528, 574, $navyCard);
        if ($latest) {
            $mno = ($latest['match_no'] ?? 'MATCH RESULT') . ' | ' . ($latest['date'] ?? '');
            imagestring($im, 4, 74, 148, substr($mno, 0, 46), $gold);

            imagestring($im, 5, 74, 204, substr($latest['team1'] ?? '', 0, 32), $white);
            $s1 = ($latest['team1_score'] ?? '-') . (!empty($latest['team1_overs']) ? ' (' . $latest['team1_overs'] . ' ov)' : '');
            imagestring($im, 5, 74, 232, substr($s1, 0, 32), $teal);

            imagestring($im, 4, 74, 278, 'VS', $gold);

            imagestring($im, 5, 74, 318, substr($latest['team2'] ?? '', 0, 32), $white);
            $s2 = ($latest['team2_score'] ?? '-') . (!empty($latest['team2_overs']) ? ' (' . $latest['team2_overs'] . ' ov)' : '');
            imagestring($im, 5, 74, 346, substr($s2, 0, 32), $teal);

            $sum = !empty($latest['result_text']) ? $latest['result_text'] : sp659_match_result_label($latest);
            imagefilledrectangle($im, 74, 412, 502, 468, $emerald);
            imagestring($im, 5, 88, 432, substr($sum, 0, 44), $white);

            imagestring($im, 3, 74, 518, substr($latest['venue'] ?? ($info['venue'] ?? 'TU Cricket Ground, Kirtipur'), 0, 48), $borderLt);
        } else {
            imagestring($im, 5, 74, 240, substr('Official ' . $sn . ' ' . $season . ' Updates', 0, 42), $white);
        }

        // Right Card: Official Points Table
        imagefilledrectangle($im, 556, 118, 1152, 574, $white);
        imagestring($im, 5, 580, 142, 'OFFICIAL POINTS TABLE (TOP 4 PLAYOFFS)', $slate900);
        imagestring($im, 4, 580, 178, '#  TEAM                      P   W   L  PTS     NRR', $slate600);
        imageline($im, 580, 200, 1128, 200, $borderLt);

        $idx = 0;
        foreach (array_slice($table, 0, 8) as $r) {
            $ry = 218 + ($idx * 42);
            if ($idx < 4) {
                imagefilledrectangle($im, 572, $ry - 6, 1136, $ry + 26, $rowQual);
            }
            $nrrStr = (($r['nrr'] >= 0) ? '+' : '') . number_format((float)$r['nrr'], 3);
            $line = sprintf(
                '%-2d %-24s %2d  %2d  %2d  %3d  %7s',
                $idx + 1,
                substr($r['name'], 0, 24),
                intval($r['p']),
                intval($r['w']),
                intval($r['l']),
                intval($r['pts']),
                $nrrStr
            );
            imagestring($im, 4, 582, $ry + 2, $line, $slate900);
            $idx++;
        }

        imagestring($im, 3, 48, 594, 'facebook.com/profile.php?id=61590852571494 | SetoPress Cricket Hub', $borderLt);

        ob_start();
        imagepng($im, null, 6);
        $png_bytes = ob_get_clean();
        imagedestroy($im);
        return is_string($png_bytes) ? $png_bytes : '';
    }
}

if (!function_exists('sp659_publish_to_facebook')) {
    function sp659_publish_to_facebook($message, $link = '', $image_data_url = '') {
        $fb = sp659_get_fb_settings();
        $page_id = preg_replace('/[^0-9a-zA-Z._-]/', '', $fb['page_id'] ?: '61590852571494');
        $token   = trim($fb['access_token'] ?? '');
        if ($token === '') {
            $fb['last_error'] = 'No Meta Page Access Token configured yet.';
            sp659_save_fb_settings($fb);
            return array('ok' => false, 'needs_token' => true, 'error' => $fb['last_error']);
        }

        // Auto-upgrade User Access Token -> Page Access Token if needed
        if (empty($fb['page_name'])) {
            $resolved = sp659_resolve_page_token($token, $page_id, $fb['app_id'] ?? '', $fb['app_secret'] ?? '');
            if (!empty($resolved['token'])) {
                $token              = $resolved['token'];
                $page_id            = $resolved['page_id'] ?: $page_id;
                $fb['access_token'] = $token;
                $fb['page_id']      = $page_id;
                if (!empty($resolved['page_name'])) {
                    $fb['page_name'] = $resolved['page_name'];
                }
            }
        }

        // Resolve binary image: either compact client upload OR 0KB server-side PHP GD 1200x630 PNG
        $img_bin  = '';
        $img_mime = 'image/png';
        $img_ext  = 'png';
        if ($image_data_url !== '' && strpos($image_data_url, 'data:image/png;base64,') === 0) {
            $decoded = base64_decode(substr($image_data_url, strlen('data:image/png;base64,')), true);
            if ($decoded !== false && strlen($decoded) > 64) {
                $img_bin = $decoded;
            }
        } elseif ($image_data_url !== '' && strpos($image_data_url, 'data:image/jpeg;base64,') === 0) {
            $decoded = base64_decode(substr($image_data_url, strlen('data:image/jpeg;base64,')), true);
            if ($decoded !== false && strlen($decoded) > 64) {
                $img_bin  = $decoded;
                $img_mime = 'image/jpeg';
                $img_ext  = 'jpg';
            }
        } elseif (!empty($fb['attach_card_png'])) {
            $img_bin = sp659_render_server_card_png(sp659_get_data(true));
        }

        if ($img_bin !== '' && strlen($img_bin) > 64) {
            $boundary = '----SetoPressNPLBoundary' . wp_generate_password(12, false, false);
            $caption_full = $message . ($link !== '' ? "\\n\\n🔗 " . esc_url_raw($link) : '');
            $crlf = "\\r\\n";
            $mp = '';
            $mp .= '--' . $boundary . $crlf . 'Content-Disposition: form-data; name="caption"' . $crlf . $crlf . $caption_full . $crlf;
            $mp .= '--' . $boundary . $crlf . 'Content-Disposition: form-data; name="access_token"' . $crlf . $crlf . $token . $crlf;
            $mp .= '--' . $boundary . $crlf . 'Content-Disposition: form-data; name="source"; filename="npl-standings.' . $img_ext . '"' . $crlf . 'Content-Type: ' . $img_mime . $crlf . $crlf . $img_bin . $crlf;
            $mp .= '--' . $boundary . '--' . $crlf;

            $photo_resp = wp_remote_post('https://graph.facebook.com/v21.0/' . rawurlencode($page_id) . '/photos', array(
                'timeout' => 25,
                'headers' => array('Content-Type' => 'multipart/form-data; boundary=' . $boundary),
                'body'    => $mp
            ));
            if (!is_wp_error($photo_resp)) {
                $pjson = json_decode(wp_remote_retrieve_body($photo_resp), true);
                if (!empty($pjson['post_id']) || !empty($pjson['id'])) {
                    $fb['last_post_id']   = sanitize_text_field($pjson['post_id'] ?? $pjson['id']);
                    $fb['last_post_time'] = current_time('mysql');
                    $fb['last_error']     = '';
                    sp659_save_fb_settings($fb);
                    return array('ok' => true, 'id' => $fb['last_post_id'], 'page_id' => $page_id);
                }
            }
        }

        $body = array(
            'message'      => $message,
            'access_token' => $token
        );
        if ($link !== '') {
            $body['link'] = esc_url_raw($link);
        }
        $resp = wp_remote_post('https://graph.facebook.com/v21.0/' . rawurlencode($page_id) . '/feed', array(
            'timeout' => 20,
            'body'    => $body
        ));
        if (is_wp_error($resp)) {
            $fb['last_error'] = $resp->get_error_message();
            sp659_save_fb_settings($fb);
            return array('ok' => false, 'error' => $fb['last_error']);
        }
        $json = json_decode(wp_remote_retrieve_body($resp), true);
        if (!empty($json['id'])) {
            $fb['last_post_id']   = sanitize_text_field($json['id']);
            $fb['last_post_time'] = current_time('mysql');
            $fb['last_error']     = '';
            sp659_save_fb_settings($fb);
            return array('ok' => true, 'id' => $fb['last_post_id'], 'page_id' => $page_id);
        }
        $err = $json['error']['message'] ?? ('HTTP ' . wp_remote_retrieve_response_code($resp));
        $fb['last_error'] = sanitize_text_field($err);
        sp659_save_fb_settings($fb);
        return array('ok' => false, 'error' => $fb['last_error']);
    }
}

if (!function_exists('sp659_upsert_match_record')) {
    function sp659_upsert_match_record(&$d, $raw) {
        $mid = sanitize_text_field($raw['match_id'] ?? '');
        $existing = ($mid !== '' && isset($d['matches'][$mid]) && is_array($d['matches'][$mid])) ? $d['matches'][$mid] : array();
        $req_sr = sanitize_text_field($raw['match_series'] ?? ($existing['series'] ?? ''));
        $sn = ($req_sr !== '' && isset($d['series'][$req_sr])) ? $req_sr : sp659_active_series_name($d);
        $info_sr = $d['series'][$sn] ?? array();
        $teams = $info_sr['teams'] ?? array();
        $def_ov = (($info_sr['format'] ?? 'T20') === 'ODI') ? '50.0' : '20.0';

        $t1  = sp659_canonical_team($teams, sanitize_text_field($raw['team1'] ?? ''));
        $t2  = sp659_canonical_team($teams, sanitize_text_field($raw['team2'] ?? ''));
        $dt  = sanitize_text_field($raw['match_date'] ?? date('Y-m-d'));

        if (!$dt || !$t1 || !$t2 || strcasecmp($t1, $t2) === 0) {
            return array('ok' => false, 'code' => 'err_same_team');
        }

        $id = !empty($existing['id']) ? $existing['id'] : (($mid !== '') ? $mid : ('npl_m_' . time() . '_' . wp_rand(100, 999)));

        $s1 = sanitize_text_field($raw['team1_score'] ?? '');
        $s2 = sanitize_text_field($raw['team2_score'] ?? '');
        $o1 = sanitize_text_field($raw['team1_overs'] ?? '');
        $o2 = sanitize_text_field($raw['team2_overs'] ?? '');
        $w_raw = sanitize_text_field($raw['winner'] ?? '');
        $res_txt = sanitize_text_field($raw['result_text'] ?? '');
        $status_mode = sanitize_key($raw['match_status'] ?? '');

        if ($status_mode === 'live') {
            $is_live = 1;
        } elseif ($status_mode === 'completed' || $status_mode === 'fixture') {
            $is_live = 0;
        } else {
            $is_live = !empty($raw['match_live']) ? 1 : 0;
        }

        // Entering a winner or result summary always finalizes the match (clears Live trap)
        if ($w_raw !== '' || $res_txt !== '') {
            $is_live = 0;
        }

        if ($status_mode === 'fixture' && $w_raw === '' && $res_txt === '' && $s1 === '' && $s2 === '') {
            $is_live = 0;
        }

        if (!$is_live && $o1 === '' && $s1 !== '') $o1 = $def_ov;
        if (!$is_live && $o2 === '' && $s2 !== '') $o2 = $def_ov;

        $live_details = $existing['live_details'] ?? null;
        if (!empty($raw['live_details_present']) && ($is_live || !empty($raw['live_bat1_name']))) {
            $striker_idx = intval($raw['live_striker'] ?? 1);
            $batters_saved = array();
            for ($bi = 1; $bi <= 2; $bi++) {
                $bn = sanitize_text_field($raw["live_bat{$bi}_name"] ?? '');
                if ($bn === '') continue;
                $batters_saved[] = array(
                    'name'        => $bn,
                    'hand'        => sanitize_text_field($raw["live_bat{$bi}_hand"] ?? 'rhb'),
                    'striker'     => ($striker_idx === $bi),
                    'r'           => intval($raw["live_bat{$bi}_r"] ?? 0),
                    'b'           => intval($raw["live_bat{$bi}_b"] ?? 0),
                    'fours'       => intval($raw["live_bat{$bi}_4s"] ?? 0),
                    'sixes'       => intval($raw["live_bat{$bi}_6s"] ?? 0),
                    'this_bowler' => sanitize_text_field($raw["live_bat{$bi}_this_bowler"] ?? '-'),
                    'last_5'      => sanitize_text_field($raw["live_bat{$bi}_last5"] ?? '-'),
                    'mat'         => sanitize_text_field($raw["live_bat{$bi}_mat"] ?? ''),
                    'career_runs' => sanitize_text_field($raw["live_bat{$bi}_cruns"] ?? ''),
                    'hs'          => sanitize_text_field($raw["live_bat{$bi}_hs"] ?? '-'),
                    'ave'         => sanitize_text_field($raw["live_bat{$bi}_ave"] ?? '-')
                );
            }
            $bowlers_saved = array();
            for ($wi = 1; $wi <= 2; $wi++) {
                $wn = sanitize_text_field($raw["live_bowl{$wi}_name"] ?? '');
                if ($wn === '') continue;
                $bowlers_saved[] = array(
                    'name'        => $wn,
                    'arm'         => sanitize_text_field($raw["live_bowl{$wi}_arm"] ?? 'rm'),
                    'o'           => sanitize_text_field($raw["live_bowl{$wi}_o"] ?? '0.0'),
                    'm'           => intval($raw["live_bowl{$wi}_m"] ?? 0),
                    'r'           => intval($raw["live_bowl{$wi}_r"] ?? 0),
                    'w'           => intval($raw["live_bowl{$wi}_w"] ?? 0),
                    'dots'        => intval($raw["live_bowl{$wi}_0s"] ?? 0),
                    'fours'       => intval($raw["live_bowl{$wi}_4s"] ?? 0),
                    'sixes'       => intval($raw["live_bowl{$wi}_6s"] ?? 0),
                    'this_spell'  => '-',
                    'mat'         => sanitize_text_field($raw["live_bowl{$wi}_mat"] ?? ''),
                    'career_wkts' => sanitize_text_field($raw["live_bowl{$wi}_cwkts"] ?? ''),
                    'bbi'         => sanitize_text_field($raw["live_bowl{$wi}_bbi"] ?? '-'),
                    'ave'         => sanitize_text_field($raw["live_bowl{$wi}_ave"] ?? '-')
                );
            }
            $parsed_ov = sp659_parse_overs_timeline($raw['live_overs_timeline'] ?? '');
            $live_details = array(
                'batting_team' => in_array(($raw['live_batting_team'] ?? ''), array('team1', 'team2'), true) ? $raw['live_batting_team'] : 'team2',
                'target'       => intval($raw['live_target'] ?? 0),
                'batters'      => $batters_saved,
                'bowlers'      => $bowlers_saved,
                'last_bat'     => sanitize_text_field($raw['live_last_bat'] ?? ''),
                'fow'          => sanitize_text_field($raw['live_fow'] ?? ''),
                'recent_overs' => $parsed_ov
            );
        }

        $match_data = array(
            'id'           => $id,
            'series'       => $sn,
            'match_no'     => sanitize_text_field($raw['match_no'] ?? ($existing['match_no'] ?? '')),
            'date'         => $dt,
            'time'         => sanitize_text_field($raw['match_time'] ?? ($existing['time'] ?? '12:15')),
            'venue'        => sanitize_text_field($raw['match_venue'] ?? ($existing['venue'] ?? ($info_sr['venue'] ?? 'TU Cricket Ground, Kirtipur'))),
            'team1'        => $t1,
            'team2'        => $t2,
            'team1_score'  => $s1,
            'team2_score'  => $s2,
            'team1_overs'  => $o1,
            'team2_overs'  => $o2,
            'winner'       => $w_raw,
            'result_text'  => $res_txt,
            'live'         => $is_live,
            'live_status'  => $is_live ? sanitize_text_field($raw['match_live_status'] ?? '') : '',
            'live_details' => $live_details
        );

        if (!$is_live) {
            $out = sp659_resolve_match_outcome($match_data);
            if ($match_data['winner'] === '' && $out['type'] !== 'fixture') {
                $match_data['winner'] = $out['winner'];
            }
            if ($match_data['result_text'] === '' && $out['type'] !== 'fixture') {
                $match_data['result_text'] = sp659_match_result_label($match_data);
            }
        }

        $d['matches'][$id] = $match_data;
        sp659_save_data($d);

        $fb_posted = false;
        $fb = sp659_get_fb_settings();
        if (!$is_live && sp659_resolve_match_outcome($match_data)['type'] !== 'fixture' && !empty($fb['access_token']) && !empty($fb['auto_post_result'])) {
            $msg = sp659_format_fb_result_text($d, $match_data);
            if (!empty($fb['auto_post_table'])) {
                $msg .= "\\n\\n" . sp659_format_fb_table_text($d);
            }
            $res = sp659_publish_to_facebook($msg, $fb['site_hub_url'] ?? '');
            $fb_posted = !empty($res['ok']);
        }

        return array(
            'ok'        => true,
            'code'      => $is_live ? 'match_saved_live' : ($fb_posted ? 'match_saved_fb' : 'match_saved'),
            'match'     => $match_data,
            'fb_posted' => $fb_posted
        );
    }
}

if (!function_exists('sp659_upsert_news_record')) {
    function sp659_upsert_news_record(&$d, $raw) {
        $nid      = sanitize_text_field($raw['news_id'] ?? '');
        $existing = ($nid !== '' && isset($d['news'][$nid]) && is_array($d['news'][$nid])) ? $d['news'][$nid] : array();
        $req_sr   = sanitize_text_field($raw['news_series'] ?? ($existing['series'] ?? ''));
        $n_series = ($req_sr !== '' && isset($d['series'][$req_sr])) ? $req_sr : sp659_active_series_name($d);
        $title    = sanitize_text_field($raw['news_title'] ?? '');
        $category = sanitize_text_field($raw['news_category'] ?? 'match');
        $date     = sanitize_text_field($raw['news_date'] ?? date('Y-m-d'));
        $time     = sanitize_text_field($raw['news_time'] ?? '12:00');
        $author   = sanitize_text_field($raw['news_author'] ?? 'SetoPress Cricket Desk');
        $excerpt  = sanitize_textarea_field($raw['news_excerpt'] ?? '');
        $content  = sanitize_textarea_field($raw['news_content'] ?? '');
        $quote    = sanitize_textarea_field($raw['news_quote'] ?? '');
        $image    = sp659_sanitize_media_field($raw['news_image'] ?? '');

        if ($title === '' || $date === '') {
            return array('ok' => false, 'code' => 'err_news_title');
        }
        if ($excerpt === '' && $content !== '') {
            $parts = preg_split('/\\R\\s*\\R/', $content);
            $excerpt = wp_trim_words($parts[0] ?? $content, 34);
        }
        $id = ($nid !== '' && isset($d['news'][$nid])) ? $nid : ('npl_n_' . time() . '_' . wp_rand(100, 999));
        $article = array(
            'id'       => $id,
            'series'   => $n_series,
            'title'    => $title,
            'category' => $category,
            'date'     => $date,
            'time'     => $time,
            'author'   => $author !== '' ? $author : 'SetoPress Cricket Desk',
            'excerpt'  => $excerpt,
            'content'  => $content,
            'quote'    => $quote,
            'image'    => $image,
            'team1'    => sanitize_text_field($raw['news_team1'] ?? ''),
            'team2'    => sanitize_text_field($raw['news_team2'] ?? ''),
        );
        $d['news'][$id] = $article;
        sp659_save_data($d);

        $fb = sp659_get_fb_settings();
        $msg_code = 'news_saved';
        if (!empty($fb['access_token']) && !empty($fb['auto_post_news'])) {
            $pub = sp659_publish_to_facebook(sp659_format_fb_news_text($d, $article), $fb['site_hub_url'] ?? '');
            if (!empty($pub['ok'])) $msg_code = 'news_saved_fb';
        }
        return array('ok' => true, 'code' => $msg_code, 'article' => $article);
    }
}

if (!function_exists('sp659_ajax_admin_save')) {
    function sp659_ajax_admin_save() {
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permission denied.'), 403);
        }
        check_ajax_referer('sp659_admin_ajax', 'nonce');
        $b64 = sanitize_text_field(wp_unslash($_POST['payload_b64'] ?? ''));
        $json = base64_decode(strtr($b64, '-_', '+/'), true);
        $payload = is_string($json) ? json_decode($json, true) : null;
        if (!is_array($payload)) {
            wp_send_json_error(array('message' => 'Invalid payload.'));
        }

        $d = sp659_get_data(true);
        if (!isset($d['series'][SP659_NPL_SERIES])) {
            sp659_load_defaults(false);
            $d = sp659_get_data(true);
        }

        $op = sanitize_key($payload['op'] ?? 'save_match');
        if ($op === 'save_match' || $op === 'quick_result') {
            $res = sp659_upsert_match_record($d, $payload);
            if (empty($res['ok'])) {
                wp_send_json_error(array('message' => 'Please select a valid date and two different franchises (Team 1 and Team 2 cannot be the same).'));
            }
            wp_send_json_success(array(
                'code'    => $res['code'],
                'redirect'=> add_query_arg(array('page' => 'setopress-npl', 'tab' => 'matches', 'sp659_msg' => $res['code']), admin_url('admin.php'))
            ));
        }

        if ($op === 'save_news') {
            $res = sp659_upsert_news_record($d, $payload);
            if (empty($res['ok'])) {
                wp_send_json_error(array('message' => 'Please enter a valid article headline and publication date.'));
            }
            wp_send_json_success(array(
                'code'    => $res['code'],
                'redirect'=> add_query_arg(array('page' => 'setopress-npl', 'tab' => 'news', 'sp659_msg' => $res['code']), admin_url('admin.php'))
            ));
        }

        if ($op === 'fb_save_settings' || $op === 'fb_save_and_publish' || $op === 'fb_publish') {
            $fb = sp659_get_fb_settings();
            if (isset($payload['fb_page_id'])) {
                $fb['page_id'] = sanitize_text_field($payload['fb_page_id']) ?: '61590852571494';
            }
            if (isset($payload['fb_site_hub_url'])) {
                $fb['site_hub_url'] = esc_url_raw($payload['fb_site_hub_url']) ?: home_url('/');
            }
            if (isset($payload['fb_app_id'])) {
                $fb['app_id'] = trim(sanitize_text_field($payload['fb_app_id']));
            }
            if (isset($payload['fb_app_secret'])) {
                $fb['app_secret'] = trim(sanitize_text_field($payload['fb_app_secret']));
            }
            if (!empty($payload['fb_settings_present'])) {
                $fb['auto_post_result'] = !empty($payload['fb_auto_result']) ? 1 : 0;
                $fb['auto_post_table']  = !empty($payload['fb_auto_table']) ? 1 : 0;
                $fb['auto_post_news']   = !empty($payload['fb_auto_news']) ? 1 : 0;
                $fb['attach_card_png']  = !empty($payload['fb_attach_card_png']) ? 1 : 0;
            }
            if (isset($payload['fb_access_token'])) {
                $incoming_tok = str_replace(array('"', "'", ' '), '', trim((string)$payload['fb_access_token']));
                if ($incoming_tok !== '') {
                    $resolved = sp659_resolve_page_token($incoming_tok, $fb['page_id'], $fb['app_id'], $fb['app_secret']);
                    $fb['access_token'] = $resolved['token'] ?: $incoming_tok;
                    $fb['page_id']      = $resolved['page_id'] ?: $fb['page_id'];
                    if (!empty($resolved['page_name'])) {
                        $fb['page_name'] = $resolved['page_name'];
                    }
                    $fb['last_error'] = '';
                } elseif ($op === 'fb_save_settings') {
                    $fb['access_token'] = '';
                    $fb['page_name']    = '';
                }
            }
            sp659_save_fb_settings($fb);

            if ($op === 'fb_save_settings') {
                $has_tok = !empty($fb['access_token']);
                wp_send_json_success(array(
                    'connected' => $has_tok,
                    'page_id'   => $fb['page_id'],
                    'page_name' => $fb['page_name'] ?? '',
                    'token'     => $fb['access_token'],
                    'message'   => $has_tok
                        ? ('Connected & saved to MySQL! Page: ' . (!empty($fb['page_name']) ? ($fb['page_name'] . ' (' . $fb['page_id'] . ')') : $fb['page_id']))
                        : ('Facebook Page (' . $fb['page_id'] . ') settings saved to MySQL (Instant Browser Mode active).')
                ));
            }

            $kind = sanitize_key($payload['kind'] ?? 'combined');
            $custom = isset($payload['message']) ? sanitize_textarea_field($payload['message']) : '';
            if ($custom === '') {
                if ($kind === 'result') $custom = sp659_format_fb_result_text($d);
                elseif ($kind === 'table') $custom = sp659_format_fb_table_text($d);
                elseif ($kind === 'news') $custom = sp659_format_fb_news_text($d);
                else $custom = sp659_format_fb_result_text($d) . "\\n\\n" . sp659_format_fb_table_text($d);
            }
            $pub = sp659_publish_to_facebook($custom, $fb['site_hub_url'] ?? '');
            if (!empty($pub['ok'])) {
                wp_send_json_success(array(
                    'post_id'  => $pub['id'],
                    'page_id'  => $pub['page_id'] ?? $fb['page_id'],
                    'page_url' => 'https://www.facebook.com/profile.php?id=' . rawurlencode($pub['page_id'] ?? $fb['page_id']),
                    'message'  => 'Published live via Meta Graph API to Facebook Page (' . ($pub['page_id'] ?? $fb['page_id']) . ')! Post ID: ' . $pub['id']
                ));
            }
            wp_send_json_error(array(
                'needs_token' => !empty($pub['needs_token']),
                'message'     => $pub['error'] ?? 'Facebook Graph API error.'
            ));
        }

        wp_send_json_error(array('message' => 'Unknown action.'));
    }
}
add_action('wp_ajax_sp659_admin_save', 'sp659_ajax_admin_save');

if (!function_exists('sp659_boot')) {
    function sp659_boot() {
        $d = sp659_get_data(false);
        $sig = sp659_studio_seed_sig();
        if (empty($d['series']) || !isset($d['series'][SP659_NPL_SERIES]) || ($d['seed_sig'] ?? '') !== $sig || get_option('sp659_npl_ver') !== $sig) {
            sp659_load_defaults(true);
            update_option('sp659_npl_ver', $sig, false);
        }
    }
}
add_action('init', 'sp659_boot', 5);

if (!function_exists('sp659_notexturize_shortcodes')) {
    function sp659_notexturize_shortcodes($shortcodes) {
        if (!is_array($shortcodes)) $shortcodes = array();
        $shortcodes[] = 'setopress_npl';
        $shortcodes[] = 'setopress_npl_news';
        return array_values(array_unique($shortcodes));
    }
}
add_filter('no_texturize_shortcodes', 'sp659_notexturize_shortcodes', 999);

if (!function_exists('sp659_register_shortcodes')) {
    function sp659_register_shortcodes() {
        remove_shortcode('setopress_npl');
        remove_shortcode('setopress_npl_news');
        add_shortcode('setopress_npl', 'sp659_shortcode');
        add_shortcode('setopress_npl_news', 'sp659_news_shortcode');
    }
}
add_action('init', 'sp659_register_shortcodes', 999);

if (!function_exists('sp659_admin_assets')) {
    function sp659_admin_assets($hook) {
        if (strpos((string)$hook, 'setopress-npl') === false) return;
        wp_enqueue_media();
        wp_enqueue_script('jquery');
    }
}
add_action('admin_enqueue_scripts', 'sp659_admin_assets');

if (!function_exists('sp659_admin_menu')) {
    function sp659_admin_menu() {
        remove_menu_page('setopress-npl');
        remove_all_actions('toplevel_page_setopress-npl');
        add_menu_page('NPL Manager', 'NPL Manager', 'manage_options', 'setopress-npl', 'sp659_admin_page', 'dashicons-awards', 26);
    }
}
add_action('admin_menu', 'sp659_admin_menu', 999);

if (!function_exists('sp659_process_admin_actions')) {
    function sp659_process_admin_actions() {
        if (!is_admin() || !isset($_GET['page']) || $_GET['page'] !== 'setopress-npl') return;
        if (!current_user_can('manage_options')) return;
        if (!empty($GLOBALS['sp659_actions_processed'])) return;

        $has_action = isset($_POST['npl_load_demo_data'])
            || isset($_POST['npl_switch_series'])
            || isset($_GET['switch_series'])
            || isset($_POST['npl_create_series'])
            || isset($_POST['npl_save_series_meta'])
            || isset($_GET['del_series'])
            || isset($_POST['npl_add_team'])
            || isset($_POST['npl_save_match'])
            || isset($_POST['npl_quick_result_save'])
            || !empty($_POST['npl_form_op'])
            || isset($_POST['npl_save_teams'])
            || isset($_POST['npl_save_news'])
            || isset($_POST['npl_save_fb_settings'])
            || isset($_POST['npl_fb_post_now'])
            || isset($_POST['npl_fb_start_oauth'])
            || isset($_GET['fb_oauth_cb'])
            || isset($_GET['del_match'])
            || isset($_GET['finish_match'])
            || isset($_GET['go_live'])
            || isset($_GET['del_news']);

        if (!$has_action) return;
        $GLOBALS['sp659_actions_processed'] = true;

        $d = sp659_get_data(true);
        if (empty($d['series']) || !isset($d['series'][SP659_NPL_SERIES])) {
            sp659_load_defaults(false);
            $d = sp659_get_data(true);
        }
        $sn = sp659_active_series_name($d);
        $info  = $d['series'][$sn] ?? array();
        $teams = $info['teams'] ?? array();
        $redirect_tab = 'matches';
        $msg_code = '';

        // 0A. Switch Active Series (POST Dropdown or GET Directory Link)
        if (isset($_POST['npl_switch_series']) && check_admin_referer('npl_switch_series_nonce')) {
            $sw_sr = sanitize_text_field(wp_unslash($_POST['active_series_select'] ?? ''));
            if ($sw_sr !== '' && isset($d['series'][$sw_sr])) {
                $d['active_series'] = $sw_sr;
                sp659_save_data($d);
                $sn = $sw_sr;
                $msg_code = 'series_switched';
            }
            $ret = sanitize_key(wp_unslash($_POST['return_tab'] ?? 'matches'));
            $redirect_tab = in_array($ret, array('series', 'matches', 'teams', 'news', 'facebook', 'shortcodes'), true) ? $ret : 'matches';
        }

        if (isset($_GET['switch_series'])) {
            $sw_sr = sanitize_text_field(wp_unslash($_GET['switch_series']));
            if (check_admin_referer('npl_sw_sr_' . $sw_sr) && isset($d['series'][$sw_sr])) {
                $d['active_series'] = $sw_sr;
                sp659_save_data($d);
                $sn = $sw_sr;
                $msg_code = 'series_switched';
            }
            $redirect_tab = isset($_GET['tab']) ? sanitize_key(wp_unslash($_GET['tab'])) : 'series';
        }

        // 0B. Create New Tournament Series (e.g. Cricket World Cup, Asia Cup, Domestic League)
        if (isset($_POST['npl_create_series']) && check_admin_referer('npl_series_mgmt_nonce')) {
            $new_name = trim(sanitize_text_field(wp_unslash($_POST['new_series_name'] ?? '')));
            if ($new_name !== '') {
                $fmt = (sanitize_text_field(wp_unslash($_POST['new_series_format'] ?? 'T20')) === 'ODI') ? 'ODI' : 'T20';
                $code = sp659_derive_series_code($new_name, sanitize_text_field(wp_unslash($_POST['new_series_code'] ?? '')));
                $season = sanitize_text_field(wp_unslash($_POST['new_series_season'] ?? '2026')) ?: '2026';
                $cat = sanitize_text_field(wp_unslash($_POST['new_series_category'] ?? ($fmt === 'ODI' ? 'International 50-Over Tournament' : 'T20 Cricket Series')));
                $ven = sanitize_text_field(wp_unslash($_POST['new_series_venue'] ?? 'International Cricket Stadium')) ?: 'International Cricket Stadium';
                $lg  = sp659_sanitize_media_field(wp_unslash($_POST['new_series_logo'] ?? ''));
                $csv = sanitize_text_field(wp_unslash($_POST['new_series_teams_csv'] ?? ''));
                $parsed_names = array_values(array_filter(array_map('trim', explode(',', $csv))));
                if (count($parsed_names) < 2) {
                    $parsed_names = array('Team Alpha', 'Team Bravo', 'Team Chargers', 'Team Royals');
                }
                $palette = array('#035fb2', '#0f766e', '#b91c1c', '#1e3a8a', '#6d28d9', '#b45309', '#047857', '#be123c');
                $new_teams = array();
                foreach ($parsed_names as $ti => $tn) {
                    $sc = sp659_derive_series_code($tn, '');
                    $new_teams[$tn] = array(
                        'name'        => $tn,
                        'shortCode'   => substr($sc, 0, 3),
                        'logo'        => '',
                        'color'       => $palette[$ti % count($palette)],
                        'captain'     => $tn . ' Captain',
                        'coach'       => 'Head Coach',
                        'owner'       => $new_name,
                        'venue'       => $ven,
                        'titles'      => '',
                        'description' => 'Official squad competing in ' . $new_name . '.',
                        'players'     => array(
                            array('name' => $tn . ' Opener', 'role' => 'Captain', 'runs' => 0, 'wickets' => 0, 'photo' => ''),
                            array('name' => $tn . ' Strike Bowler', 'role' => 'Bowler', 'runs' => 0, 'wickets' => 0, 'photo' => '')
                        )
                    );
                }
                $d['series'][$new_name] = array(
                    'name'      => $new_name,
                    'code'      => $code,
                    'format'    => $fmt,
                    'max_overs' => $fmt === 'ODI' ? 50 : 20,
                    'season'    => $season,
                    'category'  => $cat,
                    'venue'     => $ven,
                    'logo'      => $lg,
                    'teams'     => $new_teams
                );
                $d['active_series'] = $new_name;
                $t_keys = array_keys($new_teams);
                $fx_id = 'sr_m_' . time() . '_' . wp_rand(100, 999);
                $d['matches'][$fx_id] = array(
                    'id'           => $fx_id,
                    'series'       => $new_name,
                    'match_no'     => '1st Match',
                    'date'         => date('Y-m-d'),
                    'time'         => '13:00',
                    'venue'        => $ven,
                    'team1'        => $t_keys[0],
                    'team2'        => $t_keys[1],
                    'team1_score'  => '',
                    'team1_overs'  => '',
                    'team2_score'  => '',
                    'team2_overs'  => '',
                    'winner'       => '',
                    'result_text'  => '',
                    'live'         => 0,
                    'live_status'  => '',
                    'live_details' => null
                );
                sp659_save_data($d);
                $msg_code = 'series_created';
            }
            $redirect_tab = 'series';
        }

        // 0C. Update Active Series Metadata & Logo
        if (isset($_POST['npl_save_series_meta']) && check_admin_referer('npl_series_mgmt_nonce')) {
            $fmt = (sanitize_text_field(wp_unslash($_POST['meta_series_format'] ?? ($info['format'] ?? 'T20'))) === 'ODI') ? 'ODI' : 'T20';
            $info['code']      = sp659_derive_series_code($sn, sanitize_text_field(wp_unslash($_POST['meta_series_code'] ?? ($info['code'] ?? ''))));
            $info['format']    = $fmt;
            $info['max_overs'] = $fmt === 'ODI' ? 50 : 20;
            $info['season']    = sanitize_text_field(wp_unslash($_POST['meta_series_season'] ?? '2026')) ?: '2026';
            $info['category']  = sanitize_text_field(wp_unslash($_POST['meta_series_category'] ?? 'Cricket Tournament'));
            $info['venue']     = sanitize_text_field(wp_unslash($_POST['meta_series_venue'] ?? 'TU Cricket Ground, Kirtipur'));
            $info['logo']      = sp659_sanitize_media_field(wp_unslash($_POST['meta_series_logo'] ?? ''));
            $d['series'][$sn]  = $info;
            sp659_save_data($d);
            $msg_code = 'series_saved';
            $redirect_tab = 'series';
        }

        // 0D. Delete Tournament Series (When > 1 Series Exists)
        if (isset($_GET['del_series'])) {
            $del_sr = sanitize_text_field(wp_unslash($_GET['del_series']));
            if (check_admin_referer('npl_del_sr_' . $del_sr) && count($d['series']) > 1 && isset($d['series'][$del_sr])) {
                unset($d['series'][$del_sr]);
                foreach ($d['matches'] as $mk => $mv) {
                    if (($mv['series'] ?? SP659_NPL_SERIES) === $del_sr) {
                        unset($d['matches'][$mk]);
                    }
                }
                $d['active_series'] = sp659_active_series_name($d);
                sp659_save_data($d);
                $msg_code = 'series_deleted';
            }
            $redirect_tab = 'series';
        }

        // 0E. Add New Team to Active Series
        if (isset($_POST['npl_add_team']) && check_admin_referer('npl_add_team_nonce')) {
            $nt_name = trim(sanitize_text_field(wp_unslash($_POST['new_team_name'] ?? '')));
            if ($nt_name !== '' && !isset($teams[$nt_name])) {
                $nt_short = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', sanitize_text_field(wp_unslash($_POST['new_team_short'] ?? ''))));
                if ($nt_short === '') $nt_short = substr(sp659_derive_series_code($nt_name, ''), 0, 3);
                $nt_cap = sanitize_text_field(wp_unslash($_POST['new_team_captain'] ?? 'TBA')) ?: 'TBA';
                $nt_col = sanitize_text_field(wp_unslash($_POST['new_team_color'] ?? '#035fb2')) ?: '#035fb2';
                $teams[$nt_name] = array(
                    'name'        => $nt_name,
                    'shortCode'   => substr($nt_short, 0, 4),
                    'logo'        => '',
                    'color'       => $nt_col,
                    'captain'     => $nt_cap,
                    'coach'       => 'TBA',
                    'owner'       => $sn,
                    'venue'       => $info['venue'] ?? 'TBA',
                    'titles'      => '',
                    'description' => 'Official squad competing in ' . $sn . '.',
                    'players'     => array(
                        array('name' => $nt_cap !== 'TBA' ? $nt_cap : ($nt_name . ' Captain'), 'role' => 'Captain', 'runs' => 0, 'wickets' => 0, 'photo' => '')
                    )
                );
                $info['teams'] = $teams;
                $d['series'][$sn] = $info;
                sp659_save_data($d);
                $msg_code = 'team_added';
            }
            $redirect_tab = 'teams';
        }

        // 1. Load Sample Data
        if (isset($_POST['npl_load_demo_data']) && check_admin_referer('npl_demo_nonce')) {
            sp659_load_defaults(true);
            $msg_code = 'demo_loaded';
            $redirect_tab = 'matches';
        }

        // 2. Save or Update Match (Main Form, Inline Quick Result Form, or Programmatic Submit Fallback)
        $form_op = sanitize_key(wp_unslash($_POST['npl_form_op'] ?? ''));
        if ((isset($_POST['npl_save_match']) || isset($_POST['npl_quick_result_save']) || $form_op === 'save_match' || $form_op === 'quick_result') && check_admin_referer('npl_match_nonce')) {
            $unslashed = wp_unslash($_POST);
            if (!empty($unslashed['payload_b64'])) {
                $decoded_b64 = base64_decode(strtr(sanitize_text_field($unslashed['payload_b64']), '-_', '+/'), true);
                $decoded_arr = is_string($decoded_b64) ? json_decode($decoded_b64, true) : null;
                if (is_array($decoded_arr)) {
                    $unslashed = array_merge($unslashed, $decoded_arr);
                }
            }
            $res = sp659_upsert_match_record($d, $unslashed);
            $msg_code = $res['code'];
            $redirect_tab = 'matches';
        }

        // 3. 1-Click Finish Live Match
        if (isset($_GET['finish_match'])) {
            $fmid = sanitize_text_field(wp_unslash($_GET['finish_match']));
            if (check_admin_referer('npl_fin_match_' . $fmid) && isset($d['matches'][$fmid])) {
                $m = $d['matches'][$fmid];
                $m['live'] = 0;
                $out = sp659_resolve_match_outcome($m);
                if (empty($m['winner']) && $out['type'] !== 'fixture') {
                    $m['winner'] = $out['winner'];
                }
                if (empty($m['result_text']) && $out['type'] !== 'fixture') {
                    $m['result_text'] = sp659_match_result_label($m);
                }
                $d['matches'][$fmid] = $m;
                sp659_save_data($d);
                $msg_code = 'match_finished';
            }
            $redirect_tab = 'matches';
        }

        // 3B. 1-Click Go Live on Upcoming Fixture
        if (isset($_GET['go_live'])) {
            $glid = sanitize_text_field(wp_unslash($_GET['go_live']));
            if (check_admin_referer('npl_golive_match_' . $glid) && isset($d['matches'][$glid])) {
                $m = $d['matches'][$glid];
                $m['live'] = 1;
                $m['winner'] = '';
                $m['result_text'] = '';
                if (empty($m['team1_score'])) $m['team1_score'] = '0/0';
                if (empty($m['team1_overs'])) $m['team1_overs'] = '0.0';
                if (empty($m['live_status'])) {
                    $m['live_status'] = 'Match underway at ' . (!empty($m['venue']) ? $m['venue'] : ($info['venue'] ?? 'TU Cricket Ground, Kirtipur'));
                }
                $d['matches'][$glid] = $m;
                sp659_save_data($d);
                $msg_code = 'match_saved_live';
            }
            $redirect_tab = 'matches';
        }

        // 4. Delete Match
        if (isset($_GET['del_match'])) {
            $del_mid = sanitize_text_field(wp_unslash($_GET['del_match']));
            if (check_admin_referer('npl_del_match_' . $del_mid)) {
                unset($d['matches'][$del_mid]);
                sp659_save_data($d);
                $msg_code = 'match_deleted';
            }
            $redirect_tab = 'matches';
        }

        // 5. Save Teams & Squads
        if (isset($_POST['npl_save_teams']) && check_admin_referer('npl_teams_nonce')) {
            $team_keys = array_keys($teams);
            foreach ($teams as $tname => &$t) {
                $idx = array_search($tname, $team_keys, true);
                if ($idx !== false) {
                    $decoded = null;
                    if (!empty($_POST['team_players_b64'][$idx])) {
                        $b64_raw = sanitize_text_field(wp_unslash($_POST['team_players_b64'][$idx]));
                        $json_str = base64_decode(strtr($b64_raw, '-_', '+/'), true);
                        if ($json_str !== false) {
                            $decoded = json_decode($json_str, true);
                        }
                    } elseif (isset($_POST['team_players_json'][$idx])) {
                        $decoded = json_decode(wp_unslash($_POST['team_players_json'][$idx]), true);
                    }
                    if (is_array($decoded)) {
                        $t['players'] = array_values(array_filter(array_map(function($p) {
                            $pn = sanitize_text_field($p['name'] ?? '');
                            if ($pn === '') return null;
                            return array(
                                'name'    => $pn,
                                'role'    => sanitize_text_field($p['role'] ?? 'Batsman'),
                                'runs'    => intval($p['runs'] ?? 0),
                                'wickets' => intval($p['wickets'] ?? 0),
                                'photo'   => esc_url_raw($p['photo'] ?? '')
                            );
                        }, $decoded)));
                    }
                    if (isset($_POST['team_captain'][$idx])) $t['captain'] = sanitize_text_field(wp_unslash($_POST['team_captain'][$idx]));
                    if (isset($_POST['team_coach'][$idx]))   $t['coach']   = sanitize_text_field(wp_unslash($_POST['team_coach'][$idx]));
                    if (isset($_POST['team_owner'][$idx]))   $t['owner']   = sanitize_text_field(wp_unslash($_POST['team_owner'][$idx]));
                    if (isset($_POST['team_venue'][$idx]))   $t['venue']   = sanitize_text_field(wp_unslash($_POST['team_venue'][$idx]));
                    if (isset($_POST['team_logo'][$idx]))    $t['logo']    = sp659_sanitize_media_field(wp_unslash($_POST['team_logo'][$idx]));
                    if (isset($_POST['team_color'][$idx]))   $t['color']   = sanitize_text_field(wp_unslash($_POST['team_color'][$idx]));
                }
            }
            unset($t);
            if (isset($_POST['series_logo']))   $info['logo']   = sp659_sanitize_media_field(wp_unslash($_POST['series_logo']));
            if (isset($_POST['series_season'])) $info['season'] = sanitize_text_field(wp_unslash($_POST['series_season']));
            $info['teams'] = $teams;
            $d['series'][$sn] = $info;
            sp659_save_data($d);
            $msg_code = 'teams_saved';
            $redirect_tab = 'teams';
        }

        // 6. Save Editorial News (+ Auto-post to Facebook Page 61590852571494 if enabled)
        if ((isset($_POST['npl_save_news']) || $form_op === 'save_news') && check_admin_referer('npl_news_nonce')) {
            $unslashed_news = wp_unslash($_POST);
            if (!empty($unslashed_news['payload_b64'])) {
                $decoded_nb64 = base64_decode(strtr(sanitize_text_field($unslashed_news['payload_b64']), '-_', '+/'), true);
                $decoded_narr = is_string($decoded_nb64) ? json_decode($decoded_nb64, true) : null;
                if (is_array($decoded_narr)) {
                    $unslashed_news = array_merge($unslashed_news, $decoded_narr);
                }
            }
            $nres = sp659_upsert_news_record($d, $unslashed_news);
            if (!empty($nres['ok'])) {
                $msg_code = $nres['code'];
            }
            $redirect_tab = 'news';
        }

        // 7. Delete News
        if (isset($_GET['del_news'])) {
            $del_nid = sanitize_text_field(wp_unslash($_GET['del_news']));
            if (check_admin_referer('npl_del_news_' . $del_nid)) {
                unset($d['news'][$del_nid]);
                sp659_save_data($d);
                $msg_code = 'news_deleted';
            }
            $redirect_tab = 'news';
        }

        // 8. Unified Facebook Settings Save / OAuth Start / Publish Now (61590852571494)
        if ((isset($_POST['npl_save_fb_settings']) || isset($_POST['npl_fb_post_now']) || isset($_POST['npl_fb_start_oauth'])) && check_admin_referer('npl_fb_nonce')) {
            $fb = sp659_get_fb_settings();
            if (isset($_POST['fb_page_id'])) {
                $fb['page_id'] = sanitize_text_field(wp_unslash($_POST['fb_page_id'])) ?: '61590852571494';
            }
            if (isset($_POST['fb_site_hub_url'])) {
                $fb['site_hub_url'] = esc_url_raw(wp_unslash($_POST['fb_site_hub_url'])) ?: home_url('/');
            }
            if (isset($_POST['fb_app_id'])) {
                $fb['app_id'] = trim(sanitize_text_field(wp_unslash($_POST['fb_app_id'])));
            }
            if (isset($_POST['fb_app_secret'])) {
                $fb['app_secret'] = trim(sanitize_text_field(wp_unslash($_POST['fb_app_secret'])));
            }
            if (isset($_POST['fb_settings_present'])) {
                $fb['auto_post_result'] = !empty($_POST['fb_auto_result']) ? 1 : 0;
                $fb['auto_post_table']  = !empty($_POST['fb_auto_table']) ? 1 : 0;
                $fb['auto_post_news']   = !empty($_POST['fb_auto_news']) ? 1 : 0;
                $fb['attach_card_png']  = !empty($_POST['fb_attach_card_png']) ? 1 : 0;
            }
            if (isset($_POST['fb_access_token'])) {
                $incoming_tok = trim(sanitize_text_field(wp_unslash($_POST['fb_access_token'])));
                if ($incoming_tok !== '') {
                    $resolved = sp659_resolve_page_token($incoming_tok, $fb['page_id'], $fb['app_id'], $fb['app_secret']);
                    $fb['access_token'] = $resolved['token'] ?: $incoming_tok;
                    $fb['page_id']      = $resolved['page_id'] ?: $fb['page_id'];
                    if (!empty($resolved['page_name'])) {
                        $fb['page_name'] = $resolved['page_name'];
                    }
                    $fb['last_error'] = '';
                } elseif (isset($_POST['npl_save_fb_settings'])) {
                    // Explicit clear when saving settings with blank token
                    $fb['access_token'] = '';
                    $fb['page_name']    = '';
                }
            }
            sp659_save_fb_settings($fb);
            $redirect_tab = 'facebook';

            if (isset($_POST['npl_fb_start_oauth'])) {
                if (empty($fb['app_id']) || empty($fb['app_secret'])) {
                    $fb['last_error'] = 'Enter both Meta App ID and Meta App Secret to use 1-Click Facebook OAuth Login (or paste a Page Access Token directly).';
                    sp659_save_fb_settings($fb);
                    $msg_code = 'fb_posted_err';
                } else {
                    $cb_url = admin_url('admin.php?page=setopress-npl&tab=facebook&fb_oauth_cb=1');
                    $oauth_url = add_query_arg(array(
                        'client_id'     => $fb['app_id'],
                        'redirect_uri'  => $cb_url,
                        'scope'         => 'pages_manage_posts,pages_read_engagement,pages_show_list',
                        'response_type' => 'code',
                        'state'         => wp_create_nonce('sp659_fb_oauth_state')
                    ), 'https://www.facebook.com/v21.0/dialog/oauth');
                    if (!headers_sent()) {
                        wp_redirect($oauth_url);
                        exit;
                    }
                }
            } elseif (isset($_POST['npl_fb_post_now'])) {
                $post_text = sanitize_textarea_field(wp_unslash($_POST['fb_custom_message'] ?? ''));
                if ($post_text === '') {
                    $post_text = sp659_format_fb_result_text($d) . "\\n\\n" . sp659_format_fb_table_text($d);
                }
                $card_png = !empty($fb['attach_card_png']) ? trim(wp_unslash($_POST['fb_card_png_data'] ?? '')) : '';
                $pub = sp659_publish_to_facebook($post_text, $fb['site_hub_url'] ?? '', $card_png);
                $msg_code = !empty($pub['ok']) ? 'fb_posted_ok' : (empty($fb['access_token']) ? 'fb_token_guide' : 'fb_posted_err');
            } else {
                $msg_code = 'fb_saved';
            }
        }

        // 9. Handle Meta OAuth Callback Inside WordPress Admin
        if (isset($_GET['fb_oauth_cb'])) {
            $fb = sp659_get_fb_settings();
            $redirect_tab = 'facebook';
            $code = isset($_GET['code']) ? sanitize_text_field(wp_unslash($_GET['code'])) : '';
            if ($code !== '' && !empty($fb['app_id']) && !empty($fb['app_secret'])) {
                $cb_url = admin_url('admin.php?page=setopress-npl&tab=facebook&fb_oauth_cb=1');
                $tok_url = add_query_arg(array(
                    'client_id'     => $fb['app_id'],
                    'redirect_uri'  => $cb_url,
                    'client_secret' => $fb['app_secret'],
                    'code'          => $code
                ), 'https://graph.facebook.com/v21.0/oauth/access_token');
                $tok_resp = wp_remote_get($tok_url, array('timeout' => 15));
                if (!is_wp_error($tok_resp)) {
                    $tok_json = json_decode(wp_remote_retrieve_body($tok_resp), true);
                    if (!empty($tok_json['access_token'])) {
                        $resolved = sp659_resolve_page_token($tok_json['access_token'], $fb['page_id'], $fb['app_id'], $fb['app_secret']);
                        $fb['access_token'] = $resolved['token'] ?: $tok_json['access_token'];
                        $fb['page_id']      = $resolved['page_id'] ?: $fb['page_id'];
                        $fb['page_name']    = $resolved['page_name'] ?? '';
                        $fb['last_error']   = '';
                        sp659_save_fb_settings($fb);
                        $msg_code = 'fb_oauth_ok';
                    } else {
                        $fb['last_error'] = sanitize_text_field($tok_json['error']['message'] ?? 'Facebook OAuth code exchange failed.');
                        sp659_save_fb_settings($fb);
                        $msg_code = 'fb_posted_err';
                    }
                } else {
                    $fb['last_error'] = $tok_resp->get_error_message();
                    sp659_save_fb_settings($fb);
                    $msg_code = 'fb_posted_err';
                }
            } else {
                $fb['last_error'] = sanitize_text_field(wp_unslash($_GET['error_description'] ?? 'Facebook OAuth authorization cancelled or missing App Secret.'));
                sp659_save_fb_settings($fb);
                $msg_code = 'fb_posted_err';
            }
        }

        $GLOBALS['sp659_flash_msg'] = $msg_code;
        $GLOBALS['sp659_flash_tab'] = $redirect_tab;

        if ($msg_code !== '' && !headers_sent()) {
            $clean_url = add_query_arg(
                array('page' => 'setopress-npl', 'tab' => $redirect_tab, 'sp659_msg' => $msg_code),
                admin_url('admin.php')
            );
            wp_safe_redirect($clean_url);
            exit;
        }
    }
}
add_action('admin_init', 'sp659_process_admin_actions', 20);

/* ─────────────────────────────────────────────────────────
   5. WORDPRESS ADMIN DASHBOARD (WITH LIVE TABLE VERIFIER)
   ───────────────────────────────────────────────────────── */
if (!function_exists('sp659_admin_page')) {
    function sp659_admin_page() {
        if (!current_user_can('manage_options')) return;
        sp659_process_admin_actions();

        $d = sp659_get_data(true);
        if (empty($d['series']) || !isset($d['series'][SP659_NPL_SERIES])) {
            sp659_load_defaults(false);
            $d = sp659_get_data(true);
        }

        $all_matches = $d['matches'] ?? array();
        $edit_match  = isset($_GET['edit_match']) ? sanitize_text_field(wp_unslash($_GET['edit_match'])) : '';
        if ($edit_match !== '' && isset($all_matches[$edit_match]['series']) && isset($d['series'][$all_matches[$edit_match]['series']])) {
            $d['active_series'] = $all_matches[$edit_match]['series'];
        }

        $sn           = sp659_active_series_name($d);
        $series_list  = $d['series'];
        $series_count = count($series_list);
        $info         = $series_list[$sn];
        $info_fmt     = (($info['format'] ?? 'T20') === 'ODI') ? 'ODI' : 'T20';
        $def_ov_str   = $info_fmt === 'ODI' ? '50.0' : '20.0';
        $teams        = $info['teams'] ?? array();
        $matches      = array();
        foreach ($all_matches as $mk => $mv) {
            if (is_array($mv) && (($mv['series'] ?? SP659_NPL_SERIES) === $sn)) {
                $matches[$mk] = $mv;
            }
        }
        $news         = $d['news'] ?? array();
        $table        = sp659_calc_points($d, $sn);

        $fb = sp659_get_fb_settings();
        $active_tab = isset($_GET['tab']) ? sanitize_key($_GET['tab']) : ($GLOBALS['sp659_flash_tab'] ?? 'matches');
        if (isset($_GET['edit_match'])) $active_tab = 'matches';
        if (isset($_GET['edit_news']))  $active_tab = 'news';
        if (!in_array($active_tab, array('series', 'matches', 'teams', 'news', 'facebook', 'shortcodes'), true)) $active_tab = 'matches';

        $msg_code = isset($_GET['sp659_msg']) ? sanitize_key($_GET['sp659_msg']) : ($GLOBALS['sp659_flash_msg'] ?? '');
        $messages = array(
            'demo_loaded'      => array('ok', 'Synced 1:1 with SetoPress NPL Studio App! All ' . $series_count . ' Series, Matches, Live Scores, Squads & Editorial News saved to MySQL and caches purged.'),
            'series_switched'  => array('ok', 'Switched active tournament to "' . $sn . '" (' . $info_fmt . ' · ' . ($info_fmt === 'ODI' ? '50' : '20') . ' Overs).'),
            'series_created'   => array('ok', 'New tournament series "' . $sn . '" created and activated! Add teams, fixtures, or live scorecards below.'),
            'series_saved'     => array('ok', 'Series settings and branding saved for "' . $sn . '"!'),
            'series_deleted'   => array('ok', 'Tournament series deleted. Now managing "' . $sn . '".'),
            'team_added'       => array('ok', 'New team added to "' . $sn . '"! Select it below to manage its squad.'),
            'match_saved'      => array('ok', 'Match result saved directly to MySQL for ' . $sn . '! Points Table, Net Run Rate, and Results updated immediately.'),
            'match_saved_fb'   => array('ok', 'Match result saved to MySQL AND published to Facebook Page (61590852571494)!'),
            'match_saved_live' => array('warn', 'Live Match saved in ' . $sn . '! Click "Enter Result" or "Finish & Save" below when the game ends to count it in Points Table & Results.'),
            'match_finished'   => array('ok', 'Match marked Completed and added to ' . $sn . ' Points Table & Results!'),
            'match_deleted'    => array('ok', 'Match deleted and ' . $sn . ' Points Table recalculated.'),
            'teams_saved'      => array('ok', 'Teams, Squads & Player Runs/Wickets saved for ' . $sn . '! Leaders updated.'),
            'news_saved'       => array('ok', 'News article published and caches cleared.'),
            'news_saved_fb'    => array('ok', 'News article published on website AND shared to Facebook Page (61590852571494)!'),
            'news_deleted'     => array('ok', 'News article removed.'),
            'fb_saved'         => array('ok', 'Facebook Page (' . $fb['page_id'] . ') settings saved directly to MySQL!' . (!empty($fb['access_token']) ? ' Page Access Token verified & ready.' : '')),
            'fb_oauth_ok'      => array('ok', 'Facebook Page (' . ($fb['page_name'] ? $fb['page_name'] . ' · ' : '') . $fb['page_id'] . ') connected via Meta OAuth! Ready to auto-publish.'),
            'fb_posted_ok'     => array('ok', 'Successfully published update to Facebook Page https://www.facebook.com/profile.php?id=' . $fb['page_id'] . '!'),
            'fb_token_guide'   => array('ok', 'Instant Browser Publish Ready for Page ' . $fb['page_id'] . '! Click "Publish to Facebook Page — Copy + HD Card" below to copy your post, download the 1200x630 Standings Card, and open your Facebook Page (or add an optional Meta Token in Step B for background auto-posting).'),
            'fb_posted_err'    => array('err', 'Facebook Graph API Error: ' . ($fb['last_error'] ?: 'Verify Page Access Token has pages_manage_posts & pages_read_engagement permissions.')),
            'err_same_team'    => array('err', 'Error: Please choose a valid Date and two different teams (Team 1 and Team 2 cannot be identical).'),
        );

        $total_matches = count($matches);
        $total_players = 0;
        foreach ($teams as $t) { $total_players += count($t['players'] ?? array()); }
        $total_news = count($news);

        $admin_live_matches = array_values(array_filter($matches, function($m) { return is_array($m) && !empty($m['live']); }));
        $admin_upcoming_fixtures = array_values(array_filter($matches, function($m) {
            return is_array($m) && empty($m['live']) && sp659_resolve_match_outcome($m)['type'] === 'fixture';
        }));
        usort($admin_upcoming_fixtures, function($a, $b) {
            $cmp = strcmp($a['date'] ?? '', $b['date'] ?? '');
            return $cmp !== 0 ? $cmp : strcmp($a['time'] ?? '', $b['time'] ?? '');
        });

        $em = ($edit_match && isset($matches[$edit_match])) ? $matches[$edit_match] : array();
        $em_outcome = !empty($em) ? sp659_resolve_match_outcome($em) : array('type' => 'fixture');
        $em_status = !empty($em)
            ? (!empty($em['live']) ? 'live' : ($em_outcome['type'] !== 'fixture' ? 'completed' : 'fixture'))
            : 'completed';

        $edit_news = isset($_GET['edit_news']) ? sanitize_text_field(wp_unslash($_GET['edit_news'])) : '';
        $en = ($edit_news && isset($news[$edit_news])) ? $news[$edit_news] : array();

        $team_names_list = array_keys($teams);
        $default_t1 = $em['team1'] ?? ($team_names_list[0] ?? '');
        $default_t2 = $em['team2'] ?? ($team_names_list[1] ?? ($team_names_list[0] ?? ''));
        $clean_action_url = admin_url('admin.php?page=setopress-npl');
        $ajax_save_nonce  = wp_create_nonce('sp659_admin_ajax');
        $active_sr_logo_raw = sp659_series_logo($info);
        $active_sr_wide     = sp659_is_wide_logo($active_sr_logo_raw);
        ?>
        <div class="npl-admin-wrap" data-ajax="<?php echo esc_url(admin_url('admin-ajax.php')); ?>" data-nonce="<?php echo esc_attr($ajax_save_nonce); ?>">
            <div class="npl-admin-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                    <span style="display:inline-flex;align-items:center;justify-content:center;background:#ffffff;border-radius:10px;padding:6px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.18);">
                        <img src="<?php echo sp659_esc_img('builtin:npl_logo'); ?>" alt="Nepal Premier League" style="height:36px;width:auto;max-width:136px;object-fit:contain;display:block;">
                    </span>
                    <div>
                        <h1>SetoPress Cricket &amp; NPL Manager (v<?php echo esc_html(SP659_VERSION); ?>)</h1>
                        <p>Multi-Series Tournament Suite (<?php echo (int)$series_count; ?> Series) · Direct MySQL Persistence · Facebook Page Sync (ID: 61590852571494)</p>
                    </div>
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <a href="https://www.facebook.com/profile.php?id=61590852571494" target="_blank" rel="noopener noreferrer" class="npl-btn" style="background:#1877F2;color:#ffffff;">Open Facebook Page ↗</a>
                    <form method="post" action="<?php echo esc_url($clean_action_url); ?>" style="margin:0;">
                        <?php wp_nonce_field('npl_demo_nonce'); ?>
                        <button type="submit" name="npl_load_demo_data" class="npl-btn" style="background:white;color:#0d1542;" onclick="return confirm('Mirror all tournament series, matches, live scores, squads, and editorial news from your SetoPress Studio export?');">Sync 1:1 with SetoPress Studio</button>
                    </form>
                </div>
            </div>

            <!-- ACTIVE SERIES SWITCHER BAR (MULTI-SERIES ADMIN CONTROL) -->
            <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:12px;padding:14px 20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;">
                <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;flex:1;min-width:260px;">
                    <span style="display:inline-flex;align-items:center;justify-content:center;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:<?php echo $active_sr_wide ? '4px 10px' : '4px'; ?>;height:40px;">
                        <img src="<?php echo sp659_esc_img($active_sr_logo_raw); ?>" alt="<?php echo esc_attr($sn); ?>" style="<?php echo $active_sr_wide ? 'height:28px;width:auto;max-width:110px;object-fit:contain;' : 'width:30px;height:30px;object-fit:contain;border-radius:50%;'; ?>">
                    </span>
                    <form method="post" action="<?php echo esc_url($clean_action_url); ?>" style="margin:0;display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex:1;">
                        <?php wp_nonce_field('npl_switch_series_nonce'); ?>
                        <input type="hidden" name="npl_switch_series" value="1">
                        <input type="hidden" name="return_tab" id="npl-switch-return-tab" value="<?php echo esc_attr($active_tab); ?>">
                        <label style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#475569;white-space:nowrap;">Active Series (<?php echo (int)$series_count; ?>):</label>
                        <select name="active_series_select" class="npl-form-input" style="max-width:390px;font-weight:700;" onchange="this.form.submit()">
                            <?php $s_idx = 1; foreach ($series_list as $sr_key => $sr_val) :
                                $sr_fmt = (($sr_val['format'] ?? 'T20') === 'ODI') ? 'ODI' : 'T20';
                                $sr_tc  = count($sr_val['teams'] ?? array());
                            ?>
                            <option value="<?php echo esc_attr($sr_key); ?>" <?php selected($sn, $sr_key); ?>><?php echo esc_html(sprintf('%02d. %s (%s · %d Teams)', $s_idx, $sr_key, $sr_fmt, $sr_tc)); ?></option>
                            <?php $s_idx++; endforeach; ?>
                        </select>
                    </form>
                </div>
                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                    <span style="font-size:12px;color:#475569;font-family:monospace;">
                        <strong><?php echo esc_html(sp659_derive_series_code($sn, $info['code'] ?? '')); ?></strong>
                        · <?php echo esc_html($info_fmt . ' (' . ($info_fmt === 'ODI' ? '50' : '20') . ' ov)'); ?>
                        · <?php echo esc_html($info['season'] ?? '2026'); ?>
                    </span>
                    <button type="button" class="npl-btn npl-btn-secondary npl-jump-series-tab" style="padding:8px 14px;font-size:12px;">Manage / + Add Series (<?php echo (int)$series_count; ?>)</button>
                </div>
            </div>

            <?php if ($msg_code && isset($messages[$msg_code])) :
                $m_type = $messages[$msg_code][0];
                $bg = $m_type === 'err' ? '#fef2f2' : ($m_type === 'warn' ? '#fffbeb' : '#ecfdf5');
                $bd = $m_type === 'err' ? '#fca5a5' : ($m_type === 'warn' ? '#fcd34d' : '#6ee7b7');
                $tx = $m_type === 'err' ? '#991b1b' : ($m_type === 'warn' ? '#92400e' : '#065f46');
            ?>
            <div style="background:<?php echo esc_attr($bg); ?>;border:1px solid <?php echo esc_attr($bd); ?>;color:<?php echo esc_attr($tx); ?>;padding:14px 18px;border-radius:10px;margin-bottom:20px;font-weight:700;font-size:13px;">
                <?php echo esc_html($messages[$msg_code][1]); ?>
            </div>
            <?php endif; ?>

            <div class="npl-stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(155px,1fr));">
                <div class="npl-stat-card"><div class="npl-stat-value" style="color:#035fb2;"><?php echo (int)$series_count; ?></div><div class="npl-stat-label">Tournament Series</div></div>
                <div class="npl-stat-card"><div class="npl-stat-value" style="color:<?php echo !empty($admin_live_matches) ? '#e11d48' : '#1a237e'; ?>;"><?php echo count($admin_live_matches); ?></div><div class="npl-stat-label">Live in Series</div></div>
                <div class="npl-stat-card"><div class="npl-stat-value"><?php echo count($admin_upcoming_fixtures); ?></div><div class="npl-stat-label">Upcoming Fixtures</div></div>
                <div class="npl-stat-card"><div class="npl-stat-value"><?php echo (int)$total_matches; ?></div><div class="npl-stat-label">Series Matches</div></div>
                <div class="npl-stat-card"><div class="npl-stat-value"><?php echo count($teams); ?></div><div class="npl-stat-label">Series Teams</div></div>
                <div class="npl-stat-card"><div class="npl-stat-value"><?php echo (int)$total_news; ?></div><div class="npl-stat-label">News Dispatches</div></div>
            </div>

            <!-- LIVE MATCH DESK & UPCOMING FIXTURES ADMIN DASHBOARD -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px;margin-bottom:22px;">
                <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:12px;padding:18px 20px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:10px;margin-bottom:12px;border-bottom:1px solid #f1f5f9;">
                        <strong style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:<?php echo !empty($admin_live_matches) ? '#be123c' : '#334155'; ?>;">
                            <?php echo !empty($admin_live_matches) ? '● Live Match Desk (' . count($admin_live_matches) . ') · ' . esc_html($sn) : 'Live Match Desk (0) · ' . esc_html($sn); ?>
                        </strong>
                        <a href="#npl-match-form" style="font-size:12px;font-weight:700;color:#c8102e;text-decoration:none;">+ Start Live Match</a>
                    </div>
                    <?php if (!empty($admin_live_matches)) : foreach ($admin_live_matches as $li => $lm) : ?>
                    <div style="padding:<?php echo $li > 0 ? '12px 0 0' : '0'; ?>;<?php echo $li > 0 ? 'margin-top:12px;border-top:1px solid #f1f5f9;' : ''; ?>">
                        <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:6px;">
                            <span><?php echo esc_html(($lm['match_no'] ? $lm['match_no'] . ' · ' : '') . ($lm['venue'] ?? '')); ?></span>
                            <span style="font-family:monospace;"><?php echo esc_html($lm['date'] . (!empty($lm['time']) ? ' · ' . $lm['time'] : '')); ?></span>
                        </div>
                        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                            <div>
                                <div style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:4px;">
                                    <img src="<?php echo sp659_esc_img(sp659_logo($info, $lm['team1'])); ?>" alt="" style="width:22px;height:22px;object-fit:contain;border-radius:50%;">
                                    <strong style="color:#0f172a;"><?php echo esc_html($lm['team1']); ?></strong>
                                    <span style="font-family:monospace;font-weight:700;color:#0f172a;"><?php echo esc_html(($lm['team1_score'] ?: '0/0') . (!empty($lm['team1_overs']) ? ' (' . $lm['team1_overs'] . ')' : '')); ?></span>
                                </div>
                                <div style="display:flex;align-items:center;gap:8px;font-size:13px;">
                                    <img src="<?php echo sp659_esc_img(sp659_logo($info, $lm['team2'])); ?>" alt="" style="width:22px;height:22px;object-fit:contain;border-radius:50%;">
                                    <strong style="color:#0f172a;"><?php echo esc_html($lm['team2']); ?></strong>
                                    <span style="font-family:monospace;font-weight:700;color:#1a237e;"><?php echo esc_html(($lm['team2_score'] ?: 'Yet to bat') . (!empty($lm['team2_overs']) ? ' (' . $lm['team2_overs'] . ')' : '')); ?></span>
                                </div>
                            </div>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                <a class="npl-btn npl-btn-secondary" href="<?php echo esc_url(admin_url('admin.php?page=setopress-npl&edit_match=' . rawurlencode($lm['id']))); ?>" style="padding:6px 10px;font-size:12px;">Update Score</a>
                                <a class="npl-btn" href="<?php echo esc_url(wp_nonce_url(admin_url('admin.php?page=setopress-npl&finish_match=' . rawurlencode($lm['id'])), 'npl_fin_match_' . $lm['id'])); ?>" style="padding:6px 10px;font-size:12px;background:#059669;">Finish &amp; Save</a>
                            </div>
                        </div>
                        <?php if (!empty($lm['live_status'])) : ?>
                        <div style="margin-top:6px;font-size:12px;font-weight:600;color:#be123c;"><?php echo esc_html($lm['live_status']); ?></div>
                        <?php endif; ?>
                    </div>
                    <?php endforeach; else : ?>
                    <div style="padding:18px 0;text-align:center;font-size:12px;color:#64748b;">No match is currently live in <?php echo esc_html($sn); ?>. Click &ldquo;Go Live&rdquo; on any upcoming fixture on the right to start live scoring.</div>
                    <?php endif; ?>
                </div>

                <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:12px;padding:18px 20px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:10px;margin-bottom:12px;border-bottom:1px solid #f1f5f9;">
                        <strong style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#0f172a;">Upcoming Fixtures (<?php echo count($admin_upcoming_fixtures); ?>) · <?php echo esc_html($sn); ?></strong>
                        <a href="#npl-match-form" style="font-size:12px;font-weight:700;color:#1a237e;text-decoration:none;">+ Schedule Fixture</a>
                    </div>
                    <?php if (!empty($admin_upcoming_fixtures)) : foreach (array_slice($admin_upcoming_fixtures, 0, 4) as $fi => $fx) : ?>
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:<?php echo $fi > 0 ? '10px 0 0' : '0'; ?>;<?php echo $fi > 0 ? 'margin-top:10px;border-top:1px solid #f1f5f9;' : ''; ?>">
                        <div>
                            <div style="font-size:11px;color:#64748b;font-family:monospace;"><?php echo esc_html(($fx['match_no'] ? $fx['match_no'] . ' · ' : '') . $fx['date'] . (!empty($fx['time']) ? ' · ' . $fx['time'] : '') . (!empty($fx['venue']) ? ' · ' . $fx['venue'] : '')); ?></div>
                            <div style="display:flex;align-items:center;gap:6px;margin-top:4px;font-size:13px;">
                                <img src="<?php echo sp659_esc_img(sp659_logo($info, $fx['team1'])); ?>" alt="" style="width:20px;height:20px;object-fit:contain;border-radius:50%;">
                                <strong style="color:#0f172a;"><?php echo esc_html($fx['team1']); ?></strong>
                                <span style="font-size:11px;color:#94a3b8;font-family:monospace;">vs</span>
                                <img src="<?php echo sp659_esc_img(sp659_logo($info, $fx['team2'])); ?>" alt="" style="width:20px;height:20px;object-fit:contain;border-radius:50%;">
                                <strong style="color:#0f172a;"><?php echo esc_html($fx['team2']); ?></strong>
                            </div>
                        </div>
                        <div style="display:flex;gap:6px;">
                            <a class="npl-btn" href="<?php echo esc_url(wp_nonce_url(admin_url('admin.php?page=setopress-npl&go_live=' . rawurlencode($fx['id'])), 'npl_golive_match_' . $fx['id'])); ?>" style="padding:5px 10px;font-size:12px;background:#e11d48;">Go Live</a>
                            <a class="npl-btn npl-btn-secondary" href="<?php echo esc_url(admin_url('admin.php?page=setopress-npl&edit_match=' . rawurlencode($fx['id']))); ?>" style="padding:5px 10px;font-size:12px;">Enter Result</a>
                        </div>
                    </div>
                    <?php endforeach; else : ?>
                    <div style="padding:18px 0;text-align:center;font-size:12px;color:#64748b;">No upcoming fixtures scheduled yet for <?php echo esc_html($sn); ?>.</div>
                    <?php endif; ?>
                </div>
            </div>

            <div class="npl-tabs">
                <button type="button" class="npl-tab <?php echo $active_tab === 'series' ? 'active' : ''; ?>" data-tab="series">Series (<?php echo (int)$series_count; ?>)</button>
                <button type="button" class="npl-tab <?php echo $active_tab === 'matches' ? 'active' : ''; ?>" data-tab="matches">Matches &amp; Results (<?php echo (int)$total_matches; ?>)</button>
                <button type="button" class="npl-tab <?php echo $active_tab === 'teams' ? 'active' : ''; ?>" data-tab="teams">Teams &amp; Squads (<?php echo count($teams); ?>)</button>
                <button type="button" class="npl-tab <?php echo $active_tab === 'news' ? 'active' : ''; ?>" data-tab="news">News Articles (<?php echo (int)$total_news; ?>)</button>
                <button type="button" class="npl-tab <?php echo $active_tab === 'facebook' ? 'active' : ''; ?>" data-tab="facebook">Facebook Page Sync</button>
                <button type="button" class="npl-tab <?php echo $active_tab === 'shortcodes' ? 'active' : ''; ?>" data-tab="shortcodes">Shortcodes</button>
            </div>

            <!-- SERIES DIRECTORY & MULTI-TOURNAMENT MANAGER PANEL -->
            <div class="npl-panel <?php echo $active_tab === 'series' ? 'active' : ''; ?>" data-panel="series">
                <div class="npl-card">
                    <h2>Active Tournament Series Directory (<?php echo (int)$series_count; ?>)</h2>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;">
                        <?php $dir_i = 1; foreach ($series_list as $sr_key => $sr_row) :
                            $is_cur = ($sr_key === $sn);
                            $sr_lg  = sp659_series_logo($sr_row);
                            $sr_wd  = sp659_is_wide_logo($sr_lg);
                            $sr_fm  = (($sr_row['format'] ?? 'T20') === 'ODI') ? 'ODI' : 'T20';
                            $sr_cd  = sp659_derive_series_code($sr_key, $sr_row['code'] ?? '');
                            $sr_live = 0; $sr_res = 0; $sr_fix = 0;
                            foreach ($all_matches as $am) {
                                if (!is_array($am) || (($am['series'] ?? SP659_NPL_SERIES) !== $sr_key)) continue;
                                if (!empty($am['live'])) $sr_live++;
                                elseif (sp659_resolve_match_outcome($am)['type'] !== 'fixture') $sr_res++;
                                else $sr_fix++;
                            }
                        ?>
                        <div style="border:<?php echo $is_cur ? '2px solid #035fb2' : '1px solid #e2e8f0'; ?>;background:<?php echo $is_cur ? '#f0f7ff' : '#ffffff'; ?>;border-radius:12px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;gap:12px;">
                            <div>
                                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;">
                                    <span style="font-family:monospace;font-size:12px;font-weight:800;color:#035fb2;"><?php echo esc_html(sprintf('%02d.', $dir_i)); ?> <?php echo esc_html($sr_cd); ?> · <?php echo esc_html($sr_fm); ?> (<?php echo $sr_fm === 'ODI' ? '50' : '20'; ?> ov)</span>
                                    <?php if ($is_cur) : ?><span style="font-size:11px;font-weight:800;color:#047857;">● ACTIVE</span><?php endif; ?>
                                </div>
                                <div style="display:flex;align-items:center;gap:12px;">
                                    <span style="display:inline-flex;align-items:center;justify-content:center;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:<?php echo $sr_wd ? '4px 8px' : '4px'; ?>;height:38px;flex-shrink:0;">
                                        <img src="<?php echo sp659_esc_img($sr_lg); ?>" alt="" style="<?php echo $sr_wd ? 'height:26px;width:auto;max-width:96px;object-fit:contain;' : 'width:28px;height:28px;object-fit:contain;border-radius:50%;'; ?>">
                                    </span>
                                    <div>
                                        <div style="font-size:15px;font-weight:800;color:#0f172a;line-height:1.25;"><?php echo esc_html($sr_key); ?></div>
                                        <div style="font-size:12px;color:#64748b;margin-top:2px;"><?php echo esc_html(($sr_row['category'] ?? 'Cricket Series') . ' · ' . ($sr_row['season'] ?? '2026')); ?></div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div style="font-family:monospace;font-size:11px;color:#475569;padding-top:10px;border-top:1px solid #e2e8f0;margin-bottom:10px;">
                                    <?php echo count($sr_row['teams'] ?? array()); ?> Teams · <?php echo (int)$sr_live; ?> Live · <?php echo (int)$sr_res; ?> Results · <?php echo (int)$sr_fix; ?> Fixtures
                                </div>
                                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                                    <?php if ($is_cur) : ?>
                                        <span style="font-size:12px;font-weight:700;color:#035fb2;">Currently Editing</span>
                                    <?php else : ?>
                                        <a class="npl-btn" href="<?php echo esc_url(wp_nonce_url(admin_url('admin.php?page=setopress-npl&tab=series&switch_series=' . rawurlencode($sr_key)), 'npl_sw_sr_' . $sr_key)); ?>" style="padding:6px 12px;font-size:12px;background:#035fb2;">Switch &amp; Manage →</a>
                                    <?php endif; ?>
                                    <?php if ($series_count > 1) : ?>
                                        <a class="npl-btn npl-btn-secondary" href="<?php echo esc_url(wp_nonce_url(admin_url('admin.php?page=setopress-npl&tab=series&del_series=' . rawurlencode($sr_key)), 'npl_del_sr_' . $sr_key)); ?>" style="padding:6px 10px;font-size:12px;color:#dc2626;" onclick="return confirm('Delete this series and its matches?');">Delete</a>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>
                        <?php $dir_i++; endforeach; ?>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:20px;">
                    <div class="npl-card">
                        <h2>Edit Active Series Settings — <?php echo esc_html($sn); ?></h2>
                        <form method="post" action="<?php echo esc_url($clean_action_url); ?>">
                            <?php wp_nonce_field('npl_series_mgmt_nonce'); ?>
                            <div class="npl-form-row"><div class="npl-form-label">Short Code</div><div><input type="text" name="meta_series_code" class="npl-form-input" value="<?php echo esc_attr(sp659_derive_series_code($sn, $info['code'] ?? '')); ?>" maxlength="6"></div></div>
                            <div class="npl-form-row">
                                <div class="npl-form-label">Match Format</div>
                                <div>
                                    <select name="meta_series_format" class="npl-form-input">
                                        <option value="T20" <?php selected($info_fmt, 'T20'); ?>>T20 (20.0 Overs · T20 CAREER)</option>
                                        <option value="ODI" <?php selected($info_fmt, 'ODI'); ?>>ODI / World Cup (50.0 Overs · ODI CAREER)</option>
                                    </select>
                                </div>
                            </div>
                            <div class="npl-form-row"><div class="npl-form-label">Season</div><div><input type="text" name="meta_series_season" class="npl-form-input" value="<?php echo esc_attr($info['season'] ?? '2026'); ?>"></div></div>
                            <div class="npl-form-row"><div class="npl-form-label">Category</div><div><input type="text" name="meta_series_category" class="npl-form-input" value="<?php echo esc_attr($info['category'] ?? 'Cricket Tournament'); ?>"></div></div>
                            <div class="npl-form-row"><div class="npl-form-label">Primary Venue</div><div><input type="text" name="meta_series_venue" class="npl-form-input" value="<?php echo esc_attr($info['venue'] ?? 'TU Cricket Ground, Kirtipur'); ?>"></div></div>
                            <div class="npl-form-row">
                                <div class="npl-form-label">Series Logo</div>
                                <div>
                                    <span class="npl-upw" style="display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                        <input type="text" name="meta_series_logo" class="npl-form-input npl-lv" value="<?php echo esc_attr($info['logo'] ?? ''); ?>" placeholder="builtin:npl_logo or Media URL" style="max-width:220px;">
                                        <img class="npl-lp" src="<?php echo sp659_esc_img($info['logo'] ?? ''); ?>" style="<?php echo !empty($info['logo']) ? 'height:38px;width:auto;max-width:110px;object-fit:contain;border-radius:6px;background:#fff;padding:4px;border:1px solid #cbd5e1;' : 'display:none;height:38px;'; ?>">
                                        <button type="button" class="npl-btn npl-btn-secondary npl-up" style="padding:7px 12px;font-size:12px;">Upload</button>
                                        <button type="button" class="npl-btn npl-btn-secondary npl-use-npl-logo" data-logo="builtin:npl_logo" data-preview="<?php echo sp659_esc_img('builtin:npl_logo'); ?>" style="padding:7px 12px;font-size:12px;">Official NPL Logo</button>
                                    </span>
                                </div>
                            </div>
                            <p style="margin-top:16px;"><button type="submit" name="npl_save_series_meta" class="npl-btn">Save Series Settings</button></p>
                        </form>
                    </div>

                    <div class="npl-card">
                        <h2>+ Create New Tournament Series (World Cup, T20 League, Bilateral)</h2>
                        <form method="post" action="<?php echo esc_url($clean_action_url); ?>">
                            <?php wp_nonce_field('npl_series_mgmt_nonce'); ?>
                            <div class="npl-form-row"><div class="npl-form-label">Series Title</div><div><input type="text" name="new_series_name" class="npl-form-input" placeholder="e.g. ICC Champions Trophy or Asia Cup" required></div></div>
                            <div class="npl-form-row"><div class="npl-form-label">Short Code</div><div><input type="text" name="new_series_code" class="npl-form-input" placeholder="e.g. CT or AC" maxlength="6"></div></div>
                            <div class="npl-form-row">
                                <div class="npl-form-label">Format &amp; Overs</div>
                                <div>
                                    <select name="new_series_format" class="npl-form-input">
                                        <option value="T20">T20 (20.0 Overs)</option>
                                        <option value="ODI">ODI / 50-Over World Cup (50.0 Overs)</option>
                                    </select>
                                </div>
                            </div>
                            <div class="npl-form-row"><div class="npl-form-label">Season</div><div><input type="text" name="new_series_season" class="npl-form-input" value="2026"></div></div>
                            <div class="npl-form-row"><div class="npl-form-label">Category</div><div><input type="text" name="new_series_category" class="npl-form-input" placeholder="e.g. ICC Global Tournament"></div></div>
                            <div class="npl-form-row"><div class="npl-form-label">Host Venue</div><div><input type="text" name="new_series_venue" class="npl-form-input" placeholder="e.g. TU Cricket Ground, Kirtipur"></div></div>
                            <div class="npl-form-row"><div class="npl-form-label">Initial Teams (CSV)</div><div><input type="text" name="new_series_teams_csv" class="npl-form-input" placeholder="Nepal, India, Australia, England, South Africa, New Zealand"></div></div>
                            <input type="hidden" name="new_series_logo" value="">
                            <p style="margin-top:16px;"><button type="submit" name="npl_create_series" class="npl-btn" style="background:#035fb2;">+ Create &amp; Activate Series</button></p>
                        </form>
                    </div>
                </div>
            </div>

            <!-- MATCHES PANEL -->
            <div class="npl-panel <?php echo $active_tab === 'matches' ? 'active' : ''; ?>" data-panel="matches">
                <div class="npl-card">
                    <h2><?php echo !empty($em) ? 'Edit Match / Enter Result (' . esc_html($em['team1'] . ' vs ' . $em['team2']) . ') — ' . esc_html($sn) : 'Add Match Result or Fixture — ' . esc_html($sn) . ' (' . esc_html($info_fmt) . ')'; ?></h2>
                    <form method="post" action="<?php echo esc_url($clean_action_url); ?>" id="npl-match-form">
                    <?php wp_nonce_field('npl_match_nonce'); ?>
                    <input type="hidden" name="npl_form_op" value="save_match">
                    <input type="hidden" name="payload_b64" value="">
                    <input type="hidden" name="match_id" value="<?php echo esc_attr($em['id'] ?? ''); ?>">
                    <input type="hidden" name="match_series" value="<?php echo esc_attr($sn); ?>">
                    <div class="npl-form-row">
                        <div class="npl-form-label">Match Status</div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;">
                            <label style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid #cbd5e1;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;background:#f8fafc;">
                                <input type="radio" name="match_status" value="completed" <?php checked($em_status, 'completed'); ?>> Completed Result (Counts in Points Table &amp; Results)
                            </label>
                            <label style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid #cbd5e1;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;background:#f8fafc;">
                                <input type="radio" name="match_status" value="live" <?php checked($em_status, 'live'); ?>> Live Match (Live Scorecard Centre)
                            </label>
                            <label style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid #cbd5e1;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;background:#f8fafc;">
                                <input type="radio" name="match_status" value="fixture" <?php checked($em_status, 'fixture'); ?>> Upcoming Fixture
                            </label>
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                        <div>
                            <div class="npl-form-row"><div class="npl-form-label">Match No</div><div><input type="text" name="match_no" class="npl-form-input" value="<?php echo esc_attr($em['match_no'] ?? 'Match ' . ($total_matches + 1)); ?>" placeholder="e.g. 10th Match"></div></div>
                            <div class="npl-form-row"><div class="npl-form-label">Date</div><div><input type="date" name="match_date" class="npl-form-input" value="<?php echo esc_attr($em['date'] ?? date('Y-m-d')); ?>" required></div></div>
                            <div class="npl-form-row"><div class="npl-form-label">Time</div><div><input type="time" name="match_time" class="npl-form-input" value="<?php echo esc_attr($em['time'] ?? '12:15'); ?>"></div></div>
                            <div class="npl-form-row"><div class="npl-form-label">Venue</div><div><input type="text" name="match_venue" class="npl-form-input" value="<?php echo esc_attr($em['venue'] ?? ($info['venue'] ?? 'TU Cricket Ground, Kirtipur')); ?>"></div></div>
                        </div>
                        <div>
                            <div class="npl-form-row"><div class="npl-form-label">Team 1</div><div><select name="team1" id="npl-match-t1" class="npl-form-input" required><?php foreach ($teams as $tn => $t) : ?><option value="<?php echo esc_attr($tn); ?>" <?php selected($default_t1, $tn); ?>><?php echo esc_html($tn); ?></option><?php endforeach; ?></select></div></div>
                            <div class="npl-form-row"><div class="npl-form-label">Team 2</div><div><select name="team2" id="npl-match-t2" class="npl-form-input" required><?php foreach ($teams as $tn => $t) : ?><option value="<?php echo esc_attr($tn); ?>" <?php selected($default_t2, $tn); ?>><?php echo esc_html($tn); ?></option><?php endforeach; ?></select></div></div>
                            <div class="npl-form-row">
                                <div class="npl-form-label">Team 1 Score &amp; Overs</div>
                                <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:10px;">
                                    <input type="text" name="team1_score" class="npl-form-input" value="<?php echo esc_attr($em['team1_score'] ?? ''); ?>" placeholder="Score (e.g. 180/6)">
                                    <input type="text" name="team1_overs" class="npl-form-input" value="<?php echo esc_attr($em['team1_overs'] ?? ''); ?>" placeholder="Overs (e.g. <?php echo esc_attr($def_ov_str); ?>)">
                                </div>
                            </div>
                            <div class="npl-form-row">
                                <div class="npl-form-label">Team 2 Score &amp; Overs</div>
                                <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:10px;">
                                    <input type="text" name="team2_score" class="npl-form-input" value="<?php echo esc_attr($em['team2_score'] ?? ''); ?>" placeholder="Score (e.g. 113/4)">
                                    <input type="text" name="team2_overs" class="npl-form-input" value="<?php echo esc_attr($em['team2_overs'] ?? ''); ?>" placeholder="Overs (e.g. 14.4)">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="npl-form-row">
                        <div class="npl-form-label">Winner / Outcome</div>
                        <div>
                            <select name="winner" id="npl-match-winner" class="npl-form-input" data-current="<?php echo esc_attr($em['winner'] ?? ''); ?>">
                                <option value="">Auto-detect from Scores (or Upcoming Fixture if scores empty)</option>
                                <option value="<?php echo esc_attr($default_t1); ?>" <?php selected(($em['winner'] ?? ''), $default_t1); ?>><?php echo esc_html($default_t1); ?></option>
                                <option value="<?php echo esc_attr($default_t2); ?>" <?php selected(($em['winner'] ?? ''), $default_t2); ?>><?php echo esc_html($default_t2); ?></option>
                                <option value="Tie" <?php selected(($em['winner'] ?? ''), 'Tie'); ?>>Tie (1 pt each)</option>
                                <option value="NR" <?php selected(($em['winner'] ?? ''), 'NR'); ?>>No Result / Abandoned (1 pt each)</option>
                            </select>
                        </div>
                    </div>
                    <div class="npl-form-row"><div class="npl-form-label">Result Summary</div><div><input type="text" name="result_text" class="npl-form-input" value="<?php echo esc_attr($em['result_text'] ?? ''); ?>" placeholder="Auto-generated if left blank (e.g. Janakpur Bolts won by 24 runs)"></div></div>
                    <div class="npl-form-row"><div class="npl-form-label">Live Chase Equation</div><div><input type="text" name="match_live_status" class="npl-form-input" value="<?php echo esc_attr($em['live_status'] ?? ''); ?>" placeholder="Auto-calculated if blank (e.g. Kathmandu need 68 runs in 32 balls.)"></div></div>

                    <?php
                    $em_sc = sp659_resolve_live_scorecard(!empty($em) ? $em : array('team1' => $default_t1, 'team2' => $default_t2, 'live' => 1), $info);
                    $eb1 = $em_sc['batters'][0] ?? array();
                    $eb2 = $em_sc['batters'][1] ?? array();
                    $ew1 = $em_sc['bowlers'][0] ?? array();
                    $ew2 = $em_sc['bowlers'][1] ?? array();
                    $em_ov_raw = sp659_serialize_overs_timeline($em_sc['recent_overs'] ?? array());
                    $em_target_raw = isset($em['live_details']['target']) ? intval($em['live_details']['target']) : 0;
                    ?>
                    <div id="npl-live-scorer-box" style="<?php echo $em_status === 'live' ? '' : 'display:none;'; ?>background:#f8fafc;border:1px solid #cbd5e1;border-radius:12px;padding:18px 20px;margin:16px 0;">
                        <input type="hidden" name="live_details_present" value="1">
                        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding-bottom:12px;margin-bottom:14px;border-bottom:1px solid #e2e8f0;">
                            <div>
                                <strong style="font-size:14px;color:#035fb2;">Live Scorecard &amp; Ball-by-Ball Scorer ([setopress_npl] Top Centre · <?php echo esc_html($em_sc['career_heading']); ?>)</strong>
                                <div style="font-size:12px;color:#64748b;">Updates Batters, Bowlers, <?php echo esc_html($em_sc['career_heading']); ?> columns, Last Bat / FOW, and Recent Overs timeline in real time.</div>
                            </div>
                            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                                <label style="font-size:12px;font-weight:700;color:#334155;">Batting Now:</label>
                                <select name="live_batting_team" class="npl-form-input" style="width:auto;min-width:170px;">
                                    <option value="team1" <?php selected($em_sc['batting_side'], 'team1'); ?>>Team 1 (1st Innings)</option>
                                    <option value="team2" <?php selected($em_sc['batting_side'], 'team2'); ?>>Team 2 (2nd Innings Chase)</option>
                                </select>
                                <label style="font-size:12px;font-weight:700;color:#334155;">Target:</label>
                                <input type="number" name="live_target" class="npl-form-input" value="<?php echo $em_target_raw > 0 ? (int)$em_target_raw : ''; ?>" placeholder="Auto (e.g. 181)" style="width:120px;">
                            </div>
                        </div>

                        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#475569;margin-bottom:8px;">Active Batters (Innings + <?php echo esc_html($em_sc['career_heading']); ?>)</div>
                        <div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:14px;">
                            <?php foreach (array(1 => $eb1, 2 => $eb2) as $bi => $bd) : ?>
                            <div style="display:grid;grid-template-columns:28px 1.6fr 64px repeat(4,60px) 95px 95px repeat(4,68px);gap:6px;align-items:center;overflow-x:auto;">
                                <label title="On Strike (*)" style="font-size:11px;font-weight:700;color:#0f172a;"><input type="radio" name="live_striker" value="<?php echo (int)$bi; ?>" <?php checked(($bi === 1 && !empty($eb1['striker'])) || ($bi === 2 && empty($eb1['striker']))); ?>>*</label>
                                <input type="text" name="live_bat<?php echo (int)$bi; ?>_name" class="npl-form-input" value="<?php echo esc_attr($bd['name'] ?? ''); ?>" placeholder="Batter <?php echo (int)$bi; ?>">
                                <input type="text" name="live_bat<?php echo (int)$bi; ?>_hand" class="npl-form-input" value="<?php echo esc_attr($bd['hand'] ?? 'rhb'); ?>" placeholder="rhb">
                                <input type="number" name="live_bat<?php echo (int)$bi; ?>_r" class="npl-form-input" value="<?php echo esc_attr((string)($bd['r'] ?? 0)); ?>" placeholder="R" title="Runs">
                                <input type="number" name="live_bat<?php echo (int)$bi; ?>_b" class="npl-form-input" value="<?php echo esc_attr((string)($bd['b'] ?? 0)); ?>" placeholder="B" title="Balls">
                                <input type="number" name="live_bat<?php echo (int)$bi; ?>_4s" class="npl-form-input" value="<?php echo esc_attr((string)($bd['fours'] ?? 0)); ?>" placeholder="4s" title="4s">
                                <input type="number" name="live_bat<?php echo (int)$bi; ?>_6s" class="npl-form-input" value="<?php echo esc_attr((string)($bd['sixes'] ?? 0)); ?>" placeholder="6s" title="6s">
                                <input type="text" name="live_bat<?php echo (int)$bi; ?>_this_bowler" class="npl-form-input" value="<?php echo esc_attr($bd['this_bowler'] ?? '1 (6b)'); ?>" placeholder="This Bowler">
                                <input type="text" name="live_bat<?php echo (int)$bi; ?>_last5" class="npl-form-input" value="<?php echo esc_attr($bd['last_5'] ?? '2 (4b)'); ?>" placeholder="Last 5">
                                <input type="text" name="live_bat<?php echo (int)$bi; ?>_mat" class="npl-form-input" value="<?php echo esc_attr((string)($bd['mat'] ?? '')); ?>" placeholder="MAT">
                                <input type="text" name="live_bat<?php echo (int)$bi; ?>_cruns" class="npl-form-input" value="<?php echo esc_attr((string)($bd['career_runs'] ?? '')); ?>" placeholder="RUNS">
                                <input type="text" name="live_bat<?php echo (int)$bi; ?>_hs" class="npl-form-input" value="<?php echo esc_attr($bd['hs'] ?? ''); ?>" placeholder="HS">
                                <input type="text" name="live_bat<?php echo (int)$bi; ?>_ave" class="npl-form-input" value="<?php echo esc_attr($bd['ave'] ?? ''); ?>" placeholder="AVE">
                            </div>
                            <?php endforeach; ?>
                        </div>

                        <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#475569;margin-bottom:8px;">Active Bowlers (Spell + <?php echo esc_html($em_sc['career_heading']); ?>)</div>
                        <div style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:14px;">
                            <?php foreach (array(1 => $ew1, 2 => $ew2) as $wi => $wd) : ?>
                            <div style="display:grid;grid-template-columns:1.7fr 64px repeat(7,60px) repeat(4,68px);gap:6px;align-items:center;overflow-x:auto;">
                                <input type="text" name="live_bowl<?php echo (int)$wi; ?>_name" class="npl-form-input" value="<?php echo esc_attr($wd['name'] ?? ''); ?>" placeholder="Bowler <?php echo (int)$wi; ?>">
                                <input type="text" name="live_bowl<?php echo (int)$wi; ?>_arm" class="npl-form-input" value="<?php echo esc_attr($wd['arm'] ?? 'rm'); ?>" placeholder="rm">
                                <input type="text" name="live_bowl<?php echo (int)$wi; ?>_o" class="npl-form-input" value="<?php echo esc_attr($wd['o'] ?? '2.0'); ?>" placeholder="O" title="Overs">
                                <input type="number" name="live_bowl<?php echo (int)$wi; ?>_m" class="npl-form-input" value="<?php echo esc_attr((string)($wd['m'] ?? 0)); ?>" placeholder="M" title="Maidens">
                                <input type="number" name="live_bowl<?php echo (int)$wi; ?>_r" class="npl-form-input" value="<?php echo esc_attr((string)($wd['r'] ?? 0)); ?>" placeholder="R" title="Runs">
                                <input type="number" name="live_bowl<?php echo (int)$wi; ?>_w" class="npl-form-input" value="<?php echo esc_attr((string)($wd['w'] ?? 0)); ?>" placeholder="W" title="Wickets">
                                <input type="number" name="live_bowl<?php echo (int)$wi; ?>_0s" class="npl-form-input" value="<?php echo esc_attr((string)($wd['dots'] ?? 0)); ?>" placeholder="0s" title="Dots">
                                <input type="number" name="live_bowl<?php echo (int)$wi; ?>_4s" class="npl-form-input" value="<?php echo esc_attr((string)($wd['fours'] ?? 0)); ?>" placeholder="4s">
                                <input type="number" name="live_bowl<?php echo (int)$wi; ?>_6s" class="npl-form-input" value="<?php echo esc_attr((string)($wd['sixes'] ?? 0)); ?>" placeholder="6s">
                                <input type="text" name="live_bowl<?php echo (int)$wi; ?>_mat" class="npl-form-input" value="<?php echo esc_attr((string)($wd['mat'] ?? '')); ?>" placeholder="MAT">
                                <input type="text" name="live_bowl<?php echo (int)$wi; ?>_cwkts" class="npl-form-input" value="<?php echo esc_attr((string)($wd['career_wkts'] ?? '')); ?>" placeholder="WKTS">
                                <input type="text" name="live_bowl<?php echo (int)$wi; ?>_bbi" class="npl-form-input" value="<?php echo esc_attr($wd['bbi'] ?? ''); ?>" placeholder="BBI">
                                <input type="text" name="live_bowl<?php echo (int)$wi; ?>_ave" class="npl-form-input" value="<?php echo esc_attr($wd['ave'] ?? ''); ?>" placeholder="AVE">
                            </div>
                            <?php endforeach; ?>
                        </div>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                            <div>
                                <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;">Last Bat Dismissed</label>
                                <input type="text" name="live_last_bat" class="npl-form-input" value="<?php echo esc_attr($em_sc['last_bat'] ?? ''); ?>" placeholder="e.g. Bhim Sharki 5 (4b)">
                            </div>
                            <div>
                                <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;">Fall of Wicket (FOW)</label>
                                <input type="text" name="live_fow" class="npl-form-input" value="<?php echo esc_attr($em_sc['fow'] ?? ''); ?>" placeholder="e.g. 89/4 (12.3 Ov)">
                            </div>
                        </div>

                        <div>
                            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
                                <label style="font-size:11px;font-weight:700;color:#475569;">Ball-by-Ball Recent Overs Timeline (separate overs with <code>|</code>)</label>
                                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                                    <?php foreach (array('•', '1', '2', '4', '6', '1w', '1lb', 'W') as $tok) : ?>
                                    <button type="button" class="npl-btn npl-btn-secondary npl-add-ball-tok" data-tok="<?php echo esc_attr($tok); ?>" style="padding:3px 8px;font-size:11px;<?php echo $tok === 'W' ? 'background:#ef4444;color:#fff;' : (($tok === '4' || $tok === '6') ? 'background:#1cb04b;color:#fff;' : ''); ?>">+<?php echo esc_html($tok); ?></button>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                            <input type="text" name="live_overs_timeline" id="npl-live-overs-input" class="npl-form-input" style="font-family:monospace;" value="<?php echo esc_attr($em_ov_raw); ?>" placeholder="1lb 1 • 1w 1w 1w • | 14th:13: 1 1 1 2 4 4 | 13th:9: 2 2 1w 1 W">
                        </div>
                    </div>

                    <p style="margin-top:24px;"><button type="submit" name="npl_save_match" id="npl-save-match-btn" class="npl-btn"><?php echo !empty($em) ? 'Save Match & Update Live Scorecard / Table' : 'Save Match & Update Points Table'; ?></button><?php if (!empty($em)) : ?> <a href="<?php echo esc_url($clean_action_url); ?>" class="npl-btn npl-btn-secondary" style="margin-left:10px;">Cancel Edit</a><?php endif; ?></p>
                    </form>
                </div>

                <!-- LIVE POINTS TABLE VERIFIER INSIDE ADMIN -->
                <div class="npl-card">
                    <h2>Current Calculated Points Table (Live Database Verification)</h2>
                    <div style="overflow-x:auto;">
                        <table class="widefat striped" style="font-family:monospace;">
                            <thead><tr><th>Pos</th><th>Franchise</th><th>P</th><th>W</th><th>L</th><th>T</th><th>NR</th><th>Pts</th><th>NRR</th><th>For / Against</th></tr></thead>
                            <tbody>
                            <?php $p_idx = 1; foreach ($table as $tr) : ?>
                            <tr>
                                <td><?php echo (int)$p_idx; ?></td>
                                <td style="font-family:sans-serif;"><strong><?php echo esc_html($tr['name']); ?></strong></td>
                                <td><?php echo (int)$tr['p']; ?></td>
                                <td><?php echo (int)$tr['w']; ?></td>
                                <td><?php echo (int)$tr['l']; ?></td>
                                <td><?php echo (int)$tr['t']; ?></td>
                                <td><?php echo (int)$tr['nr']; ?></td>
                                <td><strong style="color:#1a237e;"><?php echo (int)$tr['pts']; ?></strong></td>
                                <td style="font-weight:700;color:<?php echo $tr['nrr'] >= 0 ? '#047857' : '#dc2626'; ?>;"><?php echo esc_html(($tr['nrr'] >= 0 ? '+' : '') . number_format((float)$tr['nrr'], 3)); ?></td>
                                <td><?php echo esc_html($tr['runs_for'] . '/' . number_format($tr['overs_for'], 1) . ' vs ' . $tr['runs_against'] . '/' . number_format($tr['overs_against'], 1)); ?></td>
                            </tr>
                            <?php $p_idx++; endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>

                <?php if (!empty($matches)) : ?>
                <div class="npl-card">
                    <h2>Stored Matches — Click &ldquo;Enter / Edit Result&rdquo; to Save Any Match Result Instantly (<?php echo count($matches); ?>)</h2>
                    <table class="widefat striped" style="border-radius:8px;overflow:hidden;">
                        <thead style="background:#f8fafc;"><tr><th>Date</th><th>Matchup &amp; Scores</th><th>Table / Result Status</th><th>Action</th></tr></thead>
                        <tbody>
                        <?php
                        $ms = $matches;
                        usort($ms, function($a, $b) { return strcmp($b['date'] ?? '', $a['date'] ?? ''); });
                        foreach ($ms as $m) :
                            $out = sp659_resolve_match_outcome($m);
                            $score_summary = (!empty($m['team1_score']) || !empty($m['team2_score']))
                                ? ($m['team1_score'] ?: '-') . ' (' . ($m['team1_overs'] ?: $def_ov_str) . ' ov) vs ' . ($m['team2_score'] ?: '-') . ' (' . ($m['team2_overs'] ?: $def_ov_str) . ' ov)'
                                : '';
                            $row_dom_id = 'qr-' . preg_replace('/[^a-zA-Z0-9_-]/', '', $m['id']);
                        ?>
                        <tr <?php if (!empty($m['live'])) echo 'style="background:#fef2f2;"'; ?>>
                            <td><strong><?php echo esc_html($m['date']); ?></strong><br><span style="color:#64748b;font-size:12px;"><?php echo esc_html($m['match_no'] ?? ''); ?></span></td>
                            <td><strong><?php echo esc_html($m['team1'] . ' vs ' . $m['team2']); ?></strong><?php if ($score_summary) : ?><br><span style="color:#64748b;font-size:12px;font-family:monospace;"><?php echo esc_html($score_summary); ?></span><?php endif; ?><?php if (!empty($m['result_text'])) : ?><br><span style="color:#047857;font-size:12px;font-weight:600;"><?php echo esc_html($m['result_text']); ?></span><?php endif; ?></td>
                            <td>
                                <?php
                                if (!empty($m['live'])) {
                                    echo '<span class="npl-live-indicator">LIVE MATCH</span><br><span style="font-size:11px;color:#991b1b;">Click Enter Result when game ends</span>';
                                } elseif ($out['type'] !== 'fixture') {
                                    echo '<strong style="color:#059669;">✓ ' . esc_html($out['winner']) . '</strong><br><span style="font-size:11px;color:#64748b;">Counted in Points Table &amp; Results</span>';
                                } else {
                                    echo '<span style="color:#64748b;">Upcoming Fixture</span>';
                                }
                                ?>
                            </td>
                            <td>
                                <button type="button" class="npl-btn npl-qr-toggle" data-target="#<?php echo esc_attr($row_dom_id); ?>" style="padding:6px 10px;font-size:12px;background:#059669;margin-right:4px;"><?php echo ($out['type'] !== 'fixture' && empty($m['live'])) ? 'Edit Result' : 'Enter Result'; ?></button>
                                <a class="npl-btn npl-btn-secondary" href="<?php echo esc_url(admin_url('admin.php?page=setopress-npl&edit_match=' . rawurlencode($m['id']))); ?>" style="padding:6px 10px;font-size:12px;">Full Edit</a>
                                <a class="npl-btn npl-btn-secondary" href="<?php echo esc_url(wp_nonce_url(admin_url('admin.php?page=setopress-npl&del_match=' . rawurlencode($m['id'])), 'npl_del_match_' . $m['id'])); ?>" style="padding:6px 10px;font-size:12px;color:#dc2626;" onclick="return confirm('Delete this match?');">Delete</a>
                            </td>
                        </tr>
                        <tr id="<?php echo esc_attr($row_dom_id); ?>" style="display:none;background:#f0fdf4;">
                            <td colspan="4" style="padding:14px 16px;border-top:1px solid #bbf7d0;">
                                <form method="post" action="<?php echo esc_url($clean_action_url); ?>" class="npl-quick-result-form" style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;">
                                    <?php wp_nonce_field('npl_match_nonce'); ?>
                                    <input type="hidden" name="npl_form_op" value="quick_result">
                                    <input type="hidden" name="payload_b64" value="">
                                    <input type="hidden" name="match_id" value="<?php echo esc_attr($m['id']); ?>">
                                    <input type="hidden" name="match_series" value="<?php echo esc_attr($sn); ?>">
                                    <input type="hidden" name="match_no" value="<?php echo esc_attr($m['match_no'] ?? ''); ?>">
                                    <input type="hidden" name="match_date" value="<?php echo esc_attr($m['date'] ?? date('Y-m-d')); ?>">
                                    <input type="hidden" name="match_time" value="<?php echo esc_attr($m['time'] ?? '12:15'); ?>">
                                    <input type="hidden" name="match_venue" value="<?php echo esc_attr($m['venue'] ?? ''); ?>">
                                    <input type="hidden" name="team1" value="<?php echo esc_attr($m['team1']); ?>">
                                    <input type="hidden" name="team2" value="<?php echo esc_attr($m['team2']); ?>">
                                    <input type="hidden" name="match_status" value="completed">
                                    <div>
                                        <label style="display:block;font-size:11px;font-weight:700;color:#065f46;"><?php echo esc_html($m['team1']); ?> Score / Overs</label>
                                        <div style="display:flex;gap:6px;">
                                            <input type="text" name="team1_score" class="npl-form-input" value="<?php echo esc_attr($m['team1_score'] ?? ''); ?>" placeholder="176/5" style="width:95px;">
                                            <input type="text" name="team1_overs" class="npl-form-input" value="<?php echo esc_attr($m['team1_overs'] ?: $def_ov_str); ?>" placeholder="<?php echo esc_attr($def_ov_str); ?>" style="width:70px;">
                                        </div>
                                    </div>
                                    <div>
                                        <label style="display:block;font-size:11px;font-weight:700;color:#065f46;"><?php echo esc_html($m['team2']); ?> Score / Overs</label>
                                        <div style="display:flex;gap:6px;">
                                            <input type="text" name="team2_score" class="npl-form-input" value="<?php echo esc_attr($m['team2_score'] ?? ''); ?>" placeholder="152/9" style="width:95px;">
                                            <input type="text" name="team2_overs" class="npl-form-input" value="<?php echo esc_attr($m['team2_overs'] ?: $def_ov_str); ?>" placeholder="<?php echo esc_attr($def_ov_str); ?>" style="width:70px;">
                                        </div>
                                    </div>
                                    <div>
                                        <label style="display:block;font-size:11px;font-weight:700;color:#065f46;">Winner</label>
                                        <select name="winner" class="npl-form-input" style="min-width:170px;">
                                            <option value="">Auto from Scores</option>
                                            <option value="<?php echo esc_attr($m['team1']); ?>" <?php selected($m['winner'] ?? '', $m['team1']); ?>><?php echo esc_html($m['team1']); ?></option>
                                            <option value="<?php echo esc_attr($m['team2']); ?>" <?php selected($m['winner'] ?? '', $m['team2']); ?>><?php echo esc_html($m['team2']); ?></option>
                                            <option value="Tie" <?php selected($m['winner'] ?? '', 'Tie'); ?>>Tie (1 pt)</option>
                                            <option value="NR" <?php selected($m['winner'] ?? '', 'NR'); ?>>No Result (1 pt)</option>
                                        </select>
                                    </div>
                                    <div style="flex:1;min-width:200px;">
                                        <label style="display:block;font-size:11px;font-weight:700;color:#065f46;">Result Text (Optional)</label>
                                        <input type="text" name="result_text" class="npl-form-input" value="<?php echo esc_attr($m['result_text'] ?? ''); ?>" placeholder="Auto-calculated if blank">
                                    </div>
                                    <button type="submit" name="npl_quick_result_save" class="npl-btn" style="background:#059669;">Save Result Now</button>
                                </form>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php endif; ?>
            </div>

            <!-- TEAMS & SQUADS PANEL -->
            <div class="npl-panel <?php echo $active_tab === 'teams' ? 'active' : ''; ?>" data-panel="teams">
                <div class="npl-card">
                    <h2>+ Add New Team to <?php echo esc_html($sn); ?></h2>
                    <form method="post" action="<?php echo esc_url($clean_action_url); ?>" style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;">
                        <?php wp_nonce_field('npl_add_team_nonce'); ?>
                        <div style="flex:2;min-width:190px;">
                            <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;">Team / Country Name</label>
                            <input type="text" name="new_team_name" class="npl-form-input" placeholder="e.g. Nepal or Mustangs XI" required>
                        </div>
                        <div style="width:110px;">
                            <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;">Short Code</label>
                            <input type="text" name="new_team_short" class="npl-form-input" placeholder="NEP" maxlength="4">
                        </div>
                        <div style="flex:1.5;min-width:160px;">
                            <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;">Captain</label>
                            <input type="text" name="new_team_captain" class="npl-form-input" placeholder="Rohit Paudel">
                        </div>
                        <div>
                            <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;">Color</label>
                            <input type="color" name="new_team_color" value="#035fb2" style="width:48px;height:38px;padding:2px;cursor:pointer;border:1px solid #cbd5e1;border-radius:8px;background:#fff;">
                        </div>
                        <button type="submit" name="npl_add_team" class="npl-btn" style="background:#035fb2;">+ Add Team</button>
                    </form>
                </div>

                <div class="npl-card">
                    <h2>Series &amp; Squad Settings — <?php echo esc_html($sn); ?> (<?php echo count($teams); ?> Teams)</h2>
                    <form method="post" action="<?php echo esc_url($clean_action_url); ?>" id="npl-series-form">
                    <?php wp_nonce_field('npl_teams_nonce'); ?>
                    <div class="npl-form-row"><div class="npl-form-label">Series Logo</div><div><span class="npl-upw" style="display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap;"><input type="hidden" name="series_logo" class="npl-lv" value="<?php echo esc_attr($info['logo'] ?? ''); ?>"><img class="npl-lp" src="<?php echo sp659_esc_img($info['logo'] ?? ''); ?>" style="<?php echo !empty($info['logo']) ? 'height:48px;width:auto;max-width:130px;object-fit:contain;border-radius:10px;background:#ffffff;padding:6px;border:1px solid #cbd5e1;' : 'display:none;height:48px;'; ?>"><button type="button" class="npl-btn npl-btn-secondary npl-up">Upload Logo</button><button type="button" class="npl-btn npl-btn-secondary npl-use-npl-logo" data-logo="builtin:npl_logo" data-preview="<?php echo sp659_esc_img('builtin:npl_logo'); ?>">Use Official NPL Logo</button><button type="button" class="npl-btn npl-btn-secondary npl-rm" style="<?php echo !empty($info['logo']) ? '' : 'display:none;'; ?>">Remove</button></span></div></div>
                    <div class="npl-form-row"><div class="npl-form-label">Season Year</div><div><input type="text" name="series_season" class="npl-form-input" value="<?php echo esc_attr($info['season'] ?? '2026'); ?>" style="max-width:240px;"></div></div>
                    <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;">
                    <div style="margin-bottom:20px;">
                        <label style="display:block;font-weight:700;margin-bottom:8px;color:#0f172a;font-size:13px;">Select Team in <?php echo esc_html($sn); ?> to Edit Squad &amp; Player Runs/Wickets:</label>
                        <select id="npl-player-team-select" class="npl-form-input" style="max-width:420px;font-weight:600;">
                            <option value="">— Choose a team —</option>
                            <?php $tIdx = 0; foreach ($teams as $tname => $td) : $pCount = count($td['players'] ?? array()); ?>
                            <option value="<?php echo (int)$tIdx; ?>"><?php echo esc_html($tname); ?> (<?php echo (int)$pCount; ?> players)</option>
                            <?php $tIdx++; endforeach; ?>
                        </select>
                    </div>
                    <div id="npl-player-panel" style="display:none;">
                        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                            <h3 id="npl-player-team-title" style="margin:0;font-size:18px;font-weight:800;color:#1a237e;"></h3>
                            <span id="npl-player-count" style="background:#e2e8f0;color:#0f172a;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:700;">0 players</span>
                        </div>
                        <?php $tIdx = 0; foreach ($teams as $tname => $td) :
                            $playersB64 = rtrim(strtr(base64_encode(wp_json_encode($td['players'] ?? array())), '+/', '-_'), '=');
                        ?>
                        <div class="npl-team-card" id="npl-team-card-<?php echo (int)$tIdx; ?>" style="display:none;" data-idx="<?php echo (int)$tIdx; ?>">
                            <div class="npl-team-header">
                                <span class="npl-upw" style="display:inline-flex;align-items:center;gap:8px;">
                                    <input type="hidden" name="team_logo[]" class="npl-lv" value="<?php echo esc_attr($td['logo'] ?? ''); ?>">
                                    <img class="npl-lp npl-team-logo-preview" src="<?php echo sp659_esc_img($td['logo'] ?? ''); ?>" style="<?php echo !empty($td['logo']) ? '' : 'display:none;'; ?>">
                                    <button type="button" class="npl-btn npl-btn-secondary npl-up" style="padding:6px 12px;font-size:12px;">Upload Custom Crest</button>
                                    <button type="button" class="npl-btn npl-btn-secondary npl-rm" style="<?php echo !empty($td['logo']) ? 'padding:6px 10px;font-size:12px;' : 'display:none;padding:6px 10px;font-size:12px;'; ?>">Use Built-in SVG</button>
                                </span>
                                <input type="color" name="team_color[]" class="npl-form-input" value="<?php echo esc_attr($td['color'] ?? '#1a237e'); ?>" style="width:50px;height:38px;padding:2px;cursor:pointer;" title="Brand Color">
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                                <input type="text" name="team_captain[]" class="npl-form-input" value="<?php echo esc_attr($td['captain'] ?? ''); ?>" placeholder="Captain">
                                <input type="text" name="team_coach[]" class="npl-form-input" value="<?php echo esc_attr($td['coach'] ?? ''); ?>" placeholder="Head Coach">
                                <input type="text" name="team_owner[]" class="npl-form-input" value="<?php echo esc_attr($td['owner'] ?? ''); ?>" placeholder="Owner">
                                <input type="text" name="team_venue[]" class="npl-form-input" value="<?php echo esc_attr($td['venue'] ?? ''); ?>" placeholder="Home Ground">
                            </div>
                            <input type="hidden" name="team_players_b64[]" class="npl-players-b64" value="<?php echo esc_attr($playersB64); ?>">
                        </div>
                        <?php $tIdx++; endforeach; ?>

                        <div style="background:#f8fafc;padding:16px;border-radius:10px;margin:16px 0;border:1px solid #cbd5e1;">
                            <div style="font-size:13px;font-weight:700;margin-bottom:10px;">Add Player to Squad</div>
                            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                                <input type="text" id="npl-new-player-name" class="npl-form-input" placeholder="Player full name" style="flex:2;min-width:180px;">
                                <select id="npl-new-player-role" class="npl-form-input" style="flex:1;min-width:140px;"><option value="Batsman">Batsman</option><option value="Bowler">Bowler</option><option value="Allrounder">Allrounder</option><option value="Wicketkeeper">Wicketkeeper</option><option value="Captain">Captain</option><option value="Vice-captain">Vice-captain</option><option value="Marquee Player">Marquee Player</option></select>
                                <input type="number" id="npl-new-player-runs" class="npl-form-input" placeholder="Runs (0)" style="width:95px;">
                                <input type="number" id="npl-new-player-wkts" class="npl-form-input" placeholder="Wkts (0)" style="width:95px;">
                                <button type="button" id="npl-add-player-btn" class="npl-btn">+ Add Player</button>
                            </div>
                        </div>

                        <div id="npl-player-list"></div>
                        <p id="npl-no-players" style="display:none;color:#94a3b8;text-align:center;padding:20px;">No players in squad yet.</p>
                    </div>
                    <p style="margin-top:24px;"><button type="submit" name="npl_save_teams" class="npl-btn">Save All Teams &amp; Player Stats</button></p>
                    </form>
                </div>
            </div>

            <!-- EDITORIAL NEWS PUBLISHER PANEL -->
            <div class="npl-panel <?php echo $active_tab === 'news' ? 'active' : ''; ?>" data-panel="news">
                <div class="npl-card">
                    <h2><?php echo !empty($en) ? 'Edit Editorial Article' : 'Publish Editorial Article'; ?></h2>
                    <form method="post" action="<?php echo esc_url($clean_action_url); ?>" id="npl-news-form">
                        <?php wp_nonce_field('npl_news_nonce'); ?>
                        <input type="hidden" name="npl_form_op" value="save_news">
                        <input type="hidden" name="payload_b64" value="">
                        <input type="hidden" name="news_id" value="<?php echo esc_attr($en['id'] ?? ''); ?>">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                            <div>
                                <div class="npl-form-row"><div class="npl-form-label">Tournament Series</div><div><select name="news_series" class="npl-form-input"><?php foreach ($series_list as $sr_k => $sr_v) : ?><option value="<?php echo esc_attr($sr_k); ?>" <?php selected(($en['series'] ?? $sn), $sr_k); ?>><?php echo esc_html($sr_k); ?></option><?php endforeach; ?></select></div></div>
                                <div class="npl-form-row"><div class="npl-form-label">Headline</div><div><input type="text" name="news_title" class="npl-form-input" value="<?php echo esc_attr($en['title'] ?? ''); ?>" placeholder="Enter compelling match report or announcement headline..." required></div></div>
                                <div class="npl-form-row"><div class="npl-form-label">Category</div><div><select name="news_category" class="npl-form-input"><option value="match" <?php selected(($en['category'] ?? 'match'), 'match'); ?>>Match Report</option><option value="press" <?php selected(($en['category'] ?? 'match'), 'press'); ?>>Press Release</option><option value="update" <?php selected(($en['category'] ?? 'match'), 'update'); ?>>League Update</option></select></div></div>
                                <div class="npl-form-row"><div class="npl-form-label">Date &amp; Time</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><input type="date" name="news_date" class="npl-form-input" value="<?php echo esc_attr($en['date'] ?? date('Y-m-d')); ?>" required><input type="time" name="news_time" class="npl-form-input" value="<?php echo esc_attr($en['time'] ?? '16:00'); ?>"></div></div>
                                <div class="npl-form-row"><div class="npl-form-label">Author / Byline</div><div><input type="text" name="news_author" class="npl-form-input" value="<?php echo esc_attr($en['author'] ?? 'SetoPress Cricket Desk · Kirtipur'); ?>" placeholder="SetoPress Cricket Desk · Kirtipur"></div></div>
                            </div>
                            <div>
                                <?php $en_img_resolved = !empty($en) ? sp659_resolve_news_image($en) : ''; ?>
                                <div class="npl-form-row"><div class="npl-form-label">Featured Image</div><div><span class="npl-upw" style="display:flex;flex-direction:column;gap:8px;"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><input type="text" name="news_image" class="npl-form-input npl-lv" value="<?php echo esc_attr($en['image'] ?? ''); ?>" placeholder="Optional image URL (or click Upload Image)" style="flex:1;min-width:180px;"><button type="button" class="npl-btn npl-btn-secondary npl-up" style="padding:8px 12px;font-size:12px;">Upload Image</button><button type="button" class="npl-btn npl-btn-secondary npl-rm" style="<?php echo $en_img_resolved !== '' ? 'padding:8px 12px;font-size:12px;' : 'display:none;padding:8px 12px;font-size:12px;'; ?>">Clear</button></div><img class="npl-lp" src="<?php echo sp659_esc_img($en_img_resolved); ?>" style="<?php echo $en_img_resolved !== '' ? 'width:120px;height:72px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1;' : 'display:none;width:120px;height:72px;object-fit:cover;border-radius:8px;'; ?>"></span><span style="display:block;font-size:11px;color:#64748b;margin-top:4px;">Built-in photography is automatically included for sample stories; upload any custom image from your Media Library anytime.</span></div></div>
                                <div class="npl-form-row"><div class="npl-form-label">Related Team 1</div><div><select name="news_team1" class="npl-form-input"><option value="">— None —</option><?php foreach ($teams as $tn => $t) : ?><option value="<?php echo esc_attr($tn); ?>" <?php selected(($en['team1'] ?? ''), $tn); ?>><?php echo esc_html($tn); ?></option><?php endforeach; ?></select></div></div>
                                <div class="npl-form-row"><div class="npl-form-label">Related Team 2</div><div><select name="news_team2" class="npl-form-input"><option value="">— None —</option><?php foreach ($teams as $tn => $t) : ?><option value="<?php echo esc_attr($tn); ?>" <?php selected(($en['team2'] ?? ''), $tn); ?>><?php echo esc_html($tn); ?></option><?php endforeach; ?></select></div></div>
                            </div>
                        </div>
                        <div class="npl-form-row"><div class="npl-form-label">Standfirst Summary</div><div><textarea name="news_excerpt" class="npl-form-input" rows="2" placeholder="2-sentence lead deck shown on Newsroom cards..."><?php echo esc_textarea($en['excerpt'] ?? ''); ?></textarea></div></div>
                        <div class="npl-form-row"><div class="npl-form-label">Full Article Body</div><div><textarea name="news_content" class="npl-form-input" rows="7" placeholder="Write the full multi-paragraph match report or press release here (separate paragraphs with a blank line)..."><?php echo esc_textarea($en['content'] ?? ''); ?></textarea></div></div>
                        <div class="npl-form-row"><div class="npl-form-label">Pull Quote (Optional)</div><div><input type="text" name="news_quote" class="npl-form-input" value="<?php echo esc_attr($en['quote'] ?? ''); ?>" placeholder="Optional captain or coach quote highlighted inside the article reader..."></div></div>
                        <p style="margin-top:20px;"><button type="submit" name="npl_save_news" class="npl-btn"><?php echo !empty($en) ? 'Update Editorial Article' : 'Publish Editorial Article'; ?></button><?php if (!empty($en)) : ?> <a href="<?php echo esc_url($clean_action_url . '&tab=news'); ?>" class="npl-btn npl-btn-secondary" style="margin-left:10px;">Cancel</a><?php endif; ?></p>
                    </form>
                </div>
                <?php if (!empty($news)) : ?>
                <div class="npl-card">
                    <h2>Published Editorial Stories Across All Series (<?php echo count($news); ?>)</h2>
                    <table class="widefat striped">
                        <thead><tr><th>Date</th><th>Series &amp; Category</th><th>Headline &amp; Summary</th><th>Action</th></tr></thead>
                        <tbody>
                        <?php $ns = $news; usort($ns, function($a, $b) { return strcmp($b['date'] ?? '', $a['date'] ?? ''); }); foreach ($ns as $n) : ?>
                        <tr>
                            <td style="white-space:nowrap;font-family:monospace;"><?php echo esc_html(($n['date'] ?? '') . (!empty($n['time']) ? ' ' . $n['time'] : '')); ?></td>
                            <td>
                                <div style="font-size:11px;font-weight:700;color:#035fb2;"><?php echo esc_html($n['series'] ?? SP659_NPL_SERIES); ?></div>
                                <strong style="color:#991b1b;font-size:11px;letter-spacing:0.06em;"><?php echo esc_html(strtoupper($n['category'] ?? 'press')); ?></strong>
                            </td>
                            <td>
                                <strong style="font-size:14px;color:#0f172a;"><?php echo esc_html($n['title']); ?></strong>
                                <?php if (!empty($n['author'])) : ?><div style="font-size:11px;color:#64748b;margin-top:2px;"><?php echo esc_html($n['author']); ?></div><?php endif; ?>
                                <?php if (!empty($n['excerpt'])) : ?><div style="font-size:12px;color:#475569;margin-top:3px;"><?php echo esc_html(wp_trim_words($n['excerpt'], 24)); ?></div><?php endif; ?>
                            </td>
                            <td style="white-space:nowrap;">
                                <a class="npl-btn npl-btn-secondary" href="<?php echo esc_url(admin_url('admin.php?page=setopress-npl&edit_news=' . rawurlencode($n['id']))); ?>" style="padding:5px 10px;font-size:12px;">Edit</a>
                                <a class="npl-btn npl-btn-secondary" href="<?php echo esc_url(wp_nonce_url(admin_url('admin.php?page=setopress-npl&del_news=' . rawurlencode($n['id'])), 'npl_del_news_' . $n['id'])); ?>" style="padding:5px 10px;font-size:12px;color:#dc2626;" onclick="return confirm('Delete this article?');">Delete</a>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php endif; ?>
            </div>

            <!-- FACEBOOK PAGE SYNC PANEL (ID: 61590852571494) -->
            <div class="npl-panel <?php echo $active_tab === 'facebook' ? 'active' : ''; ?>" data-panel="facebook">
                <?php
                $tpl_combined = sp659_format_fb_result_text($d) . "\\n\\n" . sp659_format_fb_table_text($d);
                $tpl_result   = sp659_format_fb_result_text($d);
                $tpl_table    = sp659_format_fb_table_text($d);
                $tpl_news     = sp659_format_fb_news_text($d);

                $fb_completed_matches = array_values(array_filter($matches, function($m) {
                    return is_array($m) && empty($m['live']) && sp659_resolve_match_outcome($m)['type'] !== 'fixture';
                }));
                usort($fb_completed_matches, function($a, $b) { return strcmp($b['date'] ?? '', $a['date'] ?? ''); });
                $fb_latest_match = $fb_completed_matches[0] ?? null;
                $fb_latest_summary = $fb_latest_match ? (!empty($fb_latest_match['result_text']) ? $fb_latest_match['result_text'] : sp659_match_result_label($fb_latest_match)) : '';

                $fb_sorted_news = array_values(array_filter($news, function($n) use ($sn) {
                    return is_array($n) && (($n['series'] ?? SP659_NPL_SERIES) === $sn);
                }));
                if (empty($fb_sorted_news)) $fb_sorted_news = array_values($news);
                usort($fb_sorted_news, function($a, $b) { return strcmp($b['date'] ?? '', $a['date'] ?? ''); });
                $fb_latest_news = $fb_sorted_news[0] ?? null;

                $fb_canvas_payload = array(
                    'seriesName' => $sn,
                    'seriesCode' => sp659_derive_series_code($sn, $info['code'] ?? ''),
                    'season'     => $info['season'] ?? '2026',
                    'pageId'     => $fb['page_id'] ?: '61590852571494',
                    'match'      => $fb_latest_match ? array(
                        'match_no'    => $fb_latest_match['match_no'] ?? 'MATCH RESULT',
                        'date'        => $fb_latest_match['date'] ?? '',
                        'venue'       => $fb_latest_match['venue'] ?? ($info['venue'] ?? 'TU Cricket Ground, Kirtipur'),
                        'team1'       => $fb_latest_match['team1'] ?? '',
                        'team1_score' => $fb_latest_match['team1_score'] ?? '-',
                        'team1_overs' => $fb_latest_match['team1_overs'] ?? '',
                        'team2'       => $fb_latest_match['team2'] ?? '',
                        'team2_score' => $fb_latest_match['team2_score'] ?? '-',
                        'team2_overs' => $fb_latest_match['team2_overs'] ?? '',
                        'summary'     => $fb_latest_summary
                    ) : null,
                    'news'    => $fb_latest_news ? array(
                        'date'    => $fb_latest_news['date'] ?? '',
                        'title'   => $fb_latest_news['title'] ?? '',
                        'excerpt' => $fb_latest_news['excerpt'] ?? ''
                    ) : null,
                    'table'   => array_map(function($r) {
                        return array(
                            'name' => $r['name'],
                            'p'    => intval($r['p']),
                            'w'    => intval($r['w']),
                            'l'    => intval($r['l']),
                            'pts'  => intval($r['pts']),
                            'nrr'  => (float)$r['nrr']
                        );
                    }, array_slice($table, 0, 8))
                );
                $wp_oauth_cb_url = admin_url('admin.php?page=setopress-npl&tab=facebook&fb_oauth_cb=1');
                $has_fb_token = !empty($fb['access_token']);
                ?>
                <div class="npl-card" id="npl-fb-card-root" data-canvas="<?php echo esc_attr(wp_json_encode($fb_canvas_payload)); ?>">
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid #e2e8f0;">
                        <div>
                            <h2 style="margin:0;">Facebook Page Publisher — Results, Points Table &amp; News</h2>
                            <p style="margin:4px 0 0;color:#64748b;font-size:13px;">
                                Target Page: <a href="<?php echo esc_url($fb['page_url']); ?>" target="_blank" rel="noopener noreferrer" style="color:#1877F2;font-weight:700;"><?php echo esc_html($fb['page_url']); ?></a>
                                (ID: <code><?php echo esc_html($fb['page_id']); ?></code>)
                            </p>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                            <?php if ($has_fb_token) : ?>
                                <span style="font-size:12px;background:#ecfdf5;border:1px solid #6ee7b7;color:#065f46;padding:7px 12px;border-radius:8px;font-weight:700;">
                                    ● Graph API Connected<?php echo !empty($fb['page_name']) ? ': ' . esc_html($fb['page_name']) : ''; ?> (<?php echo esc_html($fb['page_id']); ?>)
                                </span>
                            <?php else : ?>
                                <span style="font-size:12px;background:#fffbeb;border:1px solid #fcd34d;color:#92400e;padding:7px 12px;border-radius:8px;font-weight:700;">
                                    ● Instant Zero-Token Mode Active (Add Page Token in Step B for Auto-API Sync)
                                </span>
                            <?php endif; ?>
                            <?php if (!empty($fb['last_post_id'])) : ?>
                                <span style="font-size:12px;background:#eff6ff;border:1px solid #93c5fd;color:#1e40af;padding:7px 12px;border-radius:8px;font-weight:700;">
                                    Last API Post: <?php echo esc_html($fb['last_post_id']); ?>
                                </span>
                            <?php endif; ?>
                        </div>
                    </div>

                    <!-- SINGLE UNIFIED FORM: WAF-Safe Base64 AJAX + Smart Instant Browser Fallback -->
                    <form method="post" action="<?php echo esc_url($clean_action_url); ?>" id="npl-fb-unified-form">
                        <?php wp_nonce_field('npl_fb_nonce'); ?>
                        <input type="hidden" name="fb_settings_present" value="1">

                        <div id="npl-fb-live-banner" style="display:none;padding:14px 18px;border-radius:10px;margin-bottom:18px;font-weight:700;font-size:13px;line-height:1.5;"></div>

                        <!-- STEP A: COMPOSER + HD BROADCAST CARD (WORKS WITH OR WITHOUT TOKEN) -->
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:20px;margin-bottom:24px;padding-bottom:22px;border-bottom:1px solid #e2e8f0;">
                            <div>
                                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
                                    <h3 style="margin:0;font-size:15px;font-weight:800;color:#0f172a;">Step A. Live Post Composer &amp; Instant Share</h3>
                                    <span id="npl-fb-copy-toast" style="display:none;font-size:12px;font-weight:700;color:#059669;">✓ Caption Copied &amp; Card Downloaded!</span>
                                </div>
                                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
                                    <button type="button" class="npl-btn npl-btn-secondary npl-fb-tpl" data-kind="combined" data-tpl="<?php echo esc_attr($tpl_combined); ?>" style="padding:7px 11px;font-size:12px;">Result + Points Table</button>
                                    <button type="button" class="npl-btn npl-btn-secondary npl-fb-tpl" data-kind="result" data-tpl="<?php echo esc_attr($tpl_result); ?>" style="padding:7px 11px;font-size:12px;">Match Result</button>
                                    <button type="button" class="npl-btn npl-btn-secondary npl-fb-tpl" data-kind="table" data-tpl="<?php echo esc_attr($tpl_table); ?>" style="padding:7px 11px;font-size:12px;">Points Table</button>
                                    <button type="button" class="npl-btn npl-btn-secondary npl-fb-tpl" data-kind="news" data-tpl="<?php echo esc_attr($tpl_news); ?>" style="padding:7px 11px;font-size:12px;">Latest News</button>
                                </div>
                                <textarea name="fb_custom_message" id="npl-fb-composer" class="npl-form-input" rows="11" style="font-family:monospace;font-size:12px;line-height:1.5;margin-bottom:12px;"><?php echo esc_textarea($tpl_combined); ?></textarea>

                                <!-- Smart Unified Primary Publish Action (Works WITH or WITHOUT Token!) -->
                                <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px;margin-bottom:10px;">
                                    <div style="font-size:12px;font-weight:800;color:#065f46;margin-bottom:8px;">
                                        Publish Now to Facebook Page (<code><?php echo esc_html($fb['page_id']); ?></code>):
                                    </div>
                                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                        <button type="button" id="npl-fb-smart-publish-btn" class="npl-btn" style="background:#1877F2;padding:11px 18px;">
                                            <?php echo $has_fb_token ? 'Auto-Publish via Meta Graph API (' . esc_html($fb['page_id']) . ')' : 'Publish to Facebook Page (' . esc_html($fb['page_id']) . ') — Copy + HD Card ↗'; ?>
                                        </button>
                                        <button type="button" id="npl-fb-zero-token-btn" class="npl-btn" style="background:#059669;">Copy Post + Download HD Card &amp; Open Page ↗</button>
                                        <button type="button" id="npl-fb-sharer-btn" class="npl-btn npl-btn-secondary">Share Live Link Card ↗</button>
                                    </div>
                                    <p style="margin:8px 0 0;font-size:11px;color:#065f46;">
                                        <strong>Zero Dead-Ends:</strong> If a Meta Token is connected below, clicking Publish posts automatically in the background via Graph API. If no token is set yet, it immediately copies your caption, downloads the 1200×630 HD Graphic, and opens Page <code><?php echo esc_html($fb['page_id']); ?></code> ready for <code>Ctrl+V</code>!
                                    </p>
                                </div>
                            </div>

                            <div>
                                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;">
                                    <h3 style="margin:0;font-size:15px;font-weight:800;color:#0f172a;">Auto-Generated Broadcast Graphic (1200×630)</h3>
                                    <button type="button" id="npl-fb-dl-card" class="npl-btn npl-btn-secondary" style="padding:6px 12px;font-size:12px;">Download PNG Card</button>
                                </div>
                                <div style="border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;background:#0b133b;">
                                    <canvas id="npl-fb-canvas" width="1200" height="630" style="width:100%;height:auto;display:block;"></canvas>
                                </div>
                                <p style="margin:8px 0 0;font-size:12px;color:#64748b;">
                                    Generated both in your browser AND server-side via PHP GD (<code>/wp-json/setopress-npl/v1/og-card</code>) — zero oversized POST uploads, ModSecurity safe!
                                </p>
                            </div>
                        </div>

                        <!-- STEP B: OPTIONAL BACKGROUND AUTO-SYNC (META GRAPH API TOKEN OR 1-CLICK POPUP) -->
                        <div>
                            <h3 style="margin:0 0 8px;font-size:15px;font-weight:800;color:#0f172a;">Step B. Optional Background Auto-Post Setup (Meta Graph API / 1-Click Popup Login)</h3>
                            <p style="margin:0 0 14px;font-size:12px;color:#475569;">
                                Only needed if you want WordPress to auto-post in the background without opening a browser tab. Paste a Token OR enter your Meta App ID to log in via popup:
                            </p>

                            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px;">
                                <div>
                                    <div class="npl-form-row"><div class="npl-form-label">Facebook Page ID</div><div><input type="text" name="fb_page_id" id="npl-fb-page-id" class="npl-form-input" value="<?php echo esc_attr($fb['page_id']); ?>" placeholder="61590852571494"></div></div>
                                    <div class="npl-form-row"><div class="npl-form-label">Website NPL Hub URL</div><div><input type="url" name="fb_site_hub_url" id="npl-fb-hub-url" class="npl-form-input" value="<?php echo esc_attr($fb['site_hub_url']); ?>" placeholder="<?php echo esc_attr(home_url('/')); ?>"></div></div>
                                    <div class="npl-form-row">
                                        <div class="npl-form-label">Page Access Token</div>
                                        <div>
                                            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                                <input type="text" name="fb_access_token" id="npl-fb-token-input" autocomplete="off" spellcheck="false" class="npl-form-input npl-tok-masked" value="<?php echo esc_attr($fb['access_token']); ?>" placeholder="Optional: Paste EAA... token for background auto-post" style="flex:1;min-width:200px;">
                                                <button type="button" id="npl-fb-toggle-tok" class="npl-btn npl-btn-secondary" style="padding:8px 12px;font-size:12px;flex-shrink:0;">Show</button>
                                                <button type="button" id="npl-fb-verify-tok-btn" class="npl-btn" style="background:#0f766e;padding:8px 12px;font-size:12px;flex-shrink:0;">Verify &amp; Save</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div class="npl-form-row">
                                        <div class="npl-form-label">Auto-Publish Rules</div>
                                        <div style="display:flex;flex-direction:column;gap:7px;font-size:12px;font-weight:600;padding-top:4px;">
                                            <label><input type="checkbox" name="fb_attach_card_png" value="1" <?php checked(!empty($fb['attach_card_png'])); ?>> Attach Server-Rendered 1200×630 Standings PNG with Graph API posts</label>
                                            <label><input type="checkbox" name="fb_auto_result" value="1" <?php checked(!empty($fb['auto_post_result'])); ?>> Auto-post to Facebook when a Match Result is saved</label>
                                            <label><input type="checkbox" name="fb_auto_table" value="1" <?php checked(!empty($fb['auto_post_table'])); ?>> Append updated Points Table standings to Result post</label>
                                            <label><input type="checkbox" name="fb_auto_news" value="1" <?php checked(!empty($fb['auto_post_news'])); ?>> Auto-post to Facebook when a News Article is published</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <details style="margin:8px 0 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;">
                                <summary style="cursor:pointer;font-size:12px;font-weight:700;color:#1e3a8a;">Need an EAA... Token? Click here for 1-Click Facebook Popup Login OR 30-Second Explorer Guide</summary>
                                <div style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;">
                                    <div>
                                        <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;">Meta App ID (Enables 1-Click Popup Login)</label>
                                        <input type="text" name="fb_app_id" id="npl-fb-app-id" class="npl-form-input" value="<?php echo esc_attr($fb['app_id'] ?? ''); ?>" placeholder="e.g. 123456789012345">
                                    </div>
                                    <div>
                                        <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;">Meta App Secret (Optional — Extends Token to 60 Days)</label>
                                        <input type="text" name="fb_app_secret" id="npl-fb-app-secret" autocomplete="off" spellcheck="false" class="npl-form-input npl-tok-masked" value="<?php echo esc_attr($fb['app_secret'] ?? ''); ?>" placeholder="Optional Meta App Secret">
                                    </div>
                                </div>
                                <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                                    <button type="button" id="npl-fb-js-sdk-btn" class="npl-btn" style="background:#1877F2;font-size:12px;padding:8px 14px;">1-Click Facebook Popup Login (Auto-Fetch Page Token)</button>
                                    <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" class="npl-btn npl-btn-secondary" style="font-size:12px;padding:8px 14px;">Open Meta Graph API Explorer ↗</a>
                                    <button type="submit" name="npl_fb_start_oauth" class="npl-btn npl-btn-secondary" style="font-size:12px;padding:8px 14px;">Server OAuth Redirect Login ↗</button>
                                </div>
                                <p style="margin:8px 0 0;font-size:11px;color:#64748b;">
                                    In Graph API Explorer: pick your Meta App → under <strong>User or Page</strong> select <strong>Get Page Access Token</strong> → add <code>pages_manage_posts</code> &amp; <code>pages_read_engagement</code> → Generate &amp; paste above. (Redirect URI if using Server OAuth: <code><?php echo esc_html($wp_oauth_cb_url); ?></code>)
                                </p>
                            </details>

                            <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                                <button type="submit" name="npl_fb_post_now" id="npl-fb-bottom-publish-btn" class="npl-btn" style="background:#1877F2;">Publish Update to Facebook Page (<?php echo esc_html($fb['page_id']); ?>)</button>
                                <button type="button" id="npl-fb-save-only-btn" class="npl-btn npl-btn-secondary">Save Facebook Settings</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <!-- SHORTCODES PANEL -->
            <div class="npl-panel <?php echo $active_tab === 'shortcodes' ? 'active' : ''; ?>" data-panel="shortcodes">
                <div class="npl-card">
                    <h2>Embed Shortcodes</h2>
                    <p style="color:#475569;">Add either shortcode to any WordPress Page or Post (use Full Width template for best results):</p>
                    <div style="display:grid;gap:14px;margin-top:16px;">
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:18px;border-radius:10px;"><code style="font-size:15px;font-weight:700;color:#1a237e;">[setopress_npl]</code><p style="margin:6px 0 0;color:#64748b;font-size:13px;">Complete NPL League Hub: Header, Live Match Center, Split Hero, Official Points Table with NRR &amp; For/Against, Interactive Team Squad Modal, Fixtures, Results, Orange/Purple Cap Leaders, and Latest News.</p></div>
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:18px;border-radius:10px;"><code style="font-size:15px;font-weight:700;color:#1a237e;">[setopress_npl_news]</code><p style="margin:6px 0 0;color:#64748b;font-size:13px;">Official NPL Media Center with Category dropdown, 8-Franchise filter, and Live Headline Search.</p></div>
                    </div>
                </div>
            </div>
        </div>

        <style>
        .npl-admin-wrap { background: #f8fafc; margin: 12px 20px 20px 2px; padding: 24px; border-radius: 14px; position: relative; z-index: 2; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color-scheme: light; }
        .npl-admin-wrap *, .npl-admin-wrap *::before, .npl-admin-wrap *::after { box-sizing: border-box; }
        .npl-admin-header { background: linear-gradient(135deg, #0d1542 0%, #1a237e 60%, #c8102e 100%); color: white; padding: 26px 30px; border-radius: 12px; margin-bottom: 22px; }
        .npl-admin-header h1 { margin: 0 0 6px; font-size: 24px; font-weight: 800; color: white; }
        .npl-admin-header p { margin: 0; opacity: 0.9; font-size: 13px; }
        .npl-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-bottom: 22px; }
        .npl-stat-card { background: white; padding: 18px; border-radius: 10px; text-align: center; border: 1px solid #e2e8f0; }
        .npl-stat-value { font-size: 28px; font-weight: 800; color: #1a237e; }
        .npl-stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-top: 4px; }
        .npl-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; background: #c8102e; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; text-decoration: none; font-size: 13px; pointer-events: auto; }
        .npl-btn:hover { background: #a50d26; color: white; }
        .npl-btn-secondary { background: #e2e8f0; color: #334155; }
        .npl-btn-secondary:hover { background: #cbd5e1; color: #0f172a; }
        .npl-card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 22px; border: 1px solid #e2e8f0; position: relative; z-index: 2; }
        .npl-card h2 { margin: 0 0 18px; font-size: 17px; color: #0f172a; font-weight: 800; }
        .npl-tabs { display: flex; gap: 4px; background: #e2e8f0; padding: 4px; border-radius: 10px; width: fit-content; margin-bottom: 20px; max-width: 100%; overflow-x: auto; }
        .npl-tab { padding: 9px 18px; background: transparent; border: none; border-radius: 7px; cursor: pointer; font-weight: 700; color: #475569; font-size: 13px; white-space: nowrap; pointer-events: auto; }
        .npl-tab.active { background: white; color: #c8102e; }
        .npl-panel { display: none; }
        .npl-panel.active { display: block; }
        .npl-form-row { display: grid; grid-template-columns: 165px 1fr; gap: 14px; margin-bottom: 14px; align-items: start; }
        .npl-form-label { font-weight: 600; color: #475569; padding-top: 8px; font-size: 13px; }
        .npl-admin-wrap input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="color"]),
        .npl-admin-wrap select,
        .npl-admin-wrap textarea,
        .npl-form-input { width: 100%; min-height: 38px; padding: 8px 12px !important; background-color: #ffffff !important; color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; border: 1px solid #cbd5e1 !important; border-radius: 8px !important; font-size: 13px !important; line-height: 1.4 !important; pointer-events: auto !important; user-select: text !important; -webkit-user-select: text !important; opacity: 1 !important; visibility: visible !important; position: relative; z-index: 2; box-shadow: none !important; }
        .npl-admin-wrap input:focus, .npl-admin-wrap select:focus, .npl-admin-wrap textarea:focus { border-color: #1a237e !important; outline: 2px solid rgba(26, 35, 126, 0.2) !important; }
        .npl-admin-wrap input[type="radio"], .npl-admin-wrap input[type="checkbox"] { pointer-events: auto !important; opacity: 1 !important; visibility: visible !important; cursor: pointer !important; width: 16px !important; height: 16px !important; margin: 0 4px 0 0 !important; display: inline-block !important; vertical-align: middle; }
        .npl-team-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
        .npl-team-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
        .npl-team-logo-preview { width: 44px; height: 44px; border-radius: 8px; object-fit: contain; background: white; padding: 4px; border: 1px solid #cbd5e1; }
        .npl-player-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: white; border-radius: 8px; margin-bottom: 8px; border: 1px solid #e2e8f0; flex-wrap: wrap; }
        .npl-player-number { width: 24px; height: 24px; border-radius: 50%; background: #1a237e; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; flex-shrink: 0; }
        .npl-tok-masked { -webkit-text-security: disc; }
        .npl-live-indicator { display: inline-block; background: #dc2626; color: white; padding: 3px 8px; border-radius: 5px; font-size: 11px; font-weight: 800; }
        @media (max-width: 768px) { .npl-form-row { grid-template-columns: 1fr; } }
        </style>

        <script>
        jQuery(function($){
            function encodeSafeB64(obj) {
                var raw = window.btoa(unescape(encodeURIComponent(JSON.stringify(obj || {}))));
                return raw.split('+').join('-').split('/').join('_').split('=').join('');
            }
            function encodeSquadB64(arr) {
                return encodeSafeB64(arr || []);
            }

            // Inline Quick Result row drawer toggle
            $(document).on('click', '.npl-qr-toggle', function(e){
                e.preventDefault();
                var target = $(this).attr('data-target');
                if (target) {
                    var $row = $(target);
                    $row.toggle();
                    if ($row.is(':visible')) {
                        $row.find('input[name="team1_score"]').trigger('focus');
                    }
                }
            });

            // Facebook HD 1200x630 Broadcast Card Canvas Renderer + Zero-Token & Graph API Helpers
            var fbCanvasKind = 'combined';
            function drawFbBroadcastCard(kind) {
                fbCanvasKind = kind || fbCanvasKind || 'combined';
                var canvas = document.getElementById('npl-fb-canvas');
                var rootEl = document.getElementById('npl-fb-card-root');
                if (!canvas || !canvas.getContext || !rootEl) return;
                var data = {};
                try { data = JSON.parse(rootEl.getAttribute('data-canvas') || '{}'); } catch (err) { data = {}; }
                var ctx = canvas.getContext('2d');
                var W = 1200, H = 630;
                canvas.width = W; canvas.height = H;

                var grad = ctx.createLinearGradient(0, 0, W, H);
                grad.addColorStop(0, '#0b133b');
                grad.addColorStop(0.58, '#1a237e');
                grad.addColorStop(1, '#880e25');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, W, H);

                ctx.fillStyle = '#c8102e';
                ctx.fillRect(0, 0, W, 8);

                var season = data.season || '2026';
                var sTitle = String(data.seriesName || 'NEPAL PREMIER LEAGUE').toUpperCase();
                var sCode  = String(data.seriesCode || 'NPL');
                ctx.fillStyle = '#5eead4';
                ctx.font = '700 18px sans-serif';
                ctx.fillText(sTitle + ' ' + season + ' · OFFICIAL BROADCAST UPDATE', 48, 56);

                ctx.fillStyle = '#ffffff';
                ctx.font = '800 34px sans-serif';
                var headline = sCode + ' ' + season + ' Results & Standings';
                if (fbCanvasKind === 'news' && data.news && data.news.title) headline = String(data.news.title).slice(0, 56);
                else if (fbCanvasKind === 'table') headline = 'Official ' + sCode + ' ' + season + ' Points Table Standings';
                else if (data.match && data.match.team1) headline = data.match.team1 + ' vs ' + data.match.team2;
                ctx.fillText(headline, 48, 102);

                ctx.fillStyle = 'rgba(255,255,255,0.09)';
                ctx.fillRect(48, 132, 480, 444);
                ctx.strokeStyle = 'rgba(255,255,255,0.18)';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(48, 132, 480, 444);

                if (fbCanvasKind === 'news' && data.news) {
                    ctx.fillStyle = '#fda4af';
                    ctx.font = '700 16px monospace';
                    ctx.fillText('LATEST NEWS · ' + (data.news.date || ''), 74, 174);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '700 24px sans-serif';
                    var words = String(data.news.title || '').split(' ');
                    var line = '', y = 220;
                    for (var wi = 0; wi < words.length; wi++) {
                        var test = line ? (line + ' ' + words[wi]) : words[wi];
                        if (ctx.measureText(test).width > 420) {
                            ctx.fillText(line, 74, y);
                            line = words[wi];
                            y += 34;
                        } else { line = test; }
                    }
                    if (line) ctx.fillText(line, 74, y);
                } else if (data.match) {
                    var m = data.match;
                    ctx.fillStyle = '#fde68a';
                    ctx.font = '700 16px monospace';
                    ctx.fillText((m.match_no || 'MATCH RESULT') + ' · ' + (m.date || ''), 74, 174);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '700 24px sans-serif';
                    ctx.fillText(m.team1 || '', 74, 232);
                    ctx.fillStyle = '#5eead4';
                    ctx.font = '700 26px monospace';
                    ctx.fillText((m.team1_score || '-') + (m.team1_overs ? ' (' + m.team1_overs + ' ov)' : ''), 74, 268);
                    ctx.fillStyle = 'rgba(255,255,255,0.5)';
                    ctx.font = '600 16px sans-serif';
                    ctx.fillText('VS', 74, 312);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '700 24px sans-serif';
                    ctx.fillText(m.team2 || '', 74, 354);
                    ctx.fillStyle = '#5eead4';
                    ctx.font = '700 26px monospace';
                    ctx.fillText((m.team2_score || '-') + (m.team2_overs ? ' (' + m.team2_overs + ' ov)' : ''), 74, 390);
                    ctx.fillStyle = 'rgba(16,185,129,0.22)';
                    ctx.fillRect(74, 434, 428, 64);
                    ctx.fillStyle = '#a7f3d0';
                    ctx.font = '700 18px sans-serif';
                    ctx.fillText(String(m.summary || '').slice(0, 44), 90, 473);
                    ctx.fillStyle = '#cbd5e1';
                    ctx.font = '500 15px sans-serif';
                    ctx.fillText(m.venue || 'TU Cricket Ground, Kirtipur', 74, 540);
                }

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(556, 132, 596, 444);
                ctx.fillStyle = '#0f172a';
                ctx.font = '800 18px sans-serif';
                ctx.fillText('OFFICIAL POINTS TABLE (TOP 4 PLAYOFFS)', 580, 168);
                ctx.fillStyle = '#64748b';
                ctx.font = '700 13px monospace';
                ctx.fillText('#  FRANCHISE', 580, 198);
                ctx.fillText('P   W   L   PTS    NRR', 945, 198);

                var rows = data.table || [];
                for (var ri = 0; ri < rows.length && ri < 8; ri++) {
                    var r = rows[ri];
                    var ry = 238 + ri * 42;
                    if (ri < 4) {
                        ctx.fillStyle = 'rgba(20,184,166,0.09)';
                        ctx.fillRect(572, ry - 24, 564, 36);
                    }
                    ctx.fillStyle = ri < 4 ? '#0f766e' : '#475569';
                    ctx.font = '700 15px monospace';
                    ctx.fillText(String(ri + 1), 582, ry);
                    ctx.fillStyle = '#0f172a';
                    ctx.font = '700 16px sans-serif';
                    ctx.fillText(String(r.name || '').slice(0, 22), 612, ry);
                    ctx.fillStyle = '#334155';
                    ctx.font = '700 15px monospace';
                    var pStr = String(r.p || 0); if (pStr.length < 2) pStr = ' ' + pStr;
                    var wStr = String(r.w || 0); if (wStr.length < 2) wStr = ' ' + wStr;
                    var lStr = String(r.l || 0); if (lStr.length < 2) lStr = ' ' + lStr;
                    var ptStr = String(r.pts || 0); while (ptStr.length < 3) ptStr = ' ' + ptStr;
                    var nrrNum = Number(r.nrr || 0);
                    var nrrStr = (nrrNum >= 0 ? '+' : '') + nrrNum.toFixed(3);
                    ctx.fillText(pStr + '  ' + wStr + '  ' + lStr + '  ' + ptStr + '  ' + nrrStr, 938, ry);
                }

                ctx.fillStyle = 'rgba(255,255,255,0.78)';
                ctx.font = '600 14px monospace';
                ctx.fillText('facebook.com/profile.php?id=' + (data.pageId || '61590852571494') + ' · SetoPress NPL Hub', 48, 608);
            }
            drawFbBroadcastCard('combined');

            function downloadFbCardPng() {
                var canvas = document.getElementById('npl-fb-canvas');
                if (!canvas || !canvas.toDataURL) return;
                var a = document.createElement('a');
                a.href = canvas.toDataURL('image/png');
                a.download = 'npl-' + fbCanvasKind + '-facebook-card.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }

            $(document).on('click', '.npl-fb-tpl', function(){
                var kind = $(this).attr('data-kind') || 'combined';
                $('#npl-fb-composer').val($(this).attr('data-tpl') || '').trigger('focus');
                drawFbBroadcastCard(kind);
            });

            $('#npl-fb-dl-card').on('click', function(){
                drawFbBroadcastCard(fbCanvasKind);
                downloadFbCardPng();
            });

            function showFbBanner(kind, htmlMsg) {
                var $b = $('#npl-fb-live-banner');
                if (!$b.length) return;
                if (kind === 'err') {
                    $b.css({ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b' });
                } else {
                    $b.css({ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46' });
                }
                $b.html(htmlMsg).fadeIn(150);
                $('html, body').animate({ scrollTop: Math.max(0, $b.offset().top - 90) }, 220);
            }

            function copyComposerTextSync(txt) {
                var ok = false;
                try {
                    var ta = document.createElement('textarea');
                    ta.value = txt;
                    ta.setAttribute('readonly', '');
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.focus();
                    ta.select();
                    ok = document.execCommand('copy');
                    document.body.removeChild(ta);
                } catch (err) { ok = false; }
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(txt).catch(function(){});
                    ok = true;
                }
                return ok;
            }

            function runZeroTokenInstantPublish() {
                var txt = $('#npl-fb-composer').val() || '';
                copyComposerTextSync(txt);
                drawFbBroadcastCard(fbCanvasKind);
                downloadFbCardPng();
                $('#npl-fb-copy-toast').fadeIn(150).delay(4000).fadeOut(300);
                var pid = $.trim($('#npl-fb-page-id').val() || '61590852571494') || '61590852571494';
                var pgUrl = 'https://www.facebook.com/profile.php?id=' + encodeURIComponent(pid);
                window.open(pgUrl, '_blank');
                showFbBanner(
                    'ok',
                    '✓ Ready on Facebook Page (' + escapeHtml(pid) + ')! Your NPL post caption is copied to clipboard &amp; the 1200×630 HD Broadcast Card PNG has downloaded — press <code>Ctrl+V</code> (Paste) and drop the downloaded PNG onto your open <a href="' + escapeHtml(pgUrl) + '" target="_blank" rel="noopener noreferrer" style="color:#047857;text-decoration:underline;">Facebook Page tab ↗</a> to publish right now!'
                );
            }

            function collectFbAjaxPayload(opName) {
                return {
                    op: opName,
                    kind: fbCanvasKind,
                    message: $('#npl-fb-composer').val() || '',
                    fb_settings_present: 1,
                    fb_page_id: $.trim($('#npl-fb-page-id').val() || '61590852571494'),
                    fb_site_hub_url: $.trim($('#npl-fb-hub-url').val() || ''),
                    fb_access_token: $.trim($('#npl-fb-token-input').val() || ''),
                    fb_app_id: $.trim($('#npl-fb-app-id').val() || ''),
                    fb_app_secret: $.trim($('#npl-fb-app-secret').val() || ''),
                    fb_attach_card_png: $('input[name="fb_attach_card_png"]').is(':checked') ? 1 : 0,
                    fb_auto_result: $('input[name="fb_auto_result"]').is(':checked') ? 1 : 0,
                    fb_auto_table: $('input[name="fb_auto_table"]').is(':checked') ? 1 : 0,
                    fb_auto_news: $('input[name="fb_auto_news"]').is(':checked') ? 1 : 0
                };
            }

            function sendFbAjax(opName, $btn) {
                var $wrap = $('.npl-admin-wrap');
                var ajaxUrl = $wrap.attr('data-ajax');
                var nonce = $wrap.attr('data-nonce');
                if (!ajaxUrl || !nonce) return false;
                var origTxt = $btn ? $btn.text() : '';
                if ($btn) $btn.prop('disabled', true).text('Working...');
                var b64 = encodeSafeB64(collectFbAjaxPayload(opName));
                $.post(ajaxUrl, {
                    action: 'sp659_admin_save',
                    nonce: nonce,
                    payload_b64: b64
                }).done(function(res){
                    if ($btn) $btn.prop('disabled', false).text(origTxt);
                    if (res && res.success && res.data) {
                        if (res.data.token) {
                            $('#npl-fb-token-input').val(res.data.token);
                        }
                        if (res.data.page_id) {
                            $('#npl-fb-page-id').val(res.data.page_id);
                        }
                        var extraLink = res.data.page_url
                            ? ' <a href="' + escapeHtml(res.data.page_url) + '" target="_blank" rel="noopener noreferrer" style="color:#047857;text-decoration:underline;">View Facebook Page ↗</a>'
                            : '';
                        showFbBanner('ok', '✓ ' + escapeHtml(res.data.message || 'Saved!') + extraLink);
                    } else if (res && res.data && res.data.needs_token) {
                        runZeroTokenInstantPublish();
                    } else {
                        var errMsg = (res && res.data && res.data.message) ? res.data.message : 'Graph API returned an error.';
                        showFbBanner('err', 'Facebook Graph API Error: ' + escapeHtml(errMsg) + ' — Click <strong>Copy Post + Download HD Card &amp; Open Page</strong> to publish immediately while checking token permissions.');
                    }
                }).fail(function(){
                    if ($btn) $btn.prop('disabled', false).text(origTxt);
                    runZeroTokenInstantPublish();
                });
                return true;
            }

            $('#npl-fb-zero-token-btn').on('click', function(e){
                e.preventDefault();
                runZeroTokenInstantPublish();
            });

            $('#npl-fb-smart-publish-btn').on('click', function(e){
                e.preventDefault();
                var tok = $.trim($('#npl-fb-token-input').val() || '');
                if (!tok) {
                    runZeroTokenInstantPublish();
                    return;
                }
                sendFbAjax('fb_save_and_publish', $(this));
            });

            $('#npl-fb-verify-tok-btn, #npl-fb-save-only-btn').on('click', function(e){
                e.preventDefault();
                sendFbAjax('fb_save_settings', $(this));
            });

            $('#npl-fb-unified-form').on('submit', function(e){
                var subEl = document.activeElement;
                if (subEl && subEl.name === 'npl_fb_start_oauth') {
                    return true;
                }
                e.preventDefault();
                var tok = $.trim($('#npl-fb-token-input').val() || '');
                if (!tok) {
                    runZeroTokenInstantPublish();
                    return false;
                }
                sendFbAjax('fb_save_and_publish', $('#npl-fb-bottom-publish-btn'));
                return false;
            });

            $('#npl-fb-sharer-btn').on('click', function(){
                var hubUrl = ($('#npl-fb-hub-url').val() || window.location.origin).trim();
                var quote = ($('#npl-fb-composer').val() || '').slice(0, 480);
                window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(hubUrl) + '&quote=' + encodeURIComponent(quote), '_blank', 'width=640,height=680');
            });

            $('#npl-fb-toggle-tok').on('click', function(){
                var $inp = $('#npl-fb-token-input');
                var masked = $inp.hasClass('npl-tok-masked');
                $inp.toggleClass('npl-tok-masked', !masked);
                $(this).text(masked ? 'Hide' : 'Show');
            });

            $('#npl-fb-token-input').on('input', function(){
                var hasTok = $.trim($(this).val() || '') !== '';
                var pid = $.trim($('#npl-fb-page-id').val() || '61590852571494') || '61590852571494';
                $('#npl-fb-smart-publish-btn').text(
                    hasTok
                        ? ('Auto-Publish via Meta Graph API (' + pid + ')')
                        : ('Publish to Facebook Page (' + pid + ') — Copy + HD Card ↗')
                );
            });

            $('#npl-fb-js-sdk-btn').on('click', function(){
                var appId = $.trim($('#npl-fb-app-id').val() || '');
                if (!appId) {
                    showFbBanner('err', 'Enter your Meta App ID right above first to open the 1-Click Facebook Login popup (or paste an EAA... token directly).');
                    $('#npl-fb-app-id').trigger('focus');
                    return;
                }
                var $btn = $(this);
                $btn.prop('disabled', true).text('Opening Facebook Popup...');
                function launchFbLogin() {
                    window.FB.init({ appId: appId, cookie: true, xfbml: false, version: 'v21.0' });
                    window.FB.login(function(resp){
                        if (!resp || !resp.authResponse || !resp.authResponse.accessToken) {
                            $btn.prop('disabled', false).text('1-Click Facebook Popup Login (Auto-Fetch Page Token)');
                            showFbBanner('err', 'Facebook popup login was cancelled or permissions were not granted.');
                            return;
                        }
                        var userTok = resp.authResponse.accessToken;
                        $('#npl-fb-token-input').val(userTok).trigger('input');
                        $btn.prop('disabled', false).text('1-Click Facebook Popup Login (Auto-Fetch Page Token)');
                        sendFbAjax('fb_save_settings', $('#npl-fb-verify-tok-btn'));
                    }, { scope: 'pages_show_list,pages_read_engagement,pages_manage_posts' });
                }
                if (window.FB && window.FB.login) {
                    launchFbLogin();
                } else {
                    var s = document.createElement('script');
                    s.src = 'https://connect.facebook.net/en_US/sdk.js';
                    s.async = true;
                    s.onload = launchFbLogin;
                    s.onerror = function(){
                        $btn.prop('disabled', false).text('1-Click Facebook Popup Login (Auto-Fetch Page Token)');
                        showFbBanner('err', 'Browser ad-blocker prevented connect.facebook.net from loading. Allow Facebook scripts or paste an EAA... token from Graph API Explorer.');
                    };
                    document.head.appendChild(s);
                }
            });

            // Toggle Live Scorecard & Ball-by-Ball Scorer box when Match Status radio changes
            $('#npl-match-form').on('change', 'input[name="match_status"]', function(){
                var isLiveMode = $('input[name="match_status"]:checked').val() === 'live';
                $('#npl-live-scorer-box').toggle(isLiveMode);
            });

            // Quick +Ball token buttons in WP Admin Live Scorer
            $(document).on('click', '.npl-add-ball-tok', function(e){
                e.preventDefault();
                var tok = $(this).attr('data-tok') || '•';
                var $inp = $('#npl-live-overs-input');
                var cur = $.trim($inp.val() || '');
                if (!cur) {
                    $inp.val(tok);
                    return;
                }
                var parts = cur.split('|');
                parts[0] = $.trim(parts[0]) + ' ' + tok;
                $inp.val(parts.join(' | '));
            });

            // Auto-switch Upcoming Fixture -> Completed Result when scores/winner/result typed
            $('#npl-match-form').on('input change', 'input[name="team1_score"], input[name="team2_score"], input[name="result_text"]', function(){
                if ($(this).val() && $('input[name="match_status"]:checked').val() === 'fixture') {
                    $('input[name="match_status"][value="completed"]').prop('checked', true);
                }
            });

            // WAF-safe AJAX Match, Quick Result & Editorial News Save (with native HTMLFormElement.submit fallback)
            $('#npl-match-form, .npl-quick-result-form, #npl-news-form').on('submit', function(e){
                var $form = $(this);
                var opType = $form.attr('id') === 'npl-news-form' ? 'save_news' : ($form.hasClass('npl-quick-result-form') ? 'quick_result' : 'save_match');
                var payload = { op: opType };
                $form.serializeArray().forEach(function(item){
                    if (item.name !== 'payload_b64') payload[item.name] = item.value;
                });
                if (opType !== 'save_news' && payload.team1 && payload.team2 && String(payload.team1).toLowerCase() === String(payload.team2).toLowerCase()) {
                    e.preventDefault();
                    window.alert('Please choose two different NPL franchises (Team 1 and Team 2 cannot be identical).');
                    return false;
                }
                var b64 = encodeSafeB64(payload);
                $form.find('input[name="payload_b64"]').val(b64);

                var $wrap = $('.npl-admin-wrap');
                var ajaxUrl = $wrap.attr('data-ajax');
                var nonce = $wrap.attr('data-nonce');
                if (!ajaxUrl || !nonce) return true;

                e.preventDefault();
                var $btn = $form.find('button[type="submit"]');
                var origText = $btn.text();
                $btn.prop('disabled', true).text('Saving...');
                $.post(ajaxUrl, {
                    action: 'sp659_admin_save',
                    nonce: nonce,
                    payload_b64: b64
                }).done(function(res){
                    if (res && res.success && res.data && res.data.redirect) {
                        window.location.href = res.data.redirect;
                    } else if (res && res.success === false && res.data && res.data.message) {
                        $btn.prop('disabled', false).text(origText);
                        window.alert(res.data.message);
                    } else {
                        HTMLFormElement.prototype.submit.call($form[0]);
                    }
                }).fail(function(){
                    HTMLFormElement.prototype.submit.call($form[0]);
                });
            });

            function syncWinnerDropdown() {
                var t1 = $('#npl-match-t1').val() || '';
                var t2 = $('#npl-match-t2').val() || '';
                var $win = $('#npl-match-winner');
                if (!$win.length) return;
                var cur = $win.val() || $win.attr('data-current') || '';
                $win.empty();
                $win.append($('<option>', { value: '', text: 'Auto-detect from Scores (or Upcoming Fixture if scores empty)' }));
                if (t1) $win.append($('<option>', { value: t1, text: t1 + ' (2 pts)' }));
                if (t2 && t2 !== t1) $win.append($('<option>', { value: t2, text: t2 + ' (2 pts)' }));
                $win.append($('<option>', { value: 'Tie', text: 'Tie (1 pt each)' }));
                $win.append($('<option>', { value: 'NR', text: 'No Result / Abandoned (1 pt each)' }));
                if (cur) $win.val(cur);
            }
            $('#npl-match-t1, #npl-match-t2').on('change', function(){
                $('#npl-match-winner').attr('data-current', '');
                syncWinnerDropdown();
            });
            $('#npl-match-winner').on('change', function(){
                if ($(this).val() !== '') {
                    $('input[name="match_status"][value="completed"]').prop('checked', true);
                }
            });
            syncWinnerDropdown();

            $(document).on('click', '.npl-up', function(e){
                e.preventDefault();
                if (typeof wp === 'undefined' || !wp.media) { alert('WordPress Media Library not available.'); return; }
                var w = $(this).closest('.npl-upw');
                var f = wp.media({title: 'Select Image', button: {text: 'Use Image'}, library: {type: 'image'}, multiple: false});
                f.on('select', function(){
                    var u = f.state().get('selection').first().toJSON().url;
                    w.find('.npl-lv, .npl-p-photo').val(u);
                    w.find('.npl-lp').attr('src', u).show();
                    w.find('.npl-rm').show();
                    if (currentTeamIdx !== null) saveCurrentTeamPlayers();
                });
                f.open();
            });

            $(document).on('click', '.npl-rm', function(e){
                e.preventDefault();
                var w = $(this).closest('.npl-upw');
                w.find('.npl-lv, .npl-p-photo').val('');
                w.find('.npl-lp').attr('src', '').hide();
                $(this).hide();
                if (currentTeamIdx !== null) saveCurrentTeamPlayers();
            });

            $(document).on('click', '.npl-use-npl-logo', function(e){
                e.preventDefault();
                var w = $(this).closest('.npl-upw');
                var tok = $(this).attr('data-logo') || 'builtin:npl_logo';
                var prev = $(this).attr('data-preview') || '';
                w.find('.npl-lv').val(tok);
                if (prev) w.find('.npl-lp').attr('src', prev).show();
                w.find('.npl-rm').show();
            });

            $(document).on('click', '.npl-jump-series-tab', function(e){
                e.preventDefault();
                $('.npl-tab[data-tab="series"]').trigger('click');
            });

            $('.npl-tab').on('click', function(){
                var tab = $(this).data('tab');
                $('.npl-tab').removeClass('active');
                $('.npl-panel').removeClass('active');
                $(this).addClass('active');
                $('[data-panel="' + tab + '"]').addClass('active');
                $('#npl-switch-return-tab').val(tab);
                if (tab === 'facebook') drawFbBroadcastCard(fbCanvasKind);
            });

            var teamList = <?php echo wp_json_encode(array_values(array_map(function($k, $v) {
                return array('name' => $k, 'players' => $v['players'] ?? array());
            }, array_keys($teams), $teams))); ?>;
            var currentTeamIdx = null;

            function escapeHtml(s){
                return String(s || '').replace(/[&<>"']/g, function(c){
                    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
                });
            }

            function renderPlayerRow(i, p) {
                var roles = ['Captain', 'Vice-captain', 'Marquee Player', 'Batsman', 'Allrounder', 'Bowler', 'Wicketkeeper'];
                var opts = roles.map(function(r){
                    return '<option value="' + r + '"' + (p.role === r ? ' selected' : '') + '>' + r + '</option>';
                }).join('');
                var photo = p.photo || '';
                var runs = parseInt(p.runs || 0, 10) || 0;
                var wkts = parseInt(p.wickets || 0, 10) || 0;
                return '<div class="npl-player-row npl-player-row-data">' +
                    '<span class="npl-player-number">' + (i + 1) + '</span>' +
                    '<input type="text" class="npl-p-name npl-form-input" value="' + escapeHtml(p.name) + '" placeholder="Player Name" style="flex:2;min-width:150px;">' +
                    '<select class="npl-p-role npl-form-input" style="flex:1;min-width:130px;">' + opts + '</select>' +
                    '<input type="number" class="npl-p-runs npl-form-input" value="' + runs + '" placeholder="Runs" title="Tournament Runs" style="width:80px;">' +
                    '<input type="number" class="npl-p-wkts npl-form-input" value="' + wkts + '" placeholder="Wkts" title="Tournament Wickets" style="width:80px;">' +
                    '<span class="npl-upw" style="display:inline-flex;align-items:center;gap:6px;">' +
                    '<input type="hidden" class="npl-lv npl-p-photo" value="' + escapeHtml(photo) + '">' +
                    '<img class="npl-lp" src="' + escapeHtml(photo) + '" style="' + (photo ? 'width:32px;height:32px;object-fit:cover;border-radius:50%;' : 'display:none;width:32px;height:32px;object-fit:cover;border-radius:50%;') + '">' +
                    '<button type="button" class="npl-btn npl-btn-secondary npl-up" style="font-size:11px;padding:5px 8px;">Photo</button>' +
                    '</span>' +
                    '<button type="button" class="npl-btn npl-btn-secondary npl-rm-player" style="padding:5px 10px;color:#dc2626;">✕</button>' +
                    '</div>';
            }

            function saveCurrentTeamPlayers() {
                if (currentTeamIdx === null) return;
                var players = [];
                $('#npl-player-list .npl-player-row-data').each(function(){
                    var name  = $(this).find('.npl-p-name').val().trim();
                    var role  = $(this).find('.npl-p-role').val();
                    var runs  = parseInt($(this).find('.npl-p-runs').val() || '0', 10) || 0;
                    var wkts  = parseInt($(this).find('.npl-p-wkts').val() || '0', 10) || 0;
                    var photo = $(this).find('.npl-p-photo').val();
                    if (name) players.push({name: name, role: role, runs: runs, wickets: wkts, photo: photo});
                });
                teamList[currentTeamIdx].players = players;
                $('#npl-team-card-' + currentTeamIdx).find('.npl-players-b64').val(encodeSquadB64(players));
                var $opt = $('#npl-player-team-select option').eq(currentTeamIdx + 1);
                if ($opt.length) {
                    $opt.text($opt.text().split(' (')[0] + ' (' + players.length + ' players)');
                }
                $('#npl-player-count').text(players.length + ' player' + (players.length !== 1 ? 's' : ''));
            }

            $('#npl-player-team-select').on('change', function(){
                var idx = $(this).val();
                $('.npl-team-card').hide();
                if (idx === '' || idx === null) { $('#npl-player-panel').hide(); currentTeamIdx = null; return; }
                currentTeamIdx = parseInt(idx, 10);
                $('#npl-team-card-' + currentTeamIdx).show();
                var team = teamList[currentTeamIdx];
                $('#npl-player-team-title').text(team.name);
                var $list = $('#npl-player-list').empty();
                var players = team.players || [];
                if (!players.length) $('#npl-no-players').show();
                else {
                    $('#npl-no-players').hide();
                    players.forEach(function(p, i){ $list.append(renderPlayerRow(i, p)); });
                }
                $('#npl-player-count').text(players.length + ' player' + (players.length !== 1 ? 's' : ''));
                $('#npl-player-panel').show();
            });

            $('#npl-add-player-btn').on('click', function(){
                if (currentTeamIdx === null) return;
                var name = $('#npl-new-player-name').val().trim();
                var role = $('#npl-new-player-role').val();
                var runs = parseInt($('#npl-new-player-runs').val() || '0', 10) || 0;
                var wkts = parseInt($('#npl-new-player-wkts').val() || '0', 10) || 0;
                if (!name) { $('#npl-new-player-name').focus(); return; }
                var i = $('#npl-player-list .npl-player-row-data').length;
                $('#npl-player-list').append(renderPlayerRow(i, {name: name, role: role, runs: runs, wickets: wkts, photo: ''}));
                $('#npl-new-player-name').val('').focus();
                $('#npl-new-player-runs').val('');
                $('#npl-new-player-wkts').val('');
                $('#npl-no-players').hide();
                saveCurrentTeamPlayers();
            });

            $(document).on('click', '.npl-rm-player', function(){
                if (currentTeamIdx === null) return;
                $(this).closest('.npl-player-row-data').remove();
                $('#npl-player-list .npl-player-row-data').each(function(i){ $(this).find('.npl-player-number').text(i + 1); });
                saveCurrentTeamPlayers();
            });

            $(document).on('input change', '.npl-p-name, .npl-p-role, .npl-p-runs, .npl-p-wkts', function(){
                if (currentTeamIdx !== null) saveCurrentTeamPlayers();
            });
            $('#npl-series-form').on('submit', function(){ saveCurrentTeamPlayers(); });
        });
        </script>
        <?php
    }
}

/* ─────────────────────────────────────────────────────────
   6. EDITORIAL NEWSROOM & FRONTEND HUB RENDERER
   ───────────────────────────────────────────────────────── */
if (!function_exists('sp659_format_ed_date')) {
    function sp659_format_ed_date($iso) {
        if (empty($iso)) return '';
        $ts = strtotime($iso);
        if (!$ts) return $iso;
        return date('M j, Y', $ts);
    }
}

if (!function_exists('sp659_news_cat_label')) {
    function sp659_news_cat_label($cat) {
        if ($cat === 'match') return 'Match Report';
        if ($cat === 'update') return 'League Update';
        return 'Press Release';
    }
}

if (!function_exists('sp659_news_read_mins')) {
    function sp659_news_read_mins($n) {
        $blob = trim(($n['title'] ?? '') . ' ' . ($n['excerpt'] ?? '') . ' ' . ($n['content'] ?? '') . ' ' . ($n['quote'] ?? ''));
        $words = str_word_count(wp_strip_all_tags($blob));
        return max(1, (int)round($words / 160));
    }
}

if (!function_exists('sp659_render_news_visual')) {
    function sp659_render_news_visual($item, $info, $extra_class = '') {
        $teams  = $info['teams'] ?? array();
        $season = $info['season'] ?? '2026';
        $sr_nm  = $item['series'] ?? ($info['name'] ?? SP659_NPL_SERIES);
        $sr_lg  = sp659_series_logo($info);
        $is_wide_sr_lg = sp659_is_wide_logo($sr_lg);
        $t1_raw = trim($item['team1'] ?? '');
        $t2_raw = trim($item['team2'] ?? '');
        $t1     = $t1_raw !== '' ? sp659_canonical_team($teams, $t1_raw) : '';
        $t2     = $t2_raw !== '' ? sp659_canonical_team($teams, $t2_raw) : '';
        $c1     = $t1 !== '' ? sp659_team_color($info, $t1) : '#1e3a8a';
        $c2     = $t2 !== '' ? sp659_team_color($info, $t2) : (($item['category'] ?? '') === 'press' ? '#991b1b' : '#0f766e');
        $img    = sp659_resolve_news_image($item);
        $gid    = 'spg_' . preg_replace('/[^a-zA-Z0-9]/', '', $item['id'] ?? uniqid());

        ob_start();
        ?>
        <div class="sp-ed-visual <?php echo esc_attr($extra_class); ?>">
            <?php if ($img !== '') : ?>
            <img class="sp-ed-photo" src="<?php echo sp659_esc_img($img); ?>" alt="<?php echo esc_attr($item['title'] ?? ''); ?>" referrerpolicy="no-referrer" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';">
            <?php endif; ?>
            <div class="sp-ed-art" style="<?php echo $img !== '' ? 'display:none;' : 'display:flex;'; ?>">
                <svg class="sp-ed-art-bg" viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                    <defs>
                        <linearGradient id="<?php echo esc_attr($gid); ?>" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="<?php echo esc_attr($c1); ?>" stop-opacity="0.92"/>
                            <stop offset="52%" stop-color="#0b1338" stop-opacity="0.96"/>
                            <stop offset="100%" stop-color="<?php echo esc_attr($c2); ?>" stop-opacity="0.9"/>
                        </linearGradient>
                    </defs>
                    <rect width="640" height="400" fill="url(#<?php echo esc_attr($gid); ?>)"/>
                    <path d="M0 315 L88 262 L156 286 L248 224 L328 268 L418 210 L512 258 L586 232 L640 264 L640 400 L0 400 Z" fill="rgba(255,255,255,0.045)"/>
                    <g stroke="rgba(255,255,255,0.16)" stroke-width="1.5" fill="none">
                        <line x1="94" y1="84" x2="82" y2="176"/><rect x="78" y="68" width="28" height="16" rx="2" fill="rgba(255,255,255,0.14)"/>
                        <line x1="546" y1="84" x2="558" y2="176"/><rect x="534" y="68" width="28" height="16" rx="2" fill="rgba(255,255,255,0.14)"/>
                    </g>
                    <ellipse cx="320" cy="222" rx="250" ry="125" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="1.5"/>
                    <ellipse cx="320" cy="222" rx="165" ry="82" fill="none" stroke="rgba(255,255,255,0.06)" stroke-dasharray="5 5" stroke-width="1.2"/>
                    <rect x="298" y="164" width="44" height="116" rx="3" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
                </svg>
                <div class="sp-ed-art-fg">
                    <?php if ($t1 !== '' && $t2 !== '') :
                        $sc1 = $teams[$t1]['shortCode'] ?? strtoupper(substr($t1, 0, 3));
                        $sc2 = $teams[$t2]['shortCode'] ?? strtoupper(substr($t2, 0, 3));
                    ?>
                        <div style="display:flex;align-items:center;gap:22px;justify-content:center;">
                            <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                                <img src="<?php echo sp659_esc_img(sp659_logo($info, $t1)); ?>" alt="" style="width:58px;height:58px;border-radius:50%;background:#ffffff;padding:5px;object-fit:contain;box-shadow:0 4px 12px rgba(0,0,0,0.25);">
                                <span class="sp-npl-mono" style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.9);"><?php echo esc_html($sc1); ?></span>
                            </div>
                            <span class="sp-ed-serif" style="font-style:italic;font-size:18px;color:rgba(255,255,255,0.72);">vs</span>
                            <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                                <img src="<?php echo sp659_esc_img(sp659_logo($info, $t2)); ?>" alt="" style="width:58px;height:58px;border-radius:50%;background:#ffffff;padding:5px;object-fit:contain;box-shadow:0 4px 12px rgba(0,0,0,0.25);">
                                <span class="sp-npl-mono" style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:rgba(255,255,255,0.9);"><?php echo esc_html($sc2); ?></span>
                            </div>
                        </div>
                        <div style="margin-top:10px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.72);font-weight:700;"><?php echo esc_html($sr_nm . ' ' . $season); ?></div>
                    <?php elseif ($t1 !== '') : ?>
                        <img src="<?php echo sp659_esc_img(sp659_logo($info, $t1)); ?>" alt="" style="width:62px;height:62px;border-radius:50%;background:#ffffff;padding:5px;object-fit:contain;box-shadow:0 4px 12px rgba(0,0,0,0.25);">
                        <div style="margin-top:10px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;"><?php echo esc_html($t1); ?></div>
                        <div style="margin-top:2px;font-size:11px;color:rgba(255,255,255,0.68);"><?php echo esc_html($sr_nm . ' ' . $season); ?> Dispatch</div>
                    <?php else : ?>
                        <?php if ($is_wide_sr_lg) : ?>
                        <span style="display:inline-flex;align-items:center;justify-content:center;background:#ffffff;border-radius:10px;padding:6px 14px;box-shadow:0 4px 12px rgba(0,0,0,0.25);">
                            <img src="<?php echo sp659_esc_img($sr_lg); ?>" alt="" style="height:36px;width:auto;max-width:140px;object-fit:contain;border-radius:0;">
                        </span>
                        <?php else : ?>
                        <img src="<?php echo sp659_esc_img($sr_lg); ?>" alt="" style="width:62px;height:62px;border-radius:50%;background:rgba(255,255,255,0.96);padding:5px;object-fit:contain;box-shadow:0 4px 12px rgba(0,0,0,0.25);">
                        <?php endif; ?>
                        <div style="margin-top:12px;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.88);">Official <?php echo esc_html($sr_nm . ' ' . $season); ?> Dispatch</div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
}

if (!function_exists('sp659_render_news_filter_bar')) {
    function sp659_render_news_filter_bar($teams, $extra_class = '', $series_list = array()) {
        ob_start();
        ?>
        <div class="sp-news-filter-bar <?php echo esc_attr($extra_class); ?>">
            <div class="sp-news-cat-tabs">
                <button type="button" class="sp-news-cat-btn active" data-cat="all">All Stories</button>
                <button type="button" class="sp-news-cat-btn" data-cat="match">Match Reports</button>
                <button type="button" class="sp-news-cat-btn" data-cat="press">Press Releases</button>
                <button type="button" class="sp-news-cat-btn" data-cat="update">League Updates</button>
            </div>
            <div class="sp-news-filter-inputs">
                <?php if (!empty($series_list) && count($series_list) > 1) : ?>
                <select class="sp-news-series">
                    <option value="all">All <?php echo (int)count($series_list); ?> Series</option>
                    <?php $s_idx = 1; foreach ($series_list as $sr_key) : ?>
                    <option value="<?php echo esc_attr($sr_key); ?>"><?php echo esc_html(sprintf('%02d. %s', $s_idx++, $sr_key)); ?></option>
                    <?php endforeach; ?>
                </select>
                <?php endif; ?>
                <select class="sp-news-team">
                    <option value="all">All <?php echo count($teams) ?: 8; ?> Teams</option>
                    <?php foreach ($teams as $tn => $t) : ?>
                    <option value="<?php echo esc_attr($tn); ?>"><?php echo esc_html($tn); ?></option>
                    <?php endforeach; ?>
                </select>
                <input type="search" class="sp-news-search" placeholder="Search headlines, players, venues...">
                <button type="button" class="sp-news-clear-btn" style="display:none;">Clear</button>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
}

if (!function_exists('sp659_build_news_payload')) {
    function sp659_build_news_payload($sorted_news, $info, $series_map = array()) {
        $out = array();
        foreach ($sorted_news as $n) {
            $id = $n['id'] ?? '';
            if ($id === '') continue;
            $n_sr = $n['series'] ?? ($info['name'] ?? SP659_NPL_SERIES);
            $n_info = (!empty($series_map) && isset($series_map[$n_sr])) ? $series_map[$n_sr] : $info;
            $season = $n_info['season'] ?? '2026';
            $venue_lbl = $n_info['venue'] ?? 'Tribhuvan University International Cricket Ground, Kirtipur';
            $raw_body = trim($n['content'] ?? '');
            $paras = array();
            if ($raw_body !== '') {
                foreach (preg_split('/\\R\\s*\\R|\\R/', $raw_body) as $p) {
                    $pt = trim($p);
                    if ($pt !== '') $paras[] = $pt;
                }
            }
            if (empty($paras) && !empty($n['excerpt'])) {
                $paras[] = trim($n['excerpt']);
            }
            $t1 = trim($n['team1'] ?? '');
            $t2 = trim($n['team2'] ?? '');
            $out[] = array(
                'id'          => $id,
                'series'      => $n_sr,
                'title'       => $n['title'] ?? '',
                'cat_label'   => sp659_news_cat_label($n['category'] ?? 'press'),
                'date_fmt'    => sp659_format_ed_date($n['date'] ?? ''),
                'time'        => $n['time'] ?? '',
                'read_mins'   => sp659_news_read_mins($n),
                'author'      => !empty($n['author']) ? $n['author'] : 'By SetoPress Cricket Desk · Kirtipur',
                'excerpt'     => $n['excerpt'] ?? '',
                'paragraphs'  => $paras,
                'quote'       => $n['quote'] ?? '',
                'team1'       => $t1,
                'team2'       => $t2,
                'team1_logo'  => $t1 !== '' ? sp659_logo($n_info, $t1) : '',
                'team2_logo'  => $t2 !== '' ? sp659_logo($n_info, $t2) : '',
                'visual_html' => sp659_render_news_visual($n, $n_info, 'sp-ed-visual-wide'),
                'caption'     => $t1 !== ''
                    ? ($t1 . ($t2 !== '' ? ' vs ' . $t2 : '') . ' — ' . $n_sr . ' ' . $season . ' Official Coverage.')
                    : ($venue_lbl . ' — ' . $n_sr . ' ' . $season . '.')
            );
        }
        return $out;
    }
}

if (!function_exists('sp659_render_news_stream')) {
    function sp659_render_news_stream($articles, $info, $series_map = array()) {
        if (empty($articles)) {
            return '<div style="text-align:center;padding:48px 24px;background:#ffffff;border:1px solid #e7e5e4;border-radius:14px;color:#57534e;font-size:15px;">No news dispatches published yet.</div>';
        }
        $lead = $articles[0];
        $lead_sr = $lead['series'] ?? ($info['name'] ?? SP659_NPL_SERIES);
        $lead_info = (!empty($series_map) && isset($series_map[$lead_sr])) ? $series_map[$lead_sr] : $info;
        $secondary = array_slice($articles, 1, 3);
        $archive = array_slice($articles, 4);

        ob_start();
        ?>
        <div class="sp-ed-stream">
            <!-- TIER 1: LEAD EDITORIAL STORY -->
            <article class="sp-ed-lead sp-news-card-item" data-news-id="<?php echo esc_attr($lead['id']); ?>" data-series="<?php echo esc_attr($lead_sr); ?>" data-cat="<?php echo esc_attr($lead['category'] ?? 'press'); ?>" data-teams="<?php echo esc_attr(($lead['team1'] ?? '') . '|' . ($lead['team2'] ?? '')); ?>" data-search="<?php echo esc_attr(strtolower(($lead['title'] ?? '') . ' ' . ($lead['excerpt'] ?? '') . ' ' . ($lead['content'] ?? '') . ' ' . ($lead['author'] ?? '') . ' ' . $lead_sr)); ?>" onclick="spNplOpenArticle(this)">
                <div class="sp-ed-lead-media">
                    <?php echo sp659_render_news_visual($lead, $lead_info, 'sp-ed-visual-lead'); ?>
                </div>
                <div class="sp-ed-lead-body">
                    <div>
                        <div class="sp-ed-kicker">
                            <span style="color:#991b1b;"><?php echo esc_html(sp659_news_cat_label($lead['category'] ?? 'press')); ?></span>
                            <span class="sp-ed-dot">·</span>
                            <span><?php echo esc_html(sp659_derive_series_code($lead_sr, $lead_info['code'] ?? '')); ?></span>
                            <span class="sp-ed-dot">·</span>
                            <span class="sp-npl-mono"><?php echo esc_html(sp659_format_ed_date($lead['date'] ?? '')); ?></span>
                            <span class="sp-ed-dot">·</span>
                            <span><?php echo (int)sp659_news_read_mins($lead); ?> min read</span>
                        </div>
                        <h3 class="sp-ed-lead-title sp-ed-serif"><?php echo esc_html($lead['title'] ?? ''); ?></h3>
                        <p class="sp-ed-lead-deck"><?php echo esc_html($lead['excerpt'] ?? ''); ?></p>
                    </div>
                    <div class="sp-ed-lead-foot">
                        <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                            <?php if (!empty($lead['team1'])) : ?><img src="<?php echo sp659_esc_img(sp659_logo($lead_info, $lead['team1'])); ?>" alt="" style="width:22px;height:22px;border-radius:50%;background:#ffffff;object-fit:contain;border:1px solid #e7e5e4;"><?php endif; ?>
                            <?php if (!empty($lead['team2'])) : ?><img src="<?php echo sp659_esc_img(sp659_logo($lead_info, $lead['team2'])); ?>" alt="" style="width:22px;height:22px;border-radius:50%;background:#ffffff;object-fit:contain;border:1px solid #e7e5e4;margin-left:-10px;"><?php endif; ?>
                            <span style="font-size:12px;color:#78716c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><?php echo esc_html(!empty($lead['author']) ? $lead['author'] : 'By SetoPress Cricket Desk'); ?></span>
                        </div>
                        <span class="sp-ed-read-cta">Read Full Story →</span>
                    </div>
                </div>
            </article>

            <!-- TIER 2: SECONDARY FEATURE GRID -->
            <?php if (!empty($secondary)) : ?>
            <div class="sp-ed-grid">
                <?php foreach ($secondary as $item) :
                    $it_sr = $item['series'] ?? ($info['name'] ?? SP659_NPL_SERIES);
                    $it_info = (!empty($series_map) && isset($series_map[$it_sr])) ? $series_map[$it_sr] : $info;
                ?>
                <article class="sp-ed-card sp-news-card-item" data-news-id="<?php echo esc_attr($item['id']); ?>" data-series="<?php echo esc_attr($it_sr); ?>" data-cat="<?php echo esc_attr($item['category'] ?? 'press'); ?>" data-teams="<?php echo esc_attr(($item['team1'] ?? '') . '|' . ($item['team2'] ?? '')); ?>" data-search="<?php echo esc_attr(strtolower(($item['title'] ?? '') . ' ' . ($item['excerpt'] ?? '') . ' ' . ($item['content'] ?? '') . ' ' . ($item['author'] ?? '') . ' ' . $it_sr)); ?>" onclick="spNplOpenArticle(this)">
                    <div>
                        <?php echo sp659_render_news_visual($item, $it_info, ''); ?>
                        <div class="sp-ed-card-pad">
                            <div class="sp-ed-kicker">
                                <span style="color:#991b1b;"><?php echo esc_html(sp659_news_cat_label($item['category'] ?? 'press')); ?></span>
                                <span class="sp-ed-dot">·</span>
                                <span><?php echo esc_html(sp659_derive_series_code($it_sr, $it_info['code'] ?? '')); ?></span>
                                <span class="sp-ed-dot">·</span>
                                <span class="sp-npl-mono"><?php echo esc_html(sp659_format_ed_date($item['date'] ?? '')); ?></span>
                                <span class="sp-ed-dot">·</span>
                                <span><?php echo (int)sp659_news_read_mins($item); ?> min read</span>
                            </div>
                            <h4 class="sp-ed-card-title sp-ed-serif"><?php echo esc_html($item['title'] ?? ''); ?></h4>
                            <p class="sp-ed-card-deck"><?php echo esc_html($item['excerpt'] ?? ''); ?></p>
                        </div>
                    </div>
                    <div class="sp-ed-card-foot">
                        <div style="display:flex;align-items:center;gap:6px;min-width:0;">
                            <?php if (!empty($item['team1'])) : ?><img src="<?php echo sp659_esc_img(sp659_logo($it_info, $item['team1'])); ?>" alt="" style="width:20px;height:20px;border-radius:50%;background:#ffffff;object-fit:contain;border:1px solid #e7e5e4;"><?php endif; ?>
                            <?php if (!empty($item['team2'])) : ?><img src="<?php echo sp659_esc_img(sp659_logo($it_info, $item['team2'])); ?>" alt="" style="width:20px;height:20px;border-radius:50%;background:#ffffff;object-fit:contain;border:1px solid #e7e5e4;margin-left:-8px;"><?php endif; ?>
                            <span style="font-size:12px;color:#78716c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                <?php echo !empty($item['team1']) ? esc_html($item['team1'] . (!empty($item['team2']) ? ' · ' . $item['team2'] : '')) : esc_html($item['author'] ?? 'Official Dispatch'); ?>
                            </span>
                        </div>
                        <span class="sp-ed-read-cta">Read →</span>
                    </div>
                </article>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>

            <!-- TIER 3: ARCHIVE WIRE LIST -->
            <?php if (!empty($archive)) : ?>
            <div class="sp-ed-archive-sec">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#78716c;margin-bottom:14px;">More Dispatches from the Press Box</div>
                <div class="sp-ed-archive-box">
                    <?php foreach ($archive as $idx => $item) :
                        $ar_sr = $item['series'] ?? ($info['name'] ?? SP659_NPL_SERIES);
                        $ar_info = (!empty($series_map) && isset($series_map[$ar_sr])) ? $series_map[$ar_sr] : $info;
                    ?>
                    <article class="sp-ed-archive-row sp-news-card-item" data-news-id="<?php echo esc_attr($item['id']); ?>" data-series="<?php echo esc_attr($ar_sr); ?>" data-cat="<?php echo esc_attr($item['category'] ?? 'press'); ?>" data-teams="<?php echo esc_attr(($item['team1'] ?? '') . '|' . ($item['team2'] ?? '')); ?>" data-search="<?php echo esc_attr(strtolower(($item['title'] ?? '') . ' ' . ($item['excerpt'] ?? '') . ' ' . ($item['content'] ?? '') . ' ' . ($item['author'] ?? '') . ' ' . $ar_sr)); ?>" onclick="spNplOpenArticle(this)" style="<?php echo $idx > 0 ? 'border-top:1px solid #e7e5e4;' : ''; ?>">
                        <div style="max-width:760px;">
                            <div class="sp-ed-kicker">
                                <span style="color:#991b1b;"><?php echo esc_html(sp659_news_cat_label($item['category'] ?? 'press')); ?></span>
                                <span class="sp-ed-dot">·</span>
                                <span><?php echo esc_html(sp659_derive_series_code($ar_sr, $ar_info['code'] ?? '')); ?></span>
                                <span class="sp-ed-dot">·</span>
                                <span class="sp-npl-mono"><?php echo esc_html(sp659_format_ed_date($item['date'] ?? '')); ?></span>
                                <?php if (!empty($item['team1'])) : ?><span class="sp-ed-dot">·</span><span><?php echo esc_html($item['team1'] . (!empty($item['team2']) ? ' vs ' . $item['team2'] : '')); ?></span><?php endif; ?>
                            </div>
                            <h4 class="sp-ed-serif" style="margin:6px 0;font-size:20px;font-weight:700;color:#0f172a;line-height:1.28;"><?php echo esc_html($item['title'] ?? ''); ?></h4>
                            <p style="margin:0;font-size:15px;color:#475569;line-height:1.65;"><?php echo esc_html($item['excerpt'] ?? ''); ?></p>
                        </div>
                        <div style="display:flex;align-items:center;gap:12px;font-size:12px;color:#78716c;flex-shrink:0;">
                            <span><?php echo (int)sp659_news_read_mins($item); ?> min read</span>
                            <span class="sp-ed-read-cta">Open →</span>
                        </div>
                    </article>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>
        </div>
        <div class="sp-news-empty" style="display:none;text-align:center;padding:48px 24px;background:#ffffff;border:1px solid #e7e5e4;border-radius:14px;color:#57534e;font-size:15px;">
            <div>No news dispatches match your selected series, category, or team filter.</div>
            <button type="button" class="sp-news-reset-btn" style="margin-top:12px;background:none;border:none;color:#1a237e;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">Reset All Filters</button>
        </div>
        <?php
        return ob_get_clean();
    }
}

if (!function_exists('sp659_render_reader_modal_markup')) {
    function sp659_render_reader_modal_markup() {
        ob_start();
        ?>
        <div class="sp-ed-reader-bg" onclick="if(event.target===this)spNplCloseArticle(this)">
            <div class="sp-ed-reader-dialog">
                <div class="sp-ed-reader-bar">
                    <button type="button" class="sp-ed-back-btn" onclick="spNplCloseArticle(this)">← Back to Newsroom</button>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span class="sp-ed-r-mins" style="font-size:12px;color:#78716c;"></span>
                        <button type="button" class="sp-ed-copy-btn" onclick="spNplCopyArticle(this)">Copy Story</button>
                        <button type="button" class="sp-ed-close-btn" onclick="spNplCloseArticle(this)" aria-label="Close">✕</button>
                    </div>
                </div>
                <div class="sp-ed-reader-scroll">
                    <div class="sp-ed-reader-col">
                        <div class="sp-ed-kicker">
                            <span class="sp-ed-r-cat" style="color:#991b1b;"></span>
                            <span class="sp-ed-dot">·</span>
                            <span class="sp-ed-r-date sp-npl-mono"></span>
                        </div>
                        <h1 class="sp-ed-r-title sp-ed-serif"></h1>
                        <p class="sp-ed-r-deck"></p>
                        <div class="sp-ed-r-byline-row">
                            <span class="sp-ed-r-author" style="font-weight:600;color:#0f172a;"></span>
                            <span class="sp-ed-r-teams" style="display:inline-flex;align-items:center;gap:6px;color:#57534e;"></span>
                        </div>
                        <figure style="margin:26px 0;">
                            <div class="sp-ed-r-visual" style="border-radius:12px;overflow:hidden;border:1px solid #e7e5e4;"></div>
                            <figcaption class="sp-ed-r-caption sp-ed-serif" style="font-style:italic;font-size:12px;color:#78716c;margin-top:10px;"></figcaption>
                        </figure>
                        <div class="sp-ed-r-prose"></div>
                        <div class="sp-ed-r-nav"></div>
                    </div>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
}

if (!function_exists('sp659_editorial_shared_css_and_js')) {
    function sp659_editorial_shared_css_and_js() {
        static $printed = false;
        if ($printed) return '';
        $printed = true;
        ob_start();
        ?>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400;1,9..144,500&family=JetBrains+Mono:wght@500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
        <style>
        /* Scoped WordPress Theme CSS Shield */
        .sp-npl-mount.alignwide, .sp-npl-news-ui.alignwide, .is-layout-constrained > .sp-npl-mount.alignwide, .is-layout-constrained > .sp-npl-news-ui.alignwide, .entry-content > .sp-npl-mount.alignwide, .entry-content > .sp-npl-news-ui.alignwide { width: 100% !important; max-width: 1360px !important; margin-left: auto !important; margin-right: auto !important; }
        .sp-npl-ui br, .sp-npl-news-ui br, .sp-npl-mount > br, .sp-npl-ui p:empty, .sp-npl-news-ui p:empty, .sp-npl-mount > p:empty { display: none !important; margin: 0 !important; padding: 0 !important; }
        .sp-npl-ui article, .sp-npl-news-ui article { margin: 0 !important; border-left: none; }
        .sp-npl-ui img, .sp-npl-news-ui img { max-width: 100%; border: none; box-shadow: none; display: inline-block; vertical-align: middle; margin: 0; }
        .sp-npl-ui img.sp-ed-photo, .sp-npl-news-ui img.sp-ed-photo { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; margin: 0 !important; border-radius: 0 !important; }
        .sp-npl-ui figure, .sp-npl-news-ui figure, .sp-npl-ui blockquote, .sp-npl-news-ui blockquote { margin-left: 0; margin-right: 0; border-left: none; background: transparent; }
        .sp-npl-ui button, .sp-npl-news-ui button { text-transform: none !important; letter-spacing: normal; box-shadow: none; line-height: 1.4; text-decoration: none !important; }
        .sp-ed-serif { font-family: 'Fraunces', Georgia, Cambria, 'Times New Roman', serif !important; letter-spacing: -0.015em; }
        .sp-npl-mono { font-family: 'JetBrains Mono', ui-monospace, monospace !important; font-variant-numeric: tabular-nums; }
        /* Shared News Filter Bar */
        .sp-news-filter-bar { display: flex !important; flex-wrap: wrap !important; gap: 16px !important; align-items: center !important; justify-content: space-between !important; color-scheme: light; }
        .sp-news-filter-card { padding: 14px 16px !important; background: #ffffff !important; border: 1px solid #e7e5e4 !important; border-radius: 12px !important; margin-bottom: 24px !important; }
        .sp-news-filter-strip { padding: 16px 40px !important; background: #ffffff !important; border-bottom: 1px solid #e7e5e4 !important; }
        .sp-news-cat-tabs { display: inline-flex !important; gap: 4px !important; padding: 4px !important; background: #f5f5f4 !important; border-radius: 8px !important; overflow-x: auto !important; max-width: 100% !important; }
        .sp-news-cat-btn { border: none !important; background: transparent !important; color: #57534e !important; font-size: 12px !important; font-weight: 700 !important; padding: 6px 14px !important; border-radius: 6px !important; cursor: pointer !important; white-space: nowrap !important; font-family: 'Plus Jakarta Sans', sans-serif !important; min-height: 0 !important; }
        .sp-news-cat-btn:hover { color: #090d16 !important; background: transparent !important; }
        .sp-news-cat-btn.active, .sp-news-cat-btn.active:hover { background: #ffffff !important; color: #090d16 !important; box-shadow: 0 1px 2px rgba(0,0,0,0.06) !important; }
        .sp-news-filter-inputs { display: flex !important; flex-wrap: wrap !important; gap: 10px !important; align-items: center !important; }
        .sp-news-team, .sp-news-series { padding: 8px 12px !important; min-height: 36px !important; font-size: 12px !important; font-weight: 600 !important; background: #ffffff !important; border: 1px solid #d6d3d1 !important; border-radius: 8px !important; color: #1e293b !important; font-family: 'Plus Jakarta Sans', sans-serif !important; cursor: pointer !important; }
        .sp-news-search { padding: 8px 12px !important; min-height: 36px !important; font-size: 12px !important; background: #ffffff !important; color: #1e293b !important; border: 1px solid #d6d3d1 !important; border-radius: 8px !important; min-width: 220px !important; font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .sp-news-clear-btn { padding: 8px 12px !important; min-height: 36px !important; font-size: 12px !important; font-weight: 600 !important; background: transparent !important; color: #57534e !important; border: none !important; border-radius: 8px !important; cursor: pointer !important; font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .sp-news-clear-btn:hover { color: #090d16 !important; background: #f5f5f4 !important; }
        /* Editorial Stream */
        .sp-ed-stream { display: flex !important; flex-direction: column !important; gap: 40px !important; }
        .sp-ed-kicker { font-size: 11px !important; font-weight: 600 !important; text-transform: uppercase !important; letter-spacing: 0.12em !important; color: #78716c !important; display: flex !important; flex-wrap: wrap !important; align-items: center !important; font-family: 'Plus Jakarta Sans', sans-serif !important; line-height: 1.4 !important; }
        .sp-ed-dot { margin: 0 7px !important; color: #d6d3d1 !important; }
        .sp-ed-visual { position: relative !important; width: 100% !important; aspect-ratio: 16 / 10 !important; background: #0c1438 !important; overflow: hidden !important; }
        .sp-ed-lead-media { display: flex !important; width: 100% !important; height: 100% !important; }
        .sp-ed-visual-lead { aspect-ratio: auto !important; height: 100% !important; min-height: 360px !important; }
        .sp-ed-visual-wide { aspect-ratio: 16 / 9 !important; }
        .sp-ed-photo { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; transition: transform 0.45s ease !important; }
        .sp-ed-lead:hover .sp-ed-photo, .sp-ed-card:hover .sp-ed-photo { transform: scale(1.02); }
        .sp-ed-art { position: relative; width: 100%; height: 100%; align-items: center; justify-content: center; padding: 24px; text-align: center; }
        .sp-ed-art-bg { position: absolute; inset: 0; width: 100%; height: 100%; }
        .sp-ed-art-fg { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; color: #ffffff; }
        .sp-ed-lead { display: grid !important; grid-template-columns: 7fr 5fr !important; background: #ffffff !important; border: 1px solid #e7e5e4 !important; border-radius: 16px !important; overflow: hidden !important; cursor: pointer !important; transition: border-color 0.18s ease !important; align-items: stretch !important; }
        .sp-ed-lead:hover { border-color: #d6d3d1 !important; }
        .sp-ed-lead-body { padding: 36px 40px !important; background: #fcfbf9 !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; }
        .sp-ed-lead-title { margin: 14px 0 0 !important; padding: 0 !important; font-size: 32px !important; font-weight: 700 !important; color: #090d16 !important; line-height: 1.18 !important; letter-spacing: -0.015em !important; text-wrap: balance; }
        .sp-ed-lead:hover .sp-ed-lead-title, .sp-ed-card:hover .sp-ed-card-title, .sp-ed-hl-item:hover .sp-ed-hl-title { color: #1a237e !important; }
        .sp-ed-lead-deck { margin: 16px 0 0 !important; font-size: 16px !important; color: #475569 !important; line-height: 1.74 !important; }
        .sp-ed-lead-foot { margin-top: 24px !important; padding-top: 20px !important; border-top: 1px solid #e7e5e4 !important; display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 12px !important; }
        .sp-ed-read-cta { font-size: 12px !important; font-weight: 700 !important; color: #1a237e !important; white-space: nowrap !important; flex-shrink: 0 !important; display: inline-flex !important; align-items: center !important; gap: 4px !important; }
        .sp-ed-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 24px !important; }
        .sp-ed-card { background: #ffffff !important; border: 1px solid #e7e5e4 !important; border-radius: 16px !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; cursor: pointer !important; transition: border-color 0.18s ease !important; }
        .sp-ed-card:hover { border-color: #d6d3d1 !important; }
        .sp-ed-card-pad { padding: 24px !important; }
        .sp-ed-card-title { margin: 10px 0 0 !important; padding: 0 !important; font-size: 20px !important; font-weight: 700 !important; color: #090d16 !important; line-height: 1.26 !important; text-wrap: balance; }
        .sp-ed-card-deck { margin: 12px 0 0 !important; font-size: 15px !important; color: #475569 !important; line-height: 1.68 !important; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .sp-ed-card-foot { padding: 16px 24px !important; border-top: 1px solid #f5f5f4 !important; background: rgba(250, 250, 249, 0.55) !important; display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 10px !important; }
        .sp-ed-archive-sec { padding-top: 32px !important; border-top: 1px solid #e7e5e4 !important; }
        .sp-ed-archive-box { background: #ffffff !important; border: 1px solid #e7e5e4 !important; border-radius: 12px !important; overflow: hidden !important; }
        .sp-ed-archive-row { padding: 24px 28px !important; display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 20px !important; cursor: pointer !important; transition: background 0.15s ease !important; }
        .sp-ed-archive-row:hover { background: rgba(250, 250, 249, 0.75) !important; }
        /* Full-Article Editorial Reader Modal */
        .sp-ed-reader-bg { position: fixed; inset: 0; background: rgba(9, 13, 22, 0.68); backdrop-filter: blur(2px); z-index: 100000; display: none; align-items: center; justify-content: center; padding: 16px; }
        .sp-ed-reader-bg.open { display: flex; }
        .sp-ed-reader-dialog { background: #fcfbf9; border: 1px solid #e7e5e4; border-radius: 18px; max-width: 820px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.35); }
        .sp-ed-reader-bar { padding: 14px 28px; background: #ffffff; border-bottom: 1px solid #e7e5e4; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-shrink: 0; }
        .sp-ed-back-btn, .sp-ed-copy-btn, .sp-ed-close-btn { border: none !important; font-family: 'Plus Jakarta Sans', sans-serif !important; cursor: pointer !important; border-radius: 8px !important; font-size: 12px !important; font-weight: 700 !important; min-height: 0 !important; }
        .sp-ed-back-btn { background: transparent !important; color: #334155 !important; padding: 6px 2px !important; }
        .sp-ed-back-btn:hover { color: #0f172a !important; background: transparent !important; }
        .sp-ed-copy-btn { background: #f5f5f4 !important; color: #334155 !important; padding: 7px 12px !important; }
        .sp-ed-copy-btn:hover { background: #e7e5e4 !important; color: #0f172a !important; }
        .sp-ed-close-btn { background: transparent !important; color: #78716c !important; padding: 6px 10px !important; font-size: 15px !important; }
        .sp-ed-close-btn:hover { background: #f5f5f4 !important; color: #0f172a !important; }
        .sp-ed-reader-scroll { overflow-y: auto; padding: 36px 40px 44px; }
        .sp-ed-reader-col { max-width: 65ch; margin: 0 auto; color: #1e293b; }
        .sp-ed-r-title { margin: 12px 0 0 !important; font-size: 36px !important; font-weight: 700 !important; color: #090d16 !important; line-height: 1.16 !important; letter-spacing: -0.015em; text-wrap: balance; }
        .sp-ed-r-deck { margin: 16px 0 0 !important; font-size: 18px !important; color: #475569 !important; line-height: 1.65 !important; }
        .sp-ed-r-byline-row { margin: 22px 0; padding: 14px 0; border-top: 1px solid #e7e5e4; border-bottom: 1px solid #e7e5e4; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; }
        .sp-ed-r-prose p { margin: 0 0 20px !important; font-size: 17px !important; line-height: 1.82 !important; color: #1e293b !important; }
        .sp-ed-r-prose p.sp-ed-dropcap::first-letter { font-family: 'Fraunces', Georgia, serif; font-size: 52px; font-weight: 700; float: left; line-height: 0.9; margin: 4px 12px 0 0; color: #090d16; }
        .sp-ed-r-quote { margin: 28px 0 !important; padding: 20px 16px !important; border-top: 1px solid #e7e5e4 !important; border-bottom: 1px solid #e7e5e4 !important; border-left: none !important; text-align: center; font-family: 'Fraunces', Georgia, serif !important; font-style: italic; font-size: 22px !important; line-height: 1.45 !important; color: #0f172a !important; text-wrap: balance; }
        .sp-ed-r-nav { margin-top: 36px; padding-top: 24px; border-top: 1px solid #e7e5e4; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .sp-ed-r-nav-btn { background: #ffffff !important; border: 1px solid #e7e5e4 !important; border-radius: 12px !important; padding: 14px 16px !important; text-align: left !important; cursor: pointer !important; font-family: 'Plus Jakarta Sans', sans-serif !important; transition: border-color 0.15s !important; }
        .sp-ed-r-nav-btn:hover { border-color: #cbd5e1 !important; background: #ffffff !important; }
        @media (max-width: 1024px) { .sp-ed-lead { grid-template-columns: 1fr !important; } .sp-ed-visual-lead { aspect-ratio: 16 / 10 !important; min-height: 240px !important; } .sp-ed-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px) { .sp-ed-grid, .sp-ed-r-nav { grid-template-columns: 1fr !important; } .sp-ed-lead-body, .sp-ed-reader-scroll { padding: 22px 20px !important; } .sp-ed-lead-title, .sp-ed-r-title { font-size: 26px !important; } .sp-ed-archive-row { flex-direction: column !important; align-items: flex-start !important; } .sp-news-filter-strip { padding-left: 20px !important; padding-right: 20px !important; } }
        </style>
        <script>
        function spNplBindNewsFiltersInScope(scope) {
            if (!scope || scope.getAttribute('data-filters-bound') === '1') return;
            scope.setAttribute('data-filters-bound', '1');
            var activeCat = 'all';
            var seriesSel = scope.querySelector('.sp-news-series');
            var teamSel = scope.querySelector('.sp-news-team');
            var searchIn = scope.querySelector('.sp-news-search');
            var clearBtn = scope.querySelector('.sp-news-clear-btn');
            var resetBtn = scope.querySelector('.sp-news-reset-btn');
            var emptyBox = scope.querySelector('.sp-news-empty');
            var streamEl = scope.querySelector('.sp-ed-stream');
            var countEl  = scope.querySelector('.sp-news-count');

            function runFilter() {
                var sr = seriesSel ? seriesSel.value : 'all';
                var t = teamSel ? teamSel.value : 'all';
                var q = searchIn ? searchIn.value.toLowerCase().trim() : '';
                var visible = 0;
                scope.querySelectorAll('.sp-news-card-item').forEach(function(card){
                    var okSeries = (sr === 'all' || card.getAttribute('data-series') === sr);
                    var okCat = (activeCat === 'all' || card.getAttribute('data-cat') === activeCat);
                    var okTeam = (t === 'all' || (card.getAttribute('data-teams') || '').indexOf(t) !== -1);
                    var okSearch = (!q || (card.getAttribute('data-search') || '').indexOf(q) !== -1);
                    var show = (okSeries && okCat && okTeam && okSearch);
                    card.style.display = show ? '' : 'none';
                    if (show) visible++;
                });
                var secGrid = scope.querySelector('.sp-ed-grid');
                if (secGrid) {
                    var anySec = false;
                    secGrid.querySelectorAll('.sp-news-card-item').forEach(function(c){ if (c.style.display !== 'none') anySec = true; });
                    secGrid.style.display = anySec ? '' : 'none';
                }
                var archSec = scope.querySelector('.sp-ed-archive-sec');
                if (archSec) {
                    var anyArch = false;
                    archSec.querySelectorAll('.sp-news-card-item').forEach(function(c){ if (c.style.display !== 'none') anyArch = true; });
                    archSec.style.display = anyArch ? '' : 'none';
                }
                if (streamEl) streamEl.style.display = visible === 0 ? 'none' : '';
                if (emptyBox) emptyBox.style.display = visible === 0 ? 'block' : 'none';
                if (clearBtn) clearBtn.style.display = (activeCat !== 'all' || sr !== 'all' || t !== 'all' || q !== '') ? '' : 'none';
                if (countEl) countEl.textContent = visible + (visible === 1 ? ' Story' : ' Stories') + ' Available · Click any headline to read in full';
            }

            function resetAll() {
                activeCat = 'all';
                if (seriesSel) seriesSel.value = 'all';
                if (teamSel) teamSel.value = 'all';
                if (searchIn) searchIn.value = '';
                scope.querySelectorAll('.sp-news-cat-btn').forEach(function(b){
                    b.classList.toggle('active', b.getAttribute('data-cat') === 'all');
                });
                runFilter();
            }

            scope.querySelectorAll('.sp-news-cat-btn').forEach(function(btn){
                btn.addEventListener('click', function(){
                    activeCat = btn.getAttribute('data-cat') || 'all';
                    scope.querySelectorAll('.sp-news-cat-btn').forEach(function(b){ b.classList.toggle('active', b === btn); });
                    runFilter();
                });
            });
            if (seriesSel) seriesSel.addEventListener('change', runFilter);
            if (teamSel) teamSel.addEventListener('change', runFilter);
            if (searchIn) searchIn.addEventListener('input', runFilter);
            if (clearBtn) clearBtn.addEventListener('click', resetAll);
            if (resetBtn) resetBtn.addEventListener('click', resetAll);
        }
        function spNplInitAllFilters() {
            document.querySelectorAll('.sp-news-filter-scope').forEach(spNplBindNewsFiltersInScope);
        }
        function spNplRenderReaderByIndex(root, idx) {
            var list = [];
            try { list = JSON.parse(root.getAttribute('data-news') || '[]'); } catch (e) { list = []; }
            if (!list.length || idx < 0 || idx >= list.length) return;
            var item = list[idx];
            var modal = root.querySelector('.sp-ed-reader-bg');
            if (!modal) return;
            modal.setAttribute('data-idx', String(idx));
            modal.querySelector('.sp-ed-r-mins').textContent = item.read_mins + ' min read';
            modal.querySelector('.sp-ed-r-cat').textContent = item.cat_label;
            modal.querySelector('.sp-ed-r-date').textContent = item.date_fmt + (item.time ? (' · ' + item.time + ' NPT') : '');
            modal.querySelector('.sp-ed-r-title').textContent = item.title;
            var deckEl = modal.querySelector('.sp-ed-r-deck');
            deckEl.textContent = item.excerpt || '';
            deckEl.style.display = item.excerpt ? '' : 'none';
            modal.querySelector('.sp-ed-r-author').textContent = item.author || 'By SetoPress Cricket Desk';

            var teamsEl = modal.querySelector('.sp-ed-r-teams');
            teamsEl.innerHTML = '';
            if (item.team1) {
                if (item.team1_logo) {
                    var i1 = document.createElement('img');
                    i1.src = item.team1_logo;
                    i1.style.cssText = 'width:20px;height:20px;border-radius:50%;object-fit:contain;';
                    teamsEl.appendChild(i1);
                }
                var st = document.createElement('span');
                st.textContent = item.team1 + (item.team2 ? (' vs ' + item.team2) : '');
                teamsEl.appendChild(st);
                if (item.team2 && item.team2_logo) {
                    var i2 = document.createElement('img');
                    i2.src = item.team2_logo;
                    i2.style.cssText = 'width:20px;height:20px;border-radius:50%;object-fit:contain;';
                    teamsEl.appendChild(i2);
                }
            }

            modal.querySelector('.sp-ed-r-visual').innerHTML = item.visual_html || '';
            modal.querySelector('.sp-ed-r-caption').textContent = item.caption || '';

            var prose = modal.querySelector('.sp-ed-r-prose');
            prose.innerHTML = '';
            (item.paragraphs || []).forEach(function(txt, pIdx){
                var p = document.createElement('p');
                if (pIdx === 0) p.className = 'sp-ed-dropcap';
                p.textContent = txt;
                prose.appendChild(p);
                if (pIdx === 0 && item.quote) {
                    var bq = document.createElement('blockquote');
                    bq.className = 'sp-ed-r-quote';
                    bq.textContent = '“' + item.quote + '”';
                    prose.appendChild(bq);
                }
            });

            var nav = modal.querySelector('.sp-ed-r-nav');
            nav.innerHTML = '';
            if (list.length > 1) {
                if (idx > 0) {
                    var prevBtn = document.createElement('button');
                    prevBtn.type = 'button';
                    prevBtn.className = 'sp-ed-r-nav-btn';
                    prevBtn.innerHTML = '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#78716c;font-weight:700;">← Newer Dispatch</div><div class="sp-ed-serif" style="font-size:15px;font-weight:700;color:#0f172a;margin-top:4px;"></div>';
                    prevBtn.querySelector('.sp-ed-serif').textContent = list[idx - 1].title;
                    prevBtn.onclick = function(){ spNplRenderReaderByIndex(root, idx - 1); };
                    nav.appendChild(prevBtn);
                } else {
                    nav.appendChild(document.createElement('div'));
                }
                if (idx < list.length - 1) {
                    var nextBtn = document.createElement('button');
                    nextBtn.type = 'button';
                    nextBtn.className = 'sp-ed-r-nav-btn';
                    nextBtn.style.textAlign = 'right';
                    nextBtn.innerHTML = '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#78716c;font-weight:700;">Earlier Dispatch →</div><div class="sp-ed-serif" style="font-size:15px;font-weight:700;color:#0f172a;margin-top:4px;"></div>';
                    nextBtn.querySelector('.sp-ed-serif').textContent = list[idx + 1].title;
                    nextBtn.onclick = function(){ spNplRenderReaderByIndex(root, idx + 1); };
                    nav.appendChild(nextBtn);
                }
            }

            modal.classList.add('open');
            var scroller = modal.querySelector('.sp-ed-reader-scroll');
            if (scroller) scroller.scrollTop = 0;
        }
        function spNplOpenArticle(el) {
            var root = el.closest('[data-news]');
            if (!root) return;
            var nid = el.getAttribute('data-news-id');
            var list = [];
            try { list = JSON.parse(root.getAttribute('data-news') || '[]'); } catch (e) { list = []; }
            var idx = -1;
            for (var i = 0; i < list.length; i++) {
                if (list[i].id === nid) { idx = i; break; }
            }
            if (idx >= 0) spNplRenderReaderByIndex(root, idx);
        }
        function spNplCloseArticle(el) {
            var modal = el.closest('.sp-ed-reader-bg');
            if (modal) modal.classList.remove('open');
        }
        function spNplCopyArticle(btn) {
            var root = btn.closest('[data-news]');
            var modal = btn.closest('.sp-ed-reader-bg');
            if (!root || !modal) return;
            var idx = parseInt(modal.getAttribute('data-idx') || '0', 10);
            var list = [];
            try { list = JSON.parse(root.getAttribute('data-news') || '[]'); } catch (e) { list = []; }
            var item = list[idx];
            if (!item) return;
            var fullText = item.title + '\\n' + item.cat_label + ' · ' + item.date_fmt + '\\n\\n' + (item.excerpt ? (item.excerpt + '\\n\\n') : '') + (item.paragraphs || []).join('\\n\\n');
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(fullText).catch(function(){});
            }
            btn.textContent = '✓ Copied Story';
            setTimeout(function(){ btn.textContent = 'Copy Story'; }, 2400);
        }
        document.addEventListener('keydown', function(e){
            if (e.key === 'Escape') {
                document.querySelectorAll('.sp-ed-reader-bg.open, .sp-npl-modal-bg.open').forEach(function(m){ m.classList.remove('open'); });
            }
        });
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', spNplInitAllFilters);
        } else {
            setTimeout(spNplInitAllFilters, 0);
        }
        </script>
        <?php
        return ob_get_clean();
    }
}

if (!function_exists('sp659_render_hub_inner')) {
    function sp659_render_hub_inner($d, $forced_series = '') {
        $series_map = isset($d['series']) && is_array($d['series']) ? $d['series'] : array();
        $series_keys = array_keys($series_map);
        if (empty($series_keys)) {
            $series_keys = array(SP659_NPL_SERIES);
        }
        $series_total = count($series_keys);
        $initial_sel = ($forced_series !== '' && isset($series_map[$forced_series]))
            ? $forced_series
            : sp659_active_series_name($d);
        if (!in_array($initial_sel, $series_keys, true)) {
            $initial_sel = $series_keys[0];
        }

        $all_matches_raw = array_values(array_filter($d['matches'] ?? array(), 'is_array'));
        $all_news_raw = array_values(array_filter($d['news'] ?? array(), 'is_array'));

        $series_dir = array();
        foreach ($series_keys as $sk_idx => $sk) {
            $sk_info = $series_map[$sk] ?? array();
            $sk_fmt  = (($sk_info['format'] ?? 'T20') === 'ODI') ? 'ODI' : 'T20';
            $sk_ov   = $sk_fmt === 'ODI' ? 50 : 20;
            $sk_code = sp659_derive_series_code($sk, $sk_info['code'] ?? '');
            $sk_logo = sp659_series_logo($sk_info);
            $sk_teams_cnt = count($sk_info['teams'] ?? array());
            $sk_live = 0;
            $sk_res  = 0;
            $sk_fix  = 0;
            foreach ($all_matches_raw as $mm) {
                $mm_sr = trim($mm['series'] ?? '');
                if ($mm_sr === '') $mm_sr = SP659_NPL_SERIES;
                if ($mm_sr !== $sk) continue;
                if (!empty($mm['live'])) {
                    $sk_live++;
                } elseif (sp659_resolve_match_outcome($mm)['type'] !== 'fixture') {
                    $sk_res++;
                } else {
                    $sk_fix++;
                }
            }
            $series_dir[$sk] = array(
                'num'       => sprintf('%02d', $sk_idx + 1),
                'name'      => $sk,
                'code'      => $sk_code,
                'format'    => $sk_fmt,
                'max_overs' => $sk_ov,
                'season'    => $sk_info['season'] ?? '2026',
                'category'  => $sk_info['category'] ?? 'Cricket Tournament',
                'venue'     => $sk_info['venue'] ?? 'TU Cricket Ground, Kirtipur',
                'logo'      => $sk_logo,
                'wide_logo' => sp659_is_wide_logo($sk_logo),
                'teams_cnt' => $sk_teams_cnt,
                'live_cnt'  => $sk_live,
                'res_cnt'   => $sk_res,
                'fix_cnt'   => $sk_fix,
            );
        }

        ob_start();
        ?>
        <div class="sp-npl-hub-multi" data-ver="<?php echo esc_attr((string)($d['updated_at'] ?? 0)); ?>" data-ajax="<?php echo esc_url(admin_url('admin-ajax.php')); ?>" data-active-series="<?php echo esc_attr($initial_sel); ?>">
        <?php foreach ($series_keys as $sel) :
            $info  = $series_map[$sel] ?? array();
            $info['name'] = $sel;
            $s_meta = $series_dir[$sel];
            $teams = $info['teams'] ?? array();
            $matches = array_values(array_filter($all_matches_raw, function($m) use ($sel) {
                $ms = trim($m['series'] ?? '');
                if ($ms === '') $ms = SP659_NPL_SERIES;
                return $ms === $sel;
            }));

            $live_matches = array_values(array_filter($matches, function($m) { return !empty($m['live']); }));
            $results      = array_values(array_filter($matches, function($m) {
                return empty($m['live']) && sp659_resolve_match_outcome($m)['type'] !== 'fixture';
            }));
            $fixtures     = array_values(array_filter($matches, function($m) {
                return empty($m['live']) && sp659_resolve_match_outcome($m)['type'] === 'fixture';
            }));

            usort($results,  function($a, $b) { return strcmp($b['date'] ?? '', $a['date'] ?? ''); });
            usort($fixtures, function($a, $b) { return strcmp($a['date'] ?? '', $b['date'] ?? ''); });

            $table = sp659_calc_points($d, $sel);

            $all_players = array();
            $teams_modal_payload = array();
            foreach ($teams as $tn => $td) {
                $t_logo  = sp659_logo($info, $tn);
                $t_color = sp659_team_color($info, $tn);
                $squad_clean = array();
                foreach ($td['players'] ?? array() as $p) {
                    if (empty($p['name'])) continue;
                    $runs = intval($p['runs'] ?? 0);
                    $wkts = intval($p['wickets'] ?? 0);
                    $item = array(
                        'name'       => $p['name'],
                        'role'       => $p['role'] ?? 'Batsman',
                        'runs'       => $runs,
                        'wickets'    => $wkts,
                        'photo'      => $p['photo'] ?? '',
                        'team'       => $tn,
                        'team_logo'  => $t_logo,
                        'team_color' => $t_color
                    );
                    $all_players[] = $item;
                    $squad_clean[] = $item;
                }
                $teams_modal_payload[$tn] = array(
                    'name'        => $tn,
                    'logo'        => $t_logo,
                    'color'       => $t_color,
                    'captain'     => $td['captain'] ?? 'TBA',
                    'coach'       => $td['coach'] ?? 'TBA',
                    'venue'       => $td['venue'] ?? 'TBA',
                    'description' => $td['description'] ?? '',
                    'players'     => $squad_clean
                );
            }

            $top_runs = $all_players;
            usort($top_runs, function($a, $b) { return $b['runs'] - $a['runs']; });
            $top_runs = array_slice($top_runs, 0, 3);

            $top_wkts = $all_players;
            usort($top_wkts, function($a, $b) { return $b['wickets'] - $a['wickets']; });
            $top_wkts = array_slice($top_wkts, 0, 3);

            $sorted_news = array_values(array_filter($all_news_raw, function($n) use ($sel) {
                $ns = trim($n['series'] ?? '');
                if ($ns === '') $ns = SP659_NPL_SERIES;
                return $ns === $sel;
            }));
            if (empty($sorted_news)) {
                $sorted_news = $all_news_raw;
            }
            usort($sorted_news, function($a, $b) {
                $cmp = strcmp($b['date'] ?? '', $a['date'] ?? '');
                return $cmp !== 0 ? $cmp : strcmp($b['time'] ?? '', $a['time'] ?? '');
            });
            $news_modal_payload = sp659_build_news_payload($sorted_news, $info, $series_map);

            $ordered_matches = array_merge($live_matches, $results, $fixtures);
            $scorecards_payload = array();
            foreach ($ordered_matches as $om) {
                $scorecards_payload[] = sp659_resolve_live_scorecard($om, $info);
            }
            $active_sc = !empty($scorecards_payload) ? $scorecards_payload[0] : null;
            $total_sc  = count($scorecards_payload);
            $icc_overs_str = $s_meta['format'] === 'ODI' ? '50.0' : '20.0';
        ?>
        <div class="sp-npl-ui sp-series-pane" data-series-key="<?php echo esc_attr($sel); ?>" style="<?php echo $sel === $initial_sel ? '' : 'display:none;'; ?>" data-ver="<?php echo esc_attr((string)($d['updated_at'] ?? 0)); ?>" data-ajax="<?php echo esc_url(admin_url('admin-ajax.php')); ?>" data-sc-idx="0" data-scorecards="<?php echo esc_attr(wp_json_encode($scorecards_payload)); ?>" data-teams="<?php echo esc_attr(wp_json_encode($teams_modal_payload)); ?>" data-news="<?php echo esc_attr(wp_json_encode($news_modal_payload)); ?>">
            <!-- 1. TOP MATCH CONTEXT STRIP (1:1 ESPNcricinfo-Style Top Bar) -->
            <div class="sp-sc-context">
                <div style="min-width:0;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span class="sp-sc-live-dot" style="<?php echo ($active_sc && !empty($active_sc['is_live'])) ? '' : 'display:none;'; ?>"></span>
                        <span class="sp-sc-status-tag" style="color:<?php echo ($active_sc && !empty($active_sc['is_live'])) ? '#475569' : (($active_sc && !empty($active_sc['is_completed'])) ? '#047857' : '#035fb2'); ?>;">
                            <?php echo esc_html($active_sc ? $active_sc['status_tag'] : 'LIVE'); ?>
                        </span>
                        <?php if ($total_sc > 1) : ?>
                        <span class="sp-npl-mono sp-sc-counter" style="font-size:11px;color:#94a3b8;margin-left:2px;">· 1/<?php echo (int)$total_sc; ?></span>
                        <?php endif; ?>
                    </div>
                    <div class="sp-sc-meta-line">
                        <span class="sp-sc-meta-text"><?php echo $active_sc ? esc_html($active_sc['match_no'] . ', ' . $active_sc['venue'] . ', ' . $active_sc['date_long'] . ', ') : esc_html($sel . ' ' . ($info['season'] ?? '2026') . ', '); ?></span>
                        <button type="button" class="sp-sc-series-link" onclick="spNplToggleSeriesDrawer(this)"><?php echo esc_html($sel . ' (' . $series_total . ' Series)'); ?></button>
                    </div>
                </div>
                <div class="sp-sc-nav-actions">
                    <button type="button" class="sp-sc-pn-btn" onclick="spNplSwitchMatch(this,-1)" <?php if ($total_sc <= 1) echo 'disabled'; ?>>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
                        <span>Prev</span>
                    </button>
                    <button type="button" class="sp-sc-pn-btn" onclick="spNplSwitchMatch(this,1)" <?php if ($total_sc <= 1) echo 'disabled'; ?>>
                        <span>Next</span>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                    <button type="button" class="sp-sc-share-btn" onclick="spNplShareScorecard(this)" title="Share scorecard summary" aria-label="Share scorecard summary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                    </button>
                </div>
            </div>

            <!-- 2. ROYAL BLUE NAVIGATION BAR (#035fb2) WITH OFFICIAL NPL / SERIES LOGO PLATE -->
            <div class="sp-sc-bluebar">
                <div class="sp-sc-bluebar-inner">
                    <button type="button" class="sp-sc-wordmark" onclick="spNplResetLiveScorecard(this)">
                        <?php if ($s_meta['wide_logo']) : ?>
                        <span class="sp-sc-logo-plate"><img src="<?php echo sp659_esc_img($s_meta['logo']); ?>" alt="<?php echo esc_attr($sel); ?>"></span>
                        <?php else : ?>
                        <span class="sp-sc-logo-crest"><img src="<?php echo sp659_esc_img($s_meta['logo']); ?>" alt="<?php echo esc_attr($sel); ?>"></span>
                        <?php endif; ?>
                        <span>setopress</span><span class="sp-sc-wordmark-sub"><?php echo esc_html($s_meta['code']); ?></span>
                    </button>
                    <nav class="sp-sc-bluenav" aria-label="Tournament sections">
                        <button type="button" class="active" data-bluetab="live" onclick="spNplResetLiveScorecard(this)">Live Scores</button>
                        <button type="button" data-bluetab="series" onclick="spNplToggleSeriesDrawer(this)">
                            <span>Series (<?php echo (int)$series_total; ?>)</span>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px;" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                        <button type="button" data-bluetab="teams" onclick="spNplSwitchTab(this,'teams')">Teams</button>
                        <button type="button" data-bluetab="news" onclick="spNplSwitchTab(this,'news')">News</button>
                        <button type="button" data-bluetab="fixtures" onclick="spNplSwitchTab(this,'fixtures')">Fixtures</button>
                        <button type="button" data-bluetab="results" onclick="spNplSwitchTab(this,'results')">Results</button>
                        <button type="button" data-bluetab="stats" onclick="spNplJumpLeaders(this)">Stats</button>
                    </nav>
                </div>
            </div>

            <!-- 2B. NUMBERED MULTI-SERIES SWITCHER DRAWER (01–N) -->
            <div class="sp-sc-series-drawer" style="display:none;">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
                    <span class="sp-npl-mono" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#475569;">Active Tournaments &amp; Series Directory (<?php echo (int)$series_total; ?>)</span>
                    <button type="button" class="sp-npl-inline-link" onclick="spNplSwitchTab(this,'series')">View Full Series Directory (<?php echo (int)$series_total; ?>) →</button>
                </div>
                <div class="sp-sc-series-grid">
                    <?php foreach ($series_dir as $sk => $sm) :
                        $is_cur_sr = ($sk === $sel);
                    ?>
                    <button type="button" class="sp-sc-sr-item <?php echo $is_cur_sr ? 'active' : ''; ?>" data-target-series="<?php echo esc_attr($sk); ?>" onclick="spNplSelectSeries(this)">
                        <span style="display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;margin-bottom:8px;">
                            <span class="sp-npl-mono" style="font-size:11px;font-weight:700;color:<?php echo $is_cur_sr ? '#035fb2' : '#94a3b8'; ?>;"><?php echo esc_html($sm['num'] . '. ' . $sm['code']); ?></span>
                            <span class="sp-npl-mono" style="font-size:10.5px;font-weight:700;color:#64748b;"><?php echo esc_html($sm['format'] . ' · ' . $sm['max_overs'] . ' ov'); ?></span>
                        </span>
                        <span style="display:flex;align-items:center;gap:10px;width:100%;">
                            <?php if ($sm['wide_logo']) : ?>
                            <span style="display:inline-flex;align-items:center;justify-content:center;background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;padding:3px 7px;height:30px;flex-shrink:0;">
                                <img src="<?php echo sp659_esc_img($sm['logo']); ?>" alt="" style="height:22px;width:auto;max-width:78px;object-fit:contain;border-radius:0;">
                            </span>
                            <?php else : ?>
                            <img src="<?php echo sp659_esc_img($sm['logo']); ?>" alt="" style="width:30px;height:30px;border-radius:50%;object-fit:contain;background:#ffffff;border:1px solid #e2e8f0;padding:2px;flex-shrink:0;">
                            <?php endif; ?>
                            <span style="display:block;min-width:0;text-align:left;">
                                <strong style="display:block;font-size:13.5px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><?php echo esc_html($sm['name']); ?></strong>
                                <span class="sp-npl-mono" style="display:block;font-size:11px;color:#64748b;"><?php echo esc_html($sm['teams_cnt'] . ' teams · ' . ($sm['live_cnt'] > 0 ? ($sm['live_cnt'] . ' LIVE · ') : '') . ($sm['res_cnt'] + $sm['fix_cnt']) . ' matches'); ?></span>
                            </span>
                        </span>
                    </button>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- 3. MAIN SCORECARD SHEET (Elevated Header + 72%/28% Career Split Table + FOW + Ball-by-Ball Timeline) -->
            <?php if ($active_sc) : ?>
            <div class="sp-sc-stage">
                <div class="sp-sc-card">
                    <!-- Elevated Team Score & Chase Equation Header -->
                    <div class="sp-sc-head">
                        <div class="sp-sc-head-top">
                            <div style="display:flex;align-items:center;gap:12px;min-width:0;">
                                <img class="sp-sc-bat-logo" src="<?php echo sp659_esc_img($active_sc['batting_logo']); ?>" alt="<?php echo esc_attr($active_sc['batting_team']); ?>" referrerpolicy="no-referrer">
                                <h2 class="sp-sc-bat-title"><?php echo esc_html($active_sc['batting_team'] . ' (' . ($active_sc['series_code'] ?? $s_meta['code']) . ')'); ?></h2>
                            </div>
                            <div class="sp-sc-score-cluster">
                                <span class="sp-sc-overs-target" style="<?php echo $active_sc['overs_target'] !== '' ? '' : 'display:none;'; ?>"><?php echo esc_html($active_sc['overs_target']); ?></span>
                                <span class="sp-sc-main-score"><?php echo esc_html($active_sc['active_score']); ?></span>
                            </div>
                        </div>
                        <div class="sp-sc-head-sub">
                            <p class="sp-sc-equation"><?php echo esc_html($active_sc['status_equation']); ?></p>
                            <span class="sp-sc-first-inn" style="<?php echo $active_sc['first_inn_summary'] !== '' ? '' : 'display:none;'; ?>"><?php echo esc_html($active_sc['first_inn_summary']); ?></span>
                        </div>
                    </div>

                    <!-- Dense 2-Pane Split Table (72% Innings | 28% T20/ODI CAREER) -->
                    <div class="sp-sc-table-scroll">
                        <div class="sp-sc-table-min">
                            <div class="sp-sc-split sp-sc-superhead">
                                <div style="padding:6px 20px;"></div>
                                <div class="sp-sc-career-pane sp-sc-career-heading" style="padding:6px 12px;text-align:center;"><?php echo esc_html($active_sc['career_heading'] ?? ($s_meta['format'] . ' CAREER')); ?></div>
                            </div>

                            <!-- BATTERS Header -->
                            <div class="sp-sc-split sp-sc-colhead">
                                <div class="sp-sc-bat-grid">
                                    <div style="text-align:left;">BATTERS</div>
                                    <div>R</div>
                                    <div>B</div>
                                    <div>4s</div>
                                    <div>6s</div>
                                    <div>SR</div>
                                    <div>THIS BOWLER</div>
                                    <div>LAST 5 BALLS</div>
                                </div>
                                <div class="sp-sc-career-pane sp-sc-career-grid">
                                    <div>MAT</div>
                                    <div>RUNS</div>
                                    <div>HS</div>
                                    <div>AVE</div>
                                </div>
                            </div>

                            <!-- BATTERS Rows -->
                            <div class="sp-sc-batters-rows">
                                <?php foreach ($active_sc['batters'] as $b) : ?>
                                <div class="sp-sc-split sp-sc-datarow">
                                    <div class="sp-sc-bat-grid">
                                        <div style="text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px;">
                                            <span style="font-weight:600;color:#020617;"><?php echo esc_html($b['name'] . (!empty($b['striker']) ? '*' : '')); ?></span>
                                            <?php if (!empty($b['hand'])) : ?><span style="font-size:11px;color:#64748b;margin-left:6px;font-weight:400;"><?php echo esc_html($b['hand']); ?></span><?php endif; ?>
                                        </div>
                                        <div style="font-weight:700;color:#020617;"><?php echo (int)$b['r']; ?></div>
                                        <div><?php echo (int)$b['b']; ?></div>
                                        <div><?php echo (int)$b['fours']; ?></div>
                                        <div><?php echo (int)$b['sixes']; ?></div>
                                        <div><?php echo esc_html($b['sr_fmt']); ?></div>
                                        <div><?php echo esc_html($b['this_bowler']); ?></div>
                                        <div><?php echo esc_html($b['last_5']); ?></div>
                                    </div>
                                    <div class="sp-sc-career-pane sp-sc-career-grid">
                                        <div><?php echo esc_html($b['mat']); ?></div>
                                        <div><?php echo esc_html($b['career_runs']); ?></div>
                                        <div><?php echo esc_html($b['hs']); ?></div>
                                        <div><?php echo esc_html($b['ave']); ?></div>
                                    </div>
                                </div>
                                <?php endforeach; ?>
                            </div>

                            <!-- BOWLERS Header -->
                            <div class="sp-sc-split sp-sc-colhead">
                                <div class="sp-sc-bowl-grid">
                                    <div style="text-align:left;">BOWLERS</div>
                                    <div>O</div>
                                    <div>M</div>
                                    <div>R</div>
                                    <div>W</div>
                                    <div>ECON</div>
                                    <div>0S</div>
                                    <div>4S</div>
                                    <div>6S</div>
                                    <div>THIS SPELL</div>
                                </div>
                                <div class="sp-sc-career-pane sp-sc-career-grid">
                                    <div>MAT</div>
                                    <div>WKTS</div>
                                    <div>BBI</div>
                                    <div>AVE</div>
                                </div>
                            </div>

                            <!-- BOWLERS Rows -->
                            <div class="sp-sc-bowlers-rows">
                                <?php foreach ($active_sc['bowlers'] as $bw) : ?>
                                <div class="sp-sc-split sp-sc-datarow">
                                    <div class="sp-sc-bowl-grid">
                                        <div style="text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px;">
                                            <span style="font-weight:600;color:#020617;"><?php echo esc_html($bw['name']); ?></span>
                                            <?php if (!empty($bw['arm'])) : ?><span style="font-size:11px;color:#64748b;margin-left:6px;font-weight:400;"><?php echo esc_html($bw['arm']); ?></span><?php endif; ?>
                                        </div>
                                        <div><?php echo esc_html($bw['o']); ?></div>
                                        <div><?php echo (int)$bw['m']; ?></div>
                                        <div><?php echo (int)$bw['r']; ?></div>
                                        <div style="font-weight:700;color:#020617;"><?php echo (int)$bw['w']; ?></div>
                                        <div><?php echo esc_html($bw['econ_fmt']); ?></div>
                                        <div><?php echo (int)$bw['dots']; ?></div>
                                        <div><?php echo (int)$bw['fours']; ?></div>
                                        <div><?php echo (int)$bw['sixes']; ?></div>
                                        <div><?php echo esc_html($bw['this_spell']); ?></div>
                                    </div>
                                    <div class="sp-sc-career-pane sp-sc-career-grid">
                                        <div><?php echo esc_html($bw['mat']); ?></div>
                                        <div><?php echo esc_html($bw['career_wkts']); ?></div>
                                        <div><?php echo esc_html($bw['bbi']); ?></div>
                                        <div><?php echo esc_html($bw['ave']); ?></div>
                                    </div>
                                </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    </div>

                    <!-- Last Bat & FOW Strip -->
                    <div class="sp-sc-fow">
                        <span>Last Bat:</span>
                        <strong class="sp-sc-lastbat-val" style="font-weight:600;color:#020617;margin-left:4px;"><?php echo esc_html($active_sc['last_bat']); ?></strong>
                        <span style="margin:0 8px;color:#94a3b8;">•</span>
                        <span>FOW:</span>
                        <strong class="sp-sc-fow-val" style="font-weight:600;color:#020617;margin-left:4px;"><?php echo esc_html($active_sc['fow']); ?></strong>
                    </div>

                    <!-- Ball-by-Ball Recent Overs Timeline -->
                    <div class="sp-sc-balls-wrap" style="<?php echo !empty($active_sc['recent_overs']) ? '' : 'display:none;'; ?>">
                        <div class="sp-sc-balls-track">
                            <?php foreach ($active_sc['recent_overs'] as $oi => $ov) : ?>
                            <div class="sp-sc-over-group" style="<?php echo $oi > 0 ? 'padding-left:14px;margin-left:8px;border-left:1px solid #e2e8f0;' : ''; ?>">
                                <?php if (!empty($ov['over_label'])) : ?>
                                <div style="display:flex;align-items:center;gap:8px;margin-right:6px;">
                                    <span style="font-size:12px;color:#64748b;"><?php echo esc_html($ov['over_label']); ?></span>
                                    <?php if (isset($ov['runs'])) : ?>
                                    <div style="text-align:center;line-height:1.08;">
                                        <div style="font-size:11px;font-weight:700;color:#0f172a;"><?php echo (int)$ov['runs']; ?></div>
                                        <div style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#334155;">RUNS</div>
                                    </div>
                                    <?php endif; ?>
                                </div>
                                <?php endif; ?>
                                <div style="display:flex;align-items:center;gap:6px;">
                                    <?php foreach (($ov['balls'] ?? array()) as $bl) : ?>
                                    <span class="sp-sc-ball <?php echo esc_attr(sp659_ball_tile_class($bl)); ?>"><?php echo esc_html($bl); ?></span>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                            <?php endforeach; ?>
                        </div>
                        <button type="button" class="sp-sc-balls-next" onclick="spNplScrollBalls(this)" aria-label="Scroll recent deliveries">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                    </div>
                </div>
            </div>
            <?php endif; ?>

            <!-- TOURNAMENT TABS -->
            <div class="sp-npl-body">
                <div class="sp-npl-seg">
                    <button type="button" class="active" data-tab="points" onclick="spNplSwitchTab(this,'points')">Dashboard &amp; Standings</button>
                    <button type="button" data-tab="series" onclick="spNplSwitchTab(this,'series')">Series (<?php echo (int)$series_total; ?>)</button>
                    <button type="button" data-tab="fixtures" onclick="spNplSwitchTab(this,'fixtures')">Fixtures (<?php echo count($fixtures); ?>)</button>
                    <button type="button" data-tab="results" onclick="spNplSwitchTab(this,'results')">Results (<?php echo count($results); ?>)</button>
                    <button type="button" data-tab="teams" onclick="spNplSwitchTab(this,'teams')">Teams &amp; Squads (<?php echo count($teams); ?>)</button>
                    <button type="button" data-tab="news" onclick="spNplSwitchTab(this,'news')">News &amp; Reports (<?php echo count($sorted_news); ?>)</button>
                </div>

                <!-- SERIES DIRECTORY TAB (NUMBERED 01–N) -->
                <div class="sp-npl-view" data-view="series">
                    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;" class="sp-npl-series-cards-grid">
                        <?php foreach ($series_dir as $sk => $sm) :
                            $is_cur_sr = ($sk === $sel);
                        ?>
                        <div style="background:#ffffff;border:1px solid <?php echo $is_cur_sr ? '#035fb2' : '#e2e8f0'; ?>;border-radius:12px;padding:20px;display:flex;flex-direction:column;justify-content:space-between;gap:14px;">
                            <div>
                                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;">
                                    <span class="sp-npl-mono" style="font-size:12px;font-weight:700;color:<?php echo $is_cur_sr ? '#035fb2' : '#64748b'; ?>;"><?php echo esc_html($sm['num'] . ' · ' . $sm['category']); ?></span>
                                    <span class="sp-npl-mono" style="font-size:11.5px;font-weight:700;color:#334155;"><?php echo esc_html($sm['format'] . ' · ' . $sm['max_overs'] . ' ov · ' . $sm['season']); ?></span>
                                </div>
                                <div style="display:flex;align-items:center;gap:14px;">
                                    <?php if ($sm['wide_logo']) : ?>
                                    <span style="display:inline-flex;align-items:center;justify-content:center;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:5px 10px;height:44px;flex-shrink:0;">
                                        <img src="<?php echo sp659_esc_img($sm['logo']); ?>" alt="" style="height:32px;width:auto;max-width:110px;object-fit:contain;border-radius:0;">
                                    </span>
                                    <?php else : ?>
                                    <img src="<?php echo sp659_esc_img($sm['logo']); ?>" alt="" style="width:44px;height:44px;border-radius:50%;object-fit:contain;background:#ffffff;border:1px solid #e2e8f0;padding:4px;flex-shrink:0;">
                                    <?php endif; ?>
                                    <div style="min-width:0;">
                                        <div style="font-size:17px;font-weight:800;color:#0f172a;line-height:1.25;"><?php echo esc_html($sm['name']); ?></div>
                                        <div style="font-size:12px;color:#64748b;margin-top:2px;"><?php echo esc_html($sm['venue']); ?></div>
                                    </div>
                                </div>
                            </div>
                            <div style="padding-top:12px;border-top:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                                <span class="sp-npl-mono" style="font-size:12px;color:#475569;"><?php echo esc_html($sm['teams_cnt'] . ' Teams · ' . $sm['live_cnt'] . ' Live · ' . $sm['res_cnt'] . ' Results · ' . $sm['fix_cnt'] . ' Fixtures'); ?></span>
                                <button type="button" class="sp-npl-inline-link" data-target-series="<?php echo esc_attr($sk); ?>" onclick="spNplSelectSeries(this)">
                                    <span><?php echo $is_cur_sr ? 'Active Series ✓' : 'Open Series Hub →'; ?></span>
                                </button>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- DASHBOARD OVERVIEW: LIVE MATCH + UPCOMING FIXTURES + POINTS TABLE -->
                <div class="sp-npl-view active" data-view="points">
                    <div class="sp-npl-dash-strip">
                        <!-- Left: Live Match Center (or Latest Scorecard) -->
                        <div class="sp-npl-dash-card">
                            <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;margin-bottom:14px;border-bottom:1px solid #f1f5f9;">
                                <div class="sp-npl-mono" style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">
                                    <?php if (!empty($live_matches)) : ?>
                                        <span class="sp-npl-live-dot"></span>
                                        <span style="color:#be123c;">Live Match (<?php echo count($live_matches); ?>)</span>
                                    <?php else : ?>
                                        <span style="color:#334155;">Latest Match Scorecard</span>
                                    <?php endif; ?>
                                </div>
                                <button type="button" class="sp-npl-inline-link" onclick="spNplSwitchTab(this,'results')">All Results (<?php echo count($results); ?>) →</button>
                            </div>

                            <?php if (!empty($live_matches)) : foreach ($live_matches as $li => $lm) : ?>
                            <div style="<?php echo $li > 0 ? 'padding-top:12px;margin-top:12px;border-top:1px solid #f1f5f9;' : ''; ?>">
                                <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:12px;color:#64748b;margin-bottom:10px;">
                                    <span><?php echo esc_html((!empty($lm['match_no']) ? $lm['match_no'] . ' · ' : '') . ($lm['venue'] ?? '')); ?></span>
                                    <span class="sp-npl-mono"><?php echo esc_html($lm['date'] . (!empty($lm['time']) ? ' · ' . $lm['time'] : '')); ?></span>
                                </div>
                                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;">
                                    <div style="display:flex;align-items:center;gap:10px;">
                                        <img src="<?php echo sp659_esc_img(sp659_logo($info, $lm['team1'])); ?>" alt="" style="width:32px;height:32px;object-fit:contain;border-radius:50%;">
                                        <span style="font-size:14px;font-weight:700;color:#0f172a;"><?php echo esc_html($lm['team1']); ?></span>
                                    </div>
                                    <div class="sp-npl-mono" style="font-size:14px;font-weight:700;color:#0f172a;">
                                        <?php echo esc_html($lm['team1_score'] ?: '0/0'); ?><?php if (!empty($lm['team1_overs'])) : ?><span style="font-size:12px;font-weight:400;color:#64748b;"> (<?php echo esc_html($lm['team1_overs']); ?> ov)</span><?php endif; ?>
                                    </div>
                                </div>
                                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                                    <div style="display:flex;align-items:center;gap:10px;">
                                        <img src="<?php echo sp659_esc_img(sp659_logo($info, $lm['team2'])); ?>" alt="" style="width:32px;height:32px;object-fit:contain;border-radius:50%;">
                                        <span style="font-size:14px;font-weight:700;color:#0f172a;"><?php echo esc_html($lm['team2']); ?></span>
                                    </div>
                                    <div class="sp-npl-mono" style="font-size:14px;font-weight:700;color:#1a237e;">
                                        <?php echo esc_html($lm['team2_score'] ?: 'Yet to bat'); ?><?php if (!empty($lm['team2_overs'])) : ?><span style="font-size:12px;font-weight:400;color:#64748b;"> (<?php echo esc_html($lm['team2_overs']); ?> ov)</span><?php endif; ?>
                                    </div>
                                </div>
                                <?php if (!empty($lm['live_status'])) : ?>
                                <div style="margin-top:10px;padding-top:8px;border-top:1px solid #f1f5f9;font-size:12px;font-weight:600;color:#be123c;"><?php echo esc_html($lm['live_status']); ?></div>
                                <?php endif; ?>
                            </div>
                            <?php endforeach; elseif (!empty($results)) : $rm = $results[0]; ?>
                            <div>
                                <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:10px;">
                                    <span><?php echo esc_html('No live match underway · ' . (!empty($rm['match_no']) ? $rm['match_no'] : 'Latest Match')); ?></span>
                                    <span class="sp-npl-mono"><?php echo esc_html($rm['date']); ?></span>
                                </div>
                                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;">
                                    <div style="display:flex;align-items:center;gap:10px;">
                                        <img src="<?php echo sp659_esc_img(sp659_logo($info, $rm['team1'])); ?>" alt="" style="width:32px;height:32px;object-fit:contain;border-radius:50%;">
                                        <span style="font-size:14px;font-weight:700;color:#0f172a;"><?php echo esc_html($rm['team1']); ?></span>
                                    </div>
                                    <span class="sp-npl-mono" style="font-size:14px;font-weight:700;color:#0f172a;"><?php echo esc_html($rm['team1_score']); ?><?php if (!empty($rm['team1_overs'])) : ?><span style="font-size:12px;font-weight:400;color:#64748b;"> (<?php echo esc_html($rm['team1_overs']); ?> ov)</span><?php endif; ?></span>
                                </div>
                                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                                    <div style="display:flex;align-items:center;gap:10px;">
                                        <img src="<?php echo sp659_esc_img(sp659_logo($info, $rm['team2'])); ?>" alt="" style="width:32px;height:32px;object-fit:contain;border-radius:50%;">
                                        <span style="font-size:14px;font-weight:700;color:#0f172a;"><?php echo esc_html($rm['team2']); ?></span>
                                    </div>
                                    <span class="sp-npl-mono" style="font-size:14px;font-weight:700;color:#0f172a;"><?php echo esc_html($rm['team2_score']); ?><?php if (!empty($rm['team2_overs'])) : ?><span style="font-size:12px;font-weight:400;color:#64748b;"> (<?php echo esc_html($rm['team2_overs']); ?> ov)</span><?php endif; ?></span>
                                </div>
                                <div style="margin-top:10px;padding-top:8px;border-top:1px solid #f1f5f9;font-size:12px;font-weight:600;color:#047857;"><?php echo esc_html(sp659_match_result_label($rm)); ?></div>
                            </div>
                            <?php else : ?>
                            <div style="padding:20px 0;text-align:center;font-size:12px;color:#64748b;">No live or completed matches recorded yet.</div>
                            <?php endif; ?>
                        </div>

                        <!-- Right: Upcoming Fixtures Schedule -->
                        <div class="sp-npl-dash-card">
                            <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;margin-bottom:14px;border-bottom:1px solid #f1f5f9;">
                                <span class="sp-npl-mono" style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#1e293b;">Upcoming Fixtures (<?php echo count($fixtures); ?>)</span>
                                <button type="button" class="sp-npl-inline-link" onclick="spNplSwitchTab(this,'fixtures')">Full Schedule →</button>
                            </div>
                            <?php if (!empty($fixtures)) : foreach (array_slice($fixtures, 0, 3) as $fi => $fx) : ?>
                            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:<?php echo $fi > 0 ? '12px 0 0' : '0'; ?>;<?php echo $fi > 0 ? 'margin-top:12px;border-top:1px solid #f1f5f9;' : ''; ?>">
                                <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                                    <img src="<?php echo sp659_esc_img(sp659_logo($info, $fx['team1'])); ?>" alt="" style="width:28px;height:28px;object-fit:contain;border-radius:50%;">
                                    <span style="font-size:13px;font-weight:700;color:#0f172a;"><?php echo esc_html($fx['team1']); ?></span>
                                    <span class="sp-npl-mono" style="font-size:11px;color:#94a3b8;">vs</span>
                                    <img src="<?php echo sp659_esc_img(sp659_logo($info, $fx['team2'])); ?>" alt="" style="width:28px;height:28px;object-fit:contain;border-radius:50%;">
                                    <span style="font-size:13px;font-weight:700;color:#0f172a;"><?php echo esc_html($fx['team2']); ?></span>
                                </div>
                                <div class="sp-npl-mono" style="text-align:right;font-size:12px;color:#475569;">
                                    <div style="font-weight:600;color:#334155;"><?php echo esc_html((!empty($fx['match_no']) ? $fx['match_no'] . ' · ' : '') . $fx['date'] . (!empty($fx['time']) ? ' · ' . $fx['time'] : '')); ?></div>
                                    <?php if (!empty($fx['venue'])) : ?><div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;color:#94a3b8;"><?php echo esc_html($fx['venue']); ?></div><?php endif; ?>
                                </div>
                            </div>
                            <?php endforeach; else : ?>
                            <div style="padding:20px 0;text-align:center;font-size:12px;color:#64748b;">No upcoming fixtures scheduled right now.</div>
                            <?php endif; ?>
                        </div>
                    </div>

                    <div class="sp-npl-table-wrap">
                        <table class="sp-npl-table">
                            <thead>
                                <tr>
                                    <th style="text-align:center;width:48px;">Pos</th>
                                    <th style="text-align:left;">Franchise</th>
                                    <th style="text-align:right;width:52px;">P</th>
                                    <th style="text-align:right;width:52px;">W</th>
                                    <th style="text-align:right;width:52px;">L</th>
                                    <th style="text-align:right;width:52px;">T</th>
                                    <th style="text-align:right;width:52px;">NR</th>
                                    <th style="text-align:right;width:64px;color:#0f172a;">Pts</th>
                                    <th style="text-align:right;width:100px;">NRR</th>
                                    <th style="text-align:right;width:155px;">For / Against</th>
                                </tr>
                            </thead>
                            <tbody class="sp-npl-mono">
                                <?php $pos = 1; foreach ($table as $r) :
                                    $is_q = ($pos <= 4 && $r['p'] > 0);
                                    $nrr_str = ($r['nrr'] >= 0 ? '+' : '') . number_format((float)$r['nrr'], 3);
                                    $nrr_col = $r['nrr'] > 0 ? '#047857' : ($r['nrr'] < 0 ? '#e11d48' : '#64748b');
                                ?>
                                <tr class="<?php echo $is_q ? 'sp-npl-qrow' : ''; ?>" data-team="<?php echo esc_attr($r['name']); ?>" onclick="spNplOpenTeamModal(this)">
                                    <td style="text-align:center;font-weight:600;color:#475569;"><?php echo (int)$pos; ?></td>
                                    <td style="font-family:'Plus Jakarta Sans',sans-serif;">
                                        <div style="display:flex;align-items:center;gap:10px;">
                                            <img src="<?php echo sp659_esc_img($r['logo']); ?>" alt="" style="width:28px;height:28px;object-fit:contain;border-radius:50%;">
                                            <span style="font-weight:700;color:#0f172a;"><?php echo esc_html($r['name']); ?></span>
                                            <?php if ($is_q) : ?><span style="font-size:11px;font-weight:800;color:#0f766e;">Q</span><?php endif; ?>
                                        </div>
                                    </td>
                                    <td style="text-align:right;"><?php echo (int)$r['p']; ?></td>
                                    <td style="text-align:right;"><?php echo (int)$r['w']; ?></td>
                                    <td style="text-align:right;"><?php echo (int)$r['l']; ?></td>
                                    <td style="text-align:right;color:#64748b;"><?php echo (int)$r['t']; ?></td>
                                    <td style="text-align:right;color:#64748b;"><?php echo (int)$r['nr']; ?></td>
                                    <td style="text-align:right;font-weight:800;color:#1a237e;"><?php echo (int)$r['pts']; ?></td>
                                    <td style="text-align:right;font-weight:600;color:<?php echo esc_attr($nrr_col); ?>;"><?php echo esc_html($nrr_str); ?></td>
                                    <td style="text-align:right;font-size:12px;color:#64748b;"><?php echo esc_html($r['runs_for'] . '/' . number_format($r['overs_for'], 1) . ' vs ' . $r['runs_against'] . '/' . number_format($r['overs_against'], 1)); ?></td>
                                </tr>
                                <?php $pos++; endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                    <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:10px;font-size:12px;color:#64748b;">
                        <span>Top 4 teams qualify for Knockouts (Q) · Win: 2 pts · Tie / No Result: 1 pt · ICC Rule: Bowled out = <?php echo esc_html($icc_overs_str); ?> overs faced</span>
                        <span>Click any team row to inspect squad</span>
                    </div>
                </div>

                <!-- FIXTURES -->
                <div class="sp-npl-view" data-view="fixtures">
                    <?php if (!empty($fixtures)) : foreach ($fixtures as $m) : ?>
                    <div class="sp-npl-card-row" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
                        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:180px;">
                            <img src="<?php echo sp659_esc_img(sp659_logo($info, $m['team1'])); ?>" alt="" style="width:40px;height:40px;object-fit:contain;border-radius:50%;">
                            <span style="font-weight:700;color:#0f172a;"><?php echo esc_html($m['team1']); ?></span>
                        </div>
                        <div style="text-align:center;">
                            <div class="sp-npl-mono" style="font-size:12px;font-weight:600;color:#475569;"><?php echo esc_html(($m['match_no'] ? $m['match_no'] . ' · ' : '') . $m['date'] . (!empty($m['time']) ? ' · ' . $m['time'] : '')); ?></div>
                            <?php if (!empty($m['venue'])) : ?><div style="font-size:12px;color:#94a3b8;margin-top:2px;"><?php echo esc_html($m['venue']); ?></div><?php endif; ?>
                        </div>
                        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:180px;justify-content:flex-end;">
                            <span style="font-weight:700;color:#0f172a;"><?php echo esc_html($m['team2']); ?></span>
                            <img src="<?php echo sp659_esc_img(sp659_logo($info, $m['team2'])); ?>" alt="" style="width:40px;height:40px;object-fit:contain;border-radius:50%;">
                        </div>
                    </div>
                    <?php endforeach; else : ?>
                    <div class="sp-npl-card-row" style="text-align:center;color:#64748b;padding:36px;">No upcoming fixtures scheduled.</div>
                    <?php endif; ?>
                </div>

                <!-- RESULTS -->
                <div class="sp-npl-view" data-view="results">
                    <?php if (!empty($results)) : foreach ($results as $m) : ?>
                    <div class="sp-npl-card-row">
                        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:12px;color:#64748b;padding-bottom:10px;margin-bottom:12px;border-bottom:1px solid #f1f5f9;">
                            <span><?php echo esc_html(($m['match_no'] ? $m['match_no'] . ' · ' : '') . $m['date'] . (!empty($m['venue']) ? ' · ' . $m['venue'] : '')); ?></span>
                            <span style="font-weight:700;color:#047857;"><?php echo esc_html(sp659_match_result_label($m)); ?></span>
                        </div>
                        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
                            <div style="display:flex;align-items:center;gap:12px;flex:1;">
                                <img src="<?php echo sp659_esc_img(sp659_logo($info, $m['team1'])); ?>" alt="" style="width:40px;height:40px;object-fit:contain;border-radius:50%;">
                                <div>
                                    <div style="font-weight:700;color:#0f172a;"><?php echo esc_html($m['team1']); ?></div>
                                    <div class="sp-npl-mono" style="font-size:18px;font-weight:700;color:#1a237e;"><?php echo esc_html($m['team1_score'] ?: '-'); ?><?php if (!empty($m['team1_overs'])) : ?><span style="font-size:12px;font-weight:400;color:#64748b;"> (<?php echo esc_html($m['team1_overs']); ?> ov)</span><?php endif; ?></div>
                                </div>
                            </div>
                            <div style="font-size:12px;font-weight:700;color:#94a3b8;">VS</div>
                            <div style="display:flex;align-items:center;gap:12px;flex:1;justify-content:flex-end;">
                                <div style="text-align:right;">
                                    <div style="font-weight:700;color:#0f172a;"><?php echo esc_html($m['team2']); ?></div>
                                    <div class="sp-npl-mono" style="font-size:18px;font-weight:700;color:#1a237e;"><?php echo esc_html($m['team2_score'] ?: '-'); ?><?php if (!empty($m['team2_overs'])) : ?><span style="font-size:12px;font-weight:400;color:#64748b;"> (<?php echo esc_html($m['team2_overs']); ?> ov)</span><?php endif; ?></div>
                                </div>
                                <img src="<?php echo sp659_esc_img(sp659_logo($info, $m['team2'])); ?>" alt="" style="width:40px;height:40px;object-fit:contain;border-radius:50%;">
                            </div>
                        </div>
                    </div>
                    <?php endforeach; else : ?>
                    <div class="sp-npl-card-row" style="text-align:center;color:#64748b;padding:36px;">No match results recorded yet.</div>
                    <?php endif; ?>
                </div>

                <!-- TEAMS & SQUADS -->
                <div class="sp-npl-view" data-view="teams">
                    <div class="sp-npl-teams-grid">
                        <?php foreach ($teams as $tname => $t) :
                            $p_cnt = count($t['players'] ?? array());
                            $t_lg  = sp659_logo($info, $tname);
                        ?>
                        <button type="button" class="sp-npl-team-box" data-team="<?php echo esc_attr($tname); ?>" onclick="spNplOpenTeamModal(this)">
                            <span class="sp-npl-team-head">
                                <img class="sp-npl-team-crest" src="<?php echo sp659_esc_img($t_lg); ?>" alt="<?php echo esc_attr($tname); ?>" referrerpolicy="no-referrer">
                                <span style="display:block;min-width:0;">
                                    <span style="display:block;font-weight:800;font-size:16px;line-height:1.375;color:#ffffff;"><?php echo esc_html($tname); ?></span>
                                    <span style="display:block;font-size:12px;font-weight:400;color:rgba(255,255,255,0.8);margin-top:2px;"><?php echo (int)$p_cnt; ?> Squad Players</span>
                                </span>
                            </span>
                            <span class="sp-npl-team-body">
                                <span style="display:block;margin-bottom:6px;line-height:1.45;">Captain: <strong style="color:#0f172a;font-weight:700;"><?php echo esc_html($t['captain'] ?: 'TBA'); ?></strong></span>
                                <span style="display:block;line-height:1.45;">Coach: <strong style="color:#0f172a;font-weight:700;"><?php echo esc_html($t['coach'] ?: 'TBA'); ?></strong></span>
                                <span style="display:inline-flex;align-items:center;gap:4px;padding-top:8px;margin-top:6px;color:#1a237e;font-weight:600;font-size:12px;">
                                    <span>View Squad</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                                </span>
                            </span>
                        </button>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- IN-HUB NEWSROOM TAB (1:1 WITH STUDIO PREVIEW) -->
                <div class="sp-npl-view sp-news-filter-scope" data-view="news">
                    <?php echo sp659_render_news_filter_bar($teams, 'sp-news-filter-card'); ?>
                    <?php echo sp659_render_news_stream($sorted_news, $info); ?>
                </div>
            </div>

            <!-- TOURNAMENT LEADERS (ORANGE CAP & PURPLE CAP) -->
            <div class="sp-npl-leaders">
                <h3 style="margin:0 0 16px !important;font-size:18px !important;font-weight:800 !important;color:#0f172a !important;line-height:1.3 !important;">Tournament Leaders</h3>
                <div class="sp-npl-leaders-grid">
                    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;background:#ffffff;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:12px;">Most Runs (Orange Cap Standings)</div>
                        <?php foreach ($top_runs as $idx => $p) : ?>
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;<?php echo $idx > 0 ? 'border-top:1px solid #f1f5f9;' : ''; ?>">
                            <div style="display:flex;align-items:center;gap:12px;">
                                <span class="sp-npl-mono" style="font-size:12px;font-weight:700;color:#94a3b8;width:16px;"><?php echo (int)($idx + 1); ?></span>
                                <img src="<?php echo sp659_esc_img($p['team_logo']); ?>" alt="" style="width:28px;height:28px;object-fit:contain;border-radius:50%;">
                                <div>
                                    <div style="font-size:14px;font-weight:700;color:#0f172a;"><?php echo esc_html($p['name']); ?></div>
                                    <div style="font-size:12px;color:#64748b;"><?php echo esc_html($p['team'] . ' · ' . $p['role']); ?></div>
                                </div>
                            </div>
                            <div class="sp-npl-mono" style="text-align:right;">
                                <div style="font-size:16px;font-weight:700;color:#0f172a;"><?php echo (int)$p['runs']; ?></div>
                                <div style="font-size:11px;color:#94a3b8;">runs</div>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>

                    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;background:#ffffff;">
                        <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:12px;">Most Wickets (Purple Cap Standings)</div>
                        <?php foreach ($top_wkts as $idx => $p) : ?>
                        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;<?php echo $idx > 0 ? 'border-top:1px solid #f1f5f9;' : ''; ?>">
                            <div style="display:flex;align-items:center;gap:12px;">
                                <span class="sp-npl-mono" style="font-size:12px;font-weight:700;color:#94a3b8;width:16px;"><?php echo (int)($idx + 1); ?></span>
                                <img src="<?php echo sp659_esc_img($p['team_logo']); ?>" alt="" style="width:28px;height:28px;object-fit:contain;border-radius:50%;">
                                <div>
                                    <div style="font-size:14px;font-weight:700;color:#0f172a;"><?php echo esc_html($p['name']); ?></div>
                                    <div style="font-size:12px;color:#64748b;"><?php echo esc_html($p['team'] . ' · ' . $p['role']); ?></div>
                                </div>
                            </div>
                            <div class="sp-npl-mono" style="text-align:right;">
                                <div style="font-size:16px;font-weight:700;color:#0f172a;"><?php echo (int)$p['wickets']; ?></div>
                                <div style="font-size:11px;color:#94a3b8;">wkts</div>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>

            <!-- EDITORIAL NEWSROOM SHOWCASE (1:1 WITH SETOPRESS NPL STUDIO) -->
            <?php if (!empty($sorted_news)) : $lead_n = $sorted_news[0]; $wire_n = array_slice($sorted_news, 1, 4); ?>
            <div class="sp-npl-news-sec">
                <div style="display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:16px;padding-bottom:20px;margin-bottom:28px;border-bottom:1px solid #e7e5e4;">
                    <div>
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;color:#991b1b;">Official <?php echo esc_html($s_meta['code']); ?> Dispatch</div>
                        <h3 class="sp-ed-serif" style="margin:4px 0 0 !important;padding:0 !important;font-size:30px !important;font-weight:700 !important;color:#090d16 !important;line-height:1.2 !important;">Latest News &amp; Match Reports</h3>
                    </div>
                    <button type="button" class="sp-npl-inline-link" onclick="spNplOpenFullNewsroom(this)" style="font-weight:700 !important;display:inline-flex !important;align-items:center !important;gap:5px !important;">
                        <span>Open Full Newsroom [setopress_npl_news]</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </button>
                </div>

                <div class="sp-npl-news-showcase">
                    <!-- Left: Featured Lead Story -->
                    <article class="sp-ed-card" data-news-id="<?php echo esc_attr($lead_n['id']); ?>" onclick="spNplOpenArticle(this)">
                        <div>
                            <?php echo sp659_render_news_visual($lead_n, $info, 'sp-ed-visual-wide'); ?>
                            <div style="padding:28px;">
                                <div class="sp-ed-kicker" style="font-size:12px !important;">
                                    <span style="color:#991b1b;"><?php echo esc_html(sp659_news_cat_label($lead_n['category'] ?? 'press')); ?></span>
                                    <span class="sp-ed-dot">·</span>
                                    <span class="sp-npl-mono"><?php echo esc_html(sp659_format_ed_date($lead_n['date'] ?? '')); ?></span>
                                    <span class="sp-ed-dot">·</span>
                                    <span><?php echo (int)sp659_news_read_mins($lead_n); ?> min read</span>
                                </div>
                                <h4 class="sp-ed-card-title sp-ed-serif" style="font-size:26px !important;line-height:1.2 !important;margin-top:10px !important;"><?php echo esc_html($lead_n['title'] ?? ''); ?></h4>
                                <p style="margin:12px 0 0 !important;font-size:15.5px !important;color:#475569 !important;line-height:1.7 !important;"><?php echo esc_html($lead_n['excerpt'] ?? ''); ?></p>
                            </div>
                        </div>
                        <div class="sp-ed-card-foot" style="padding:16px 28px !important;">
                            <span style="font-size:12px;color:#78716c;"><?php echo esc_html($lead_n['author'] ?? 'By SetoPress Cricket Desk'); ?></span>
                            <span class="sp-ed-read-cta">
                                <span>Read Full Story</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                            </span>
                        </div>
                    </article>

                    <!-- Right: Hairline-Divided Headlines Wire -->
                    <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:16px;padding:28px;display:flex;flex-direction:column;justify-content:space-between;">
                        <div>
                            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#a8a29e;padding-bottom:12px;border-bottom:1px solid #e7e5e4;">Recent Headlines</div>
                            <?php foreach ($wire_n as $wi => $wn) : ?>
                            <article class="sp-ed-hl-item" data-news-id="<?php echo esc_attr($wn['id']); ?>" onclick="spNplOpenArticle(this)" style="padding:16px 0 <?php echo $wi === count($wire_n) - 1 ? '0' : '16px'; ?>;cursor:pointer;<?php echo $wi > 0 ? 'border-top:1px solid #e7e5e4;' : ''; ?>">
                                <div class="sp-ed-kicker" style="letter-spacing:0.1em !important;">
                                    <span style="color:#991b1b;"><?php echo esc_html(sp659_news_cat_label($wn['category'] ?? 'press')); ?></span>
                                    <span class="sp-ed-dot" style="margin:0 6px !important;">·</span>
                                    <span class="sp-npl-mono"><?php echo esc_html(sp659_format_ed_date($wn['date'] ?? '')); ?></span>
                                    <span class="sp-ed-dot" style="margin:0 6px !important;">·</span>
                                    <span><?php echo (int)sp659_news_read_mins($wn); ?> min read</span>
                                </div>
                                <h5 class="sp-ed-serif sp-ed-hl-title" style="margin:6px 0 0 !important;padding:0 !important;font-size:18px !important;font-weight:700 !important;color:#090d16 !important;line-height:1.28 !important;transition:color 0.15s ease;"><?php echo esc_html($wn['title'] ?? ''); ?></h5>
                                <p style="margin:6px 0 0 !important;font-size:14px !important;color:#475569 !important;line-height:1.6 !important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;"><?php echo esc_html($wn['excerpt'] ?? ''); ?></p>
                            </article>
                            <?php endforeach; ?>
                        </div>
                        <button type="button" onclick="spNplSwitchTab(this,'news')" style="margin-top:20px !important;padding:16px 0 0 !important;border:none !important;border-top:1px solid #e7e5e4 !important;background:transparent !important;width:100% !important;display:flex !important;align-items:center !important;justify-content:space-between !important;color:#1a237e !important;font-size:12px !important;font-weight:700 !important;cursor:pointer !important;font-family:'Plus Jakarta Sans',sans-serif !important;min-height:0 !important;">
                            <span>Browse All <?php echo count($sorted_news); ?> <?php echo esc_html($s_meta['code']); ?> Stories &amp; Filter by Team</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        </button>
                    </div>
                </div>
            </div>
            <?php endif; ?>

            <!-- INTERACTIVE TEAM SQUAD MODAL -->
            <div class="sp-npl-modal-bg" onclick="if(event.target===this)this.classList.remove('open')">
                <div class="sp-npl-modal">
                    <div class="sp-npl-m-head" style="padding:24px;color:#ffffff;display:flex;align-items:center;justify-content:space-between;gap:16px;background:#0d1542;">
                        <div style="display:flex;align-items:center;gap:16px;">
                            <img class="sp-npl-m-logo" src="" alt="" style="width:56px !important;height:56px !important;min-width:56px !important;background:#ffffff !important;border-radius:9999px !important;padding:6px !important;object-fit:contain !important;">
                            <div>
                                <h3 class="sp-npl-m-title" style="margin:0 !important;font-size:20px !important;font-weight:800 !important;color:#ffffff !important;line-height:1.25 !important;"></h3>
                                <div class="sp-npl-m-desc" style="font-size:12px;color:rgba(255,255,255,0.85);margin-top:2px;"></div>
                            </div>
                        </div>
                        <button type="button" onclick="this.closest('.sp-npl-modal-bg').classList.remove('open')" style="background:rgba(0,0,0,0.2) !important;border:none !important;color:#ffffff !important;width:32px !important;height:32px !important;min-height:0 !important;padding:0 !important;border-radius:8px !important;cursor:pointer !important;font-size:15px !important;">✕</button>
                    </div>
                    <div style="padding:24px;overflow-y:auto;">
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;font-size:12px;">
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;">
                                <div style="color:#64748b;display:flex;align-items:center;gap:6px;margin-bottom:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>Captain</div>
                                <div class="sp-npl-m-cap" style="font-weight:700;color:#0f172a;"></div>
                            </div>
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;">
                                <div style="color:#64748b;display:flex;align-items:center;gap:6px;margin-bottom:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>Head Coach</div>
                                <div class="sp-npl-m-coach" style="font-weight:700;color:#0f172a;"></div>
                            </div>
                            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;">
                                <div style="color:#64748b;display:flex;align-items:center;gap:6px;margin-bottom:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>Home Ground</div>
                                <div class="sp-npl-m-venue" style="font-weight:700;color:#0f172a;"></div>
                            </div>
                        </div>
                        <div class="sp-npl-m-sq-label" style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:10px;">Registered Squad</div>
                        <div class="sp-npl-m-squad" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;"></div>
                    </div>
                </div>
            </div>

            <!-- FULL-ARTICLE EDITORIAL READER MODAL -->
            <?php echo sp659_render_reader_modal_markup(); ?>
        </div>
        <?php endforeach; ?>
        </div>
        <?php
        return sp659_clean_shortcode_output(ob_get_clean());
    }
}

if (!function_exists('sp659_ajax_sync')) {
    function sp659_ajax_sync() {
        nocache_headers();
        $client_ver = sanitize_text_field(wp_unslash($_GET['ver'] ?? '0'));
        $d = sp659_get_data(true);
        $server_ver = (string)($d['updated_at'] ?? 0);
        if ($server_ver === $client_ver) {
            wp_send_json_success(array('fresh' => true, 'ver' => $server_ver));
        }
        wp_send_json_success(array(
            'fresh' => false,
            'ver'   => $server_ver,
            'html'  => sp659_render_hub_inner($d)
        ));
    }
}
add_action('wp_ajax_sp659_sync', 'sp659_ajax_sync');
add_action('wp_ajax_nopriv_sp659_sync', 'sp659_ajax_sync');

if (!function_exists('sp659_shortcode')) {
    function sp659_shortcode() {
        if (!defined('DONOTCACHEPAGE')) define('DONOTCACHEPAGE', true);
        do_action('litespeed_control_set_nocache', 'SetoPress NPL dynamic standings');

        $d = sp659_get_data(true);
        if (!isset($d['series'][SP659_NPL_SERIES])) {
            sp659_load_defaults(false);
            $d = sp659_get_data(true);
        }

        ob_start();
        echo sp659_editorial_shared_css_and_js();
        ?>
        <style>
        .sp-npl-ui { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; background: #ffffff !important; color: #0f172a !important; border: 1px solid #e2e8f0 !important; border-radius: 16px !important; overflow: hidden !important; width: 100% !important; max-width: 1360px !important; margin: 24px auto !important; line-height: 1.5 !important; box-sizing: border-box !important; }
        .sp-npl-ui *, .sp-npl-ui *::before, .sp-npl-ui *::after { box-sizing: border-box !important; }
        /* 1:1 ESPNcricinfo-Style Live Scorecard Centre */
        .sp-sc-context { background: #ffffff !important; padding: 12px 28px !important; display: flex !important; flex-wrap: wrap !important; align-items: center !important; justify-content: space-between !important; gap: 16px !important; border-bottom: 1px solid #e2e8f0 !important; }
        .sp-sc-live-dot { width: 8px !important; height: 8px !important; border-radius: 9999px !important; background: #ef4444 !important; display: inline-block !important; flex-shrink: 0 !important; animation: spNplPulse 1.6s ease-in-out infinite !important; }
        .sp-sc-status-tag { font-size: 11px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.14em !important; line-height: 1.2 !important; }
        .sp-sc-meta-line { font-size: 13px !important; color: #475569 !important; margin-top: 2px !important; line-height: 1.45 !important; }
        .sp-sc-series-link { background: transparent !important; border: none !important; padding: 0 !important; margin: 0 !important; min-height: 0 !important; font-family: inherit !important; font-size: 13px !important; font-weight: 500 !important; color: #334155 !important; text-decoration: underline !important; cursor: pointer !important; }
        .sp-sc-series-link:hover { color: #035fb2 !important; background: transparent !important; text-decoration: underline !important; }
        .sp-sc-nav-actions { display: flex !important; align-items: center !important; gap: 18px !important; flex-shrink: 0 !important; }
        .sp-sc-pn-btn { background: transparent !important; border: none !important; padding: 4px 2px !important; margin: 0 !important; min-height: 0 !important; display: inline-flex !important; align-items: center !important; gap: 4px !important; font-family: 'Plus Jakarta Sans', sans-serif !important; font-size: 13.5px !important; font-weight: 600 !important; color: #0f172a !important; cursor: pointer !important; white-space: nowrap !important; }
        .sp-sc-pn-btn:hover { color: #035fb2 !important; background: transparent !important; }
        .sp-sc-pn-btn:disabled { opacity: 0.4 !important; cursor: default !important; }
        .sp-sc-share-btn { background: transparent !important; border: none !important; padding: 6px !important; margin: 0 !important; min-height: 0 !important; border-radius: 6px !important; color: #334155 !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
        .sp-sc-share-btn:hover { color: #035fb2 !important; background: #f1f5f9 !important; }
        .sp-sc-bluebar { background: #035fb2 !important; color: #ffffff !important; padding: 0 28px !important; height: 52px !important; display: flex !important; align-items: center !important; overflow-x: auto !important; }
        .sp-sc-bluebar-inner { display: flex !important; align-items: center !important; gap: 28px !important; min-width: max-content !important; height: 100% !important; }
        .sp-sc-wordmark { background: transparent !important; border: none !important; padding: 0 !important; margin: 0 !important; min-height: 0 !important; font-family: 'Plus Jakarta Sans', sans-serif !important; font-size: 21px !important; font-weight: 800 !important; letter-spacing: -0.03em !important; color: #ffffff !important; cursor: pointer !important; white-space: nowrap !important; }
        .sp-sc-wordmark:hover { color: #ffffff !important; background: transparent !important; }
        .sp-sc-wordmark-sub { font-size: 14px !important; font-weight: 500 !important; color: #bae6fd !important; margin-left: 4px !important; }
        .sp-sc-bluenav { display: flex !important; align-items: center !important; gap: 22px !important; height: 100% !important; }
        .sp-sc-bluenav button { background: transparent !important; border: none !important; border-bottom: 2px solid transparent !important; border-radius: 0 !important; padding: 0 0 2px !important; margin: 0 !important; height: 100% !important; min-height: 0 !important; display: inline-flex !important; align-items: center !important; font-family: 'Plus Jakarta Sans', sans-serif !important; font-size: 13.5px !important; font-weight: 500 !important; color: rgba(255,255,255,0.92) !important; cursor: pointer !important; white-space: nowrap !important; }
        .sp-sc-bluenav button:hover { color: #ffffff !important; background: transparent !important; }
        .sp-sc-bluenav button.active { color: #ffffff !important; font-weight: 700 !important; border-bottom-color: #ffffff !important; }
        .sp-sc-stage { background: #f4f6f9 !important; padding: 18px 20px !important; border-bottom: 1px solid #e2e8f0 !important; }
        .sp-sc-card { background: #ffffff !important; border: 1px solid rgba(226,232,240,0.95) !important; border-radius: 12px !important; box-shadow: 0 2px 10px rgba(15,23,42,0.05) !important; overflow: hidden !important; }
        .sp-sc-head { padding: 20px 24px 16px !important; background: #ffffff !important; border-bottom: 1px solid #e2e8f0 !important; box-shadow: 0 3px 8px rgba(15,23,42,0.03) !important; }
        .sp-sc-head-top { display: flex !important; flex-wrap: wrap !important; align-items: center !important; justify-content: space-between !important; gap: 12px !important; }
        .sp-sc-bat-logo { width: 34px !important; height: 34px !important; min-width: 34px !important; border-radius: 9999px !important; object-fit: contain !important; flex-shrink: 0 !important; margin: 0 !important; border: none !important; background: transparent !important; }
        .sp-sc-bat-title { margin: 0 !important; padding: 0 !important; font-family: 'Plus Jakarta Sans', sans-serif !important; font-size: 24px !important; font-weight: 700 !important; letter-spacing: -0.02em !important; color: #020617 !important; line-height: 1.2 !important; }
        .sp-sc-score-cluster { display: flex !important; align-items: baseline !important; gap: 10px !important; font-variant-numeric: tabular-nums !important; flex-shrink: 0 !important; }
        .sp-sc-overs-target { font-size: 18px !important; font-weight: 400 !important; color: #475569 !important; font-variant-numeric: tabular-nums !important; }
        .sp-sc-main-score { font-size: 26px !important; font-weight: 700 !important; color: #020617 !important; font-variant-numeric: tabular-nums !important; }
        .sp-sc-head-sub { margin-top: 10px !important; display: flex !important; flex-wrap: wrap !important; align-items: center !important; justify-content: space-between !important; gap: 8px !important; }
        .sp-sc-equation { margin: 0 !important; padding: 0 !important; font-size: 15px !important; font-weight: 400 !important; color: #0f172a !important; line-height: 1.4 !important; }
        .sp-sc-first-inn { font-size: 12px !important; color: #64748b !important; font-variant-numeric: tabular-nums !important; }
        .sp-sc-table-scroll { overflow-x: auto !important; width: 100% !important; }
        .sp-sc-table-min { min-width: 840px !important; }
        .sp-sc-split { display: grid !important; grid-template-columns: 72% 28% !important; align-items: stretch !important; }
        .sp-sc-superhead { background: #f8f9fb !important; border-bottom: 1px solid #e2e8f0 !important; font-size: 10.5px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.08em !important; color: #64748b !important; }
        .sp-sc-colhead { background: #eef0f4 !important; border-bottom: 1px solid #e2e8f0 !important; font-size: 11px !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; color: #64748b !important; }
        .sp-sc-datarow { background: #ffffff !important; border-bottom: 1px solid #f1f5f9 !important; font-size: 13px !important; color: #475569 !important; transition: background 0.12s ease !important; }
        .sp-sc-datarow:hover { background: #f8fafc !important; }
        .sp-sc-career-pane { border-left: 1px solid #e2e8f0 !important; }
        .sp-sc-bat-grid { display: grid !important; grid-template-columns: 2.3fr 0.55fr 0.55fr 0.55fr 0.55fr 0.95fr 1.35fr 1.35fr !important; align-items: center !important; padding: 10px 20px !important; text-align: center !important; font-variant-numeric: tabular-nums !important; }
        .sp-sc-bowl-grid { display: grid !important; grid-template-columns: 2.3fr 0.55fr 0.5fr 0.55fr 0.5fr 0.85fr 0.55fr 0.55fr 0.55fr 1.2fr !important; align-items: center !important; padding: 10px 20px !important; text-align: center !important; font-variant-numeric: tabular-nums !important; }
        .sp-sc-career-grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; align-items: center !important; padding: 10px 12px !important; text-align: center !important; font-variant-numeric: tabular-nums !important; }
        .sp-sc-fow { padding: 12px 24px !important; background: #ffffff !important; border-bottom: 1px solid #f1f5f9 !important; font-size: 13px !important; color: #475569 !important; font-variant-numeric: tabular-nums !important; }
        .sp-sc-balls-wrap { position: relative !important; display: flex !important; align-items: center !important; background: #ffffff !important; padding: 12px 44px 12px 24px !important; }
        .sp-sc-balls-track { display: flex !important; align-items: center !important; gap: 10px !important; overflow-x: auto !important; scrollbar-width: none !important; font-variant-numeric: tabular-nums !important; width: 100% !important; }
        .sp-sc-balls-track::-webkit-scrollbar { display: none !important; }
        .sp-sc-over-group { display: flex !important; align-items: center !important; gap: 8px !important; flex-shrink: 0 !important; }
        .sp-sc-ball { display: inline-flex !important; align-items: center !important; justify-content: center !important; min-width: 34px !important; height: 34px !important; padding: 0 7px !important; border-radius: 6px !important; font-size: 13px !important; font-weight: 700 !important; line-height: 1 !important; }
        .sp-sc-ball-n { background: #f1f3f5 !important; color: #0f172a !important; }
        .sp-sc-ball-b { background: #1cb04b !important; color: #ffffff !important; }
        .sp-sc-ball-w { background: #ef4444 !important; color: #ffffff !important; }
        .sp-sc-balls-next { position: absolute !important; right: 8px !important; top: 50% !important; transform: translateY(-50%) !important; width: 32px !important; height: 32px !important; min-height: 0 !important; padding: 0 !important; border-radius: 9999px !important; background: rgba(255,255,255,0.96) !important; border: 1px solid #e2e8f0 !important; box-shadow: 0 1px 3px rgba(15,23,42,0.08) !important; color: #334155 !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }
        .sp-sc-balls-next:hover { color: #035fb2 !important; background: #ffffff !important; }
        .sp-npl-inline-link { background: transparent !important; border: none !important; box-shadow: none !important; color: #1a237e !important; font-size: 12px !important; font-weight: 600 !important; cursor: pointer !important; font-family: 'Plus Jakarta Sans', sans-serif !important; padding: 0 !important; margin: 0 !important; min-height: 0 !important; white-space: nowrap !important; }
        .sp-npl-inline-link:hover { text-decoration: underline !important; background: transparent !important; color: #1a237e !important; }
        .sp-npl-body { padding: 32px 40px 24px !important; background: rgba(248, 250, 252, 0.7) !important; }
        .sp-npl-seg { display: inline-flex !important; gap: 4px !important; padding: 4px !important; background: rgba(226, 232, 240, 0.78) !important; border-radius: 8px !important; overflow-x: auto !important; max-width: 100% !important; }
        .sp-npl-seg button { border: none !important; background: transparent !important; box-shadow: none !important; color: #475569 !important; font-weight: 700 !important; font-size: 12px !important; padding: 8px 16px !important; margin: 0 !important; min-height: 0 !important; border-radius: 6px !important; cursor: pointer !important; white-space: nowrap !important; font-family: 'Plus Jakarta Sans', sans-serif !important; }
        .sp-npl-seg button:hover { color: #0f172a !important; background: transparent !important; }
        .sp-npl-seg button.active, .sp-npl-seg button.active:hover { background: #ffffff !important; color: #1a237e !important; box-shadow: 0 1px 2px rgba(0,0,0,0.06) !important; }
        .sp-npl-view { display: none; padding-top: 24px; }
        .sp-npl-view.active { display: block; }
        .sp-npl-dash-strip { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; align-items: stretch; }
        .sp-npl-dash-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; }
        .sp-npl-live-dot { width: 8px; height: 8px; border-radius: 50%; background: #e11d48; display: inline-block; animation: spNplPulse 1.6s ease-in-out infinite; }
        @keyframes spNplPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
        .sp-npl-table-wrap { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; }
        .sp-npl-table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 0 !important; border: none !important; }
        .sp-npl-table th { background: #f8fafc; border: none !important; border-bottom: 1px solid #e2e8f0 !important; padding: 13px 14px; font-size: 12px; font-weight: 600; color: #64748b; }
        .sp-npl-table td { padding: 13px 14px; border: none !important; border-bottom: 1px solid #f1f5f9 !important; color: #1e293b; }
        .sp-npl-table tbody tr { cursor: pointer; transition: background 0.15s; }
        .sp-npl-table tbody tr:hover { background: #f8fafc; }
        .sp-npl-qrow { background: rgba(20, 184, 166, 0.06); }
        .sp-npl-card-row { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 12px; }
        .sp-npl-teams-grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 16px !important; }
        .sp-npl-team-box, .sp-npl-team-box:hover, .sp-npl-team-box:focus, .sp-npl-team-box:active { background: #ffffff !important; color: #475569 !important; border: 1px solid #e2e8f0 !important; border-radius: 12px !important; overflow: hidden !important; text-align: left !important; padding: 0 !important; margin: 0 !important; cursor: pointer !important; transition: border-color 0.15s ease !important; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif !important; width: 100% !important; display: block !important; box-shadow: none !important; min-height: 0 !important; transform: none !important; }
        .sp-npl-team-box:hover { border-color: #cbd5e1 !important; }
        .sp-npl-team-head { height: 96px !important; padding: 0 20px !important; display: flex !important; align-items: center !important; gap: 16px !important; background: #0d1542 !important; color: #ffffff !important; border: none !important; }
        .sp-npl-team-crest { width: 56px !important; height: 56px !important; min-width: 56px !important; background: #ffffff !important; border-radius: 9999px !important; padding: 6px !important; object-fit: contain !important; flex-shrink: 0 !important; margin: 0 !important; border: none !important; }
        .sp-npl-team-body { display: block !important; padding: 16px !important; font-size: 12px !important; color: #475569 !important; background: #ffffff !important; }
        .sp-npl-leaders { padding: 32px 40px !important; background: #ffffff !important; border-top: 1px solid #e2e8f0 !important; }
        .sp-npl-leaders-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 24px !important; }
        .sp-npl-news-sec { padding: 40px !important; background: #fbfaf7 !important; border-top: 1px solid #e7e5e4 !important; }
        .sp-npl-news-showcase { display: grid !important; grid-template-columns: 7fr 5fr !important; gap: 32px !important; align-items: stretch !important; }
        .sp-npl-modal-bg { position: fixed; inset: 0; background: rgba(15,23,42,0.55); z-index: 99999; display: none; align-items: center; justify-content: center; padding: 16px; }
        .sp-npl-modal-bg.open { display: flex; }
        .sp-npl-modal { background: #ffffff; border-radius: 16px; max-width: 672px; width: 100%; overflow: hidden; border: 1px solid #e2e8f0; max-height: 85vh; display: flex; flex-direction: column; }
        @media (max-width: 1024px) { .sp-npl-teams-grid { grid-template-columns: repeat(2, 1fr) !important; } .sp-npl-news-showcase, .sp-npl-dash-strip { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px) { .sp-npl-teams-grid, .sp-npl-leaders-grid { grid-template-columns: 1fr !important; } .sp-sc-context, .sp-sc-bluebar, .sp-npl-body, .sp-npl-leaders, .sp-npl-news-sec { padding-left: 16px !important; padding-right: 16px !important; } .sp-sc-stage { padding: 12px !important; } .sp-sc-head { padding: 16px !important; } .sp-sc-bat-title { font-size: 20px !important; } .sp-sc-main-score { font-size: 22px !important; } .sp-sc-overs-target { font-size: 15px !important; } }
        </style>
        <div class="sp-npl-mount alignwide"><?php echo sp659_render_hub_inner($d); ?></div>
        <script>
        function spNplEscHtml(s) {
            return String(s === null || s === undefined ? '' : s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }
        function spNplBallCls(raw) {
            var b = String(raw || '').trim();
            if (b === 'W' || (b.indexOf('W') !== -1 && b.slice(-1) !== 'w')) return 'sp-sc-ball-w';
            if (b === '4' || b === '6') return 'sp-sc-ball-b';
            return 'sp-sc-ball-n';
        }
        function spNplRenderScorecard(root, nextIdx) {
            if (!root) return;
            var list = [];
            try { list = JSON.parse(root.getAttribute('data-scorecards') || '[]'); } catch (e) { list = []; }
            if (!list.length) return;
            var idx = ((nextIdx % list.length) + list.length) % list.length;
            root.setAttribute('data-sc-idx', String(idx));
            var sc = list[idx];

            var dot = root.querySelector('.sp-sc-live-dot');
            if (dot) dot.style.display = sc.is_live ? '' : 'none';
            var tag = root.querySelector('.sp-sc-status-tag');
            if (tag) {
                tag.textContent = sc.status_tag || 'LIVE';
                tag.style.color = sc.is_live ? '#475569' : (sc.is_completed ? '#047857' : '#035fb2');
            }
            var ctr = root.querySelector('.sp-sc-counter');
            if (ctr) ctr.textContent = '· ' + (idx + 1) + '/' + list.length;
            var meta = root.querySelector('.sp-sc-meta-text');
            if (meta) meta.textContent = (sc.match_no || 'League Match') + ', ' + (sc.venue || 'Kirtipur') + ', ' + (sc.date_long || '') + ', ';

            var logo = root.querySelector('.sp-sc-bat-logo');
            if (logo) { logo.src = sc.batting_logo || ''; logo.alt = sc.batting_team || ''; }
            var title = root.querySelector('.sp-sc-bat-title');
            if (title) title.textContent = (sc.batting_team || '') + ' (NPL)';
            var ovTgt = root.querySelector('.sp-sc-overs-target');
            if (ovTgt) {
                ovTgt.textContent = sc.overs_target || '';
                ovTgt.style.display = sc.overs_target ? '' : 'none';
            }
            var mScore = root.querySelector('.sp-sc-main-score');
            if (mScore) mScore.textContent = sc.active_score || 'TBA';
            var eq = root.querySelector('.sp-sc-equation');
            if (eq) eq.textContent = sc.status_equation || '';
            var fi = root.querySelector('.sp-sc-first-inn');
            if (fi) {
                fi.textContent = sc.first_inn_summary || '';
                fi.style.display = sc.first_inn_summary ? '' : 'none';
            }

            var batWrap = root.querySelector('.sp-sc-batters-rows');
            if (batWrap) {
                var bh = '';
                (sc.batters || []).forEach(function(b){
                    bh += '<div class="sp-sc-split sp-sc-datarow"><div class="sp-sc-bat-grid">'
                        + '<div style="text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px;"><span style="font-weight:600;color:#020617;">' + spNplEscHtml(b.name + (b.striker ? '*' : '')) + '</span>'
                        + (b.hand ? '<span style="font-size:11px;color:#64748b;margin-left:6px;font-weight:400;">' + spNplEscHtml(b.hand) + '</span>' : '') + '</div>'
                        + '<div style="font-weight:700;color:#020617;">' + spNplEscHtml(b.r) + '</div>'
                        + '<div>' + spNplEscHtml(b.b) + '</div>'
                        + '<div>' + spNplEscHtml(b.fours) + '</div>'
                        + '<div>' + spNplEscHtml(b.sixes) + '</div>'
                        + '<div>' + spNplEscHtml(b.sr_fmt) + '</div>'
                        + '<div>' + spNplEscHtml(b.this_bowler) + '</div>'
                        + '<div>' + spNplEscHtml(b.last_5) + '</div>'
                        + '</div><div class="sp-sc-career-pane sp-sc-career-grid">'
                        + '<div>' + spNplEscHtml(b.mat) + '</div>'
                        + '<div>' + spNplEscHtml(b.career_runs) + '</div>'
                        + '<div>' + spNplEscHtml(b.hs) + '</div>'
                        + '<div>' + spNplEscHtml(b.ave) + '</div>'
                        + '</div></div>';
                });
                batWrap.innerHTML = bh;
            }

            var bowlWrap = root.querySelector('.sp-sc-bowlers-rows');
            if (bowlWrap) {
                var wh = '';
                (sc.bowlers || []).forEach(function(bw){
                    wh += '<div class="sp-sc-split sp-sc-datarow"><div class="sp-sc-bowl-grid">'
                        + '<div style="text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px;"><span style="font-weight:600;color:#020617;">' + spNplEscHtml(bw.name) + '</span>'
                        + (bw.arm ? '<span style="font-size:11px;color:#64748b;margin-left:6px;font-weight:400;">' + spNplEscHtml(bw.arm) + '</span>' : '') + '</div>'
                        + '<div>' + spNplEscHtml(bw.o) + '</div>'
                        + '<div>' + spNplEscHtml(bw.m) + '</div>'
                        + '<div>' + spNplEscHtml(bw.r) + '</div>'
                        + '<div style="font-weight:700;color:#020617;">' + spNplEscHtml(bw.w) + '</div>'
                        + '<div>' + spNplEscHtml(bw.econ_fmt) + '</div>'
                        + '<div>' + spNplEscHtml(bw.dots) + '</div>'
                        + '<div>' + spNplEscHtml(bw.fours) + '</div>'
                        + '<div>' + spNplEscHtml(bw.sixes) + '</div>'
                        + '<div>' + spNplEscHtml(bw.this_spell) + '</div>'
                        + '</div><div class="sp-sc-career-pane sp-sc-career-grid">'
                        + '<div>' + spNplEscHtml(bw.mat) + '</div>'
                        + '<div>' + spNplEscHtml(bw.career_wkts) + '</div>'
                        + '<div>' + spNplEscHtml(bw.bbi) + '</div>'
                        + '<div>' + spNplEscHtml(bw.ave) + '</div>'
                        + '</div></div>';
                });
                bowlWrap.innerHTML = wh;
            }

            var lb = root.querySelector('.sp-sc-lastbat-val');
            if (lb) lb.textContent = sc.last_bat || '-';
            var fw = root.querySelector('.sp-sc-fow-val');
            if (fw) fw.textContent = sc.fow || '-';

            var ballsWrap = root.querySelector('.sp-sc-balls-wrap');
            var track = root.querySelector('.sp-sc-balls-track');
            var overs = sc.recent_overs || [];
            if (ballsWrap && track) {
                ballsWrap.style.display = overs.length ? '' : 'none';
                var oh = '';
                overs.forEach(function(ov, oi){
                    oh += '<div class="sp-sc-over-group" style="' + (oi > 0 ? 'padding-left:14px;margin-left:8px;border-left:1px solid #e2e8f0;' : '') + '">';
                    if (ov.over_label) {
                        oh += '<div style="display:flex;align-items:center;gap:8px;margin-right:6px;"><span style="font-size:12px;color:#64748b;">' + spNplEscHtml(ov.over_label) + '</span>';
                        if (ov.runs !== undefined && ov.runs !== null) {
                            oh += '<div style="text-align:center;line-height:1.08;"><div style="font-size:11px;font-weight:700;color:#0f172a;">' + spNplEscHtml(ov.runs) + '</div><div style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#334155;">RUNS</div></div>';
                        }
                        oh += '</div>';
                    }
                    oh += '<div style="display:flex;align-items:center;gap:6px;">';
                    (ov.balls || []).forEach(function(bl){
                        oh += '<span class="sp-sc-ball ' + spNplBallCls(bl) + '">' + spNplEscHtml(bl) + '</span>';
                    });
                    oh += '</div></div>';
                });
                track.innerHTML = oh;
                track.scrollLeft = 0;
            }
        }
        function spNplSwitchMatch(el, delta) {
            var root = el.closest('.sp-npl-ui');
            if (!root) return;
            var cur = parseInt(root.getAttribute('data-sc-idx') || '0', 10);
            spNplRenderScorecard(root, cur + delta);
        }
        function spNplResetLiveScorecard(el) {
            var root = el.closest('.sp-npl-ui');
            if (!root) return;
            spNplRenderScorecard(root, 0);
            root.querySelectorAll('.sp-sc-bluenav button').forEach(function(b){
                b.classList.toggle('active', b.getAttribute('data-bluetab') === 'live');
            });
            root.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        function spNplShareScorecard(btn) {
            var root = btn.closest('.sp-npl-ui');
            if (!root) return;
            var list = [];
            try { list = JSON.parse(root.getAttribute('data-scorecards') || '[]'); } catch (e) { list = []; }
            var idx = parseInt(root.getAttribute('data-sc-idx') || '0', 10);
            var sc = list[idx];
            if (!sc) return;
            var txt = '[' + sc.status_tag + '] ' + sc.match_no + ' · ' + sc.venue + ' — ' + sc.batting_team + ' ' + sc.active_score + (sc.overs_target ? ' ' + sc.overs_target : '') + ' | ' + sc.status_equation;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(txt).catch(function(){});
            }
            var oldHtml = btn.innerHTML;
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
            setTimeout(function(){ btn.innerHTML = oldHtml; }, 2000);
        }
        function spNplScrollBalls(btn) {
            var wrap = btn.closest('.sp-sc-balls-wrap');
            if (!wrap) return;
            var track = wrap.querySelector('.sp-sc-balls-track');
            if (!track) return;
            if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 8) {
                track.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                track.scrollBy({ left: 220, behavior: 'smooth' });
            }
        }
        function spNplJumpLeaders(el) {
            var root = el.closest('.sp-npl-ui');
            if (!root) return;
            var sec = root.querySelector('.sp-npl-leaders');
            if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        function spNplSwitchTab(el, target) {
            var root = el.closest('.sp-npl-ui');
            if (!root) return;
            root.querySelectorAll('.sp-npl-seg button').forEach(function(b){
                b.classList.toggle('active', b.getAttribute('data-tab') === target);
            });
            root.querySelectorAll('.sp-sc-bluenav button').forEach(function(b){
                b.classList.toggle('active', b.getAttribute('data-bluetab') === target);
            });
            root.querySelectorAll('.sp-npl-view').forEach(function(v){
                v.classList.toggle('active', v.getAttribute('data-view') === target);
            });
            var bottomNews = root.querySelector('.sp-npl-news-sec');
            if (bottomNews) {
                bottomNews.style.display = (target === 'news') ? 'none' : '';
            }
            var bodySec = root.querySelector('.sp-npl-body');
            if (bodySec && (el.closest('.sp-sc-context') || el.closest('.sp-sc-bluebar') || el.closest('.sp-npl-news-sec'))) {
                bodySec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            if (typeof spNplInitAllFilters === 'function') spNplInitAllFilters();
        }
        function spNplOpenFullNewsroom(el) {
            var dedicatedNews = document.querySelector('.sp-npl-news-ui');
            if (dedicatedNews) {
                dedicatedNews.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }
            spNplSwitchTab(el, 'news');
        }
        function spNplOpenTeamModal(el) {
            var root = el.closest('.sp-npl-ui');
            if (!root) return;
            var tname = el.getAttribute('data-team');
            var payload = JSON.parse(root.getAttribute('data-teams') || '{}');
            var team = payload[tname];
            if (!team) return;
            var modal = root.querySelector('.sp-npl-modal-bg');
            var head = modal.querySelector('.sp-npl-m-head');
            head.style.background = '#0d1542';
            modal.querySelector('.sp-npl-m-logo').src = team.logo || '';
            modal.querySelector('.sp-npl-m-title').textContent = team.name;
            modal.querySelector('.sp-npl-m-desc').textContent = team.description || '';
            modal.querySelector('.sp-npl-m-cap').textContent = team.captain || 'TBA';
            modal.querySelector('.sp-npl-m-coach').textContent = team.coach || 'TBA';
            modal.querySelector('.sp-npl-m-venue').textContent = team.venue || 'TBA';
            var players = team.players || [];
            var sqLabel = modal.querySelector('.sp-npl-m-sq-label');
            if (sqLabel) sqLabel.textContent = 'Registered Squad (' + players.length + ')';
            var sq = modal.querySelector('.sp-npl-m-squad');
            sq.innerHTML = '';
            players.forEach(function(p, idx){
                var row = document.createElement('div');
                row.style.cssText = 'padding:10px 16px;display:flex;align-items:center;justify-content:space-between;font-size:14px;' + (idx > 0 ? 'border-top:1px solid #f1f5f9;' : '');
                var stats = [];
                if (p.runs > 0) stats.push(p.runs + ' runs');
                if (p.wickets > 0) stats.push(p.wickets + ' wkts');
                row.innerHTML = '<div><strong style="color:#0f172a;font-weight:600;"></strong><span style="color:#64748b;font-size:12px;margin-left:8px;"></span></div><div class="sp-npl-mono" style="font-size:12px;color:#64748b;"></div>';
                row.querySelector('strong').textContent = p.name;
                row.querySelector('span').textContent = '· ' + p.role;
                row.querySelector('.sp-npl-mono').textContent = stats.join(' · ');
                sq.appendChild(row);
            });
            modal.classList.add('open');
        }
        (function(){
            if (typeof spNplInitAllFilters === 'function') spNplInitAllFilters();
            document.querySelectorAll('.sp-npl-mount').forEach(function(mount){
                var ui = mount.querySelector('.sp-npl-ui');
                if (!ui) return;
                var ajaxUrl = ui.getAttribute('data-ajax');
                var ver = ui.getAttribute('data-ver') || '0';
                if (!ajaxUrl) return;
                fetch(ajaxUrl + '?action=sp659_sync&ver=' + encodeURIComponent(ver) + '&_t=' + Date.now(), { credentials: 'same-origin' })
                    .then(function(r){ return r.json(); })
                    .then(function(res){
                        if (res && res.success && res.data && res.data.fresh === false && res.data.html) {
                            mount.innerHTML = res.data.html;
                            if (typeof spNplInitAllFilters === 'function') spNplInitAllFilters();
                        }
                    })
                    .catch(function(){});
            });
        })();
        </script>
        <?php
        return sp659_clean_shortcode_output(ob_get_clean());
    }
}

/* ─────────────────────────────────────────────────────────
   7. DEDICATED EDITORIAL NEWSROOM SHORTCODE: [setopress_npl_news]
   ───────────────────────────────────────────────────────── */
if (!function_exists('sp659_news_shortcode')) {
    function sp659_news_shortcode() {
        if (!defined('DONOTCACHEPAGE')) define('DONOTCACHEPAGE', true);
        do_action('litespeed_control_set_nocache', 'SetoPress NPL news hub');

        $d   = sp659_get_data(true);
        $sel = SP659_NPL_SERIES;
        if (!isset($d['series'][SP659_NPL_SERIES])) {
            sp659_load_defaults(false);
            $d = sp659_get_data(true);
        }

        $info       = $d['series'][$sel];
        $teams      = $info['teams'] ?? array();
        $saved_news = array_values($d['news'] ?? array());
        usort($saved_news, function($a, $b) {
            $cmp = strcmp($b['date'] ?? '', $a['date'] ?? '');
            return $cmp !== 0 ? $cmp : strcmp($b['time'] ?? '', $a['time'] ?? '');
        });
        $news_modal_payload = sp659_build_news_payload($saved_news, $info);

        ob_start();
        echo sp659_editorial_shared_css_and_js();
        ?>
        <style>
        .sp-npl-news-ui { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif !important; background: #fbfaf7 !important; border: 1px solid #e7e5e4 !important; border-radius: 16px !important; overflow: hidden !important; width: 100% !important; max-width: 1360px !important; margin: 24px auto !important; color: #0f172a !important; box-sizing: border-box !important; }
        .sp-npl-news-ui *, .sp-npl-news-ui *::before, .sp-npl-news-ui *::after { box-sizing: border-box !important; }
        </style>
        <div class="sp-npl-news-ui sp-news-filter-scope alignwide" data-news="<?php echo esc_attr(wp_json_encode($news_modal_payload)); ?>">
            <div style="background:#0d1542;color:#ffffff;padding:36px 34px;border-bottom:1px solid rgba(255,255,255,0.1);">
                <div style="display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px;">
                    <div>
                        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#5eead4;font-weight:700;">Nepal Premier League <?php echo esc_html($info['season'] ?? '2026'); ?> · Official Media Desk</div>
                        <h2 class="sp-ed-serif" style="margin:8px 0 0 !important;font-size:36px !important;font-weight:700 !important;color:#ffffff !important;line-height:1.15 !important;">The NPL Matchday Dispatch</h2>
                        <p style="margin:8px 0 0 !important;font-size:15px !important;color:#cbd5e1 !important;max-width:640px;line-height:1.6 !important;">Long-form match reports, official CAN press releases, and playing-condition updates from Tribhuvan University Cricket Ground.</p>
                    </div>
                    <div class="sp-npl-mono sp-news-count" style="font-size:12px;color:#cbd5e1;"><?php echo count($saved_news); ?> Stories Available · Click any headline to read in full</div>
                </div>
            </div>

            <?php echo sp659_render_news_filter_bar($teams, 'sp-news-filter-strip'); ?>

            <div style="padding:34px;">
                <?php echo sp659_render_news_stream($saved_news, $info); ?>
            </div>

            <?php echo sp659_render_reader_modal_markup(); ?>
        </div>
        <script>
        if (typeof spNplInitAllFilters === 'function') spNplInitAllFilters();
        </script>
        <?php
        return sp659_clean_shortcode_output(ob_get_clean());
    }
}

if (!function_exists('sp659_opengraph_meta')) {
    function sp659_opengraph_meta() {
        if (is_admin() || !is_singular()) return;
        global $post;
        if (!$post || empty($post->post_content)) return;
        if (!has_shortcode($post->post_content, 'setopress_npl') && !has_shortcode($post->post_content, 'setopress_npl_news')) return;

        $d = sp659_get_data(false);
        $sn = SP659_NPL_SERIES;
        $season = $d['series'][$sn]['season'] ?? '2026';
        $table  = sp659_calc_points($d, $sn);
        $leader = !empty($table[0]['name']) ? ($table[0]['name'] . ' (' . $table[0]['pts'] . ' pts)') : 'NPL Franchises';

        $completed = array_values(array_filter($d['matches'] ?? array(), function($m) {
            return is_array($m) && empty($m['live']) && sp659_resolve_match_outcome($m)['type'] !== 'fixture';
        }));
        usort($completed, function($a, $b) { return strcmp($b['date'] ?? '', $a['date'] ?? ''); });
        $latest = $completed[0] ?? null;

        $og_title = 'Nepal Premier League ' . $season . ' — Live Results, Official Points Table & News';
        $og_desc  = ($latest ? (sp659_match_result_label($latest) . ' · ') : '') . 'Standings Leader: ' . $leader . ' · Official SetoPress NPL Hub.';

        $og_img = add_query_arg('v', count($completed) . '_' . substr(md5(wp_json_encode($table)), 0, 8), rest_url('setopress-npl/v1/og-card'));

        echo '<meta property="og:title" content="' . esc_attr($og_title) . '">' . "\\n";
        echo '<meta property="og:description" content="' . esc_attr($og_desc) . '">' . "\\n";
        echo '<meta property="og:type" content="website">' . "\\n";
        echo '<meta property="og:image" content="' . esc_url($og_img) . '">' . "\\n";
        echo '<meta property="og:image:width" content="1200">' . "\\n";
        echo '<meta property="og:image:height" content="630">' . "\\n";
    }
}
add_action('wp_head', 'sp659_opengraph_meta', 5);

if (!function_exists('sp659_register_og_rest')) {
    function sp659_register_og_rest() {
        register_rest_route('setopress-npl/v1', '/og-card', array(
            'methods'             => 'GET',
            'permission_callback' => '__return_true',
            'callback'            => function() {
                $png = sp659_render_server_card_png(sp659_get_data(true));
                if ($png !== '') {
                    nocache_headers();
                    header('Content-Type: image/png');
                    header('Content-Length: ' . strlen($png));
                    echo $png;
                    exit;
                }
                return new WP_REST_Response(array('ok' => false), 404);
            }
        ));
    }
}
add_action('rest_api_init', 'sp659_register_og_rest');
`;

  if (format === 'plugin') {
    return `<?php
/**
 * Plugin Name: SetoPress Nepal Premier League Manager
 * Plugin URI:  https://setopress.com/
 * Description: Complete tournament manager for the Nepal Premier League (1:1 SetoPress Studio Sync, Direct MySQL Result Save, Inline Result Editor, Facebook Page 61590852571494 Publisher, LiteSpeed/CDN Cache Bypass, Built-in SVG Crests, Interactive Squad Modal, Official ICC NRR Points Table, Orange/Purple Cap Leaders, and Editorial Newsroom). Shortcodes: [setopress_npl], [setopress_npl_news]
 * Version:     6.5.9
 * Author:      SetoPress
 * License:     GPL-2.0+
 */

${coreBody}`;
  }

  if (format === 'functions') {
    return `<?php
// Paste at the bottom of your child theme's functions.php (omit the opening <?php tag if functions.php already has one)

${coreBody}`;
  }

  return `${coreBody}`;
}

export function getCodeSnippetsJsonExport(
  appData: NplDataState = INITIAL_NPL_DATA
): string {
  const code = getFixedWordPressPhpCode('snippet', appData);
  const payload = {
    generator: 'Code Snippets v3.6.5',
    date_created: new Date().toISOString().slice(0, 16).replace('T', ' '),
    snippets: [
      {
        name: 'SetoPress Nepal Premier League Manager (v6.5.9 — 1:1 App Sync + DB Save + FB Sync)',
        desc: 'Synced 1:1 with SetoPress NPL Studio app state, Direct MySQL result persistence, Facebook Page 61590852571494 sync, LiteSpeed/CDN cache bypass, and Editorial Newsroom. Shortcodes: [setopress_npl] and [setopress_npl_news].',
        tags: ['npl', 'cricket', 'setopress', 'facebook'],
        scope: 'global',
        code,
        priority: 10,
      },
    ],
  };
  return JSON.stringify(payload, null, 2);
}
