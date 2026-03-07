'use strict';

const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// ─── Config ───────────────────────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  res.json({
    reddit: true,
    googlenews: true,
    newsapi: !!process.env.NEWS_API_KEY,
    twitter: !!process.env.TWITTER_BEARER_TOKEN,
  });
});

// ─── Reddit ───────────────────────────────────────────────────────────────────
app.get('/api/reddit', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ success: false, data: [] });

  const headers = { 'User-Agent': 'MarketIntelScanner/1.0 (by trader)' };
  const financeReddits = 'r/NaturalGas+r/commodities+r/investing+r/stocks+r/trading+r/energy+r/economy+r/wallstreetbets+r/Forex+r/CryptoCurrency';

  try {
    const [global, subs] = await Promise.allSettled([
      axios.get('https://www.reddit.com/search.json', {
        params: { q, sort: 'new', limit: 20, t: 'week' },
        headers,
      }),
      axios.get(`https://www.reddit.com/${financeReddits}/search.json`, {
        params: { q, sort: 'new', limit: 15, t: 'month', restrict_sr: 1 },
        headers,
      }),
    ]);

    const items = [];
    const seen = new Set();

    for (const result of [global, subs]) {
      if (result.status !== 'fulfilled') continue;
      for (const { data: d } of result.value.data.data.children) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        items.push({
          id: d.id,
          title: d.title,
          text: (d.selftext || '').slice(0, 600),
          url: `https://reddit.com${d.permalink}`,
          subreddit: d.subreddit,
          score: d.score,
          comments: d.num_comments,
          author: d.author,
          created: new Date(d.created_utc * 1000).toISOString(),
          source: 'reddit',
        });
      }
    }

    items.sort((a, b) => new Date(b.created) - new Date(a.created));
    res.json({ success: true, data: items });
  } catch (err) {
    console.error('Reddit error:', err.message);
    res.json({ success: false, error: err.message, data: [] });
  }
});

// ─── News (Google News RSS + optional NewsAPI) ────────────────────────────────
app.get('/api/news', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ success: false, data: [] });

  const items = [];

  // Google News RSS — no API key needed
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
    const { data: xml } = await axios.get(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketIntelScanner/1.0)' },
      timeout: 9000,
    });

    const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    const decode = (s) =>
      s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/<[^>]+>/g, '').trim();

    for (const block of itemBlocks.slice(0, 25)) {
      const getTag = (tag) => {
        const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
        return m ? decode(m[1]) : '';
      };
      const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/) || block.match(/<link[^/]*\/>/);
      const sourceMatch = block.match(/<source[^>]*>([^<]+)<\/source>/);
      const title = getTag('title');
      const pubDate = getTag('pubDate');
      const url = linkMatch ? linkMatch[1].trim() : '';

      if (title && url) {
        items.push({
          title,
          text: title,
          url,
          outlet: sourceMatch ? decode(sourceMatch[1]) : 'Google News',
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          source: 'news',
        });
      }
    }
  } catch (err) {
    console.error('Google News error:', err.message);
  }

  // NewsAPI — needs API key
  if (process.env.NEWS_API_KEY) {
    try {
      const { data } = await axios.get('https://newsapi.org/v2/everything', {
        params: { q, sortBy: 'publishedAt', pageSize: 15, language: 'en' },
        headers: { 'X-Api-Key': process.env.NEWS_API_KEY },
      });
      for (const a of data.articles || []) {
        if (!a.title || a.title === '[Removed]') continue;
        items.push({
          title: a.title,
          text: a.description || a.title,
          url: a.url,
          outlet: a.source?.name || 'NewsAPI',
          publishedAt: a.publishedAt,
          source: 'news',
        });
      }
    } catch (err) {
      console.error('NewsAPI error:', err.message);
    }
  }

  items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  res.json({ success: true, data: items });
});

// ─── Twitter / X ──────────────────────────────────────────────────────────────
app.get('/api/twitter', async (req, res) => {
  const { q } = req.query;
  const token = process.env.TWITTER_BEARER_TOKEN;

  if (!token) {
    return res.json({ success: false, message: 'Add TWITTER_BEARER_TOKEN to .env', data: [] });
  }

  try {
    const { data } = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
      params: {
        query: `(${q}) lang:en -is:retweet`,
        max_results: 20,
        'tweet.fields': 'created_at,public_metrics,author_id',
        'user.fields': 'name,username,verified',
        expansions: 'author_id',
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    const users = Object.fromEntries((data.includes?.users || []).map((u) => [u.id, u]));
    const tweets = (data.data || []).map((t) => ({
      id: t.id,
      title: `@${users[t.author_id]?.username || 'unknown'}`,
      text: t.text,
      author: users[t.author_id] || { name: 'Unknown', username: 'unknown' },
      metrics: t.public_metrics,
      url: `https://twitter.com/i/web/status/${t.id}`,
      created: t.created_at,
      source: 'twitter',
    }));

    res.json({ success: true, data: tweets });
  } catch (err) {
    console.error('Twitter error:', err.response?.data?.detail || err.message);
    res.json({ success: false, error: err.response?.data?.detail || err.message, data: [] });
  }
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const tick = (v) => (v ? '✅' : '⚠️ ');
  console.log(`\n📡  Market Intelligence Scanner`);
  console.log(`    http://localhost:${PORT}\n`);
  console.log(`  ${tick(true)}Reddit       — always active`);
  console.log(`  ${tick(true)}Google News  — always active`);
  console.log(`  ${tick(!!process.env.NEWS_API_KEY)}NewsAPI      — ${process.env.NEWS_API_KEY ? 'active' : 'add NEWS_API_KEY to .env'}`);
  console.log(`  ${tick(!!process.env.TWITTER_BEARER_TOKEN)}Twitter/X    — ${process.env.TWITTER_BEARER_TOKEN ? 'active' : 'add TWITTER_BEARER_TOKEN to .env'}`);
  console.log('');
});
