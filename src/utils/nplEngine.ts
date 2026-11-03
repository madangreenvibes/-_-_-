import {
  NplDataState,
  NplLiveBatter,
  NplLiveBowler,
  NplLiveOverGroup,
  NplMatch,
  NplSeries,
  NplTeam,
  PointsTableRow,
  SeriesFormat,
} from '../types/npl';

export const OFFICIAL_NPL_LOGO_PATH = '/assets/aistudio/NPL_Logo_3a0d4f44.jpg';

/**
 * Generates an inline SVG Data URI crest for a franchise or national side
 * so logos never break with 404s.
 */
export function makeTeamCrestSvg(short: string, primaryHex: string, accentHex = '#ffffff'): string {
  const safeShort = short.slice(0, 5).toUpperCase();
  const fontSize = safeShort.length >= 5 ? 18 : safeShort.length === 4 ? 21 : 25;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="g_${safeShort}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${primaryHex}"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="56" fill="url(#g_${safeShort})" stroke="${accentHex}" stroke-width="4"/>
    <circle cx="60" cy="60" r="47" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1.5"/>
    <path d="M36 33 L60 20 L84 33" fill="none" stroke="${accentHex}" stroke-width="2.5" stroke-linecap="round"/>
    <text x="60" y="69" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="${fontSize}" letter-spacing="1">${safeShort}</text>
    <circle cx="60" cy="92" r="3.5" fill="${accentHex}"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates a crisp rectangular SVG tournament emblem for international series (CWC, T20WC, ACC, etc.).
 */
export function makeSeriesEmblemSvg(
  code: string,
  subLabel: string,
  primaryHex: string,
  accentHex = '#fbbf24'
): string {
  const safeCode = code.slice(0, 6).toUpperCase();
  const safeSub = subLabel.slice(0, 18).toUpperCase();
  const codeSize = safeCode.length >= 5 ? 24 : 28;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 96">
    <defs>
      <linearGradient id="sg_${safeCode}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${primaryHex}"/>
        <stop offset="100%" stop-color="#090d16"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="216" height="92" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
    <circle cx="46" cy="48" r="30" fill="url(#sg_${safeCode})"/>
    <path d="M34 56 C40 36, 52 30, 62 26 C55 39, 48 48, 42 63 Z" fill="${accentHex}"/>
    <circle cx="38" cy="37" r="4.5" fill="#ffffff"/>
    <text x="90" y="52" fill="${primaryHex}" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="${codeSize}" letter-spacing="-0.5">${safeCode}</text>
    <text x="91" y="71" fill="#dc2626" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="9.5" letter-spacing="1.1">${safeSub}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Returns true if a logo is a wide horizontal lockup (like the official NPL logo or series emblem)
 * rather than a 1:1 circular crest.
 */
export function isWideSeriesLogo(logoUrl?: string, seriesName?: string): boolean {
  if (!logoUrl) return false;
  if (
    logoUrl.includes('NPL_Logo') ||
    logoUrl.includes('npl_logo') ||
    logoUrl.includes('viewBox%3D%220%200%20220%2096%22') ||
    logoUrl.includes('viewBox="0 0 220 96"')
  ) {
    return true;
  }
  if (seriesName === 'Nepal Premier League' && logoUrl.startsWith('data:image/jpeg')) {
    return true;
  }
  return false;
}

export function deriveSeriesShortCode(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'SER';
  const lower = trimmed.toLowerCase();
  if (lower.includes('nepal premier league')) return 'NPL';
  if (lower.includes('t20 world cup')) return 'T20WC';
  if (lower.includes('cricket world cup') || lower.includes('odi world cup')) return 'CWC';
  if (lower.includes('premier cup') || lower.startsWith('acc')) return 'ACC';
  if (lower.includes('champions trophy')) return 'CT';
  if (lower.includes('asia cup')) return 'AC';
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words
    .map((w) => w[0])
    .join('')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 5)
    .toUpperCase();
}

export function syncActiveSeriesIntoMap(data: NplDataState): Record<string, NplSeries> {
  const map: Record<string, NplSeries> = { ...(data.seriesMap || {}) };
  const activeKey = data.activeSeries || data.seriesName || 'Nepal Premier League';
  const existing = map[activeKey];
  map[activeKey] = {
    name: activeKey,
    code: existing?.code || deriveSeriesShortCode(activeKey),
    format: existing?.format || 'T20',
    maxOvers: existing?.maxOvers || (existing?.format === 'ODI' ? 50 : 20),
    season: data.season || existing?.season || '2026',
    category: existing?.category || 'Official Cricket Series',
    venue: existing?.venue || 'TU Cricket Ground, Kirtipur',
    logo: data.logo || existing?.logo || OFFICIAL_NPL_LOGO_PATH,
    teams: data.teams || existing?.teams || {},
  };
  return map;
}

export function getSeriesList(data: NplDataState): NplSeries[] {
  const synced = syncActiveSeriesIntoMap(data);
  const keys = Object.keys(synced);
  const orderedKeys = [
    ...(keys.includes('Nepal Premier League') ? ['Nepal Premier League'] : []),
    ...keys.filter((k) => k !== 'Nepal Premier League'),
  ];
  return orderedKeys.map((k) => synced[k]);
}

export function getActiveSeries(data: NplDataState): NplSeries {
  const synced = syncActiveSeriesIntoMap(data);
  const activeKey = data.activeSeries || data.seriesName || 'Nepal Premier League';
  return (
    synced[activeKey] ||
    Object.values(synced)[0] || {
      name: 'Nepal Premier League',
      code: 'NPL',
      format: 'T20',
      maxOvers: 20,
      season: data.season || '2026',
      category: 'Official CAN Franchise T20',
      venue: 'TU Cricket Ground, Kirtipur',
      logo: data.logo || OFFICIAL_NPL_LOGO_PATH,
      teams: data.teams || {},
    }
  );
}

export function switchActiveSeries(data: NplDataState, nextSeriesName: string): NplDataState {
  const synced = syncActiveSeriesIntoMap(data);
  const target = synced[nextSeriesName];
  if (!target) return data;
  return {
    ...data,
    activeSeries: target.name,
    seriesName: target.name,
    season: target.season,
    logo: target.logo,
    teams: target.teams,
    seriesMap: synced,
  };
}

export function updateActiveSeriesMeta(
  data: NplDataState,
  patch: Partial<Omit<NplSeries, 'name' | 'teams'>> & { teams?: Record<string, NplTeam> }
): NplDataState {
  const synced = syncActiveSeriesIntoMap(data);
  const activeKey = data.activeSeries || data.seriesName || 'Nepal Premier League';
  const cur = synced[activeKey];
  if (!cur) return data;
  const nextFormat: SeriesFormat = patch.format ?? cur.format ?? 'T20';
  const nextMaxOvers =
    patch.maxOvers ?? (patch.format ? (patch.format === 'ODI' ? 50 : 20) : cur.maxOvers || 20);
  const updatedSeries: NplSeries = {
    ...cur,
    ...patch,
    format: nextFormat,
    maxOvers: nextMaxOvers,
    teams: patch.teams ?? cur.teams,
  };
  const nextMap = {
    ...synced,
    [activeKey]: updatedSeries,
  };
  return {
    ...data,
    season: updatedSeries.season,
    logo: updatedSeries.logo,
    teams: updatedSeries.teams,
    seriesMap: nextMap,
  };
}

export function upsertSeriesInState(
  data: NplDataState,
  newSeries: NplSeries,
  makeActive = true
): NplDataState {
  const synced = syncActiveSeriesIntoMap(data);
  const nextMap: Record<string, NplSeries> = {
    ...synced,
    [newSeries.name]: newSeries,
  };
  if (makeActive) {
    return {
      ...data,
      activeSeries: newSeries.name,
      seriesName: newSeries.name,
      season: newSeries.season,
      logo: newSeries.logo,
      teams: newSeries.teams,
      seriesMap: nextMap,
    };
  }
  return {
    ...data,
    seriesMap: nextMap,
  };
}

export function deleteSeriesFromState(data: NplDataState, seriesNameToDelete: string): NplDataState {
  const synced = syncActiveSeriesIntoMap(data);
  const keys = Object.keys(synced);
  if (keys.length <= 1 || !synced[seriesNameToDelete]) {
    return data;
  }
  const nextMap: Record<string, NplSeries> = {};
  for (const k of keys) {
    if (k !== seriesNameToDelete) nextMap[k] = synced[k];
  }
  const fallbackKey =
    data.activeSeries === seriesNameToDelete
      ? Object.keys(nextMap)[0]
      : data.activeSeries;
  const nextActive = nextMap[fallbackKey] || Object.values(nextMap)[0];
  return {
    ...data,
    activeSeries: nextActive.name,
    seriesName: nextActive.name,
    season: nextActive.season,
    logo: nextActive.logo,
    teams: nextActive.teams,
    matches: data.matches.filter((m) => (m.series || 'Nepal Premier League') !== seriesNameToDelete),
    news: data.news.filter((n) => (n.series || 'Nepal Premier League') !== seriesNameToDelete),
    seriesMap: nextMap,
  };
}

/**
 * Converts cricket overs notation (e.g., "19.4" = 19.6667 overs)
 */
export function cricketOversToDecimal(oversRaw: string | number): number {
  const str = String(oversRaw ?? '').trim();
  if (!str) return 0;
  const numeric = Number(str);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;

  if (str.includes('.')) {
    const [wholePart, ballPart] = str.split('.');
    const completedOvers = parseInt(wholePart, 10) || 0;
    const balls = parseInt((ballPart || '0').slice(0, 1), 10) || 0;
    if (balls >= 6) {
      return completedOvers + Math.floor(balls / 6) + (balls % 6) / 6;
    }
    return completedOvers + balls / 6;
  }
  return numeric;
}

/**
 * Parses a cricket score string like "168/6", "176-5", "155" into runs & wickets.
 */
export function parseCricketScore(scoreRaw: string): {
  hasScore: boolean;
  runs: number;
  wickets: number;
} {
  const cleaned = String(scoreRaw ?? '').trim();
  if (!cleaned) {
    return { hasScore: false, runs: 0, wickets: 0 };
  }
  const match = cleaned.match(/^(\d+)(?:\s*[\/-]\s*(\d+))?$/);
  if (!match) {
    const fallbackRuns = parseInt(cleaned, 10);
    if (Number.isNaN(fallbackRuns)) {
      return { hasScore: false, runs: 0, wickets: 0 };
    }
    return { hasScore: true, runs: fallbackRuns, wickets: 0 };
  }
  const runs = parseInt(match[1], 10);
  const wickets = match[2] !== undefined ? Math.min(10, parseInt(match[2], 10)) : 0;
  return { hasScore: true, runs, wickets };
}

/**
 * Resolves the effective outcome of a match from winner dropdown, result_text, or scores.
 */
export function resolveMatchOutcome(match: NplMatch): {
  type: 'fixture' | 'team1' | 'team2' | 'tie' | 'nr';
  winnerName: string;
} {
  if (match.live) {
    return { type: 'fixture', winnerName: '' };
  }

  const w = (match.winner || '').trim();
  const rt = (match.result_text || '').trim().toLowerCase();
  const s1 = parseCricketScore(match.team1_score);
  const s2 = parseCricketScore(match.team2_score);

  if (w.toLowerCase() === 'no result' || w.toLowerCase() === 'abandoned' || rt.includes('no result') || rt.includes('abandoned')) {
    return { type: 'nr', winnerName: 'No Result' };
  }
  if (w.toLowerCase() === 'tie' || w.toLowerCase() === 'tied' || rt.includes('match tied')) {
    return { type: 'tie', winnerName: 'Tie' };
  }
  if (w && w === match.team1) {
    return { type: 'team1', winnerName: match.team1 };
  }
  if (w && w === match.team2) {
    return { type: 'team2', winnerName: match.team2 };
  }

  if (rt) {
    if (match.team1 && rt.includes(match.team1.toLowerCase()) && rt.includes('won')) {
      return { type: 'team1', winnerName: match.team1 };
    }
    if (match.team2 && rt.includes(match.team2.toLowerCase()) && rt.includes('won')) {
      return { type: 'team2', winnerName: match.team2 };
    }
  }

  if (s1.hasScore && s2.hasScore) {
    if (s1.runs > s2.runs) {
      return { type: 'team1', winnerName: match.team1 };
    }
    if (s2.runs > s1.runs) {
      return { type: 'team2', winnerName: match.team2 };
    }
    return { type: 'tie', winnerName: 'Tie' };
  }

  return { type: 'fixture', winnerName: '' };
}

/**
 * Generates clean human-readable result summary from scores & winner.
 */
export function generateAutoResultText(match: NplMatch): string {
  if (match.result_text && match.result_text.trim()) {
    return match.result_text.trim();
  }
  const outcome = resolveMatchOutcome(match);
  const s1 = parseCricketScore(match.team1_score);
  const s2 = parseCricketScore(match.team2_score);

  if (outcome.type === 'nr') return 'Match Abandoned / No Result (1 pt each)';
  if (outcome.type === 'tie') return 'Match Tied (1 pt each)';
  if (outcome.type === 'team1') {
    if (s1.hasScore && s2.hasScore && s1.runs > s2.runs) {
      const diff = s1.runs - s2.runs;
      return `${match.team1} won by ${diff} run${diff > 1 ? 's' : ''}`;
    }
    return `${match.team1} won the match`;
  }
  if (outcome.type === 'team2') {
    if (s1.hasScore && s2.hasScore && s2.runs > s1.runs) {
      const wktsLeft = Math.max(1, 10 - s2.wickets);
      return `${match.team2} won by ${wktsLeft} wicket${wktsLeft > 1 ? 's' : ''}`;
    }
    return `${match.team2} won the match`;
  }
  return match.live ? match.live_status || 'Match Live In Progress' : 'Upcoming Fixture';
}

/**
 * Calculates the Official ICC Points Table with format-aware All-Out NRR rule:
 * - T20 Series: bowled out (< 20 overs) counts as 20.0 overs faced.
 * - ODI Series (e.g. ICC Cricket World Cup): bowled out (< 50 overs) counts as 50.0 overs faced.
 * - Strictly isolates matches belonging to `targetSeriesName` (defaults to `data.activeSeries`).
 */
export function calculatePointsTable(
  data: NplDataState,
  targetSeriesName?: string
): PointsTableRow[] {
  const syncedMap = syncActiveSeriesIntoMap(data);
  const seriesKey = targetSeriesName || data.activeSeries || data.seriesName || 'Nepal Premier League';
  const seriesObj = syncedMap[seriesKey];
  const teamsSource = seriesObj ? seriesObj.teams : data.teams;
  const fullQuotaOvers = seriesObj?.maxOvers || (seriesObj?.format === 'ODI' ? 50.0 : 20.0);

  const table: Record<string, PointsTableRow> = {};

  for (const team of Object.values(teamsSource)) {
    table[team.name] = {
      name: team.name,
      shortCode: team.shortCode || team.name.slice(0, 3).toUpperCase(),
      color: team.color,
      logo: team.logo,
      p: 0,
      w: 0,
      l: 0,
      t: 0,
      nr: 0,
      pts: 0,
      runsFor: 0,
      oversFor: 0,
      runsAgainst: 0,
      oversAgainst: 0,
      nrr: 0,
    };
  }

  const seriesMatches = data.matches.filter(
    (m) => (m.series || 'Nepal Premier League') === seriesKey
  );

  for (const m of seriesMatches) {
    if (m.live) continue;
    const t1 = m.team1;
    const t2 = m.team2;
    if (!table[t1] || !table[t2]) continue;

    const outcome = resolveMatchOutcome(m);
    if (outcome.type === 'fixture') continue;

    table[t1].p += 1;
    table[t2].p += 1;

    if (outcome.type === 'nr') {
      table[t1].nr += 1;
      table[t2].nr += 1;
      table[t1].pts += 1;
      table[t2].pts += 1;
      continue;
    }

    if (outcome.type === 'team1') {
      table[t1].w += 1;
      table[t1].pts += 2;
      table[t2].l += 1;
    } else if (outcome.type === 'team2') {
      table[t2].w += 1;
      table[t2].pts += 2;
      table[t1].l += 1;
    } else if (outcome.type === 'tie') {
      table[t1].t += 1;
      table[t2].t += 1;
      table[t1].pts += 1;
      table[t2].pts += 1;
    }

    const s1 = parseCricketScore(m.team1_score);
    const s2 = parseCricketScore(m.team2_score);
    if (s1.hasScore && s2.hasScore) {
      let o1 = cricketOversToDecimal(m.team1_overs);
      let o2 = cricketOversToDecimal(m.team2_overs);

      if (o1 <= 0) o1 = fullQuotaOvers;
      if (o2 <= 0) o2 = fullQuotaOvers;

      if (s1.wickets >= 10 && o1 < fullQuotaOvers) o1 = fullQuotaOvers;
      if (s2.wickets >= 10 && o2 < fullQuotaOvers) o2 = fullQuotaOvers;

      table[t1].runsFor += s1.runs;
      table[t1].oversFor += o1;
      table[t1].runsAgainst += s2.runs;
      table[t1].oversAgainst += o2;

      table[t2].runsFor += s2.runs;
      table[t2].oversFor += o2;
      table[t2].runsAgainst += s1.runs;
      table[t2].oversAgainst += o1;
    }
  }

  const rows = Object.values(table).map((row) => {
    const rateFor = row.oversFor > 0 ? row.runsFor / row.oversFor : 0;
    const rateAgainst = row.oversAgainst > 0 ? row.runsAgainst / row.oversAgainst : 0;
    return {
      ...row,
      nrr: rateFor - rateAgainst,
    };
  });

  rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (Math.abs(b.nrr - a.nrr) > 1e-6) return b.nrr - a.nrr;
    if (b.w !== a.w) return b.w - a.w;
    return a.name.localeCompare(b.name);
  });

  return rows;
}

