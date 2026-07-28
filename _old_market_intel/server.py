#!/usr/bin/env python3
"""
Market Intel — Proxy server
- Serves static files from ./public/
- Handles /api/* routes — all external calls made server-side
- Deploy-ready: reads PORT from environment (Render, Railway, Fly.io, etc.)
"""

import http.server, urllib.request, urllib.parse, urllib.error
import json, re, os, time, math
from datetime import datetime, timezone

# Resolve paths relative to this script (works locally AND on any host)
_HERE   = os.path.dirname(os.path.abspath(__file__))
PORT    = int(os.environ.get('PORT', 3000))
PUBLIC  = os.path.join(_HERE, 'public')

# ── Load .env (local dev only — on Render/Railway use dashboard env vars) ─────
for _env_path in [os.path.join(_HERE, '.env'), '/tmp/.market_intel_env']:
    try:
        for line in open(_env_path).read().splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())
        break
    except Exception:
        continue

TWITTER_TOKEN = os.environ.get('TWITTER_BEARER_TOKEN', '')
NEWS_API_KEY  = os.environ.get('NEWS_API_KEY', '')

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

def http_get(url, headers=None, timeout=12):
    h = {'User-Agent': UA, **(headers or {})}
    with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=timeout) as r:
        return r.read().decode('utf-8', errors='replace')

# ── Curated subreddits per category ───────────────────────────────────────────
MARKET_SUBREDDITS = [
    # Commodities & Energy
    'NaturalGas','energy','commodities','EnergyTrading','RenewableEnergy',
    # Equities & Macro
    'investing','stocks','StockMarket','SecurityAnalysis','ValueInvesting',
    'economics','worldeconomics','economy','MacroEconomics','finance',
    # Trading
    'trading','Daytrading','algotrading','options','Futures','technicalanalysis',
    # Crypto
    'CryptoCurrency','Bitcoin','ethereum','CryptoMarkets',
    # Forex / FX
    'Forex',
    # General
    'wallstreetbets','financialindependence','business','news',
]

# ── Market relevance keywords ──────────────────────────────────────────────────
MARKET_KEYWORDS = [
    'price','market','trade','trading','invest','stock','share','fund','futures',
    'oil','gas','gold','silver','crypto','bitcoin','eth','usd','eur','index',
    'rate','yield','bond','equity','commodity','supply','demand','eia','opec',
    'fed','fomc','gdp','cpi','inflation','earnings','revenue','profit',
    'bull','bear','rally','crash','breakout','support','resistance','chart',
    'long','short','buy','sell','calls','puts','option','contract','hedge',
    'lng','ttf','henry hub','wti','brent','natgas','nymex','cme',
    'barrels','mmbtu','mcf','bcf','tcf','trillion','billion','million',
    'analyst','forecast','outlook','report','data','drawdown','injection',
    'storage','production','pipeline','export','import','refinery',
    # Geopolitical risk — market-moving events
    'war','sanction','conflict','tension','military','strike','attack',
    'iran','russia','ukraine','israel','middle east','strait','hormuz',
    'embargo','tariff','trade war','escalat','ceasefire','disruption',
    'coup','crisis','geopolit','energy security','crude','terror',
    'weapons','troops','nato','gulf','opec cut','output cut',
]

def relevance_score(text):
    """Return count of market keyword hits in text (lower-cased)."""
    t = text.lower()
    return sum(1 for kw in MARKET_KEYWORDS if kw in t)

def is_market_relevant(title, body='', min_score=2):
    # Title must contain at least 1 market keyword (blocks off-topic posts with keyword-heavy bodies)
    if relevance_score(title) < 1:
        return False
    combined = f"{title} {body}"
    return relevance_score(combined) >= min_score

