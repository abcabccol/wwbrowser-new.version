/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Globe, ChevronLeft, ChevronRight, RotateCcw, Plus, X, Terminal, Cpu, Zap, Info, Share2, Sparkles, Send, LayoutGrid, ShieldAlert, BrainCircuit, ExternalLink, Download, Puzzle, Languages, Check, Image as ImageIcon, Video, Palette, Code, Settings, ChevronDown, Newspaper, CloudSun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

async function wwBrowserAi(task: "synthesize" | "chat" | "translate" | "detectLanguage" | "generateMedia", payload: {
  input: string;
  context?: string;
  language: string;
  targetLang?: string;
  type?: "image" | "video";
  prompt?: string;
}) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, ...payload }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WW-BrowserAi error (${res.status}): ${text}`);
  }
  return (await res.json()) as { text?: string; visuals?: { type: "image" | "video"; url: string; prompt: string }[] };
}

interface SearchSource {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
}

interface ImageResult {
  id: string;
  title: string;
  imageUrl: string;
  sourceUrl: string;
  sourceLabel: string;
  description?: string;
}

interface ShopResult {
  id: string;
  name: string;
  about: string;
  siteUrl: string;
  price: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface TabState {
  url: string;
  title: string;
  content: string;
  html?: string;
  originalContent?: string;
  originalHtml?: string;
  favicon?: string;
  translationKey?: number;
  sources: SearchSource[];
  recommendations: string[];
  visuals?: { type: 'image' | 'video', url: string, prompt: string }[];
  imageResults?: ImageResult[];
  shopResults?: ShopResult[];
  sourcePool?: SearchSource[];
}

interface Tab {
  id: string;
  loading: boolean;
  chat: ChatMessage[];
  history: TabState[];
  historyIndex: number;
}

const LANGUAGES = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ar', label: 'العربية' }
];

export default function App() {
  const [tabs, setTabs] = useState<Tab[]>([
    { 
      id: '1', 
      loading: false, 
      chat: [], 
      history: [{ url: 'ww://home', title: 'WW - BrowserAi', content: '', sources: [], recommendations: [] }], 
      historyIndex: 0 
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [input, setInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [language, setLanguage] = useState('tr');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [shortcuts, setShortcuts] = useState<{ url: string, label: string, icon: string }[]>([
    { url: 'ww://news', label: language === 'tr' ? 'Haberler' : 'News', icon: 'Newspaper' },
    { url: 'ww://weather', label: language === 'tr' ? 'Hava Durumu' : 'Weather', icon: 'CloudSun' },
    { url: 'ww://wwforcoders', label: language === 'tr' ? 'Coding' : 'Coding', icon: 'Code' },
    { url: 'ww://navis', label: language === 'tr' ? 'WWInformation' : 'WWInformation', icon: 'Info' },
    { url: 'ww://license', label: 'License (GLU General Public Linsence Version 3.0)', icon: 'ShieldAlert' }
  ]);
  const [showExtensions, setShowExtensions] = useState(false);
  const [showCustomTools, setShowCustomTools] = useState(false);
  const [showTranslate, setShowTranslate] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [accentColor, setAccentColor] = useState('#3B82F6');
  const [glassIntensity, setGlassIntensity] = useState(25);
  const [lowLatency, setLowLatency] = useState(true);
  const [crawlerAggression, setCrawlerAggression] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [targetTranslateLang, setTargetTranslateLang] = useState('English');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState('');
  const [blockedDomains, setBlockedDomains] = useState<string[]>([]);
  const [activeContentTab, setActiveContentTab] = useState<'all' | 'images' | 'shopping'>('all');
  const [visibleSourceCount, setVisibleSourceCount] = useState(8);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [geo, setGeo] = useState<{ lat: number; lon: number; accuracy?: number } | null>(null);
  const liveUpdateTimerRef = useRef<number | null>(null);
  const blockedListTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setShortcuts((prev) => prev.map((shortcut) => {
      if (shortcut.url === 'ww://news') {
        return { ...shortcut, label: language === 'tr' ? 'Haberler' : 'News' };
      }
      if (shortcut.url === 'ww://weather') {
        return { ...shortcut, label: language === 'tr' ? 'Hava Durumu' : 'Weather' };
      }
      if (shortcut.url === 'ww://wwforcoders') {
        return { ...shortcut, label: 'Coding' };
      }
      if (shortcut.url === 'ww://navis') {
        return { ...shortcut, label: 'WWInformation' };
      }
      return shortcut;
    }));
  }, [language]);

  // F12 quick devtools (WW Element Inspector)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F12') {
        event.preventDefault();
        setShowSource(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const lastMsgRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const activeState = activeTab.history[activeTab.historyIndex];

  // Geolocation (used for country rules + weather/news context)
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setGeo({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });

      });
    }
  }, []);

  // Keep blocked list synced forever (periodic pull from backend).
  useEffect(() => {
    const fetchBlockedSites = async () => {
      try {
        const params = new URLSearchParams();
        if (geo?.lat != null) params.set('lat', String(geo.lat));
        if (geo?.lon != null) params.set('lon', String(geo.lon));

        const response = await fetch(`/api/blocked-sites?${params.toString()}`);
        if (!response.ok) return;
        const data = await response.json();
        setBlockedDomains(Array.isArray(data.domains) ? data.domains : []);
        if (typeof data.currency === 'string') setCurrencyCode(data.currency);
      } catch (error) {
        console.error('Blocked list update failed', error);
      }
    };

    fetchBlockedSites();
    if (blockedListTimerRef.current) {
      window.clearInterval(blockedListTimerRef.current);
    }
    blockedListTimerRef.current = window.setInterval(fetchBlockedSites, 60_000);

    return () => {
      if (blockedListTimerRef.current) {
        window.clearInterval(blockedListTimerRef.current);
        blockedListTimerRef.current = null;
      }
    };
  }, [geo]);

  useEffect(() => {
    lastMsgRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTab.chat]);

  // Live portals: keep News/Weather refreshed automatically
  useEffect(() => {
    if (liveUpdateTimerRef.current) {
      window.clearInterval(liveUpdateTimerRef.current);
      liveUpdateTimerRef.current = null;
    }

    const url = activeState.url;
    if (url !== 'ww://news' && url !== 'ww://weather') return;

    // Refresh interval (ms)
    const intervalMs = 60_000; // 1 minute

    liveUpdateTimerRef.current = window.setInterval(() => {
      // Only refresh if user is still on the live portal
      const t = tabs.find(t => t.id === activeTabId);
      const s = t?.history[t?.historyIndex ?? 0];
      if (!s) return;
      if (s.url === 'ww://news') handleSearch('ww://news', false);
      if (s.url === 'ww://weather') handleSearch('ww://weather', false);
    }, intervalMs);

    return () => {
      if (liveUpdateTimerRef.current) {
        window.clearInterval(liveUpdateTimerRef.current);
        liveUpdateTimerRef.current = null;
      }
    };
  }, [activeTabId, activeState.url, language, geo, tabs]);

  // Handle messages from the proxy iframe (site-to-site navigation and downloads)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'WW_NAVIGATE') {
        handleSearch(event.data.url);
      }
      if (event.data.type === 'WW_DOWNLOAD') {
        setDownloading(event.data.url);
        setTimeout(() => setDownloading(null), 3000);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeTabId]);

  const isUrl = (str: string) => {
    try {
      const url = new URL(str.startsWith('http') ? str : `https://${str}`);
      return url.hostname.includes('.');
    } catch {
      return false;
    }
  };

  const fetchImageResults = async (queryText: string): Promise<ImageResult[]> => {
    try {
      const response = await fetch(`/api/image-search?q=${encodeURIComponent(queryText)}`);
      if (!response.ok) return [];
      const payload = await response.json();
      return Array.isArray(payload.images) ? payload.images : [];
    } catch (error) {
      console.error('Image search failed', error);
      return [];
    }
  };

  const fetchSiteSources = async (queryText: string): Promise<SearchSource[]> => {
    try {
      const response = await fetch(`/api/site-search?q=${encodeURIComponent(queryText)}`);
      if (!response.ok) return [];
      const payload = await response.json();
      return Array.isArray(payload.sources) ? payload.sources : [];
    } catch (error) {
      console.error('Site search failed', error);
      return [];
    }
  };

  const fetchShopResults = async (queryText: string): Promise<ShopResult[]> => {
    try {
      const response = await fetch(`/api/shop-search?q=${encodeURIComponent(queryText)}&currency=${encodeURIComponent(currencyCode)}`);
      if (!response.ok) return [];
      const payload = await response.json();
      return Array.isArray(payload.products) ? payload.products : [];
    } catch (error) {
      console.error('Shop search failed', error);
      return [];
    }
  };

  const isBlockedTarget = (target: string) => {
    if (!isUrl(target)) return false;
    try {
      const normalized = target.startsWith('http') ? target : `https://${target}`;
      const hostname = new URL(normalized).hostname.toLowerCase();
      return blockedDomains.some((blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`));
    } catch {
      return false;
    }
  };

  const handleSearch = async (query: string = input, forceNewTab: boolean = false) => {
    if (!query.trim()) return;
    setLocationBlocked(false);
    setBlockedReason('');
    setActiveContentTab('all');
    setVisibleSourceCount(8);

    // Fast normalization
    let normalizedQuery = query.trim();
    if (normalizedQuery.startsWith('ww//:')) {
      normalizedQuery = normalizedQuery.replace('ww//:', 'ww://');
    }

    let targetUrl = normalizedQuery;
    const looksLikeUrl = isUrl(normalizedQuery);

    if (looksLikeUrl && !normalizedQuery.startsWith('http') && !normalizedQuery.startsWith('ww://')) {
      targetUrl = `https://${normalizedQuery}`;
    }
    if (!looksLikeUrl && !normalizedQuery.startsWith('ww://')) {
      try {
        const resolved = await fetch(`/api/flash/resolve?q=${encodeURIComponent(normalizedQuery)}`).then(r => r.json());
        if (resolved?.direct && resolved?.url) {
          targetUrl = resolved.url;
        }
      } catch {
        // fall back to standard flow
      }
    }

    if (looksLikeUrl && isBlockedTarget(targetUrl)) {
      setLocationBlocked(true);
      setBlockedReason(language === 'tr' ? 'Site bölgenizde kullanılamaz' : 'This site is not available in your region.');
      return;
    }

    // New tab logic
    const isHome = activeState.url === 'ww://home' || activeState.url === 'ww://new-tab';
    const isImagesScheme = normalizedQuery.startsWith('ww://images');
    const imageSchemeQuery = isImagesScheme ? (normalizedQuery.split('?q=')[1] || '').trim() : '';
    const newUrl = looksLikeUrl
      ? targetUrl
      : isImagesScheme
        ? `ww://images?q=${encodeURIComponent(imageSchemeQuery || '')}`
        : `ww://search?q=${encodeURIComponent(normalizedQuery)}`;
    const newTitle = normalizedQuery.length > 20 ? normalizedQuery.slice(0, 17) + '...' : normalizedQuery;

    setInput('');
    setIsRefreshing(true);
    setIsExpanded(false);

    // Initial state with a "Synthesizing" placeholder to allow immediate transition
    const pendingState: TabState = {
      url: newUrl,
      title: newTitle,
      content: language === 'tr' ? '_Sinyal okunuyor, nöral ağlar sentezleniyor..._' : '_Reading signal, synthesizing neural networks..._',
      sources: [],
      recommendations: []
    };

    let targetTabId = activeTabId;

    if (forceNewTab || isHome) {
      const newId = Date.now().toString();
      targetTabId = newId;
      setTabs(prev => [...prev, { 
        id: newId, 
        loading: true, 
        chat: [], 
        history: [pendingState], 
        historyIndex: 0 
      }]);
      setActiveTabId(newId);
    } else {
      setTabs(prev => prev.map(t => 
        t.id === activeTabId 
          ? { 
              ...t, 
              loading: true, 
              history: [...t.history.slice(0, t.historyIndex + 1), pendingState],
              historyIndex: t.history.slice(0, t.historyIndex + 1).length
            } 
          : t
      ));
    }

    const timeout = setTimeout(() => {
      setTabs(prev => prev.map(t => t.id === targetTabId ? { ...t, loading: false } : t));
      setIsRefreshing(false);
    }, 45000); // 45 seconds timeout

    // Phase Switcher for perceived speed
    let phase = 0;
    const phases = language === 'tr' 
      ? ['Sinyal Yakalanıyor...', 'Web Katmanları Taranıyor...', 'Veri Sentezleniyor...', 'Görseller Hazırlanıyor...']
      : ['Capturing Signal...', 'Scanning Web Layers...', 'Synthesizing Data...', 'Preparing Visuals...'];
    
    const phaseInterval = setInterval(() => {
      phase = (phase + 1) % phases.length;
      setTabs(prev => prev.map(t => 
        t.id === targetTabId && t.loading && t.history[t.historyIndex]?.content?.startsWith('_')
          ? { 
              ...t, 
              history: t.history.map((h, i) => i === t.historyIndex ? { ...h, content: `_${phases[phase]}_` } : h)
            } 
          : t
      ));
    }, 2500);
    const langLabel = LANGUAGES.find(l => l.code === language)?.label || 'Turkish';
    
    // WW-BrowserAi synthesis (Gemini removed; no API key)
    const runSynthesis = async (searchQuery: string, customPrompt?: string) => {
      const inputText = customPrompt ? `${customPrompt}\n\nQUERY: ${searchQuery}` : searchQuery;
      const result = await wwBrowserAi("synthesize", {
        input: inputText,
        context: activeState.content,
        language,
      });

      // Keep the existing shape expected by the UI
      const extractedSynthesis = (result.text ?? "").trim();
      const data = { sources: [], recommendations: [] as string[] };

      setTabs(prev => prev.map(t => {
        if (t.id === targetTabId) {
          const newHistory = [...t.history];
          newHistory[t.historyIndex] = { ...newHistory[t.historyIndex], content: extractedSynthesis };
          return { ...t, history: newHistory };
        }
        return t;
      }));

      return { extractedSynthesis, data };
    };

    try {
      let newState: TabState;

      if (looksLikeUrl && !targetUrl.startsWith('ww://')) {
        clearInterval(phaseInterval);
        const response = await fetch(`/api/flash/fetch?url=${encodeURIComponent(targetUrl)}`);
        const htmlContent = await response.text();
        const domain = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`).hostname;
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        
        newState = { 
          url: targetUrl, 
          title: newTitle, 
          content: '', 
          html: htmlContent, 
          favicon: faviconUrl,
          sources: [], 
          recommendations: [] 
        };
      } else if (targetUrl === 'ww://license') {
        clearInterval(phaseInterval);
        const licenseText = await fetch('/api/license').then(r => r.text());
        newState = {
          url: 'ww://license',
          title: 'License',
          content: `# LICENSE (GPL-3.0)\n\n\`\`\`\n${licenseText}\n\`\`\``,
          sources: [],
          recommendations: [],
        };
      } else if (targetUrl === 'ww://wwforcoders') {
        clearInterval(phaseInterval);
        newState = {
          url: 'ww://wwforcoders',
          title: 'WWForCoders',
          content: language === 'tr'
            ? `# WW For Coders\n\nVS Code tabanli kodlama alani.\n\n- Kisa yol: \`F12\` (WW Element Inspector)\n- URL acici: WW-FlashServer\n- Hedef URL: \`ww://wwforcoders\`\n\n## Baslangic\n- Proje dosyalarini soldan ac\n- Kod degisikligi yap\n- Sonra WW ile test et\n\n\`\`\`ts\nfunction helloWW() {\n  return "WW for Coders hazir!";\n}\n\`\`\``
            : `# WW For Coders\n\nVS Code-like coding area.\n\n- Shortcut: \`F12\` (WW Element Inspector)\n- URL opener: WW-FlashServer\n- Target URL: \`ww://wwforcoders\`\n\n## Getting Started\n- Open project files\n- Edit code\n- Test with WW\n\n\`\`\`ts\nfunction helloWW() {\n  return "WW for Coders is ready!";\n}\n\`\`\``,
          sources: [],
          recommendations: ['ww://navis', 'ww://news', 'ww://weather']
        };
      } else if (targetUrl === 'ww://navis') {
        clearInterval(phaseInterval);
        newState = {
          url: 'ww://navis',
          title: 'Navis',
          content: language === 'tr'
            ? `# NAVIS / WW Information\n\nWW hakkinda bilgi ve ipuclari:\n\n- WW-FlashServer ile hizli URL acma\n- Sentez + Web + Gorseller + Alisveris sekmeleri\n- Bolgesel guvenlik kontrolleri\n- Dil secimi ile arayuzu aninda degistirme\n\n## Ipuclari\n1. Adres cubuguna \`ww://images?q=...\` yaz.\n2. Kodlama alani icin \`ww://wwforcoders\` ac.\n3. Guvenlik analizi ciktiginda 'Yine de Gir' secenegi kullan.\n4. Sonuclarda 'Daha fazla site gor' ile kapsami genislet.\n`
            : `# NAVIS / WW Information\n\nWW tips and information:\n\n- Fast URL opening with WW-FlashServer\n- Synthesis + Web + Images + Shopping tabs\n- Regional security checks\n- Instant UI language switching\n\n## Tips\n1. Use \`ww://images?q=...\` in the address bar.\n2. Open \`ww://wwforcoders\` for coding mode.\n3. Use 'Enter anyway' when security analysis prompts.\n4. Expand coverage with 'See more sites'.\n`,
          sources: [],
          recommendations: ['ww://wwforcoders', 'ww://images?q=ww browser', 'ww://license']
        };
      } else if (targetUrl === 'ww://news') {
        const now = new Date();
        const clock = now.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US');
        const geoText = geo
          ? `Lat/Lon: ${geo.lat.toFixed(5)}, ${geo.lon.toFixed(5)} (±${Math.round(geo.accuracy ?? 0)}m)`
          : 'Location: unavailable';

        const { extractedSynthesis, data } = await runSynthesis('news', `WW-BrowserAi / News Engine
CURRENT TIME: ${clock}
${geoText}
Country Rules: Use location context for local relevance/safety.

PROMPT (TR):
son dakika dünya ve üke için önemli haberler

FORMAT:
- Start with (LIVE)
- Bölümler: Dünya / Ülke
- Her madde: Başlık + 1-2 cümle özet + önem (Düşük/Orta/Yüksek)

[METADATA_START]
{ "sources": [], "recommendations": ["Dünya", "Ülke"] }`);
        newState = { url: 'ww://news', title: language === 'tr' ? 'Haberler' : 'News', content: extractedSynthesis.trim(), sources: data.sources || [], recommendations: data.recommendations || [] };
      } else if (targetUrl === 'ww://weather') {
        const now = new Date();
        const clock = now.toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US');
        const geoText = geo
          ? `Lat/Lon: ${geo.lat.toFixed(5)}, ${geo.lon.toFixed(5)} (±${Math.round(geo.accuracy ?? 0)}m)`
          : 'Location: unavailable';

        const { extractedSynthesis, data } = await runSynthesis('weather', `WW-BrowserAi / Weather Engine
CURRENT TIME: ${clock}
${geoText}
Country Rules: Use location context for local relevance/safety.

PROMPT (TR):
önümüzdeki 1 hafta ve bu haftanın tüm günleri için hava durumları

FORMAT:
- Start with (LIVE)
- 7 günlük liste (gün adı: min/max, yağış, rüzgar, uyarı)
- Kısa öneri ekle

[METADATA_START]
{ "sources": [], "recommendations": ["Haftalık", "Yağış", "Rüzgar", "Uyarılar"] }`);
        newState = { url: 'ww://weather', title: language === 'tr' ? 'Hava Durumu' : 'Weather', content: extractedSynthesis.trim(), sources: data.sources || [], recommendations: data.recommendations || [] };
      } else {
        const searchText = targetUrl.startsWith('ww://search') || targetUrl.startsWith('ww://images')
          ? new URL(newUrl.replace('ww://', 'https://')).searchParams.get('q') || query
          : query;
        const [synthesisResult, imageResults, sourcePool, shopResults] = await Promise.all([
          runSynthesis(searchText),
          fetchImageResults(searchText),
          fetchSiteSources(searchText),
          fetchShopResults(searchText)
        ]);
        const { extractedSynthesis, data } = synthesisResult;
        newState = {
          url: newUrl,
          title: newTitle,
          content: extractedSynthesis.trim(),
          sources: sourcePool.slice(0, 8),
          sourcePool,
          recommendations: data.recommendations || [],
          imageResults,
          shopResults,
          visuals: data.visuals?.map((v: any) => ({
            ...v,
            url: v.type === 'image' && v.url?.includes('{seed}') ? v.url.replace('{seed}', Math.random().toString(36).substring(7)) : v.url
          }))
        };
        addMessage('assistant', language === 'tr' ? `"${query}" için sonuçları sentezledim.` : `I've synthesized findings for "${query}".`);
      }

      clearInterval(phaseInterval);
      setTabs(prev => prev.map(t => {
        if (t.id === targetTabId) {
          const newHistory = [...t.history];
          const index = t.history.length - 1; // It was appended to the end or it's a new tab
          newHistory[index] = newState; 
          return { ...t, loading: false, history: newHistory };
        }
        return t;
      }));
    } catch (error: any) {
      clearInterval(phaseInterval);
      console.error("Search failed:", error);
      const isQuotaError = error.message?.toLowerCase().includes('quota') || error.toString().toLowerCase().includes('quota');
      
      if (isQuotaError) {
        try {
          let fallbackUrl = '';
          let fallbackTitle = '';
          
          if (targetUrl === 'ww://news') {
            fallbackUrl = language === 'tr' ? 'https://www.trthaber.com/' : 'https://www.google.com/search?q=latest+world+news&tbm=nws';
            fallbackTitle = language === 'tr' ? 'Canlı Haberler (Klasik)' : 'Live News (Classic)';
          } else if (targetUrl === 'ww://weather') {
            fallbackUrl = 'https://www.accuweather.com/';
            fallbackTitle = language === 'tr' ? 'Canlı Hava Durumu (Klasik)' : 'Live Weather (Classic)';
          } else {
            const finalQuery = targetUrl.startsWith('ww://search') 
              ? new URL(newUrl.replace('ww://', 'https://')).searchParams.get('q') || query 
              : query;
            fallbackUrl = `https://www.bing.com/search?q=${encodeURIComponent(finalQuery)}`;
            fallbackTitle = (language === 'tr' ? 'Web Araması: ' : 'Web Search: ') + finalQuery;
          }

          const response = await fetch(`/api/flash/fetch?url=${encodeURIComponent(fallbackUrl)}`);
          const htmlContent = await response.text();
          
          setTabs(prev => prev.map(t => {
            if (t.id === targetTabId) {
              const newHistory = [...t.history];
              const index = t.history.length - 1;
              newHistory[index] = { 
                url: fallbackUrl, 
                title: fallbackTitle, 
                content: language === 'tr' 
                  ? "# ⚠️ AI Kotası Dolu\nOtomatik olarak klasik web görünümüne geçildi. AI sentezi şu an için devre dışı." 
                  : "# ⚠️ AI Quota Reached\nAutomatically switched to classic web view. AI synthesis is temporarily disabled.",
                html: htmlContent, 
                sources: [], 
                recommendations: [] 
              }; 
              return { ...t, loading: false, history: newHistory };
            }
            return t;
          }));
          return;
        } catch (fallbackError) {
          console.error("Fallback failed:", fallbackError);
        }
      }

      setTabs(prev => prev.map(t => {
        if (t.id === targetTabId) {
          const newHistory = [...t.history];
          const index = t.history.length - 1;
          newHistory[index] = { 
            ...newHistory[index], 
            content: isQuotaError
              ? (language === 'tr' 
                  ? "# ⚠️ WW-BrowserAi geçici olarak yoğun\n\nSentez motoru şu anda yoğun veya bağlantı kurulamadı.\n\n### Ne yapabilirsiniz?\n1. **Tekrar deneyin:** Kısa süreli yoğunluk olabilir.\n2. **Sunucuyu kontrol edin:** `/api/ai` endpoint’i çalışıyor mu?\n\n---\n*WW portalı bir sonraki isteğiniz için hazır.*" 
                  : "# ⚠️ WW-BrowserAi temporarily busy\n\nThe synthesis engine is busy or unreachable.\n\n### What can you do?\n1. **Retry:** This may be temporary.\n2. **Check the server:** Is the `/api/ai` endpoint running?\n\n---\n*WW portal is ready for your next request.*")
              : (language === 'tr' ? "Sinyal okuma hatası. Lütfen bağlantıyı kontrol edin." : "Signal reading error. Please check connectivity.") 
          };
          return { ...t, loading: false, history: newHistory };
        }
        return t;
      }));
    } finally {
      clearTimeout(timeout);
      setIsRefreshing(false);
    }
  };

  const handleTranslate = async (targetLang: string) => {
    const activeState = activeTab.history[activeTab.historyIndex];
    if (!activeState.content && !activeState.html) return;
    
    // Restore original functionality
    if (targetLang === 'ORIGINAL') {
      if (!activeState.originalContent && !activeState.originalHtml) return;
      setTabs(prev => prev.map(t => {
        if (t.id === activeTabId) {
          const newHistory = [...t.history];
          const currentState = { ...newHistory[t.historyIndex] };
          if (currentState.originalHtml) currentState.html = currentState.originalHtml;
          if (currentState.originalContent) currentState.content = currentState.originalContent;
          newHistory[t.historyIndex] = currentState;
          return { ...t, history: newHistory };
        }
        return t;
      }));
      setShowTranslate(false);
      return;
    }

    setShowTranslate(false);
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, loading: true } : t));
    
    try {
      const isHtml = !!activeState.html;
      
      // Store original content before first translation
      const baseHtml = activeState.originalHtml || activeState.html;
      const baseContent = activeState.originalContent || activeState.content;

      const translateInput = isHtml
        ? `Translate this HTML into ${targetLang}. Return RAW HTML ONLY. Preserve links, forms, and script tags.\n\n${baseHtml?.slice(0, 60000) ?? ""}`
        : `Translate this text into ${targetLang}. Keep Markdown, headings, lists, and links intact.\n\n${baseContent?.slice(0, 30000) ?? ""}`;

      let response = await wwBrowserAi("translate", {
        input: translateInput,
        context: baseContent,
        language,
        targetLang,
      });
      if (!response.text || response.text.trim().length < 20) {
        response = await wwBrowserAi("translate", {
          input: `Second attempt: strict translation to ${targetLang}. Return full content only.\n\n${translateInput}`,
          context: baseContent,
          language,
          targetLang,
        });
      }
      
      let translated = response.text?.trim();
      if (translated && translated.startsWith('```')) {
        translated = translated.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();
      }
      
      if (!translated || translated.length < 10) {
         throw new Error("Empty translation");
      }

      setTabs(prev => prev.map(t => {
        if (t.id === activeTabId) {
          const newHistory = [...t.history];
          const currentState = { ...newHistory[t.historyIndex] };
          
          if (!currentState.originalHtml && currentState.html) currentState.originalHtml = currentState.html;
          if (!currentState.originalContent && currentState.content) currentState.originalContent = currentState.content;
          
          if (isHtml) {
            currentState.html = translated;
            currentState.translationKey = Date.now(); // Force iframe refresh
          } else {
            currentState.content = translated;
          }
          
          newHistory[t.historyIndex] = currentState;
          return { ...t, loading: false, history: newHistory };
        }
        return t;
      }));
    } catch (e) {
      console.error("Translation failed:", e);
      addMessage('assistant', language === 'tr' ? "Sayfa çevrilemedi. Lütfen tekrar deneyin." : "Failed to translate page. Please try again.");
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, loading: false } : t));
    }
  };

  const detectLanguage = async () => {
    const activeState = activeTab.history[activeTab.historyIndex];
    if (!activeState.content && !activeState.html) return;
    setIsDetecting(true);
    try {
      const snippet = activeState.content?.slice(0, 1000) || activeState.html?.slice(0, 2000) || "";
      const result = await wwBrowserAi("detectLanguage", {
        input: `Detect the language. Return ONLY the language name in English.\n\n${snippet}`,
        context: snippet,
        language,
      });
      setDetectedLanguage(result.text?.trim() || "Unknown");
    } catch (e) {
      setDetectedLanguage("Unknown");
    } finally {
      setIsDetecting(false);
    }
  };

  useEffect(() => {
    if (showTranslate && !detectedLanguage && !isDetecting) {
      detectLanguage();
    }
  }, [showTranslate]);

  const goBack = () => {
    setTabs(prev => prev.map(t => {
      if (t.id === activeTabId && t.historyIndex > 0) {
        return { ...t, historyIndex: t.historyIndex - 1 };
      }
      return t;
    }));
  };

  const goForward = () => {
    setTabs(prev => prev.map(t => {
      if (t.id === activeTabId && t.historyIndex < t.history.length - 1) {
        return { ...t, historyIndex: t.historyIndex + 1 };
      }
      return t;
    }));
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setTabs(prev => prev.map(t => 
      t.id === activeTabId ? { ...t, chat: [...t.chat, { role, content }] } : t
    ));
  };

  const generateMedia = async (type: "image" | "video") => {
    const promptText = prompt(type === "image"
      ? (language === "tr" ? "Resim için prompt:" : "Image prompt:")
      : (language === "tr" ? "Video için prompt:" : "Video prompt:"));
    if (!promptText) return;

    try {
      const result = await wwBrowserAi("generateMedia", {
        input: "",
        language,
        type,
        prompt: promptText,
      });

      const visuals = result.visuals ?? [];
      if (!visuals.length) return;

      setTabs(prev => prev.map(t => {
        if (t.id !== activeTabId) return t;
        const newHistory = [...t.history];
        const idx = t.historyIndex;
        const curr = { ...newHistory[idx] };
        curr.visuals = [...(curr.visuals ?? []), ...visuals];
        newHistory[idx] = curr;
        return { ...t, history: newHistory };
      }));
    } catch (e) {
      addMessage('assistant', language === 'tr'
        ? "Medya üretimi başarısız. `/api/ai` çalışıyor mu kontrol edin."
        : "Media generation failed. Check if `/api/ai` is running.");
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    addMessage('user', userMsg);

    const langLabel = LANGUAGES.find(l => l.code === language)?.label || 'Turkish';
    try {
      const result = await wwBrowserAi("chat", {
        input: `Respond in ${langLabel}.\n\nContext from active page:\n${activeState.content}\n\nUser Question:\n${userMsg}`,
        context: activeState.content,
        language,
      });
      addMessage('assistant', result.text || (language === 'tr' ? "Yanıt üretilemedi." : "I couldn't generate a response."));
    } catch (error: any) {
      console.error("Chat error:", error);
      addMessage('assistant', language === 'tr' 
        ? "Chat motoru hatası. `/api/ai` çalışıyor mu kontrol edin." 
        : "Chat engine error. Check if `/api/ai` is running.");
    }
  };

  const createTab = () => {
    const id = Date.now().toString();
    setTabs(prev => [...prev, { 
      id, 
      loading: false, 
      chat: [], 
      history: [{ url: 'ww://new-tab', title: 'New Tab', content: '', sources: [], recommendations: [] }], 
      historyIndex: 0 
    }]);
    setActiveTabId(id);
    setInput('');
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) setActiveTabId(newTabs[newTabs.length - 1].id);
  };

  return (
    <div 
      className="flex flex-col h-screen bg-background text-text-primary overflow-hidden font-sans relative"
      style={{ 
        '--color-accent-blue': accentColor,
        '--glass-intensity': `${glassIntensity}px`
      } as any}
    >
      {/* Download Alert */}
      <AnimatePresence>
        {downloading && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-[100] bg-accent-blue text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/20"
          >
            <Download size={18} className="animate-bounce" />
            <span className="text-sm font-bold">WW Engine: Download Initiated ({downloading.slice(0, 30)}...)</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Tab Bar */}
      <div className="flex items-center gap-1 px-3 pt-2 bg-[#121212] border-b border-border-dark">
        <div className="relative mr-2">
          <button 
            onClick={() => { setShowTranslate(!showTranslate); setDetectedLanguage(null); }}
            className="flex items-center gap-2 px-3 py-1 rounded hover:bg-surface-high transition-all text-accent-blue group"
          >
            <Languages size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-white">Translate</span>
          </button>
          
          <AnimatePresence>
            {showTranslate && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="absolute left-0 top-10 bg-surface-high border border-border-dark rounded-2xl p-6 w-[320px] z-[100] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t border-t-white/10"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-accent-blue tracking-[0.2em]">{language === 'tr' ? 'SAYFA TERCÜMANI' : 'PAGE TRANSLATOR'}</span>
                    <X size={14} className="cursor-pointer hover:text-white" onClick={() => setShowTranslate(false)} />
                  </div>

                  <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-text-dim uppercase">{language === 'tr' ? 'ALGILANAN' : 'DETECTED'}</span>
                      <span className="text-xs font-bold">{isDetecting ? '...' : (detectedLanguage || 'Detecting...')}</span>
                    </div>
                    <ChevronRight size={14} className="text-text-dim" />
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[9px] text-text-dim uppercase">{language === 'tr' ? 'HEDEF' : 'TARGET'}</span>
                      <select 
                        className="bg-transparent border-none text-xs font-bold text-accent-blue outline-none cursor-pointer"
                        value={targetTranslateLang}
                        onChange={(e) => setTargetTranslateLang(e.target.value)}
                      >
                        {LANGUAGES.map(l => (
                          <option key={l.code} value={l.label} className="bg-surface-high">{l.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <p className="text-[10px] text-text-muted leading-relaxed">
                    {language === 'tr' 
                      ? `Bu web sayfası ${detectedLanguage || '...'} dilinden ${targetTranslateLang} diline çevirilsin mi?`
                      : `Should this page be translated from ${detectedLanguage || '...'} to ${targetTranslateLang}?`}
                  </p>

                  <button 
                    onClick={() => handleTranslate(targetTranslateLang)}
                    disabled={isDetecting || !detectedLanguage}
                    className="w-full py-3 rounded-xl bg-accent-blue text-dark font-bold text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                  >
                    <Sparkles size={14} className="group-hover:animate-pulse" />
                    {language === 'tr' ? 'ŞİMDİ ÇEVİR' : 'TRANSLATE NOW'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="popLayout">
          {tabs.map(tab => (
            <motion.div
              key={tab.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              onClick={() => setActiveTabId(tab.id)}
              className={`
                relative flex items-center gap-2 px-6 py-2 rounded-t-lg text-xs cursor-pointer select-none border-t border-x transition-colors
                ${activeTabId === tab.id 
                  ? 'bg-surface-active text-white border-border-mid z-10' 
                  : 'bg-surface-high text-text-dim border-transparent hover:bg-surface-active/50'}
              `}
            >
              {tab.history[tab.historyIndex].favicon ? (
                <img 
                  src={tab.history[tab.historyIndex].favicon} 
                  alt="favicon" 
                  className="w-3.5 h-3.5 rounded-sm object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Globe size={12} className={activeTabId === tab.id ? 'text-accent-blue' : 'text-text-dim'} />
              )}
              <span className="max-w-[120px] truncate">{tab.history[tab.historyIndex].title}</span>
              <X 
                size={12} 
                className="hover:text-white transition-opacity opacity-40 hover:opacity-100 ml-1" 
                onClick={(e) => closeTab(tab.id, e)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        <button 
          onClick={createTab}
          className="p-1 px-2 mb-1 rounded hover:bg-surface-high text-text-muted transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* 2. Browser Chrome */}
      <div className="flex items-center gap-4 bg-surface-mid border-b border-border-dark py-2 px-4 whitespace-nowrap">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-[0_0_10px_#FF5F5644]" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-[0_0_10px_#FFBD2E44]" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F] shadow-[0_0_10px_#27C93F44]" />
        </div>

        <div className="flex items-center gap-3 text-text-muted">
          <ChevronLeft 
            size={18} 
            className={`cursor-pointer transition-colors ${activeTab.historyIndex > 0 ? 'hover:text-white' : 'opacity-20 cursor-not-allowed'}`} 
            onClick={goBack}
          />
          <ChevronRight 
            size={18} 
            className={`cursor-pointer transition-colors ${activeTab.historyIndex < activeTab.history.length - 1 ? 'hover:text-white' : 'opacity-20 cursor-not-allowed'}`} 
            onClick={goForward}
          />
          <RotateCcw 
            size={16} 
            className={`cursor-pointer hover:text-white ${isRefreshing ? 'animate-spin text-accent-blue' : ''}`} 
            onClick={() => handleSearch(activeState.url)} 
          />
        </div>

        <div className="flex-grow flex items-center bg-surface-high border border-border-mid rounded-full px-4 py-1.5 gap-2 group focus-within:border-accent-blue transition-all">
          <Search size={16} className="text-text-dim" />
          <input
            type="text"
            className="flex-grow bg-transparent border-none outline-none text-sm text-text-muted"
            value={input !== '' ? input : (activeState.url === 'ww://home' ? 'ww://home' : activeState.url)}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Type a URL or search..."
          />
        </div>
        
        <div className="flex items-center gap-3 text-text-muted shrink-0 relative">
          <div className="relative">
            <Languages 
              size={18} 
              className={`cursor-pointer hover:text-white transition-colors ${showLangMenu || showTranslate ? 'text-accent-blue' : ''}`} 
              onClick={() => { setShowLangMenu(!showLangMenu); setShowTranslate(false); setShowExtensions(false); setShowCustomTools(false); }}
            />
            <AnimatePresence>
              {(showLangMenu || showTranslate) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-10 bg-surface-high border border-border-dark rounded-xl py-2 w-48 z-50 shadow-2xl"
                >
                  <div className="px-4 py-2 border-b border-border-dark mb-1 flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">
                      {showTranslate ? (language === 'tr' ? 'SAYFAYI ÇEVİR' : 'TRANSLATE PAGE') : (language === 'tr' ? 'DİL SEÇİMİ' : 'UI LANGUAGE')}
                    </span>
                    <button 
                      onClick={() => setShowTranslate(!showTranslate)}
                      className="text-[9px] text-accent-blue hover:underline"
                    >
                      {showTranslate ? (language === 'tr' ? 'Arayüz' : 'UI') : (language === 'tr' ? 'Çevir' : 'Translate')}
                    </button>
                  </div>
                  {showTranslate && (
                    <button
                      onClick={() => handleTranslate('ORIGINAL')}
                      className="w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-surface-active text-accent-blue font-bold border-b border-border-dark mb-1"
                    >
                      {language === 'tr' ? 'Orijinal Dile Dön' : 'Restore Original'}
                      <RotateCcw size={10} />
                    </button>
                  )}
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { 
                        if (showTranslate) handleTranslate(lang.label);
                        else { setLanguage(lang.code); setShowLangMenu(false); }
                      }}
                      className="w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-surface-active transition-colors"
                    >
                      {lang.label}
                      {!showTranslate && language === lang.code && <Check size={12} className="text-accent-blue" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <Puzzle 
              size={18} 
              className={`cursor-pointer hover:text-white transition-colors ${showExtensions ? 'text-accent-blue' : ''}`} 
              onClick={() => { setShowExtensions(!showExtensions); setShowLangMenu(false); setShowCustomTools(false); setShowDownloads(false); }}
            />
            <AnimatePresence>
              {showExtensions && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-10 bg-surface-high border border-border-dark rounded-xl p-4 w-64 z-50 shadow-2xl"
                >
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent-blue mb-4">Extensions</h4>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1 border-b border-border-dark pb-2 last:border-0 hover:opacity-80 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold">WW Core</span>
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      </div>
                      <p className="text-[9px] text-text-dim">Engine stabilization</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <Download 
              size={18} 
              className={`cursor-pointer hover:text-white transition-colors ${showDownloads ? 'text-accent-blue' : ''}`} 
              onClick={() => { setShowDownloads(!showDownloads); setShowExtensions(false); setShowCustomTools(false); }}
            />
            <AnimatePresence>
              {showDownloads && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-10 bg-surface-high border border-border-dark rounded-xl p-4 w-64 z-50 shadow-2xl"
                >
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent-blue mb-4">{language === 'tr' ? 'İNDİRİLENLER' : 'DOWNLOADS'}</h4>
                  {downloading ? (
                    <div className="p-3 bg-surface-active/20 rounded-lg border border-accent-blue/10">
                      <p className="text-[10px] text-accent-blue animate-pulse">Downloading: {downloading.slice(0, 20)}...</p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-text-dim text-center py-4">{language === 'tr' ? 'Henüz indirme yok' : 'No recent downloads'}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-[1px] h-4 bg-border-dark mx-1" />
          
          <div className="relative">
            <LayoutGrid 
              size={18} 
              className={`cursor-pointer hover:text-white transition-colors ${showCustomTools ? 'text-accent-blue' : ''}`} 
              onClick={() => { setShowCustomTools(!showCustomTools); setShowExtensions(false); setShowLangMenu(false); setShowTranslate(false); }}
            />
            <AnimatePresence>
              {showCustomTools && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-10 bg-surface-high border border-border-dark rounded-xl p-4 w-64 z-50 shadow-2xl"
                >
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent-blue mb-4">Workspace Tools</h4>
                  <div className="space-y-2">
                    {[
                      { icon: <Palette size={14} />, label: language === 'tr' ? 'Özelleştirme' : 'Customization', action: () => { setShowCustomization(true); setShowCustomTools(false); } },
                      { icon: <Code size={14} />, label: language === 'tr' ? 'Elementler' : 'Elements', action: () => { setShowSource(!showSource); setShowCustomTools(false); } },
                      { icon: <ImageIcon size={14} />, label: language === 'tr' ? 'Resim Üret' : 'Generate Image', action: () => { generateMedia("image"); setShowCustomTools(false); } },
                      { icon: <Video size={14} />, label: language === 'tr' ? 'Video Üret' : 'Generate Video', action: () => { generateMedia("video"); setShowCustomTools(false); } },
                      { icon: <Settings size={14} />, label: language === 'tr' ? 'Ayarlar' : 'Settings', action: () => { setShowSettings(true); setShowCustomTools(false); } }
                    ].map((tool, i) => (
                      <button 
                        key={i} 
                        onClick={() => tool.action?.()}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-surface-active text-xs transition-colors"
                      >
                        <span className="text-text-dim">{tool.icon}</span>
                        {tool.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <ShieldAlert size={18} className="cursor-pointer text-accent-blue/50" />
        </div>
      </div>

      {/* 3. Main Container */}
      <div className="flex flex-grow overflow-hidden">
        {/* Content Area */}
        <div className="flex-grow flex flex-col relative content-radial overflow-y-auto custom-scrollbar">
          {/* Top Progress Bar for non-blocking loading */}
          {activeTab.loading && activeState.content && (
            <motion.div 
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 2 }}
              className="absolute top-0 left-0 right-0 h-0.5 bg-accent-blue origin-left z-50"
            />
          )}

          <AnimatePresence mode="popLayout" initial={false}>
            {!activeState.html && activeTab.loading && !activeState.content && activeState.url.startsWith('ww://search') ? (
              <motion.div 
                key="loading-portal"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="flex-grow flex flex-col items-center justify-center bg-black/40 backdrop-blur-md"
              >
                <div className="flex flex-col items-center gap-8 text-center max-w-lg p-16 rounded-[40px] border border-accent-blue/20 bg-surface-high/50 shadow-2xl" style={{ backdropFilter: 'blur(var(--glass-intensity))' }}>
                  <div className="relative">
                    <div className="absolute inset-0 bg-accent-blue/20 blur-3xl rounded-full animate-pulse" />
                    <RotateCcw size={64} className="text-accent-blue animate-spin relative z-10" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold tracking-[0.5em] uppercase text-accent-blue ai-glow">
                      {language === 'tr' ? 'SİNYAL OKUNUYOR' : 'READING SIGNAL'}
                    </h2>
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-[1px] w-8 bg-accent-blue/30" />
                      <p className="text-[10px] text-accent-blue/50 tracking-[0.2em] uppercase font-bold">
                        {language === 'tr' ? 'VERİ AKIŞI ANALİZİ' : 'DATA STREAM ANALYSIS'}
                      </p>
                      <div className="h-[1px] w-8 bg-accent-blue/30" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : activeState.html ? (
              <motion.iframe
                key={`view-${activeState.url}-${activeState.translationKey || 'original'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                title="Browser View"
                srcDoc={activeState.html}
                className="w-full h-full border-none bg-white font-sans"
                sandbox="allow-scripts allow-same-origin"
              />
            ) : locationBlocked ? (
              <motion.div
                key="region-blocked"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-grow flex items-center justify-center p-8"
              >
                <div className="max-w-xl w-full rounded-3xl border border-red-500/40 bg-red-950/20 p-10 text-center">
                  <ShieldAlert size={48} className="mx-auto text-red-400 mb-6" />
                  <h2 className="text-2xl font-bold text-white mb-3">
                    {language === 'tr' ? 'Site bölgenizde kullanılamaz' : 'This site is not available in your region'}
                  </h2>
                  <p className="text-sm text-text-muted">{blockedReason}</p>
                </div>
              </motion.div>
            ) : !activeState.content && activeState.url === 'ww://home' ? (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-grow flex flex-col items-center justify-center p-8"
              >
                <h1 className="hero-logo hero-gradient text-[120px] font-bold tracking-tighter leading-none mb-4 select-none">WW</h1>
                <p className="text-text-dim text-lg max-w-md text-center font-light brightness-75 mb-12">
                  {language === 'tr' ? 'İlk yapay zeka tabanlı tarayıcı deneyimi. Bir URL girin veya sentez için arama yapın.' : 'The first AI-native browsing experience. Enter a URL to view or a query to synthesize.'}
                </p>

                {/* Shortcuts Grid */}
                <div className="flex flex-wrap items-center justify-center gap-6 mb-12 max-w-3xl">
                  {shortcuts.map((shortcut, i) => (
                    <button 
                      key={i}
                      onClick={() => handleSearch(shortcut.url)}
                      className="group flex flex-col items-center gap-3 p-4 px-6 rounded-3xl bg-surface-high/50 border border-border-dark hover:border-accent-blue/50 hover:bg-accent-blue/5 transition-all duration-300"
                    >
                      <div className="p-4 rounded-2xl bg-surface-high border border-border-dark group-hover:scale-110 transition-transform group-hover:text-accent-blue">
                        {shortcut.icon === 'Newspaper' ? (
                          <Newspaper size={32} />
                        ) : shortcut.icon === 'CloudSun' ? (
                          <CloudSun size={32} />
                        ) : shortcut.icon === 'Code' ? (
                          <Code size={32} />
                        ) : shortcut.icon === 'Info' ? (
                          <Info size={32} />
                        ) : shortcut.icon === 'ShieldAlert' ? (
                          <ShieldAlert size={32} />
                        ) : (
                          <Globe size={32} />
                        )}
                      </div>
                      <span className="text-xs font-bold text-text-dim group-hover:text-white transition-colors">{shortcut.label}</span>
                    </button>
                  ))}
                  <button 
                    onClick={() => {
                      const url = prompt(language === 'tr' ? 'Kısayol URL:' : 'Shortcut URL:');
                      const label = prompt(language === 'tr' ? 'Etiket:' : 'Label:');
                      if (url && label) {
                        setShortcuts(prev => [...prev, { url, label, icon: 'Globe' }]);
                      }
                    }}
                    className="flex flex-col items-center gap-3 p-4 px-6 rounded-3xl border border-dashed border-border-dark hover:border-accent-blue/30 transition-all opacity-40 hover:opacity-100"
                  >
                    <div className="p-4 rounded-2xl bg-surface-low border border-border-dark">
                      <Plus size={32} />
                    </div>
                    <span className="text-xs font-bold">{language === 'tr' ? 'Ekle' : 'Add'}</span>
                  </button>
                </div>

                {/* Clock & Date */}
                <div className="flex flex-col items-center gap-2 mb-12 py-4 px-8 rounded-full bg-surface-high/20 border border-border-dark/30 backdrop-blur-md">
                  <div className="text-4xl font-mono font-bold tracking-widest text-white/90">
                    {currentTime.toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.4em] text-accent-blue font-bold">
                    {currentTime.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-10">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-text-dim">
                    {language === 'tr' ? 'Uygulama Dili' : 'App Language'}
                  </span>
                  <select
                    className="bg-surface-high border border-border-dark rounded-lg px-3 py-2 text-xs text-white outline-none"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code} className="bg-surface-high">
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-6 mt-16 max-w-2xl w-full">
                  {[
                    { icon: <Zap size={24} />, label: language === 'tr' ? "Anında Özet" : "Instant Summary", desc: "Binary decomposition of the web" },
                    { icon: <ShieldAlert size={24} />, label: language === 'tr' ? "Gizlilik Koruması" : "Privacy Guard", desc: "No tracker leaks allowed" },
                    { icon: <BrainCircuit size={24} />, label: language === 'tr' ? "Bağlam Senkronizasyonu" : "Context Sync", desc: "Intelligence in every pixel" }
                  ].map((feature, i) => (
                    <div key={i} className="flex flex-col items-center text-center gap-3">
                      <div className="p-4 rounded-2xl bg-surface-high border border-border-dark text-accent-blue">{feature.icon}</div>
                      <h4 className="text-xs font-bold uppercase tracking-widest">{feature.label}</h4>
                      <p className="text-[10px] text-text-dim leading-relaxed">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key={`results-${activeState.url}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-4xl mx-auto w-full p-12 py-16 overflow-y-auto custom-scrollbar"
              >
                <div className="prose prose-invert max-w-none">
                  <div className="flex items-center gap-6 mb-12">
                    <div className="hero-logo hero-gradient text-4xl font-bold tracking-tighter select-none">WW</div>
                    <div className="flex-grow relative group max-w-xl">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={18} />
                      <input
                        type="text"
                        className="w-full bg-surface-high border border-border-mid rounded-xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-accent-blue transition-all"
                        placeholder={language === 'tr' ? "WW'ye bu sonuç hakkında soru sor..." : "Ask WW about this result..."}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-10 text-accent-blue">
                    <Search size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{language === 'tr' ? 'Sentezlenmiş Zeka Motoru' : 'Synthesized Intelligence Engine'}</span>
                  </div>

                  <div className="mb-10 flex items-center gap-3">
                    <button
                      onClick={() => setActiveContentTab('all')}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all ${activeContentTab === 'all' ? 'bg-accent-blue text-black border-accent-blue' : 'bg-surface-low text-text-muted border-border-dark hover:border-accent-blue/50'}`}
                    >
                      {language === 'tr' ? 'Tümü' : 'All'}
                    </button>
                    <button
                      onClick={() => setActiveContentTab('images')}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all ${activeContentTab === 'images' ? 'bg-accent-blue text-black border-accent-blue' : 'bg-surface-low text-text-muted border-border-dark hover:border-accent-blue/50'}`}
                    >
                      {language === 'tr' ? 'Görseller' : 'Images'}
                    </button>
                    <button
                      onClick={() => setActiveContentTab('shopping')}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all ${activeContentTab === 'shopping' ? 'bg-accent-blue text-black border-accent-blue' : 'bg-surface-low text-text-muted border-border-dark hover:border-accent-blue/50'}`}
                    >
                      {language === 'tr' ? 'Alışveriş' : 'Shopping'}
                    </button>
                    <span className="text-[10px] uppercase tracking-widest text-accent-blue/80">
                      WW-FlashServer
                    </span>
                  </div>

                  {/* AI Results Layout */}
                  <div className="space-y-16">
                    {activeContentTab === 'images' ? (
                      <section>
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-8 flex items-center gap-3 text-white">
                          <ImageIcon size={20} className="text-accent-blue" />
                          {language === 'tr' ? 'ARAMAYA GÖRE GÖRSELLER' : 'IMAGES FOR YOUR QUERY'}
                        </h3>
                        <div className="grid gap-6 md:grid-cols-3">
                          {(activeState.imageResults ?? []).map((image) => (
                            <div key={image.id} className="rounded-3xl border border-border-dark bg-surface-low p-4 flex flex-col gap-3">
                              <button
                                onClick={() => handleSearch(image.sourceUrl)}
                                className="group"
                              >
                                <img src={image.imageUrl} alt={image.title} className="w-full h-44 object-cover rounded-2xl border border-border-dark group-hover:opacity-90 transition-opacity" loading="lazy" referrerPolicy="no-referrer" />
                              </button>
                              <p className="text-xs text-text-muted line-clamp-2">{image.title}</p>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSearch(image.sourceUrl)}
                                  className="flex-1 px-3 py-2 rounded-xl border border-border-dark bg-surface-high text-[11px] font-bold hover:border-accent-blue"
                                >
                                  {language === 'tr' ? 'Siteye Git' : 'Go to Site'}
                                </button>
                                <button
                                  onClick={() => alert(image.description || (language === 'tr' ? 'Bu görsel için açıklama bulunamadı.' : 'No description available for this image.'))}
                                  className="flex-1 px-3 py-2 rounded-xl border border-border-dark bg-surface-high text-[11px] font-bold hover:border-accent-blue"
                                >
                                  {language === 'tr' ? 'Görsel Hakkında' : 'About Image'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {(activeState.imageResults ?? []).length === 0 && (
                          <p className="text-sm text-text-dim">
                            {language === 'tr' ? 'Bu arama için görsel bulunamadı.' : 'No images found for this query.'}
                          </p>
                        )}
                      </section>
                    ) : activeContentTab === 'shopping' ? (
                      <section>
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-8 flex items-center gap-3 text-white">
                          <Globe size={20} className="text-accent-blue" />
                          {language === 'tr' ? 'ALIŞVERİŞ SONUÇLARI' : 'SHOPPING RESULTS'}
                        </h3>
                        <div className="grid gap-6 md:grid-cols-2">
                          {(activeState.shopResults ?? []).map((p) => (
                            <div key={p.id} className="rounded-3xl border border-border-dark bg-surface-low p-5">
                              <h4 className="text-base font-bold mb-2">{p.name}</h4>
                              <p className="text-sm text-text-muted mb-4">{p.about}</p>
                              <p className="text-sm text-accent-blue font-bold mb-4">{p.price}</p>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSearch(p.siteUrl)}
                                  className="px-3 py-2 rounded-xl border border-border-dark bg-surface-high text-[11px] font-bold hover:border-accent-blue"
                                >
                                  {language === 'tr' ? 'Ürünün Sitesi' : 'Product Site'}
                                </button>
                                <button
                                  onClick={() => alert(p.about)}
                                  className="px-3 py-2 rounded-xl border border-border-dark bg-surface-high text-[11px] font-bold hover:border-accent-blue"
                                >
                                  {language === 'tr' ? 'Ürün Hakkında' : 'About Product'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {(activeState.shopResults ?? []).length === 0 && (
                          <p className="text-sm text-text-dim">
                            {language === 'tr' ? 'Bu arama için alışveriş sonucu bulunamadı.' : 'No shopping result found for this query.'}
                          </p>
                        )}
                      </section>
                    ) : (
                    <>
                    {/* 1. Synthesis */}
                    <section>
                      <div className="flex items-center gap-3 mb-8">
                        <Cpu size={20} className="text-accent-blue" />
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white">
                          {language === 'tr' ? 'YAPAY ZEKA SENTEZİ' : 'AI SYNTHESIS'}
                        </h3>
                      </div>

                      <div className="relative">
                        <div className={`text-white/80 leading-relaxed font-light text-base md:text-lg overflow-hidden transition-all duration-700 ${!isExpanded ? 'max-h-[400px]' : 'max-h-[10000px]'}`}>
                          {activeTab.loading && activeState.content.startsWith('_') ? (
                            <div className="space-y-6">
                              <div className="h-4 bg-surface-high animate-pulse rounded-full w-3/4" />
                              <div className="h-4 bg-surface-high animate-pulse rounded-full w-5/6" />
                              <div className="h-4 bg-surface-high animate-pulse rounded-full w-2/3" />
                              <p className="text-xs text-accent-blue/40 italic mt-8 animate-pulse">{activeState.content.replace(/_/g, '')}</p>
                            </div>
                          ) : (
                            activeState.content.split('\n').map((line, i) => (
                              <div key={i} className="mb-4">
                                {line.startsWith('#') ? (
                                  <h2 className="text-3xl font-bold mt-10 mb-5 text-white leading-tight">{line.replace(/^#+\s/, '')}</h2>
                                ) : (
                                  <p>{line}</p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                        {!isExpanded && activeState.content.length > 600 && !activeTab.loading && (
                          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-dark via-dark/90 to-transparent flex items-end justify-center pb-4">
                             <button 
                               onClick={() => setIsExpanded(true)}
                               className="px-8 py-3 rounded-full bg-accent-blue text-dark font-bold text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-2"
                             >
                               <ChevronDown size={14} />
                               {language === 'tr' ? 'Devamını Oku' : 'Read More'}
                             </button>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* 1.5 Visuals */}
                    {activeState.visuals && activeState.visuals.length > 0 && (
                      <section className="border-t border-border-dark pt-16">
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-8 flex items-center gap-3 text-white">
                          <Sparkles size={20} className="text-accent-blue" />
                          {language === 'tr' ? 'GÖRSELLER' : 'VISUALS'}
                        </h3>
                        <div className="grid gap-6 md:grid-cols-2">
                          {activeState.visuals.map((v, i) => (
                            <div key={i} className="rounded-3xl border border-border-dark bg-surface-low p-4">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-text-dim mb-3">
                                {v.type} • {v.prompt}
                              </div>
                              {v.type === 'image' ? (
                                <img src={v.url} alt={v.prompt} className="w-full rounded-2xl border border-border-dark" loading="lazy" referrerPolicy="no-referrer" />
                              ) : (
                                <video src={v.url} controls className="w-full rounded-2xl border border-border-dark" />
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* 2. Real Web Destinations */}
                    {(activeTab.loading || ((activeState.sourcePool?.length ?? activeState.sources?.length ?? 0) > 0)) && (
                      <section className="border-t border-border-dark pt-16">
                        <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-8 flex items-center gap-3 text-white">
                          <Globe size={20} className="text-accent-blue" />
                          {language === 'tr' ? 'ARAMANIZLA EŞLEŞEN SİTELER' : 'MATCHING WEB DESTINATIONS'}
                        </h3>
                        {activeTab.loading && (!activeState.sources || activeState.sources.length === 0) ? (
                           <div className="grid gap-6">
                             {[1,2,3].map(i => (
                               <div key={i} className="h-24 rounded-3xl bg-surface-low animate-pulse border border-border-dark" />
                             ))}
                           </div>
                        ) : (
                          <div className="grid gap-6">
                            {(activeState.sourcePool ?? activeState.sources ?? []).slice(0, visibleSourceCount).map((source, i) => (
                              <motion.button
                                key={i}
                                onClick={() => handleSearch(source.url)}
                                whileHover={{ x: 8, backgroundColor: 'rgba(255,255,255,0.04)' }}
                                className="w-full text-left p-6 rounded-3xl border border-border-dark bg-surface-low flex items-center justify-between group transition-all"
                              >
                                <div className="flex-grow pr-10">
                                  <div className="flex items-center gap-3 mb-2">
                                    {source.favicon && (
                                       <img src={source.favicon} alt="" className="w-5 h-5 rounded-sm" referrerPolicy="no-referrer" />
                                    )}
                                    <h4 className="text-accent-blue font-bold text-base group-hover:underline">{source.title}</h4>
                                  </div>
                                  <p className="text-sm text-text-muted leading-relaxed mb-3 line-clamp-2">{source.snippet}</p>
                                  <span className="text-xs text-accent-blue/30 truncate max-w-lg block font-mono">{source.url}</span>
                                </div>
                                <ExternalLink size={20} className="text-text-dim group-hover:text-white shrink-0" />
                              </motion.button>
                            ))}
                            {(activeState.sourcePool ?? activeState.sources ?? []).length > visibleSourceCount && (
                              <button
                                onClick={() => setVisibleSourceCount((n) => n + 8)}
                                className="w-full p-4 rounded-2xl border border-dashed border-border-dark text-sm font-bold text-text-muted hover:border-accent-blue hover:text-white transition-all"
                              >
                                {language === 'tr' ? 'Daha fazla site gör' : 'See more sites'}
                              </button>
                            )}
                          </div>
                        )}
                      </section>
                    )}

                    {/* 4. Recommendations */}
                    {(activeTab.loading || (activeState.recommendations && activeState.recommendations.length > 0)) && (
                      <section className="border-t border-border-dark pt-16">
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-6 flex items-center gap-2">
                          <Zap size={16} className="text-accent-blue" />
                          {language === 'tr' ? 'MUHTEMEL YÖRÜNGELER' : 'PROBABLE TRAJECTORIES'}
                        </h4>
                        {activeTab.loading && (!activeState.recommendations || activeState.recommendations.length === 0) ? (
                          <div className="flex flex-wrap gap-3">
                            {[1,2,3,4].map(i => (
                              <div key={i} className="h-10 w-32 rounded-2xl bg-surface-low animate-pulse border border-border-dark" />
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {activeState.recommendations?.map((rec, i) => (
                              <button
                                key={i}
                                onClick={() => handleSearch(rec)}
                                className="px-6 py-3 rounded-2xl border border-border-dark bg-surface-low hover:border-accent-blue hover:bg-accent-blue/5 transition-all text-xs font-bold text-text-muted hover:text-white"
                              >
                                {rec}
                              </button>
                            ))}
                          </div>
                        )}
                      </section>
                    )}
                    </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI Sidebar */}
        <div className="w-[320px] bg-surface-low border-l border-border-dark flex flex-col shrink-0">
          <div className="p-5 border-b border-border-dark">
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-text-dim text-center">WW Mind Assistant</h3>
          </div>

          <div className="flex-grow p-4 overflow-y-auto space-y-4 custom-scrollbar">
            {activeTab.chat.length === 0 ? (
              <div className="text-center py-20 px-6 opacity-30">
                <BrainCircuit size={40} className="mx-auto mb-4" />
                <p className="text-xs italic leading-relaxed">WW Mind is monitoring the active port. Start a dialogue to deepen synthesis.</p>
              </div>
            ) : (
              activeTab.chat.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`
                    max-w-[85%] p-3 rounded-2xl text-[13px] leading-relaxed
                    ${msg.role === 'user' 
                      ? 'bg-transparent border border-border-dark text-text-muted rounded-tr-none' 
                      : 'bg-[#151515] border-l-2 border-accent-blue text-white rounded-tl-none'}
                  `}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            <div ref={lastMsgRef} />
          </div>

          <div className="p-4 bg-surface-low mt-auto">
            <div className="relative group">
              <input
                type="text"
                className="w-full bg-surface-high border border-border-mid rounded-lg py-2.5 pl-4 pr-10 text-[12px] outline-none group-focus-within:border-accent-blue transition-colors"
                placeholder="Reply to WW Mind..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChat()}
              />
              <button 
                onClick={handleChat}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-blue hover:text-white transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Side Overlays */}
      <AnimatePresence>
        {showSource && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[190]"
              onClick={() => setShowSource(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed inset-y-0 right-0 w-[400px] bg-[#0A0A0A] border-l border-border-dark z-[200] p-6 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-accent-blue">Element Inspector</h3>
                <X size={16} className="cursor-pointer hover:text-white" onClick={() => setShowSource(false)} />
              </div>
              <div className="mb-4 rounded-xl border border-border-dark bg-surface-low p-3 text-[10px] text-text-dim">
                <div className="font-bold text-accent-blue mb-2 uppercase tracking-widest">
                  Workspace Files
                </div>
                <div className="font-mono whitespace-pre-wrap leading-relaxed">
                  {[
                    "artifacts/ww-ai-browser/src/App.tsx",
                    "artifacts/ww-ai-browser/server.ts",
                    "artifacts/ww-ai-browser/vite.config.ts",
                    "LICENSE.txt",
                  ].join("\n")}
                </div>
              </div>
              <pre className="flex-grow bg-black/50 p-4 rounded-xl text-[10px] text-green-500 font-mono overflow-auto custom-scrollbar whitespace-pre-wrap">
                {activeState.html || JSON.stringify(activeState, null, 2)}
              </pre>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Customization Panel */}
      <AnimatePresence>
        {showCustomization && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[190]"
              onClick={() => setShowCustomization(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed inset-y-0 right-0 w-[400px] bg-[#0A0A0A] border-l border-border-dark z-[200] p-6 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-accent-blue">Visual Personalization</h3>
                <X size={16} className="cursor-pointer hover:text-white" onClick={() => setShowCustomization(false)} />
              </div>
              <div className="space-y-8">
                <div className="p-4 rounded-2xl bg-surface-high border border-border-dark">
                  <p className="text-[10px] font-bold text-text-dim mb-4 uppercase tracking-widest">Theme Palette</p>
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
                      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
                      '#D946EF', '#14B8A6', '#FACC15', '#94A3B8', '#FFD700'
                    ].map(color => (
                      <button 
                        key={color} 
                        onClick={() => setAccentColor(color)}
                        className={`aspect-square rounded-full border-2 transition-all ${accentColor === color ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-white/10 hover:border-white/40'}`} 
                        style={{ backgroundColor: color }} 
                      />
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-surface-high border border-border-dark">
                  <p className="text-[10px] font-bold text-text-dim mb-4 uppercase tracking-widest">Glassmorphism Intensity</p>
                  <input 
                    type="range" 
                    min="0" 
                    max="50" 
                    value={glassIntensity}
                    onChange={(e) => setGlassIntensity(parseInt(e.target.value))}
                    className="w-full accent-accent-blue cursor-pointer" 
                  />
                  <div className="flex justify-between mt-2 text-[9px] text-text-dim font-mono">
                    <span>0%</span>
                    <span>{glassIntensity}%</span>
                    <span>50%</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-accent-blue/5 border border-accent-blue/30 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent-blue/10 to-transparent animate-shimmer" />
                  <p className="text-[10px] font-bold text-accent-blue mb-3 uppercase tracking-widest flex items-center gap-2">
                    <BrainCircuit size={14} className="animate-pulse" />
                    Distributed Mind (Active)
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-accent-blue animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                  <p className="text-[8px] text-accent-blue/60 mt-2 font-mono italic">
                    {language === 'tr' ? '200+ dinamik API kanalı senkronize edildi.' : '200+ dynamic API channels synchronized.'}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[190]"
              onClick={() => setShowSettings(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed inset-y-0 right-0 w-[400px] bg-[#0A0A0A] border-l border-border-dark z-[200] p-6 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-accent-blue">WW-BrowserAi Settings</h3>
                <X size={16} className="cursor-pointer hover:text-white" onClick={() => setShowSettings(false)} />
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-surface-high rounded-xl border border-border-dark group hover:border-accent-blue/30 transition-all cursor-pointer" onClick={() => setLowLatency(!lowLatency)}>
                  <div className="space-y-1">
                    <p className="text-xs font-bold">Ultra-Low Latency</p>
                    <p className="text-[9px] text-text-dim">Priority synthesis speed</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${lowLatency ? 'bg-accent-blue' : 'bg-surface-mid'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${lowLatency ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-surface-high rounded-xl border border-border-dark group hover:border-accent-blue/30 transition-all cursor-pointer" onClick={() => setCrawlerAggression(!crawlerAggression)}>
                  <div className="space-y-1">
                    <p className="text-xs font-bold">Web Crawler Aggression</p>
                    <p className="text-[9px] text-text-dim">Bypass soft robot guards</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${crawlerAggression ? 'bg-accent-blue' : 'bg-surface-mid'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${crawlerAggression ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