/**
 * Parses compact Admin ball-by-ball timeline string:
 * "1lb, 1, •, 1w, 1w, 1w, • | 14th=13: 1, 1, 1, 2, 4, 4 | 13th=9: 2, 2, 1w, 1, W"
 */
export function parseOversTimeline(input: string): NplLiveOverGroup[] {
  const raw = (input || '').trim();
  if (!raw) return [];
  return raw
    .split('|')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      let over_label = '';
      let runs: number | undefined;
      let ballsPart = chunk;

      const colonIdx = chunk.indexOf(':');
      if (colonIdx !== -1) {
        const prefix = chunk.slice(0, colonIdx).trim();
        ballsPart = chunk.slice(colonIdx + 1).trim();
        const eqIdx = prefix.indexOf('=');
        if (eqIdx !== -1) {
          over_label = prefix.slice(0, eqIdx).trim();
          const parsedRuns = parseInt(prefix.slice(eqIdx + 1).trim(), 10);
          if (!Number.isNaN(parsedRuns)) runs = parsedRuns;
        } else {
          over_label = prefix;
        }
      }

      const balls = ballsPart
        .split(/[\s,]+/)
        .map((b) => b.trim())
        .filter(Boolean)
        .map((b) => (b === '.' ? '•' : b));

      return { over_label, runs, balls };
    })
    .filter((g) => g.balls.length > 0);
}