# ── Reddit ─────────────────────────────────────────────────────────────────────
def api_reddit(q):
    items, seen = [], set()
    subs = '+'.join(MARKET_SUBREDDITS)

    urls = [
        # Curated subreddit search — most relevant
        f'https://www.reddit.com/r/{subs}/search.json?q={urllib.parse.quote(q)}&sort=new&limit=50&t=month&restrict_sr=1',
        # Recent high-engagement posts in r/investing + r/trading
        f'https://www.reddit.com/r/investing+trading+NaturalGas+commodities+economics/search.json?q={urllib.parse.quote(q)}&sort=relevance&limit=25&t=week&restrict_sr=1',
    ]

    for url in urls:
        try:
            data = json.loads(http_get(url, {'User-Agent': 'MarketIntelScanner/1.0'}))
            for ch in data['data']['children']:
                d = ch['data']
                if d['id'] in seen:
                    continue
                seen.add(d['id'])

                title = d.get('title','')
                body  = d.get('selftext','') or ''

                # ── Relevance gate ──────────────────────────────────────────
                if not is_market_relevant(title, body, min_score=2):
                    continue

                items.append({
                    'id':        d['id'],
                    'title':     title,
                    'text':      body[:600],
                    'url':       f"https://reddit.com{d['permalink']}",
                    'subreddit': d.get('subreddit',''),
                    'score':     d.get('score', 0),
                    'comments':  d.get('num_comments', 0),
                    'author':    d.get('author',''),
                    'created':   datetime.fromtimestamp(d['created_utc'], tz=timezone.utc).isoformat(),
                    'source':    'reddit',
                })
        except Exception as e:
            print(f'[Reddit] {e}')

    items.sort(key=lambda x: x['created'], reverse=True)
    return items

# ── News ───────────────────────────────────────────────────────────────────────
def decode_xml(s):
    s = re.sub(r'<[^>]+>', '', s)
    for entity, ch in [('&amp;','&'),('&lt;','<'),('&gt;','>'),('&#39;',"'"),('&quot;','"'),('&nbsp;',' ')]:
        s = s.replace(entity, ch)
    return s.strip()

def _parse_rss(xml, outlet_name, seen=None):
    """Generic RSS parser — returns list of news items."""
    results = []
    if seen is None: seen = set()
    for block in re.findall(r'<item>([\s\S]*?)<\/item>', xml)[:25]:
        def tag(t, b=block):
            m = re.search(rf'<{t}[^>]*>([\s\S]*?)<\/{t}>', b)
            return decode_xml(m.group(1)) if m else ''
        link_m = re.search(r'<link>([\s\S]*?)<\/link>', block)
        src_m  = re.search(r'<source[^>]*>([^<]+)<\/source>', block)
        title  = tag('title')
        url    = link_m.group(1).strip() if link_m else ''
        pub    = tag('pubDate')
        desc   = tag('description') or tag('summary')
        outlet = decode_xml(src_m.group(1)) if src_m else outlet_name
        if not title or not url or url in seen: continue
        seen.add(url)
        try:
            from email.utils import parsedate_to_datetime
            dt = parsedate_to_datetime(pub).astimezone(timezone.utc).isoformat() if pub else datetime.now(timezone.utc).isoformat()
        except:
            dt = datetime.now(timezone.utc).isoformat()
        if is_market_relevant(title, desc, min_score=1):
            results.append({'title': title, 'text': desc or title, 'url': url,
                            'outlet': outlet, 'publishedAt': dt, 'source': 'news'})
    return results

# Curated premium RSS feeds — geopolitics, markets, commodities
PREMIUM_RSS = [
    # WSJ Markets (geopolitics + macro)
    ('WSJ',         'https://feeds.a.dj.com/rss/RSSMarketsMain.xml'),
    # CNBC Top News
    ('CNBC',        'https://www.cnbc.com/id/100003114/device/rss/rss.html'),
    # BBC Business (covers Middle East, Russia, energy security)
    ('BBC',         'https://feeds.bbci.co.uk/news/business/rss.xml'),
    # MarketWatch
    ('MarketWatch', 'https://www.marketwatch.com/rss/topstories'),
]

