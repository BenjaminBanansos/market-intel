'use strict';

// ── State ──────────────────────────────────────────────────────────────────────
const S = {
  raw: [], filtered: [],
  query: '', loading: false,
  sort: 'latest',
  filters: { source: 'all', cat: 'all', sent: 'all', time: 'all' },
  chart: null,        // TradingView chart instance
  chartSeries: null,  // area series
  currentSymbol: null,
  currentRange: '3mo',
  priceData: null,
};

// ── Market context library ─────────────────────────────────────────────────────
const CONTEXTS = {
  'natural gas': { hashtags: ['#NatGas', '#NaturalGas', '#HenryHub', '#LNG', '#TTF', '#EIA', '#NYMEX', '#EnergyTrading'], keyTerms: ['EIA Storage', 'Henry Hub', 'LNG Exports', 'TTF Price', 'Rig Count', 'Winter Demand', 'Pipeline Cap.', 'Supply Glut'], blurb: 'Nat gas is driven by EIA weekly storage reports, weather forecasts, LNG export capacity, and seasonal demand patterns.' },
  'crude oil': { hashtags: ['#CrudeOil', '#WTI', '#Brent', '#OPEC', '#OilPrice', '#Petroleum', '#OilMarket'], keyTerms: ['OPEC+ Cuts', 'EIA Inventory', 'Refinery Cap.', 'SPR Release', 'Saudi Output', 'Geopolitical', 'Demand Outlook'], blurb: 'Crude oil is driven by OPEC+ production decisions, US EIA inventory data, geopolitical risk, and global demand forecasts.' },
  'gold': { hashtags: ['#Gold', '#XAU', '#XAUUSD', '#GoldPrice', '#PreciousMetals', '#SafeHaven'], keyTerms: ['Real Yields', 'DXY Dollar', 'CPI Inflation', 'Fed Policy', 'ETF Flows', 'Central Banks', 'Jewelry Demand'], blurb: 'Gold is driven by real interest rates, USD strength, inflation expectations, and central bank reserve buying.' },
  'silver': { hashtags: ['#Silver', '#XAG', '#XAGUSD', '#SilverPrice', '#PreciousMetals'], keyTerms: ['Gold/Silver Ratio', 'Industrial Demand', 'Solar Panels', 'EV Growth', 'Mint Supply'], blurb: 'Silver has dual drivers: monetary (inflation hedge) and industrial (solar, EVs, electronics).' },
  'bitcoin': { hashtags: ['#Bitcoin', '#BTC', '#BTCUSD', '#Crypto', '#CryptoTrading', '#Blockchain'], keyTerms: ['Halving', 'ETF Flows', 'On-Chain Data', 'Hash Rate', 'Funding Rate', 'Whale Activity'], blurb: 'Bitcoin is influenced by macro factors, ETF flows, halving cycles, regulatory news, and on-chain metrics.' },
  'ethereum': { hashtags: ['#Ethereum', '#ETH', '#ETHUSD', '#DeFi', '#Web3', '#Layer2'], keyTerms: ['Gas Fees', 'Staking Yield', 'Layer 2', 'DeFi TVL', 'ETH Burn', 'Restaking'], blurb: 'Ethereum is driven by DeFi activity, staking yields, Layer-2 adoption, ETF flows, and on-chain usage.' },
  'sp': { hashtags: ['#SPX', '#SP500', '#QQQ', '#StockMarket', '#EquityMarkets'], keyTerms: ['Fed Policy', 'Earnings Season', 'CPI/PPI', 'Jobs Report', 'VIX', 'P/E Ratio', 'Sector Rotation'], blurb: 'S&P 500 is driven by Fed policy, corporate earnings, macro data, and global risk sentiment.' },
  'inflation': { hashtags: ['#Inflation', '#CPI', '#FedReserve', '#InterestRates', '#FOMC', '#Macro'], keyTerms: ['CPI Print', 'PCE Deflator', 'Core Inflation', 'FOMC Meeting', 'Rate Cut/Hike', 'Real Yields'], blurb: 'Inflation data (CPI, PCE) directly drives Fed policy expectations, bond yields, and risk asset valuations.' },
  'forex': { hashtags: ['#Forex', '#FX', '#EURUSD', '#GBPUSD', '#USDJPY', '#DXY'], keyTerms: ['DXY Index', 'Interest Diff.', 'NFP', 'Central Bank', 'Carry Trade', 'COT Report'], blurb: 'Forex is driven by interest rate differentials, central bank policy, macro data, and global risk appetite.' },
  'lng': { hashtags: ['#LNG', '#LNGTrading', '#NatGas', '#EnergyTransition', '#FLNG'], keyTerms: ['Export Terminal', 'Spot Cargo', 'Henry Hub', 'Asian Premium', 'JKM Spread'], blurb: 'LNG markets are driven by Asian demand, US export capacity, spot vs contract spreads, and weather events.' },
};

