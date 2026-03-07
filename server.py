#!/usr/bin/env python3
"""
Market Intel — Proxy server
- Serves static files from ./public/
- Handles /api/* routes — all external calls made server-side
- Deploy-ready: reads PORT from environment (Render, Railway, Fly.io, etc.)
"""

import http.server, urllib.request, urllib.parse, urllib.error
import json, re, os, time
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
            dt = datetime(*time.strptime(pub, '%a, %d %b %Y %H:%M:%S %Z')[:6], tzinfo=timezone.utc).isoformat() if pub else datetime.now(timezone.utc).isoformat()
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
    with http.server.ThreadingHTTPServer(('', PORT), Handler) as srv:
        print(f'Market Intel on http://localhost:{PORT}')
        srv.serve_forever()