def api_news(q):
    items = []
    seen_urls = set()

    # ── Google News RSS (query-specific) ────────────────────────────────────────
    try:
        rss_url = f'https://news.google.com/rss/search?q={urllib.parse.quote(q)}&hl=en-US&gl=US&ceid=US:en'
        xml = http_get(rss_url)
        parsed = _parse_rss(xml, 'Google News', seen_urls)
        items.extend(parsed[:30])
    except Exception as e:
        print(f'[Google News] {e}')

    # ── Premium RSS feeds (WSJ, CNBC, BBC, MarketWatch) ─────────────────────────
    for outlet, feed_url in PREMIUM_RSS:
        try:
            xml    = http_get(feed_url)
            parsed = _parse_rss(xml, outlet, seen_urls)
            # Filter to those relevant to the query keyword
            q_words = [w for w in q.lower().split() if len(w) > 2]
            relevant = [a for a in parsed
                        if any(w in (a['title']+' '+a['text']).lower() for w in q_words)]
            items.extend(relevant[:8])
        except Exception as e:
            print(f'[{outlet}] {e}')

    # ── NewsAPI ─────────────────────────────────────────────────────────────────
    if NEWS_API_KEY:
        try:
            url  = f'https://newsapi.org/v2/everything?q={urllib.parse.quote(q)}&sortBy=publishedAt&pageSize=20&language=en'
            data = json.loads(http_get(url, {'X-Api-Key': NEWS_API_KEY}))
            for a in data.get('articles', []):
                if not a.get('title') or a['title'] == '[Removed]': continue
                title = a['title']
                desc  = a.get('description','') or ''
                art_url = a.get('url','')
                if art_url in seen_urls or not is_market_relevant(title, desc, min_score=1): continue
                seen_urls.add(art_url)
                items.append({
                    'title': title, 'text': desc,
                    'url':   art_url,
                    'outlet': a.get('source',{}).get('name','NewsAPI'),
                    'publishedAt': a.get('publishedAt',''),
                    'source': 'news',
                })
        except Exception as e:
            print(f'[NewsAPI] {e}')

    items.sort(key=lambda x: x.get('publishedAt',''), reverse=True)
    return items

# ── Yahoo Finance Ticker RSS ───────────────────────────────────────────────────
# Fetches ticker-specific analyst coverage from Yahoo Finance RSS
# URL: https://feeds.finance.yahoo.com/rss/2.0/headline?s={SYMBOL}&region=US&lang=en-US
# No API key required. Returns up to 20 fresh articles per ticker.

def api_ticker_news(q):
    items = []
    # Reuse the existing SYMBOL_MAP to find the Yahoo Finance ticker for this query
    symbol = find_symbol(q)
    if not symbol:
        return items
    try:
        url = (f'https://feeds.finance.yahoo.com/rss/2.0/headline'
               f'?s={urllib.parse.quote(symbol)}&region=US&lang=en-US')
        xml = http_get(url)
        for block in re.findall(r'<item>([\s\S]*?)<\/item>', xml)[:20]:
            def tag(t, b=block):
                m = re.search(rf'<{t}[^>]*>([\s\S]*?)<\/{t}>', b)
                return decode_xml(m.group(1)) if m else ''
            link_m = re.search(r'<link>([\s\S]*?)<\/link>', block)
            title  = tag('title')
            url_   = link_m.group(1).strip() if link_m else ''
            pub    = tag('pubDate')
            desc   = tag('description')
            src_m  = re.search(r'<source[^>]*>([^<]+)<\/source>', block)
            outlet = decode_xml(src_m.group(1)) if src_m else 'Yahoo Finance'
            try:
                dt = datetime(*time.strptime(pub, '%a, %d %b %Y %H:%M:%S %z')[:6],
                              tzinfo=timezone.utc).isoformat() if pub else datetime.now(timezone.utc).isoformat()
            except:
                dt = datetime.now(timezone.utc).isoformat()
            if title and url_ and is_market_relevant(title, desc, min_score=1):
                items.append({
                    'title':       title,
                    'text':        desc,
                    'url':         url_,
                    'outlet':      outlet,
                    'publishedAt': dt,
                    'source':      'ticker',
                    'symbol':      symbol,
                })
    except Exception as e:
        print(f'[TickerRSS:{symbol}] {e}')
    return items

