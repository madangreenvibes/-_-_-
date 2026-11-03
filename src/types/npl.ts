export type PlayerRole =
  | 'Captain'
  | 'Vice-captain'
  | 'Marquee Player'
  | 'Batsman'
  | 'Allrounder'
  | 'Bowler'
  | 'Wicketkeeper';

export interface NplPlayer {
  name: string;
  role: PlayerRole | string;
  runs?: number;
  wickets?: number;
  matches?: number;
  photo?: string;
}

export interface NplTeam {
  name: string;
  shortCode: string;
  logo: string;
  color: string;
  captain: string;
  coach: string;
  owner?: string;
  venue: string;
  titles?: string;
  description: string;
  players: NplPlayer[];
}

export type SeriesFormat = 'T20' | 'ODI';

export interface NplSeries {
  name: string;
  code: string;
  format: SeriesFormat;
  maxOvers: number;
  season: string;
  category: string;
  venue: string;
  logo: string;
  teams: Record<string, NplTeam>;
}

export interface NplLiveBatter {
  name: string;
  hand?: string; // e.g. 'rhb' | 'lhb'
  striker?: boolean;
  r: number;
  b: number;
  fours: number;
  sixes: number;
  this_bowler?: string;
  last_5?: string;
  mat?: number;
  career_runs?: number;
  hs?: string;
  ave?: string;
}

export interface NplLiveBowler {
  name: string;
  arm?: string; // e.g. 'rm' | 'rfm' | 'lb' | 'sla' | 'ob'
  o: string;
  m: number;
  r: number;
  w: number;
  dots: number;
  fours: number;
  sixes: number;
  this_spell?: string;
  mat?: number;
  career_wkts?: number;
  bbi?: string;
  ave?: string;
}

export interface NplLiveOverGroup {
  over_label?: string; // e.g. '14th' | '13th' | ''
  runs?: number;
  balls: string[]; // e.g. ['1lb', '1', '•', '1w', '1w', '1w', '•']
}

export interface NplLiveDetails {
  batting_team?: 'team1' | 'team2';
  target?: number;
  last_bat?: string;
  fow?: string;
  batters: NplLiveBatter[];
  bowlers: NplLiveBowler[];
  recent_overs: NplLiveOverGroup[];
}

export interface NplMatch {
  id: string;
  series: string;
  match_no: string;
  date: string;
  time: string;
  venue: string;
  team1: string;
  team2: string;
  team1_score: string;
  team1_overs: string;
  team2_score: string;
  team2_overs: string;
  winner: string;
  result_text: string;
  live: boolean;
  live_status: string;
  live_details?: NplLiveDetails;
}

export type NewsCategory = 'match' | 'press' | 'update';

export interface NplNewsItem {
  id: string;
  series?: string;
  title: string;
  category: NewsCategory;
  date: string;
  time?: string;
  author?: string;
  team1?: string;
  team2?: string;
  image?: string;
  excerpt: string;
  content: string;
  quote?: string;
}

export interface NplDataState {
  seriesName: string;
  season: string;
  logo: string;
  activeSeries: string;
  seriesMap: Record<string, NplSeries>;
  teams: Record<string, NplTeam>;
  matches: NplMatch[];
  news: NplNewsItem[];
}

export interface PointsTableRow {
  name: string;
  shortCode: string;
  color: string;
  logo: string;
  p: number;
  w: number;
  l: number;
  t: number;
  nr: number;
  pts: number;
  runsFor: number;
  oversFor: number;
  runsAgainst: number;
  oversAgainst: number;
  nrr: number;
}

export interface BugFixItem {
  id: string;
  severity: 'Critical' | 'High' | 'Medium';
  title: string;
  linesInOriginal: string;
  symptom: string;
  rootCause: string;
  beforeCode: string;
  afterCode: string;
}
