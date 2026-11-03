/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { INITIAL_NPL_DATA, INITIAL_SERIES_MAP } from './data/defaultNplData';
import { getFixedWordPressPhpCode } from './data/fixedPhpCode';
import { NplDataState, NplSeries } from './types/npl';
import {
  OFFICIAL_NPL_LOGO_PATH,
  switchActiveSeries,
} from './utils/nplEngine';
import { ShortcodePreview } from './components/ShortcodePreview';
import { WpAdminSimulator } from './components/WpAdminSimulator';
import {
  BugAuditView,
  copyTextSynchronously,
  FixedCodeView,
} from './components/CodeAndAuditView';

type MainSection = 'preview' | 'admin' | 'code' | 'audit';
export type AdminSubTab = 'series' | 'matches' | 'teams' | 'news' | 'facebook';

const STORAGE_KEY = 'setopress_npl_studio_state_v66';
const LEGACY_STORAGE_KEY = 'setopress_npl_studio_state_v64';

function loadPersistedData(): NplDataState {
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<NplDataState>;
      if (parsed && parsed.teams && Array.isArray(parsed.matches) && Array.isArray(parsed.news)) {
        // Merge seeded seriesMap with any user-saved series
        const mergedSeriesMap: Record<string, NplSeries> = {
          ...INITIAL_SERIES_MAP,
          ...(parsed.seriesMap || {}),
        };

        // Ensure Nepal Premier League has official NPL logo unless user explicitly set a custom URL
        if (mergedSeriesMap['Nepal Premier League']) {
          const curLogo = mergedSeriesMap['Nepal Premier League'].logo || '';
          const shouldUseOfficial =
            !curLogo || curLogo.startsWith('data:image/svg+xml');
          mergedSeriesMap['Nepal Premier League'] = {
            ...mergedSeriesMap['Nepal Premier League'],
            logo: shouldUseOfficial ? OFFICIAL_NPL_LOGO_PATH : curLogo,
          };
        }

        // Preserve any legacy user edits to NPL teams if migrating from single-series v64
        if (!parsed.seriesMap && parsed.teams && Object.keys(parsed.teams).length > 0) {
          mergedSeriesMap['Nepal Premier League'] = {
            ...mergedSeriesMap['Nepal Premier League'],
            season: parsed.season || '2026',
            teams: parsed.teams,
          };
        }

        const defaultById = new Map(INITIAL_NPL_DATA.news.map((item) => [item.id, item]));
        const enrichedNews = parsed.news.map((item) => {
          const fallback = defaultById.get(item.id);
          if (!fallback) {
            return {
              ...item,
              series: item.series || 'Nepal Premier League',
            };
          }
          return {
            ...item,
            series: item.series || fallback.series || 'Nepal Premier League',
            content: item.content || fallback.content,
            author: item.author || fallback.author,
            quote: item.quote ?? fallback.quote,
            image: item.image || fallback.image,
          };
        });
        const existingNewsIds = new Set(enrichedNews.map((item) => item.id));
        for (const defItem of INITIAL_NPL_DATA.news) {
          if (!existingNewsIds.has(defItem.id)) {
            enrichedNews.push(defItem);
          }
        }

        const defaultMatchById = new Map(INITIAL_NPL_DATA.matches.map((m) => [m.id, m]));
        const enrichedMatches = parsed.matches.map((m) => {
          const fallbackMatch = defaultMatchById.get(m.id);
          if (!fallbackMatch) {
            return {
              ...m,
              series: m.series || 'Nepal Premier League',
            };
          }
          return {
            ...m,
            series: m.series || fallbackMatch.series || 'Nepal Premier League',
            live_details: m.live_details || fallbackMatch.live_details,
          };
        });
        const existingMatchIds = new Set(enrichedMatches.map((m) => m.id));
        for (const defMatch of INITIAL_NPL_DATA.matches) {
          if (!existingMatchIds.has(defMatch.id)) {
            enrichedMatches.push(defMatch);
          }
        }

        const activeKey =
          parsed.activeSeries && mergedSeriesMap[parsed.activeSeries]
            ? parsed.activeSeries
            : 'Nepal Premier League';
        const activeSeriesObj = mergedSeriesMap[activeKey];

        return {
          seriesName: activeSeriesObj.name,
          season: activeSeriesObj.season,
          logo: activeSeriesObj.logo,
          activeSeries: activeSeriesObj.name,
          seriesMap: mergedSeriesMap,
          teams: activeSeriesObj.teams,
          matches: enrichedMatches,
          news: enrichedNews,
        };
      }
    }
  } catch {
    // ignore storage errors
  }
  return INITIAL_NPL_DATA;
}