# ── Price data (Yahoo Finance) ─────────────────────────────────────────────────
SYMBOL_MAP = {
    'natural gas': 'NG=F', 'natgas': 'NG=F', 'nat gas': 'NG=F', 'ngas': 'NG=F',
    'lng': 'NG=F',
    'crude oil': 'CL=F', 'wti': 'CL=F', 'brent': 'BZ=F', 'petroleum': 'CL=F',
    'gold': 'GC=F', 'xau': 'GC=F',
    'silver': 'SI=F', 'xag': 'SI=F',
    'bitcoin': 'BTC-USD', 'btc': 'BTC-USD',
    'ethereum': 'ETH-USD', 'eth': 'ETH-USD',
    'sp500': '^GSPC', 'spx': '^GSPC', 's&p': '^GSPC', 'spy': 'SPY',
    'nasdaq': '^IXIC', 'qqq': 'QQQ',
    'eurusd': 'EURUSD=X', 'eur': 'EURUSD=X',
    'copper': 'HG=F',
    'wheat': 'ZW=F',
    'corn': 'ZC=F',
    # Fed Rate → 10-Year Treasury Yield (best market proxy for rate expectations)
    'federal reserve': '^TNX', 'fed rate': '^TNX', 'fed fund': '^TNX',
    'rate hike': '^TNX', 'rate cut': '^TNX', 'fomc': '^TNX',
    # Inflation → iShares TIPS Bond ETF (inflation-protected securities)
    'inflation': 'TIP', 'cpi': 'TIP', 'pce': 'TIP',
}

def find_symbol(q):
    q_lower = q.lower()
    for key, sym in SYMBOL_MAP.items():
        if key in q_lower:
            return sym
    return None

def api_price(symbol, range_='3mo'):
    try:
        url  = (f'https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}'
                f'?range={range_}&interval=1d&includePrePost=false&events=div|split')
        data = json.loads(http_get(url, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
        }))
        result    = data['chart']['result'][0]
        timestamps= result['timestamp']
        q_data    = result['indicators']['quote'][0]
        meta      = result['meta']

        ohlcv = []
        for i, ts in enumerate(timestamps):
            c = q_data['close'][i]
            if c is None:
                continue
            ohlcv.append({
                'time':   datetime.fromtimestamp(ts, tz=timezone.utc).strftime('%Y-%m-%d'),
                'open':   round(q_data['open'][i] or c, 4),
                'high':   round(q_data['high'][i] or c, 4),
                'low':    round(q_data['low'][i]  or c, 4),
                'close':  round(c, 4),
                'volume': int(q_data['volume'][i] or 0),
            })

        # Detect spikes / dips (>= 2.5 % daily move)
        spikes = []
        for i in range(1, len(ohlcv)):
            prev  = ohlcv[i-1]['close']
            cur   = ohlcv[i]['close']
            if prev == 0:
                continue
            pct = ((cur - prev) / prev) * 100
            if abs(pct) >= 2.5:
                spikes.append({
                    'time':   ohlcv[i]['time'],
                    'price':  cur,
                    'change': round(pct, 2),
                    'type':   'spike' if pct > 0 else 'dip',
                })

        return {
            'symbol':   symbol,
            'name':     meta.get('shortName', symbol),
            'currency': meta.get('currency', 'USD'),
            'current':  round(meta.get('regularMarketPrice', ohlcv[-1]['close'] if ohlcv else 0), 4),
            'prev':     round(meta.get('chartPreviousClose', ohlcv[-2]['close'] if len(ohlcv)>1 else 0), 4),
            'ohlcv':    ohlcv,
            'spikes':   spikes,
        }
    except Exception as e:
        print(f'[Price] {symbol} — {e}')
        return None

# ── Stats & Tech Indicators ────────────────────────────────────────────────────
def calc_sma(prices, period):
    res = []
    for i in range(len(prices)):
        if i < period - 1:
            res.append(None)
        else:
            res.append(round(sum(prices[i-period+1:i+1]) / period, 4))
    return res

def calc_ema(prices, period):
    res = []
    multiplier = 2 / (period + 1)
    for i in range(len(prices)):
        if i == 0:
            res.append(prices[0])
        else:
            prev = res[i-1]
            if prev is None:
                if i < period - 1:
                    res.append(None)
                else:
                    sma = sum(prices[i-period+1:i+1]) / period
                    res.append(round((prices[i] - sma) * multiplier + sma, 4))
            else:
                res.append(round((prices[i] - prev) * multiplier + prev, 4))
    return res

