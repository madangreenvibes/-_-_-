import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, ExternalLink, RefreshCw, Send, Share2 } from 'lucide-react';
import { NplDataState, NplMatch, NplNewsItem, PointsTableRow } from '../types/npl';
import {
  calculatePointsTable,
  generateAutoResultText,
  resolveMatchOutcome,
} from '../utils/nplEngine';
import { copyTextSynchronously } from './CodeAndAuditView';

interface FacebookStatus {
  pageId: string;
  pageUrl: string;
  connected: boolean;
  authSource: 'oauth' | 'env' | 'none';
  oauthConfigured: boolean;
  redirectUri: string;
}

type PostTemplateKind = 'combined' | 'result' | 'table' | 'news';

export function buildFacebookResultPost(
  season: string,
  match: NplMatch | undefined,
  seriesName = 'Nepal Premier League'
): string {
  const upperSeries = seriesName.toUpperCase();
  const tag = seriesName.replace(/[^A-Za-z0-9]/g, '');
  if (!match) {
    return `🏏 ${upperSeries} ${season} — MATCH RESULTS UPDATE\nStay tuned for official scores and standings!`;
  }
  const summary = match.result_text || generateAutoResultText(match);
  const s1 = `${match.team1_score || '-'}${match.team1_overs ? ` (${match.team1_overs} ov)` : ''}`;
  const s2 = `${match.team2_score || '-'}${match.team2_overs ? ` (${match.team2_overs} ov)` : ''}`;
  return [
    `🏏 ${upperSeries} ${season} — OFFICIAL RESULT`,
    `${match.match_no ? `${match.match_no} · ` : ''}${match.venue || 'TU Cricket Ground, Kirtipur'}`,
    '',
    `🔹 ${match.team1}: ${s1}`,
    `🔸 ${match.team2}: ${s2}`,
    '',
    `🏆 ${summary}`,
    '',
    `#${tag}${season} #CricketNepal #SetoPress`,
  ].join('\n');
}

export function buildFacebookTablePost(
  season: string,
  standings: PointsTableRow[],
  seriesName = 'Nepal Premier League'
): string {
  const upperSeries = seriesName.toUpperCase();
  const tag = seriesName.replace(/[^A-Za-z0-9]/g, '');
  const lines = [
    `📊 ${upperSeries} ${season} — OFFICIAL POINTS TABLE`,
    `Updated Standings (Top 4 Qualify):`,
    '',
  ];
  standings.forEach((row, idx) => {
    const pos = idx + 1;
    const nrr = `${row.nrr >= 0 ? '+' : ''}${row.nrr.toFixed(3)}`;
    const icon = pos <= 4 ? '🟢' : '⚪';
    lines.push(
      `${icon} ${pos}. ${row.name} — P:${row.p} | W:${row.w} | L:${row.l} | Pts:${row.pts} (NRR ${nrr})`
    );
  });
  lines.push('');
  lines.push(`#${tag}${season} #CricketStandings #SetoPress`);
  return lines.join('\n');
}

export function buildFacebookNewsPost(
  season: string,
  article: NplNewsItem | undefined,
  seriesName = 'Nepal Premier League'
): string {
  const upperSeries = seriesName.toUpperCase();
  const tag = seriesName.replace(/[^A-Za-z0-9]/g, '');
  if (!article) {
    return `📰 ${upperSeries} ${season} — OFFICIAL NEWS\nFollow our page for match reports and tournament updates!`;
  }
  const cat =
    article.category === 'match'
      ? 'MATCH REPORT'
      : article.category === 'update'
      ? 'TOURNAMENT UPDATE'
      : 'PRESS RELEASE';
  const lines = [`📰 ${upperSeries} ${season} ${cat}: ${article.title}`, ''];
  if (article.excerpt) {
    lines.push(article.excerpt);
    lines.push('');
  }
  lines.push(`#${tag}${season} #CricketNepal #SetoPress`);
  return lines.join('\n');
}

interface FacebookPagePublisherProps {
  data: NplDataState;
}

