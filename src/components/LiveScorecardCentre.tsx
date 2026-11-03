import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Share2,
} from 'lucide-react';
import { NplDataState } from '../types/npl';
import {
  getActiveSeries,
  getSeriesList,
  isWideSeriesLogo,
  resolveLiveScorecard,
  resolveMatchOutcome,
} from '../utils/nplEngine';

export type HubNavTarget =
  | 'live'
  | 'series'
  | 'standings'
  | 'fixtures'
  | 'results'
  | 'teams'
  | 'news'
  | 'leaders';

interface LiveScorecardCentreProps {
  data: NplDataState;
  activeHubTab: string;
  onNavigateTab: (target: HubNavTarget) => void;
  onSelectSeries: (seriesName: string) => void;
}

export const LiveScorecardCentre: React.FC<LiveScorecardCentreProps> = ({
  data,
  activeHubTab,
  onNavigateTab,
  onSelectSeries,
}) => {
  const seriesList = useMemo(() => getSeriesList(data), [data]);
  const activeSeries = useMemo(() => getActiveSeries(data), [data]);
  const [seriesDrawerOpen, setSeriesDrawerOpen] = useState(false);

  // Order matches within the active series: Live first, then Completed (newest first), then Fixtures (soonest first)
  const orderedMatches = useMemo(() => {
    const seriesMatches = data.matches.filter(
      (m) => (m.series || 'Nepal Premier League') === activeSeries.name
    );
    const live = seriesMatches.filter((m) => m.live);
    const completed = seriesMatches
      .filter((m) => !m.live && resolveMatchOutcome(m).type !== 'fixture')
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    const upcoming = seriesMatches
      .filter((m) => !m.live && resolveMatchOutcome(m).type === 'fixture')
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    return [...live, ...completed, ...upcoming];
  }, [data.matches, activeSeries.name]);

  const [selectedMatchId, setSelectedMatchId] = useState<string>(
    () => orderedMatches[0]?.id || ''
  );
  const [copiedShare, setCopiedShare] = useState(false);
  const ballsStripRef = useRef<HTMLDivElement | null>(null);

  // Whenever active series changes (or live match changes), snap to the top match of that series
  useEffect(() => {
    setSelectedMatchId(orderedMatches[0]?.id || '');
  }, [activeSeries.name]);

  useEffect(() => {
    if (!orderedMatches.some((m) => m.id === selectedMatchId)) {
      setSelectedMatchId(orderedMatches[0]?.id || '');
    }
  }, [orderedMatches, selectedMatchId]);

  const currentIdx = Math.max(
    0,
    orderedMatches.findIndex((m) => m.id === selectedMatchId)
  );
  const currentMatch = orderedMatches[currentIdx] || orderedMatches[0];

  const sc = useMemo(() => {
    if (!currentMatch) return null;
    const seriesMatchesChrono = data.matches
      .filter((m) => (m.series || 'Nepal Premier League') === activeSeries.name)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    const chronoIdx = seriesMatchesChrono.findIndex((m) => m.id === currentMatch.id);
    return resolveLiveScorecard(
      currentMatch,
      activeSeries.teams,
      chronoIdx >= 0 ? chronoIdx + 1 : currentIdx + 1,
      {
        code: activeSeries.code,
        format: activeSeries.format,
        maxOvers: activeSeries.maxOvers,
      }
    );
  }, [currentMatch, data.matches, activeSeries, currentIdx]);

  const handlePrev = () => {
    if (orderedMatches.length <= 1) return;
    const prevIdx = (currentIdx - 1 + orderedMatches.length) % orderedMatches.length;
    setSelectedMatchId(orderedMatches[prevIdx].id);
  };

  const handleNext = () => {
    if (orderedMatches.length <= 1) return;
    const nextIdx = (currentIdx + 1) % orderedMatches.length;
    setSelectedMatchId(orderedMatches[nextIdx].id);
  };

  const handleShareScore = async () => {
    if (!sc) return;
    const shareText = `${sc.isLive ? '[LIVE]' : sc.isCompleted ? '[RESULT]' : '[FIXTURE]'} ${sc.seriesName} · ${sc.matchNo}, ${sc.venueShort} — ${sc.battingTeamName} (${sc.seriesCode}) ${sc.activeScore} ${sc.oversAndTargetText} | ${sc.statusEquation}`;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2200);
    } catch {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2200);
    }
  };

  const scrollBallsRight = () => {
    if (!ballsStripRef.current) return;
    const el = ballsStripRef.current;
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      el.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  const getBallBadgeClasses = (ballRaw: string): string => {
    const b = ballRaw.trim();
    const isWicket = b === 'W' || (b.includes('W') && !b.endsWith('w'));
    const isBoundary = b === '4' || b === '6';
    if (isWicket) {
      return 'bg-[#ef4444] text-white font-bold';
    }
    if (isBoundary) {
      return 'bg-[#1cb04b] text-white font-bold';
    }
    return 'bg-[#f1f3f5] text-slate-900 font-semibold';
  };

  const wideLogo = isWideSeriesLogo(activeSeries.logo, activeSeries.name);

  return (
    <div className="bg-white border-b border-slate-200">
      {/* 1. TOP MATCH CONTEXT BAR */}
      <div className="px-4 sm:px-7 py-3 bg-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80">
        <div className="min-w-0">
          {sc ? (
            <>
              <div className="flex items-center gap-2">
                {sc.isLive ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse shrink-0" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                      LIVE
                    </span>
                  </>
                ) : sc.isCompleted ? (
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                    RESULT
                  </span>
                ) : (
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#035fb2]">
                    UPCOMING
                  </span>
                )}
                {orderedMatches.length > 1 && (
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    · {currentIdx + 1}/{orderedMatches.length}
                  </span>
                )}
              </div>
              <div className="text-[13px] text-slate-600 mt-0.5 truncate">
                <span>
                  {sc.matchNo}, {sc.venueShort}, {sc.dateLong},{' '}
                </span>
                <button
                  type="button"
                  onClick={() => setSeriesDrawerOpen((prev) => !prev)}
                  className="underline decoration-slate-400 hover:text-[#035fb2] hover:decoration-[#035fb2] font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  {sc.seriesName}
                </button>
                <span className="text-slate-400 mx-1.5">·</span>
                <span className="text-slate-500 tabular-nums">
                  {activeSeries.format} ({activeSeries.maxOvers} ov)
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-[13px] text-slate-600">
              <span className="font-semibold text-slate-800">{activeSeries.name}</span>
              <span>·</span>
              <span>{activeSeries.format} ({activeSeries.maxOvers} Overs)</span>
              <span>·</span>
              <span>No matches scheduled yet in this series</span>
            </div>
          )}
        </div>

        {/* Right Controls: < Prev | Next > | Share | Standings */}
        <div className="flex items-center gap-4 sm:gap-5 shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            disabled={orderedMatches.length <= 1}
            className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-slate-900 hover:text-[#035fb2] disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
            <span>Prev</span>
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={orderedMatches.length <= 1}
            className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-slate-900 hover:text-[#035fb2] disabled:opacity-40 transition-colors cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4 stroke-[2.2]" />
          </button>

          <div className="flex items-center gap-1.5 pl-1">
            <button
              type="button"
              onClick={handleShareScore}
              title="Copy live match scorecard summary"
              className="p-1.5 rounded-md text-slate-700 hover:text-[#035fb2] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {copiedShare ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('standings')}
              title="Jump to Official Points Table"
              className="p-1.5 rounded-md text-slate-700 hover:text-[#035fb2] hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. ROYAL BLUE NAVIGATION BAR (#035fb2) WITH OFFICIAL NPL LOGO & SERIES (N) */}
      <div className="bg-[#035fb2] text-white px-4 sm:px-7 h-[54px] flex items-center justify-between gap-6 overflow-x-auto">
        <div className="flex items-center gap-6 sm:gap-7 min-w-max h-full">
          {/* Official NPL / Active Series Emblem + Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSeriesDrawerOpen((prev) => !prev)}
              title={`Active Series: ${activeSeries.name} — Click to switch series`}
              className="bg-white rounded-md px-2 py-1 h-8 flex items-center justify-center shrink-0 shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
            >
              <img
                src={activeSeries.logo}
                alt={activeSeries.name}
                className={
                  wideLogo
                    ? 'h-6 w-auto max-w-[96px] object-contain'
                    : 'w-6 h-6 rounded-full object-contain'
                }
              />
            </button>
            <button
              type="button"
              onClick={() => {
                if (orderedMatches[0]) setSelectedMatchId(orderedMatches[0].id);
                onNavigateTab('live');
              }}
              className="text-[20px] sm:text-[21px] font-extrabold tracking-tight text-white hover:opacity-95 transition-opacity shrink-0 cursor-pointer"
            >
              setopress
            </button>
          </div>

          <nav
            aria-label="Cricket Hub Navigation"
            className="flex items-center gap-5 sm:gap-6 text-[13.5px] font-medium h-full"
          >
            <button
              type="button"
              onClick={() => {
                const liveMatch = orderedMatches.find((m) => m.live) || orderedMatches[0];
                if (liveMatch) setSelectedMatchId(liveMatch.id);
                onNavigateTab('live');
              }}
              className={`h-full inline-flex items-center border-b-2 transition-colors cursor-pointer ${
                activeHubTab === 'standings' && sc?.isLive && !seriesDrawerOpen
                  ? 'border-white font-bold text-white'
                  : 'border-transparent text-white/90 hover:text-white'
              }`}
            >
              Live Scores
            </button>

            {/* Series (N) — Shows exact count of series + toggles Series Switcher */}
            <button
              type="button"
              onClick={() => setSeriesDrawerOpen((prev) => !prev)}
              className={`h-full inline-flex items-center gap-1 border-b-2 transition-colors cursor-pointer tabular-nums ${
                seriesDrawerOpen || activeHubTab === 'series'
                  ? 'border-white font-bold text-white'
                  : 'border-transparent text-white/95 hover:text-white'
              }`}
            >
              <span>Series ({seriesList.length})</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  seriesDrawerOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => {
                setSeriesDrawerOpen(false);
                onNavigateTab('standings');
              }}
              className={`h-full inline-flex items-center border-b-2 transition-colors cursor-pointer ${
                activeHubTab === 'standings' && !sc?.isLive && !seriesDrawerOpen
                  ? 'border-white font-bold text-white'
                  : 'border-transparent text-white/90 hover:text-white'
              }`}
            >
              Standings
            </button>
            <button
              type="button"
              onClick={() => {
                setSeriesDrawerOpen(false);
                onNavigateTab('fixtures');
              }}
              className={`h-full inline-flex items-center border-b-2 transition-colors cursor-pointer ${
                activeHubTab === 'fixtures'
                  ? 'border-white font-bold text-white'
                  : 'border-transparent text-white/90 hover:text-white'
              }`}
            >
              Fixtures
            </button>
            <button
              type="button"
              onClick={() => {
                setSeriesDrawerOpen(false);
                onNavigateTab('results');
              }}
              className={`h-full inline-flex items-center border-b-2 transition-colors cursor-pointer ${
                activeHubTab === 'results'
                  ? 'border-white font-bold text-white'
                  : 'border-transparent text-white/90 hover:text-white'
              }`}
            >
              Results
            </button>
            <button
              type="button"
              onClick={() => {
                setSeriesDrawerOpen(false);
                onNavigateTab('teams');
              }}
              className={`h-full inline-flex items-center border-b-2 transition-colors cursor-pointer ${
                activeHubTab === 'teams'
                  ? 'border-white font-bold text-white'
                  : 'border-transparent text-white/90 hover:text-white'
              }`}
            >
              Teams ({Object.keys(activeSeries.teams).length})
            </button>
            <button
              type="button"
              onClick={() => {
                setSeriesDrawerOpen(false);
                onNavigateTab('news');
              }}
              className={`h-full inline-flex items-center border-b-2 transition-colors cursor-pointer ${
                activeHubTab === 'news'
                  ? 'border-white font-bold text-white'
                  : 'border-transparent text-white/90 hover:text-white'
              }`}
            >
              News
            </button>
            <button
              type="button"
              onClick={() => {
                setSeriesDrawerOpen(false);
                onNavigateTab('leaders');
              }}
              className="h-full inline-flex items-center border-b-2 border-transparent text-white/90 hover:text-white transition-colors cursor-pointer"
            >
              Stats
            </button>
          </nav>
        </div>
      </div>

      {/* 2B. INTERACTIVE MULTI-SERIES SWITCHER STRIP (Toggled by Series (N)) */}
      {seriesDrawerOpen && (
        <div className="bg-[#082f63] text-white px-4 sm:px-7 py-4 border-b border-[#0c4a8f]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="text-xs text-sky-200">
              <span className="font-bold text-white uppercase tracking-wider">
                Active Tournaments &amp; World Cups ({seriesList.length})
              </span>
              <span className="mx-2 text-sky-300/60">·</span>
              <span>Select any series to switch live scorecard, standings, squads &amp; news</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSeriesDrawerOpen(false);
                onNavigateTab('series');
              }}
              className="text-xs font-semibold text-sky-200 hover:text-white underline cursor-pointer"
            >
              Open Full Series Overview ({seriesList.length}) →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {seriesList.map((s, idx) => {
              const isSelected = s.name === activeSeries.name;
              const sMatches = data.matches.filter(
                (m) => (m.series || 'Nepal Premier League') === s.name
              );
              const sLiveCount = sMatches.filter((m) => m.live).length;
              const sTeamsCount = Object.keys(s.teams || {}).length;
              const sWide = isWideSeriesLogo(s.logo, s.name);
              const indexLabel = String(idx + 1).padStart(2, '0');

              return (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => {
                    onSelectSeries(s.name);
                    setSeriesDrawerOpen(false);
                  }}
                  className={`text-left rounded-lg p-3 transition-colors border cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'bg-white text-slate-900 border-white shadow-xs'
                      : 'bg-[#0c3d7a]/80 hover:bg-[#0f4991] text-white border-white/15'
                  }`}
                >
                  <span className="bg-white rounded-md px-1.5 py-1 h-9 min-w-[52px] flex items-center justify-center shrink-0 border border-slate-200/70">
                    <img
                      src={s.logo}
                      alt={s.name}
                      className={
                        sWide
                          ? 'h-6 w-auto max-w-[68px] object-contain'
                          : 'w-6 h-6 rounded-full object-contain'
                      }
                    />
                  </span>
                  <span className="min-w-0 flex-1 block">
                    <span
                      className={`block text-[13px] font-bold truncate ${
                        isSelected ? 'text-slate-950' : 'text-white'
                      }`}
                    >
                      {indexLabel}. {s.name}
                    </span>
                    <span
                      className={`block text-[11px] mt-0.5 truncate tabular-nums ${
                        isSelected ? 'text-slate-600' : 'text-sky-200'
                      }`}
                    >
                      {s.format} ({s.maxOvers} ov) · {sTeamsCount} Teams · {sMatches.length} Matches
                      {sLiveCount > 0 ? ` · ${sLiveCount} LIVE` : ''}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. RECESSED COOL-GRAY STAGE + ELEVATED SCORECARD CARD */}
      {sc ? (
        <div className="bg-[#f4f6f9] p-3 sm:p-5">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-[0_2px_10px_rgba(15,23,42,0.05)] overflow-hidden">
            {/* A. Match Score & Equation Header */}
            <div className="px-4 sm:px-6 pt-5 pb-4 bg-white border-b border-slate-200/90 shadow-[0_3px_8px_rgba(15,23,42,0.02)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={sc.battingTeamLogo}
                    alt={sc.battingTeamName}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-contain shrink-0"
                  />
                  <h2 className="text-[20px] sm:text-[24px] font-bold tracking-[-0.02em] text-slate-950 truncate">
                    {sc.battingTeamName} ({sc.seriesCode})
                  </h2>
                </div>

                <div className="flex items-baseline gap-2.5 tabular-nums shrink-0">
                  {sc.oversAndTargetText && (
                    <span className="text-[15px] sm:text-[18px] font-normal text-slate-600">
                      {sc.oversAndTargetText}
                    </span>
                  )}
                  <span className="text-[22px] sm:text-[26px] font-bold text-slate-950">
                    {sc.activeScore}
                  </span>
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[14.5px] sm:text-[15px] font-normal text-slate-900">
                  {sc.statusEquation}
                </p>
                {sc.firstInningsSummary && (
                  <span className="text-xs text-slate-500 tabular-nums">
                    1st Innings: {sc.firstInningsSummary}
                  </span>
                )}
              </div>
            </div>

            {/* B. Split Match & Format-Aware Career Data Tables (72% / 28%) */}
            <div className="overflow-x-auto">
              <div className="min-w-[820px]">
                {/* Super-Header Strip ("T20 CAREER" or "ODI CAREER" on right 28% pane) */}
                <div className="grid grid-cols-[72%_28%] bg-[#f8f9fb] border-b border-slate-200 text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  <div className="py-1.5 px-5" />
                  <div className="py-1.5 px-4 border-l border-slate-200 text-center">
                    {sc.careerHeading}
                  </div>
                </div>

                {/* BATTERS Header Row */}
                <div className="grid grid-cols-[72%_28%] bg-[#eef0f4] border-b border-slate-200 text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500">
                  <div className="grid grid-cols-[2.3fr_0.55fr_0.55fr_0.55fr_0.55fr_0.95fr_1.35fr_1.35fr] items-center px-5 py-2 text-center">
                    <div className="text-left">BATTERS</div>
                    <div>R</div>
                    <div>B</div>
                    <div>4s</div>
                    <div>6s</div>
                    <div>SR</div>
                    <div>THIS BOWLER</div>
                    <div>LAST 5 BALLS</div>
                  </div>
                  <div className="grid grid-cols-4 items-center px-3 py-2 border-l border-slate-200 text-center">
                    <div>MAT</div>
                    <div>RUNS</div>
                    <div>HS</div>
                    <div>AVE</div>
                  </div>
                </div>

                {/* BATTERS Data Rows */}
                {sc.batters.map((batter, idx) => (
                  <div
                    key={`${batter.name}-${idx}`}
                    className="grid grid-cols-[72%_28%] border-b border-slate-100 text-[13px] text-slate-700 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="grid grid-cols-[2.3fr_0.55fr_0.55fr_0.55fr_0.55fr_0.95fr_1.35fr_1.35fr] items-center px-5 py-2.5 text-center tabular-nums">
                      <div className="text-left truncate pr-2">
                        <span className="font-semibold text-slate-950">
                          {batter.name}
                          {batter.striker ? '*' : ''}
                        </span>
                        {batter.hand && (
                          <span className="text-[11px] text-slate-500 ml-1.5 font-normal">
                            {batter.hand}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-950">{batter.r}</div>
                      <div>{batter.b}</div>
                      <div>{batter.fours}</div>
                      <div>{batter.sixes}</div>
                      <div>{batter.srFormatted}</div>
                      <div>{batter.this_bowler}</div>
                      <div>{batter.last_5}</div>
                    </div>
                    <div className="grid grid-cols-4 items-center px-3 py-2.5 border-l border-slate-200 text-center tabular-nums text-slate-600">
                      <div>{batter.mat}</div>
                      <div>{batter.career_runs}</div>
                      <div>{batter.hs}</div>
                      <div>{batter.ave}</div>
                    </div>
                  </div>
                ))}

                {/* BOWLERS Header Row */}
                <div className="grid grid-cols-[72%_28%] bg-[#eef0f4] border-b border-slate-200 text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500">
                  <div className="grid grid-cols-[2.3fr_0.55fr_0.5fr_0.55fr_0.5fr_0.85fr_0.55fr_0.55fr_0.55fr_1.2fr] items-center px-5 py-2 text-center">
                    <div className="text-left">BOWLERS</div>
                    <div>O</div>
                    <div>M</div>
                    <div>R</div>
                    <div>W</div>
                    <div>ECON</div>
                    <div>0s</div>
                    <div>4s</div>
                    <div>6s</div>
                    <div>THIS SPELL</div>
                  </div>
                  <div className="grid grid-cols-4 items-center px-3 py-2 border-l border-slate-200 text-center">
                    <div>MAT</div>
                    <div>WKTS</div>
                    <div>BBI</div>
                    <div>AVE</div>
                  </div>
                </div>

                {/* BOWLERS Data Rows */}
                {sc.bowlers.map((bowler, idx) => (
                  <div
                    key={`${bowler.name}-${idx}`}
                    className="grid grid-cols-[72%_28%] border-b border-slate-200/80 text-[13px] text-slate-700 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="grid grid-cols-[2.3fr_0.55fr_0.5fr_0.55fr_0.5fr_0.85fr_0.55fr_0.55fr_0.55fr_1.2fr] items-center px-5 py-2.5 text-center tabular-nums">
                      <div className="text-left truncate pr-2">
                        <span className="font-semibold text-slate-950">{bowler.name}</span>
                        {bowler.arm && (
                          <span className="text-[11px] text-slate-500 ml-1.5 font-normal">
                            {bowler.arm}
                          </span>
                        )}
                      </div>
                      <div>{bowler.o}</div>
                      <div>{bowler.m}</div>
                      <div>{bowler.r}</div>
                      <div className="font-bold text-slate-950">{bowler.w}</div>
                      <div>{bowler.econFormatted}</div>
                      <div>{bowler.dots}</div>
                      <div>{bowler.fours}</div>
                      <div>{bowler.sixes}</div>
                      <div>{bowler.this_spell}</div>
                    </div>
                    <div className="grid grid-cols-4 items-center px-3 py-2.5 border-l border-slate-200 text-center tabular-nums text-slate-600">
                      <div>{bowler.mat}</div>
                      <div>{bowler.career_wkts}</div>
                      <div>{bowler.bbi}</div>
                      <div>{bowler.ave}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* C. Dismissal & Fall of Wickets Strip */}
            <div className="px-4 sm:px-6 py-3 bg-white border-b border-slate-100 text-[13px] text-slate-600 flex flex-wrap items-center gap-x-2.5 gap-y-1 tabular-nums">
              <span>
                <span className="text-slate-500">Last Bat:</span>{' '}
                <span className="font-semibold text-slate-900 ml-1">{sc.lastBat}</span>
              </span>
              <span className="text-slate-400">•</span>
              <span>
                <span className="text-slate-500">FOW:</span>{' '}
                <span className="font-semibold text-slate-900 ml-1">{sc.fow}</span>
              </span>
            </div>

            {/* D. Ball-by-Ball Recent Overs Timeline */}
            {sc.recentOvers.length > 0 && (
              <div className="relative flex items-center bg-white px-4 sm:px-6 py-3">
                <div
                  ref={ballsStripRef}
                  className="flex items-center gap-2.5 overflow-x-auto pr-10 tabular-nums [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {sc.recentOvers.map((overGroup, gIdx) => (
                    <div
                      key={`${overGroup.over_label || 'cur'}-${gIdx}`}
                      className={`flex items-center gap-2 shrink-0 ${
                        gIdx > 0 ? 'pl-3.5 ml-1 border-l border-slate-200' : ''
                      }`}
                    >
                      {overGroup.over_label && (
                        <div className="flex items-center gap-2 mr-1">
                          <span className="text-[12px] text-slate-500 font-normal">
                            {overGroup.over_label}
                          </span>
                          {overGroup.runs !== undefined && (
                            <div className="text-center leading-[1.08]">
                              <div className="text-[11px] font-bold text-slate-900">
                                {overGroup.runs}
                              </div>
                              <div className="text-[9.5px] font-bold uppercase tracking-[0.04em] text-slate-700">
                                RUNS
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        {overGroup.balls.map((ball, bIdx) => (
                          <span
                            key={`${gIdx}-${bIdx}-${ball}`}
                            className={`inline-flex items-center justify-center min-w-[34px] h-[34px] px-1.5 rounded-[6px] text-[13px] select-none ${getBallBadgeClasses(
                              ball
                            )}`}
                          >
                            {ball}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Scroll Chevron */}
                <button
                  type="button"
                  onClick={scrollBallsRight}
                  title="Scroll recent overs"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:text-[#035fb2] hover:bg-white transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#f4f6f9] p-6 text-center text-sm text-slate-600">
          No matches recorded yet for <strong>{activeSeries.name}</strong>. Open Admin Testbed to schedule fixtures or enter live scores.
        </div>
      )}
    </div>
  );
};