def calc_rsi(prices, period=14):
    res = []
    gains = []
    losses = []
    for i in range(1, len(prices)):
        diff = prices[i] - prices[i-1]
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))

    avg_gain = None
    avg_loss = None

    for i in range(len(prices)):
        if i < period:
            res.append(None)
        elif i == period:
            avg_gain = sum(gains[:period]) / period
            avg_loss = sum(losses[:period]) / period
            rs = avg_gain / avg_loss if avg_loss != 0 else 0
            res.append(round(100 - (100 / (1 + rs)), 2))
        else:
            avg_gain = (avg_gain * (period - 1) + gains[i-1]) / period
            avg_loss = (avg_loss * (period - 1) + losses[i-1]) / period
            rs = avg_gain / avg_loss if avg_loss != 0 else 0
            res.append(round(100 - (100 / (1 + rs)), 2))
    return res

def linear_regression(y):
    n = len(y)
    if n == 0: return 0, 0
    x = list(range(n))
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xx = sum(i*i for i in x)
    sum_xy = sum(x[i]*y[i] for i in range(n))
    
    denominator = n * sum_xx - sum_x**2
    if denominator == 0:
        return 0, sum_y/n
    m = (n * sum_xy - sum_x * sum_y) / denominator
    b = (sum_y - m * sum_x) / n
    return m, b

def _std_dev(y, m, b):
    n = len(y)
    if n == 0: return 0
    variance = sum((y[i] - (m * i + b))**2 for i in range(n)) / n
    return math.sqrt(variance)

# ── Institutional Quant Models ────────────────────────────────────────────────

def calc_ewma_volatility(prices, decay_factor=0.94):
    """
    JP Morgan RiskMetrics style EWMA Volatility.
    More heavily weights recent volatility (decay_factor = lambda).
    Standard institutional lambda for daily data is 0.94.
    """
    if len(prices) < 2: return 0
    
    # Calculate daily returns
    returns = []
    for i in range(1, len(prices)):
        returns.append((prices[i] - prices[i-1]) / prices[i-1])
        
    # Initialize EWMA variance with standard sample variance
    variance = sum(r**2 for r in returns) / len(returns)
    
    # Calculate EWMA recursively
    for r in returns:
        variance = (decay_factor * variance) + ((1 - decay_factor) * (r**2))
    
    # Return annualized-like approximation, scaled for price visualization
    last_price = prices[-1]
    vol_pct = math.sqrt(variance)
    return last_price * vol_pct

def mean_reversion_forecast(prices, periods_to_forecast):
    """
    Simplified Ornstein-Uhlenbeck Mean Reversion Mathematical Approximation.
    Commodities mean-revert rather than trending linearly forever.
    Returns the projected price path smoothing towards the historical mean.
    """
    if not prices: return []
    
    hist_mean = sum(prices) / len(prices)
    last_price = prices[-1]
    
    # Determine the speed of reversion based on recent volatility
    # Faster reversion if we are far from the mean
    reversion_speed = 0.05 
    
    forecast_path = []
    current_proj = last_price
    
    for _ in range(periods_to_forecast):
        # Drift towards the mean
        drift = reversion_speed * (hist_mean - current_proj)
        current_proj += drift
        forecast_path.append(current_proj)
        
    return forecast_path, hist_mean