export function serializeOversTimeline(overs: NplLiveOverGroup[]): string {
  if (!overs || overs.length === 0) return '';
  return overs
    .map((g) => {
      const ballsStr = (g.balls || []).join(', ');
      if (g.over_label) {
        const prefix = g.runs !== undefined ? `${g.over_label}=${g.runs}` : g.over_label;
        return `${prefix}: ${ballsStr}`;
      }
      return ballsStr;
    })
    .join(' | ');
}

export function formatLongMatchDate(dateStr: string): string {
  if (!dateStr) return 'November 02, 2026';
  const parts = dateStr.split('-').map((n) => parseInt(n, 10));
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const mName = months[(parts[1] - 1 + 12) % 12] || 'November';
    const dayPad = String(parts[2]).padStart(2, '0');
    return `${mName} ${dayPad}, ${parts[0]}`;
  }
  return dateStr;
}

export function cricketOversToBalls(oversRaw: string | number): number {
  const str = String(oversRaw ?? '').trim();
  if (!str) return 0;
  if (str.includes('.')) {
    const [w, b] = str.split('.');
    return (parseInt(w, 10) || 0) * 6 + Math.min(5, parseInt((b || '0').slice(0, 1), 10) || 0);
  }
  const n = parseInt(str, 10);
  return Number.isFinite(n) ? n * 6 : 0;
}