export const FacebookPagePublisher: React.FC<FacebookPagePublisherProps> = ({ data }) => {
  const [fbStatus, setFbStatus] = useState<FacebookStatus>({
    pageId: '61590852571494',
    pageUrl: 'https://www.facebook.com/profile.php?id=61590852571494',
    connected: false,
    authSource: 'none',
    oauthConfigured: false,
    redirectUri: '',
  });
  const [templateKind, setTemplateKind] = useState<PostTemplateKind>('combined');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [selectedNewsId, setSelectedNewsId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [userEditedMessage, setUserEditedMessage] = useState<boolean>(false);
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [attachCardImage, setAttachCardImage] = useState<boolean>(true);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeSeriesTitle = data.activeSeries || data.seriesName || 'Nepal Premier League';

  const standings = useMemo(
    () => calculatePointsTable(data, activeSeriesTitle),
    [data, activeSeriesTitle]
  );

  const completedMatches = useMemo(() => {
    return [...data.matches]
      .filter(
        (m) =>
          (m.series || 'Nepal Premier League') === activeSeriesTitle &&
          !m.live &&
          resolveMatchOutcome(m).type !== 'fixture'
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data.matches, activeSeriesTitle]);

  const sortedNews = useMemo(() => {
    return [...data.news]
      .filter((n) => !n.series || n.series === activeSeriesTitle)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data.news, activeSeriesTitle]);

  const activeMatch = useMemo(() => {
    return (
      completedMatches.find((m) => m.id === selectedMatchId) || completedMatches[0]
    );
  }, [completedMatches, selectedMatchId]);

  const activeNews = useMemo(() => {
    return sortedNews.find((n) => n.id === selectedNewsId) || sortedNews[0];
  }, [sortedNews, selectedNewsId]);

  const generatedMessage = useMemo(() => {
    if (templateKind === 'result') {
      return buildFacebookResultPost(data.season, activeMatch, activeSeriesTitle);
    }
    if (templateKind === 'table') {
      return buildFacebookTablePost(data.season, standings, activeSeriesTitle);
    }
    if (templateKind === 'news') {
      return buildFacebookNewsPost(data.season, activeNews, activeSeriesTitle);
    }
    return [
      buildFacebookResultPost(data.season, activeMatch, activeSeriesTitle),
      '',
      buildFacebookTablePost(data.season, standings, activeSeriesTitle),
    ].join('\n');
  }, [templateKind, data.season, activeMatch, standings, activeNews, activeSeriesTitle]);

  useEffect(() => {
    if (!userEditedMessage) {
      setCustomMessage(generatedMessage);
    }
  }, [generatedMessage, userEditedMessage]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/facebook/status', { credentials: 'include' });
      if (res.ok) {
        const json = (await res.json()) as FacebookStatus;
        setFbStatus(json);
      }
    } catch {
      // Keep default Page ID 61590852571494
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin || '';
      if (
        origin &&
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost') &&
        origin !== window.location.origin
      ) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchStatus();
        setFeedback({
          type: 'ok',
          text: `Facebook Page (${event.data.pageId || '61590852571494'}) connected via Meta OAuth! Ready to auto-publish.`,
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchStatus]);

  // Draw crisp 1200x630 broadcast graphic on canvas whenever Results / Table / News change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 1200;
    const H = 630;
    canvas.width = W;
    canvas.height = H;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0b133b');
    grad.addColorStop(0.58, '#1a237e');
    grad.addColorStop(1, '#880e25');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Top bar accent
    ctx.fillStyle = '#c8102e';
    ctx.fillRect(0, 0, W, 8);

    // Header Title
    ctx.fillStyle = '#5eead4';
    ctx.font = '700 18px sans-serif';
    ctx.fillText(
      `${activeSeriesTitle.toUpperCase()} ${data.season} · OFFICIAL BROADCAST UPDATE`,
      48,
      56
    );

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 34px sans-serif';
    const headline =
      templateKind === 'news' && activeNews
        ? activeNews.title.slice(0, 58)
        : templateKind === 'table'
        ? `${activeSeriesTitle} ${data.season} Standings`
        : activeMatch
        ? `${activeMatch.team1} vs ${activeMatch.team2}`
        : `${activeSeriesTitle} ${data.season} Results & Standings`;
    ctx.fillText(headline, 48, 102);

    // Left Column: Match Result / News Card
    ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.fillRect(48, 132, 480, 444);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(48, 132, 480, 444);

    if (templateKind === 'news' && activeNews) {
      ctx.fillStyle = '#fda4af';
      ctx.font = '700 16px monospace';
      ctx.fillText(`LATEST NEWS · ${activeNews.date}`, 74, 174);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 24px sans-serif';
      const words = (activeNews.title || '').split(' ');
      let line = '';
      let y = 220;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > 420) {
          ctx.fillText(line, 74, y);
          line = word;
          y += 34;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, 74, y);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 18px sans-serif';
      const exWords = (activeNews.excerpt || '').split(' ');
      let exLine = '';
      let ey = y + 48;
      for (const word of exWords) {
        const test = exLine ? `${exLine} ${word}` : word;
        if (ctx.measureText(test).width > 420) {
          ctx.fillText(exLine, 74, ey);
          exLine = word;
          ey += 28;
          if (ey > 520) break;
        } else {
          exLine = test;
        }
      }
      if (exLine && ey <= 520) ctx.fillText(exLine, 74, ey);
    } else if (activeMatch) {
      ctx.fillStyle = '#fde68a';
      ctx.font = '700 16px monospace';
      ctx.fillText(
        `${activeMatch.match_no || 'MATCH RESULT'} · ${activeMatch.date}`,
        74,
        174
      );

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 24px sans-serif';
      ctx.fillText(activeMatch.team1, 74, 232);
      ctx.font = '700 26px monospace';
      ctx.fillStyle = '#5eead4';
      ctx.fillText(
        `${activeMatch.team1_score || '-'} ${
          activeMatch.team1_overs ? `(${activeMatch.team1_overs} ov)` : ''
        }`,
        74,
        268
      );

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '600 16px sans-serif';
      ctx.fillText('VS', 74, 312);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 24px sans-serif';
      ctx.fillText(activeMatch.team2, 74, 354);
      ctx.font = '700 26px monospace';
      ctx.fillStyle = '#5eead4';
      ctx.fillText(
        `${activeMatch.team2_score || '-'} ${
          activeMatch.team2_overs ? `(${activeMatch.team2_overs} ov)` : ''
        }`,
        74,
        390
      );

      ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
      ctx.fillRect(74, 434, 428, 64);
      ctx.fillStyle = '#a7f3d0';
      ctx.font = '700 18px sans-serif';
      const summary = activeMatch.result_text || generateAutoResultText(activeMatch);
      ctx.fillText(summary.slice(0, 44), 90, 473);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '500 15px sans-serif';
      ctx.fillText(activeMatch.venue || 'TU Cricket Ground, Kirtipur', 74, 540);
    }

    // Right Column: Official 8-Team Points Table
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(556, 132, 596, 444);

    ctx.fillStyle = '#0f172a';
    ctx.font = '800 18px sans-serif';
    ctx.fillText('OFFICIAL POINTS TABLE (TOP 4 PLAYOFFS)', 580, 168);

    ctx.fillStyle = '#64748b';
    ctx.font = '700 13px monospace';
    ctx.fillText('#  FRANCHISE', 580, 198);
    ctx.fillText('P   W   L   PTS    NRR', 945, 198);

    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(580, 208);
    ctx.lineTo(1128, 208);
    ctx.stroke();

    standings.slice(0, 8).forEach((row, i) => {
      const ry = 238 + i * 42;
      if (i < 4) {
        ctx.fillStyle = 'rgba(20, 184, 166, 0.09)';
        ctx.fillRect(572, ry - 24, 564, 36);
      }
      ctx.fillStyle = i < 4 ? '#0f766e' : '#475569';
      ctx.font = '700 15px monospace';
      ctx.fillText(`${i + 1}`, 582, ry);

      ctx.fillStyle = '#0f172a';
      ctx.font = '700 16px sans-serif';
      ctx.fillText(row.name.slice(0, 22), 612, ry);

      ctx.fillStyle = '#334155';
      ctx.font = '700 15px monospace';
      const p = String(row.p).padStart(2, ' ');
      const w = String(row.w).padStart(2, ' ');
      const l = String(row.l).padStart(2, ' ');
      const pts = String(row.pts).padStart(3, ' ');
      const nrr = `${row.nrr >= 0 ? '+' : ''}${row.nrr.toFixed(3)}`;
      ctx.fillText(`${p}  ${w}  ${l}  ${pts}  ${nrr}`, 938, ry);
    });

    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '600 14px monospace';
    ctx.fillText('facebook.com/profile.php?id=61590852571494 · SetoPress NPL Hub', 48, 608);
  }, [data.season, templateKind, activeMatch, activeNews, standings]);

  const handleConnectOAuth = async () => {
    try {
      const res = await fetch('/api/auth/facebook/url', { credentials: 'include' });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setFeedback({
          type: 'err',
          text:
            json.error ||
            'Configure FACEBOOK_PAGE_ACCESS_TOKEN (or FACEBOOK_APP_ID + FACEBOOK_APP_SECRET) in the AI Studio Secrets panel.',
        });
        return;
      }
      window.open(json.url, 'facebook_oauth_popup', 'width=620,height=720');
    } catch {
      setFeedback({
        type: 'err',
        text: 'Could not initiate Facebook OAuth popup.',
      });
    }
  };

  const handlePublishToFacebook = async () => {
    if (!customMessage.trim()) return;
    setPublishing(true);
    setFeedback(null);
    try {
      const imageDataUrl =
        attachCardImage && canvasRef.current
          ? canvasRef.current.toDataURL('image/png')
          : '';
      const res = await fetch('/api/facebook/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: customMessage,
          link: linkUrl.trim() || undefined,
          imageDataUrl,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        postId?: string;
        error?: string;
      };
      if (res.ok && json.ok) {
        setFeedback({
          type: 'ok',
          text: `Published live to Facebook Page (${fbStatus.pageId})! Post ID: ${json.postId}`,
        });
      } else {
        setFeedback({
          type: 'err',
          text:
            json.error ||
            'Facebook Page Access Token required in Secrets (FACEBOOK_PAGE_ACCESS_TOKEN) for direct API publishing — or use Copy Caption + Download PNG Card below.',
        });
      }
    } catch {
      setFeedback({
        type: 'err',
        text: 'Network error while contacting /api/facebook/publish.',
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleDownloadCardPng = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `npl-${data.season}-${templateKind}-facebook-card.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyCaption = () => {
    copyTextSynchronously(customMessage);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 3000);
  };

  const handleZeroTokenInstantPost = () => {
    copyTextSynchronously(customMessage);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 3500);
    handleDownloadCardPng();
    setFeedback({
      type: 'ok',
      text: `Copied NPL post caption & downloaded the 1200×630 HD Broadcast Card PNG! Paste the text & drop the PNG onto Facebook Page (${fbStatus.pageId}).`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Connection Bar for Facebook Page 61590852571494 */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Share2 className="w-4 h-4 text-[#1877F2]" />
            <h3 className="text-base font-extrabold text-slate-900">
              Facebook Page Publisher — Results, Points Table &amp; News
            </h3>
            <span
              className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md border ${
                fbStatus.connected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {fbStatus.connected
                ? `Graph API Connected (${fbStatus.authSource === 'oauth' ? 'Meta OAuth' : 'Server Secret'})`
                : 'Zero-Token Instant Mode Active'}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Target Page:{' '}
            <a
              href={fbStatus.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#1877F2] hover:underline inline-flex items-center gap-1"
            >
              https://www.facebook.com/profile.php?id={fbStatus.pageId}
              <ExternalLink className="w-3 h-3" />
            </a>{' '}
            ·{' '}
            <span className="text-slate-600">
              Use <strong>1-Click Instant Post</strong> below with zero token, or connect Meta OAuth / <code>FACEBOOK_PAGE_ACCESS_TOKEN</code> in Secrets for automated Graph API posting.
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!fbStatus.connected && (
            <button
              type="button"
              onClick={handleConnectOAuth}
              className="px-4 py-2 text-xs font-bold text-white bg-[#1877F2] hover:bg-[#1464cc] rounded-lg transition-colors cursor-pointer"
            >
              Connect Facebook Page (OAuth)
            </button>
          )}
          <button
            type="button"
            onClick={fetchStatus}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
          </button>
          <a
            href={fbStatus.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1.5"
          >
            Open Facebook Page <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {feedback && (
        <div
          className={`px-4 py-3 rounded-xl text-xs font-semibold border ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Post Composer */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-slate-900">
              1. Choose Update Content
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'combined', label: 'Result + Table' },
                  { id: 'result', label: 'Match Result' },
                  { id: 'table', label: 'Points Table' },
                  { id: 'news', label: 'Latest News' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTemplateKind(t.id);
                    setUserEditedMessage(false);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    templateKind === t.id
                      ? 'bg-[#1a237e] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {(templateKind === 'combined' || templateKind === 'result') &&
            completedMatches.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Select Completed Match Result
                </label>
                <select
                  value={activeMatch?.id || ''}
                  onChange={(e) => {
                    setSelectedMatchId(e.target.value);
                    setUserEditedMessage(false);
                  }}
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-medium"
                >
                  {completedMatches.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.date} · {m.match_no ? `${m.match_no}: ` : ''}
                      {m.team1} ({m.team1_score}) vs {m.team2} ({m.team2_score})
                    </option>
                  ))}
                </select>
              </div>
            )}

          {templateKind === 'news' && sortedNews.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Select Published News Article
              </label>
              <select
                value={activeNews?.id || ''}
                onChange={(e) => {
                  setSelectedNewsId(e.target.value);
                  setUserEditedMessage(false);
                }}
                className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg font-medium"
              >
                {sortedNews.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.date} · {n.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-600">
                Facebook Post Caption (Editable)
              </label>
              {userEditedMessage && (
                <button
                  type="button"
                  onClick={() => {
                    setUserEditedMessage(false);
                    setCustomMessage(generatedMessage);
                  }}
                  className="text-[11px] font-semibold text-[#1a237e] hover:underline cursor-pointer"
                >
                  Reset to Auto Caption
                </button>
              )}
            </div>
            <textarea
              rows={11}
              value={customMessage}
              onChange={(e) => {
                setUserEditedMessage(true);
                setCustomMessage(e.target.value);
              }}
              className="w-full px-3.5 py-3 text-xs bg-white text-slate-900 font-mono leading-relaxed border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Optional Website NPL Hub Link (Shared with Post)
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://setopress.com/nepal-premier-league/"
              className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg"
            />
          </div>

          {/* Smart Unified Publish Box — Zero Dead-Ends */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
            <div className="text-xs font-bold text-emerald-950">
              Publish Now to Facebook Page ({fbStatus.pageId}):
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {fbStatus.connected ? (
                <button
                  type="button"
                  disabled={publishing}
                  onClick={handlePublishToFacebook}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-[#1877F2] hover:bg-[#1464cc] disabled:opacity-60 rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {publishing
                    ? 'Publishing via Meta Graph API...'
                    : `Auto-Publish via Meta Graph API (${fbStatus.pageId})`}
                </button>
              ) : (
                <a
                  href={fbStatus.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleZeroTokenInstantPost}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-[#1877F2] hover:bg-[#1464cc] rounded-lg inline-flex items-center gap-2 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Publish to Facebook Page ({fbStatus.pageId}) — Copy + HD Card
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              <a
                href={fbStatus.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleZeroTokenInstantPost}
                className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg inline-flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Copy + Download Card &amp; Open Page
                <ExternalLink className="w-3 h-3" />
              </a>

              <button
                type="button"
                onClick={handleCopyCaption}
                className="px-3 py-2 text-xs font-bold text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedCaption ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedCaption ? 'Copied!' : 'Copy Caption Only'}
              </button>
            </div>

            {fbStatus.connected ? (
              <label className="flex items-center gap-2 text-xs font-semibold text-emerald-900 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={attachCardImage}
                  onChange={(e) => setAttachCardImage(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                Attach 1200×630 HD Broadcast Standings &amp; Result Graphic PNG with API post
              </label>
            ) : (
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                <strong>Zero Token Needed:</strong> Clicking Publish copies your formatted Match Result / Points Table / News caption, downloads the <strong>1200×630 HD Broadcast Card PNG</strong>, and opens Page <span className="font-mono">{fbStatus.pageId}</span> ready for <span className="font-mono">Ctrl+V</span>! (For background Graph API auto-posting in Studio, add <span className="font-mono">FACEBOOK_PAGE_ACCESS_TOKEN</span> or <span className="font-mono">FACEBOOK_APP_ID</span> + <span className="font-mono">FACEBOOK_APP_SECRET</span> in AI Studio Secrets.)
              </p>
            )}
          </div>
        </div>

        {/* Right: Live 1200x630 Broadcast Graphic Preview & Download */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                2. Auto-Generated Facebook Broadcast Card (1200×630)
              </h4>
              <p className="text-xs text-slate-500">
                Updates live whenever you save a Match Result, Squad Stat, or News item.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadCardPng}
              className="px-3.5 py-2 text-xs font-bold text-white bg-[#0f766e] hover:bg-[#0d635c] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Download PNG Card
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-900">
            <canvas
              ref={canvasRef}
              className="w-full h-auto block"
            />
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed space-y-1.5">
            <div>
              <strong className="text-slate-900">WordPress v6.5.3 Facebook Fix Included:</strong>{' '}
              Your exported <code>v6.5.3</code> WordPress snippet adds{' '}
              <strong>Zero-Dead-End Smart Publishing</strong> (auto-copies post + downloads HD PNG + opens Page{' '}
              <span className="font-mono text-slate-800">61590852571494</span> whenever no Meta token is entered),{' '}
              <strong>0KB Server-Side PHP GD 1200×630 Card Rendering</strong> (eliminating cPanel ModSecurity 500KB POST blocks),{' '}
              <strong>WAF-Safe Base64 AJAX Token Verify/Publish</strong>, and{' '}
              <strong>1-Click Facebook JS SDK Popup Login</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