# ── Natural Gas Prediction Endpoint ───────────────────────────────────────────
def api_predict_ng(interval='1d', range_='5y'):
    symbol = 'NG=F'
    try:
        url  = (f'https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}'
                f'?range={range_}&interval={interval}&includePrePost=false')
        data = json.loads(http_get(url, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
        }))
        result    = data['chart']['result'][0]
        timestamps= result['timestamp']
        q_data    = result['indicators']['quote'][0]

        ohlcv = []
        closes = []
        for i, ts in enumerate(timestamps):
            c = q_data['close'][i]
            if c is None:
                continue
            
            # Format time correctly for lightweight charts based on interval
            if interval in ['1d', '1wk', '1mo']:
                time_str = datetime.fromtimestamp(ts, tz=timezone.utc).strftime('%Y-%m-%d')
            else:
                time_str = ts # Unix timestamp for intraday

            ohlcv.append({
                'time':   time_str,
                'open':   round(q_data['open'][i] or c, 4),
                'high':   round(q_data['high'][i] or c, 4),
                'low':    round(q_data['low'][i]  or c, 4),
                'close':  round(c, 4),
                'volume': int(q_data['volume'][i] or 0),
            })
            closes.append(c)

        if not closes:
            return None

        # Technicals
        sma_20  = calc_sma(closes, 20)
        sma_50  = calc_sma(closes, 50)
        sma_100 = calc_sma(closes, 100)
        sma_200 = calc_sma(closes, 200)
        ema_20  = calc_ema(closes, 20)
        rsi_14  = calc_rsi(closes, 14)

        # Support / Resistance (Pivot Points from Previous Period)
        pivots = None
        
        # Find the most recently completed candle (not the current live unclosed one)
        prev_candle = None
        for i in range(len(ohlcv)-2, -1, -1): # Start from 2nd to last, work backwards
            if ohlcv[i]['high'] is not None and ohlcv[i]['low'] is not None and ohlcv[i]['close'] is not None:
                prev_candle = ohlcv[i]
                break

        if prev_candle:
            p = (prev_candle['high'] + prev_candle['low'] + prev_candle['close']) / 3
            r1 = (p * 2) - prev_candle['low']
            s1 = (p * 2) - prev_candle['high']
            r2 = p + (prev_candle['high'] - prev_candle['low'])
            s2 = p - (prev_candle['high'] - prev_candle['low'])
            
            pivots = {
                'p': round(p, 4),
                'r1': round(r1, 4), 's1': round(s1, 4),
                'r2': round(r2, 4), 's2': round(s2, 4)
            }

        indicators = []
        for i in range(len(ohlcv)):
            indicators.append({
                'time':   ohlcv[i]['time'],
                'sma20':  sma_20[i],
                'sma50':  sma_50[i],
                'sma100': sma_100[i],
                'sma200': sma_200[i],
                'ema20':  ema_20[i],
                'rsi14':  rsi_14[i],
            })

        # EWMA rolling volatility series (for quant modal chart)
        ewma_series = []
        if len(closes) >= 2:
            decay = 0.94
            rets = [(closes[i] - closes[i-1]) / closes[i-1] for i in range(1, len(closes))]
            variance = rets[0] ** 2
            ewma_series.append({'time': ohlcv[0]['time'], 'value': None})
            for j, r in enumerate(rets):
                variance = decay * variance + (1 - decay) * r ** 2
                ewma_series.append({'time': ohlcv[j + 1]['time'],
                                    'value': round(math.sqrt(variance) * 100, 4)})

        # Institutional Quant Prediction (using recent 100 periods)
        n_periods = min(100, len(closes))
        recent_closes = closes[-n_periods:]
        
        # Calculate Advanced Volatility (EWMA)
        ewma_vol = calc_ewma_volatility(recent_closes, decay_factor=0.94)
        
        # Calculate Mean Reversion Path replacing linear regression
        forecast_periods = 30
        mr_path, mr_target = mean_reversion_forecast(recent_closes, forecast_periods)
        
        # Keep linear slope just for the metric dashboard trend direction
        m, _ = linear_regression(recent_closes)

        predictions = []
        last_ts = timestamps[-1]
        
        interval_secs = 86400
        if interval == '5m': interval_secs = 300
        elif interval == '15m': interval_secs = 900
        elif interval == '1h': interval_secs = 3600
        
        for i in range(forecast_periods):
            pred_val = mr_path[i]
            f_ts = last_ts + interval_secs * (i + 1)
            
            if interval in ['1d', '1wk', '1mo']:
                time_str = datetime.fromtimestamp(f_ts, tz=timezone.utc).strftime('%Y-%m-%d')
            else:
                time_str = f_ts

            # Cone dynamically expands over time (sqrt of time)
            time_expansion = math.sqrt(i + 1)
            dyn_vol = ewma_vol * time_expansion

            predictions.append({
                'time': time_str,
                'mean': round(pred_val, 4),
                'upper_1sd': round(pred_val + dyn_vol, 4),
                'lower_1sd': round(pred_val - dyn_vol, 4),
                'upper_2sd': round(pred_val + (2*dyn_vol), 4),
                'lower_2sd': round(pred_val - (2*dyn_vol), 4),
            })
            
        # Sentiment, Fundamental Analysis & Aggregations (Expanded)
        news = api_news("Natural Gas")
        if news is None:
            news = []
        sentiment_score = 0
        
        bull_kws = [
            'surge', 'jump', 'gain', 'bull', 'winter', 'cold', 'freeze', 'storm', 'demand', 
            'low storage', 'withdrawal', 'rally', 'up', 'lng export', 'outage', 'disruption', 
            'geopolitical', 'russia', 'middle east', 'sanctions', 'strike', 'tight supply'
        ]
        bear_kws = [
            'drop', 'fall', 'loss', 'bear', 'warm', 'mild', 'supply', 'injection', 'glut', 
            'down', 'oversupply', 'record production', 'high invent', 'weak demand', 'selloff'
        ]
        
        drivers_detected = set()
        pinned_news = []
        aggregated_news = {'Weather': [], 'Supply & Demand': [], 'Geopolitics': []}
        
        for item in news:
            txt = (item['title'] + " " + item['text']).lower()
            item_bull_score = 0
            item_bear_score = 0
            
            # Aggregate news directly
            for kw in bull_kws:
                if kw in txt: 
                    sentiment_score += 1
                    item_bull_score += 1
                    if kw in ['winter', 'cold', 'freeze', 'storm']: 
                        drivers_detected.add('Weather (Cold)')
                        aggregated_news['Weather'].append({'title': item['title'], 'outlet': item['outlet'], 'url': item['url'], 'type': 'Bullish'})
                    if kw in ['lng export', 'outage', 'disruption']: 
                        drivers_detected.add('Supply Disruptions / LNG Exports')
                        aggregated_news['Supply & Demand'].append({'title': item['title'], 'outlet': item['outlet'], 'url': item['url'], 'type': 'Bullish'})
                    if kw in ['geopolitical', 'russia', 'middle east', 'sanctions']: 
                        drivers_detected.add('Geopolitics')
                        aggregated_news['Geopolitics'].append({'title': item['title'], 'outlet': item['outlet'], 'url': item['url'], 'type': 'Bullish'})
            
            for kw in bear_kws:
                if kw in txt: 
                    sentiment_score -= 1
                    item_bear_score += 1
                    if kw in ['warm', 'mild']: 
                        drivers_detected.add('Weather (Mild)')
                        aggregated_news['Weather'].append({'title': item['title'], 'outlet': item['outlet'], 'url': item['url'], 'type': 'Bearish'})
                    if kw in ['oversupply', 'record production', 'high invent', 'injection']: 
                        drivers_detected.add('Oversupply / Production')
                        aggregated_news['Supply & Demand'].append({'title': item['title'], 'outlet': item['outlet'], 'url': item['url'], 'type': 'Bearish'})
            
            # Pin news that have strong directional keywords (score >= 2 or <= -2)
            if item_bull_score >= 2 or item_bear_score >= 2:
                if len(pinned_news) < 3:
                    item['sentiment'] = 'bullish' if item_bull_score > item_bear_score else 'bearish'
                    pinned_news.append({
                        'title':       item['title'],
                        'outlet':      item['outlet'],
                        'url':         item['url'],
                        'sentiment':   item['sentiment'],
                        'publishedAt': item.get('publishedAt', ''),
                    })

        if len(news) > 0:
            sentiment_pct = max(-100, min(100, (sentiment_score / len(news)) * 100))
        else:
            sentiment_pct = 0

        # Technical vs Fundamental Move Evaluation
        last_price = closes[-1]
        move_reasoning = "Normal Market Fluctuation"
        move_type = "neutral"
        
        if pivots:
            if last_price >= pivots['r1']:
                move_reasoning = "Technical Breakout (Above Resistance 1)"
                move_type = "technical_bull"
            elif last_price <= pivots['s1']:
                move_reasoning = "Technical Breakdown (Below Support 1)"
                move_type = "technical_bear"
            
            # If price moved significantly, check if fundamentals align
            if abs(sentiment_pct) > 40:
                if sentiment_pct > 0 and last_price >= pivots['p']:
                    move_reasoning = "Fundamental Validated Move (Bullish News + Upward Price)"
                    move_type = "fundamental_bull"
                elif sentiment_pct < 0 and last_price <= pivots['p']:
                    move_reasoning = "Fundamental Validated Move (Bearish News + Downward Price)"
                    move_type = "fundamental_bear"

        # Deduplicate aggregated news
        for cat in aggregated_news:
            seen_titles = set()
            unique_items = []
            for item in aggregated_news[cat]:
                if item['title'] not in seen_titles:
                    seen_titles.add(item['title'])
                    unique_items.append(item)
            aggregated_news[cat] = unique_items

        fundamental = {
            'sentiment_pct': round(sentiment_pct, 2),
            'sentiment_label': 'Bullish' if sentiment_pct > 20 else 'Bearish' if sentiment_pct < -20 else 'Neutral',
            'news_analyzed': len(news),
            'drivers': list(drivers_detected),
            'pinned_news': pinned_news,
            'aggregated_news': aggregated_news,
            'move_reasoning': move_reasoning,
            'move_type': move_type
        }

        return {
            'ohlcv':        ohlcv,
            'indicators':   indicators,
            'pivots':       pivots,
            'predictions':  predictions,
            'ewma_series':  ewma_series,
            'fundamentals': fundamental,
            'stat_trend': {
                'slope':                m,
                'ewma_volatility':      ewma_vol,
                'mean_reversion_target': mr_target,
            }
        }
    except Exception as e:
        print(f'[Predict NG] {e}')
        return None

