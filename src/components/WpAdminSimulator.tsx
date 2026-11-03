import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plus, RotateCcw, Trash2 } from 'lucide-react';
import {
  NewsCategory,
  NplDataState,
  NplLiveBatter,
  NplLiveBowler,
  NplLiveDetails,
  NplMatch,
  NplNewsItem,
  NplSeries,
  NplTeam,
  PlayerRole,
  SeriesFormat,
} from '../types/npl';
import {
  OFFICIAL_NPL_LOGO_PATH,
  calculatePointsTable,
  deleteSeriesFromState,
  deriveSeriesShortCode,
  generateAutoResultText,
  getActiveSeries,
  getSeriesList,
  isWideSeriesLogo,
  makeSeriesEmblemSvg,
  makeTeamCrestSvg,
  parseOversTimeline,
  resolveLiveScorecard,
  resolveMatchOutcome,
  serializeOversTimeline,
  switchActiveSeries,
  updateActiveSeriesMeta,
  upsertSeriesInState,
} from '../utils/nplEngine';
import { FacebookPagePublisher } from './FacebookPagePublisher';

interface WpAdminSimulatorProps {
  data: NplDataState;
  initialSubTab?: 'series' | 'matches' | 'teams' | 'news' | 'facebook';
  onUpdateData: (next: NplDataState) => void;
  onResetDemo: () => void;
  onSwitchToPreview: () => void;
}

const ROLES: PlayerRole[] = [
  'Captain',
  'Vice-captain',
  'Marquee Player',
  'Batsman',
  'Allrounder',
  'Bowler',
  'Wicketkeeper',
];

const TEAM_BRAND_PALETTE = [
  '#1a237e',
  '#c8102e',
  '#0f766e',
  '#0369a1',
  '#b45309',
  '#4338ca',
  '#15803d',
  '#be123c',
];

