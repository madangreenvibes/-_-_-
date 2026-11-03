import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  MapPin,
  Search,
  Shield,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { NplDataState, NplNewsItem, NplTeam } from '../types/npl';
import {
  calculatePointsTable,
  generateAutoResultText,
  getActiveSeries,
  getSeriesList,
  isWideSeriesLogo,
  resolveMatchOutcome,
} from '../utils/nplEngine';
import { copyTextSynchronously } from './CodeAndAuditView';
import { HubNavTarget, LiveScorecardCentre } from './LiveScorecardCentre';

interface ShortcodePreviewProps {
  data: NplDataState;
  onJumpToAdmin: (tab: 'series' | 'matches' | 'teams' | 'news' | 'facebook') => void;
  onSelectSeries: (seriesName: string) => void;
  onCopySyncedPhp?: () => void;
  copiedSyncedPhp?: boolean;
}

function formatEditorialDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return isoDate;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const m = months[Math.max(0, Math.min(11, parts[1] - 1))];
  return `${m} ${parts[2]}, ${parts[0]}`;
}

function getCategoryLabel(cat: string): string {
  if (cat === 'match') return 'Match Report';
  if (cat === 'update') return 'League Update';
  return 'Press Release';
}

function getArticleParagraphs(item: NplNewsItem): string[] {
  const rawBody = (item.content || '').trim();
  if (rawBody) {
    return rawBody
      .split(/\n\s*\n|\r\n\s*\r\n|\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
  const fallback = (item.excerpt || '').trim();
  return fallback ? [fallback] : [];
}

function estimateReadMinutes(item: NplNewsItem): number {
  const text = `${item.title || ''} ${item.excerpt || ''} ${item.content || ''} ${item.quote || ''}`;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 160));
}

interface NewsVisualFrameProps {
  item: NplNewsItem;
  teams: Record<string, NplTeam>;
  leagueLogo: string;
  season: string;
  aspectClass?: string;
}