# ── HTTP Handler ───────────────────────────────────────────────────────────────
MIME = {'.html':'text/html','.js':'application/javascript','.css':'text/css',
        '.json':'application/json','.ico':'image/x-icon','.png':'image/png'}

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def send_json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def serve_static(self, path):
        fp = os.path.join(PUBLIC, path.lstrip('/'))
        if not os.path.isfile(fp):
            fp = os.path.join(PUBLIC, 'index.html')
        try:
            content = open(fp, 'rb').read()
            mime = MIME.get(os.path.splitext(fp)[1], 'text/plain')
            self.send_response(200)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', len(content))
            self.end_headers()
            self.wfile.write(content)
        except Exception:
            self.send_error(404)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        qs     = urllib.parse.parse_qs(parsed.query)
        q      = qs.get('q', [''])[0]
        path   = parsed.path

        if path == '/api/config':
            return self.send_json({'reddit': True, 'googlenews': True,
                                   'newsapi': bool(NEWS_API_KEY), 'ticker': True})
        if path == '/api/reddit':
            try:    return self.send_json({'success': True,  'data': api_reddit(q)})
            except: return self.send_json({'success': False, 'data': []})
        if path == '/api/news':
            try:    return self.send_json({'success': True,  'data': api_news(q)})
            except: return self.send_json({'success': False, 'data': []})
        if path == '/api/predict_ng':
            interval = qs.get('interval', ['1d'])[0]
            range_ = qs.get('range', ['1y'])[0]
            data = api_predict_ng(interval, range_)
            return self.send_json({'success': bool(data), 'data': data})
        if path == '/api/twitter':
            try:    return self.send_json({'success': True, 'data': api_ticker_news(q)})
            except: return self.send_json({'success': False, 'data': []})
        if path == '/api/price':
            symbol = qs.get('symbol', [''])[0] or find_symbol(q)
            if not symbol:
                return self.send_json({'success': False, 'data': None})
            range_ = qs.get('range', ['3mo'])[0]
            data   = api_price(symbol, range_)
            return self.send_json({'success': bool(data), 'data': data, 'symbol': symbol})

        self.serve_static(path)

if __name__ == '__main__':
    import sys
    print(f'Python {sys.version}', flush=True)
    print(f'PORT={PORT}  PUBLIC={PUBLIC}', flush=True)
    print(f'Public dir exists: {os.path.isdir(PUBLIC)}', flush=True)
    with http.server.ThreadingHTTPServer(('0.0.0.0', PORT), Handler) as srv:
        print(f'Market Intel listening on 0.0.0.0:{PORT}', flush=True)
        srv.serve_forever()