export const WpAdminSimulator: React.FC<WpAdminSimulatorProps> = ({
  data,
  initialSubTab = 'matches',
  onUpdateData,
  onResetDemo,
  onSwitchToPreview,
}) => {
  const [adminTab, setAdminTab] = useState<'series' | 'matches' | 'teams' | 'news' | 'facebook'>(
    initialSubTab
  );
  const [notice, setNotice] = useState<string>('');

  useEffect(() => {
    setAdminTab(initialSubTab);
  }, [initialSubTab]);

  const seriesList = useMemo(() => getSeriesList(data), [data]);
  const activeSeries = useMemo(() => getActiveSeries(data), [data]);
  const defaultOversQuota = `${activeSeries.maxOvers}.0`;

  const teamNames = Object.keys(activeSeries.teams);
  const liveStandings = useMemo(
    () => calculatePointsTable(data, activeSeries.name),
    [data, activeSeries.name]
  );

  const seriesMatches = useMemo(
    () =>
      data.matches.filter(
        (m) => (m.series || 'Nepal Premier League') === activeSeries.name
      ),
    [data.matches, activeSeries.name]
  );

  const seriesNews = useMemo(
    () =>
      data.news.filter(
        (n) => !n.series || n.series === activeSeries.name
      ),
    [data.news, activeSeries.name]
  );

  const { liveMatches, upcomingFixtures } = useMemo(() => {
    const live = seriesMatches.filter((m) => m.live);
    const fixtures = seriesMatches
      .filter((m) => !m.live && resolveMatchOutcome(m).type === 'fixture')
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
    return { liveMatches: live, upcomingFixtures: fixtures };
  }, [seriesMatches]);

  const matchFormRef = useRef<HTMLFormElement | null>(null);
  const t1ScoreInputRef = useRef<HTMLInputElement | null>(null);

  // Series Creator & Active Series Metadata State
  const [newSeriesName, setNewSeriesName] = useState<string>('');
  const [newSeriesCode, setNewSeriesCode] = useState<string>('');
  const [newSeriesFormat, setNewSeriesFormat] = useState<SeriesFormat>('T20');
  const [newSeriesSeason, setNewSeriesSeason] = useState<string>('2026');
  const [newSeriesCategory, setNewSeriesCategory] = useState<string>('ICC Global Tournament');
  const [newSeriesVenue, setNewSeriesVenue] = useState<string>('TU Cricket Ground, Kirtipur');
  const [newSeriesLogo, setNewSeriesLogo] = useState<string>('');
  const [newSeriesTeamsCsv, setNewSeriesTeamsCsv] = useState<string>(
    'Nepal, India, Australia, England, South Africa, New Zealand'
  );

  const [editSeriesCode, setEditSeriesCode] = useState<string>(activeSeries.code);
  const [editSeriesFormat, setEditSeriesFormat] = useState<SeriesFormat>(activeSeries.format);
  const [editSeriesSeason, setEditSeriesSeason] = useState<string>(activeSeries.season);
  const [editSeriesCategory, setEditSeriesCategory] = useState<string>(activeSeries.category);
  const [editSeriesVenue, setEditSeriesVenue] = useState<string>(activeSeries.venue);
  const [editSeriesLogo, setEditSeriesLogo] = useState<string>(activeSeries.logo);

  // Match Form State
  const [editingMatchId, setEditingMatchId] = useState<string>('');
  const [matchNo, setMatchNo] = useState<string>(`Match ${seriesMatches.length + 1}`);
  const [matchDate, setMatchDate] = useState<string>('2026-11-02');
  const [matchTime, setMatchTime] = useState<string>('12:15');
  const [matchVenue, setMatchVenue] = useState<string>(activeSeries.venue);
  const [team1, setTeam1] = useState<string>(teamNames[0] || '');
  const [team2, setTeam2] = useState<string>(teamNames[1] || '');
  const [team1Score, setTeam1Score] = useState<string>('');
  const [team1Overs, setTeam1Overs] = useState<string>('');
  const [team2Score, setTeam2Score] = useState<string>('');
  const [team2Overs, setTeam2Overs] = useState<string>('');
  const [winner, setWinner] = useState<string>('');
  const [resultText, setResultText] = useState<string>('');
  const [matchStatus, setMatchStatus] = useState<'fixture' | 'live' | 'completed'>('completed');
  const [liveStatus, setLiveStatus] = useState<string>('');
  const [liveBattingSide, setLiveBattingSide] = useState<'team1' | 'team2'>('team2');
  const [liveTarget, setLiveTarget] = useState<string>('');
  const [liveLastBat, setLiveLastBat] = useState<string>('');
  const [liveFow, setLiveFow] = useState<string>('');
  const [liveOversTimeline, setLiveOversTimeline] = useState<string>(
    '1lb, 1, •, 1w, 1w, 1w, • | 14th=13: 1, 1, 1, 2, 4, 4 | 13th=9: 2, 2, 1w, 1, W'
  );
  const [liveBatters, setLiveBatters] = useState<NplLiveBatter[]>([
    {
      name: 'Karan KC',
      hand: 'rhb',
      striker: true,
      r: 14,
      b: 9,
      fours: 2,
      sixes: 0,
      this_bowler: '1 (6b)',
      last_5: '2 (4b)',
      mat: 102,
      career_runs: 549,
      hs: '45',
      ave: '14.84',
    },
    {
      name: 'Rashid Khan',
      hand: 'rhb',
      striker: false,
      r: 39,
      b: 27,
      fours: 1,
      sixes: 2,
      this_bowler: '13 (7b)',
      last_5: '0 (1b)',
      mat: 7,
      career_runs: 84,
      hs: '39*',
      ave: '16.80',
    },
  ]);
  const [liveBowlers, setLiveBowlers] = useState<NplLiveBowler[]>([
    {
      name: 'Nandan Yadav',
      arm: 'rm',
      o: '2.4',
      m: 0,
      r: 20,
      w: 1,
      dots: 10,
      fours: 1,
      sixes: 1,
      this_spell: '-',
      mat: 22,
      career_wkts: 26,
      bbi: '2/13',
      ave: '19.15',
    },
    {
      name: 'Gulsan Jha',
      arm: 'rm',
      o: '2',
      m: 0,
      r: 23,
      w: 0,
      dots: 2,
      fours: 2,
      sixes: 1,
      this_spell: '-',
      mat: 68,
      career_wkts: 31,
      bbi: '3/31',
      ave: '24.23',
    },
  ]);

  // Inline Quick Result Editor State
  const [quickResultId, setQuickResultId] = useState<string>('');
  const [qrT1Score, setQrT1Score] = useState<string>('');
  const [qrT1Overs, setQrT1Overs] = useState<string>('');
  const [qrT2Score, setQrT2Score] = useState<string>('');
  const [qrT2Overs, setQrT2Overs] = useState<string>('');
  const [qrWinner, setQrWinner] = useState<string>('');
  const [qrSummary, setQrSummary] = useState<string>('');

  // Team Editor State
  const [selectedTeamName, setSelectedTeamName] = useState<string>(teamNames[0] || '');
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPlayerRole, setNewPlayerRole] = useState<PlayerRole>('Batsman');
  const [newPlayerRuns, setNewPlayerRuns] = useState<string>('');
  const [newPlayerWickets, setNewPlayerWickets] = useState<string>('');

  // New Team Creator State
  const [addTeamName, setAddTeamName] = useState<string>('');
  const [addTeamShort, setAddTeamShort] = useState<string>('');
  const [addTeamCaptain, setAddTeamCaptain] = useState<string>('');
  const [addTeamColor, setAddTeamColor] = useState<string>('#1a237e');

  // News Editor State
  const [editingNewsId, setEditingNewsId] = useState<string>('');
  const [newsSeries, setNewsSeries] = useState<string>(activeSeries.name);
  const [newsTitle, setNewsTitle] = useState<string>('');
  const [newsCategory, setNewsCategory] = useState<NewsCategory>('match');
  const [newsDate, setNewsDate] = useState<string>('2026-10-30');
  const [newsTime, setNewsTime] = useState<string>('16:00');
  const [newsAuthor, setNewsAuthor] = useState<string>('SetoPress Cricket Desk · Kirtipur');
  const [newsImage, setNewsImage] = useState<string>('');
  const [newsTeam1, setNewsTeam1] = useState<string>('');
  const [newsTeam2, setNewsTeam2] = useState<string>('');
  const [newsExcerpt, setNewsExcerpt] = useState<string>('');
  const [newsContent, setNewsContent] = useState<string>('');
  const [newsQuote, setNewsQuote] = useState<string>('');

  // Keep forms synced whenever Active Series changes
  useEffect(() => {
    const names = Object.keys(activeSeries.teams);
    setSelectedTeamName((prev) => (names.includes(prev) ? prev : names[0] || ''));
    setTeam1((prev) => (names.includes(prev) ? prev : names[0] || ''));
    setTeam2((prev) => (names.includes(prev) && prev !== names[0] ? prev : names[1] || names[0] || ''));
    setMatchVenue(activeSeries.venue);
    setMatchNo(`Match ${seriesMatches.length + 1}`);
    setEditingMatchId('');
    setQuickResultId('');
    setNewsSeries(activeSeries.name);
    setEditSeriesCode(activeSeries.code);
    setEditSeriesFormat(activeSeries.format);
    setEditSeriesSeason(activeSeries.season);
    setEditSeriesCategory(activeSeries.category);
    setEditSeriesVenue(activeSeries.venue);
    setEditSeriesLogo(activeSeries.logo);
  }, [activeSeries.name]);

  const showSavedBanner = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 5000);
  };

  const handleSelectSeriesAdmin = (targetName: string) => {
    const next = switchActiveSeries(data, targetName);
    onUpdateData(next);
    showSavedBanner(`Switched active admin tournament to ${targetName}.`);
  };

  const handleCreateSeries = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newSeriesName.trim();
    if (!cleanName) {
      showSavedBanner('Please enter a Series Name (e.g. ICC Champions Trophy).');
      return;
    }
    if (data.seriesMap?.[cleanName]) {
      showSavedBanner(`Series "${cleanName}" already exists. Switching to it.`);
      onUpdateData(switchActiveSeries(data, cleanName));
      return;
    }

    const code = (newSeriesCode.trim() || deriveSeriesShortCode(cleanName)).toUpperCase();
    const format: SeriesFormat = newSeriesFormat === 'ODI' ? 'ODI' : 'T20';
    const maxOvers = format === 'ODI' ? 50 : 20;
    const venue = newSeriesVenue.trim() || 'TU Cricket Ground, Kirtipur';
    const logo =
      newSeriesLogo.trim() || makeSeriesEmblemSvg(code, '#035fb2', '#c8102e');

    const rawTeamNames = newSeriesTeamsCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const effectiveTeamNames =
      rawTeamNames.length >= 2 ? rawTeamNames : ['Team Alpha', 'Team Bravo'];

    const generatedTeams: Record<string, NplTeam> = {};
    effectiveTeamNames.forEach((tName, idx) => {
      const words = tName.split(/\s+/).filter(Boolean);
      const shortCode =
        words.length >= 2
          ? words
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 4)
          : tName.slice(0, 3).toUpperCase();
      const color = TEAM_BRAND_PALETTE[idx % TEAM_BRAND_PALETTE.length];
      generatedTeams[tName] = {
        shortCode,
        color,
        logo: makeTeamCrestSvg(shortCode, color, '#f8fafc'),
        captain: `${tName} Captain`,
        coach: 'National Coaching Staff',
        owner: `${code} Cricket Board`,
        venue,
        players: [
          { name: `${tName} Skipper`, role: 'Captain', runs: 0, wickets: 0 },
          { name: `${tName} Opener`, role: 'Batsman', runs: 0, wickets: 0 },
          { name: `${tName} Allrounder`, role: 'Allrounder', runs: 0, wickets: 0 },
          { name: `${tName} Strike Bowler`, role: 'Bowler', runs: 0, wickets: 0 },
        ],
      };
    });

    const createdSeries: NplSeries = {
      name: cleanName,
      code,
      format,
      maxOvers,
      season: newSeriesSeason.trim() || '2026',
      category: newSeriesCategory.trim() || 'International Tournament',
      venue,
      logo,
      teams: generatedTeams,
    };

    const starterFixture: NplMatch = {
      id: `match_${Date.now()}`,
      series: cleanName,
      match_no: '1st Match',
      date: '2026-11-10',
      time: format === 'ODI' ? '09:30' : '13:30',
      venue,
      team1: effectiveTeamNames[0],
      team2: effectiveTeamNames[1],
      team1_score: '',
      team1_overs: '',
      team2_score: '',
      team2_overs: '',
      winner: '',
      result_text: '',
      live: false,
      live_status: '',
    };

    const nextWithSeries = upsertSeriesInState(data, createdSeries, true);
    onUpdateData({
      ...nextWithSeries,
      matches: [starterFixture, ...nextWithSeries.matches],
    });
    setNewSeriesName('');
    setNewSeriesCode('');
    showSavedBanner(
      `Created series "${cleanName}" (${format} · ${maxOvers} ov · ${effectiveTeamNames.length} teams) — now active!`
    );
  };

  const handleSaveActiveSeriesSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const format: SeriesFormat = editSeriesFormat === 'ODI' ? 'ODI' : 'T20';
    const maxOvers = format === 'ODI' ? 50 : 20;
    const next = updateActiveSeriesMeta(data, {
      code: (editSeriesCode.trim() || deriveSeriesShortCode(activeSeries.name)).toUpperCase(),
      format,
      maxOvers,
      season: editSeriesSeason.trim() || '2026',
      category: editSeriesCategory.trim() || 'Cricket Tournament',
      venue: editSeriesVenue.trim() || 'TU Cricket Ground, Kirtipur',
      logo:
        editSeriesLogo.trim() ||
        makeSeriesEmblemSvg(editSeriesCode.trim() || activeSeries.code, '#035fb2', '#c8102e'),
    });
    onUpdateData(next);
    showSavedBanner(
      `Updated ${activeSeries.name} settings (${format} · ${maxOvers}.0 overs).`
    );
  };

  const handleDeleteSeries = (targetName: string) => {
    if (seriesList.length <= 1) {
      showSavedBanner('At least one series must remain in the tournament hub.');
      return;
    }
    const next = deleteSeriesFromState(data, targetName);
    onUpdateData(next);
    showSavedBanner(`Removed series "${targetName}".`);
  };

  const resetMatchForm = (nextMatchCount = seriesMatches.length) => {
    setEditingMatchId('');
    setMatchNo(`Match ${nextMatchCount + 1}`);
    setMatchDate('2026-11-02');
    setMatchTime(activeSeries.format === 'ODI' ? '09:30' : '12:15');
    setMatchVenue(activeSeries.venue);
    setTeam1(teamNames[0] || '');
    setTeam2(teamNames[1] || '');
    setTeam1Score('');
    setTeam1Overs('');
    setTeam2Score('');
    setTeam2Overs('');
    setWinner('');
    setResultText('');
    setMatchStatus('completed');
    setLiveStatus('');
    setLiveTarget('');
    setLiveLastBat('');
    setLiveFow('');
  };

  const loadMatchForEdit = (m: NplMatch) => {
    setAdminTab('matches');
    setEditingMatchId(m.id);
    setMatchNo(m.match_no);
    setMatchDate(m.date);
    setMatchTime(m.time);
    setMatchVenue(m.venue);
    setTeam1(m.team1);
    setTeam2(m.team2);
    setTeam1Score(m.team1_score);
    setTeam1Overs(m.team1_overs);
    setTeam2Score(m.team2_score);
    setTeam2Overs(m.team2_overs);
    setWinner(m.winner);
    setResultText(m.result_text);
    const out = resolveMatchOutcome(m);
    setMatchStatus(m.live ? 'live' : out.type !== 'fixture' ? 'completed' : 'fixture');
    setLiveStatus(m.live_status);
    const resolvedSc = resolveLiveScorecard(m, activeSeries.teams, undefined, {
      code: activeSeries.code,
      format: activeSeries.format,
      maxOvers: activeSeries.maxOvers,
    });
    setLiveBattingSide(resolvedSc.battingSide);
    setLiveTarget(resolvedSc.target > 0 ? String(resolvedSc.target) : '');
    setLiveLastBat(resolvedSc.lastBat === 'None yet' ? '' : resolvedSc.lastBat);
    setLiveFow(resolvedSc.fow === '-' ? '' : resolvedSc.fow);
    setLiveOversTimeline(serializeOversTimeline(resolvedSc.recentOvers));
    setLiveBatters(resolvedSc.batters.slice(0, 2));
    setLiveBowlers(resolvedSc.bowlers.slice(0, 2));
    setTimeout(() => {
      matchFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      t1ScoreInputRef.current?.focus();
    }, 40);
  };

  const openQuickResult = (m: NplMatch) => {
    if (quickResultId === m.id) {
      setQuickResultId('');
      return;
    }
    setQuickResultId(m.id);
    setQrT1Score(m.team1_score || '');
    setQrT1Overs(m.team1_overs || defaultOversQuota);
    setQrT2Score(m.team2_score || '');
    setQrT2Overs(m.team2_overs || defaultOversQuota);
    setQrWinner(m.winner || '');
    setQrSummary(m.result_text || '');
  };

  const handleSaveQuickResult = (m: NplMatch) => {
    const draft: NplMatch = {
      ...m,
      series: m.series || activeSeries.name,
      team1_score: qrT1Score.trim(),
      team1_overs: qrT1Overs.trim() || (qrT1Score.trim() ? defaultOversQuota : ''),
      team2_score: qrT2Score.trim(),
      team2_overs: qrT2Overs.trim() || (qrT2Score.trim() ? defaultOversQuota : ''),
      winner: qrWinner,
      result_text: qrSummary.trim(),
      live: false,
      live_status: '',
    };

    const outcome = resolveMatchOutcome(draft);
    if (outcome.type === 'fixture') {
      showSavedBanner(
        'Please enter both team scores, pick a Winner, or enter a Result Summary to save the result.'
      );
      return;
    }

    if (!draft.winner) {
      draft.winner = outcome.winnerName;
    }
    if (!draft.result_text) {
      draft.result_text = generateAutoResultText(draft);
    }

    const updatedMatches = data.matches.map((item) => (item.id === m.id ? draft : item));
    onUpdateData({ ...data, matches: updatedMatches });
    setQuickResultId('');
    showSavedBanner(`Result saved: ${draft.result_text} — ${activeSeries.code} Standings updated!`);
  };

  const handleSaveMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchDate || !team1 || !team2 || team1 === team2) {
      showSavedBanner('Error: Please choose a valid Date and two different teams.');
      return;
    }

    const id = editingMatchId || `npl_match_${Date.now()}`;
    const hasResultInput = Boolean(
      winner.trim() || resultText.trim() || (team1Score.trim() && team2Score.trim())
    );
    const effectiveLive = matchStatus === 'live' && !winner.trim() && !resultText.trim();

    const existingMatch = data.matches.find((m) => m.id === id);
    const parsedTarget = parseInt(liveTarget.trim(), 10);
    const liveDetailsPayload: NplLiveDetails | undefined = effectiveLive
      ? {
          batting_team: liveBattingSide,
          target: !Number.isNaN(parsedTarget) && parsedTarget > 0 ? parsedTarget : undefined,
          last_bat: liveLastBat.trim(),
          fow: liveFow.trim(),
          batters: liveBatters,
          bowlers: liveBowlers,
          recent_overs: parseOversTimeline(liveOversTimeline),
        }
      : existingMatch?.live_details;

    const draft: NplMatch = {
      id,
      series: activeSeries.name,
      match_no: matchNo.trim(),
      date: matchDate,
      time: matchTime,
      venue: matchVenue.trim(),
      team1,
      team2,
      team1_score: matchStatus === 'fixture' && !hasResultInput ? '' : team1Score.trim(),
      team1_overs: matchStatus === 'fixture' && !hasResultInput ? '' : team1Overs.trim(),
      team2_score: matchStatus === 'fixture' && !hasResultInput ? '' : team2Score.trim(),
      team2_overs: matchStatus === 'fixture' && !hasResultInput ? '' : team2Overs.trim(),
      winner: matchStatus === 'fixture' && !hasResultInput ? '' : winner,
      result_text: matchStatus === 'fixture' && !hasResultInput ? '' : resultText.trim(),
      live: effectiveLive,
      live_status: effectiveLive ? liveStatus.trim() : '',
      live_details: liveDetailsPayload,
    };

    if (!draft.live) {
      const outcome = resolveMatchOutcome(draft);
      if (!draft.winner && outcome.type !== 'fixture') {
        draft.winner = outcome.winnerName;
      }
      if (!draft.result_text && outcome.type !== 'fixture') {
        draft.result_text = generateAutoResultText(draft);
      }
    }

    const exists = data.matches.some((m) => m.id === id);
    const updatedMatches = exists
      ? data.matches.map((m) => (m.id === id ? draft : m))
      : [draft, ...data.matches];

    onUpdateData({ ...data, matches: updatedMatches });
    const nextSeriesMatchCount = updatedMatches.filter(
      (m) => (m.series || 'Nepal Premier League') === activeSeries.name
    ).length;
    showSavedBanner(
      draft.live
        ? `Live Match saved in ${activeSeries.name} (${draft.team1} vs ${draft.team2}).`
        : draft.result_text
        ? `Match Result saved: ${draft.result_text} — ${activeSeries.code} Standings updated!`
        : `Upcoming Fixture saved in ${activeSeries.name} (${draft.team1} vs ${draft.team2}).`
    );
    resetMatchForm(nextSeriesMatchCount);
  };

  const handleFinishLiveMatch = (m: NplMatch) => {
    const draft: NplMatch = { ...m, live: false };
    const outcome = resolveMatchOutcome(draft);
    if (!draft.winner && outcome.type !== 'fixture') {
      draft.winner = outcome.winnerName;
    }
    if (!draft.result_text && outcome.type !== 'fixture') {
      draft.result_text = generateAutoResultText(draft);
    }
    const updatedMatches = data.matches.map((item) => (item.id === m.id ? draft : item));
    onUpdateData({ ...data, matches: updatedMatches });
    showSavedBanner(
      `Match finished! ${draft.team1} vs ${draft.team2} added to ${activeSeries.code} Standings & Results.`
    );
  };

  const handleStartLiveFixture = (m: NplMatch) => {
    const draft: NplMatch = {
      ...m,
      live: true,
      winner: '',
      result_text: '',
      team1_score: m.team1_score || '0/0',
      team1_overs: m.team1_overs || '0.0',
      live_status:
        m.live_status || `Match underway at ${m.venue || activeSeries.venue}`,
    };
    const updatedMatches = data.matches.map((item) => (item.id === m.id ? draft : item));
    onUpdateData({ ...data, matches: updatedMatches });
    showSavedBanner(
      `Match is now LIVE: ${draft.team1} vs ${draft.team2} — shown on Live Centre & Dashboard!`
    );
  };

  const handleDeleteMatch = (id: string) => {
    const nextMatches = data.matches.filter((m) => m.id !== id);
    onUpdateData({
      ...data,
      matches: nextMatches,
    });
    const nextSeriesCount = nextMatches.filter(
      (m) => (m.series || 'Nepal Premier League') === activeSeries.name
    ).length;
    if (editingMatchId === id) resetMatchForm(nextSeriesCount);
    showSavedBanner('Match removed and Points Table recalculated.');
  };

  const handleTeamFieldChange = (
    field: 'captain' | 'coach' | 'owner' | 'venue' | 'color',
    val: string
  ) => {
    const current = activeSeries.teams[selectedTeamName];
    if (!current) return;
    const nextTeams: Record<string, NplTeam> = {
      ...activeSeries.teams,
      [selectedTeamName]: { ...current, [field]: val },
    };
    onUpdateData(updateActiveSeriesMeta(data, { teams: nextTeams }));
  };

  const handleAddTeamToSeries = () => {
    const cleanName = addTeamName.trim();
    if (!cleanName) return;
    if (activeSeries.teams[cleanName]) {
      showSavedBanner(`Team "${cleanName}" is already in ${activeSeries.name}.`);
      return;
    }
    const shortCode =
      addTeamShort.trim().toUpperCase() ||
      cleanName
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 4);
    const newTeam: NplTeam = {
      shortCode,
      color: addTeamColor || '#1a237e',
      logo: makeTeamCrestSvg(shortCode, addTeamColor || '#1a237e', '#f8fafc'),
      captain: addTeamCaptain.trim() || `${cleanName} Captain`,
      coach: 'Head Coach',
      owner: `${activeSeries.code} Team`,
      venue: activeSeries.venue,
      players: [
        {
          name: addTeamCaptain.trim() || `${cleanName} Captain`,
          role: 'Captain',
          runs: 0,
          wickets: 0,
        },
      ],
    };
    const nextTeams: Record<string, NplTeam> = {
      ...activeSeries.teams,
      [cleanName]: newTeam,
    };
    onUpdateData(updateActiveSeriesMeta(data, { teams: nextTeams }));
    setSelectedTeamName(cleanName);
    setAddTeamName('');
    setAddTeamShort('');
    setAddTeamCaptain('');
    showSavedBanner(`Added ${cleanName} (${shortCode}) to ${activeSeries.name}.`);
  };

  const handlePlayerFieldChange = (
    index: number,
    field: 'name' | 'role',
    val: string
  ) => {
    const current = activeSeries.teams[selectedTeamName];
    if (!current) return;
    const updatedPlayers = current.players.map((p, i) =>
      i === index
        ? field === 'role'
          ? { ...p, role: val as PlayerRole }
          : { ...p, name: val }
        : p
    );
    const nextTeams: Record<string, NplTeam> = {
      ...activeSeries.teams,
      [selectedTeamName]: { ...current, players: updatedPlayers },
    };
    onUpdateData(updateActiveSeriesMeta(data, { teams: nextTeams }));
  };

  const handlePlayerStatChange = (
    index: number,
    field: 'runs' | 'wickets',
    rawVal: string
  ) => {
    const current = activeSeries.teams[selectedTeamName];
    if (!current) return;
    const digitsOnly = rawVal.replace(/[^0-9]/g, '');
    const numeric = digitsOnly === '' ? 0 : Math.max(0, parseInt(digitsOnly, 10) || 0);
    const updatedPlayers = current.players.map((p, i) =>
      i === index ? { ...p, [field]: numeric } : p
    );
    const nextTeams: Record<string, NplTeam> = {
      ...activeSeries.teams,
      [selectedTeamName]: { ...current, players: updatedPlayers },
    };
    onUpdateData(updateActiveSeriesMeta(data, { teams: nextTeams }));
  };

  const handleAddPlayer = () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed || !selectedTeamName) return;
    const current = activeSeries.teams[selectedTeamName];
    if (!current) return;
    const runs = Math.max(0, parseInt(newPlayerRuns || '0', 10) || 0);
    const wickets = Math.max(0, parseInt(newPlayerWickets || '0', 10) || 0);
    const nextTeams: Record<string, NplTeam> = {
      ...activeSeries.teams,
      [selectedTeamName]: {
        ...current,
        players: [...current.players, { name: trimmed, role: newPlayerRole, runs, wickets }],
      },
    };
    onUpdateData(updateActiveSeriesMeta(data, { teams: nextTeams }));
    setNewPlayerName('');
    setNewPlayerRuns('');
    setNewPlayerWickets('');
    showSavedBanner(`Added ${trimmed} to ${selectedTeamName}.`);
  };

  const handleRemovePlayer = (index: number) => {
    const current = activeSeries.teams[selectedTeamName];
    if (!current) return;
    const nextTeams: Record<string, NplTeam> = {
      ...activeSeries.teams,
      [selectedTeamName]: {
        ...current,
        players: current.players.filter((_, i) => i !== index),
      },
    };
    onUpdateData(updateActiveSeriesMeta(data, { teams: nextTeams }));
  };

  const handleSaveNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim()) return;
    const id = editingNewsId || `npl_news_${Date.now()}`;
    const trimmedExcerpt = newsExcerpt.trim();
    const trimmedContent = newsContent.trim();
    const autoExcerpt =
      trimmedExcerpt ||
      (trimmedContent ? trimmedContent.split(/\n\s*\n/)[0].slice(0, 220) : '');
    const article: NplNewsItem = {
      id,
      series: newsSeries || activeSeries.name,
      title: newsTitle.trim(),
      category: newsCategory,
      date: newsDate,
      time: newsTime,
      author: newsAuthor.trim() || 'SetoPress Cricket Desk',
      excerpt: autoExcerpt,
      content: trimmedContent,
      quote: newsQuote.trim(),
      image: newsImage.trim(),
      team1: newsTeam1,
      team2: newsTeam2,
    };
    const exists = data.news.some((n) => n.id === id);
    const nextNews = exists
      ? data.news.map((n) => (n.id === id ? article : n))
      : [article, ...data.news];

    onUpdateData({ ...data, news: nextNews });
    resetNewsForm();
    showSavedBanner(
      `Editorial article published to ${article.series} ([setopress_npl] & [setopress_npl_news]).`
    );
  };

  const loadNewsForEdit = (n: NplNewsItem) => {
    setAdminTab('news');
    setEditingNewsId(n.id);
    setNewsSeries(n.series || activeSeries.name);
    setNewsTitle(n.title);
    setNewsCategory(n.category);
    setNewsDate(n.date);
    setNewsTime(n.time || '16:00');
    setNewsAuthor(n.author || 'SetoPress Cricket Desk · Kirtipur');
    setNewsImage(n.image || '');
    setNewsTeam1(n.team1 || '');
    setNewsTeam2(n.team2 || '');
    setNewsExcerpt(n.excerpt || '');
    setNewsContent(n.content || '');
    setNewsQuote(n.quote || '');
  };

  const resetNewsForm = () => {
    setEditingNewsId('');
    setNewsSeries(activeSeries.name);
    setNewsTitle('');
    setNewsCategory('match');
    setNewsDate('2026-10-30');
    setNewsTime('16:00');
    setNewsAuthor('SetoPress Cricket Desk · Kirtipur');
    setNewsImage('');
    setNewsTeam1('');
    setNewsTeam2('');
    setNewsExcerpt('');
    setNewsContent('');
    setNewsQuote('');
  };

  const activeTeam = activeSeries.teams[selectedTeamName];
  const wideActiveLogo = isWideSeriesLogo(activeSeries.logo);

  return (
    <div className="space-y-6">
      {/* Top Simulation Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            WordPress Admin Testbed (SetoPress Cricket &amp; NPL Manager v6.6.0)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage multiple cricket series ({seriesList.length} configured: NPL, World Cup, T20 WC, ACC), live scorecards, squads, and editorial dispatches.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              onResetDemo();
              showSavedBanner('Reset database to default 4-Series (NPL, T20 WC, CWC, ACC) sample data.');
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Multi-Series Demo
          </button>
          <button
            type="button"
            onClick={onSwitchToPreview}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#1a237e] hover:bg-[#131b63] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            View Frontend Result
          </button>
        </div>
      </div>

      {/* Active Series Switcher Bar (Mirrors WordPress v6.6.0 Admin Header 1:1) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3.5">
          {activeSeries.logo && (
            <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 flex items-center justify-center shrink-0">
              <img
                src={activeSeries.logo}
                alt={activeSeries.name}
                referrerPolicy="no-referrer"
                className={
                  wideActiveLogo
                    ? 'h-8 w-auto max-w-[140px] object-contain'
                    : 'w-8 h-8 object-contain'
                }
              />
            </div>
          )}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono tabular-nums">
              Active Tournament · Series ({seriesList.length})
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <select
                aria-label="Select Active Series in Admin"
                value={activeSeries.name}
                onChange={(e) => handleSelectSeriesAdmin(e.target.value)}
                className="px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg cursor-pointer"
              >
                {seriesList.map((sr, idx) => (
                  <option key={sr.name} value={sr.name}>
                    {String(idx + 1).padStart(2, '0')}. {sr.name} ({sr.format} · {sr.maxOvers} ov)
                  </option>
                ))}
              </select>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {activeSeries.code} · {activeSeries.season} · {teamNames.length} Teams ·{' '}
                {seriesMatches.length} Matches
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAdminTab('series')}
          className="px-3.5 py-2 text-xs font-bold text-[#035fb2] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          + Manage / Add Series ({seriesList.length})
        </button>
      </div>

      {notice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* LIVE MATCH & UPCOMING FIXTURES ADMIN DASHBOARD (SCOPED TO ACTIVE SERIES) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Live Match Desk */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold">
                {liveMatches.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                )}
                <span
                  className={`uppercase tracking-wider font-mono tabular-nums ${
                    liveMatches.length > 0 ? 'text-rose-700' : 'text-slate-700'
                  }`}
                >
                  {activeSeries.code} Live Match Desk ({liveMatches.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAdminTab('matches');
                  resetMatchForm();
                  setMatchStatus('live');
                  setTimeout(() => {
                    matchFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }, 40);
                }}
                className="text-xs font-semibold text-[#c8102e] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                + Start New Live Match
              </button>
            </div>

            {liveMatches.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {liveMatches.map((lm) => {
                  const lt1 = activeSeries.teams[lm.team1];
                  const lt2 = activeSeries.teams[lm.team2];
                  return (
                    <div key={lm.id} className="py-3 first:pt-0 last:pb-0 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span>
                          {lm.match_no ? `${lm.match_no} · ` : ''}
                          {lm.venue}
                        </span>
                        <span className="font-mono tabular-nums">
                          {lm.date}
                          {lm.time ? ` · ${lm.time}` : ''}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2">
                            {lt1?.logo && (
                              <img
                                src={lt1.logo}
                                alt={lm.team1}
                                referrerPolicy="no-referrer"
                                className="w-6 h-6 object-contain shrink-0"
                              />
                            )}
                            <span className="text-xs font-bold text-slate-900">{lm.team1}</span>
                            <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                              {lm.team1_score || '0/0'}
                              {lm.team1_overs ? ` (${lm.team1_overs})` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {lt2?.logo && (
                              <img
                                src={lt2.logo}
                                alt={lm.team2}
                                referrerPolicy="no-referrer"
                                className="w-6 h-6 object-contain shrink-0"
                              />
                            )}
                            <span className="text-xs font-bold text-slate-900">{lm.team2}</span>
                            <span className="font-mono text-xs font-bold text-[#1a237e] tabular-nums">
                              {lm.team2_score || 'Yet to bat'}
                              {lm.team2_overs ? ` (${lm.team2_overs})` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => loadMatchForEdit(lm)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Update Score
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAdminTab('matches');
                              openQuickResult(lm);
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Enter Final Result
                          </button>
                        </div>
                      </div>

                      {lm.live_status && (
                        <div className="text-xs text-rose-700 font-medium">{lm.live_status}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-5 text-center text-xs text-slate-500">
                No match is currently live in {activeSeries.name}. Click &ldquo;Go Live&rdquo; on any upcoming fixture or &ldquo;+ Start New Live Match&rdquo; above.
              </div>
            )}
          </div>
        </div>

        {/* Right: Upcoming Fixtures Queue */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono tabular-nums">
                {activeSeries.code} Upcoming Fixtures ({upcomingFixtures.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setAdminTab('matches');
                  resetMatchForm();
                  setMatchStatus('fixture');
                  setTimeout(() => {
                    matchFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }, 40);
                }}
                className="text-xs font-semibold text-[#1a237e] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                + Schedule Fixture
              </button>
            </div>

            {upcomingFixtures.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {upcomingFixtures.slice(0, 4).map((fx) => {
                  const fxt1 = activeSeries.teams[fx.team1];
                  const fxt2 = activeSeries.teams[fx.team2];
                  return (
                    <div
                      key={fx.id}
                      className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                          {fx.match_no ? `${fx.match_no} · ` : ''}
                          {fx.date}
                          {fx.time ? ` · ${fx.time}` : ''}
                          {fx.venue ? ` · ${fx.venue}` : ''}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {fxt1?.logo && (
                            <img
                              src={fxt1.logo}
                              alt={fx.team1}
                              referrerPolicy="no-referrer"
                              className="w-5 h-5 object-contain shrink-0"
                            />
                          )}
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {fx.team1}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">vs</span>
                          {fxt2?.logo && (
                            <img
                              src={fxt2.logo}
                              alt={fx.team2}
                              referrerPolicy="no-referrer"
                              className="w-5 h-5 object-contain shrink-0"
                            />
                          )}
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {fx.team2}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartLiveFixture(fx)}
                          className="px-2.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Go Live
                        </button>
                        <button
                          type="button"
                          onClick={() => loadMatchForEdit(fx)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Enter Result
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-5 text-center text-xs text-slate-500">
                No upcoming fixtures scheduled for {activeSeries.name}. Click &ldquo;+ Schedule Fixture&rdquo; above to add the next match.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Sub-Navigation */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/75 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setAdminTab('series')}
          className={`px-4 py-2 text-xs font-bold rounded-md transition-colors tabular-nums cursor-pointer ${
            adminTab === 'series'
              ? 'bg-white text-[#035fb2] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Series ({seriesList.length})
        </button>
        <button
          type="button"
          onClick={() => setAdminTab('matches')}
          className={`px-4 py-2 text-xs font-bold rounded-md transition-colors tabular-nums cursor-pointer ${
            adminTab === 'matches'
              ? 'bg-white text-[#c8102e] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Matches &amp; Scores ({seriesMatches.length})
        </button>
        <button
          type="button"
          onClick={() => setAdminTab('teams')}
          className={`px-4 py-2 text-xs font-bold rounded-md transition-colors tabular-nums cursor-pointer ${
            adminTab === 'teams'
              ? 'bg-white text-[#c8102e] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Teams, Squads &amp; Stats ({teamNames.length})
        </button>
        <button
          type="button"
          onClick={() => setAdminTab('news')}
          className={`px-4 py-2 text-xs font-bold rounded-md transition-colors tabular-nums cursor-pointer ${
            adminTab === 'news'
              ? 'bg-white text-[#c8102e] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          News Articles ({seriesNews.length})
        </button>
        <button
          type="button"
          onClick={() => setAdminTab('facebook')}
          className={`px-4 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
            adminTab === 'facebook'
              ? 'bg-white text-[#1877F2] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Facebook Page Sync
        </button>
      </div>

      {/* TAB 0: MULTI-SERIES TOURNAMENT MANAGER */}
      {adminTab === 'series' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Create New Series */}
          <form
            onSubmit={handleCreateSeries}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Create New Cricket Series / Tournament
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Add World Cups, bilateral ODI/T20 series, or domestic leagues with automatic NRR quota (20.0 T20 or 50.0 ODI).
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Series Name
                </label>
                <input
                  type="text"
                  required
                  value={newSeriesName}
                  onChange={(e) => setNewSeriesName(e.target.value)}
                  placeholder="e.g. ICC Champions Trophy"
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Short Code
                </label>
                <input
                  type="text"
                  value={newSeriesCode}
                  onChange={(e) => setNewSeriesCode(e.target.value)}
                  placeholder="CT"
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Format &amp; Overs Quota
                </label>
                <select
                  value={newSeriesFormat}
                  onChange={(e) => setNewSeriesFormat(e.target.value as SeriesFormat)}
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-semibold"
                >
                  <option value="T20">T20 (20.0 Overs)</option>
                  <option value="ODI">ODI World Cup (50.0 Overs)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Season / Edition
                </label>
                <input
                  type="text"
                  value={newSeriesSeason}
                  onChange={(e) => setNewSeriesSeason(e.target.value)}
                  placeholder="2026"
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Category Label
                </label>
                <input
                  type="text"
                  value={newSeriesCategory}
                  onChange={(e) => setNewSeriesCategory(e.target.value)}
                  placeholder="ICC Global Tournament"
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Primary Host Venue
                </label>
                <input
                  type="text"
                  value={newSeriesVenue}
                  onChange={(e) => setNewSeriesVenue(e.target.value)}
                  placeholder="TU Cricket Ground, Kirtipur"
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600">
                  Series Logo URL (Auto-generates SVG Emblem if blank)
                </label>
                <button
                  type="button"
                  onClick={() => setNewSeriesLogo(OFFICIAL_NPL_LOGO_PATH)}
                  className="text-[11px] font-semibold text-[#035fb2] hover:underline cursor-pointer"
                >
                  Use Official NPL Logo
                </button>
              </div>
              <input
                type="text"
                value={newSeriesLogo}
                onChange={(e) => setNewSeriesLogo(e.target.value)}
                placeholder="https://... or leave blank for custom emblem"
                className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Initial Participating Teams (Comma-separated)
              </label>
              <textarea
                rows={2}
                value={newSeriesTeamsCsv}
                onChange={(e) => setNewSeriesTeamsCsv(e.target.value)}
                placeholder="Nepal, India, Australia, England, South Africa, New Zealand"
                className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg leading-relaxed"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#035fb2] hover:bg-[#024c8f] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              + Create Series &amp; Set Active
            </button>
          </form>

          {/* Right: Active Series Settings + All Configured Series Directory */}
          <div className="lg:col-span-7 space-y-6">
            {/* Edit Active Series Settings */}
            <form
              onSubmit={handleSaveActiveSeriesSettings}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Active Series Settings: {activeSeries.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Controls the frontpage header logo, overs NRR quota ({activeSeries.maxOvers}.0 ov), and career scorecard label ({activeSeries.format} CAREER).
                  </p>
                </div>
                {activeSeries.logo && (
                  <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shrink-0">
                    <img
                      src={activeSeries.logo}
                      alt={activeSeries.name}
                      referrerPolicy="no-referrer"
                      className={
                        wideActiveLogo
                          ? 'h-8 w-auto max-w-[136px] object-contain'
                          : 'w-8 h-8 object-contain'
                      }
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Short Code
                  </label>
                  <input
                    type="text"
                    value={editSeriesCode}
                    onChange={(e) => setEditSeriesCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Match Format
                  </label>
                  <select
                    value={editSeriesFormat}
                    onChange={(e) => setEditSeriesFormat(e.target.value as SeriesFormat)}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="T20">T20 (20.0 Overs)</option>
                    <option value="ODI">ODI (50.0 Overs)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Season
                  </label>
                  <input
                    type="text"
                    value={editSeriesSeason}
                    onChange={(e) => setEditSeriesSeason(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editSeriesCategory}
                    onChange={(e) => setEditSeriesCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Default Venue
                  </label>
                  <input
                    type="text"
                    value={editSeriesVenue}
                    onChange={(e) => setEditSeriesVenue(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    Series Logo URL
                  </label>
                  <div className="flex items-center gap-3 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setEditSeriesLogo(OFFICIAL_NPL_LOGO_PATH)}
                      className="font-semibold text-[#c8102e] hover:underline cursor-pointer"
                    >
                      Set Official NPL Logo
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditSeriesLogo(
                          makeSeriesEmblemSvg(
                            editSeriesCode || activeSeries.code,
                            '#035fb2',
                            '#c8102e'
                          )
                        )
                      }
                      className="font-semibold text-slate-600 hover:underline cursor-pointer"
                    >
                      Generate Emblem
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={editSeriesLogo}
                  onChange={(e) => setEditSeriesLogo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-[#1a237e] hover:bg-[#12195c] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Save Active Series Settings
              </button>
            </form>

            {/* All Configured Series Directory */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 tabular-nums">
                  Configured Cricket Series ({seriesList.length})
                </h3>
                <span className="text-xs text-slate-500">
                  Synced 1:1 with Frontpage Series ({seriesList.length}) Switcher
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {seriesList.map((sr, idx) => {
                  const isCurrent = sr.name === activeSeries.name;
                  const sMatches = data.matches.filter(
                    (m) => (m.series || 'Nepal Premier League') === sr.name
                  );
                  const hasLive = sMatches.some((m) => m.live);
                  const wideLogo = isWideSeriesLogo(sr.logo);
                  return (
                    <div
                      key={sr.name}
                      className={`p-4 flex flex-wrap items-center justify-between gap-3 ${
                        isCurrent ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono font-bold text-slate-400 tabular-nums w-6">
                          {String(idx + 1).padStart(2, '0')}.
                        </span>
                        {sr.logo && (
                          <div className="bg-white border border-slate-200 rounded-md px-2 py-1 shrink-0">
                            <img
                              src={sr.logo}
                              alt={sr.name}
                              referrerPolicy="no-referrer"
                              className={
                                wideLogo
                                  ? 'h-6 w-auto max-w-[100px] object-contain'
                                  : 'w-6 h-6 object-contain'
                              }
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 truncate">
                              {sr.name}
                            </span>
                            {hasLive && (
                              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-mono tabular-nums">
                            {sr.code} · {sr.format} ({sr.maxOvers} ov) · {sr.season} ·{' '}
                            {Object.keys(sr.teams).length} Teams · {sMatches.length} Matches
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isCurrent ? (
                          <span className="px-3 py-1.5 text-xs font-bold text-[#035fb2] bg-blue-100/80 rounded-md">
                            Active Series
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectSeriesAdmin(sr.name)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-[#035fb2] hover:bg-[#024c8f] rounded-md cursor-pointer"
                          >
                            Switch &amp; Manage
                          </button>
                        )}
                        {seriesList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSeries(sr.name)}
                            aria-label={`Delete ${sr.name}`}
                            className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: MATCHES & SCORES */}
      {adminTab === 'matches' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            ref={matchFormRef}
            onSubmit={handleSaveMatch}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingMatchId
                  ? `Edit ${activeSeries.code} Match / Enter Result`
                  : `Add Match to ${activeSeries.name}`}
              </h3>
              {editingMatchId && (
                <button
                  type="button"
                  onClick={() => resetMatchForm()}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Match No
                </label>
                <input
                  type="text"
                  value={matchNo}
                  onChange={(e) => setMatchNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
                  placeholder="Match 10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={matchTime}
                  onChange={(e) => setMatchTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Venue
              </label>
              <input
                type="text"
                value={matchVenue}
                onChange={(e) => setMatchVenue(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Team 1
                </label>
                <select
                  value={team1}
                  onChange={(e) => {
                    setTeam1(e.target.value);
                    setWinner('');
                  }}
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-semibold"
                >
                  {teamNames.map((tn) => (
                    <option key={tn} value={tn}>
                      {tn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Team 2
                </label>
                <select
                  value={team2}
                  onChange={(e) => {
                    setTeam2(e.target.value);
                    setWinner('');
                  }}
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-semibold"
                >
                  {teamNames.map((tn) => (
                    <option key={tn} value={tn}>
                      {tn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Match Status
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setMatchStatus('completed')}
                  className={`py-2 px-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    matchStatus === 'completed'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Completed Result
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMatchStatus('live');
                    setWinner('');
                    setResultText('');
                  }}
                  className={`py-2 px-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    matchStatus === 'live'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Live Match
                </button>
                <button
                  type="button"
                  onClick={() => setMatchStatus('fixture')}
                  className={`py-2 px-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    matchStatus === 'fixture'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Upcoming Fixture
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="text-xs font-bold text-slate-800">
                Score &amp; Overs (Powers {activeSeries.format} Net Run Rate · Max {defaultOversQuota} ov)
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    {team1} Score
                  </label>
                  <input
                    ref={t1ScoreInputRef}
                    type="text"
                    value={team1Score}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTeam1Score(val);
                      if (val.trim() && matchStatus === 'fixture') {
                        setMatchStatus('completed');
                      }
                    }}
                    placeholder={activeSeries.format === 'ODI' ? 'e.g. 286/7' : 'e.g. 176/5'}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    {team1} Overs
                  </label>
                  <input
                    type="text"
                    value={team1Overs}
                    onChange={(e) => setTeam1Overs(e.target.value)}
                    placeholder={`e.g. ${defaultOversQuota}`}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    {team2} Score
                  </label>
                  <input
                    type="text"
                    value={team2Score}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTeam2Score(val);
                      if (val.trim() && matchStatus === 'fixture') {
                        setMatchStatus('completed');
                      }
                    }}
                    placeholder={activeSeries.format === 'ODI' ? 'e.g. 274/10' : 'e.g. 168/8'}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    {team2} Overs
                  </label>
                  <input
                    type="text"
                    value={team2Overs}
                    onChange={(e) => setTeam2Overs(e.target.value)}
                    placeholder={`e.g. ${defaultOversQuota}`}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Winner / Outcome
              </label>
              <select
                value={winner}
                onChange={(e) => {
                  const val = e.target.value;
                  setWinner(val);
                  if (val !== '') setMatchStatus('completed');
                }}
                className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
              >
                <option value="">Auto-detect Winner from Scores (or Fixture if scores empty)</option>
                <option value={team1}>{team1} (2 pts)</option>
                {team2 !== team1 && <option value={team2}>{team2} (2 pts)</option>}
                <option value="Tie">Tie (1 pt each)</option>
                <option value="NR">No Result / Abandoned (1 pt each)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Result Summary (Auto-generated if left blank)
              </label>
              <input
                type="text"
                value={resultText}
                onChange={(e) => {
                  const val = e.target.value;
                  setResultText(val);
                  if (val.trim()) setMatchStatus('completed');
                }}
                placeholder={`e.g. ${team1} won by 8 runs`}
                className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
              />
            </div>

            {matchStatus === 'live' && (
              <div className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-lg space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900">
                    Live Scorecard &amp; Ball-by-Ball Scorer
                  </span>
                  <span className="text-[11px] text-rose-700 font-medium">
                    Synced 1:1 with Live Match Centre ({activeSeries.code})
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Batting Now
                    </label>
                    <select
                      value={liveBattingSide}
                      onChange={(e) => setLiveBattingSide(e.target.value as 'team1' | 'team2')}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-semibold"
                    >
                      <option value="team1">{team1} (1st Inn)</option>
                      <option value="team2">{team2} (2nd Inn)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Target (2nd Inn)
                    </label>
                    <input
                      type="number"
                      value={liveTarget}
                      onChange={(e) => setLiveTarget(e.target.value)}
                      placeholder="Auto (e.g. 181)"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Live Chase / Status Equation
                  </label>
                  <input
                    type="text"
                    value={liveStatus}
                    onChange={(e) => setLiveStatus(e.target.value)}
                    placeholder="Auto-calculated if blank"
                    className="w-full px-2.5 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-md"
                  />
                </div>

                {/* Active Batters */}
                <div className="space-y-2 pt-2 border-t border-rose-200/70">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Active Batters (R / B / 4s / 6s / {activeSeries.format} Career)
                  </div>
                  {liveBatters.map((bat, bIdx) => (
                    <div key={bIdx} className="bg-white border border-slate-200 rounded-md p-2 space-y-1.5">
                      <div className="grid grid-cols-12 gap-1.5 items-center">
                        <input
                          type="text"
                          value={bat.name}
                          onChange={(e) =>
                            setLiveBatters((prev) =>
                              prev.map((item, idx) =>
                                idx === bIdx ? { ...item, name: e.target.value } : item
                              )
                            )
                          }
                          placeholder={`Batter ${bIdx + 1}`}
                          className="col-span-5 px-2 py-1 text-xs border border-slate-300 rounded font-semibold"
                        />
                        <input
                          type="text"
                          value={bat.hand || 'rhb'}
                          onChange={(e) =>
                            setLiveBatters((prev) =>
                              prev.map((item, idx) =>
                                idx === bIdx ? { ...item, hand: e.target.value } : item
                              )
                            )
                          }
                          placeholder="rhb"
                          className="col-span-2 px-1.5 py-1 text-[11px] border border-slate-300 rounded font-mono text-center"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setLiveBatters((prev) =>
                              prev.map((item, idx) => ({ ...item, striker: idx === bIdx }))
                            )
                          }
                          className={`col-span-5 py-1 text-[11px] font-bold rounded cursor-pointer ${
                            bat.striker
                              ? 'bg-[#035fb2] text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {bat.striker ? 'On Strike (*)' : 'Set Striker'}
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 font-mono">
                        <input
                          type="number"
                          value={bat.r}
                          onChange={(e) =>
                            setLiveBatters((prev) =>
                              prev.map((item, idx) =>
                                idx === bIdx
                                  ? { ...item, r: parseInt(e.target.value || '0', 10) || 0, sr: '' }
                                  : item
                              )
                            )
                          }
                          placeholder="R"
                          title="Runs"
                          className="px-2 py-1 text-xs border border-slate-300 rounded"
                        />
                        <input
                          type="number"
                          value={bat.b}
                          onChange={(e) =>
                            setLiveBatters((prev) =>
                              prev.map((item, idx) =>
                                idx === bIdx
                                  ? { ...item, b: parseInt(e.target.value || '0', 10) || 0, sr: '' }
                                  : item
                              )
                            )
                          }
                          placeholder="B"
                          title="Balls"
                          className="px-2 py-1 text-xs border border-slate-300 rounded"
                        />
                        <input
                          type="number"
                          value={bat.fours}
                          onChange={(e) =>
                            setLiveBatters((prev) =>
                              prev.map((item, idx) =>
                                idx === bIdx
                                  ? { ...item, fours: parseInt(e.target.value || '0', 10) || 0 }
                                  : item
                              )
                            )
                          }
                          placeholder="4s"
                          title="Fours"
                          className="px-2 py-1 text-xs border border-slate-300 rounded"
                        />
                        <input
                          type="number"
                          value={bat.sixes}
                          onChange={(e) =>
                            setLiveBatters((prev) =>
                              prev.map((item, idx) =>
                                idx === bIdx
                                  ? { ...item, sixes: parseInt(e.target.value || '0', 10) || 0 }
                                  : item
                              )
                            )
                          }
                          placeholder="6s"
                          title="Sixes"
                          className="px-2 py-1 text-xs border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Active Bowlers */}
                <div className="space-y-2 pt-2 border-t border-rose-200/70">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Active Bowlers (O / M / R / W)
                  </div>
                  {liveBowlers.map((bw, bwIdx) => (
                    <div key={bwIdx} className="bg-white border border-slate-200 rounded-md p-2 space-y-1.5">
                      <div className="grid grid-cols-12 gap-1.5 items-center">
                        <input
                          type="text"
                          value={bw.name}
                          onChange={(e) =>
                            setLiveBowlers((prev) =>
                              prev.map((item, idx) =>
                                idx === bwIdx ? { ...item, name: e.target.value } : item
                              )
                            )
                          }
                          placeholder={`Bowler ${bwIdx + 1}`}
                          className="col-span-9 px-2 py-1 text-xs border border-slate-300 rounded font-semibold"
                        />
                        <input
                          type="text"
                          value={bw.arm || 'rm'}
                          onChange={(e) =>
                            setLiveBowlers((prev) =>
                              prev.map((item, idx) =>
                                idx === bwIdx ? { ...item, arm: e.target.value } : item
                              )
                            )
                          }
                          placeholder="rm"
                          className="col-span-3 px-1.5 py-1 text-[11px] border border-slate-300 rounded font-mono text-center"
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 font-mono">
                        <input
                          type="text"
                          value={bw.o}
                          onChange={(e) =>
                            setLiveBowlers((prev) =>
                              prev.map((item, idx) =>
                                idx === bwIdx ? { ...item, o: e.target.value, econ: '' } : item
                              )
                            )
                          }
                          placeholder="O (2.4)"
                          title="Overs"
                          className="px-2 py-1 text-xs border border-slate-300 rounded"
                        />
                        <input
                          type="number"
                          value={bw.m}
                          onChange={(e) =>
                            setLiveBowlers((prev) =>
                              prev.map((item, idx) =>
                                idx === bwIdx
                                  ? { ...item, m: parseInt(e.target.value || '0', 10) || 0 }
                                  : item
                              )
                            )
                          }
                          placeholder="M"
                          title="Maidens"
                          className="px-2 py-1 text-xs border border-slate-300 rounded"
                        />
                        <input
                          type="number"
                          value={bw.r}
                          onChange={(e) =>
                            setLiveBowlers((prev) =>
                              prev.map((item, idx) =>
                                idx === bwIdx
                                  ? { ...item, r: parseInt(e.target.value || '0', 10) || 0, econ: '' }
                                  : item
                              )
                            )
                          }
                          placeholder="R"
                          title="Runs Conceded"
                          className="px-2 py-1 text-xs border border-slate-300 rounded"
                        />
                        <input
                          type="number"
                          value={bw.w}
                          onChange={(e) =>
                            setLiveBowlers((prev) =>
                              prev.map((item, idx) =>
                                idx === bwIdx
                                  ? { ...item, w: parseInt(e.target.value || '0', 10) || 0 }
                                  : item
                              )
                            )
                          }
                          placeholder="W"
                          title="Wickets"
                          className="px-2 py-1 text-xs border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Last Bat & FOW */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-rose-200/70">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Last Bat
                    </label>
                    <input
                      type="text"
                      value={liveLastBat}
                      onChange={(e) => setLiveLastBat(e.target.value)}
                      placeholder="Bhim Sharki 5 (4b)"
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Fall of Wicket (FOW)
                    </label>
                    <input
                      type="text"
                      value={liveFow}
                      onChange={(e) => setLiveFow(e.target.value)}
                      placeholder="89/4 (12.3 Ov)"
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>

                {/* Ball-by-Ball Timeline + Quick Scorer Buttons */}
                <div className="space-y-1.5 pt-2 border-t border-rose-200/70">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Recent Overs Ball-by-Ball Timeline
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {['•', '1', '2', '4', '6', '1w', '1lb', 'W'].map((tok) => (
                      <button
                        key={tok}
                        type="button"
                        onClick={() => {
                          setLiveOversTimeline((prev) => {
                            const parts = prev.split('|');
                            const first = (parts[0] || '').trim();
                            parts[0] = first ? `${first}, ${tok}` : tok;
                            return parts.join(' | ');
                          });
                        }}
                        className={`px-2 py-1 text-[11px] font-bold rounded cursor-pointer ${
                          tok === 'W'
                            ? 'bg-red-500 text-white'
                            : tok === '4' || tok === '6'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        +{tok}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={liveOversTimeline}
                    onChange={(e) => setLiveOversTimeline(e.target.value)}
                    placeholder="1lb, 1, •, 1w | 14th=13: 1, 1, 1, 2, 4, 4 | 13th=9: 2, 2, 1w, 1, W"
                    className="w-full px-2.5 py-1.5 text-[11px] bg-white border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#c8102e] hover:bg-[#a50d26] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {editingMatchId
                ? 'Save Match Result & Update Table'
                : matchStatus === 'fixture'
                ? 'Save Upcoming Fixture'
                : matchStatus === 'live'
                ? 'Save Live Match'
                : 'Save Match Result & Update Points Table'}
            </button>
          </form>

          {/* Right Column: Live Standings Verifier + Stored Matches */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  {activeSeries.name} Points Table ({activeSeries.format} · {defaultOversQuota} ov)
                </h3>
                <span className="text-xs text-slate-500">
                  Updates immediately on save
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse font-mono tabular-nums">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-sans">
                      <th className="py-2.5 px-3 text-center">#</th>
                      <th className="py-2.5 px-3 text-left">Team</th>
                      <th className="py-2.5 px-2.5 text-right">P</th>
                      <th className="py-2.5 px-2.5 text-right">W</th>
                      <th className="py-2.5 px-2.5 text-right">L</th>
                      <th className="py-2.5 px-3 text-right">Pts</th>
                      <th className="py-2.5 px-3 text-right">NRR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {liveStandings.map((r, i) => (
                      <tr key={r.name} className={i < 4 && r.p > 0 ? 'bg-teal-50/40' : ''}>
                        <td className="py-2 px-3 text-center text-slate-500">{i + 1}</td>
                        <td className="py-2 px-3 font-sans font-bold text-slate-900">
                          {r.name}
                        </td>
                        <td className="py-2 px-2.5 text-right">{r.p}</td>
                        <td className="py-2 px-2.5 text-right">{r.w}</td>
                        <td className="py-2 px-2.5 text-right">{r.l}</td>
                        <td className="py-2 px-3 text-right font-bold text-[#1a237e]">{r.pts}</td>
                        <td
                          className={`py-2 px-3 text-right font-semibold ${
                            r.nrr > 0
                              ? 'text-emerald-700'
                              : r.nrr < 0
                              ? 'text-rose-600'
                              : 'text-slate-500'
                          }`}
                        >
                          {r.nrr >= 0 ? `+${r.nrr.toFixed(3)}` : r.nrr.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 tabular-nums">
                  {activeSeries.code} Stored Matches ({seriesMatches.length})
                </h3>
                <span className="text-xs text-slate-500">
                  Click &ldquo;Enter / Edit Result&rdquo; on any row to save final scores immediately
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="py-3 px-4 text-left">Date</th>
                      <th className="py-3 px-4 text-left">Matchup &amp; Scores</th>
                      <th className="py-3 px-4 text-left">Result / Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {seriesMatches.map((m) => {
                      const out = resolveMatchOutcome(m);
                      const isQuickOpen = quickResultId === m.id;
                      return (
                        <React.Fragment key={m.id}>
                          <tr className={m.live ? 'bg-rose-50/40' : 'hover:bg-slate-50'}>
                            <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                              <div>{m.date}</div>
                              <div className="text-[11px] text-slate-400">{m.match_no}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">
                                {m.team1} vs {m.team2}
                              </div>
                              {(m.team1_score || m.team2_score) && (
                                <div className="font-mono text-[11px] text-slate-500 tabular-nums mt-0.5">
                                  {m.team1_score || '-'} ({m.team1_overs || defaultOversQuota} ov) vs{' '}
                                  {m.team2_score || '-'} ({m.team2_overs || defaultOversQuota} ov)
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {m.live ? (
                                <div>
                                  <span className="font-bold text-rose-600">Live In Progress</span>
                                  <span className="block text-[10px] text-rose-700">
                                    Click Enter Result when finished
                                  </span>
                                </div>
                              ) : out.type !== 'fixture' ? (
                                <div>
                                  <span className="font-bold text-emerald-700">
                                    ✓ {m.result_text || out.winnerName}
                                  </span>
                                  <span className="block text-[10px] text-slate-400">
                                    Saved in {activeSeries.code} Standings &amp; Results
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">Upcoming Fixture</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openQuickResult(m)}
                                className="px-2.5 py-1 text-xs font-bold text-white bg-[#1a237e] hover:bg-[#12195e] rounded-md mr-1.5 cursor-pointer"
                              >
                                {out.type !== 'fixture' && !m.live ? 'Edit Result' : 'Enter Result'}
                              </button>
                              {m.live && (
                                <button
                                  type="button"
                                  onClick={() => handleFinishLiveMatch(m)}
                                  className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md mr-1.5 cursor-pointer"
                                >
                                  Finish
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => loadMatchForEdit(m)}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md mr-1.5 cursor-pointer"
                              >
                                Full Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMatch(m.id)}
                                aria-label="Delete match"
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer inline-flex items-center"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                          {isQuickOpen && (
                            <tr className="bg-slate-50">
                              <td colSpan={4} className="p-4 border-t border-slate-200">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-900">
                                      Quick Result Entry: {m.team1} vs {m.team2}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setQuickResultId('')}
                                      className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                                    >
                                      Close
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        {m.team1} Score
                                      </label>
                                      <input
                                        type="text"
                                        value={qrT1Score}
                                        onChange={(e) => setQrT1Score(e.target.value)}
                                        placeholder="176/5"
                                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        {m.team1} Overs
                                      </label>
                                      <input
                                        type="text"
                                        value={qrT1Overs}
                                        onChange={(e) => setQrT1Overs(e.target.value)}
                                        placeholder={defaultOversQuota}
                                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        {m.team2} Score
                                      </label>
                                      <input
                                        type="text"
                                        value={qrT2Score}
                                        onChange={(e) => setQrT2Score(e.target.value)}
                                        placeholder="152/9"
                                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        {m.team2} Overs
                                      </label>
                                      <input
                                        type="text"
                                        value={qrT2Overs}
                                        onChange={(e) => setQrT2Overs(e.target.value)}
                                        placeholder={defaultOversQuota}
                                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono"
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        Winner / Outcome
                                      </label>
                                      <select
                                        value={qrWinner}
                                        onChange={(e) => setQrWinner(e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                                      >
                                        <option value="">Auto-detect from Scores</option>
                                        <option value={m.team1}>{m.team1} (2 pts)</option>
                                        <option value={m.team2}>{m.team2} (2 pts)</option>
                                        <option value="Tie">Tie (1 pt each)</option>
                                        <option value="NR">No Result (1 pt each)</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        Result Summary (Optional)
                                      </label>
                                      <input
                                        type="text"
                                        value={qrSummary}
                                        onChange={(e) => setQrSummary(e.target.value)}
                                        placeholder="Auto-generated if blank"
                                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveQuickResult(m)}
                                      className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md cursor-pointer"
                                    >
                                      Save Result &amp; Update Table
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEAMS & SQUADS */}
      {adminTab === 'teams' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          {/* Add New Team to Active Series */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="text-xs font-bold text-slate-800">
              Add New Team / Franchise to {activeSeries.name}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                value={addTeamName}
                onChange={(e) => setAddTeamName(e.target.value)}
                placeholder="Team Name (e.g. Pakistan or Chitwan Tigers)"
                className="px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg flex-1 min-w-[180px]"
              />
              <input
                type="text"
                value={addTeamShort}
                onChange={(e) => setAddTeamShort(e.target.value)}
                placeholder="Short (PAK)"
                className="w-28 px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-mono uppercase"
              />
              <input
                type="text"
                value={addTeamCaptain}
                onChange={(e) => setAddTeamCaptain(e.target.value)}
                placeholder="Captain Name"
                className="px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg min-w-[150px]"
              />
              <input
                type="color"
                value={addTeamColor}
                onChange={(e) => setAddTeamColor(e.target.value)}
                title="Team Brand Color"
                className="h-9 w-11 p-0.5 bg-white border border-slate-300 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={handleAddTeamToSeries}
                className="px-4 py-2 bg-[#035fb2] hover:bg-[#024c8f] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Team
              </button>
            </div>
          </div>

          {activeTeam && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Select Team in {activeSeries.name} to Edit Squad &amp; Player Stats
                  </label>
                  <select
                    value={selectedTeamName}
                    onChange={(e) => setSelectedTeamName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-semibold bg-white text-slate-900 border border-slate-300 rounded-lg"
                  >
                    {teamNames.map((tn) => (
                      <option key={tn} value={tn}>
                        {tn} ({activeSeries.teams[tn].players.length} players)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {activeSeries.code} Season Year
                  </label>
                  <input
                    type="text"
                    value={activeSeries.season}
                    onChange={(e) =>
                      onUpdateData(updateActiveSeriesMeta(data, { season: e.target.value }))
                    }
                    placeholder="2026"
                    className="w-full max-w-[220px] px-3.5 py-2.5 text-sm font-semibold bg-white text-slate-900 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Captain
                  </label>
                  <input
                    type="text"
                    value={activeTeam.captain}
                    onChange={(e) => handleTeamFieldChange('captain', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Head Coach
                  </label>
                  <input
                    type="text"
                    value={activeTeam.coach}
                    onChange={(e) => handleTeamFieldChange('coach', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Board / Owner
                  </label>
                  <input
                    type="text"
                    value={activeTeam.owner}
                    onChange={(e) => handleTeamFieldChange('owner', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Home Venue
                  </label>
                  <input
                    type="text"
                    value={activeTeam.venue}
                    onChange={(e) => handleTeamFieldChange('venue', e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Brand Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeTeam.color}
                      onChange={(e) => handleTeamFieldChange('color', e.target.value)}
                      className="h-9 w-12 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                    />
                    <span className="font-mono text-xs text-slate-600">
                      {activeTeam.color}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 mb-3">
                  Add Squad Player to {selectedTeamName}
                </h4>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPlayer();
                      }
                    }}
                    placeholder="Player full name"
                    className="px-3.5 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg flex-1 min-w-[180px]"
                  />
                  <select
                    value={newPlayerRole}
                    onChange={(e) => setNewPlayerRole(e.target.value as PlayerRole)}
                    className="px-3.5 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newPlayerRuns}
                    onChange={(e) => setNewPlayerRuns(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Runs (0)"
                    className="w-24 px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-mono"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newPlayerWickets}
                    onChange={(e) => setNewPlayerWickets(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Wkts (0)"
                    className="w-24 px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddPlayer}
                    className="px-4 py-2 bg-[#c8102e] hover:bg-[#a50d26] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Player
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                {activeTeam.players.map((p, idx) => (
                  <div
                    key={`player-${selectedTeamName}-${idx}`}
                    className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
                      <span className="font-mono text-slate-400 w-5">{idx + 1}.</span>
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handlePlayerFieldChange(idx, 'name', e.target.value)}
                        placeholder="Player name"
                        className="px-2.5 py-1.5 text-xs font-bold bg-white text-slate-900 border border-slate-300 rounded-md flex-1 min-w-[150px]"
                      />
                      <select
                        value={p.role}
                        onChange={(e) => handlePlayerFieldChange(idx, 'role', e.target.value)}
                        className="px-2.5 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-md"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <label className="text-[11px] text-slate-500 flex items-center gap-1">
                        Runs
                        <input
                          type="text"
                          inputMode="numeric"
                          value={p.runs ? String(p.runs) : ''}
                          placeholder="0"
                          onChange={(e) => handlePlayerStatChange(idx, 'runs', e.target.value)}
                          className="w-18 px-2 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-md font-mono tabular-nums"
                        />
                      </label>
                      <label className="text-[11px] text-slate-500 flex items-center gap-1">
                        Wkts
                        <input
                          type="text"
                          inputMode="numeric"
                          value={p.wickets ? String(p.wickets) : ''}
                          placeholder="0"
                          onChange={(e) => handlePlayerStatChange(idx, 'wickets', e.target.value)}
                          className="w-16 px-2 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-md font-mono tabular-nums"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemovePlayer(idx)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: EDITORIAL NEWS PUBLISHER */}
      {adminTab === 'news' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveNews}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingNewsId ? 'Edit Editorial Article' : 'Publish Editorial Article'}
              </h3>
              {editingNewsId && (
                <button
                  type="button"
                  onClick={resetNewsForm}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Target Series
              </label>
              <select
                value={newsSeries}
                onChange={(e) => setNewsSeries(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-semibold"
              >
                {seriesList.map((sr, idx) => (
                  <option key={sr.name} value={sr.name}>
                    {String(idx + 1).padStart(2, '0')}. {sr.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Headline
              </label>
              <input
                type="text"
                required
                value={newsTitle}
                onChange={(e) => setNewsTitle(e.target.value)}
                placeholder="Enter compelling match report or announcement headline..."
                className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Category
                </label>
                <select
                  value={newsCategory}
                  onChange={(e) => setNewsCategory(e.target.value as NewsCategory)}
                  className="w-full px-2.5 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
                >
                  <option value="match">Match Report</option>
                  <option value="press">Press Release</option>
                  <option value="update">League Update</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newsDate}
                  onChange={(e) => setNewsDate(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={newsTime}
                  onChange={(e) => setNewsTime(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Author / Byline
                </label>
                <input
                  type="text"
                  value={newsAuthor}
                  onChange={(e) => setNewsAuthor(e.target.value)}
                  placeholder="SetoPress Cricket Desk"
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Featured Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={newsImage}
                  onChange={(e) => setNewsImage(e.target.value)}
                  placeholder="Leave blank for Team Crest Card"
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Related Team 1
                </label>
                <select
                  value={newsTeam1}
                  onChange={(e) => setNewsTeam1(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
                >
                  <option value="">None</option>
                  {teamNames.map((tn) => (
                    <option key={tn} value={tn}>
                      {tn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Related Team 2
                </label>
                <select
                  value={newsTeam2}
                  onChange={(e) => setNewsTeam2(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
                >
                  <option value="">None</option>
                  {teamNames.map((tn) => (
                    <option key={tn} value={tn}>
                      {tn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Standfirst Summary (Shown on Newsroom Cards)
              </label>
              <textarea
                rows={2}
                value={newsExcerpt}
                onChange={(e) => setNewsExcerpt(e.target.value)}
                placeholder="2-sentence lead deck summarizing the story..."
                className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Full Article Body (Separate paragraphs with a blank line)
              </label>
              <textarea
                rows={6}
                value={newsContent}
                onChange={(e) => setNewsContent(e.target.value)}
                placeholder="Write the full readable match report or press release here..."
                className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Highlighted Pull Quote (Optional)
              </label>
              <input
                type="text"
                value={newsQuote}
                onChange={(e) => setNewsQuote(e.target.value)}
                placeholder="Optional captain or coach quote featured inside the reader..."
                className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#c8102e] hover:bg-[#a50d26] text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              {editingNewsId ? 'Update Editorial Article' : 'Publish Editorial Article'}
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tabular-nums">
                  {activeSeries.code} Published Editorial Stories ({seriesNews.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click &ldquo;View Frontend Result&rdquo; to test the full-article editorial reader.
                </p>
              </div>
              <button
                type="button"
                onClick={onSwitchToPreview}
                className="px-3 py-1.5 text-xs font-semibold text-[#1a237e] bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                Open Newsroom Preview
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {seriesNews.map((n) => (
                <div key={n.id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/60">
                  <div className="space-y-1.5">
                    <div className="text-xs text-slate-500">
                      <span className="font-semibold text-[#991b1b] uppercase tracking-wider">
                        {n.category}
                      </span>{' '}
                      · <span className="font-mono">{n.date} {n.time}</span>
                      {n.series ? ` · ${n.series}` : ''}
                      {n.author ? ` · ${n.author}` : ''}
                      {n.team1 ? ` · ${n.team1}${n.team2 ? ` vs ${n.team2}` : ''}` : ''}
                    </div>
                    <div className="font-editorial text-lg font-bold text-slate-950 leading-snug">
                      {n.title}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                      {n.excerpt}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => loadNewsForEdit(n)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (editingNewsId === n.id) resetNewsForm();
                        onUpdateData({
                          ...data,
                          news: data.news.filter((item) => item.id !== n.id),
                        });
                      }}
                      aria-label="Delete news item"
                      className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FACEBOOK PAGE SYNC (61590852571494) */}
      {adminTab === 'facebook' && <FacebookPagePublisher data={data} />}
    </div>
  );
};
