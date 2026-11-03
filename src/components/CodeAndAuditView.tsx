import React, { useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, Copy, Download, FileCode2, FileJson, Search } from 'lucide-react';
import { INITIAL_NPL_DATA } from '../data/defaultNplData';
import {
  BUG_AUDIT_ITEMS,
  getCodeSnippetsJsonExport,
  getFixedWordPressPhpCode,
  PhpExportFormat,
} from '../data/fixedPhpCode';
import { NplDataState } from '../types/npl';

export function copyTextSynchronously(text: string): boolean {
  let ok = false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    ok = document.execCommand('copy');
    document.body.removeChild(textarea);
  } catch {
    ok = false;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
    ok = true;
  }
  return ok;
}

interface FixedCodeViewProps {
  data?: NplDataState;
  onCopySuccess?: () => void;
}

export const FixedCodeView: React.FC<FixedCodeViewProps> = ({
  data = INITIAL_NPL_DATA,
  onCopySuccess,
}) => {
  const [format, setFormat] = useState<PhpExportFormat>('snippet');
  const [rawSelectMode, setRawSelectMode] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedShortcode, setCopiedShortcode] = useState<string | null>(null);
  const rawTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const fullCode = useMemo(() => getFixedWordPressPhpCode(format, data), [format, data]);
  const lines = useMemo(() => fullCode.split('\n'), [fullCode]);

  const matchingLineCount = useMemo(() => {
    if (!searchTerm.trim()) return 0;
    const q = searchTerm.toLowerCase();
    return lines.filter((l) => l.toLowerCase().includes(q)).length;
  }, [lines, searchTerm]);

  const handleCopy = () => {
    copyTextSynchronously(fullCode);
    setCopied(true);
    onCopySuccess?.();
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSelectAllRaw = () => {
    setRawSelectMode(true);
    setTimeout(() => {
      if (rawTextareaRef.current) {
        rawTextareaRef.current.focus();
        rawTextareaRef.current.select();
      }
    }, 30);
  };

  const handleCopyShortcodeTag = (tag: string) => {
    copyTextSynchronously(tag);
    setCopiedShortcode(tag);
    setTimeout(() => setCopiedShortcode(null), 2400);
  };

  const handleDownloadPhp = () => {
    const filename =
      format === 'plugin'
        ? 'setopress-npl-manager.php'
        : format === 'functions'
        ? 'npl-functions-snippet.php'
        : 'setopress-npl-v6.6.0-snippet.php';
    const blob = new Blob([fullCode], { type: 'text/x-php;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCodeSnippetsJson = () => {
    const json = getCodeSnippetsJsonExport(data);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'setopress-npl-v6.6.0.code-snippets.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const seriesCount = Object.keys(data.seriesMap || {}).length || 1;
  const teamCount = Object.keys(data.teams || {}).length;
  const matchCount = (data.matches || []).length;
  const newsCount = (data.news || []).length;

  return (
    <div className="space-y-6">
      {/* Deployment Guide & Format Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              1:1 SetoPress Multi-Series &amp; NPL WordPress Snippet (v6.6.0 — Synced with Your Live Studio App)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Your current SetoPress Studio state (<span className="font-semibold text-slate-900 tabular-nums">{seriesCount} Series · {teamCount} Active Teams · {matchCount} Matches · {newsCount} Editorial News Stories</span>) plus the Official NPL Logo is baked directly into this PHP export, with 1:1 Admin &amp; Frontpage Multi-Series parity.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2.5 text-xs font-bold text-white bg-[#c8102e] hover:bg-[#a50d26] rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied v6.6.0 to Clipboard!' : 'Copy v6.6.0 PHP Code'}
            </button>
            <button
              type="button"
              onClick={handleDownloadCodeSnippetsJson}
              className="px-3.5 py-2.5 text-xs font-bold text-white bg-[#1a237e] hover:bg-[#12195c] rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileJson className="w-4 h-4" />
              Download Code Snippets .json
            </button>
            <button
              type="button"
              onClick={handleDownloadPhp}
              className="px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download .php
            </button>
          </div>
        </div>

        {/* Shortcode Quick-Copy Strip */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-700">
            <span className="font-bold text-slate-900">WordPress Page Shortcodes:</span> Paste into a Gutenberg <strong>Shortcode</strong> block on a <strong>Full-Width / Wide</strong> page template for an exact 1360px 1:1 layout.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopyShortcodeTag('[setopress_npl]')}
              className="px-3 py-1.5 font-mono font-bold text-slate-900 bg-white border border-slate-300 hover:border-slate-400 rounded-md flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedShortcode === '[setopress_npl]' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              [setopress_npl]
            </button>
            <button
              type="button"
              onClick={() => handleCopyShortcodeTag('[setopress_npl_news]')}
              className="px-3 py-1.5 font-mono font-bold text-slate-900 bg-white border border-slate-300 hover:border-slate-400 rounded-md flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedShortcode === '[setopress_npl_news]' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              [setopress_npl_news]
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setFormat('snippet')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  format === 'snippet'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Code Snippets / WPCode
              </button>
              <button
                type="button"
                onClick={() => setFormat('plugin')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  format === 'plugin'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Standalone Plugin (.php)
              </button>
              <button
                type="button"
                onClick={() => setFormat('functions')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  format === 'functions'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Theme functions.php
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                rawSelectMode ? setRawSelectMode(false) : handleSelectAllRaw()
              }
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              {rawSelectMode ? 'Show Line Numbers' : 'Select All Raw Text (Ctrl+C)'}
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search function or shortcode..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {/* Contextual Installation Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs text-slate-600">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="font-bold text-slate-900 mb-1">
              01. Replace Old Snippet with v6.6.0
            </div>
            <p>
              In <strong>WordPress → Snippets</strong>, turn off any older NPL snippet, paste <strong>v6.6.0</strong> (or import the <code>.json</code> file), and click <strong>Save Changes and Activate</strong>.
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="font-bold text-slate-900 mb-1">
              02. Multi-Series Admin &amp; Frontpage Parity
            </div>
            <p>
              Activating <strong>v6.6.0</strong> syncs all {seriesCount} configured series (NPL with Official Logo, T20 World Cup, ODI Cricket World Cup, ACC Premier Cup), matches, squads &amp; news into MySQL.
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="font-bold text-slate-900 mb-1">
              03. Embed Shortcodes on Full-Width Page
            </div>
            <p>
              Add <code>[setopress_npl]</code> for the Multi-Series Hub (or <code>[setopress_npl series="ICC Cricket World Cup"]</code>) and <code>[setopress_npl_news]</code> for the Newsroom.
            </p>
          </div>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-teal-400" />
            <span className="text-slate-200 font-semibold">
              {format === 'plugin'
                ? 'setopress-npl-manager.php'
                : format === 'functions'
                ? 'functions.php'
                : 'code-snippet-v6.6.0.php'}
            </span>
            <span>·</span>
            <span className="tabular-nums">{lines.length} lines</span>
          </div>
          {searchTerm.trim() && (
            <span className="text-amber-300 tabular-nums">
              {matchingLineCount} matching line{matchingLineCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {rawSelectMode ? (
          <div className="p-4">
            <textarea
              ref={rawTextareaRef}
              readOnly
              value={fullCode}
              onClick={(e) => e.currentTarget.select()}
              className="w-full h-[560px] bg-slate-950 text-emerald-100 font-mono text-xs p-4 rounded-lg border border-slate-700 focus:outline-none"
            />
          </div>
        ) : (
          <div className="max-h-[620px] overflow-auto p-4 font-mono text-xs leading-relaxed">
            {lines.map((line, index) => {
              const isMatch =
                Boolean(searchTerm.trim()) &&
                line.toLowerCase().includes(searchTerm.toLowerCase());
              return (
                <div
                  key={index}
                  className={`flex gap-4 px-2 py-0.5 rounded-xs ${
                    isMatch ? 'bg-amber-400/20 text-amber-100' : 'text-slate-200'
                  }`}
                >
                  <span className="w-10 text-right select-none text-slate-500 shrink-0 tabular-nums">
                    {index + 1}
                  </span>
                  <span className="whitespace-pre">{line || ' '}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const BugAuditView: React.FC<{ onOpenCode: () => void }> = ({ onOpenCode }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Root-Cause Audit: Why Saves, Points Table &amp; Results Were Not Updating
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
            Detailed breakdown of the 1:1 Multi-Series Studio Sync, Official NPL Logo &amp; SVG <code>esc_url()</code> protection, <code>wpautop</code> shortcode immunity, ModSecurity WAF, LiteSpeed page-caching, and format-aware T20/ODI Net Run Rate resolved in v6.6.0.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCode}
          className="px-4 py-2.5 text-xs font-bold text-white bg-[#1a237e] hover:bg-[#12195c] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Get Fixed v6.6.0 PHP Code
        </button>
      </div>

      <div className="space-y-4">
        {BUG_AUDIT_ITEMS.map((item, idx) => (
          <div
            key={item.id}
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-extrabold text-slate-900">
                0{idx + 1}. {item.title}
              </h3>
              <div className="text-xs text-slate-500 font-mono">
                <span
                  className={
                    item.severity === 'Critical'
                      ? 'text-rose-600 font-bold'
                      : item.severity === 'High'
                      ? 'text-amber-700 font-bold'
                      : 'text-slate-700 font-semibold'
                  }
                >
                  {item.severity} Severity
                </span>
                <span className="mx-2">·</span>
                <span>{item.linesInOriginal}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Observed Symptom
                </div>
                <p className="text-slate-600">{item.symptom}</p>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Root Cause &amp; Resolution
                </div>
                <p className="text-slate-600">{item.rootCause}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs">
              <div className="bg-rose-950/95 text-rose-100 rounded-lg p-4 overflow-x-auto">
                <div className="text-[11px] font-semibold text-rose-300 mb-2">
                  Previous Behavior
                </div>
                <pre className="whitespace-pre-wrap leading-relaxed">{item.beforeCode}</pre>
              </div>
              <div className="bg-slate-900 text-emerald-100 rounded-lg p-4 overflow-x-auto">
                <div className="text-[11px] font-semibold text-emerald-300 mb-2">
                  Fixed v6.6.0 Production Code
                </div>
                <pre className="whitespace-pre-wrap leading-relaxed">{item.afterCode}</pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