// ── NLP word banks ─────────────────────────────────────────────────────────────
const BULLISH = ['bull', 'bullish', 'long', 'buy', 'calls', 'rally', 'surge', 'moon', 'soar', 'climb', 'rise', 'rising', 'gain', 'gains', 'higher', 'upside', 'breakout', 'support', 'recovery', 'green', 'beat', 'exceed', 'record high', 'accumulate', 'oversold', 'bounce', 'rocket', 'uptrend', 'squeeze'];
const BEARISH = ['bear', 'bearish', 'short', 'sell', 'puts', 'dump', 'crash', 'plunge', 'drop', 'fall', 'falling', 'decline', 'lower', 'downside', 'breakdown', 'resistance', 'correction', 'selloff', 'miss', 'below', 'overbought', 'distribution', 'red', 'weak', 'tank', 'slide', 'reject'];
const FUNDAM = ['supply', 'demand', 'production', 'storage', 'inventory', 'eia', 'report', 'export', 'import', 'gdp', 'inflation', 'fed', 'opec', 'pipeline', 'weather', 'temperature', 'forecast', 'lng', 'ttf', 'henry hub', 'economic', 'earnings', 'revenue', 'fundamental', 'macro', 'policy', 'rate', 'cpi', 'ppi', 'jobs', 'employment', 'trade', 'balance', 'output', 'refinery', 'drawdown', 'injection', 'capacity'];
const TECHNI = ['resistance', 'support', 'breakout', 'breakdown', 'macd', 'rsi', 'moving average', 'ema', 'sma', 'fibonacci', 'fib', 'chart', 'pattern', 'trend', 'price action', 'momentum', 'oversold', 'overbought', 'consolidation', 'volume', 'divergence', 'triangle', 'wedge', 'bollinger', 'stochastic', 'ichimoku', 'atr', 'vwap', 'pivot', 'retracement', 'candlestick', 'doji', 'hammer', 'flag'];
const GEOPO = ['war', 'sanction', 'conflict', 'military', 'strike', 'attack', 'iran', 'russia', 'ukraine', 'israel', 'middle east', 'strait', 'hormuz', 'embargo', 'tariff', 'trade war', 'escalat', 'ceasefire', 'coup', 'crisis', 'geopolit', 'terror', 'weapon', 'nato', 'gulf', 'troops', 'regime', 'nuclear', 'missile', 'blockade', 'occupation', 'insurgent', 'invasion', 'diplomat', 'treaty', 'alliance', 'refugee'];

