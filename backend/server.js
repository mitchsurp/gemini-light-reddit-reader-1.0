const express = require('express');
const cors = require('cors');

const app = express();
const REDDIT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 reddit-reader-proxy/1.0.0';
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

const VALID_FEED_SORTS = new Set(['hot', 'new', 'top', 'rising', 'controversial']);
const VALID_SEARCH_SORTS = new Set(['relevance', 'hot', 'new', 'top', 'comments']);
const VALID_TIMES = new Set(['hour', 'day', 'week', 'month', 'year', 'all']);

function parsePosts(children) {
  return children
    .filter(c => c.kind === 't3')
    .map(({ data: p }) => {
      const preview = p.preview?.images?.[0]?.resolutions?.[1]?.url?.replace(/&amp;/g, '&');
      const thumb = p.thumbnail?.startsWith('http') ? p.thumbnail : null;
      return {
        id: p.id,
        title: p.title,
        link: `https://www.reddit.com${p.permalink}`,
        author: p.author,
        score: p.score,
        numComments: p.num_comments,
        thumbnail: preview || thumb || null,
        subreddit: p.subreddit,
      };
    });
}

app.get('/api/feed', async (req, res) => {
  const { subreddit = 'all', sort = 'hot', t = 'day' } = req.query;
  const safeSub = /^[A-Za-z0-9_+]+$/.test(subreddit) ? subreddit : 'all';
  const safeSort = VALID_FEED_SORTS.has(sort) ? sort : 'hot';
  const safeTime = VALID_TIMES.has(t) ? t : 'day';

  try {
    const url = `https://www.reddit.com/r/${safeSub}/${safeSort}.json?limit=25&t=${safeTime}`;
    const response = await fetch(url, { headers: { 'User-Agent': REDDIT_UA } });
    if (!response.ok) throw new Error(`Reddit responded with ${response.status}`);
    const data = await response.json();
    res.json({ posts: parsePosts(data.data.children) });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

app.get('/api/search', async (req, res) => {
  const { q, sort = 'relevance', t = 'all' } = req.query;
  if (!q) return res.json({ posts: [] });
  const safeSort = VALID_SEARCH_SORTS.has(sort) ? sort : 'relevance';
  const safeTime = VALID_TIMES.has(t) ? t : 'all';

  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=${safeSort}&t=${safeTime}&limit=25`;
    const response = await fetch(url, { headers: { 'User-Agent': REDDIT_UA } });
    if (!response.ok) throw new Error(`Reddit responded with ${response.status}`);
    const data = await response.json();
    res.json({ posts: parsePosts(data.data.children) });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});

app.get('/api/autocomplete', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  try {
    const url = `https://www.reddit.com/api/subreddit_autocomplete_v2.json?query=${encodeURIComponent(q)}&limit=6&include_over_18=false&typeahead_active=true`;
    const response = await fetch(url, { headers: { 'User-Agent': REDDIT_UA } });
    if (!response.ok) return res.json([]);
    const data = await response.json();
    const results = (data.data?.children ?? [])
      .filter(c => c.kind === 't5')
      .map(c => ({ name: c.data.display_name, subscribers: c.data.subscribers }));
    res.json(results);
  } catch {
    res.json([]);
  }
});

const iconCache = new Map();

app.get('/api/icon/:subreddit', async (req, res) => {
  const sub = req.params.subreddit;
  if (!/^[A-Za-z0-9_]+$/.test(sub)) return res.redirect('/snoo.svg');

  if (iconCache.has(sub)) {
    const url = iconCache.get(sub);
    return res.redirect(url || '/snoo.svg');
  }

  try {
    const response = await fetch(`https://www.reddit.com/r/${sub}/about.json`, {
      headers: { 'User-Agent': REDDIT_UA }
    });
    const data = await response.json();
    const icon = (data.data?.community_icon || data.data?.icon_img || '').split('?')[0] || null;
    iconCache.set(sub, icon);
    res.redirect(icon || '/snoo.svg');
  } catch {
    iconCache.set(sub, null);
    res.redirect('/snoo.svg');
  }
});

app.get('/api/comments', async (req, res) => {
  const { url } = req.query;
  if (!url || !url.startsWith('https://www.reddit.com/')) {
    return res.status(400).json({ error: 'Invalid url' });
  }

  try {
    const jsonUrl = url.replace(/\/?$/, '.json');
    const response = await fetch(jsonUrl, { headers: { 'User-Agent': REDDIT_UA } });
    if (!response.ok) throw new Error(`Reddit responded with ${response.status}`);

    const data = await response.json();
    const pd = data[0].data.children[0].data;

    res.json({
      post: {
        title: pd.title,
        url: pd.url,
        permalink: `https://www.reddit.com${pd.permalink}`,
        author: pd.author,
        subreddit: pd.subreddit,
        score: pd.score,
        numComments: pd.num_comments,
        selftext: pd.selftext || null,
      },
      comments: parseComments(data[1].data.children),
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

function parseComments(children) {
  return children
    .filter(c => c.kind === 't1')
    .map(c => ({
      id: c.data.id,
      author: c.data.author,
      body: c.data.body,
      score: c.data.score,
      created: c.data.created_utc,
      replies: c.data.replies?.data?.children
        ? parseComments(c.data.replies.data.children)
        : [],
    }));
}

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