export default function App() {
  const [activeSection, setActiveSection] = useState<MainSection>('preview');
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('matches');
  const [nplData, setNplData] = useState<NplDataState>(loadPersistedData);
  const [copiedTop, setCopiedTop] = useState<boolean>(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nplData));
    } catch {
      // ignore quota errors
    }
  }, [nplData]);

  const handleQuickCopyPhp = () => {
    const php = getFixedWordPressPhpCode('snippet', nplData);
    copyTextSynchronously(php);
    setCopiedTop(true);
    setTimeout(() => setCopiedTop(false), 3000);
  };

  const handleJumpToAdmin = (subTab: AdminSubTab = 'matches') => {
    setAdminSubTab(subTab);
    setActiveSection('admin');
  };

  const handleSelectSeries = (seriesName: string) => {
    setNplData((prev) => switchActiveSeries(prev, seriesName));
  };

  const handleResetDemo = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // ignore
    }
    setNplData(INITIAL_NPL_DATA);
  };

  const seriesCount = Object.keys(nplData.seriesMap || {}).length || 4;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Official NPL Emblem + Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveSection('preview')}
            className="flex items-center gap-2.5 text-base sm:text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <img
              src={OFFICIAL_NPL_LOGO_PATH}
              alt="Nepal Premier League"
              className="h-8 w-auto object-contain shrink-0"
            />
            <span>SetoPress Studio</span>
          </button>

          {/* Zone 2: 4 Concise Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setActiveSection('code')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSection === 'code'
                  ? 'border-[#c8102e] text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Fixed PHP Code
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('preview')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSection === 'preview'
                  ? 'border-[#c8102e] text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Live Frontpage ({seriesCount} Series)
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('admin')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSection === 'admin'
                  ? 'border-[#c8102e] text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              WP Admin Manager
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('audit')}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSection === 'audit'
                  ? 'border-[#c8102e] text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Root-Cause Audit
            </button>
          </nav>

          {/* Zone 3: 1 Primary CTA Button */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleQuickCopyPhp}
              className="px-4 py-2 text-xs font-bold text-white bg-[#c8102e] hover:bg-[#a50d26] rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              {copiedTop ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedTop ? 'Copied v6.6.0 PHP' : 'Copy Fixed PHP (v6.6.0)'}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-1 overflow-x-auto">
        {(
          [
            { id: 'admin', label: 'WP Admin & Series' },
            { id: 'preview', label: `Frontpage (${seriesCount} Series)` },
            { id: 'code', label: 'Fixed PHP (v6.6.0)' },
            { id: 'audit', label: 'Audit' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === tab.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {activeSection === 'preview' && (
          <ShortcodePreview
            data={nplData}
            onJumpToAdmin={handleJumpToAdmin}
            onSelectSeries={handleSelectSeries}
            onCopySyncedPhp={handleQuickCopyPhp}
            copiedSyncedPhp={copiedTop}
          />
        )}

        {activeSection === 'admin' && (
          <WpAdminSimulator
            key={adminSubTab}
            data={nplData}
            initialSubTab={adminSubTab}
            onUpdateData={setNplData}
            onResetDemo={handleResetDemo}
            onSwitchToPreview={() => setActiveSection('preview')}
          />
        )}

        {activeSection === 'code' && <FixedCodeView data={nplData} />}

        {activeSection === 'audit' && (
          <BugAuditView onOpenCode={() => setActiveSection('code')} />
        )}
      </main>

      {/* Clean Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 px-4 sm:px-8 text-xs text-slate-500">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>
            SetoPress Multi-Series Cricket Hub v6.6.0 · {seriesCount} Active Series (NPL, T20 World Cup, Cricket World Cup, ACC Cup) · Direct MySQL Save · Facebook Sync (61590852571494)
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleJumpToAdmin('series')}
              className="hover:text-slate-900 font-medium cursor-pointer"
            >
              Series Manager ({seriesCount})
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => handleJumpToAdmin('facebook')}
              className="hover:text-slate-900 font-medium cursor-pointer"
            >
              Facebook Page Publisher
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveSection('code')}
              className="hover:text-slate-900 font-medium cursor-pointer"
            >
              Import via Code Snippets .json
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