const NewsVisualFrame: React.FC<NewsVisualFrameProps> = ({
  item,
  teams,
  leagueLogo,
  season,
  aspectClass = 'aspect-[16/10]',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [item.image]);

  const t1 = item.team1 ? teams[item.team1] : undefined;
  const t2 = item.team2 ? teams[item.team2] : undefined;
  const hasPhoto = Boolean(item.image && item.image.trim() && !imgFailed);

  if (hasPhoto) {
    return (
      <div className={`relative w-full ${aspectClass} bg-slate-900 overflow-hidden`}>
        <img
          src={item.image}
          alt={item.title}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
        />
      </div>
    );
  }

  const c1 = t1?.color || '#1e3a8a';
  const c2 = t2?.color || (item.category === 'press' ? '#991b1b' : '#0f766e');

  return (
    <div
      className={`relative w-full ${aspectClass} bg-[#0c1438] overflow-hidden flex items-center justify-center p-6 select-none`}
    >
      {/* Curated SVG Editorial Stadium Pitch Geometry */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 640 400"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`ed-grad-${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c1} stopOpacity="0.92" />
            <stop offset="52%" stopColor="#0b1338" stopOpacity="0.96" />
            <stop offset="100%" stopColor={c2} stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <rect width="640" height="400" fill={`url(#ed-grad-${item.id})`} />
        <path
          d="M0 315 L88 262 L156 286 L248 224 L328 268 L418 210 L512 258 L586 232 L640 264 L640 400 L0 400 Z"
          fill="rgba(255,255,255,0.045)"
        />
        <g stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" fill="none">
          <line x1="94" y1="84" x2="82" y2="176" />
          <rect x="78" y="68" width="28" height="16" rx="2" fill="rgba(255,255,255,0.14)" />
          <line x1="546" y1="84" x2="558" y2="176" />
          <rect x="534" y="68" width="28" height="16" rx="2" fill="rgba(255,255,255,0.14)" />
        </g>
        <ellipse
          cx="320"
          cy="222"
          rx="250"
          ry="125"
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="1.5"
        />
        <ellipse
          cx="320"
          cy="222"
          rx="165"
          ry="82"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="5 5"
          strokeWidth="1.2"
        />
        <rect
          x="298"
          y="164"
          width="44"
          height="116"
          rx="3"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1"
        />
      </svg>

      <div className="relative z-10 flex flex-col items-center text-center text-white">
        {t1 && t2 ? (
          <>
            <div className="flex items-center gap-5 sm:gap-7">
              <div className="flex flex-col items-center gap-2">
                <img
                  src={t1.logo}
                  alt={t1.name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white p-1.5 object-contain shadow-md"
                />
                <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-white/90">
                  {t1.shortCode}
                </span>
              </div>
              <span className="font-editorial italic text-lg text-white/70">vs</span>
              <div className="flex flex-col items-center gap-2">
                <img
                  src={t2.logo}
                  alt={t2.name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white p-1.5 object-contain shadow-md"
                />
                <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-white/90">
                  {t2.shortCode}
                </span>
              </div>
            </div>
            <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/70 font-semibold">
              {item.series || 'Nepal Premier League'} {season}
            </div>
          </>
        ) : t1 ? (
          <>
            <img
              src={t1.logo}
              alt={t1.name}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full bg-white p-1.5 object-contain shadow-md"
            />
            <div className="mt-3 text-xs font-bold tracking-wider uppercase text-white/90">
              {t1.name}
            </div>
            <div className="mt-1 text-[11px] text-white/65">
              {item.series || 'Nepal Premier League'} {season} Dispatch
            </div>
          </>
        ) : (
          <>
            {leagueLogo && (
              <img
                src={leagueLogo}
                alt={item.series || 'Nepal Premier League'}
                referrerPolicy="no-referrer"
                className={
                  isWideSeriesLogo(leagueLogo, item.series)
                    ? 'h-12 w-auto max-w-[168px] rounded-lg bg-white px-3 py-1.5 object-contain shadow-md'
                    : 'w-16 h-16 rounded-full bg-white/95 p-1.5 object-contain shadow-md'
                }
              />
            )}
            <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white/85">
              Official {item.series || 'Nepal Premier League'} {season} Dispatch
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const ShortcodePreview: React.FC<ShortcodePreviewProps> = ({
  data,
  onJumpToAdmin,
  onSelectSeries,
  onCopySyncedPhp,
  copiedSyncedPhp,
}) => {
  const [activeShortcode, setActiveShortcode] = useState<'main' | 'news'>('main');
  const [leagueTab, setLeagueTab] = useState<
    'points' | 'series' | 'fixtures' | 'results' | 'teams' | 'news'
  >('points');
  const [selectedTeam, setSelectedTeam] = useState<NplTeam | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [copiedArticle, setCopiedArticle] = useState<boolean>(false);

  // News Hub Filters
  const [newsSeriesFilter, setNewsSeriesFilter] = useState<string>('all');
  const [newsCategoryFilter, setNewsCategoryFilter] = useState<string>('all');
  const [newsTeamFilter, setNewsTeamFilter] = useState<string>('all');
  const [newsSearch, setNewsSearch] = useState<string>('');
  const tabsSectionRef = useRef<HTMLDivElement | null>(null);
  const leadersSectionRef = useRef<HTMLDivElement | null>(null);

  const seriesList = useMemo(() => getSeriesList(data), [data]);
  const activeSeries = useMemo(() => getActiveSeries(data), [data]);

  // Reset franchise news filter when switching series
  useEffect(() => {
    setNewsTeamFilter('all');
  }, [activeSeries.name]);

  const pointsTable = useMemo(
    () => calculatePointsTable(data, activeSeries.name),
    [data, activeSeries.name]
  );

  const { liveMatches, completedResults, upcomingFixtures } = useMemo(() => {
    const seriesMatches = data.matches.filter(
      (m) => (m.series || 'Nepal Premier League') === activeSeries.name
    );
    const live = seriesMatches.filter((m) => m.live);
    const results = seriesMatches
      .filter((m) => !m.live && resolveMatchOutcome(m).type !== 'fixture')
      .sort((a, b) => b.date.localeCompare(a.date));
    const fixtures = seriesMatches
      .filter((m) => !m.live && resolveMatchOutcome(m).type === 'fixture')
      .sort((a, b) => a.date.localeCompare(b.date));
    return { liveMatches: live, completedResults: results, upcomingFixtures: fixtures };
  }, [data.matches, activeSeries.name]);

  // All news sorted (used for reader modal lookup & standalone [setopress_npl_news])
  const allSortedNews = useMemo(() => {
    return [...data.news].sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return (b.time || '').localeCompare(a.time || '');
    });
  }, [data.news]);

  // Active series news (falls back to allSortedNews if custom series has 0 stories yet)
  const sortedNews = useMemo(() => {
    const forSeries = allSortedNews.filter(
      (n) => (n.series || 'Nepal Premier League') === activeSeries.name
    );
    return forSeries.length > 0 ? forSeries : allSortedNews;
  }, [allSortedNews, activeSeries.name]);

  const filteredNews = useMemo(() => {
    const q = newsSearch.trim().toLowerCase();
    const basePool =
      activeShortcode === 'news'
        ? newsSeriesFilter === 'all'
          ? allSortedNews
          : allSortedNews.filter(
              (n) => (n.series || 'Nepal Premier League') === newsSeriesFilter
            )
        : sortedNews;

    return basePool.filter((item) => {
      const catOk = newsCategoryFilter === 'all' || item.category === newsCategoryFilter;
      const teamOk =
        newsTeamFilter === 'all' ||
        item.team1 === newsTeamFilter ||
        item.team2 === newsTeamFilter;
      const searchOk =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.excerpt.toLowerCase().includes(q) ||
        (item.content || '').toLowerCase().includes(q) ||
        (item.author || '').toLowerCase().includes(q);
      return catOk && teamOk && searchOk;
    });
  }, [
    activeShortcode,
    newsSeriesFilter,
    allSortedNews,
    sortedNews,
    newsCategoryFilter,
    newsTeamFilter,
    newsSearch,
  ]);

  const selectedArticleIndex = useMemo(() => {
    if (!selectedArticleId) return -1;
    return allSortedNews.findIndex((n) => n.id === selectedArticleId);
  }, [allSortedNews, selectedArticleId]);

  const selectedArticle =
    selectedArticleIndex >= 0 ? allSortedNews[selectedArticleIndex] : null;

  useEffect(() => {
    if (!selectedArticle && !selectedTeam) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedArticleId(null);
        setSelectedTeam(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedArticle, selectedTeam]);

  const allPlayersWithTeams = useMemo(() => {
    const list: Array<{
      name: string;
      role: string;
      runs: number;
      wickets: number;
      matches: number;
      teamName: string;
      teamLogo: string;
      teamColor: string;
    }> = [];
    Object.values(data.teams).forEach((t) => {
      t.players.forEach((p) => {
        list.push({
          name: p.name,
          role: p.role,
          runs: p.runs ?? 0,
          wickets: p.wickets ?? 0,
          matches: p.matches ?? 0,
          teamName: t.name,
          teamLogo: t.logo,
          teamColor: t.color,
        });
      });
    });
    return list;
  }, [data.teams]);

  const topRunScorers = useMemo(
    () => [...allPlayersWithTeams].sort((a, b) => b.runs - a.runs).slice(0, 3),
    [allPlayersWithTeams]
  );

  const topWicketTakers = useMemo(
    () => [...allPlayersWithTeams].sort((a, b) => b.wickets - a.wickets).slice(0, 3),
    [allPlayersWithTeams]
  );

  const handleCopyArticle = (article: NplNewsItem) => {
    const paragraphs = getArticleParagraphs(article).join('\n\n');
    const shareText = [
      `${article.title}`,
      `${getCategoryLabel(article.category)} · ${formatEditorialDate(article.date)}`,
      '',
      article.excerpt,
      paragraphs && paragraphs !== article.excerpt ? `\n${paragraphs}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    copyTextSynchronously(shareText);
    setCopiedArticle(true);
    setTimeout(() => setCopiedArticle(false), 2500);
  };

  const renderEditorialNewsStream = (articles: NplNewsItem[]) => {
    if (articles.length === 0) {
      return (
        <div className="text-center py-14 px-6 bg-white border border-stone-200 rounded-xl">
          <p className="text-base text-slate-600 mb-4">
            No news dispatches match your current category or franchise filter.
          </p>
          <div className="flex items-center justify-center gap-3">
            {(newsCategoryFilter !== 'all' || newsTeamFilter !== 'all' || newsSearch) && (
              <button
                type="button"
                onClick={() => {
                  setNewsCategoryFilter('all');
                  setNewsTeamFilter('all');
                  setNewsSearch('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                Reset All Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => onJumpToAdmin('news')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1a237e] hover:bg-[#131a63] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
            >
              Publish Article in WP Admin
            </button>
          </div>
        </div>
      );
    }

    const leadStory = articles[0];
    const secondaryStories = articles.slice(1, 4);
    const archiveStories = articles.slice(4);
    const leadT1 = leadStory.team1 ? data.teams[leadStory.team1] : undefined;
    const leadT2 = leadStory.team2 ? data.teams[leadStory.team2] : undefined;

    return (
      <div className="space-y-10">
        {/* TIER 1: LEAD EDITORIAL FEATURE (7 / 5 ASYMMETRIC SPLIT) */}
        <article
          onClick={() => setSelectedArticleId(leadStory.id)}
          className="group bg-white border border-stone-200 hover:border-stone-300 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch cursor-pointer transition-colors"
        >
          <div className="lg:col-span-7 flex">
            <NewsVisualFrame
              item={leadStory}
              teams={data.teams}
              leagueLogo={data.logo}
              season={data.season}
              aspectClass="aspect-[16/10] lg:aspect-auto lg:min-h-[360px]"
            />
          </div>

          <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-[#fcfbf9]">
            <div>
              {/* Zero-Pill Unboxed Curatorial Metadata */}
              <div className="text-xs uppercase tracking-[0.12em] text-stone-500 font-semibold">
                <span className="text-[#991b1b]">{getCategoryLabel(leadStory.category)}</span>
                <span aria-hidden="true" className="mx-2 text-stone-300">
                  ·
                </span>
                <span className="font-mono tabular-nums">
                  {formatEditorialDate(leadStory.date)}
                </span>
                <span aria-hidden="true" className="mx-2 text-stone-300">
                  ·
                </span>
                <span>{estimateReadMinutes(leadStory)} min read</span>
              </div>

              <h3 className="font-editorial text-2xl sm:text-3xl lg:text-[32px] font-bold text-slate-950 leading-[1.18] tracking-tight mt-3.5 group-hover:text-[#1a237e] transition-colors [text-wrap:balance]">
                {leadStory.title}
              </h3>

              <p className="mt-4 text-[15.5px] sm:text-base text-slate-600 leading-[1.74]">
                {leadStory.excerpt}
              </p>
            </div>

            <div className="pt-5 mt-6 border-t border-stone-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                {(leadT1 || leadT2) && (
                  <div className="flex items-center -space-x-1.5 shrink-0">
                    {leadT1 && (
                      <img
                        src={leadT1.logo}
                        alt={leadT1.name}
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full bg-white ring-2 ring-[#fcfbf9] object-contain"
                      />
                    )}
                    {leadT2 && (
                      <img
                        src={leadT2.logo}
                        alt={leadT2.name}
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full bg-white ring-2 ring-[#fcfbf9] object-contain"
                      />
                    )}
                  </div>
                )}
                <span className="text-xs text-stone-500 truncate">
                  {leadStory.author || 'By NPL Editorial Desk'}
                </span>
              </div>

              <span className="text-xs font-bold text-[#1a237e] flex items-center gap-1 whitespace-nowrap shrink-0 group-hover:translate-x-0.5 transition-transform">
                Read Full Story <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </article>

        {/* TIER 2: SECONDARY FEATURE DISPATCHES */}
        {secondaryStories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {secondaryStories.map((item) => {
              const t1 = item.team1 ? data.teams[item.team1] : undefined;
              const t2 = item.team2 ? data.teams[item.team2] : undefined;
              return (
                <article
                  key={item.id}
                  onClick={() => setSelectedArticleId(item.id)}
                  className="group bg-white border border-stone-200 hover:border-stone-300 rounded-xl overflow-hidden flex flex-col justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <NewsVisualFrame
                      item={item}
                      teams={data.teams}
                      leagueLogo={data.logo}
                      season={data.season}
                      aspectClass="aspect-[16/10]"
                    />
                    <div className="p-6">
                      <div className="text-[11px] uppercase tracking-[0.11em] text-stone-500 font-semibold">
                        <span className="text-[#991b1b]">
                          {getCategoryLabel(item.category)}
                        </span>
                        <span aria-hidden="true" className="mx-1.5 text-stone-300">
                          ·
                        </span>
                        <span className="font-mono tabular-nums">
                          {formatEditorialDate(item.date)}
                        </span>
                        <span aria-hidden="true" className="mx-1.5 text-stone-300">
                          ·
                        </span>
                        <span>{estimateReadMinutes(item)} min read</span>
                      </div>

                      <h4 className="font-editorial text-xl font-bold text-slate-950 leading-[1.26] mt-2.5 group-hover:text-[#1a237e] transition-colors [text-wrap:balance]">
                        {item.title}
                      </h4>

                      <p className="mt-3 text-[15px] text-slate-600 leading-[1.68] line-clamp-3">
                        {item.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between gap-3 bg-stone-50/40">
                    <div className="flex items-center gap-2 min-w-0 text-xs text-stone-500">
                      {(t1 || t2) && (
                        <div className="flex items-center -space-x-1 shrink-0">
                          {t1 && (
                            <img
                              src={t1.logo}
                              alt={t1.name}
                              referrerPolicy="no-referrer"
                              className="w-5 h-5 rounded-full bg-white ring-1 ring-stone-200 object-contain"
                            />
                          )}
                          {t2 && (
                            <img
                              src={t2.logo}
                              alt={t2.name}
                              referrerPolicy="no-referrer"
                              className="w-5 h-5 rounded-full bg-white ring-1 ring-stone-200 object-contain"
                            />
                          )}
                        </div>
                      )}
                      <span className="truncate">
                        {item.team1
                          ? `${item.team1}${item.team2 ? ` · ${item.team2}` : ''}`
                          : item.author || 'Official Dispatch'}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-[#1a237e] flex items-center gap-1 whitespace-nowrap shrink-0">
                      Read <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* TIER 3: EDITORIAL ARCHIVE / WIRE ROWS */}
        {archiveStories.length > 0 && (
          <div className="pt-8 border-t border-stone-200">
            <div className="text-xs uppercase tracking-[0.14em] font-bold text-stone-500 mb-4">
              More Dispatches from the Press Box
            </div>
            <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-200">
              {archiveStories.map((item) => (
                <article
                  key={item.id}
                  onClick={() => setSelectedArticleId(item.id)}
                  className="group p-5 sm:px-7 sm:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50/70 cursor-pointer transition-colors"
                >
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="text-[11px] uppercase tracking-[0.11em] text-stone-500 font-semibold">
                      <span className="text-[#991b1b]">
                        {getCategoryLabel(item.category)}
                      </span>
                      <span aria-hidden="true" className="mx-1.5 text-stone-300">
                        ·
                      </span>
                      <span className="font-mono tabular-nums">
                        {formatEditorialDate(item.date)}
                      </span>
                      {item.team1 && (
                        <>
                          <span aria-hidden="true" className="mx-1.5 text-stone-300">
                            ·
                          </span>
                          <span>
                            {item.team1}
                            {item.team2 ? ` vs ${item.team2}` : ''}
                          </span>
                        </>
                      )}
                    </div>
                    <h4 className="font-editorial text-lg sm:text-xl font-bold text-slate-950 leading-snug group-hover:text-[#1a237e] transition-colors [text-wrap:balance]">
                      {item.title}
                    </h4>
                    <p className="text-[15px] text-slate-600 leading-[1.65] line-clamp-2">
                      {item.excerpt}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-semibold text-stone-500 shrink-0">
                    <span>{estimateReadMinutes(item)} min read</span>
                    <span className="text-[#1a237e] font-bold flex items-center gap-1">
                      Open <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Workspace Toolbar: Shortcode Selector, Active Series Switcher & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveShortcode('main')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeShortcode === 'main'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shortcode: [setopress_npl]
            </button>
            <button
              type="button"
              onClick={() => setActiveShortcode('news')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeShortcode === 'news'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shortcode: [setopress_npl_news]
            </button>
          </div>

          {/* Instant Series Switcher with Series Count */}
          <div className="flex items-center gap-2 pl-1">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap tabular-nums">
              Series ({seriesList.length}):
            </span>
            <select
              value={activeSeries.name}
              onChange={(e) => onSelectSeries(e.target.value)}
              aria-label="Select Active Cricket Series"
              className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900 cursor-pointer"
            >
              {seriesList.map((s, idx) => (
                <option key={s.name} value={s.name}>
                  {String(idx + 1).padStart(2, '0')}. {s.name} ({s.format} · {s.maxOvers} ov)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onCopySyncedPhp && (
            <button
              type="button"
              onClick={onCopySyncedPhp}
              className="px-3.5 py-2 text-xs font-bold text-white bg-[#c8102e] hover:bg-[#a50d26] rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              {copiedSyncedPhp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSyncedPhp ? 'Copied 1:1 PHP!' : 'Copy 1:1 WordPress PHP'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onJumpToAdmin('series')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
          >
            Series Manager ({seriesList.length})
          </button>
          <button
            type="button"
            onClick={() => onJumpToAdmin('news')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Write News Article
          </button>
          <button
            type="button"
            onClick={() => onJumpToAdmin('matches')}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1a237e] hover:bg-[#131b63] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Enter Match Score
          </button>
        </div>
      </div>

      {/* SHORTCODE 1: [setopress_npl] */}
      {activeShortcode === 'main' ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {/* LIVE SCORECARD CENTRE (With Official NPL Logo + Series (N) Switcher) */}
          <LiveScorecardCentre
            data={data}
            activeHubTab={leagueTab === 'points' ? 'standings' : leagueTab}
            onSelectSeries={onSelectSeries}
            onNavigateTab={(target: HubNavTarget) => {
              if (target === 'leaders') {
                leadersSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
              }
              if (target === 'live') {
                setLeagueTab('points');
                return;
              }
              if (target === 'standings') {
                setLeagueTab('points');
              } else {
                setLeagueTab(target);
              }
              setTimeout(() => {
                tabsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 30);
            }}
          />

          {/* MAIN INTERACTIVE TOURNAMENT TABS */}
          <div ref={tabsSectionRef} className="px-6 lg:px-10 pt-8 bg-slate-50/70">
            <div className="flex items-center gap-1 p-1 bg-slate-200/75 rounded-lg w-fit overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setLeagueTab('points')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  leagueTab === 'points'
                    ? 'bg-white text-[#1a237e] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dashboard &amp; Standings
              </button>
              <button
                type="button"
                onClick={() => setLeagueTab('series')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  leagueTab === 'series'
                    ? 'bg-white text-[#1a237e] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Series ({seriesList.length})
              </button>
              <button
                type="button"
                onClick={() => setLeagueTab('fixtures')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  leagueTab === 'fixtures'
                    ? 'bg-white text-[#1a237e] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fixtures ({upcomingFixtures.length})
              </button>
              <button
                type="button"
                onClick={() => setLeagueTab('results')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  leagueTab === 'results'
                    ? 'bg-white text-[#1a237e] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Results ({completedResults.length})
              </button>
              <button
                type="button"
                onClick={() => setLeagueTab('teams')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  leagueTab === 'teams'
                    ? 'bg-white text-[#1a237e] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Teams &amp; Squads ({Object.keys(activeSeries.teams).length})
              </button>
              <button
                type="button"
                onClick={() => setLeagueTab('news')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  leagueTab === 'news'
                    ? 'bg-white text-[#1a237e] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                News &amp; Reports ({sortedNews.length})
              </button>
            </div>

            {/* PANEL 0: ALL SERIES DIRECTORY (Series (N) — NPL, Cricket World Cup, T20 World Cup, ACC Cup, etc.) */}
            {leagueTab === 'series' && (
              <div className="py-6 space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      Official Cricket Series &amp; World Cups ({seriesList.length})
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                      Switch between Nepal Premier League, ICC Cricket World Cup, ICC Men&apos;s T20 World Cup, ACC Premier Cup, or custom tournaments created in Admin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onJumpToAdmin('series')}
                    className="px-3.5 py-2 text-xs font-bold text-white bg-[#1a237e] hover:bg-[#131b63] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                  >
                    + Add or Manage Series in Admin
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {seriesList.map((s, idx) => {
                    const isCurrent = s.name === activeSeries.name;
                    const sMatches = data.matches.filter(
                      (m) => (m.series || 'Nepal Premier League') === s.name
                    );
                    const sLive = sMatches.filter((m) => m.live);
                    const sCompleted = sMatches.filter(
                      (m) => !m.live && resolveMatchOutcome(m).type !== 'fixture'
                    );
                    const sFixtures = sMatches.filter(
                      (m) => !m.live && resolveMatchOutcome(m).type === 'fixture'
                    );
                    const sTable = calculatePointsTable(data, s.name);
                    const leader = sTable.find((r) => r.p > 0) || sTable[0];
                    const wide = isWideSeriesLogo(s.logo, s.name);
                    const indexNum = String(idx + 1).padStart(2, '0');

                    return (
                      <div
                        key={s.name}
                        className={`bg-white rounded-xl p-5 border transition-colors flex flex-col justify-between gap-4 ${
                          isCurrent
                            ? 'border-[#035fb2] ring-1 ring-[#035fb2]/25'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 h-12 min-w-[64px] flex items-center justify-center shrink-0">
                                <img
                                  src={s.logo}
                                  alt={s.name}
                                  className={
                                    wide
                                      ? 'h-8 w-auto max-w-[92px] object-contain'
                                      : 'w-8 h-8 rounded-full object-contain'
                                  }
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs text-slate-500 tabular-nums">
                                  <span>{s.category}</span>
                                  <span className="mx-1.5">·</span>
                                  <span>Season {s.season}</span>
                                </div>
                                <h4 className="text-base sm:text-lg font-extrabold text-slate-900 truncate mt-0.5">
                                  {indexNum}. {s.name}
                                </h4>
                              </div>
                            </div>
                            {isCurrent && (
                              <span className="text-xs font-bold text-[#035fb2] shrink-0">
                                Active Hub
                              </span>
                            )}
                          </div>

                          <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 tabular-nums">
                            <span className="font-semibold text-slate-800">
                              {s.format} ({s.maxOvers} Overs)
                            </span>
                            <span>·</span>
                            <span>{Object.keys(s.teams).length} Teams</span>
                            <span>·</span>
                            <span>{sCompleted.length} Results</span>
                            <span>·</span>
                            <span>{sFixtures.length} Upcoming</span>
                            {sLive.length > 0 && (
                              <>
                                <span>·</span>
                                <span className="font-bold text-rose-600 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                                  {sLive.length} Live Now
                                </span>
                              </>
                            )}
                          </div>

                          {leader && (
                            <div className="mt-2.5 text-xs text-slate-600 tabular-nums">
                              Standings Leader:{' '}
                              <strong className="text-slate-900">{leader.name}</strong> ({leader.pts}{' '}
                              pts, NRR {leader.nrr >= 0 ? '+' : ''}
                              {leader.nrr.toFixed(3)})
                            </div>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500 truncate">{s.venue}</span>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectSeries(s.name);
                              setLeagueTab('points');
                            }}
                            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              isCurrent
                                ? 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                                : 'bg-[#035fb2] text-white hover:bg-[#024d92]'
                            }`}
                          >
                            {isCurrent ? 'Viewing Standings →' : 'Switch to Series →'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PANEL 1: DASHBOARD OVERVIEW (LIVE MATCH + UPCOMING FIXTURES + POINTS TABLE) */}
            {leagueTab === 'points' && (
              <div className="py-6 space-y-6">
                {/* 2-Column Live Match & Upcoming Fixtures Dashboard Strip */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Left: Live Match Center (or Latest Completed Result) */}
                  <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          {liveMatches.length > 0 ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                              <span className="text-rose-700 uppercase tracking-wider font-mono">
                                Live Match ({liveMatches.length})
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-700 uppercase tracking-wider font-mono">
                              Latest Match Scorecard
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setLeagueTab('results')}
                          className="text-xs font-semibold text-[#1a237e] hover:underline cursor-pointer whitespace-nowrap shrink-0"
                        >
                          All Results ({completedResults.length}) →
                        </button>
                      </div>

                      {liveMatches.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {liveMatches.map((lm) => {
                            const lt1 = data.teams[lm.team1];
                            const lt2 = data.teams[lm.team2];
                            return (
                              <div key={lm.id} className="py-3 first:pt-0 last:pb-0 space-y-3">
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

                                <div className="space-y-2.5">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {lt1?.logo && (
                                        <img
                                          src={lt1.logo}
                                          alt={lm.team1}
                                          referrerPolicy="no-referrer"
                                          className="w-8 h-8 object-contain shrink-0"
                                        />
                                      )}
                                      <span className="font-bold text-sm text-slate-900 truncate">
                                        {lm.team1}
                                      </span>
                                    </div>
                                    <div className="font-mono text-sm font-bold text-slate-900 tabular-nums shrink-0">
                                      {lm.team1_score || '0/0'}
                                      {lm.team1_overs && (
                                        <span className="text-xs font-normal text-slate-500 ml-1">
                                          ({lm.team1_overs} ov)
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {lt2?.logo && (
                                        <img
                                          src={lt2.logo}
                                          alt={lm.team2}
                                          referrerPolicy="no-referrer"
                                          className="w-8 h-8 object-contain shrink-0"
                                        />
                                      )}
                                      <span className="font-bold text-sm text-slate-900 truncate">
                                        {lm.team2}
                                      </span>
                                    </div>
                                    <div className="font-mono text-sm font-bold text-[#1a237e] tabular-nums shrink-0">
                                      {lm.team2_score || 'Yet to bat'}
                                      {lm.team2_overs && (
                                        <span className="text-xs font-normal text-slate-500 ml-1">
                                          ({lm.team2_overs} ov)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {lm.live_status && (
                                  <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-rose-700">
                                    {lm.live_status}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : completedResults.length > 0 ? (
                        (() => {
                          const rm = completedResults[0];
                          const rt1 = data.teams[rm.team1];
                          const rt2 = data.teams[rm.team2];
                          return (
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                <span>
                                  No live match underway · {rm.match_no || 'Latest Match'}
                                </span>
                                <span className="font-mono tabular-nums">{rm.date}</span>
                              </div>
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5">
                                    {rt1?.logo && (
                                      <img
                                        src={rt1.logo}
                                        alt={rm.team1}
                                        referrerPolicy="no-referrer"
                                        className="w-8 h-8 object-contain shrink-0"
                                      />
                                    )}
                                    <span className="font-bold text-sm text-slate-900">
                                      {rm.team1}
                                    </span>
                                  </div>
                                  <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                                    {rm.team1_score}{' '}
                                    {rm.team1_overs && (
                                      <span className="text-xs font-normal text-slate-500">
                                        ({rm.team1_overs} ov)
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5">
                                    {rt2?.logo && (
                                      <img
                                        src={rt2.logo}
                                        alt={rm.team2}
                                        referrerPolicy="no-referrer"
                                        className="w-8 h-8 object-contain shrink-0"
                                      />
                                    )}
                                    <span className="font-bold text-sm text-slate-900">
                                      {rm.team2}
                                    </span>
                                  </div>
                                  <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                                    {rm.team2_score}{' '}
                                    {rm.team2_overs && (
                                      <span className="text-xs font-normal text-slate-500">
                                        ({rm.team2_overs} ov)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>
                              <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-emerald-700">
                                {generateAutoResultText(rm)}
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-500">
                          No live or completed matches recorded yet.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Upcoming Fixtures Schedule */}
                  <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                          Upcoming Fixtures ({upcomingFixtures.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setLeagueTab('fixtures')}
                          className="text-xs font-semibold text-[#1a237e] hover:underline cursor-pointer whitespace-nowrap shrink-0"
                        >
                          Full Schedule →
                        </button>
                      </div>

                      {upcomingFixtures.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {upcomingFixtures.slice(0, 3).map((fx) => {
                            const fxt1 = data.teams[fx.team1];
                            const fxt2 = data.teams[fx.team2];
                            return (
                              <div
                                key={fx.id}
                                className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {fxt1?.logo && (
                                    <img
                                      src={fxt1.logo}
                                      alt={fx.team1}
                                      referrerPolicy="no-referrer"
                                      className="w-7 h-7 object-contain shrink-0"
                                    />
                                  )}
                                  <span className="text-sm font-bold text-slate-900 truncate">
                                    {fx.team1}
                                  </span>
                                  <span className="text-xs text-slate-400 font-mono shrink-0">
                                    vs
                                  </span>
                                  {fxt2?.logo && (
                                    <img
                                      src={fxt2.logo}
                                      alt={fx.team2}
                                      referrerPolicy="no-referrer"
                                      className="w-7 h-7 object-contain shrink-0"
                                    />
                                  )}
                                  <span className="text-sm font-bold text-slate-900 truncate">
                                    {fx.team2}
                                  </span>
                                </div>
                                <div className="sm:text-right text-xs text-slate-500 font-mono tabular-nums shrink-0">
                                  <div className="font-semibold text-slate-700">
                                    {fx.match_no ? `${fx.match_no} · ` : ''}
                                    {fx.date}
                                    {fx.time ? ` · ${fx.time}` : ''}
                                  </div>
                                  {fx.venue && (
                                    <div className="font-sans text-[11px] text-slate-400">
                                      {fx.venue}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-6 text-center space-y-2">
                          <div className="text-xs text-slate-500">
                            No upcoming fixtures scheduled right now.
                          </div>
                          <button
                            type="button"
                            onClick={() => onJumpToAdmin('matches')}
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1a237e] rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                          >
                            Schedule Fixture in Admin
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Official Points & Net Run Rate Table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                        <th className="py-3.5 px-4 text-center w-12">Pos</th>
                        <th className="py-3.5 px-4 text-left">Franchise</th>
                        <th className="py-3.5 px-3 text-right w-14">P</th>
                        <th className="py-3.5 px-3 text-right w-14">W</th>
                        <th className="py-3.5 px-3 text-right w-14">L</th>
                        <th className="py-3.5 px-3 text-right w-14">T</th>
                        <th className="py-3.5 px-3 text-right w-14">NR</th>
                        <th className="py-3.5 px-4 text-right w-16 text-slate-900">Pts</th>
                        <th className="py-3.5 px-4 text-right w-28">NRR</th>
                        <th className="py-3.5 px-4 text-right hidden md:table-cell w-36">
                          For / Against
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                      {pointsTable.map((row, idx) => {
                        const pos = idx + 1;
                        const isPlayoffZone = pos <= 4 && row.p > 0;
                        const nrrFormatted = `${row.nrr >= 0 ? '+' : ''}${row.nrr.toFixed(3)}`;
                        return (
                          <tr
                            key={row.name}
                            onClick={() => {
                              const t = data.teams[row.name];
                              if (t) setSelectedTeam(t);
                            }}
                            className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                              isPlayoffZone ? 'bg-teal-50/35' : ''
                            }`}
                          >
                            <td className="py-3.5 px-4 text-center font-semibold text-slate-600">
                              {pos}
                            </td>
                            <td className="py-3.5 px-4 font-sans">
                              <div className="flex items-center gap-3">
                                {row.logo && (
                                  <img
                                    src={row.logo}
                                    alt={`${row.name} logo`}
                                    referrerPolicy="no-referrer"
                                    className="w-7 h-7 object-contain shrink-0"
                                  />
                                )}
                                <span className="font-bold text-slate-900">{row.name}</span>
                                {isPlayoffZone && (
                                  <span className="text-xs font-bold text-teal-700">Q</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-right text-slate-700">{row.p}</td>
                            <td className="py-3.5 px-3 text-right text-slate-700">{row.w}</td>
                            <td className="py-3.5 px-3 text-right text-slate-700">{row.l}</td>
                            <td className="py-3.5 px-3 text-right text-slate-500">{row.t}</td>
                            <td className="py-3.5 px-3 text-right text-slate-500">{row.nr}</td>
                            <td className="py-3.5 px-4 text-right font-bold text-[#1a237e]">
                              {row.pts}
                            </td>
                            <td
                              className={`py-3.5 px-4 text-right font-semibold ${
                                row.nrr > 0
                                  ? 'text-emerald-700'
                                  : row.nrr < 0
                                  ? 'text-rose-600'
                                  : 'text-slate-500'
                              }`}
                            >
                              {nrrFormatted}
                            </td>
                            <td className="py-3.5 px-4 text-right text-xs text-slate-500 hidden md:table-cell">
                              {row.runsFor}/{row.oversFor.toFixed(1)} vs {row.runsAgainst}/
                              {row.oversAgainst.toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    Top 4 teams qualify for Playoffs (Q) · Win: 2 pts · Tie / No Result: 1 pt · ICC
                    Rule: Bowled out = {activeSeries.maxOvers}.0 overs faced ({activeSeries.format})
                  </span>
                  <span>Click any team row to inspect registered squad</span>
                </div>
              </div>
            )}

            {/* PANEL 2: FIXTURES */}
            {leagueTab === 'fixtures' && (
              <div className="py-6 space-y-3">
                {upcomingFixtures.length > 0 ? (
                  upcomingFixtures.map((m) => {
                    const t1 = data.teams[m.team1];
                    const t2 = data.teams[m.team2];
                    return (
                      <div
                        key={m.id}
                        className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {t1?.logo && (
                            <img
                              src={t1.logo}
                              alt={m.team1}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 object-contain"
                            />
                          )}
                          <span className="font-bold text-slate-900">{m.team1}</span>
                        </div>
                        <div className="text-center px-4">
                          <div className="text-xs font-semibold text-slate-500 font-mono tabular-nums">
                            {m.match_no ? `${m.match_no} · ` : ''}
                            {m.date}
                            {m.time ? ` · ${m.time}` : ''}
                          </div>
                          {m.venue && (
                            <div className="text-xs text-slate-400 mt-0.5">{m.venue}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-1 justify-end">
                          <span className="font-bold text-slate-900">{m.team2}</span>
                          {t2?.logo && (
                            <img
                              src={t2.logo}
                              alt={m.team2}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 object-contain"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                    <p className="text-sm text-slate-600 mb-3">No upcoming fixtures scheduled.</p>
                    <button
                      type="button"
                      onClick={() => onJumpToAdmin('matches')}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#1a237e] rounded-lg cursor-pointer"
                    >
                      Schedule Match in Admin
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PANEL 3: RESULTS */}
            {leagueTab === 'results' && (
              <div className="py-6 space-y-3">
                {completedResults.length > 0 ? (
                  completedResults.map((m) => {
                    const t1 = data.teams[m.team1];
                    const t2 = data.teams[m.team2];
                    return (
                      <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-3 pb-3 border-b border-slate-100">
                          <span>
                            {m.match_no ? `${m.match_no} · ` : ''}
                            {m.date}
                            {m.venue ? ` · ${m.venue}` : ''}
                          </span>
                          <span className="font-semibold text-emerald-700">
                            {generateAutoResultText(m)}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            {t1?.logo && (
                              <img
                                src={t1.logo}
                                alt={m.team1}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 object-contain"
                              />
                            )}
                            <div>
                              <div className="font-bold text-slate-900">{m.team1}</div>
                              <div className="font-mono text-lg font-bold text-[#1a237e] tabular-nums">
                                {m.team1_score || '-'}
                                {m.team1_overs && (
                                  <span className="text-xs font-normal text-slate-500 ml-1">
                                    ({m.team1_overs} ov)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs font-bold text-slate-400 text-center">VS</div>
                          <div className="flex items-center gap-3 flex-1 sm:justify-end">
                            <div className="sm:text-right">
                              <div className="font-bold text-slate-900">{m.team2}</div>
                              <div className="font-mono text-lg font-bold text-[#1a237e] tabular-nums">
                                {m.team2_score || '-'}
                                {m.team2_overs && (
                                  <span className="text-xs font-normal text-slate-500 ml-1">
                                    ({m.team2_overs} ov)
                                  </span>
                                )}
                              </div>
                            </div>
                            {t2?.logo && (
                              <img
                                src={t2.logo}
                                alt={m.team2}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 object-contain"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                    No match results recorded yet.
                  </div>
                )}
              </div>
            )}

            {/* PANEL 4: FRANCHISE TEAMS */}
            {leagueTab === 'teams' && (
              <div className="py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.values(data.teams).map((team) => (
                  <button
                    key={team.name}
                    type="button"
                    onClick={() => setSelectedTeam(team)}
                    className="text-left bg-white border border-slate-200 hover:border-slate-300 rounded-xl overflow-hidden transition-colors cursor-pointer"
                  >
                    <div className="h-24 px-5 flex items-center gap-4 text-white bg-[#0d1542]">
                      <img
                        src={team.logo}
                        alt={team.name}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 object-contain bg-white rounded-full p-1.5 shrink-0"
                      />
                      <div>
                        <h3 className="font-extrabold text-base leading-snug text-white">
                          {team.name}
                        </h3>
                        <div className="text-xs text-white/80 mt-0.5">
                          {team.players.length} Squad Players
                        </div>
                      </div>
                    </div>
                    <div className="p-4 space-y-1.5 text-xs text-slate-600">
                      <div>
                        Captain: <strong className="text-slate-900">{team.captain || 'TBA'}</strong>
                      </div>
                      <div>
                        Coach: <strong className="text-slate-900">{team.coach || 'TBA'}</strong>
                      </div>
                      <div className="pt-2 text-[#1a237e] font-semibold flex items-center gap-1">
                        View Squad <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* PANEL 5: IN-HUB EDITORIAL NEWSROOM TAB */}
            {leagueTab === 'news' && (
              <div className="py-6 space-y-6">
                <div className="px-4 py-3.5 rounded-xl border border-stone-200 bg-white flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg overflow-x-auto max-w-full">
                    {(
                      [
                        { id: 'all', label: 'All Stories' },
                        { id: 'match', label: 'Match Reports' },
                        { id: 'press', label: 'Press Releases' },
                        { id: 'update', label: 'League Updates' },
                      ] as const
                    ).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewsCategoryFilter(cat.id)}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          newsCategoryFilter === cat.id
                            ? 'bg-white text-slate-950 shadow-xs'
                            : 'text-stone-600 hover:text-slate-950'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 flex-1 sm:flex-initial justify-end">
                    <select
                      value={newsTeamFilter}
                      onChange={(e) => setNewsTeamFilter(e.target.value)}
                      aria-label="Filter newsroom by franchise team"
                      className="px-3 py-2 text-xs font-semibold bg-white border border-stone-300 rounded-lg text-slate-800"
                    >
                      <option value="all">All {Object.keys(activeSeries.teams).length} {activeSeries.code} Teams</option>
                      {Object.keys(activeSeries.teams).map((tn) => (
                        <option key={tn} value={tn}>
                          {tn}
                        </option>
                      ))}
                    </select>

                    <div className="relative min-w-[210px] flex-1 sm:flex-initial">
                      <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="search"
                        value={newsSearch}
                        onChange={(e) => setNewsSearch(e.target.value)}
                        placeholder="Search headlines, players, venues..."
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-slate-800"
                      />
                    </div>

                    {(newsCategoryFilter !== 'all' || newsTeamFilter !== 'all' || newsSearch) && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewsCategoryFilter('all');
                          setNewsTeamFilter('all');
                          setNewsSearch('');
                        }}
                        className="px-3 py-2 text-xs font-semibold text-stone-600 hover:text-slate-950 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {renderEditorialNewsStream(filteredNews)}
              </div>
            )}
          </div>

          {/* SEASON LEADERS */}
          <div ref={leadersSectionRef} className="px-6 lg:px-10 py-8 border-t border-slate-200">
            <h3 className="text-lg font-extrabold text-slate-900 mb-4">Tournament Leaders</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-semibold text-slate-500 mb-3">
                  Most Runs (Orange Cap Standings)
                </div>
                <div className="divide-y divide-slate-100">
                  {topRunScorers.map((p, idx) => (
                    <div key={p.name} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-400 w-4">
                          {idx + 1}
                        </span>
                        <img
                          src={p.teamLogo}
                          alt={p.teamName}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 object-contain"
                        />
                        <div>
                          <div className="text-sm font-bold text-slate-900">{p.name}</div>
                          <div className="text-xs text-slate-500">
                            {p.teamName} · {p.role}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono text-right tabular-nums">
                        <div className="text-base font-bold text-slate-900">{p.runs}</div>
                        <div className="text-[11px] text-slate-400">runs</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-semibold text-slate-500 mb-3">
                  Most Wickets (Purple Cap Standings)
                </div>
                <div className="divide-y divide-slate-100">
                  {topWicketTakers.map((p, idx) => (
                    <div key={p.name} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-400 w-4">
                          {idx + 1}
                        </span>
                        <img
                          src={p.teamLogo}
                          alt={p.teamName}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 object-contain"
                        />
                        <div>
                          <div className="text-sm font-bold text-slate-900">{p.name}</div>
                          <div className="text-xs text-slate-500">
                            {p.teamName} · {p.role}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono text-right tabular-nums">
                        <div className="text-base font-bold text-slate-900">{p.wickets}</div>
                        <div className="text-[11px] text-slate-400">wkts</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* EDITORIAL NEWSROOM SHOWCASE AT BOTTOM OF [setopress_npl] */}
          {leagueTab !== 'news' && sortedNews.length > 0 && (
            <div className="px-6 lg:px-10 py-10 border-t border-stone-200 bg-[#fbfaf7]">
              <div className="flex flex-wrap items-end justify-between gap-4 pb-5 mb-7 border-b border-stone-200">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-[#991b1b]">
                    Official NPL Dispatch
                  </div>
                  <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-slate-950 mt-1">
                    Latest News &amp; Match Reports
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveShortcode('news')}
                  className="text-xs font-bold text-[#1a237e] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  Open Full Newsroom [setopress_npl_news] <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* Left: Featured Lead Story */}
                <article
                  onClick={() => setSelectedArticleId(sortedNews[0].id)}
                  className="lg:col-span-7 group bg-white border border-stone-200 hover:border-stone-300 rounded-2xl overflow-hidden flex flex-col justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <NewsVisualFrame
                      item={sortedNews[0]}
                      teams={data.teams}
                      leagueLogo={data.logo}
                      season={data.season}
                      aspectClass="aspect-[16/9]"
                    />
                    <div className="p-6 sm:p-7">
                      <div className="text-xs uppercase tracking-[0.12em] text-stone-500 font-semibold">
                        <span className="text-[#991b1b]">
                          {getCategoryLabel(sortedNews[0].category)}
                        </span>
                        <span aria-hidden="true" className="mx-2 text-stone-300">
                          ·
                        </span>
                        <span className="font-mono tabular-nums">
                          {formatEditorialDate(sortedNews[0].date)}
                        </span>
                        <span aria-hidden="true" className="mx-2 text-stone-300">
                          ·
                        </span>
                        <span>{estimateReadMinutes(sortedNews[0])} min read</span>
                      </div>
                      <h4 className="font-editorial text-2xl sm:text-[26px] font-bold text-slate-950 leading-[1.2] mt-2.5 group-hover:text-[#1a237e] transition-colors [text-wrap:balance]">
                        {sortedNews[0].title}
                      </h4>
                      <p className="mt-3 text-[15.5px] text-slate-600 leading-[1.7]">
                        {sortedNews[0].excerpt}
                      </p>
                    </div>
                  </div>
                  <div className="px-6 sm:px-7 py-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 bg-stone-50/50">
                    <span>{sortedNews[0].author || 'By SetoPress Cricket Desk'}</span>
                    <span className="font-bold text-[#1a237e] flex items-center gap-1">
                      Read Full Story <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </article>

                {/* Right: Clean Hairline-Divided Headlines Wire */}
                <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-6 sm:p-7 flex flex-col justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] font-bold text-stone-400 pb-3 border-b border-stone-200">
                      Recent Headlines
                    </div>
                    <div className="divide-y divide-stone-200">
                      {sortedNews.slice(1, 5).map((n) => (
                        <article
                          key={n.id}
                          onClick={() => setSelectedArticleId(n.id)}
                          className="group py-4 first:pt-4 last:pb-0 cursor-pointer"
                        >
                          <div className="text-[11px] uppercase tracking-[0.1em] text-stone-500 font-semibold">
                            <span className="text-[#991b1b]">{getCategoryLabel(n.category)}</span>
                            <span aria-hidden="true" className="mx-1.5 text-stone-300">
                              ·
                            </span>
                            <span className="font-mono tabular-nums">
                              {formatEditorialDate(n.date)}
                            </span>
                            <span aria-hidden="true" className="mx-1.5 text-stone-300">
                              ·
                            </span>
                            <span>{estimateReadMinutes(n)} min read</span>
                          </div>
                          <h5 className="font-editorial text-lg font-bold text-slate-950 leading-[1.28] mt-1.5 group-hover:text-[#1a237e] transition-colors [text-wrap:balance]">
                            {n.title}
                          </h5>
                          <p className="text-sm text-slate-600 leading-[1.6] line-clamp-2 mt-1.5">
                            {n.excerpt}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveShortcode('news')}
                    className="mt-5 pt-4 border-t border-stone-200 w-full text-left text-xs font-bold text-[#1a237e] hover:underline flex items-center justify-between cursor-pointer"
                  >
                    <span>Browse All {sortedNews.length} NPL Stories &amp; Filter by Franchise</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* SHORTCODE 2: [setopress_npl_news] — DEDICATED EDITORIAL MEDIA CENTER */
        <div className="bg-[#fbfaf7] border border-stone-200 rounded-2xl overflow-hidden">
          {/* Curated Broadsheet Masthead */}
          <div className="bg-[#0d1542] text-white px-6 lg:px-10 py-9 border-b border-white/10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-teal-300 font-semibold">
                  SetoPress Multi-Series Cricket Desk · {seriesList.length} Active Tournaments
                </div>
                <h2 className="font-editorial text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2 [text-wrap:balance]">
                  The Matchday Cricket Dispatch
                </h2>
                <p className="text-sm sm:text-[15px] text-slate-300 mt-2 max-w-2xl leading-relaxed">
                  Long-form match reports, official press releases, and tournament dispatches across Nepal Premier League, ICC Cricket World Cup, T20 World Cup, and ACC Premier Cup.
                </p>
              </div>
              <div className="text-xs text-slate-300 font-mono tabular-nums shrink-0">
                {filteredNews.length} {filteredNews.length === 1 ? 'Story' : 'Stories'} Available ·
                Click any headline to read in full
              </div>
            </div>
          </div>

          {/* Functional Segmented Filter & Search Bar */}
          <div className="px-6 lg:px-10 py-4 border-b border-stone-200 bg-white flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg overflow-x-auto max-w-full">
              {(
                [
                  { id: 'all', label: 'All Stories' },
                  { id: 'match', label: 'Match Reports' },
                  { id: 'press', label: 'Press Releases' },
                  { id: 'update', label: 'League Updates' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setNewsCategoryFilter(cat.id)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    newsCategoryFilter === cat.id
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-stone-600 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 flex-1 sm:flex-initial justify-end">
              <select
                value={newsSeriesFilter}
                onChange={(e) => setNewsSeriesFilter(e.target.value)}
                aria-label="Filter by cricket series"
                className="px-3 py-2 text-xs font-semibold bg-white border border-stone-300 rounded-lg text-slate-800"
              >
                <option value="all">All Series ({seriesList.length})</option>
                {seriesList.map((s, idx) => (
                  <option key={s.name} value={s.name}>
                    {String(idx + 1).padStart(2, '0')}. {s.name}
                  </option>
                ))}
              </select>

              <select
                value={newsTeamFilter}
                onChange={(e) => setNewsTeamFilter(e.target.value)}
                aria-label="Filter by team"
                className="px-3 py-2 text-xs font-semibold bg-white border border-stone-300 rounded-lg text-slate-800"
              >
                <option value="all">All {activeSeries.code} Teams</option>
                {Object.keys(activeSeries.teams).map((tn) => (
                  <option key={tn} value={tn}>
                    {tn}
                  </option>
                ))}
              </select>

              <div className="relative min-w-[210px] flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={newsSearch}
                  onChange={(e) => setNewsSearch(e.target.value)}
                  placeholder="Search stories or players..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-slate-800"
                />
              </div>

              {(newsCategoryFilter !== 'all' || newsTeamFilter !== 'all' || newsSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setNewsCategoryFilter('all');
                    setNewsTeamFilter('all');
                    setNewsSearch('');
                  }}
                  className="px-3 py-2 text-xs font-semibold text-stone-600 hover:text-slate-950 cursor-pointer whitespace-nowrap shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* 3-Tier Editorial Stream */}
          <div className="p-6 lg:p-10">{renderEditorialNewsStream(filteredNews)}</div>
        </div>
      )}

      {/* FULL-ARTICLE EDITORIAL READER MODAL */}
      {selectedArticle && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6"
          onClick={() => setSelectedArticleId(null)}
        >
          <div
            className="bg-[#fcfbf9] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-stone-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Reader Sticky Utility Top Bar */}
            <div className="px-5 sm:px-8 py-3.5 bg-white border-b border-stone-200 flex items-center justify-between gap-4 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedArticleId(null)}
                className="text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Newsroom
              </button>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-stone-500 mr-2">
                  <BookOpen className="w-3.5 h-3.5" />
                  {estimateReadMinutes(selectedArticle)} min read
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyArticle(selectedArticle)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedArticle ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied Story
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Story
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedArticleId(null)}
                  aria-label="Close article reader"
                  className="p-1.5 rounded-lg text-stone-500 hover:text-slate-950 hover:bg-stone-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Long-Form Broadsheet Reading Column */}
            <div className="overflow-y-auto px-6 sm:px-12 py-8 sm:py-10">
              <div className="max-w-[65ch] mx-auto">
                {/* Kicker */}
                <div className="text-xs uppercase tracking-[0.14em] font-semibold text-stone-500">
                  <span className="text-[#991b1b]">
                    {getCategoryLabel(selectedArticle.category)}
                  </span>
                  <span aria-hidden="true" className="mx-2 text-stone-300">
                    ·
                  </span>
                  <span className="font-mono tabular-nums">
                    {formatEditorialDate(selectedArticle.date)}
                    {selectedArticle.time ? ` · ${selectedArticle.time} NPT` : ''}
                  </span>
                </div>

                {/* Display Headline */}
                <h1 className="font-editorial text-2xl sm:text-4xl font-bold text-slate-950 leading-[1.16] tracking-tight mt-3 [text-wrap:balance]">
                  {selectedArticle.title}
                </h1>

                {/* Standfirst / Excerpt */}
                {selectedArticle.excerpt && (
                  <p className="mt-4 text-base sm:text-[18px] text-slate-600 leading-[1.65] font-normal">
                    {selectedArticle.excerpt}
                  </p>
                )}

                {/* Hairline Byline & Related Franchises */}
                <div className="my-6 py-3.5 border-y border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
                  <div className="font-semibold text-slate-900">
                    {selectedArticle.author || 'By SetoPress Cricket Desk · Kirtipur'}
                  </div>
                  {(selectedArticle.team1 || selectedArticle.team2) && (
                    <div className="flex items-center gap-2 text-stone-500">
                      {selectedArticle.team1 && data.teams[selectedArticle.team1] && (
                        <img
                          src={data.teams[selectedArticle.team1].logo}
                          alt={selectedArticle.team1}
                          referrerPolicy="no-referrer"
                          className="w-5 h-5 rounded-full object-contain"
                        />
                      )}
                      <span>
                        {selectedArticle.team1}
                        {selectedArticle.team2 ? ` vs ${selectedArticle.team2}` : ''}
                      </span>
                      {selectedArticle.team2 && data.teams[selectedArticle.team2] && (
                        <img
                          src={data.teams[selectedArticle.team2].logo}
                          alt={selectedArticle.team2}
                          referrerPolicy="no-referrer"
                          className="w-5 h-5 rounded-full object-contain"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Hero Artwork / Photograph */}
                <figure className="my-7">
                  <div className="rounded-xl overflow-hidden border border-stone-200">
                    <NewsVisualFrame
                      item={selectedArticle}
                      teams={data.teams}
                      leagueLogo={data.logo}
                      season={data.season}
                      aspectClass="aspect-[16/9]"
                    />
                  </div>
                  <figcaption className="font-editorial italic text-xs text-stone-500 mt-2.5">
                    {selectedArticle.team1
                      ? `${selectedArticle.team1}${
                          selectedArticle.team2 ? ` vs ${selectedArticle.team2}` : ''
                        } — Nepal Premier League ${data.season} Official Coverage.`
                      : `Tribhuvan University International Cricket Ground, Kirtipur — Nepal Premier League ${data.season}.`}
                  </figcaption>
                </figure>

                {/* Long-Form Body Prose (Optimal 65ch Measure, 17px, 1.82 Line Height) */}
                <div className="space-y-5 text-[16.5px] sm:text-[17px] text-slate-800 leading-[1.82]">
                  {getArticleParagraphs(selectedArticle).map((para, idx) => (
                    <React.Fragment key={idx}>
                      <p
                        className={
                          idx === 0
                            ? 'first-letter:font-editorial first-letter:text-5xl first-letter:font-bold first-letter:text-slate-950 first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:leading-none'
                            : ''
                        }
                      >
                        {para}
                      </p>

                      {/* Editorial Hairline Pull-Quote after Opening Paragraph */}
                      {idx === 0 && selectedArticle.quote && (
                        <blockquote className="my-7 py-5 border-y border-stone-200 text-center px-4">
                          <p className="font-editorial italic text-xl sm:text-2xl text-slate-900 leading-[1.45] [text-wrap:balance]">
                            &ldquo;{selectedArticle.quote}&rdquo;
                          </p>
                        </blockquote>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Next / Previous Story Navigation */}
                {allSortedNews.length > 1 && (
                  <div className="mt-10 pt-6 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedArticleIndex > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedArticleId(allSortedNews[selectedArticleIndex - 1].id)
                        }
                        className="text-left p-4 bg-white border border-stone-200 hover:border-stone-300 rounded-xl cursor-pointer transition-colors"
                      >
                        <div className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold flex items-center gap-1">
                          <ArrowLeft className="w-3 h-3" /> Newer Dispatch
                        </div>
                        <div className="font-editorial text-sm font-bold text-slate-900 mt-1 line-clamp-2">
                          {allSortedNews[selectedArticleIndex - 1].title}
                        </div>
                      </button>
                    ) : (
                      <div />
                    )}

                    {selectedArticleIndex < allSortedNews.length - 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedArticleId(allSortedNews[selectedArticleIndex + 1].id)
                        }
                        className="text-left sm:text-right p-4 bg-white border border-stone-200 hover:border-stone-300 rounded-xl cursor-pointer transition-colors"
                      >
                        <div className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold flex items-center sm:justify-end gap-1">
                          Earlier Dispatch <ArrowRight className="w-3 h-3" />
                        </div>
                        <div className="font-editorial text-sm font-bold text-slate-900 mt-1 line-clamp-2">
                          {allSortedNews[selectedArticleIndex + 1].title}
                        </div>
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEAM SQUAD MODAL */}
      {selectedTeam && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/55 flex items-center justify-center p-4"
          onClick={() => setSelectedTeam(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-white flex items-center justify-between gap-4 bg-[#0d1542]">
              <div className="flex items-center gap-4">
                <img
                  src={selectedTeam.logo}
                  alt={selectedTeam.name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 bg-white rounded-full p-1.5 object-contain"
                />
                <div>
                  <h3 className="text-xl font-extrabold text-white">{selectedTeam.name}</h3>
                  <p className="text-xs text-white/85 mt-0.5">{selectedTeam.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeam(null)}
                aria-label="Close squad modal"
                className="p-2 rounded-lg bg-black/20 hover:bg-black/30 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                    <Trophy className="w-3.5 h-3.5" /> Captain
                  </div>
                  <div className="font-bold text-slate-900">{selectedTeam.captain || 'TBA'}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                    <Shield className="w-3.5 h-3.5" /> Head Coach
                  </div>
                  <div className="font-bold text-slate-900">{selectedTeam.coach || 'TBA'}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-slate-500 flex items-center gap-1.5 mb-1">
                    <MapPin className="w-3.5 h-3.5" /> Home Ground
                  </div>
                  <div className="font-bold text-slate-900">{selectedTeam.venue || 'TBA'}</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" /> Registered Squad (
                    {selectedTeam.players.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeam(null);
                      onJumpToAdmin('teams');
                    }}
                    className="text-xs font-semibold text-[#1a237e] hover:underline cursor-pointer"
                  >
                    Edit Squad in Admin
                  </button>
                </div>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {selectedTeam.players.map((p, idx) => (
                    <div
                      key={`${p.name}-${idx}`}
                      className="px-4 py-2.5 flex items-center justify-between text-sm"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">{p.name}</span>
                        <span className="text-xs text-slate-500 ml-2">· {p.role}</span>
                      </div>
                      {p.runs || p.wickets ? (
                        <div className="font-mono text-xs text-slate-500 tabular-nums">
                          {p.runs ? `${p.runs} runs` : ''}
                          {p.runs && p.wickets ? ' · ' : ''}
                          {p.wickets ? `${p.wickets} wkts` : ''}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