function sentiment(text) {
  const t = text.toLowerCase(); let b = 0, r = 0;
  BULLISH.forEach(w => { if (t.includes(w)) b++; });
  BEARISH.forEach(w => { if (t.includes(w)) r++; });
  return b > r ? 'bullish' : r > b ? 'bearish' : 'neutral';
}
function category(text) {
  const t = text.toLowerCase(); let f = 0, c = 0, g = 0;
  FUNDAM.forEach(w => { if (t.includes(w)) f++; });
  TECHNI.forEach(w => { if (t.includes(w)) c++; });
  GEOPO.forEach(w => { if (t.includes(w)) g++; });
  // Geopolitical wins if it has any hits AND beats or ties fundamentals
  if (g >= 2 && g >= f) return 'geopolitical';
  return f > c ? 'fundamental' : c > f ? 'technical' : 'general';
}
function hashtags(text) { return [...new Set((text.match(/#[a-zA-Z0-9_]+/g) || []))]; }

function itemDate(item) { return new Date(item.created || item.publishedAt || item.created_at || 0); }
function relTime(d) {
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return `${~~diff}s ago`; if (diff < 3600) return `${~~(diff / 60)}m ago`;
  if (diff < 86400) return `${~~(diff / 3600)}h ago`; return `${~~(diff / 86400)}d ago`;
}
function fmtNum(n = 0) { return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n); }
function esc(s) { const d = document.createElement('div'); d.appendChild(document.createTextNode(String(s || ''))); return d.innerHTML; }
function score(item) {
  if (item.source === 'reddit') return (item.score || 0) + (item.comments || 0) * 0.5;
  return 0;
}
function process(item) {
  const t = `${item.title || ''} ${item.text || ''}`;
  return { ...item, _sent: sentiment(t), _cat: category(t), _tags: hashtags(t) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTERS & SORT
// ═══════════════════════════════════════════════════════════════════════════════

function applyFilters() {
  let out = S.raw.slice();
  if (S.filters.source !== 'all') out = out.filter(i => i.source === S.filters.source);
  if (S.filters.cat !== 'all') out = out.filter(i => i._cat === S.filters.cat);
  if (S.filters.sent !== 'all') out = out.filter(i => i._sent === S.filters.sent);
  if (S.filters.time !== 'all') {
    const ms = { '1h': 36e5, '24h': 864e5, '7d': 6048e5 }[S.filters.time];
    if (ms) out = out.filter(i => Date.now() - itemDate(i) <= ms);
  }
  out.sort(S.sort === 'popular' ? (a, b) => score(b) - score(a) : (a, b) => itemDate(b) - itemDate(a));
  S.filtered = out;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER CARDS
// ═══════════════════════════════════════════════════════════════════════════════

function renderCard(item) {
  const { source, _sent, _cat } = item;
  const srcBadge = source === 'ticker'
    ? `<span class="badge badge-ticker">📊 ${esc(item.symbol || 'YF')}</span>`
    : source === 'reddit'
      ? `<span class="badge badge-reddit">🔴 r/${esc(item.subreddit || 'reddit')}</span>`
      : `<span class="badge badge-news">📰 ${esc(item.outlet || 'News')}</span>`;
  const sentLabel = { bullish: '🟢 Bullish', bearish: '🔴 Bearish', neutral: '⚪ Neutral' }[_sent] || '⚪ Neutral';
  const catLabel = { fundamental: '📋 Fundamental', technical: '📉 Technical', general: '💬 General', geopolitical: '🌍 Geopolitical' }[_cat];
  let meta = '';
  if (source === 'ticker') { meta = `<span class="metric">📊 ${esc(item.outlet || 'Yahoo Finance')}</span>`; }
  else if (source === 'reddit') { meta = `<span class="metric">⬆ ${fmtNum(item.score)}</span><span class="metric">💬 ${fmtNum(item.comments)}</span>`; }

  return `
    <a href="${esc(item.url || '#')}" target="_blank" rel="noopener noreferrer" class="card">
      <div class="card-badges">${srcBadge}<span class="badge badge-${_sent}">${sentLabel}</span><span class="badge badge-${_cat}">${catLabel}</span></div>
      ${item.title ? `<div class="card-title">${esc(item.title)}</div>` : ''}
      ${(item.text || item.description) ? `<div class="card-body">${esc((item.text || item.description || '').slice(0, 300))}</div>` : ''}
      <div class="card-footer"><span>🕐 ${itemDate(item).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} (${relTime(itemDate(item))})</span><span class="spacer"></span>${meta}</div>
    </a>`;
}

function renderSkeleton() {
  return `<div class="skeleton-list">${Array(7).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-line" style="width:42%;height:13px"></div>
      <div class="skeleton-line" style="width:80%;height:13px"></div>
      <div class="skeleton-line" style="width:62%;height:12px"></div>
      <div class="skeleton-line" style="width:26%;height:11px;margin-top:5px"></div>
    </div>`).join('')}</div>`;
}

function render() {
  const body = document.getElementById('resultsBody');
  const meta = document.getElementById('resultsMeta');

  if (S.loading) {
    body.innerHTML = renderSkeleton();
    meta.innerHTML = '⏳ Scanning market sources…';
    return;
  }

  const counts = { all: S.raw.length, ticker: 0, reddit: 0, news: 0 };
  S.raw.forEach(i => { if (i.source in counts) counts[i.source]++; });
  ['all', 'ticker', 'reddit', 'news'].forEach(k => { const el = document.getElementById(`fc-${k}`); if (el) el.textContent = counts[k]; });

  if (!S.filtered.length) {
    body.innerHTML = S.query
      ? `<div class="empty"><div class="empty-icon">🔍</div><div class="empty-title">No relevant results found</div><div class="empty-desc">Try a more specific market term, or adjust filters.</div></div>`
      : `<div class="empty"><div class="empty-icon">📡</div><div class="empty-title">Market Intelligence Scanner</div><div class="empty-desc">Type any market keyword and hit <strong>Scan</strong>, or click a preset above.<br><br>Only market-relevant content is shown — no noise.<br><br><span style="color:var(--green)">✓ Reddit (curated finance subs)</span> &nbsp;<span style="color:var(--green)">✓ Google News</span> &nbsp;<span style="color:var(--green)">✓ NewsAPI</span></div></div>`;
    if (S.query) meta.innerHTML = `No relevant results for "<strong>${esc(S.query)}</strong>"`;
    return;
  }

  const shown = S.filtered.length, total = S.raw.length;
  meta.innerHTML = `<strong>${shown}</strong> relevant result${shown !== 1 ? 's' : ''}${shown < total ? ` (filtered from ${total})` : ''} — "<strong>${esc(S.query)}</strong>"`;
  body.innerHTML = `<div class="card-list">${S.filtered.map(renderCard).join('')}</div>`;
  updatePanel();
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSIGHT PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function updatePanel() {
  if (!S.filtered.length) return;
  const sc = { bullish: 0, bearish: 0, neutral: 0 };
  let funds5 = [], funds10 = [], funds24 = [];
  const now = Date.now();

  S.filtered.forEach(i => {
    sc[i._sent]++;
    const dt = now - itemDate(i).getTime();
    if (i._cat === 'fundamental' && i.title) {
      if (dt <= 5 * 3600000) funds5.push(i.title);
      else if (dt <= 10 * 3600000) funds10.push(i.title);
      else if (dt <= 24 * 3600000) funds24.push(i.title);
    }
  });

  const tot = S.filtered.length;
  ['bullish', 'bearish', 'neutral'].forEach(s => {
    const pct = tot ? Math.round(sc[s] / tot * 100) : 0;
    document.getElementById(`sb-${s}`).style.width = pct + '%';
    document.getElementById(`sp-${s}`).textContent = pct + '%';
  });

  const renderSummary = (id, label, items) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!items.length) {
      el.innerHTML = `<div style="font-size:10px; color:var(--text3); text-transform:uppercase; margin-bottom:4px;">${label}</div><div style="font-size:12px; color:var(--text2); font-style:italic;">No major fundamental events</div>`;
      return;
    }
    const topItems = items.slice(0, 2); // Show top 2 highlights
    const listHtml = topItems.map(t => `<li style="font-size:12px; margin-bottom:6px; line-height:1.4; color:var(--text1);"><span style="color:var(--blue); margin-right:4px;">•</span>${esc(t)}</li>`).join('');
    el.innerHTML = `<div style="font-size:10px; color:var(--text3); text-transform:uppercase; margin-bottom:4px;">${label}</div><ul style="list-style:none; padding:0; margin:0;">${listHtml}</ul>`;
  };

  renderSummary('summary5h', 'Last 5 Hours', funds5);
  renderSummary('summary10h', 'Last 10 Hours', funds10);
  renderSummary('summary24h', 'Last 24 Hours', funds24);

  const found = {};
  S.filtered.forEach(i => (i._tags || []).forEach(t => { found[t] = (found[t] || 0) + 1; }));
  const topFound = Object.entries(found).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t);

  let ctxTags = [];
  const q = S.query.toLowerCase();
  for (const [key, ctx] of Object.entries(CONTEXTS)) {
    if (q.includes(key) || key.split(' ').some(w => q.includes(w))) {
      ctxTags = ctx.hashtags;
      document.getElementById('contextCard').style.display = 'block';
      document.getElementById('panelContext').innerHTML = `
        <p style="margin-bottom:10px">${esc(ctx.blurb)}</p>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:6px">Key Terms</div>
        <div class="key-terms">${ctx.keyTerms.map(t => `<span class="key-term">${esc(t)}</span>`).join('')}</div>`;
      break;
    }
  }

  const allTags = [...new Set([...topFound, ...ctxTags])].slice(0, 16);
  document.getElementById('panelTags').innerHTML = allTags.length
    ? allTags.map(t => `<span class="tag-chip" onclick="searchTag('${esc(t)}')">${esc(t)}</span>`).join('')
    : '<span style="font-size:11px;color:var(--text3)">No hashtags found</span>';

  const srcs = {};
  S.filtered.forEach(i => { const k = i.outlet || (i.subreddit ? 'r/' + i.subreddit : null) || i.source || '?'; srcs[k] = (srcs[k] || 0) + 1; });
  document.getElementById('panelSources').innerHTML =
    Object.entries(srcs).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([s, n]) => `<div class="src-item"><span>${esc(s)}</span><span class="src-count">${n}</span></div>`).join('')
    || '<span style="font-size:11px;color:var(--text3)">No sources</span>';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICE CHART (TradingView Lightweight Charts)
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchAndRenderChart(q, range = '3mo') {
  try {
    const r = await fetch(`/api/price?q=${encodeURIComponent(q)}&range=${range}`);
    const d = await r.json();
    if (!d.success || !d.data) return;
    S.priceData = d.data;
    S.currentSymbol = d.symbol;
    renderChart(d.data);
  } catch (e) {
    console.warn('[Chart]', e);
  }
}

function renderChart(data) {
  const { ohlcv, spikes, symbol, name, currency, current, prev } = data;
  if (!ohlcv || !ohlcv.length) return;

  // Show section
  document.getElementById('chartSection').style.display = 'block';

  // Header info
  document.getElementById('chartSymbol').textContent = symbol;
  document.getElementById('chartName').textContent = name;
  document.getElementById('chartPrice').textContent = `${currency === 'USD' ? '$' : ''}${current.toLocaleString()}`;
  const changePct = prev ? ((current - prev) / prev * 100) : 0;
  const changeEl = document.getElementById('chartChange');
  changeEl.textContent = `${changePct >= 0 ? '▲' : '▼'} ${Math.abs(changePct).toFixed(2)}%`;
  changeEl.className = `chart-change ${changePct >= 0 ? 'up' : 'down'}`;

  // Destroy existing chart
  const container = document.getElementById('tvChart');
  container.innerHTML = '';
  if (S.chart) { try { S.chart.remove(); } catch { } S.chart = null; }

  // Create new chart
  S.chart = LightweightCharts.createChart(container, {
    width: container.offsetWidth,
    height: 280,
    layout: { background: { color: '#0b0f18' }, textColor: '#8b9ab0' },
    grid: { vertLines: { color: '#2a3347' }, horzLines: { color: '#2a3347' } },
    rightPriceScale: { borderColor: '#2a3347' },
    timeScale: { borderColor: '#2a3347', timeVisible: true },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    handleScroll: true,
    handleScale: true,
  });

  // Area series
  S.chartSeries = S.chart.addAreaSeries({
    lineColor: '#4f8ef7',
    topColor: 'rgba(79,142,247,0.25)',
    bottomColor: 'rgba(79,142,247,0.0)',
    lineWidth: 2,
  });

  S.chartSeries.setData(ohlcv.map(d => ({ time: d.time, value: d.close })));

  // Spike / dip markers
  if (spikes && spikes.length) {
    S.chartSeries.setMarkers(spikes.map(s => ({
      time: s.time,
      position: s.type === 'spike' ? 'belowBar' : 'aboveBar',
      color: s.type === 'spike' ? '#34d399' : '#f87171',
      shape: s.type === 'spike' ? 'arrowUp' : 'arrowDown',
      text: `${s.change > 0 ? '+' : ''}${s.change.toFixed(1)}%`,
      size: 1,
    })));
  }

  S.chart.timeScale().fitContent();

  // Resize on window resize
  const ro = new ResizeObserver(() => {
    if (S.chart) S.chart.applyOptions({ width: container.offsetWidth });
  });
  ro.observe(container);

  // Build events strip — correlate spikes with news results
  renderEventsStrip(spikes || []);
}

// ── Find news/reddit items within ± days of a date ─────────────────────────
function findEventsNear(dateStr, rangeMs = 2 * 86400000) {
  const target = new Date(dateStr).getTime();
  return S.raw
    .filter(item => {
      const d = itemDate(item).getTime();
      return Math.abs(d - target) <= rangeMs;
    })
    .sort((a, b) => {
      const da = Math.abs(itemDate(a).getTime() - target);
      const db = Math.abs(itemDate(b).getTime() - target);
      return da - db; // closest first
    })
    .slice(0, 3);
}

function renderEventsStrip(spikes) {
  const strip = document.getElementById('eventsStrip');
  if (!spikes.length) { strip.innerHTML = ''; return; }

  // Sort by time chronologically (newest first)
  const sorted = [...spikes].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

  strip.innerHTML = sorted.map(s => {
    const events = findEventsNear(s.time);
    const topItem = events[0];
    const headline = topItem
      ? (topItem.title || topItem.text || '').slice(0, 100)
      : 'No matching article found for this date range';
    const source = topItem ? (topItem.outlet || topItem.subreddit || topItem.source || '') : '';
    const isUp = s.change > 0;
    return `
      <div class="event-chip ${isUp ? 'spike' : 'dip'}" onclick="highlightDate('${s.time}')">
        <div class="event-chip-header">
          <span class="event-chip-date">${s.time}</span>
          <span class="event-chip-change ${isUp ? 'up' : 'down'}">${isUp ? '▲' : '▼'} ${Math.abs(s.change).toFixed(1)}%</span>
        </div>
        <div class="event-chip-headline">${esc(headline)}</div>
        ${source ? `<div class="event-chip-source">${esc(source)}</div>` : ''}
      </div>`;
  }).join('');
}

function highlightDate(dateStr) {
  // Scroll chart to that date
  if (S.chart) {
    S.chart.timeScale().scrollToPosition(0, false);
  }
  // Scroll news list to items near that date
  const target = new Date(dateStr).getTime();
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    const url = card.href;
    const item = S.filtered.find(i => i.url === url || (card.href && i.url === decodeURIComponent(url)));
    if (!item) return;
    const diff = Math.abs(itemDate(item).getTime() - target);
    card.style.outline = diff <= 2 * 86400000 ? '2px solid var(--blue)' : '';
  });
  // Scroll to first highlighted card
  const highlighted = document.querySelector('.card[style*="2px solid"]');
  if (highlighted) highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setChartRange(range, btn) {
  S.currentRange = range;
  document.querySelectorAll('.chart-range-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  fetchAndRenderChart(S.query, range);
}

function closeChart() {
  document.getElementById('chartSection').style.display = 'none';
  if (S.chart) { try { S.chart.remove(); } catch { } S.chart = null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

async function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;
  S.query = q; S.raw = []; S.filtered = []; S.loading = true;
  document.getElementById('searchBtn').disabled = true;
  // Hide old chart while searching
  document.getElementById('chartSection').style.display = 'none';
  render();

  // Fetch news + chart in parallel
  const [reddit, news, twitter] = await Promise.allSettled([
    fetch(`/api/reddit?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => ({ data: [] })),
    fetch(`/api/news?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => ({ data: [] })),
    fetch(`/api/twitter?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => ({ data: [] })),
  ]);

  S.raw = [
    ...(reddit.value?.data || []),
    ...(news.value?.data || []),
    ...(twitter.value?.data || []),
  ].map(process);

  S.loading = false;
  document.getElementById('searchBtn').disabled = false;
  applyFilters();
  render();

  // Load chart after results (non-blocking)
  fetchAndRenderChart(q, S.currentRange);
}

function preset(q) {
  document.getElementById('searchInput').value = q;
  document.querySelectorAll('.preset').forEach(b => b.classList.remove('active'));
  if (event?.currentTarget) event.currentTarget.classList.add('active');
  doSearch();
}

function searchTag(tag) {
  document.getElementById('searchInput').value = tag;
  doSearch();
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER / SORT
// ═══════════════════════════════════════════════════════════════════════════════

function setFilter(key, val, btn) {
  S.filters[key] = val;
  document.querySelectorAll(`[data-f="${key}"]`).forEach(el => el.classList.toggle('active', el.dataset.v === val));
  applyFilters(); render();
}

function setSort(val, btn) {
  S.sort = val;
  document.querySelectorAll('.sort-btn').forEach(el => el.classList.remove('active'));
  btn.classList.add('active');
  applyFilters(); render();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL / CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

function openModal() { document.getElementById('modal').classList.add('open'); }
function closeModal() { document.getElementById('modal').classList.remove('open'); }

async function loadConfig() {
  try {
    const cfg = await fetch('/api/config').then(r => r.json());
    const active = Object.values(cfg).filter(Boolean).length;
    document.getElementById('apiDot').className = 'api-pill-dot' + (active >= 2 ? '' : ' warn');
    document.getElementById('apiLabel').textContent = `${active}/4 APIs active`;
    const rows = [
      { key: 'reddit', label: 'Reddit', icon: '🔴', note: 'Curated finance subreddits · always on' },
      { key: 'googlenews', label: 'Google News', icon: '📰', note: 'RSS feed · always on' },
      { key: 'newsapi', label: 'NewsAPI', icon: '📡', note: cfg.newsapi ? 'Key configured ✓' : 'Add NEWS_API_KEY to .env' },
      { key: 'ticker', label: 'Ticker News', icon: '📊', note: 'Yahoo Finance RSS per symbol · always on' },
    ];
    document.getElementById('modalApiRows').innerHTML = rows.map(r => `
      <div class="api-row">
        <span style="font-size:16px">${r.icon}</span>
        <span class="api-row-name">${r.label}</span>
        <span class="api-row-hint">${r.note}</span>
        <span class="pill ${cfg[r.key] ? 'pill-green' : 'pill-red'}">${cfg[r.key] ? '✓ Active' : '✗ Off'}</span>
      </div>`).join('');
  } catch {
    document.getElementById('apiLabel').textContent = 'Connecting…';
  }
}

// ── Keyboard ──────────────────────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
document.addEventListener('keydown', e => {
  const inp = document.getElementById('searchInput');
  if ((e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) && document.activeElement !== inp) { e.preventDefault(); inp.focus(); }
  if (e.key === 'Escape') closeModal();
});

// ── Boot ──────────────────────────────────────────────────────────────────────
loadConfig();