export interface ResolvedLiveScorecard {
  battingSide: 'team1' | 'team2';
  target: number;
  matchNo: string;
  venueShort: string;
  dateLong: string;
  seriesName: string;
  seriesCode: string;
  careerHeading: string;
  isLive: boolean;
  isCompleted: boolean;
  battingTeamName: string;
  battingTeamShort: string;
  battingTeamLogo: string;
  bowlingTeamName: string;
  activeScore: string;
  oversAndTargetText: string;
  firstInningsSummary: string;
  statusEquation: string;
  batters: (NplLiveBatter & { srFormatted: string })[];
  bowlers: (NplLiveBowler & { econFormatted: string })[];
  lastBat: string;
  fow: string;
  recentOvers: NplLiveOverGroup[];
}

export function resolveLiveScorecard(
  match: NplMatch,
  teams: Record<string, NplTeam>,
  matchIndexHint = 1,
  seriesContext?: {
    code?: string;
    format?: SeriesFormat;
    maxOvers?: number;
  }
): ResolvedLiveScorecard {
  const s1 = parseCricketScore(match.team1_score);
  const s2 = parseCricketScore(match.team2_score);
  const outcome = resolveMatchOutcome(match);
  const ld = match.live_details;

  const seriesName = match.series || 'Nepal Premier League';
  const seriesCode = seriesContext?.code || deriveSeriesShortCode(seriesName);
  const format: SeriesFormat = seriesContext?.format || 'T20';
  const maxOvers = seriesContext?.maxOvers || (format === 'ODI' ? 50 : 20);
  const maxBalls = maxOvers * 6;
  const careerHeading = `${format} CAREER`;

  const battingSide: 'team1' | 'team2' =
    ld?.batting_team || (s2.hasScore ? 'team2' : 'team1');

  const battingTeamName = battingSide === 'team2' ? match.team2 : match.team1;
  const bowlingTeamName = battingSide === 'team2' ? match.team1 : match.team2;
  const batTeam = teams[battingTeamName];
  const bowlTeam = teams[bowlingTeamName];

  const venueParts = (match.venue || 'TU Cricket Ground, Kirtipur').split(',');
  const venueShort = (venueParts[venueParts.length - 1] || venueParts[0] || 'Kirtipur').trim();

  const ordinal = (n: number) => {
    const v = n % 100;
    const suf = ['th', 'st', 'nd', 'rd'][(v - 20) % 10] || ['th', 'st', 'nd', 'rd'][v] || 'th';
    return `${n}${suf} Match`;
  };
  const matchNo = match.match_no || ordinal(matchIndexHint);

  const activeScoreObj = battingSide === 'team2' ? s2 : s1;
  const rawOvers = (battingSide === 'team2' ? match.team2_overs : match.team1_overs) || '';
  const target =
    ld?.target ?? (battingSide === 'team2' && s1.hasScore ? s1.runs + 1 : 0);

  const activeScore = activeScoreObj.hasScore
    ? `${battingSide === 'team2' ? match.team2_score : match.team1_score}`
    : 'Yet to bat';

  let oversAndTargetText = '';
  if (activeScoreObj.hasScore) {
    const ovDisp = rawOvers || String(maxOvers);
    oversAndTargetText =
      target > 0
        ? `(${ovDisp}/${maxOvers} ov, T:${target})`
        : `(${ovDisp}/${maxOvers} ov)`;
  }

  const firstInningsSummary =
    battingSide === 'team2' && s1.hasScore
      ? `${match.team1} ${match.team1_score}${match.team1_overs ? ` (${match.team1_overs}/${maxOvers} ov)` : ''}`
      : '';

  let statusEquation = '';
  if (match.live) {
    if (match.live_status && match.live_status.trim()) {
      statusEquation = match.live_status.trim();
    } else if (battingSide === 'team2' && target > 0 && activeScoreObj.hasScore) {
      const runsNeeded = Math.max(0, target - activeScoreObj.runs);
      const ballsLeft = Math.max(0, maxBalls - cricketOversToBalls(rawOvers));
      const shortCity = battingTeamName.split(' ')[0];
      statusEquation =
        runsNeeded > 0
          ? `${shortCity} need ${runsNeeded} runs in ${ballsLeft} balls.`
          : 'Scores level.';
    } else {
      statusEquation = `${battingTeamName} opted to bat first.`;
    }
  } else if (outcome.type !== 'fixture') {
    statusEquation = generateAutoResultText(match);
  } else {
    statusEquation = match.result_text || `Scheduled · Starts at ${match.time || '13:15'} NPT`;
  }

  const batPlayers = batTeam?.players || [];
  const bowlPlayers = bowlTeam?.players || [];

  const defaultBatters: NplLiveBatter[] =
    ld?.batters && ld.batters.length > 0
      ? ld.batters
      : [
          {
            name: batPlayers[0]?.name || batTeam?.captain || `${battingTeamName} Batter 1`,
            hand: 'rhb',
            striker: true,
            r: activeScoreObj.hasScore ? Math.max(12, Math.round(activeScoreObj.runs * 0.34)) : 0,
            b: activeScoreObj.hasScore
              ? Math.max(10, Math.round(activeScoreObj.runs * (format === 'ODI' ? 0.39 : 0.28)))
              : 0,
            fours: activeScoreObj.hasScore ? 4 : 0,
            sixes: activeScoreObj.hasScore ? 2 : 0,
            this_bowler: activeScoreObj.hasScore ? '6 (4b)' : '-',
            last_5: activeScoreObj.hasScore ? '7 (5b)' : '-',
            mat: format === 'ODI' ? 54 : 46,
            career_runs: Math.max(820, (batPlayers[0]?.runs || 180) * 6),
            hs: format === 'ODI' ? '115' : '82*',
            ave: format === 'ODI' ? '36.40' : '29.40',
          },
          {
            name: batPlayers[1]?.name || `${battingTeamName} Batter 2`,
            hand: 'lhb',
            striker: false,
            r: activeScoreObj.hasScore ? Math.max(8, Math.round(activeScoreObj.runs * 0.22)) : 0,
            b: activeScoreObj.hasScore
              ? Math.max(9, Math.round(activeScoreObj.runs * (format === 'ODI' ? 0.28 : 0.2)))
              : 0,
            fours: activeScoreObj.hasScore ? 3 : 0,
            sixes: activeScoreObj.hasScore ? 1 : 0,
            this_bowler: activeScoreObj.hasScore ? '4 (3b)' : '-',
            last_5: activeScoreObj.hasScore ? '5 (5b)' : '-',
            mat: format === 'ODI' ? 42 : 38,
            career_runs: Math.max(640, (batPlayers[1]?.runs || 140) * 5),
            hs: format === 'ODI' ? '94*' : '74',
            ave: format === 'ODI' ? '33.10' : '26.85',
          },
        ];

  const batters = defaultBatters.map((b) => {
    const sr = b.b > 0 ? ((b.r / b.b) * 100).toFixed(2) : '0.00';
    return {
      ...b,
      this_bowler: b.this_bowler || '-',
      last_5: b.last_5 || '-',
      mat: b.mat ?? 34,
      career_runs: b.career_runs ?? 615,
      hs: b.hs || '68',
      ave: b.ave || '25.60',
      srFormatted: sr,
    };
  });

  const preferredBowlers = bowlPlayers.filter(
    (p) =>
      String(p.role).toLowerCase().includes('bowl') ||
      String(p.role).toLowerCase().includes('all')
  );
  const bPool = preferredBowlers.length >= 2 ? preferredBowlers : bowlPlayers;

  const defaultBowlers: NplLiveBowler[] =
    ld?.bowlers && ld.bowlers.length > 0
      ? ld.bowlers
      : [
          {
            name: bPool[0]?.name || bowlTeam?.captain || `${bowlingTeamName} Bowler 1`,
            arm: 'rm',
            o: activeScoreObj.hasScore ? (format === 'ODI' ? '8' : '4') : '0',
            m: activeScoreObj.hasScore && format === 'ODI' ? 1 : 0,
            r: activeScoreObj.hasScore ? (format === 'ODI' ? 38 : 26) : 0,
            w: activeScoreObj.hasScore ? Math.min(3, Math.max(1, Math.floor(activeScoreObj.wickets / 2))) : 0,
            dots: activeScoreObj.hasScore ? (format === 'ODI' ? 26 : 11) : 0,
            fours: activeScoreObj.hasScore ? 2 : 0,
            sixes: activeScoreObj.hasScore ? 1 : 0,
            this_spell: '-',
            mat: format === 'ODI' ? 58 : 52,
            career_wkts: Math.max(44, (bPool[0]?.wickets || 8) * 7),
            bbi: format === 'ODI' ? '5/32' : '4/18',
            ave: format === 'ODI' ? '23.40' : '19.80',
          },
          {
            name: bPool[1]?.name || `${bowlingTeamName} Bowler 2`,
            arm: 'lb',
            o: activeScoreObj.hasScore ? (format === 'ODI' ? '7' : '3') : '0',
            m: 0,
            r: activeScoreObj.hasScore ? (format === 'ODI' ? 34 : 24) : 0,
            w: activeScoreObj.hasScore ? (activeScoreObj.wickets > 2 ? 1 : 0) : 0,
            dots: activeScoreObj.hasScore ? (format === 'ODI' ? 21 : 8) : 0,
            fours: activeScoreObj.hasScore ? 2 : 0,
            sixes: activeScoreObj.hasScore ? 1 : 0,
            this_spell: '-',
            mat: format === 'ODI' ? 46 : 41,
            career_wkts: Math.max(36, (bPool[1]?.wickets || 6) * 6),
            bbi: format === 'ODI' ? '4/29' : '3/21',
            ave: format === 'ODI' ? '25.90' : '22.40',
          },
        ];

  const bowlers = defaultBowlers.map((bw) => {
    const decOvers = cricketOversToDecimal(bw.o);
    const econ = decOvers > 0 ? (bw.r / decOvers).toFixed(2) : '0.00';
    return {
      ...bw,
      this_spell: bw.this_spell || '-',
      mat: bw.mat ?? 30,
      career_wkts: bw.career_wkts ?? 35,
      bbi: bw.bbi || '3/22',
      ave: bw.ave || '21.50',
      econFormatted: econ,
    };
  });

  const lastBat =
    ld?.last_bat ||
    (activeScoreObj.hasScore && activeScoreObj.wickets > 0
      ? `${batPlayers[2]?.name || 'Middle Order'} 18 (14b)`
      : 'None yet');
  const fow =
    ld?.fow ||
    (activeScoreObj.hasScore && activeScoreObj.wickets > 0
      ? `${Math.max(12, activeScoreObj.runs - 24)}/${activeScoreObj.wickets} (${rawOvers || String(maxOvers - 2)} Ov)`
      : '-');

  const recentOvers: NplLiveOverGroup[] =
    ld?.recent_overs && ld.recent_overs.length > 0
      ? ld.recent_overs
      : activeScoreObj.hasScore
      ? [
          {
            over_label: format === 'ODI' ? '49th' : '20th',
            runs: 11,
            balls: ['1', '4', '•', '2', '4', '•'],
          },
          {
            over_label: format === 'ODI' ? '48th' : '19th',
            runs: 9,
            balls: ['1', '1', '6', '•', '1', 'W'],
          },
        ]
      : [];

  return {
    battingSide,
    target,
    matchNo,
    venueShort,
    dateLong: formatLongMatchDate(match.date),
    seriesName,
    seriesCode,
    careerHeading,
    isLive: match.live,
    isCompleted: !match.live && outcome.type !== 'fixture',
    battingTeamName,
    battingTeamShort: batTeam?.shortCode || battingTeamName.slice(0, 3).toUpperCase(),
    battingTeamLogo:
      batTeam?.logo || makeTeamCrestSvg(battingTeamName.slice(0, 3).toUpperCase(), '#0d1542'),
    bowlingTeamName,
    activeScore,
    oversAndTargetText,
    firstInningsSummary,
    statusEquation,
    batters,
    bowlers,
    lastBat,
    fow,
    recentOvers,
  };
}
