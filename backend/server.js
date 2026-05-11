const express = require('express');
const Parser = require('rss-parser');
const cors = require('cors');

const app = express();
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 reddit-reader-proxy/1.0.0'
  }
});
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

app.get('/api/feed', async (req, res) => {
  const { subreddit } = req.query;
  const targetSubreddit = subreddit || 'all';
  const url = `https://www.reddit.com/r/${targetSubreddit}/.rss`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 reddit-reader-proxy/1.0.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit responded with ${response.status}`);
    }

    const xml = await response.text();
    const feed = await parser.parseString(xml);
    
    const posts = feed.items.map(item => {
      const thumbMatch = item.content && item.content.match(/<img[^>]+src="([^"]+)"/);
      return {
        id: item.id || item.guid,
        title: item.title,
        link: item.link,
        author: item.author,
        pubDate: item.pubDate,
        thumbnail: thumbMatch ? thumbMatch[1].replace(/&amp;/g, '&') : null,
        subreddit: targetSubreddit
      };
    });

    res.json({
      subreddit: targetSubreddit,
      posts: posts
    });
  } catch (error) {
    console.error('Error fetching Reddit RSS:', error);
    res.status(500).json({ error: 'Failed to fetch RSS feed' });
  }
});

app.get('/api/comments', async (req, res) => {
  const { url } = req.query;
  if (!url || !url.startsWith('https://www.reddit.com/')) {
    return res.status(400).json({ error: 'Invalid url' });
  }

  try {
    const jsonUrl = url.replace(/\/?$/, '.json');
    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 reddit-reader-proxy/1.0.0'
      }
    });
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
